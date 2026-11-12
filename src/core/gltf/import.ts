// ARCHVISTA — glTF 2.0 import (.glb, and .gltf with embedded data or its files from a ZIP).
// Produces the same ImportedModel as the other imports, plus the texture images stored in the file.
// Written from the Khronos glTF 2.0 specification; no third-party code.

import type { CadMaterial, ImportedModel, ImportOptions, ImportWarning, LayerInfo, ModelMesh } from "../dxf/import";
import { textureKey } from "../materials";

export class GltfFormatError extends Error {}

export interface GltfImport {
  model: ImportedModel;
  /** Texture images used by the model, by file name (matches CadMaterial.map). */
  images: { name: string; data: Uint8Array }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;
type M4 = number[]; // column-major 4×4

const ident = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: M4, b: M4): M4 {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(t: number[] = [0, 0, 0], q: number[] = [0, 0, 0, 1], s: number[] = [1, 1, 1]): M4 {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0,
    2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
    2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
/** Normal matrix (inverse transpose of the upper 3×3, as cofactors) and the determinant's sign. */
function normalMat(m: M4): { n: number[]; flip: boolean } {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const n = [e * i - f * h, -(d * i - f * g), d * h - e * g, -(b * i - c * h), a * i - c * g, -(a * h - b * g), b * f - c * e, -(a * f - c * d), a * e - b * d];
  const det = a * n[0] + b * n[1] + c * n[2];
  return { n, flip: det < 0 };
}
const lin2srgb = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));

