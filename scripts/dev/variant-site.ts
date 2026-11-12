// Dev helper: website from house_mm.dxf with an info point whose part can be tried in other materials. arg: outDir
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { importDxf } from "../../src/core/dxf/import";
import { prepareScene } from "../../src/core/scene";
import { buildPublicScene } from "../../src/core/export/public-scene";
import { newProject } from "../../src/core/project";
import { generateSite } from "../../src/core/site/generate";
const [out] = process.argv.slice(2);
const scene = prepareScene(importDxf(readFileSync("tests/fixtures/models/house_mm.dxf", "utf8")));
const p = newProject("house_mm.dxf", "dev");
const wall = [...scene.parts].sort((a, b) => b.indices.length - a.indices.length).find((x) => x.category === "wall") ?? scene.parts[0];
const c = scene.bbox;
p.environment = "studio"; p.viewpoints = scene.viewpoints;
p.hotspots = [{ id: "w", position: [(c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, c.max[2]], title: "Fassade", text: "Probieren Sie andere Farben.", variants: { part: wall.key, originalName: "Weiß", options: [{ id: "plaster_white~#475480", name: "Blau" }, { id: "plaster_white~#5f7d5a", name: "Grün" }, { id: "brick", name: "" }] } }];
const pub = buildPublicScene(scene, p);
const files = await generateSite({ project: p, scene, pub, runtime: new Uint8Array(readFileSync("public/site-runtime/viewer.js")), readAsset: async (r) => existsSync("assets-lib/" + r) ? new Uint8Array(readFileSync("assets-lib/" + r)) : null });
for (const [k, v] of files) { mkdirSync(path.dirname(path.join(out, k)), { recursive: true }); writeFileSync(path.join(out, k), v); }
console.log("ok", files.size, "files; wall", wall.category, JSON.stringify(pub.config.hotspots[0].variants));
