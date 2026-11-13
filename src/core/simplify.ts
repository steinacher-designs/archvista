// ARCHVISTA — display simplification for very large models. Finely detailed parts (furniture, décor, plants)
// are thinned out by vertex clustering on a small grid, until the whole model fits a triangle budget.
// Large flat surfaces (walls, floors, roofs) have few triangles per m² and are never touched.
// Each triangle keeps its own normals and texture coordinates; only positions snap to the cell's vertex.

export interface SimplifiablePart { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array | Uint16Array }

/** Detail threshold: parts with more triangles per m² than this count as "fine detail". */
const DENSE = 40;
/** Parts with fewer triangles are never simplified (a box, a simple chair …). */
const MIN_TRIS = 300;

export function surfaceArea(p: SimplifiablePart): number {
  const P = p.positions, I = p.indices;
  let s = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return s;
}

/** Vertex clustering on a grid of `cell` metres. Returns a new part (or the same one if nothing changed). */
export function clusterPart<T extends SimplifiablePart>(p: T, cell: number): T {
  const P = p.positions, I = p.indices, nv = P.length / 3;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i + 1] < y0) y0 = P[i + 1]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i] > x1) x1 = P[i]; if (P[i + 1] > y1) y1 = P[i + 1]; }
  const nx = Math.floor((x1 - x0) / cell) + 1, ny = Math.floor((y1 - y0) / cell) + 1;
  const rep = new Int32Array(nv);
  const cells = new Map<number, number>();
  for (let v = 0; v < nv; v++) {
    const k = (Math.floor((P[v * 3 + 2] - z0) / cell) * ny + Math.floor((P[v * 3 + 1] - y0) / cell)) * nx + Math.floor((P[v * 3] - x0) / cell);
    const r = cells.get(k);
    if (r === undefined) { cells.set(k, v); rep[v] = v; } else rep[v] = r;
  }
  const keep: number[] = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = rep[I[t]], b = rep[I[t + 1]], c = rep[I[t + 2]];
    if (a !== b && b !== c && a !== c) keep.push(t);
  }
  if (keep.length * 3 === I.length) return p;
  // compact: only vertices still used; each keeps its normal and uv, its position becomes the cell's vertex
  const map = new Int32Array(nv).fill(-1);
  let n = 0;
  const idx = new Uint32Array(keep.length * 3);
  for (let i = 0; i < keep.length; i++) for (let k = 0; k < 3; k++) {
    const v = I[keep[i] + k];
    if (map[v] < 0) map[v] = n++;
    idx[i * 3 + k] = map[v];
  }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let v = 0; v < nv; v++) {
    const m = map[v];
    if (m < 0) continue;
    const r = rep[v];
    pos[m * 3] = P[r * 3]; pos[m * 3 + 1] = P[r * 3 + 1]; pos[m * 3 + 2] = P[r * 3 + 2];
    nrm[m * 3] = p.normals[v * 3]; nrm[m * 3 + 1] = p.normals[v * 3 + 1]; nrm[m * 3 + 2] = p.normals[v * 3 + 2];
    uv[m * 2] = p.uvs[v * 2]; uv[m * 2 + 1] = p.uvs[v * 2 + 1];
  }
  return { ...p, positions: pos, normals: nrm, uvs: uv, indices: idx };
}

/** Finely detailed part (furniture, décor …): many triangles per m² of surface. */
export function isDetailPart(p: SimplifiablePart): boolean {
  const tris = p.indices.length / 3;
  return tris > MIN_TRIS && tris / Math.max(surfaceArea(p), 1e-6) > DENSE;
}

export const triangleCount = (parts: SimplifiablePart[]) => parts.reduce((n, p) => n + p.indices.length / 3, 0);

/**
 * Thins out finely detailed parts until the model has at most `budget` triangles (as far as possible
 * with details up to 15 cm). Models under the budget come back unchanged (same array).
 */
export function simplifyToBudget<T extends SimplifiablePart>(parts: T[], budget: number): { parts: T[]; before: number; after: number; cell: number } {
  const before = triangleCount(parts);
  if (before <= budget) return { parts, before, after: before, cell: 0 };
  const info = parts.map((p) => { const tris = p.indices.length / 3; const a = tris > MIN_TRIS ? surfaceArea(p) : 0; return { tris, area: a, dense: tris > MIN_TRIS && tris / Math.max(a, 1e-6) > DENSE }; });
  const fixed = info.reduce((n, x) => n + (x.dense ? 0 : x.tris), 0);
  const denseArea = info.reduce((n, x) => n + (x.dense ? x.area : 0), 0);
  if (!denseArea) return { parts, before, after: before, cell: 0 };
  // a grid of c metres leaves roughly 2 triangles per c² of surface
  const target = Math.max(budget - fixed, budget * 0.25);
  let cell = Math.min(0.15, Math.max(0.01, Math.sqrt((2 * denseArea) / target)));
  let out = parts, after = before;
  for (let attempt = 0; attempt < 4; attempt++) {
    out = parts.map((p, i) => (info[i].dense ? clusterPart(p, cell) : p));
    after = triangleCount(out);
    if (after <= budget * 1.1 || cell >= 0.15) break;
    cell = Math.min(0.15, cell * Math.sqrt(after / budget) * 1.1);
  }
  return { parts: out, before, after, cell };
}
