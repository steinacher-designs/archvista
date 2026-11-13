// Dev helper: why no storeys? Up-facing area per layer/category and height. args: file
import { openSync, readSync, fstatSync } from "node:fs";
import { importDxf } from "../../src/core/dxf/import";
import { classifyMesh } from "../../src/core/analysis/classify";
const fd = openSync(process.argv[2], "r"), size = fstatSync(fd).size;
const src = { size, read: (o: number, l: number) => { const b = Buffer.alloc(Math.min(l, size - o)); readSync(fd, b, 0, b.length, o); return new Uint8Array(b.buffer, b.byteOffset, b.length); } };
const m = importDxf(src);
const rows: [string, string, number, number, number][] = [];
const hist = new Map<number, number>();
for (const me of m.meshes) {
  const cat = classifyMesh(me).category;
  let up = 0, down = 0;
  const p = me.positions, I = me.indices;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    if (!l) continue;
    if (ny / l > 0.97) { up += l / 2; const k = Math.round((p[a + 1] + p[b + 1] + p[c + 1]) / 3 / 0.05); hist.set(k, (hist.get(k) ?? 0) + l / 2); }
    else if (ny / l < -0.97) down += l / 2;
  }
  rows.push([me.layer.slice(0, 40), cat, me.triangleCount, Math.round(up), Math.round(down)]);
}
rows.sort((a, b) => b[3] + b[4] - a[3] - a[4]);
console.log("layer | category | tris | up m² | down m²"); for (const r of rows.slice(0, 15)) console.log(r.join(" | "));
console.log("up-facing area by height:", [...hist].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, a]) => `${(k * 0.05).toFixed(2)}m:${Math.round(a)}m²`).join("  "));
