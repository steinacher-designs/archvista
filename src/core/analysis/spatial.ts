// ARCHVISTA — storeys, walkable area, rooms and entrance from geometry (plan grid analysis).

import type { ModelMesh } from "../dxf/import";
import type { Category } from "./classify";

export interface Grid { x0: number; z0: number; cell: number; nx: number; nz: number }

export interface Level {
  index: number;
  elevation: number; // floor top, metres (model Y)
  height: number; // to next level (or default)
  name: { de: string; en: string };
}

export interface Room {
  id: number;
  level: number;
  cells: number;
  area: number; // m², approximate (grid based)
  centroid: [number, number]; // x, z
  outline: [number, number][]; // x, z polygon (outer boundary)
  covered: boolean; // has a ceiling/roof → interior
}

export interface LevelPlan {
  level: Level;
  floorY: Float32Array; // NaN = no floor
  ceilY: Float32Array; // lowest geometry above floor (Infinity = open sky)
  walkable: Uint8Array; // 1 = floor + headroom + not blocked
  blocked: Uint8Array; // 1 = obstacle cut at knee height
  room: Int32Array; // room id or -1
}

export interface Entrance { level: number; position: [number, number, number]; inward: [number, number]; width: number }

export interface SpatialAnalysis {
  grid: Grid;
  levels: Level[];
  plans: LevelPlan[];
  rooms: Room[];
  entrance: Entrance | null;
  groundY: number;
  notes: string[];
}

const SKIP_FOR_FLOORS: Category[] = ["roof", "terrain", "furniture", "glass", "window", "railing", "stair", "door"];

export interface AnalysisInput { meshes: ModelMesh[]; categories: Map<string, Category>; bbox: { min: number[]; max: number[] } }

export function analyse(input: AnalysisInput): SpatialAnalysis {
  const { meshes, categories, bbox } = input;
  const notes: string[] = [];
  const ext = Math.max(bbox.max[0] - bbox.min[0], bbox.max[2] - bbox.min[2]);
  const cell = Math.max(0.1, ext / 1500);
  const margin = 2;
  const grid: Grid = {
    x0: bbox.min[0] - margin, z0: bbox.min[2] - margin, cell,
    nx: Math.ceil((bbox.max[0] - bbox.min[0] + 2 * margin) / cell),
    nz: Math.ceil((bbox.max[2] - bbox.min[2] + 2 * margin) / cell),
  };

  const levels = detectLevels(meshes, categories, bbox);
  if (!levels.length) notes.push("Keine Geschossebene erkannt – Begehung startet außen.");
  const plans = levels.map((lv) => planLevel(meshes, categories, grid, lv));
  // drop levels without real walkable area (e.g. flat roof top)
  const kept = plans.filter((p) => count(p.walkable) * cell * cell >= 8);
  kept.forEach((p, i) => { p.level.index = i; });
  nameLevels(kept.map((p) => p.level), bbox.min[1]);
  for (let i = 0; i < kept.length; i++)
    kept[i].level.height = i + 1 < kept.length ? kept[i + 1].level.elevation - kept[i].level.elevation : 3;

  const rooms: Room[] = [];
  for (const p of kept) findRooms(p, grid, rooms);
  const entrance = findEntrance(kept, grid, rooms);
  if (!entrance && kept.length) notes.push("Kein Eingang erkannt – der Besuch startet vor dem Gebäude.");
  const hasTerrain = meshes.some((m) => categories.get(m.id) === "terrain");
  return { grid, levels: kept.map((p) => p.level), plans: kept, rooms, entrance, groundY: hasTerrain ? bbox.min[1] - 0.05 : bbox.min[1], notes };
}

function count(a: Uint8Array) { let n = 0; for (let i = 0; i < a.length; i++) n += a[i]; return n; }

