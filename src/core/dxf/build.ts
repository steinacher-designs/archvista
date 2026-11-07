// ARCHVISTA — DXF geometry reconstruction: raw entities → triangle soup grouped by layer & colour.

import { RawDxf, RawEntity, Pair, num, str } from "./reader";
import { aciToRgb } from "./color";
import { Mat4, V3, identity, mul, translate, scale, rotZ, apply, applyDir, det3, ocsMatrix } from "./math";

export const ACIS_TYPES = new Set([
  "3DSOLID", "BODY", "REGION", "SURFACE", "EXTRUDEDSURFACE", "LOFTEDSURFACE", "PLANESURFACE",
  "REVOLVEDSURFACE", "SWEPTSURFACE", "NURBSURFACE",
]);
const ANNOTATION_TYPES = new Set([
  "TEXT", "MTEXT", "DIMENSION", "LEADER", "MLEADER", "MULTILEADER", "HATCH", "POINT", "ATTDEF",
  "VIEWPORT", "IMAGE", "WIPEOUT", "TOLERANCE", "XLINE", "RAY", "SPLINE", "ELLIPSE", "ARC", "OLE2FRAME",
]);

export interface TriGroup {
  layer: string;
  color: number; // 0xRRGGBB
  /** CAD material name (DXF MATERIAL object), if one is assigned. */
  material?: string;
  /** Flat WCS positions in drawing units, 9 numbers per triangle. */
  tris: number[];
}

export interface BuildIssue {
  type: string;
  count: number;
  layers: string[];
}

export interface BuildResult {
  groups: Map<string, TriGroup>;
  entityCounts: Record<string, number>;
  acis: BuildIssue[];
  ignored2d: number;
  skippedHiddenLayers: number;
  meshWithSubdivision: number;
  missingBlocks: string[];
  recursionCut: number;
}

interface Ctx {
  layer: string; // effective layer
  color: number; // inherited rgb for BYBLOCK
  material?: string; // inherited material name for BYBLOCK
  depth: number;
  stack: string[];
}

const ARC_SEGMENTS = 16;
const CIRCLE_SEGMENTS = 24;

