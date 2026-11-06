// Dev helper: screenshot static pages (3D paused) — args: outPng dir1 dir2 ...
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [out, ...dirs] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".hdr": "application/octet-stream" };
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const shots = [];
for (const dir of dirs) {
  const srv = http.createServer(async (q, r) => { try { let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html"; const buf = await readFile(path.join(dir, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(buf); } catch { r.writeHead(404); r.end(); } }).listen(0);
  const p = await b.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) } });
  await p.goto(`http://localhost:${srv.address().port}/?still`);
  await p.waitForTimeout(2500);
  if (process.env.SCROLL) await p.evaluate((y) => window.scrollTo(0, +y), process.env.SCROLL), await p.waitForTimeout(800);
  const f = out.replace(".png", `-${path.basename(dir)}.png`);
  await p.screenshot({ path: f, timeout: 120000 });
  shots.push(f); await p.close(); srv.close();
}
await b.close();
console.log(shots.join("\n"));
