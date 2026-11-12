// App check: import .glb / .gltf-in-ZIP, textures arrive. args: dist file out.png
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, file, out] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(file);
const ok = await p.getByTestId("viewer").waitFor({ timeout: 300000 }).then(() => true).catch(() => false);
await p.waitForTimeout(5000);
const st = ok ? await p.evaluate(() => { const v = window.__archvistaViewer; let tex = 0, tris = 0; v.building.traverse((o) => { if (o.isMesh) { tris += o.geometry.index.count / 3; if (o.material.map) tex++; } }); return { tris, tex }; }) : await p.locator("body").innerText().then((t) => t.slice(0, 300));
console.log(path.basename(file), ok ? "✓ opened" : "✗ failed", JSON.stringify(st), "errors:", errs.join(" | ") || "none");
await p.screenshot({ path: out }); await b.close(); srv.close();