// ——— storeys ———
export function detectLevels(meshes: ModelMesh[], categories: Map<string, Category>, bbox: { min: number[]; max: number[] }): Level[] {
  const bin = 0.05;
  const hist = new Map<number, number>();
  for (const m of meshes) {
    if (SKIP_FOR_FLOORS.includes(categories.get(m.id) ?? "other")) continue;
    const p = m.positions, I = m.indices;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (!l || ny / l < 0.97) continue; // up-facing horizontal only
      const y = (p[a + 1] + p[b + 1] + p[c + 1]) / 3;
      const k = Math.round(y / bin);
      hist.set(k, (hist.get(k) ?? 0) + l / 2);
    }
  }
  const entries = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const maxA = entries[0][1];
  const accepted: number[] = [];
  for (const [k, a] of entries) {
    if (a < Math.max(4, 0.12 * maxA)) break;
    const y = k * bin;
    if (accepted.every((u) => Math.abs(u - y) >= 2.0)) accepted.push(y);
  }
  accepted.sort((a, b) => a - b);
  void bbox;
  return accepted.map((y, i) => ({ index: i, elevation: y, height: 3, name: { de: "", en: "" } }));
}

function nameLevels(levels: Level[], minY: number) {
  // Ground floor = lowest level close to the building's base; lower ones are basements.
  let g = levels.findIndex((l) => l.elevation >= minY - 0.01 && l.elevation <= minY + 1.5);
  if (g < 0) g = 0;
  levels.forEach((l, i) => {
    const d = i - g;
    if (d === 0) l.name = { de: "Erdgeschoss", en: "Ground floor" };
    else if (d < 0) l.name = { de: d === -1 ? "Untergeschoss" : `${-d}. Untergeschoss`, en: d === -1 ? "Basement" : `Basement ${-d}` };
    else if (i === levels.length - 1 && d >= 2) l.name = { de: "Dachgeschoss", en: "Top floor" };
    else l.name = { de: `${d}. Obergeschoss`, en: `Floor ${d}` };
  });
}

// ——— per-level plan ———
function planLevel(meshes: ModelMesh[], categories: Map<string, Category>, g: Grid, level: Level): LevelPlan {
  const N = g.nx * g.nz;
  const floorY = new Float32Array(N).fill(NaN);
  const ceilY = new Float32Array(N).fill(Infinity);
  const blocked = new Uint8Array(N);
  const e = level.elevation;
  const cuts = [e + 0.35, e + 0.75];

  // pass 1: floors (up-facing near elevation)
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    if (ny < 0.7 || cat === "roof") return;
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.45 || ymin > e + 0.45) return;
    rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i, y) => {
      if (y <= e + 0.45 && y >= e - 0.45 && !(floorY[i] >= y)) floorY[i] = y;
    });
  }, categories);
  // pass 2: lowest geometry above the floor (headroom), and obstacles cut at knee height
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.1 || ymin > e + 4) return;
    for (const h of cuts) if (ymin < h && ymax > h) cutSegment(g, blocked, h, ax, ay, az, bx, by, bz, cx, cy, cz);
    if (Math.abs(ny) > 0.05) {
      rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i, y) => {
        const f = floorY[i];
        // down-facing surfaces at floor height (bottom of a wall/column standing on the slab) close the cell
        if (!Number.isNaN(f) && (ny < 0 ? y > f - 0.03 : y > f + 0.05) && y < ceilY[i]) ceilY[i] = y;
      });
    }
    void cat;
  }, categories);

  const walkable = new Uint8Array(N);
  for (let i = 0; i < N; i++) walkable[i] = !Number.isNaN(floorY[i]) && ceilY[i] - floorY[i] >= 1.9 && !blocked[i] ? 1 : 0;
  return { level, floorY, ceilY, walkable, blocked, room: new Int32Array(N).fill(-1) };
}

