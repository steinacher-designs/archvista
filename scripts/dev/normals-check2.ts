// Dev helper: after import — winding vs normals, and front/back copies facing opposite ways.
import { readFileSync } from "node:fs";
import { importSkp } from "../../src/core/skp/import";
const { model } = importSkp(new Uint8Array(readFileSync(process.argv[2])));
let agree = 0, oppose = 0;
for (const m of model.meshes) { const P = m.positions, N = m.normals, I = m.indices;
  for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const d = (uy * vz - uz * vy) * N[a] + (uz * vx - ux * vz) * N[a + 1] + (ux * vy - uy * vx) * N[a + 2]; if (d >= 0) agree++; else oppose++; } }
console.log({ agree, oppose, flipped: model.stats.flippedForConsistency, duplicatesRemoved: model.stats.removedDuplicate });
