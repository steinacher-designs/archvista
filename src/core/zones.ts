// ARCHVISTA — visitor zones.
// GREEN  = visitors may enter (default everywhere walkable)
// RED    = visitors cannot enter (solid invisible barrier in every navigation mode)
// GREY   = geometry is removed from the published assets (clipped, not hidden)

import type { ModelMesh } from "./dxf/import";
import { earClip } from "./dxf/build";

export type ZoneKind = "green" | "red" | "grey";

export interface Zone {
  id: string;
  kind: ZoneKind;
  /** Plan polygon (x, z) in metres. */
  polygon: [number, number][];
  /** Vertical extent in model Y. */
  yMin: number;
  yMax: number;
  label?: string;
  source: "room" | "drawn" | "floor" | "doorway";
  roomId?: number;
  level?: number;
}

export function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInZone(p: [number, number, number], z: Zone, pad = 0): boolean {
  if (p[1] < z.yMin - pad || p[1] > z.yMax + pad) return false;
  if (pointInPolygon(p[0], p[2], z.polygon)) return true;
  if (pad > 0) return distToPolygon(p[0], p[2], z.polygon) < pad;
  return false;
}

export function distToPolygon(x: number, z: number, poly: [number, number][]) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    d = Math.min(d, Math.hypot(x - (ax + t * vx), z - (az + t * vz)));
  }
  return d;
}

/** Thin rectangle across a doorway, drawn as a line between two plan points. */
export function doorwayZone(id: string, a: [number, number], b: [number, number], yMin: number, yMax: number, thickness = 0.3): Zone {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  const nx = (-dz / l) * thickness / 2, nz = (dx / l) * thickness / 2;
  return {
    id, kind: "red", source: "doorway", yMin, yMax,
    polygon: [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]],
  };
}

// ——— clipping: remove GREY volumes from geometry ———

type P3 = [number, number, number];
interface Plane { n: P3; d: number } // inside: n·p + d >= 0

export function convexPieces(z: Zone): Plane[][] {
  const poly = ensureCCW(z.polygon);
  const pts3 = poly.map(([x, zz]) => [x, 0, zz] as P3);
  // earClip works on a 3D polygon (projected on dominant plane)
  const tris = earClip(pts3.map(([x, , zz]) => [x, zz, 0] as P3));
  const pieces: Plane[][] = [];
  for (const [a, b, c] of tris) {
    const tri = [poly[a], poly[b], poly[c]];
    // orient triangle CCW in (x, z)
    const area = (tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) - (tri[1][1] - tri[0][1]) * (tri[2][0] - tri[0][0]);
    if (Math.abs(area) < 1e-12) continue;
    if (area < 0) tri.reverse();
    const planes: Plane[] = [
      { n: [0, 1, 0], d: -z.yMin },
      { n: [0, -1, 0], d: z.yMax },
    ];
    for (let i = 0; i < 3; i++) {
      const [ax, az] = tri[i], [bx, bz] = tri[(i + 1) % 3];
      // inward normal of a CCW edge in (x,z): (-(bz-az), bx-ax) rotated → for x/z axes with CCW order: n = (-(bz - az), 0, (bx - ax))... choose sign by testing third vertex
      let n: P3 = [-(bz - az), 0, bx - ax];
      const l = Math.hypot(n[0], n[2]);
      n = [n[0] / l, 0, n[2] / l];
      let d = -(n[0] * ax + n[2] * az);
      const [cx, cz] = tri[(i + 2) % 3];
      if (n[0] * cx + n[2] * cz + d < 0) { n = [-n[0], 0, -n[2]]; d = -d; }
      planes.push({ n, d });
    }
    pieces.push(planes);
  }
  return pieces;
}

function ensureCCW(p: [number, number][]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; }
  return a < 0 ? [...p].reverse() : p;
}

function splitPoly(poly: P3[], pl: Plane): { inside: P3[]; outside: P3[] } {
  const inside: P3[] = [], outside: P3[] = [];
  const dist = (p: P3) => pl.n[0] * p[0] + pl.n[1] * p[1] + pl.n[2] * p[2] + pl.d;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = dist(a), db = dist(b);
    const EPS = 1e-9;
    if (Math.abs(da) <= EPS) { inside.push(a); outside.push(a); }
    else if (da > 0) inside.push(a); else outside.push(a);
    if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
      const t = da / (da - db);
      const m: P3 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
      inside.push(m); outside.push(m);
    }
  }
  return { inside: inside.length >= 3 ? inside : [], outside: outside.length >= 3 ? outside : [] };
}