type TriFn = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, ny: number, cat: Category) => void;
function forEachTri(meshes: ModelMesh[], fn: TriFn, categories: Map<string, Category>) {
  for (const m of meshes) {
    const cat = categories.get(m.id) ?? "other";
    const p = m.positions, I = m.indices;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      fn(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2], ny / l, cat);
    }
  }
}

/** Visit grid cells whose centre lies inside the XZ projection of a triangle, with interpolated Y. */
export function rasterTri(g: Grid, ax: number, az: number, ay: number, bx: number, bz: number, by: number, cx: number, cz: number, cy: number, cb: (i: number, y: number) => void) {
  const minX = Math.max(0, Math.floor((Math.min(ax, bx, cx) - g.x0) / g.cell));
  const maxX = Math.min(g.nx - 1, Math.floor((Math.max(ax, bx, cx) - g.x0) / g.cell));
  const minZ = Math.max(0, Math.floor((Math.min(az, bz, cz) - g.z0) / g.cell));
  const maxZ = Math.min(g.nz - 1, Math.floor((Math.max(az, bz, cz) - g.z0) / g.cell));
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(d) < 1e-12) return;
  for (let j = minZ; j <= maxZ; j++) {
    const pz = g.z0 + (j + 0.5) * g.cell;
    for (let i = minX; i <= maxX; i++) {
      const px = g.x0 + (i + 0.5) * g.cell;
      const w1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
      const w2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      cb(j * g.nx + i, w1 * ay + w2 * by + w3 * cy);
    }
  }
}

/** Mark cells crossed by the intersection of a triangle with the plane y = h. */
function cutSegment(g: Grid, out: Uint8Array, h: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
  const pts: [number, number][] = [];
  const edge = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    if ((y1 - h) * (y2 - h) < 0) {
      const t = (h - y1) / (y2 - y1);
      pts.push([x1 + t * (x2 - x1), z1 + t * (z2 - z1)]);
    }
  };
  edge(ax, ay, az, bx, by, bz); edge(bx, by, bz, cx, cy, cz); edge(cx, cy, cz, ax, ay, az);
  if (pts.length < 2) return;
  const [[x1, z1], [x2, z2]] = pts;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(len / (g.cell * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const x = x1 + ((x2 - x1) * s) / steps, z = z1 + ((z2 - z1) * s) / steps;
    const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
    if (i >= 0 && j >= 0 && i < g.nx && j < g.nz) out[j * g.nx + i] = 1;
  }
}

// ——— rooms ———
function dilate(src: Uint8Array, g: Grid, r: number): Uint8Array {
  // separable square dilation (Chebyshev radius r)
  const tmp = new Uint8Array(src.length), out = new Uint8Array(src.length);
  for (let j = 0; j < g.nz; j++) {
    let last = -1e9;
    for (let i = 0; i < g.nx; i++) { if (src[j * g.nx + i]) last = i; if (i - last <= r) tmp[j * g.nx + i] = 1; }
    last = 1e9;
    for (let i = g.nx - 1; i >= 0; i--) { if (src[j * g.nx + i]) last = i; if (last - i <= r) tmp[j * g.nx + i] = 1; }
  }
  for (let i = 0; i < g.nx; i++) {
    let last = -1e9;
    for (let j = 0; j < g.nz; j++) { if (tmp[j * g.nx + i]) last = j; if (j - last <= r) out[j * g.nx + i] = 1; }
    last = 1e9;
    for (let j = g.nz - 1; j >= 0; j--) { if (tmp[j * g.nx + i]) last = j; if (last - j <= r) out[j * g.nx + i] = 1; }
  }
  return out;
}