export function buildGeometry(dxf: RawDxf): BuildResult {
  const res: BuildResult = {
    groups: new Map(),
    entityCounts: {},
    acis: [],
    ignored2d: 0,
    skippedHiddenLayers: 0,
    meshWithSubdivision: 0,
    missingBlocks: [],
    recursionCut: 0,
  };
  const acisMap = new Map<string, Set<string>>();
  const acisCount = new Map<string, number>();
  const missing = new Set<string>();

  const layerRgb = (name: string): number => {
    const l = dxf.layers.get(name.toUpperCase());
    if (!l) return 0xffffff;
    if (l.trueColor !== undefined) return l.trueColor & 0xffffff;
    return aciToRgb(l.color);
  };
  const layerHidden = (name: string): boolean => {
    const l = dxf.layers.get(name.toUpperCase());
    return !!l && (l.color < 0 || (l.flags & 1) === 1);
  };

  // materials: entity (347) → BYLAYER (layer's material) / BYBLOCK (insert's material) / GLOBAL (none)
  const matName = (handle: string | undefined): string | undefined => handle ? dxf.materials.get(handle.toUpperCase())?.name : undefined;
  const special = (n: string | undefined) => (n ?? "").toUpperCase();
  const layerMaterial = (layer: string): string | undefined => {
    const n = matName(dxf.layers.get(layer.toUpperCase())?.material);
    const u = special(n);
    return !n || u === "GLOBAL" || u === "BYLAYER" || u === "BYBLOCK" ? undefined : n;
  };
  const resolveMaterial = (P: Pair[], layer: string, ctx: Ctx): string | undefined => {
    const n = matName(str(P, 347) || undefined);
    const u = special(n);
    if (!n || u === "BYLAYER") return layerMaterial(layer);
    if (u === "BYBLOCK") return ctx.material;
    if (u === "GLOBAL") return undefined;
    return n;
  };
  let curMat: string | undefined;

  const groupFor = (layer: string, color: number): TriGroup => {
    const material = curMat;
    const key = `${layer}\u0000${color}\u0000${material ?? ""}`;
    let g = res.groups.get(key);
    if (!g) {
      g = { layer, color, material, tris: [] };
      res.groups.set(key, g);
    }
    return g;
  };

  const emit = (g: TriGroup, M: Mat4, flip: boolean, a: V3, b: V3, c: V3) => {
    const A = apply(M, a), B = apply(M, b), C = apply(M, c);
    if (flip) g.tris.push(A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2]);
    else g.tris.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
  };
  const quad = (g: TriGroup, M: Mat4, flip: boolean, a: V3, b: V3, c: V3, d: V3) => {
    emit(g, M, flip, a, b, c);
    emit(g, M, flip, a, c, d);
  };

  const visit = (e: RawEntity, M: Mat4, ctx: Ctx) => {
    const P = e.pairs;
    res.entityCounts[e.type] = (res.entityCounts[e.type] ?? 0) + 1;
    if (num(P, 67, 0) === 1) return; // paper space
    if (num(P, 60, 0) === 1) return; // invisible

    let layer = str(P, 8, "0");
    if (layer === "0" && ctx.depth > 0) layer = ctx.layer; // layer-0 entities inherit insert layer
    if (layerHidden(layer)) {
      res.skippedHiddenLayers++;
      return;
    }
    const tc = P.find(([c]) => c === 420);
    const aci = num(P, 62, 256);
    let color: number;
    if (tc) color = parseInt(tc[1], 10) & 0xffffff;
    else if (aci === 0) color = ctx.color;
    else if (aci === 256) color = layerRgb(layer);
    else color = aciToRgb(aci);

    const material = resolveMaterial(P, layer, ctx);
    curMat = material;
    const flip = det3(M) < 0;
    const thickness = num(P, 39, 0);
    const ext: V3 = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];

    if (ACIS_TYPES.has(e.type)) {
      acisCount.set(e.type, (acisCount.get(e.type) ?? 0) + 1);
      if (!acisMap.has(e.type)) acisMap.set(e.type, new Set());
      acisMap.get(e.type)!.add(layer);
      return;
    }

    switch (e.type) {
      case "3DFACE": {
        const p = pts(P, 4);
        const g = groupFor(layer, color);
        if (same(p[2], p[3])) emit(g, M, flip, p[0], p[1], p[2]);
        else quad(g, M, flip, p[0], p[1], p[2], p[3]);
        return;
      }
      case "SOLID":
      case "TRACE": {
        const p = pts(P, 4);
        const O = mul(M, ocsMatrix(ext));
        const g = groupFor(layer, color);
        const ring: V3[] = same(p[2], p[3]) ? [p[0], p[1], p[2]] : [p[0], p[1], p[3], p[2]];
        if (thickness !== 0) prism(g, O, flip, ring, thickness, true);
        else fan(g, O, flip, ring);
        return;
      }
      case "POLYLINE":
        polyline(e, M, flip, layer, color);
        return;
      case "LWPOLYLINE": {
        if (thickness === 0) { res.ignored2d++; return; }
        const elev = num(P, 38, 0);
        const verts: [number, number, number][] = [];
        let cur: [number, number, number] | null = null;
        for (const [c, v] of P) {
          if (c === 10) { cur = [parseFloat(v), 0, 0]; verts.push(cur); }
          else if (c === 20 && cur) cur[1] = parseFloat(v);
          else if (c === 42 && cur) cur[2] = parseFloat(v);
        }
        const ring = bulgeRing(verts, (num(P, 70, 0) & 1) === 1, elev);
        const O = mul(M, ocsMatrix(ext));
        walls(groupFor(layer, color), O, flip, ring.pts, ring.closed, thickness);
        return;
      }
      case "LINE": {
        if (thickness === 0) { res.ignored2d++; return; }
        const p = pts(P, 2);
        // LINE endpoints are WCS; thickness extrudes along the extrusion vector.
        const d = applyDir(identity(), ext).map((x) => x * thickness) as V3;
        const g = groupFor(layer, color);
        quad(g, M, flip, p[0], p[1], add(p[1], d), add(p[0], d));
        return;
      }
      case "CIRCLE": {
        if (thickness === 0) { res.ignored2d++; return; }
        const c0 = pts(P, 1)[0];
        const r = num(P, 40, 0);
        const ring: V3[] = [];
        for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
          const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
          ring.push([c0[0] + r * Math.cos(a), c0[1] + r * Math.sin(a), c0[2]]);
        }
        prism(groupFor(layer, color), mul(M, ocsMatrix(ext)), flip, ring, thickness, true);
        return;
      }
      case "MESH":
        mesh(e, M, flip, groupFor(layer, color));
        return;
      case "INSERT":
        insert(e, M, { ...ctx, layer, color, material }, layer, color);
        return;
      default:
        if (ANNOTATION_TYPES.has(e.type) || e.type === "LINE" || e.type === "CIRCLE") res.ignored2d++;
        else res.ignored2d++;
    }
  };

  const polyline = (e: RawEntity, M: Mat4, flip: boolean, layer: string, color: number) => {
    const P = e.pairs;
    const flags = num(P, 70, 0);
    const verts = e.children ?? [];
    const g = groupFor(layer, color);
    if (flags & 64) {
      // Polyface mesh: coordinate vertices (flag 64|128), then face records (flag 128 only).
      const coords: V3[] = [];
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if ((vf & 128) && (vf & 64)) coords.push([num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      }
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if ((vf & 128) && !(vf & 64)) {
          const idx = [71, 72, 73, 74].map((c) => Math.abs(num(v.pairs, c, 0))).filter((i) => i > 0);
          const poly = idx.map((i) => coords[i - 1]).filter(Boolean);
          if (poly.length >= 3) fan(g, M, flip, poly);
        }
      }
      return;
    }
    if (flags & 16) {
      // Polygon mesh M×N.
      const m = num(P, 71, 0), n = num(P, 72, 0);
      const grid: V3[] = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      if (m < 2 || n < 2 || grid.length < m * n) return;
      const closedM = (flags & 1) === 1, closedN = (flags & 32) === 32;
      const at = (i: number, j: number) => grid[(i % m) * n + (j % n)];
      for (let i = 0; i < (closedM ? m : m - 1); i++)
        for (let j = 0; j < (closedN ? n : n - 1); j++)
          quad(g, M, flip, at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j));
      return;
    }
    if (flags & 8) { res.ignored2d++; return; } // 3D polyline = wire
    const thickness = num(P, 39, 0);
    if (thickness === 0) { res.ignored2d++; return; }
    const elev = num(P, 30, 0);
    const raw: [number, number, number][] = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 42, 0)]);
    const ext: V3 = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ring = bulgeRing(raw, (flags & 1) === 1, elev);
    walls(g, mul(M, ocsMatrix(ext)), flip, ring.pts, ring.closed, thickness);
  };

  const mesh = (e: RawEntity, M: Mat4, flip: boolean, g: TriGroup) => {
    const P = e.pairs;
    if (num(P, 91, 0) > 0) res.meshWithSubdivision++;
    let i = 0;
    const vCount = (() => { for (; i < P.length; i++) if (P[i][0] === 92) return parseInt(P[i++][1], 10); return 0; })();
    const vs: V3[] = [];
    while (i < P.length && vs.length < vCount) {
      if (P[i][0] === 10) {
        vs.push([parseFloat(P[i][1]), parseFloat(P[i + 1]?.[1] ?? "0"), parseFloat(P[i + 2]?.[1] ?? "0")]);
        i += 3;
      } else i++;
    }
    for (; i < P.length; i++) if (P[i][0] === 93) { i++; break; }
    const list: number[] = [];
    for (; i < P.length && P[i][0] === 90; i++) list.push(parseInt(P[i][1], 10));
    for (let k = 0; k < list.length; ) {
      const n = list[k++];
      const poly = list.slice(k, k + n).map((j) => vs[j]).filter(Boolean);
      k += n;
      if (poly.length >= 3) fan(g, M, flip, poly);
    }
  };

  const insert = (e: RawEntity, M: Mat4, ctx: Ctx, layer: string, color: number) => {
    const P = e.pairs;
    const name = str(P, 2);
    const block = dxf.blocks.get(name.toUpperCase());
    if (!block) { missing.add(name); return; }
    if (ctx.depth > 32 || ctx.stack.includes(name.toUpperCase())) { res.recursionCut++; return; }
    const ext: V3 = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ins: V3 = [num(P, 10, 0), num(P, 20, 0), num(P, 30, 0)];
    const sx = num(P, 41, 1), sy = num(P, 42, 1), sz = num(P, 43, 1);
    const rot = (num(P, 50, 0) * Math.PI) / 180;
    const cols = Math.max(1, num(P, 70, 1)), rows = Math.max(1, num(P, 71, 1));
    const cs = num(P, 44, 0), rs = num(P, 45, 0);
    const base = mul(M, ocsMatrix(ext));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let T = mul(base, translate(ins[0], ins[1], ins[2]));
        T = mul(T, rotZ(rot));
        T = mul(T, translate(c * cs, r * rs, 0));
        T = mul(T, scale(sx, sy, sz));
        T = mul(T, translate(-block.base[0], -block.base[1], -block.base[2]));
        const child: Ctx = { layer, color, material: ctx.material, depth: ctx.depth + 1, stack: [...ctx.stack, name.toUpperCase()] };
        for (const be of block.entities) visit(be, T, child);
      }
  };

  const root: Ctx = { layer: "0", color: 0xffffff, depth: 0, stack: [] };
  for (const e of dxf.entities) visit(e, identity(), root);

  res.acis = [...acisCount.entries()].map(([type, count]) => ({ type, count, layers: [...acisMap.get(type)!] }));
  res.missingBlocks = [...missing];
  return res;

  // ——— local geometry helpers ———
  function fan(g: TriGroup, M: Mat4, flip: boolean, poly: V3[]) {
    const p = dedupeRing(poly);
    if (p.length < 3) return;
    if (p.length === 3 || p.length === 4) {
      emit(g, M, flip, p[0], p[1], p[2]);
      if (p.length === 4) emit(g, M, flip, p[0], p[2], p[3]);
      return;
    }
    for (const [a, b, c] of earClip(p)) emit(g, M, flip, p[a], p[b], p[c]);
  }
  function walls(g: TriGroup, O: Mat4, flip: boolean, ring: V3[], closed: boolean, h: number) {
    const n = ring.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      quad(g, O, flip, a, b, [b[0], b[1], b[2] + h], [a[0], a[1], a[2] + h]);
    }
  }
  function prism(g: TriGroup, O: Mat4, flip: boolean, ring: V3[], h: number, caps: boolean) {
    walls(g, O, flip, ring, true, h);
    if (caps) {
      fan(g, O, !flip, ring);
      fan(g, O, flip, ring.map((p) => [p[0], p[1], p[2] + h] as V3));
    }
  }
}

