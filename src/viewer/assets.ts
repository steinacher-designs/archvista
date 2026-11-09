// ARCHVISTA — loading of the bundled CC0 asset library (Poly Haven): HDRI skies, photo textures, plant models.
// Every loader degrades gracefully: if an asset is missing (offline/old export) the procedural fallback is used.

import {
  BufferGeometry, Color, DataTexture, DataUtils, Float32BufferAttribute, EquirectangularReflectionMapping, HalfFloatType, LinearSRGBColorSpace, Material, Mesh,
  MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Vector3, Matrix4,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export interface Manifest {
  textures: Record<string, { size: number }>;
  hdri: Record<string, object>;
  models: Record<string, object>;
}

export interface PhotoMaps { map: Texture; normalMap: Texture; arm: Texture; size: number }
export interface HdriInfo { texture: DataTexture; sunDir: Vector3; sunColor: Color; horizon: Color; zenith: Color; ground: Color }
export interface ModelPart { geometry: BufferGeometry; material: Material }
export interface ModelAsset { parts: ModelPart[]; height: number }

export class AssetLibrary {
  private manifest: Manifest | null = null;
  private tex = new Map<string, Promise<PhotoMaps | null>>();
  private hdr = new Map<string, Promise<HdriInfo | null>>();
  private custom = new Map<string, Promise<{ hdri: HdriInfo; background: Texture; cameraHeight: number; hdrBackground: boolean } | null>>();
  private models = new Map<string, Promise<ModelAsset | null>>();
  private ready: Promise<void>;
  private inflight = 0;
  pending() { return this.inflight; }
  private track<T>(p: Promise<T>): Promise<T> { this.inflight++; p.finally(() => this.inflight--); return p; }

  constructor(readonly base: string | null) {
    this.ready = base
      ? fetch(base + "manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => { this.manifest = m; }).catch(() => { this.manifest = null; })
      : Promise.resolve();
  }

  /** Synchronous check (manifest already loaded); undefined while still loading. */
  hasSync(kind: keyof Manifest, key: string): boolean | undefined {
    if (!this.base) return false;
    if (!this.manifest) return undefined;
    return !!this.manifest[kind]?.[key];
  }
  whenReady() { return this.ready; }

  /**
   * The user's own surroundings from a 360° panorama: HDR/EXR (true light) or a normal photo (JPG/PNG/WebP).
   * Returns the same shape as photoEnv; `hdrBackground` = the background is linear HDR (needs tone mapping).
   */
  customEnv(url: string, kind: "hdr" | "exr" | "image"): Promise<{ hdri: HdriInfo; background: Texture; cameraHeight: number; hdrBackground: boolean } | null> {
    let p = this.custom.get(url);
    if (!p) {
      p = this.track((async () => {
        try {
          if (kind === "hdr" || kind === "exr") {
            const loader = kind === "hdr" ? new HDRLoader() : new (await import("three/examples/jsm/loaders/EXRLoader.js")).EXRLoader();
            const t = (await loader.setDataType(HalfFloatType).loadAsync(url)) as DataTexture; // 16-bit: works on iPhones too
            t.mapping = EquirectangularReflectionMapping;
            return { hdri: { texture: t, ...analyseHdri(t) }, background: t, cameraHeight: 1.7, hdrBackground: true };
          }
          const bg = await new TextureLoader().loadAsync(url);
          bg.colorSpace = SRGBColorSpace; bg.mapping = EquirectangularReflectionMapping; bg.anisotropy = 8;
          const light = pseudoHdr(bg.image as CanvasImageSource & { width: number; height: number });
          if (!light) return null;
          return { hdri: { texture: light, ...analyseHdri(light) }, background: bg, cameraHeight: 1.7, hdrBackground: false };
        } catch (e) { console.warn("[archvista] eigene Umgebung nicht geladen:", url, e); return null; }
      })());
      this.custom.set(url, p);
    }
    return p;
  }

  /** Photographic surroundings: HDR for lighting + high-resolution panorama for display. */
  photoEnv(key: string): Promise<{ hdri: HdriInfo; background: Texture; cameraHeight: number } | null> {
    return this.track((async () => {
      const h = await this.hdri(key);
      if (!h) return null;
      try {
        const bg = await new TextureLoader().loadAsync(`${this.base}hdri/${key}_bg.webp`);
        bg.colorSpace = SRGBColorSpace; bg.mapping = EquirectangularReflectionMapping; bg.anisotropy = 8;
        const meta = (this.manifest?.hdri[key] ?? {}) as { cameraHeight?: number };
        return { hdri: h, background: bg, cameraHeight: meta.cameraHeight ?? 1.7 };
      } catch { return null; }
    })());
  }

  async has(kind: keyof Manifest, key: string) {
    await this.ready;
    return !!this.manifest?.[kind]?.[key];
  }

  photo(key: string): Promise<PhotoMaps | null> {
    let p = this.tex.get(key);
    if (!p) {
      p = (async () => {
        if (!(await this.has("textures", key))) return null;
        const L = new TextureLoader();
        const load = (s: string, srgb: boolean) => L.loadAsync(`${this.base}tex/${key}_${s}.webp`).then((t) => {
          t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace; return t;
        });
        try {
          const [map, normalMap, arm] = await Promise.all([load("col", true), load("nor", false), load("arm", false)]);
          return { map, normalMap, arm, size: this.manifest!.textures[key].size };
        } catch { return null; }
      })();
      this.tex.set(key, this.track(p));
    }
    return p;
  }

  hdri(key: string): Promise<HdriInfo | null> {
    let p = this.hdr.get(key);
    if (!p) {
      p = (async () => {
        if (!(await this.has("hdri", key))) return null;
        try {
          const t = await new HDRLoader().setDataType(HalfFloatType).loadAsync(`${this.base}hdri/${key}.hdr`); // 16-bit: works on iPhones too
          t.mapping = EquirectangularReflectionMapping;
          return { texture: t, ...analyseHdri(t) };
        } catch { return null; }
      })();
      this.hdr.set(key, this.track(p));
    }
    return p;
  }

  model(key: string): Promise<ModelAsset | null> {
    let p = this.models.get(key);
    if (!p) {
      p = (async () => {
        if (!(await this.has("models", key))) return null;
        try {
          const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${this.base}models/${key}.glb`);
          const parts: ModelPart[] = [];
          gltf.scene.updateMatrixWorld(true);
          let top = -Infinity, bottom = Infinity;
          gltf.scene.traverse((o) => {
            const m = o as Mesh;
            if (!m.isMesh) return;
            const g = toFloat(m.geometry).applyMatrix4(m.matrixWorld as Matrix4);
            g.computeBoundingBox();
            top = Math.max(top, g.boundingBox!.max.y); bottom = Math.min(bottom, g.boundingBox!.min.y);
            const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as MeshStandardMaterial;
            if (mat.alphaTest > 0 || mat.transparent) {
              mat.transparent = false; mat.alphaTest = 0.4; mat.alphaToCoverage = false; mat.side = 2;
              if (mat.map) coverageMipmaps(mat.map, 0.4); }
            parts.push({ geometry: g, material: mat });
          });
          for (const p of parts) p.geometry.translate(0, -bottom, 0);
          return { parts, height: top - bottom };
        } catch (e) { console.warn("model", key, e); return null; }
      })();
      this.models.set(key, this.track(p));
    }
    return p;
  }
}

/**
 * Locate the sun in an equirectangular HDR (brightest region in the upper half) and measure
 * horizon/zenith colours so fog and lights match the sky.
 */
export function analyseHdri(t: DataTexture): { sunDir: Vector3; sunColor: Color; horizon: Color; zenith: Color; ground: Color } {
  const { width: W, height: H } = t.image as { width: number; height: number };
  // 16-bit float data (Uint16Array) is read through a float copy
  const raw = t.image.data as unknown as Float32Array | Uint16Array;
  const d: ArrayLike<number> = raw instanceof Uint16Array ? Float32Array.from(raw, (v) => DataUtils.fromHalfFloat(v)) : raw;
  const ch = d.length / (W * H);
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < H / 2; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
      if (l > best) { best = l; bx = x; by = y; }
    }
  // average a small window around the sun for its colour
  const sc = [0, 0, 0];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = (bx + dx + W) % W, y = Math.max(0, Math.min(H - 1, by + dy));
    const i = (y * W + x) * ch;
    sc[0] += d[i]; sc[1] += d[i + 1]; sc[2] += d[i + 2];
  }
  const m = Math.max(...sc) || 1;
  const sunColor = new Color(sc[0] / m, sc[1] / m, sc[2] / m);
  const avgRow = (row: number) => {
    const c = [0, 0, 0];
    for (let x = 0; x < W; x++) { const i = (row * W + x) * ch; c[0] += d[i]; c[1] += d[i + 1]; c[2] += d[i + 2]; }
    return c.map((v) => v / W);
  };
  const hz = avgRow(Math.floor(H * 0.47)), zn = avgRow(Math.floor(H * 0.08));
  const gr = [0, 0, 0];
  for (const f of [0.72, 0.78, 0.84, 0.9]) { const r = avgRow(Math.floor(H * f)); gr[0] += r[0]; gr[1] += r[1]; gr[2] += r[2]; }
  const norm = (c: number[]) => { const k = Math.max(c[0], c[1], c[2]) || 1; return new Color(Math.min(1, c[0] / k * 0.9), Math.min(1, c[1] / k * 0.9), Math.min(1, c[2] / k * 0.9)); };
  // equirect: image row 0 = top (zenith); u = x/W; three samples u = atan(z, x)/(2π) + 0.5
  const u = (bx + 0.5) / W, v = 1 - (by + 0.5) / H;
  const phi = (u - 0.5) * Math.PI * 2, el = (v - 0.5) * Math.PI;
  const sunDir = new Vector3(Math.cos(phi) * Math.cos(el), Math.sin(el), Math.sin(phi) * Math.cos(el)).normalize();
  return { sunDir, sunColor, horizon: norm(hz), zenith: norm(zn), ground: new Color(gr[0] / 4, gr[1] / 4, gr[2] / 4) };
}

/**
 * A normal (8-bit) panorama has no real light values. Make a small linear float copy for image-based lighting and
 * sun detection; burnt-out highlights (the sun, bright sky) are lifted so the light still has direction.
 */
function pseudoHdr(img: CanvasImageSource & { width: number; height: number }): DataTexture | null {
  const W = 1024, H = 512;
  const cv: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const src = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint16Array(W * H * 4);
  const h = (v: number) => DataUtils.toHalfFloat(Math.min(v, 65000));
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  for (let i = 0; i < W * H; i++) {
    const r = lin(src[i * 4]), g = lin(src[i * 4 + 1]), b = lin(src[i * 4 + 2]);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const k = l > 0.9 ? 1 + (l - 0.9) * 60 : 1; // up to ×7 for clipped highlights
    out[i * 4] = h(r * k); out[i * 4 + 1] = h(g * k); out[i * 4 + 2] = h(b * k); out[i * 4 + 3] = h(1);
  }
  const t = new DataTexture(out, W, H, undefined, HalfFloatType);
  t.colorSpace = LinearSRGBColorSpace; t.mapping = EquirectangularReflectionMapping; t.needsUpdate = true;
  return t;
}

/** Quantized (KHR_mesh_quantization) attributes must become float before transforming, or they clamp. */
function toFloat(src: BufferGeometry): BufferGeometry {
  const g = new BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const n = attr.count, size = attr.itemSize;
    const arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) arr[i * size + k] = attr.getComponent(i, k);
    g.setAttribute(name, new Float32BufferAttribute(arr, size));
  }
  if (src.index) g.setIndex(src.index.clone());
  return g;
}

/**
 * Alpha-tested foliage disappears in the distance because mipmapping averages alpha below the cut-off.
 * Build the mip chain on the CPU and rescale alpha per level so the covered area stays constant
 * (coverage-preserving mipmaps, as used in games).
 */
export function coverageMipmaps(tex: Texture, cutoff: number) {
  const img = tex.image as (ImageBitmap | HTMLImageElement | HTMLCanvasElement) & { width: number; height: number };
  if (!img || typeof document === "undefined" || !img.width) return;
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  if (!cx) return;
  cx.drawImage(img as CanvasImageSource, 0, 0);
  let level = cx.getImageData(0, 0, cv.width, cv.height);
  const coverage = (d: ImageData, scale: number) => { let n = 0; for (let i = 3; i < d.data.length; i += 4) if (d.data[i] * scale >= cutoff * 255) n++; return n / (d.width * d.height); };
  const target = coverage(level, 1);
  const mips: ImageData[] = [level];
  while (level.width > 1 || level.height > 1) {
    const w = Math.max(1, level.width >> 1), h = Math.max(1, level.height >> 1);
    const next = new ImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        let r = 0, g = 0, b = 0, a = 0, ws = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(level.width - 1, x * 2 + dx), sy = Math.min(level.height - 1, y * 2 + dy);
          const i = (sy * level.width + sx) * 4;
          const al = level.data[i + 3];
          // colour weighted by alpha so transparent texels do not darken the edges
          r += level.data[i] * al; g += level.data[i + 1] * al; b += level.data[i + 2] * al; a += al; ws += al;
        }
        next.data[o] = ws ? r / ws : 0; next.data[o + 1] = ws ? g / ws : 0; next.data[o + 2] = ws ? b / ws : 0; next.data[o + 3] = a / 4;
      }
    // binary search an alpha scale that restores the original coverage
    let lo = 1, hi = 8;
    for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; if (coverage(next, m) < target) lo = m; else hi = m; }
    for (let i = 3; i < next.data.length; i += 4) next.data[i] = Math.min(255, next.data[i] * hi);
    mips.push(next);
    level = next;
  }
  tex.mipmaps = mips as unknown as typeof tex.mipmaps;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
}
