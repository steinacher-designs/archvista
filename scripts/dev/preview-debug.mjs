import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, dxf] = process.argv.slice(2);
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".glb": "model/gltf-binary" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": T[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "0.5"); localStorage.setItem("av-auto", "0"); });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message)); p.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 200)));
p.on("requestfailed", (r) => console.log("REQFAIL", r.url().slice(0, 120), r.failure()?.errorText));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(dxf);
await p.getByTestId("viewer").waitFor({ timeout: 120000 });
await p.getByTestId("next").click();
await p.getByTestId("preview-web").click();
for (let i = 0; i < 24; i++) { await p.waitForTimeout(10000); const st = await p.evaluate(() => ({ frame: document.querySelector("iframe")?.getAttribute("src"), prog: document.querySelector(".side .intro + .bar, .side .bar i")?.getAttribute("style"), txt: document.querySelector(".side .body")?.innerText.slice(0, 120) })); console.log(i, JSON.stringify(st)); if (st.frame) break; }
await b.close(); srv.close();
