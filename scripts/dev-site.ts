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
const D = (id: string, folder: string, fileName: string, size: number) => ({ id, folder, title: fileName.replace(/\.[^.]+$/, ""), fileName, size, addedAt: "" });
p.documents = [D("1", "Pläne", "Grundriss Erdgeschoss.pdf", 1_840_000), D("2", "Pläne", "Grundriss Obergeschoss.pdf", 1_620_000), D("3", "Pläne", "Schnitt A-A.pdf", 950_000),
  D("4", "Details", "Fensteranschluss D1.dwg", 420_000), D("5", "Details", "Attika D4.dwg", 310_000), D("6", "Baubeschreibung", "Baubeschreibung.pdf", 2_300_000)];
const up = scene.analysis.rooms.find((r) => r.level === 1)!;
p.levelNames = { 0: "Wohnen", 1: "Schlafen" };
p.places = [{ id: "a", name: "Terrasse", position: [scene.bbox.max[0] - 2, scene.analysis.groundY + 1.65, scene.bbox.min[2] - 3], target: [scene.bbox.max[0] - 4, scene.analysis.groundY + 1.5, scene.bbox.min[2] + 2], walk: true },
  { id: "b", name: "Blick vom Garten", position: [scene.bbox.min[0] - 14, scene.analysis.groundY + 4, scene.bbox.max[2] + 12], target: [0, 3, 0], walk: false },
  { id: "c", name: "Kinderzimmer", position: [up.centroid[0], scene.analysis.levels[1].elevation + 1.65, up.centroid[1]], target: [up.centroid[0] + 2, scene.analysis.levels[1].elevation + 1.4, up.centroid[1]], walk: true }];
const pub = buildPublicScene(scene, p);
const files = await generateSite({ project: p, scene, pub, runtime: new Uint8Array(readFileSync("public/site-runtime/viewer.js")),
  readAsset: async (r) => existsSync("assets-lib/" + r) ? new Uint8Array(readFileSync("assets-lib/" + r)) : null,
  renders: imgs.map((f, i) => ({ id: "view" + i, caption: ["Hauptansicht", "Abendstimmung", "Seitenansicht"][i] ?? "", data: new Uint8Array(readFileSync(f)) })),
  documents: p.documents.map((d) => ({ doc: d, data: new TextEncoder().encode("demo " + d.fileName) })) });
for (const [k, v] of files) { mkdirSync(path.dirname(path.join(out, k)), { recursive: true }); writeFileSync(path.join(out, k), v); }
console.log(files.size, "files", [...files.values()].reduce((n, b) => n + b.length, 0) / 1e6, "MB");
