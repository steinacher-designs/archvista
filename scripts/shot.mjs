// Dev helper: serve a folder and screenshot it in headless Chromium (SwiftShader WebGL).
import { chromium } from "playwright";
import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dir, outPng, script = "", w = 1280, h = 760] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { try { let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html"; const b = await readFile(path.join(dir, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream", "content-length": b.length }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = []; p.on("console", (m) => logs.push(m.type() + ": " + m.text())); p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message + "\n" + (e.stack ?? "").split("\n").slice(0, 6).join("\n")));
await p.goto(`http://localhost:${port}/?still`);
await p.waitForFunction(() => window.archvista || document.querySelector(".av-loading small"), null, { timeout: 120000 }).catch(() => logs.push("timeout"));

try {
  if (script) await p.evaluate(script);
  await p.evaluate(async () => { await window.archvista.renderOnce(); await window.archvista.renderOnce(); });
} catch (e) { logs.push("EVAL " + e.message); }
await p.screenshot({ path: outPng, timeout: 180000 });
console.log(logs.filter((l) => !l.includes("GPU stall")).slice(0, 15).join("\n"));
await b.close(); srv.close();
