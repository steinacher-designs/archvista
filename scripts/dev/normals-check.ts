// Dev helper: do vertex normals agree with triangle winding? (per primitive, one-sided vs double-sided)
import { readFileSync } from "node:fs";
import { buildScene } from "openskp";
const b = readFileSync(process.argv[2]); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const s = buildScene(ab, { respectEdgeVisibility: true });
const stat = { single: { agree: 0, oppose: 0 }, double: { agree: 0, oppose: 0 } };
for (const p of s.glbPrimitives) {
  const single = (s.gltfMaterials[p.materialIndex] as { doubleSided?: boolean }).doubleSided !== true;
  const P = p.positions, N = p.normals, I = p.indices;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, bb = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[bb] - P[a], uy = P[bb + 1] - P[a + 1], uz = P[bb + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const d = nx * N[a] + ny * N[a + 1] + nz * N[a + 2];
    const k = single ? stat.single : stat.double;
    if (d >= 0) k.agree++; else k.oppose++;
  }
}
console.log(JSON.stringify(stat));