function pts(P: Pair[], n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) out.push([num(P, 10 + i, 0), num(P, 20 + i, 0), num(P, 30 + i, 0)]);
  return out;
}
function same(a: V3, b: V3) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9;
}
function add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function dedupeRing(p: V3[]): V3[] {
  const out: V3[] = [];
  for (const v of p) if (!out.length || !same(out[out.length - 1], v)) out.push(v);
  if (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  return out;
}

/** Expand a polyline with bulges into points (OCS) at the given elevation. */
export function bulgeRing(v: [number, number, number][], closed: boolean, elev: number): { pts: V3[]; closed: boolean } {
  const out: V3[] = [];
  const n = v.length;
  for (let i = 0; i < n; i++) {
    const [x, y, bulge] = v[i];
    out.push([x, y, elev]);
    const isLast = i === n - 1;
    if (Math.abs(bulge) > 1e-9 && (!isLast || closed)) {
      const [x2, y2] = v[(i + 1) % n];
      const theta = 4 * Math.atan(bulge);
      const chord = Math.hypot(x2 - x, y2 - y);
      if (chord < 1e-12) continue;
      const r = chord / (2 * Math.sin(theta / 2));
      const mx = (x + x2) / 2, my = (y + y2) / 2;
      const d = r * Math.cos(theta / 2);
      const nx = -(y2 - y) / chord, ny = (x2 - x) / chord;
      const cx = mx + nx * d, cy = my + ny * d;
      const a0 = Math.atan2(y - cy, x - cx);
      const segs = Math.max(2, Math.ceil((ARC_SEGMENTS * Math.abs(theta)) / Math.PI));
      for (let s = 1; s < segs; s++) {
        const a = a0 + (theta * s) / segs;
        out.push([cx + Math.abs(r) * Math.cos(a), cy + Math.abs(r) * Math.sin(a), elev]);
      }
    }
  }
  return { pts: out, closed };
}

/** Ear clipping on a (roughly planar) 3D polygon, projected onto its dominant plane. */
export function earClip(p: V3[]): [number, number, number][] {
  // Newell normal
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const [u, w] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [2, 0];
  const sign = (az >= ax && az >= ay ? nz : ax >= ay ? nx : ny) >= 0 ? 1 : -1;
  const q = p.map((v) => [v[u], v[w]]);
  const idx = p.map((_, i) => i);
  const tris: [number, number, number][] = [];
  const area2 = (a: number[], b: number[], c: number[]) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * sign;
  const inside = (pt: number[], a: number[], b: number[], c: number[]) =>
    area2(a, b, pt) >= 0 && area2(b, c, pt) >= 0 && area2(c, a, pt) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      if (area2(q[i0], q[i1], q[i2]) <= 0) continue;
      let ok = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inside(q[j], q[i0], q[i1], q[i2])) { ok = false; break; }
      }
      if (!ok) continue;
      tris.push([i0, i1, i2]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  else for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]); // degenerate fallback
  return tris;
}
