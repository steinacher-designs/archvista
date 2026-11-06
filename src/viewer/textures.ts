// ARCHVISTA — procedural, tileable PBR textures (colour, normal, roughness) generated at runtime.
// No image files → nothing to license, tiny downloads, identical in the app and on the website.

import { DataTexture, RepeatWrapping, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter, RGBAFormat, UnsignedByteType, NoColorSpace } from "three";
import type { TextureKind } from "../core/materials";

const SIZE = 512;

function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Tileable value noise with integer period p. */
function vnoise(x: number, y: number, p: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (a: number) => ((a % p) + p) % p;
  const a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s), c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fbm over [0,1)² tile, base frequency f (integer), octaves o. */
function fbm(u: number, v: number, f: number, o: number, s = 1) {
  let sum = 0, amp = 0.5, norm = 0, freq = f;
  for (let i = 0; i < o; i++) {
    sum += amp * vnoise(u * freq, v * freq, freq, s + i * 17);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface PBRMaps { map: DataTexture; normalMap: DataTexture; roughnessMap: DataTexture }

const cache = new Map<string, PBRMaps>();

/** h: height 0..1, c: colour multiplier 0..~1.2, r: roughness factor 0..1 */
type Sampler = (u: number, v: number) => { h: number; c: number; r: number; tint?: [number, number, number] };

function sampler(kind: TextureKind): { fn: Sampler; normal: number } {
  switch (kind) {
    case "plaster":
      return { normal: 1.2, fn: (u, v) => { const n = fbm(u, v, 16, 5, 3); const big = fbm(u, v, 3, 3, 9); return { h: n, c: 0.93 + 0.07 * n + 0.04 * (big - 0.5), r: 0.9 + 0.1 * n }; } };
    case "concrete":
      return { normal: 1.6, fn: (u, v) => {
        const big = fbm(u, v, 4, 4, 5), fine = fbm(u, v, 64, 3, 7);
        const pore = fine < 0.22 ? (0.22 - fine) * 3 : 0;
        // formwork panels: 2 x 4 per tile, tie holes at panel quarters
        const pu = (u * 2) % 1, pv = (v * 4) % 1;
        const seam = Math.min(pu, 1 - pu) < 0.003 || Math.min(pv, 1 - pv) < 0.004 ? 1 : 0;
        const hx = ((u * 4) % 1) - 0.5, hy = ((v * 4) % 1) - 0.5;
        const hole = Math.hypot(hx * 4, hy * 2) < 0.08 ? 1 : 0;
        return { h: 0.6 + 0.3 * fine - pore - seam * 0.4 - hole * 0.6, c: 0.86 + 0.18 * big + 0.05 * fine - pore * 0.6 - seam * 0.12 - hole * 0.35, r: 0.85 + 0.15 * fine };
      } };
    case "brick": {
      const rows = 16, cols = 5;
      return { normal: 3, fn: (u, v) => {
        const row = Math.floor(v * rows), off = row % 2 ? 0.5 : 0;
        const x = u * cols + off, col = Math.floor(x);
        const fx = x - col, fy = v * rows - row;
        const mortar = fx < 0.04 || fy < 0.13;
        const id = hash(((col % cols) + cols) % cols, row, 11);
        const n = fbm(u, v, 32, 3, 13);
        if (mortar) return { h: 0.2 + 0.1 * n, c: 1.0, r: 1, tint: [0.78, 0.76, 0.72] };
        return { h: 0.8 + 0.15 * n, c: 0.72 + 0.3 * id + 0.12 * (n - 0.5), r: 0.85 + 0.1 * n };
      } };
    }
    case "wood": {
      const planks = 8;
      return { normal: 0.9, fn: (u, v) => {
        const p = Math.floor(u * planks);
        const len = 0.25 + hash(p, 1, 3) * 0.2;
        const off = hash(p, 2, 3);
        const seg = Math.floor((v + off) / len);
        const id = hash(p, seg, 5);
        const fx = u * planks - p, fy = (v + off) / len - seg;
        const gap = fx < 0.015 || fy < 0.006 ? 1 : 0;
        const grain = 0.5 + 0.5 * Math.sin((fx * 40 + fbm(u, v, 8, 4, 21 + p) * 9 + id * 20) * 1.0);
        const fine = fbm(u * 1, v, 64, 2, 31);
        return { h: 0.7 - gap * 0.5 + 0.06 * grain, c: 0.78 + 0.28 * id + 0.12 * (grain - 0.5) + 0.05 * fine - gap * 0.35, r: 0.85 + 0.15 * grain };
      } };
    }
    case "planks": {
      const boards = 12;
      return { normal: 1.6, fn: (u, v) => {
        const b = Math.floor(u * boards), fx = u * boards - b;
        const id = hash(b, 7, 9);
        const gap = fx < 0.04 ? 1 : 0;
        const grain = 0.5 + 0.5 * Math.sin(fx * 25 + fbm(u, v, 4, 4, 40 + b) * 12);
        return { h: 0.8 - gap * 0.7 + 0.05 * grain, c: 0.8 + 0.25 * id + 0.1 * (grain - 0.5) - gap * 0.5, r: 0.9 };
      } };
    }
    case "tiles": {
      const n = 2;
      return { normal: 2, fn: (u, v) => {
        const tx = Math.floor(u * n), ty = Math.floor(v * n);
        const fx = u * n - tx, fy = v * n - ty;
        const grout = fx < 0.008 || fy < 0.008 || fx > 0.992 || fy > 0.992;
        const id = hash(tx, ty, 17);
        const speck = fbm(u, v, 64, 3, 19 + tx * 3 + ty);
        if (grout) return { h: 0.2, c: 0.82, r: 1 };
        return { h: 0.8 + 0.05 * speck, c: 0.9 + 0.12 * id + 0.12 * (speck - 0.5), r: 0.7 + 0.3 * speck };
      } };
    }
    case "roof": {
      const rows = 3, cols = 4;
      return { normal: 3.5, fn: (u, v) => {
        const r = Math.floor(v * rows), fy = v * rows - r;
        const x = u * cols + (r % 2 ? 0.5 : 0), c = Math.floor(x), fx = x - c;
        const id = hash(((c % cols) + cols) % cols, r, 23);
        const n = fbm(u, v, 32, 3, 29);
        const shade = 0.6 + 0.4 * fy; // overlap shadow at lower edge
        const seam = fx < 0.02 ? 0.55 : 1;
        const curve = 0.5 + 0.5 * Math.cos((fx - 0.5) * Math.PI * 2);
        return { h: fy * 0.8 + curve * 0.2 - (fx < 0.02 ? 0.3 : 0), c: (0.75 + 0.3 * id + 0.1 * (n - 0.5)) * shade * seam, r: 0.75 + 0.2 * n };
      } };
    }
    case "grass":
      return { normal: 1.8, fn: (u, v) => {
        const n = fbm(u, v, 8, 5, 41), b = fbm(u, v, 96, 2, 43);
        const dry = Math.max(0, n - 0.55) * 1.6;
        return { h: b, c: 0.7 + 0.45 * n + 0.25 * (b - 0.5), r: 0.95, tint: dry > 0 ? [0.31 + dry * 0.25, 0.42 + dry * 0.1, 0.17] : undefined };
      } };
    case "stone": {
      return { normal: 3, fn: (u, v) => {
        // simple tileable Worley cells
        const g = 6;
        let d1 = 9, d2 = 9, id = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const cx = Math.floor(u * g) + i, cy = Math.floor(v * g) + j;
          const w = (a: number) => ((a % g) + g) % g;
          const px = cx + hash(w(cx), w(cy), 51), py = cy + hash(w(cx), w(cy), 53);
          const d = Math.hypot(u * g - px, v * g - py);
          if (d < d1) { d2 = d1; d1 = d; id = hash(w(cx), w(cy), 57); } else if (d < d2) d2 = d;
        }
        const edge = d2 - d1;
        const n = fbm(u, v, 32, 3, 59);
        if (edge < 0.08) return { h: 0.2, c: 0.85, r: 1, tint: [0.8, 0.78, 0.74] };
        return { h: 0.6 + Math.min(edge, 0.5) * 0.6 + 0.08 * n, c: 0.75 + 0.35 * id + 0.12 * (n - 0.5), r: 0.8 + 0.2 * n };
      } };
    }
    default:
      return { normal: 0, fn: () => ({ h: 0.5, c: 1, r: 1 }) };
  }
}

export function makeMaps(kind: TextureKind, color: string): PBRMaps | null {
  if (kind === "none") return null;
  const key = `${kind}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [cr, cg, cb] = hexRgb(color);
  const { fn, normal } = sampler(kind);
  const N = SIZE * SIZE;
  const col = new Uint8Array(N * 4), nor = new Uint8Array(N * 4), rough = new Uint8Array(N * 4);
  const hgt = new Float32Array(N);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const s = fn((x + 0.5) / SIZE, (y + 0.5) / SIZE);
      const i = y * SIZE + x;
      hgt[i] = s.h;
      const t = s.tint ? [s.tint[0] * 255, s.tint[1] * 255, s.tint[2] * 255] : [cr, cg, cb];
      col[i * 4] = Math.max(0, Math.min(255, t[0] * s.c));
      col[i * 4 + 1] = Math.max(0, Math.min(255, t[1] * s.c));
      col[i * 4 + 2] = Math.max(0, Math.min(255, t[2] * s.c));
      col[i * 4 + 3] = 255;
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = Math.max(0, Math.min(255, s.r * 255));
      rough[i * 4 + 3] = 255;
    }
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const l = hgt[y * SIZE + ((x + SIZE - 1) % SIZE)], r = hgt[y * SIZE + ((x + 1) % SIZE)];
      const d = hgt[((y + SIZE - 1) % SIZE) * SIZE + x], u = hgt[((y + 1) % SIZE) * SIZE + x];
      let nx = (l - r) * normal * 4, ny = (d - u) * normal * 4;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len;
      nor[i * 4] = (nx * 0.5 + 0.5) * 255;
      nor[i * 4 + 1] = (ny * 0.5 + 0.5) * 255;
      nor[i * 4 + 2] = (nz / len * 0.5 + 0.5) * 255;
      nor[i * 4 + 3] = 255;
    }
  const tex = (data: Uint8Array, srgb: boolean) => {
    const t = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    t.anisotropy = 8;
    t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const maps = { map: tex(col, true), normalMap: tex(nor, false), roughnessMap: tex(rough, false) };
  cache.set(key, maps);
  return maps;
}

/** Procedural normal map for water (tileable ripples). */
export function waterNormals(): DataTexture {
  const S = 256, data = new Uint8Array(S * S * 4);
  const h = (x: number, y: number) => fbm(x / S, y / S, 8, 4, 77) * 0.7 + fbm(x / S, y / S, 24, 2, 79) * 0.3;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = h((x + 1) % S, y) - h((x + S - 1) % S, y), dy = h(x, (y + 1) % S) - h(x, (y + S - 1) % S);
      const nx = -dx * 6, ny = -dy * 6, l = Math.hypot(nx, ny, 1);
      const i = (y * S + x) * 4;
      data[i] = (nx / l * 0.5 + 0.5) * 255; data[i + 1] = (ny / l * 0.5 + 0.5) * 255; data[i + 2] = (1 / l * 0.5 + 0.5) * 255; data[i + 3] = 255;
    }
  const t = new DataTexture(data, S, S, RGBAFormat, UnsignedByteType);
  t.wrapS = t.wrapT = RepeatWrapping; t.generateMipmaps = true; t.minFilter = LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}

/** Facade texture for background city buildings: window grid with some lit windows. */
export function facadeTexture(seed: number): DataTexture {
  const W = 128, H = 256, data = new Uint8Array(W * H * 4);
  const base = 150 + hash(seed, 1, 1) * 80;
  const tint = [base, base * (0.95 + hash(seed, 2, 1) * 0.08), base * (0.9 + hash(seed, 3, 1) * 0.1)];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const fx = (x % 16) / 16, fy = (y % 21) / 21;
      const win = fx > 0.2 && fx < 0.8 && fy > 0.25 && fy < 0.85;
      const lit = hash(Math.floor(x / 16), Math.floor(y / 21), seed) > 0.85;
      const i = (y * W + x) * 4;
      if (win) { const v = lit ? [235, 215, 160] : [60, 72, 84]; data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; }
      else { data[i] = tint[0]; data[i + 1] = tint[1]; data[i + 2] = tint[2]; }
      data[i + 3] = 255;
    }
  const t = new DataTexture(data, W, H, RGBAFormat, UnsignedByteType);
  t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace; t.generateMipmaps = true; t.minFilter = LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}
