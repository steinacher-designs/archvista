// Dev helper: full website for a DXF with a given template (uses fake renders from PNGs).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildPublicScene } from "../src/core/export/public-scene";
import { newProject, TEMPLATES } from "../src/core/project";
import { generateSite } from "../src/core/site/generate";
const [dxf, out, template = "minimal", env = "forest", lighting = "afternoon", ...imgs] = process.argv.slice(2);
const scene = prepareScene(importDxf(readFileSync(dxf, "utf8")));
const p = newProject(path.basename(dxf), "dev");
Object.assign(p, { template, environment: env, lighting, title: "Haus am Waldrand", author: "Studio Steinacher",
  description: "Ein zweigeschossiges Wohnhaus mit Satteldach, großzügigen Fensterflächen und einer Terrasse nach Süden.\n\nDie Räume öffnen sich zum Garten; eine einläufige Treppe verbindet Erdgeschoss und Obergeschoss.",
  accent: TEMPLATES.find((t) => t.id === template)!.accent });
p.hotspots = scene.hotspotSuggestions.slice(0, 3).map((h, i) => ({ ...h, title: ["Wohnen & Essen", "Schlafzimmer", "Studio unterm Dach"][i] ?? h.title, text: "Beispieltext für den Rundgang." }));
p.viewpoints = scene.viewpoints;
const pub = buildPublicScene(scene, p);
const files = await generateSite({ project: p, scene, pub, runtime: new Uint8Array(readFileSync("public/site-runtime/viewer.js")),
  readAsset: async (r) => existsSync("assets-lib/" + r) ? new Uint8Array(readFileSync("assets-lib/" + r)) : null,
  renders: imgs.map((f, i) => ({ id: "view" + i, caption: ["Hauptansicht", "Abendstimmung", "Seitenansicht"][i] ?? "", data: new Uint8Array(readFileSync(f)) })) });
for (const [k, v] of files) { mkdirSync(path.dirname(path.join(out, k)), { recursive: true }); writeFileSync(path.join(out, k), v); }
console.log(files.size, "files", [...files.values()].reduce((n, b) => n + b.length, 0) / 1e6, "MB");
