// ARCHVISTA — minimal glTF 2.0 binary (GLB) writer. One mesh per material for few draw calls.
// Public output deliberately contains no layer names or original coordinates.

import { PRESET } from "../materials";

export interface GlbInputPart {
  presetId: string;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
}

export function mergeByMaterial(parts: GlbInputPart[]): GlbInputPart[] {
  const groups = new Map<string, GlbInputPart[]>();
  for (const p of parts) {
    if (!p.indices.length) continue;
    const l = groups.get(p.presetId);
    if (l) l.push(p); else groups.set(p.presetId, [p]);
  }
  const out: GlbInputPart[] = [];
  for (const [presetId, list] of groups) {
    // keep chunks below 4M vertices so very large models stay loadable
    let batch: GlbInputPart[] = [], verts = 0;
    const flush = () => {
      if (!batch.length) return;
      const nv = batch.reduce((n, p) => n + p.positions.length / 3, 0);
      const ni = batch.reduce((n, p) => n + p.indices.length, 0);
      const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
      let vo = 0, io = 0;
      for (const p of batch) {
        pos.set(p.positions, vo * 3); nrm.set(p.normals, vo * 3); uv.set(p.uvs, vo * 2);
        for (let i = 0; i < p.indices.length; i++) idx[io + i] = p.indices[i] + vo;
        vo += p.positions.length / 3; io += p.indices.length;
      }
      out.push({ presetId, positions: pos, normals: nrm, uvs: uv, indices: idx });
      batch = []; verts = 0;
    };
    for (const p of list) {
      if (verts + p.positions.length / 3 > 4_000_000) flush();
      batch.push(p); verts += p.positions.length / 3;
    }
    flush();
  }
  return out;
}

export function writeGlb(parts: GlbInputPart[], extras: Record<string, unknown> = {}): Uint8Array {
  const merged = mergeByMaterial(parts);
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const bufferViews: object[] = [], accessors: object[] = [], meshes: object[] = [], nodes: object[] = [], materials: object[] = [];
  const matIndex = new Map<string, number>();

  const addView = (arr: ArrayBufferView, target?: number) => {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); byteLength += pad; }
    bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
    chunks.push(bytes);
    byteLength += bytes.byteLength;
    return bufferViews.length - 1;
  };

  for (const p of merged) {
    let mi = matIndex.get(p.presetId);
    if (mi === undefined) {
      const pr = PRESET.get(p.presetId);
      const c = hexToLinear(pr?.color ?? "#cccccc");
      materials.push({
        name: p.presetId,
        pbrMetallicRoughness: { baseColorFactor: [...c, pr?.transmission ? 0.35 : 1], metallicFactor: pr?.metalness ?? 0, roughnessFactor: pr?.roughness ?? 0.8 },
        doubleSided: true,
        ...(pr?.transmission ? { alphaMode: "BLEND" } : {}),
      });
      mi = materials.length - 1;
      matIndex.set(p.presetId, mi);
    }
    const nv = p.positions.length / 3;
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.positions.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p.positions[i + k]); max[k] = Math.max(max[k], p.positions[i + k]); }
    if (!nv) { min = [0, 0, 0]; max = [0, 0, 0]; }
    const small = nv < 65536;
    const idx = small ? Uint16Array.from(p.indices) : p.indices;
    const pv = addView(p.positions, 34962), nvw = addView(p.normals, 34962), uvv = addView(p.uvs, 34962), iv = addView(idx, 34963);
    accessors.push({ bufferView: pv, componentType: 5126, count: nv, type: "VEC3", min, max });
    accessors.push({ bufferView: nvw, componentType: 5126, count: nv, type: "VEC3" });
    accessors.push({ bufferView: uvv, componentType: 5126, count: nv, type: "VEC2" });
    accessors.push({ bufferView: iv, componentType: small ? 5123 : 5125, count: p.indices.length, type: "SCALAR" });
    const a = accessors.length - 4;
    meshes.push({ name: p.presetId, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1, TEXCOORD_0: a + 2 }, indices: a + 3, material: mi }] });
    nodes.push({ name: `building_${meshes.length - 1}`, mesh: meshes.length - 1 });
  }

  const json = {
    asset: { version: "2.0", generator: "ARCHVISTA" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i), extras }],
    nodes, meshes, materials, accessors, bufferViews,
    buffers: [{ byteLength }],
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const binPad = (4 - (byteLength % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + byteLength + binPad;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.length + jsonPad, true); dv.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonBytes.length + jsonPad);
  let o = 20 + jsonBytes.length + jsonPad;
  dv.setUint32(o, byteLength + binPad, true); dv.setUint32(o + 4, 0x004e4942, true);
  o += 8;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

/** Minimal reader (used by tests and the privacy check). */
export function readGlb(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jl)));
  const bin = bytes.subarray(20 + jl + 8);
  const positions: Float32Array[] = [];
  for (const m of json.meshes) {
    const acc = json.accessors[m.primitives[0].attributes.POSITION];
    const bv = json.bufferViews[acc.bufferView];
    positions.push(new Float32Array(bin.slice(bv.byteOffset, bv.byteOffset + bv.byteLength).buffer));
  }
  return { json, positions };
}
