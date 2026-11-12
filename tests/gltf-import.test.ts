import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { importGltf, GltfFormatError } from "../src/core/gltf/import";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { publicParts } from "../src/core/export/public-scene";
import { writeGlb } from "../src/core/export/glb";
import { newProject } from "../src/core/project";

/** Tiny GLB builder: one unit box (Y-up), placed by a node with translation/scale, optional embedded PNG. */
function boxGlb(opts: { scale?: number[]; translation?: number[]; png?: Uint8Array; normals?: boolean; name?: string; mirror?: boolean } = {}) {
  const P = [0,0,0, 1,0,0, 1,1,0, 0,1,0, 0,0,1, 1,0,1, 1,1,1, 0,1,1];
  const I = [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 3,7,6, 3,6,2, 1,2,6, 1,6,5, 0,4,7, 0,7,3];
  const pos = new Float32Array(P), idx = new Uint16Array(I), uv = new Float32Array(P.length / 3 * 2).map((_, i) => (i % 2 ? 0.5 : 0.25));
  const nrm = new Float32Array(P.length).map((_, i) => (i % 3 === 1 ? 1 : 0));
  const parts: Uint8Array[] = []; let len = 0; const views: object[] = [];
  const add = (a: ArrayBufferView) => { const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); views.push({ buffer: 0, byteOffset: len, byteLength: b.length }); parts.push(b); len += b.length; const pad = (4 - (len % 4)) % 4; if (pad) { parts.push(new Uint8Array(pad)); len += pad; } return views.length - 1; };
  const pv = add(pos), iv = add(idx), uvv = add(uv), nv = opts.normals ? add(nrm) : -1;
  const imgv = opts.png ? add(opts.png) : -1;
  const attrs: Record<string, number> = { POSITION: 0, TEXCOORD_0: 2 };
  const accessors: object[] = [
    { bufferView: pv, componentType: 5126, count: 8, type: "VEC3", min: [0, 0, 0], max: [1, 1, 1] },
    { bufferView: iv, componentType: 5123, count: I.length, type: "SCALAR" },
    { bufferView: uvv, componentType: 5126, count: 8, type: "VEC2" },
  ];
  if (opts.normals) { accessors.push({ bufferView: nv, componentType: 5126, count: 8, type: "VEC3" }); attrs.NORMAL = 3; }
  const json: Record<string, unknown> = {
    asset: { version: "2.0", generator: "test" }, scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Gebäude", children: [1] }, { name: opts.name ?? "Wand", mesh: 0, translation: opts.translation, scale: opts.mirror ? [-(opts.scale?.[0] ?? 1), opts.scale?.[1] ?? 1, opts.scale?.[2] ?? 1] : opts.scale }],
    meshes: [{ name: "box", primitives: [{ attributes: attrs, indices: 1, material: 0 }] }],
    materials: [{ name: "Putz Weiß", pbrMetallicRoughness: { baseColorFactor: opts.png ? [1, 1, 1, 1] : [0.5, 0.2, 0.1, 1], ...(opts.png ? { baseColorTexture: { index: 0 } } : {}) } }],
    accessors, bufferViews: views, buffers: [{ byteLength: len }],
    ...(opts.png ? { textures: [{ source: 0 }], images: [{ bufferView: imgv, mimeType: "image/png" }] } : {}),
  };
  const jb = new TextEncoder().encode(JSON.stringify(json)); const jp = (4 - (jb.length % 4)) % 4;
  const total = 12 + 8 + jb.length + jp + 8 + len;
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jb.length + jp, true); dv.setUint32(16, 0x4e4f534a, true); out.set(jb, 20); out.fill(0x20, 20 + jb.length, 20 + jb.length + jp);
  let o = 20 + jb.length + jp; dv.setUint32(o, len, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

describe("glTF / GLB import", () => {
  it("reads geometry with node transforms (metres, Y-up), origin at footprint centre / lowest point", () => {
    const { model } = importGltf(boxGlb({ scale: [10, 6, 8], translation: [100, 5, -3] }));
    expect(model.ok).toBe(true);
    expect(model.stats.triangles).toBe(12);
    const b = model.bbox;
    expect(b.max[0] - b.min[0]).toBeCloseTo(10); expect(b.max[1] - b.min[1]).toBeCloseTo(6); expect(b.max[2] - b.min[2]).toBeCloseTo(8);
    expect(b.min[1]).toBeCloseTo(0); expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(0);
    expect(model.layers[0].name).toBe("Gebäude");
    expect(model.units.toMeters).toBe(1);
    // flat normals point outwards (box centre is inside)
    const m = model.meshes[0];
    let outward = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const a = m.indices[t] * 3; const c = [0, 3, 0];
      const d = [m.positions[a] - c[0], m.positions[a + 1] - c[1], m.positions[a + 2] - c[2]];
      if (d[0] * m.normals[a] + d[1] * m.normals[a + 1] + d[2] * m.normals[a + 2] > 0) outward++;
    }
    expect(outward).toBe(12);
  });

  it("mirrored nodes keep normals outwards", () => {
    const { model } = importGltf(boxGlb({ scale: [10, 6, 8], mirror: true }));
    const m = model.meshes[0];
    let outward = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const ia = m.indices[t] * 3, ib = m.indices[t + 1] * 3, ic = m.indices[t + 2] * 3;
      const P = m.positions;
      const u = [P[ib] - P[ia], P[ib + 1] - P[ia + 1], P[ib + 2] - P[ia + 2]], v = [P[ic] - P[ia], P[ic + 1] - P[ia + 1], P[ic + 2] - P[ia + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const d = [P[ia], P[ia + 1] - 3, P[ia + 2]];
      if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] > 0 && n[0] * m.normals[ia] + n[1] * m.normals[ia + 1] + n[2] * m.normals[ia + 2] > 0) outward++;
    }
    expect(outward).toBe(12);
  });

  it("takes material names, colours and embedded textures with their UVs", () => {
    const plain = importGltf(boxGlb({ scale: [10, 6, 8] }));
    expect(plain.model.materials![0]).toMatchObject({ name: "Putz Weiß", color: 0xbc7c59 });
    const tex = importGltf(boxGlb({ scale: [10, 6, 8], png: PNG, normals: true }));
    const cm = tex.model.materials![0];
    expect(cm.map).toMatch(/\.png$/); expect(cm.sourceUv).toBe(true);
    expect(tex.images).toEqual([{ name: cm.map, data: PNG }]);
    expect(tex.model.meshes[0].uvs?.[0]).toBeCloseTo(0.25);
  });

  it("explains compressed or incomplete files", () => {
    const json = (o: object) => new TextEncoder().encode(JSON.stringify(o));
    expect(() => importGltf(json({ asset: { version: "2.0" }, extensionsRequired: ["KHR_draco_mesh_compression"] }))).toThrow(/Kompression/);
    expect(() => importGltf(json({ asset: { version: "2.0" }, buffers: [{ uri: "haus.bin", byteLength: 4 }] }))).toThrow(/haus\.bin/);
    expect(() => importGltf(new Uint8Array([1, 2, 3]))).toThrow(GltfFormatError);
  });

  it("an ARCHVISTA website model (GLB) reads back with the same size", () => {
    const scene = prepareScene(importDxf(readFileSync(new URL("./fixtures/models/house_mm.dxf", import.meta.url), "utf8")));
    const glb = writeGlb(publicParts(scene, newProject("h.dxf", "x")).parts);
    const { model } = importGltf(glb);
    const s0 = scene.bbox, b = model.bbox;
    for (let k = 0; k < 3; k++) expect(b.max[k] - b.min[k]).toBeCloseTo(s0.max[k] - s0.min[k], 1);
    const again = prepareScene(model);
    expect(again.analysis.levels.length).toBeGreaterThan(0);
  });
});
