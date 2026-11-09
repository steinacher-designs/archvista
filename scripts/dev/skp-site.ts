// Dev helper: website from a .skp with places taken from a published scene.json. args: skp sceneJson outDir
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { importSkp } from "../../src/core/skp/import";
import { prepareScene } from "../../src/core/scene";
import { buildPublicScene } from "../../src/core/export/public-scene";
import { newProject } from "../../src/core/project";
import { generateSite } from "../../src/core/site/generate";
const [skp, sceneJson, out] = process.argv.slice(2);
const { model } = importSkp(new Uint8Array(readFileSync(skp)));
const scene = prepareScene(model);
const pub0 = JSON.parse(readFileSync(sceneJson, "utf8"));
const p = newProject(path.basename(skp), "dev");
Object.assign(p, { title: pub0.title, environment: "studio", template: "minimal", places: pub0.places, viewpoints: scene.viewpoints });
const pub = buildPublicScene(scene, p);
const files = await generateSite({ project: p, scene, pub, runtime: new Uint8Array(readFileSync("public/site-runtime/viewer.js")), readAsset: async (r) => existsSync("assets-lib/" + r) ? new Uint8Array(readFileSync("assets-lib/" + r)) : null });
for (const [k, v] of files) { mkdirSync(path.dirname(path.join(out, k)), { recursive: true }); writeFileSync(path.join(out, k), v); }
console.log("ok", files.size, "files; levels", pub.config.levels.length, "places", pub.config.places?.length);
