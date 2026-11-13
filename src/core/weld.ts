// ARCHVISTA — memory-lean building blocks for very large models: growable typed arrays and a vertex
// welder that merges points on a grid while the model is read. Everything lives in typed arrays
// (outside the JavaScript heap, which a browser limits to about 4 GB), never in JS objects or Maps
// (a Map holds at most ~16.7 million entries).

export class GrowF64 {
  a: Float64Array;
  n = 0;
  constructor(cap = 1024) { this.a = new Float64Array(cap); }
  reserve(k: number) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float64Array(c); b.set(this.a.subarray(0, this.n)); this.a = b;
  }
  push(v: number) { if (this.n === this.a.length) this.reserve(1); this.a[this.n++] = v; }
  view() { return this.a.subarray(0, this.n); }
}

export class GrowI32 {
  a: Int32Array;
  n = 0;
  constructor(cap = 1024) { this.a = new Int32Array(cap); }
  push(v: number) { if (this.n === this.a.length) { const b = new Int32Array(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = v; }
  view() { return this.a.subarray(0, this.n); }
}

export class GrowF32 {
  a: Float32Array;
  n = 0;
  constructor(cap = 1024) { this.a = new Float32Array(cap); }
  reserve(k: number) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float32Array(c); b.set(this.a.subarray(0, this.n)); this.a = b;
  }
  push(v: number) { if (this.n === this.a.length) this.reserve(1); this.a[this.n++] = v; }
  /** Exact-size copy (frees the spare capacity). */
  take() { return this.a.slice(0, this.n); }
}

export class GrowU32 {
  a: Uint32Array;
  n = 0;
  constructor(cap = 1024) { this.a = new Uint32Array(cap); }
  reserve(k: number) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Uint32Array(c); b.set(this.a.subarray(0, this.n)); this.a = b;
  }
  push(v: number) { if (this.n === this.a.length) this.reserve(1); this.a[this.n++] = v; }
  take() { return this.a.slice(0, this.n); }
  view() { return this.a.subarray(0, this.n); }
}

/**
 * Welds vertices that fall into the same grid cell (edge length `cell`, in the model's units) and keeps
 * only triangles whose three corners stay distinct. For finely detailed objects this removes most
 * triangles that are smaller than a cell — invisible at room scale — while large surfaces stay exact.
 */
export class Welder {
  private inv: number;
  private keys: Int32Array;
  private vals: Int32Array;
  private mask: number;
  private used = 0;
  readonly pos = new GrowF64(48);
  readonly idx = new GrowU32(48);
  /** triangles offered / dropped because they collapsed */
  offered = 0;
  dropped = 0;
  constructor(readonly cell: number) {
    this.inv = 1 / cell;
    this.mask = 31;
    this.keys = new Int32Array(32 * 3);
    this.vals = new Int32Array(32).fill(-1);
  }
  get vertexCount() { return this.pos.n / 3; }
  get triangleCount() { return this.idx.n / 3; }

  private grow() {
    const oldK = this.keys, oldV = this.vals;
    const size = oldV.length * 2;
    this.keys = new Int32Array(size * 3);
    this.vals = new Int32Array(size).fill(-1);
    this.mask = size - 1;
    for (let s = 0; s < oldV.length; s++) {
      if (oldV[s] < 0) continue;
      const x = oldK[s * 3], y = oldK[s * 3 + 1], z = oldK[s * 3 + 2];
      let h = this.hash(x, y, z);
      while (this.vals[h] >= 0) h = (h + 1) & this.mask;
      this.keys[h * 3] = x; this.keys[h * 3 + 1] = y; this.keys[h * 3 + 2] = z; this.vals[h] = oldV[s];
    }
  }
  private hash(x: number, y: number, z: number) {
    return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & this.mask;
  }
  vertex(x: number, y: number, z: number): number {
    const ix = Math.floor(x * this.inv) | 0, iy = Math.floor(y * this.inv) | 0, iz = Math.floor(z * this.inv) | 0;
    let h = this.hash(ix, iy, iz);
    for (;;) {
      const v = this.vals[h];
      if (v < 0) break;
      if (this.keys[h * 3] === ix && this.keys[h * 3 + 1] === iy && this.keys[h * 3 + 2] === iz) return v;
      h = (h + 1) & this.mask;
    }
    const id = this.pos.n / 3;
    this.keys[h * 3] = ix; this.keys[h * 3 + 1] = iy; this.keys[h * 3 + 2] = iz; this.vals[h] = id;
    this.pos.reserve(3);
    this.pos.a[this.pos.n++] = x; this.pos.a[this.pos.n++] = y; this.pos.a[this.pos.n++] = z;
    if (++this.used * 2 > this.vals.length) this.grow(); // keep the table at most half full
    return id;
  }
  tri(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
    this.offered++;
    const a = this.vertex(ax, ay, az), b = this.vertex(bx, by, bz), c = this.vertex(cx, cy, cz);
    if (a === b || b === c || a === c) { this.dropped++; return; }
    this.idx.reserve(3);
    this.idx.a[this.idx.n++] = a; this.idx.a[this.idx.n++] = b; this.idx.a[this.idx.n++] = c;
  }
}

/** Triangles above which a model is read in "large model" mode (welded and thinned while reading). */
export const LARGE_MODEL_TRIANGLES = 3_000_000;
/** Triangles a large model is brought down to while reading (fine details only). */
export const IMPORT_BUDGET = 2_500_000;

/**
 * Removes triangles that use the same three vertices as an earlier one (in any order) – e.g. the front
 * and back copy of a face. Typed-array hash set, no JS Map.
 */
export function dedupeTriangles(I: Uint32Array): { indices: Uint32Array; removed: number } {
  const n = I.length / 3;
  let size = 64; while (size < n * 2) size *= 2;
  const mask = size - 1;
  const keys = new Uint32Array(size * 3), used = new Uint8Array(size);
  const out = new Uint32Array(I.length);
  let o = 0;
  for (let t = 0; t < n; t++) {
    let a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    // sort the three ids
    if (a > b) { const x = a; a = b; b = x; }
    if (b > c) { const x = b; b = c; c = x; }
    if (a > b) { const x = a; a = b; b = x; }
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & mask;
    let dup = false;
    while (used[h]) {
      if (keys[h * 3] === a && keys[h * 3 + 1] === b && keys[h * 3 + 2] === c) { dup = true; break; }
      h = (h + 1) & mask;
    }
    if (dup) continue;
    used[h] = 1; keys[h * 3] = a; keys[h * 3 + 1] = b; keys[h * 3 + 2] = c;
    out[o++] = I[t * 3]; out[o++] = I[t * 3 + 1]; out[o++] = I[t * 3 + 2];
  }
  return { indices: out.slice(0, o), removed: n - o / 3 };
}
