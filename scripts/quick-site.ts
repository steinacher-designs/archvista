// Dev helper: DXF → minimal viewer page (for visual checks). The real generator is src/core/site.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildPublicScene } from "../src/core/export/public-scene";
import { newProject } from "../src/core/project";
const [dxf, out, env = "forest", lighting = "afternoon"] = process.argv.slice(2);
const model = importDxf(readFileSync(dxf, "utf8"));
const scene = prepareScene(model);
const project = newProject(dxf.split("/").pop()!, "dev");
project.environment = env as never; project.lighting = lighting as never; project.hotspots = scene.hotspotSuggestions; project.viewpoints = scene.viewpoints;
const pub = buildPublicScene(scene, project);
mkdirSync(out + "/assets", { recursive: true });
writeFileSync(out + "/assets/scene.glb", pub.glb);
writeFileSync(out + "/assets/scene.json", JSON.stringify(pub.config));
copyFileSync("public/site-runtime/viewer.js", out + "/assets/viewer.js");
cpSync("assets-lib", out + "/assets/lib", { recursive: true });
writeFileSync(out + "/index.html", `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%}#v{width:100vw;height:100vh}</style><div id=v data-archvista></div><script type=module src="assets/viewer.js"></script>`);
console.log("ok", pub.stats, (pub.glb.length / 1024).toFixed(0) + " KB");
