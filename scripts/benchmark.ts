// ARCHVISTA performance benchmark: small / medium / large models through the whole pipeline
// (import, analysis, public scene + GLB, website files). Prints a Markdown table.
import { readFileSync, existsSync, statSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildPublicScene } from "../src/core/export/public-scene";
import { newProject } from "../src/core/project";
import { generateSite } from "../src/core/site/generate";

const models = [["small", "house_mm.dxf"], ["medium", "medium_mm.dxf"], ["large", "large_mm.dxf"]];
const rows: string[] = [];
const runtime = existsSync("public/site-runtime/viewer.js") ? new Uint8Array(readFileSync("public/site-runtime/viewer.js")) : new Uint8Array(1_100_000);
for (const [size, file] of models) {
  const path = `tests/fixtures/models/${file}`;
  const txt = readFileSync(path, "utf8");
  const t0 = performance.now();
  const m = importDxf(txt);
  const t1 = performance.now();
  const scene = prepareScene(m);
  const t2 = performance.now();
  const p = newProject(file, "bench");
  p.hotspots = scene.hotspotSuggestions; p.viewpoints = scene.viewpoints;
  const pub = buildPublicScene(scene, p);
  const t3 = performance.now();
  const files = await generateSite({ project: p, scene, pub, runtime, readAsset: async (r) => (existsSync("assets-lib/" + r) ? new Uint8Array(readFileSync("assets-lib/" + r)) : null) });
  const t4 = performance.now();
  const bytes = [...files.values()].reduce((n, b) => n + b.length, 0);
  rows.push(`| ${size} | ${(statSync(path).size / 1e6).toFixed(1)} MB | ${m.stats.triangles.toLocaleString("de-AT")} | ${scene.analysis.levels.length} / ${scene.analysis.rooms.length} | ${(t1 - t0).toFixed(0)} ms | ${(t2 - t1).toFixed(0)} ms | ${(t3 - t2).toFixed(0)} ms | ${(t4 - t3).toFixed(0)} ms | **${((t4 - t0) / 1000).toFixed(2)} s** | ${(bytes / 1e6).toFixed(1)} MB |`);
}
console.log(`| Modell | DXF | Dreiecke | Geschosse / Räume | Import | Analyse | 3D-Szene (GLB) | Website-Dateien | Summe | Website-Größe |
|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

Gemessen auf ${process.platform}/${process.arch}, Node ${process.version}, ohne Galeriebilder (die rendert die App auf der Grafikkarte) und ohne Upload.`);
