import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
for (const f of process.argv.slice(2)) {
  const t0 = performance.now();
  const txt = readFileSync(f, "utf8");
  const t1 = performance.now();
  const m = importDxf(txt);
  const t2 = performance.now();
  console.log(`${f.split("/").pop()}: read ${(t1 - t0).toFixed(0)} ms, import ${(t2 - t1).toFixed(0)} ms, ${m.stats.triangles} tris, ${m.meshes.length} meshes, heap ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)} MB`);
}
