// Dev helper: open a .skp in the app, city environment, screenshots from a few angles; reports one-sided meshes.
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, skp, out, env = "urban"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "2"); localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(skp);
await p.getByTestId("viewer").waitFor({ timeout: 300000 });
await p.getByTestId("tab-environment").click();
await p.getByTestId(`env-${env}`).click().catch(() => {});
await p.waitForTimeout(20000);
const info = await p.evaluate(() => { let one = 0, two = 0, maps = 0; window.__archvistaViewer.scene.traverse((o) => { if (o.isMesh && o.userData.key) { if (o.material.side === 0) one++; else two++; if (o.material.map) maps++; } }); return { one, two, maps }; });
console.log("meshes one-sided", info.one, "double", info.two, "with texture", info.maps);
await p.screenshot({ path: `${out}/look-1.png`, timeout: 180000 });
// orbit to a second angle
const box = await p.getByTestId("viewer").boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2 + 40, { steps: 12 }); await p.mouse.up();
await p.mouse.wheel(0, -500); await p.waitForTimeout(8000);
await p.screenshot({ path: `${out}/look-2.png`, timeout: 180000 });
console.log("page errors:", errs.length ? errs.join(" | ") : "none");
await b.close(); srv.close();