function findRooms(p: LevelPlan, g: Grid, rooms: Room[]) {
  const N = g.nx * g.nz;
  const r = Math.max(2, Math.round(0.65 / g.cell)); // closes doorways up to ~1.3 m
  const closed = dilate(p.blocked, g, r);
  // exterior: flood from the grid border through non-closed cells
  const exterior = new Uint8Array(N);
  const q: number[] = [];
  for (let i = 0; i < g.nx; i++) for (const j of [0, g.nz - 1]) push(j * g.nx + i);
  for (let j = 0; j < g.nz; j++) for (const i of [0, g.nx - 1]) push(j * g.nx + i);
  function push(c: number) { if (!closed[c] && !exterior[c]) { exterior[c] = 1; q.push(c); } }
  while (q.length) {
    const c = q.pop()!;
    const i = c % g.nx, j = (c / g.nx) | 0;
    if (i > 0) push(c - 1); if (i < g.nx - 1) push(c + 1); if (j > 0) push(c - g.nx); if (j < g.nz - 1) push(c + g.nx);
  }
  // seeds: walkable, not near walls, not exterior
  const minCells = Math.ceil(1.5 / (g.cell * g.cell));
  const seedOf = p.room;
  const local: Room[] = [];
  for (let s = 0; s < N; s++) {
    if (seedOf[s] !== -1 || !p.walkable[s] || closed[s] || exterior[s]) continue;
    const comp: number[] = [s];
    const id = rooms.length + local.length;
    seedOf[s] = id;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k];
      const i = c % g.nx, j = (c / g.nx) | 0;
      for (const n of [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || closed[n] || exterior[n]) continue;
        seedOf[n] = id;
        comp.push(n);
      }
    }
    if (comp.length < minCells) { for (const c of comp) seedOf[c] = -2; continue; }
    local.push({ id, level: p.level.index, cells: comp.length, area: 0, centroid: [0, 0], outline: [], covered: true });
  }
  for (let i = 0; i < N; i++) if (seedOf[i] === -2) seedOf[i] = -1;
  // regrow into the band near walls, at most r steps, never into the exterior
  let frontier: number[] = [];
  for (let c = 0; c < N; c++) if (seedOf[c] >= 0) frontier.push(c);
  for (let step = 0; step < r + 1 && frontier.length; step++) {
    const next: number[] = [];
    for (const c of frontier) {
      const i = c % g.nx, j = (c / g.nx) | 0;
      for (const n of [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || exterior[n]) continue;
        seedOf[n] = seedOf[c];
        next.push(n);
      }
    }
    frontier = next;
  }
  // stats & outlines
  for (const room of local) {
    let n = 0, sx = 0, sz = 0, cov = 0;
    for (let c = 0; c < N; c++) if (seedOf[c] === room.id) { n++; sx += c % g.nx; sz += (c / g.nx) | 0; if (Number.isFinite(p.ceilY[c])) cov++; }
    room.covered = cov > n * 0.6;
    room.cells = n;
    room.area = Math.round(n * g.cell * g.cell * 10) / 10;
    room.centroid = [g.x0 + (sx / n + 0.5) * g.cell, g.z0 + (sz / n + 0.5) * g.cell];
    room.outline = traceOutline(seedOf, room.id, g);
    rooms.push(room);
  }
}

/** Outer boundary of a cell region as an axis-aligned polygon (collinear points removed). */
export function traceOutline(lbl: Int32Array, id: number, g: Grid): [number, number][] {
  const W = g.nx + 1;
  const next = new Map<number, number>(); // vertex → next vertex (CCW around the region in grid space)
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < g.nx && j < g.nz && lbl[j * g.nx + i] === id;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      if (lbl[j * g.nx + i] !== id) continue;
      if (!at(i, j - 1)) next.set(j * W + i, j * W + i + 1);
      if (!at(i + 1, j)) next.set(j * W + i + 1, (j + 1) * W + i + 1);
      if (!at(i, j + 1)) next.set((j + 1) * W + i + 1, (j + 1) * W + i);
      if (!at(i - 1, j)) next.set((j + 1) * W + i, j * W + i);
    }
  // collect loops, keep the longest (outer boundary)
  let best: number[] = [];
  const used = new Set<number>();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop: number[] = [];
    let v = start;
    while (!used.has(v) && next.has(v)) { used.add(v); loop.push(v); v = next.get(v)!; }
    if (loop.length > best.length) best = loop;
  }
  const pts = best.map((v) => [v % W, (v / W) | 0]);
  const simp: number[][] = [];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[(k + pts.length - 1) % pts.length], b = pts[k], c = pts[(k + 1) % pts.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) simp.push(b);
  }
  return simp.map(([i, j]) => [g.x0 + i * g.cell, g.z0 + j * g.cell]);
}

