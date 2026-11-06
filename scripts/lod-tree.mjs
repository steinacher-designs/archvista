// ARCHVISTA — build a web LOD of a film-quality tree: thin leaf cards, simplify wood, compress.
// usage: node scripts/lod-tree.mjs in.glb out.glb keepLeafFraction woodRatio
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, simplifyPrimitive, prune, dedup, quantize, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const [inp, out, keepS = "0.12", woodS = "0.08"] = process.argv.slice(2);
const keep = +keepS, woodRatio = +woodS;
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(inp);

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    const isLeaf = mat && (mat.getAlphaMode() !== "OPAQUE" || /leaf|leaves/i.test(mat.getName()));
    if (!isLeaf) continue;
    mat.setAlphaMode("MASK").setAlphaCutoff(0.45);
    const pos = prim.getAttribute("POSITION"), idx = prim.getIndices();
    const n = pos.getCount();
    const I = idx.getArray();
    // connected components (leaf cards) via union-find over triangles
    const parent = new Int32Array(n).map((_, i) => i);
    const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
    for (let t = 0; t < I.length; t += 3) { const a = find(I[t]), b = find(I[t + 1]), c = find(I[t + 2]); parent[b] = a; parent[c] = a; }
    const keepComp = new Map();
    const out = [];
    const P = pos.getArray();
    // scale kept cards about their centroid so the crown stays visually dense
    const s = Math.min(1.8, 1 / Math.sqrt(keep));
    const centroid = new Map();
    for (let v = 0; v < n; v++) { const r = find(v); const c = centroid.get(r) ?? [0, 0, 0, 0]; c[0] += P[v * 3]; c[1] += P[v * 3 + 1]; c[2] += P[v * 3 + 2]; c[3]++; centroid.set(r, c); }
    for (let t = 0; t < I.length; t += 3) {
      const r = find(I[t]);
      if (!keepComp.has(r)) keepComp.set(r, rnd() < keep);
      if (keepComp.get(r)) out.push(I[t], I[t + 1], I[t + 2]);
    }
    const moved = new Uint8Array(n);
    for (const v of out) {
      if (moved[v]) continue; moved[v] = 1;
      const c = centroid.get(find(v));
      for (let k = 0; k < 3; k++) { const m = c[k] / c[3]; P[v * 3 + k] = m + (P[v * 3 + k] - m) * s; }
    }
    pos.setArray(P);
    idx.setArray(n > 65535 ? new Uint32Array(out) : new Uint16Array(out));
    console.log(`leaves ${mat.getName()}: ${I.length / 3} → ${out.length / 3} tris (cards ×${s.toFixed(2)})`);
  }
}
// simplify only opaque (wood) primitives: temporarily detach leaves by marking them
await doc.transform(weld());
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    if (mat && mat.getAlphaMode() === "OPAQUE") {
      const before = prim.getIndices().getCount() / 3;
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: woodRatio, error: 0.02 });
      console.log(`wood ${mat.getName()}: ${before} → ${prim.getIndices().getCount() / 3} tris`);
    }
  }
}
await doc.transform(
  prune(), dedup(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 80 }),
  quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(out, doc);
console.log("written", out);
