// Dev helper: find coplanar, same-facing overlapping triangles with different materials (would flicker).
import { readFileSync } from "node:fs";
import { importSkp } from "../../src/core/skp/import";
const { model } = importSkp(new Uint8Array(readFileSync(process.argv[2])));
const cells = new Map<string, { mat: string; single: boolean; nx: number; ny: number; nz: number }[]>();
let pairsBefore = 0, total = 0;
for (const m of model.meshes) {
  const P = m.positions, I = m.indices;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-9) continue; nx /= l; ny /= l; nz /= l;
    const cx = (P[a] + P[b] + P[c]) / 3, cy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, cz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    // same plane (offset to 0.5 mm, direction up to sign) and centroid within 2 cm
    const sg = nx + ny * 1.1 + nz * 1.3 >= 0 ? 1 : -1, d = (nx * cx + ny * cy + nz * cz) * sg;
    const k = `${Math.round(cx * 50)},${Math.round(cy * 50)},${Math.round(cz * 50)}|${Math.round(nx * sg * 200)},${Math.round(ny * sg * 200)},${Math.round(nz * sg * 200)}|${Math.round(d * 2000)}`;
    const l2 = cells.get(k) ?? []; l2.push({ mat: (m.material ?? "-") + m.color, single: !!m.singleSided, nx, ny, nz }); cells.set(k, l2); total++;
  }
}
let fighting = 0, sidePairs = 0; const kinds = new Map<string, number>();
for (const l of cells.values()) for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
  if (l[i].mat === l[j].mat) continue;
  const same = l[i].nx * l[j].nx + l[i].ny * l[j].ny + l[i].nz * l[j].nz > 0;
  const tag = () => { const k = [l[i].mat + (l[i].single ? "(1s)" : ""), l[j].mat + (l[j].single ? "(1s)" : "")].sort().join("  ⟷  ") + (same ? " same-dir" : " opposite"); kinds.set(k, (kinds.get(k) ?? 0) + 1); };
  if (!l[i].single || !l[j].single) { fighting++; tag(); }  // a double-sided surface overlaps another surface
  else if (same) { fighting++; tag(); }                     // two one-sided surfaces facing the same way
  else sidePairs++;                                         // front/back pair, now one-sided → no flicker
}
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(String(n).padStart(6), k);
console.log("triangles", total, "| front/back pairs handled", sidePairs, "| still overlapping (model itself)", fighting);