// ——— entrance ———
function findEntrance(plans: LevelPlan[], g: Grid, rooms: Room[]): Entrance | null {
  for (const p of plans) {
    const N = g.nx * g.nz;
    // sources: walkable cells next to "outside" (cells without floor that are not obstacles)
    const seen = new Uint8Array(N);
    const q: number[] = [];
    const nb = (c: number) => {
      const i = c % g.nx, j = (c / g.nx) | 0;
      return [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1];
    };
    for (let c = 0; c < N; c++) {
      if (!p.walkable[c] || p.room[c] >= 0) continue;
      if (nb(c).some((n) => n < 0 || (Number.isNaN(p.floorY[n]) && !p.blocked[n]))) { seen[c] = 1; q.push(c); }
    }
    const thresholds: number[] = [];
    for (let k = 0; k < q.length; k++) {
      const c = q[k];
      for (const n of nb(c)) {
        if (n < 0 || seen[n] || !p.walkable[n]) continue;
        if (p.room[n] >= 0) { thresholds.push(n); continue; }
        seen[n] = 1;
        q.push(n);
      }
    }
    if (!thresholds.length) continue;
    // cluster threshold cells by connectivity
    const tset = new Set(thresholds);
    const clusters: number[][] = [];
    const done = new Set<number>();
    for (const t of tset) {
      if (done.has(t)) continue;
      const cl = [t]; done.add(t);
      for (let k = 0; k < cl.length; k++) {
        const c = cl[k];
        const i = c % g.nx, j = (c / g.nx) | 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          const n = (j + dj) * g.nx + (i + di);
          if (tset.has(n) && !done.has(n)) { done.add(n); cl.push(n); }
        }
      }
      clusters.push(cl);
    }
    let best: { cl: number[]; score: number } | null = null;
    for (const cl of clusters) {
      const width = cl.length * g.cell;
      if (width < 0.6) continue;
      const room = rooms.find((r) => r.id === p.room[cl[0]]);
      const score = (room?.area ?? 0) + Math.min(width, 2.5) * 10;
      if (!best || score > best.score) best = { cl, score };
    }
    if (!best) continue;
    let sx = 0, sz = 0, sy = 0;
    for (const c of best.cl) { sx += c % g.nx; sz += (c / g.nx) | 0; sy += p.floorY[c]; }
    const n = best.cl.length;
    const cx = g.x0 + (sx / n + 0.5) * g.cell, cz = g.z0 + (sz / n + 0.5) * g.cell;
    const room = rooms.find((r) => r.id === p.room[best!.cl[0]])!;
    let ix = room.centroid[0] - cx, iz = room.centroid[1] - cz;
    // snap the inward direction to the dominant axis of the threshold line normal
    const xs = best.cl.map((c) => c % g.nx), zs = best.cl.map((c) => (c / g.nx) | 0);
    const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
    if (spanX > spanZ) { ix = 0; iz = Math.sign(iz) || 1; } else if (spanZ > spanX) { iz = 0; ix = Math.sign(ix) || 1; }
    const l = Math.hypot(ix, iz) || 1;
    return { level: p.level.index, position: [cx, sy / n, cz], inward: [ix / l, iz / l], width: Math.max(spanX, spanZ) * g.cell + g.cell };
  }
  return null;
}

export function cellOf(g: Grid, x: number, z: number): number {
  const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
  if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return -1;
  return j * g.nx + i;
}
