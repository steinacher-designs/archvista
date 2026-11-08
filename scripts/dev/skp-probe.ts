import { readFileSync } from "node:fs";
import { parseSkp, buildScene } from "openskp";
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const t0 = performance.now();
  const m = parseSkp(ab), s = buildScene(ab, { respectEdgeVisibility: true });
  const mats = (Array.isArray(m.materials) ? m.materials : Object.values(m.materials)) as any[];
  console.log("\n==", f.split("/").pop(), m.version, m.units, (performance.now() - t0).toFixed(0) + "ms", s.glbPrimitives.length, "prims", s.glbPrimitives.reduce((n, p) => n + p.indices.length / 3, 0), "tris", s.textures.length, "tex");
  console.log("layers:", (m.layers as any[]).map((l) => `${l.name}${l.hidden ? "(h)" : ""}`).join(", "));
  for (const x of mats) console.log(" mat", JSON.stringify(x.name), x.color.r, x.color.g, x.color.b, "a" + x.color.a, "tr" + x.transparency, x.texture ? `tex ${x.texture.filename?.split(/[\\/]/).pop()} ${x.texture.width}x${x.texture.height} bytes=${x.texture.data?.length ?? "null"} head=${x.texture.data ? Array.from(x.texture.data.subarray(0, 4)).join(",") : ""}` : "", x.colorized ? "colorized" : "");
  s.gltfMaterials.forEach((g: any, i: number) => { const c = g.pbrMetallicRoughness.baseColorFactor.map((v: number) => Math.round(v * 255)); const n = s.glbPrimitives.filter((p) => p.materialIndex === i).reduce((k, p) => k + p.indices.length / 3, 0); console.log(" gltf", i, c.join(","), "tex" + (g.pbrMetallicRoughness.baseColorTexture?.index ?? "-"), n, "tris"); });
}
