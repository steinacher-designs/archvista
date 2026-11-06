import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { classifyMesh, splitUnrecognised } from "../src/core/analysis/classify";
import { analyse } from "../src/core/analysis/spatial";
const m = importDxf(readFileSync(process.argv[2], "utf8"));
const meshes = splitUnrecognised(m.meshes);
const cats = new Map(meshes.map((x) => [x.id, classifyMesh(x).category]));
console.log([...new Set(meshes.map(x=>x.layer+":"+cats.get(x.id)))].join(" "));
const t = performance.now();
const a = analyse({ meshes, categories: cats, bbox: m.bbox });
console.log("analysis ms", (performance.now()-t).toFixed(0), "cell", a.grid.cell, a.grid.nx, a.grid.nz);
console.log(a.levels.map(l => `${l.name.de}@${l.elevation.toFixed(2)} h${l.height.toFixed(2)}`).join(", "));
for (const r of a.rooms) console.log(`room ${r.id} L${r.level} ${r.area}m² c=${r.centroid.map(v=>v.toFixed(1))} outline ${r.outline.length}`);
console.log("entrance", JSON.stringify(a.entrance), a.notes);
if (process.argv[3]) {
  const p = a.plans[+process.argv[3]]; const g = a.grid; const s = Math.max(1, Math.round(0.3/g.cell));
  for (let j = 0; j < g.nz; j += s) { let line=""; for (let i = 0; i < g.nx; i += s) { const c=j*g.nx+i; line += p.room[c]>=0 ? String.fromCharCode(65+p.room[c]%26) : p.blocked[c] ? "#" : p.walkable[c] ? "." : " "; } console.log(line); }
}