/**
 * Returns new meshes with every part inside a GREY zone cut away.
 * Triangles crossing a zone boundary are split exactly at the boundary.
 */
export function removeGreyGeometry(meshes: ModelMesh[], zones: Zone[]): { meshes: ModelMesh[]; removedTriangles: number; clippedTriangles: number } {
  const grey = zones.filter((z) => z.kind === "grey" && z.polygon.length >= 3);
  if (!grey.length) return { meshes, removedTriangles: 0, clippedTriangles: 0 };
  const pieces = grey.flatMap((z) => convexPieces(z).map((planes) => ({ planes, z })));
  let removed = 0, clipped = 0;
  const out: ModelMesh[] = [];
  for (const m of meshes) {
    const p = m.positions, I = m.indices, N = m.normals;
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    let changed = false;
    for (let t = 0; t < I.length; t += 3) {
      const tri: P3[] = [0, 1, 2].map((k) => [p[I[t + k] * 3], p[I[t + k] * 3 + 1], p[I[t + k] * 3 + 2]] as P3);
      let frags: P3[][] = [tri];
      for (const { planes, z } of pieces) {
        // quick reject: triangle bbox vs zone bbox
        const next: P3[][] = [];
        for (const f of frags) {
          if (!overlapsZoneBox(f, z)) { next.push(f); continue; }
          let cur = f;
          for (const pl of planes) {
            const s = splitPoly(cur, pl);
            if (s.outside.length) next.push(s.outside);
            cur = s.inside;
            if (!cur.length) break;
          }
          // cur (if any) is inside → dropped
        }
        frags = next;
      }
      const n0 = I[t] * 3;
      const fn: P3 = [N[n0], N[n0 + 1], N[n0 + 2]];
      if (frags.length === 1 && frags[0] === tri) {
        for (let k = 0; k < 3; k++) { const v = I[t + k] * 3; pos.push(p[v], p[v + 1], p[v + 2]); nrm.push(N[v], N[v + 1], N[v + 2]); }
        const b = pos.length / 3 - 3;
        idx.push(b, b + 1, b + 2);
        continue;
      }
      changed = true;
      if (!frags.length) { removed++; continue; }
      clipped++;
      for (const f of frags)
        for (let k = 1; k + 1 < f.length; k++) {
          const b = pos.length / 3;
          for (const v of [f[0], f[k], f[k + 1]]) { pos.push(v[0], v[1], v[2]); nrm.push(fn[0], fn[1], fn[2]); }
          idx.push(b, b + 1, b + 2);
        }
    }
    if (!changed) { out.push(m); continue; }
    if (!idx.length) continue;
    out.push({ ...m, positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint32Array(idx), triangleCount: idx.length / 3 });
  }
  return { meshes: out, removedTriangles: removed, clippedTriangles: clipped };
}

function overlapsZoneBox(f: P3[], z: Zone) {
  let ymin = Infinity, ymax = -Infinity, xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity;
  for (const v of f) { ymin = Math.min(ymin, v[1]); ymax = Math.max(ymax, v[1]); xmin = Math.min(xmin, v[0]); xmax = Math.max(xmax, v[0]); zmin = Math.min(zmin, v[2]); zmax = Math.max(zmax, v[2]); }
  if (ymax < z.yMin || ymin > z.yMax) return false;
  let pxmin = Infinity, pxmax = -Infinity, pzmin = Infinity, pzmax = -Infinity;
  for (const [x, zz] of z.polygon) { pxmin = Math.min(pxmin, x); pxmax = Math.max(pxmax, x); pzmin = Math.min(pzmin, zz); pzmax = Math.max(pzmax, zz); }
  return !(xmax < pxmin || xmin > pxmax || zmax < pzmin || zmin > pzmax);
}

/** Red barrier prisms as triangle soup (for collision). Walls + caps, slightly inflated. */
export function redBarrierTriangles(zones: Zone[]): Float32Array {
  const out: number[] = [];
  for (const z of zones) {
    if (z.kind !== "red" || z.polygon.length < 3) continue;
    const poly = ensureCCW(z.polygon);
    const y0 = z.yMin, y1 = z.yMax;
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      out.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    }
    for (const [a, b, c] of earClip(poly.map(([x, zz]) => [x, zz, 0] as P3))) {
      for (const y of [y0, y1]) out.push(poly[a][0], y, poly[a][1], poly[b][0], y, poly[b][1], poly[c][0], y, poly[c][1]);
    }
  }
  return new Float32Array(out);
}
