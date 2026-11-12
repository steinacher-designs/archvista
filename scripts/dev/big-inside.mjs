// Screenshot inside a big model (simplified furniture) in the app. args: dist model out.png
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, model, out] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const logs = []; p.on("console", (m) => { if (m.text().includes("großes Modell")) logs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(model);
await p.getByTestId("viewer").waitFor({ timeout: 600000 });
await p.waitForTimeout(6000);
await p.evaluate(() => { const v = window.__archvistaViewer; v.goTo({ id: "x", name: "", position: [-12, 2.2, 5], target: [-14, 0.4, 1] }); });
await p.waitForTimeout(8000);
await p.screenshot({ path: out, timeout: 300000 });
console.log(logs.join("\n")); await b.close(); srv.close();