export function importGltf(bytes: Uint8Array, opts: ImportOptions = {}, resources: { name: string; data: Uint8Array }[] = []): GltfImport {
  const progress = opts.onProgress ?? (() => {});
  progress(0.05, "glTF-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let json: J, bin: Uint8Array | null = null;
  if (bytes.length >= 12 && dv.getUint32(0, true) === 0x46546c67) {
    let p = 12;
    while (p + 8 <= bytes.length) {
      const len = dv.getUint32(p, true), type = dv.getUint32(p + 4, true);
      const data = bytes.subarray(p + 8, p + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
      else if (type === 0x004e4942 && !bin) bin = data;
      p += 8 + len + ((4 - (len % 4)) % 4);
    }
    if (!json) throw new GltfFormatError("Die GLB-Datei ist beschädigt.");
  } else {
    try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new GltfFormatError("Das ist keine gültige glTF- oder GLB-Datei."); }
  }
  if (!json.asset || String(json.asset.version ?? "").split(".")[0] !== "2") throw new GltfFormatError("Nur glTF 2.0 wird unterstützt. Bitte das Modell als glTF 2.0 / GLB exportieren.");
  const req: string[] = json.extensionsRequired ?? [];
  if (req.some((x) => /draco|meshopt/i.test(x))) throw new GltfFormatError("Diese GLB-Datei ist komprimiert (Draco/Meshopt). Bitte beim Export die Kompression ausschalten und erneut versuchen.");

  // resources: GLB binary chunk, data: URIs, or files next to the .gltf (from a ZIP)
  const byName = new Map(resources.map((r) => [r.name.toLowerCase(), r.data]));
  const fromUri = (uri: string): Uint8Array | null => {
    if (uri.startsWith("data:")) {
      const comma = uri.indexOf(",");
      const meta = uri.slice(5, comma), body = uri.slice(comma + 1);
      if (/;base64/i.test(meta)) { const s = atob(body); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
      return new TextEncoder().encode(decodeURIComponent(body));
    }
    const n = decodeURIComponent(uri).split(/[\\/]/).pop()!.toLowerCase();
    return byName.get(n) ?? null;
  };
  const missing: string[] = [];
  const buffers: (Uint8Array | null)[] = (json.buffers ?? []).map((b: J, i: number) => {
    if (b.uri === undefined) return i === 0 ? bin : null;
    const d = fromUri(b.uri);
    if (!d) missing.push(decodeURIComponent(b.uri).split(/[\\/]/).pop() ?? String(b.uri));
    return d;
  });
  if (missing.length) throw new GltfFormatError(`Zur glTF-Datei fehlt ${missing.join(", ")}. Bitte als .glb exportieren – oder die .gltf zusammen mit allen Dateien als ZIP importieren.`);
  const view = (i: number): { data: Uint8Array; stride?: number } => {
    const v = json.bufferViews[i];
    const b = buffers[v.buffer];
    if (!b) throw new GltfFormatError("Die glTF-Datei ist unvollständig.");
    return { data: b.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength), stride: v.byteStride };
  };
  const NUM: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const accessor = (i: number): Float64Array => {
    const a = json.accessors[i];
    const n = NUM[a.type], cs = SIZE[a.componentType];
    const out = new Float64Array(a.count * n);
    if (a.bufferView !== undefined) {
      const { data, stride } = view(a.bufferView);
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const st = stride || n * cs, off = a.byteOffset ?? 0;
      const rd = (p: number): number => {
        switch (a.componentType) {
          case 5126: return d.getFloat32(p, true);
          case 5125: return d.getUint32(p, true);
          case 5123: { const v = d.getUint16(p, true); return a.normalized ? v / 65535 : v; }
          case 5122: { const v = d.getInt16(p, true); return a.normalized ? Math.max(v / 32767, -1) : v; }
          case 5121: { const v = d.getUint8(p); return a.normalized ? v / 255 : v; }
          default: { const v = d.getInt8(p); return a.normalized ? Math.max(v / 127, -1) : v; }
        }
      };
      for (let e = 0; e < a.count; e++) for (let k = 0; k < n; k++) out[e * n + k] = rd(off + e * st + k * cs);
    }
    if (a.sparse) {
      const s = a.sparse;
      const iv = view(s.indices.bufferView), vv = view(s.values.bufferView);
      const id = new DataView(iv.data.buffer, iv.data.byteOffset + (s.indices.byteOffset ?? 0));
      const vd = new DataView(vv.data.buffer, vv.data.byteOffset + (s.values.byteOffset ?? 0));
      const ics = SIZE[s.indices.componentType];
      for (let e = 0; e < s.count; e++) {
        const idx = ics === 4 ? id.getUint32(e * 4, true) : ics === 2 ? id.getUint16(e * 2, true) : id.getUint8(e);
        for (let k = 0; k < n; k++) out[idx * n + k] = a.componentType === 5126 ? vd.getFloat32((e * n + k) * 4, true) : vd.getUint16((e * n + k) * 2, true);
      }
    }
    return out;
  };

  // ——— materials & textures ———
  const images = new Map<string, Uint8Array>();
  const used = new Map<string, CadMaterial>();
  const matInfo = new Map<number, { name?: string; color: number; textured: boolean; glass: boolean }>();
  const imageOf = (texIndex: number): { data: Uint8Array; ext: string } | null => {
    const t = json.textures?.[texIndex];
    const src = t?.source ?? t?.extensions?.EXT_texture_webp?.source;
    const img = src !== undefined ? json.images?.[src] : undefined;
    if (!img) return null;
    const data = img.bufferView !== undefined ? view(img.bufferView).data.slice() : img.uri ? fromUri(img.uri) : null;
    if (!data) return null;
    const mime = img.mimeType ?? (/\.png$/i.test(img.uri ?? "") ? "image/png" : /\.webp$/i.test(img.uri ?? "") ? "image/webp" : "image/jpeg");
    return { data, ext: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg" };
  };
  const material = (mi: number | undefined) => {
    if (mi === undefined) return { color: 0xdddddd, textured: false, glass: false };
    let info = matInfo.get(mi);
    if (info) return info;
    const m = json.materials?.[mi] ?? {};
    const pbr = m.pbrMetallicRoughness ?? {};
    const f: number[] = pbr.baseColorFactor ?? [1, 1, 1, 1];
    const color = (lin2srgb(f[0]) << 16) | (lin2srgb(f[1]) << 8) | lin2srgb(f[2]);
    const name = String(m.name ?? "").trim() || `Material ${mi + 1}`;
    const tex = pbr.baseColorTexture?.index !== undefined ? imageOf(pbr.baseColorTexture.index) : null;
    const glass = !!m.extensions?.KHR_materials_transmission?.transmissionFactor;
    if (!used.has(name)) {
      const cm: CadMaterial = { name, color };
      if (tex) {
        const file = textureKey(`${name}.${tex.ext}`);
        cm.map = file; cm.sourceUv = true;
        images.set(file, tex.data);
        // the colour factor multiplies the picture (often white): keep it as a tint when it is not neutral
        if (f[0] < 0.97 || f[1] < 0.97 || f[2] < 0.97) cm.colorize = true;
      }
      const alpha = m.alphaMode === "BLEND" ? (f[3] ?? 1) : 1;
      if (glass) cm.opacity = 0.3;
      else if (alpha < 0.98) cm.opacity = alpha;
      else cm.opaque = true;
      used.set(name, cm);
    }
    info = { name, color, textured: !!tex, glass };
    matInfo.set(mi, info);
    return info;
  };

  // ——— geometry: walk the node tree of the default scene ———
  const s = opts.unitsToMeters ?? 1; // glTF is in metres; a factor only when the user corrects units
  type Acc = { layer: string; material?: string; color: number; textured: boolean; pos: number[]; nrm: number[]; uv: number[]; idx: number[] };
  const groups = new Map<string, Acc>();
  let prims = 0, skipped = 0;
  const sceneIdx = json.scene ?? 0;
  const roots: number[] = json.scenes?.[sceneIdx]?.nodes ?? (json.nodes ?? []).map((_: J, i: number) => i);
  const visit = (ni: number, parent: M4, layer: string, depth: number) => {
    const node = json.nodes?.[ni];
    if (!node || depth > 64) return;
    const local = node.matrix ? node.matrix : trs(node.translation, node.rotation, node.scale);
    const world = mul(parent, local);
    const name = String(node.name ?? "").trim();
    // the outermost named group gives the "layer" (like a tag), so ARCHVISTA can tell walls, roof, furniture …
    const lay = layer || name;
    if (node.mesh !== undefined) addMesh(json.meshes[node.mesh], world, lay || String(json.meshes[node.mesh]?.name ?? "").trim() || "Modell");
    for (const c of node.children ?? []) visit(c, world, depth === 0 && !name ? "" : lay, depth + 1);
  };
  const addMesh = (mesh: J, w: M4, layer: string) => {
    const { n: nm, flip } = normalMat(w);
    for (const p of mesh?.primitives ?? []) {
      const mode = p.mode ?? 4;
      if (mode < 4 || p.attributes?.POSITION === undefined) { skipped++; continue; }
      prims++;
      const P = accessor(p.attributes.POSITION);
      const N = p.attributes.NORMAL !== undefined ? accessor(p.attributes.NORMAL) : null;
      const info = material(p.material);
      const T = info.textured && p.attributes.TEXCOORD_0 !== undefined ? accessor(p.attributes.TEXCOORD_0) : null;
      const vc = P.length / 3;
      let I: ArrayLike<number> = p.indices !== undefined ? accessor(p.indices) : Array.from({ length: vc }, (_, i) => i);
      if (mode === 5 || mode === 6) {
        const t: number[] = [];
        for (let i = 2; i < I.length; i++) {
          if (mode === 5) { if (i % 2) t.push(I[i - 1], I[i - 2], I[i]); else t.push(I[i - 2], I[i - 1], I[i]); }
          else t.push(I[0], I[i - 1], I[i]);
        }
        I = t;
      }
      const key = `${layer}\u0000${info.name ?? ""}\u0000${info.color}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { layer, material: info.name, color: info.color, textured: info.textured, pos: [], nrm: [], uv: [], idx: [] }));
      if (info.textured && !g.textured) g.textured = true;
      // glTF is Y-up in metres – the same convention as ARCHVISTA's model data (and the SketchUp import)
      const put = (vi: number, fn?: [number, number, number]) => {
        const x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
        const wx = w[0] * x + w[4] * y + w[8] * z + w[12], wy = w[1] * x + w[5] * y + w[9] * z + w[13], wz = w[2] * x + w[6] * y + w[10] * z + w[14];
        g!.pos.push(wx * s, wy * s, wz * s);
        let nx: number, ny: number, nz: number;
        if (fn) [nx, ny, nz] = fn;
        else {
          const a = N![vi * 3], b = N![vi * 3 + 1], c = N![vi * 3 + 2];
          nx = nm[0] * a + nm[3] * b + nm[6] * c; ny = nm[1] * a + nm[4] * b + nm[7] * c; nz = nm[2] * a + nm[5] * b + nm[8] * c;
          // cofactors = det · inverse transpose: a mirroring transform would turn normals inside out
          const l = (Math.hypot(nx, ny, nz) || 1) * (flip ? -1 : 1); nx /= l; ny /= l; nz /= l;
        }
        g!.nrm.push(nx, ny, nz);
        g!.uv.push(T ? T[vi * 2] : 0, T ? T[vi * 2 + 1] : 0);
      };
      if (N) {
        const base = g.pos.length / 3;
        for (let v = 0; v < vc; v++) put(v);
        for (let i = 0; i + 2 < I.length; i += 3) {
          const a = I[i], b = I[i + 1], c = I[i + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) g.idx.push(base + a, base + c, base + b); else g.idx.push(base + a, base + b, base + c);
        }
      } else {
        // no normals in the file: flat per triangle
        for (let i = 0; i + 2 < I.length; i += 3) {
          let a = I[i], b = I[i + 1], c = I[i + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) { const t = b; b = c; c = t; }
          const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
          const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
          let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
          // cofactor matrix · face normal = normal of the transformed triangle (winding already swapped when mirrored)
          const tx = nm[0] * fx + nm[3] * fy + nm[6] * fz, ty = nm[1] * fx + nm[4] * fy + nm[7] * fz, tz = nm[2] * fx + nm[5] * fy + nm[8] * fz;
          const l = Math.hypot(tx, ty, tz) || 1; fx = tx / l; fy = ty / l; fz = tz / l;
          const base = g.pos.length / 3;
          put(a, [fx, fy, fz]); put(b, [fx, fy, fz]); put(c, [fx, fy, fz]);
          g.idx.push(base, base + 1, base + 2);
        }
      }
    }
  };
  for (const r of roots) visit(r, ident(), "", 0);
  progress(0.6, "Modell wird optimiert");

  // origin: centre of footprint, lowest point (like the other imports)
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of groups.values()) for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) {
    const v = g.pos[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v;
  }
  const ok = Number.isFinite(mn[0]);
  const meshes: ModelMesh[] = [];
  const layerMap = new Map<string, LayerInfo>();
  const origin: [number, number, number] = ok ? [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2] : [0, 0, 0];
  let gi = 0, triangles = 0, vertices = 0;
  for (const g of groups.values()) {
    if (!g.idx.length) continue;
    const positions = new Float32Array(g.pos.length), normals = Float32Array.from(g.nrm);
    for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) positions[i + k] = g.pos[i + k] - origin[k];
    const indices = Uint32Array.from(g.idx);
    meshes.push({
      id: `m${gi++}`, layer: g.layer, color: g.color, ...(g.material ? { material: g.material } : {}),
      positions, normals, indices, triangleCount: indices.length / 3,
      ...(g.textured ? { uvs: Float32Array.from(g.uv) } : {}),
    });
    triangles += indices.length / 3; vertices += positions.length / 3;
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  const size = ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0];
  const rawExtent = Math.max(...size) / s;
  const plausible = rawExtent * s >= 2 && rawExtent * s <= 2000;
  const warnings: ImportWarning[] = [];
  if (!ok) warnings.push({ code: "no-3d", message: "In der glTF/GLB-Datei wurden keine Flächen gefunden." });
  else if (!plausible) warnings.push({ code: "units-implausible", message: `Das Modell ist ${(rawExtent * s).toFixed(1)} m groß – ungewöhnlich für ein Gebäude. Bei Bedarf die Einheit korrigieren.` });
  if (skipped) warnings.push({ code: "gltf-lines", message: `${skipped} Linien-/Punkt-Teil(e) ohne Flächen wurden weggelassen.` });
  progress(1, "Fertig");
  return {
    model: {
      meshes,
      materials: [...used.values()],
      layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
      units: { name: s === 1 ? "Meter" : `Faktor ${s}`, toMeters: s, source: opts.unitsToMeters ? "user" : "header", rawExtent, plausible },
      origin,
      bbox: ok ? { min: [mn[0] - origin[0], mn[1] - origin[1], mn[2] - origin[2]], max: [mx[0] - origin[0], mx[1] - origin[1], mx[2] - origin[2]] } : { min: [0, 0, 0], max: [0, 0, 0] },
      stats: { version: `glTF ${json.asset.version}${json.asset.generator ? ` (${String(json.asset.generator).slice(0, 40)})` : ""}`, entityCounts: { "glTF-Teile": prims, "Dreiecke": triangles }, triangles, vertices, removedDegenerate: 0, removedDuplicate: 0, flippedForConsistency: 0, closedShellsOutward: 0 },
      warnings,
      ok,
    },
    images: [...images].map(([name, data]) => ({ name, data })),
  };
}
