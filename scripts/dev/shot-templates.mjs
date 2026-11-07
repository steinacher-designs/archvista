// Dev helper: full-page screenshots of generated sites with the 3D model rendered — args: outDir dir1 dir2 …
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [out, ...dirs] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".svg": "image/svg+xml", ".webp": "image/webp", ".hdr": "application/octet-stream" };
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 900);
await Promise.all(dirs.map(async (dir) => {
  const srv = http.createServer(async (q, r) => { try { let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html"; const buf = await readFile(path.join(dir, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(buf); } catch { r.writeHead(404); r.end(); } }).listen(0);
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.waitForFunction(() => window.archvista && !document.querySelector(".av-loading"), null, { timeout: 180000 }).catch(() => errs.push("model not loaded"));
  await p.waitForTimeout(6000);
  if (process.env.HASH) await p.evaluate((h) => { location.hash = h; }, process.env.HASH), await p.waitForTimeout(900);
  const f = path.join(out, `${path.basename(dir)}${process.env.SUFFIX ?? ""}.png`);
  await p.screenshot({ path: f, fullPage: !process.env.VIEWPORT, timeout: 240000 });
  console.log(f, errs.length ? "ERR " + errs.join(" | ") : "ok");
  await p.close(); srv.close();
}));
await b.close();
