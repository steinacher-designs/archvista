// End-to-end: open a 3DS (plain and as ZIP with texture) in the app.
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, plain, zip, out] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const res = []; const ok = (n, c, x = "") => res.push(`${c ? "✓" : "✗"} ${n}${x ? " " + x : ""}`);
for (const [label, file] of [["plain .3ds", plain], ["ZIP (3DS + texture)", zip]]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => { localStorage.setItem("av-maxfps", "2"); localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.getByTestId("file").setInputFiles(file);
  await p.getByTestId("viewer").waitFor({ timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(8000);
  const info = await p.evaluate(() => { const v = window.__archvistaViewer; if (!v) return null; let meshes = 0, maps = 0; const ids = new Set(); v.scene.traverse((o) => { if (o.isMesh && o.userData.key) { meshes++; ids.add(o.userData.presetId); if (o.material.map?.image && String(o.userData.presetId).startsWith("img:")) maps++; } }); return { meshes, maps, ids: [...ids] }; });
  ok(`${label}: opens`, !!info && info.meshes > 0, JSON.stringify(info));
  if (label.startsWith("ZIP")) ok("ZIP: own texture used", info?.maps > 0);
  await p.screenshot({ path: `${out}-${label.startsWith("ZIP") ? "zip" : "plain"}.png`, timeout: 120000 });
  res.push(`  page errors: ${errs.length ? errs.join(" | ") : "none"}`);
  await p.close();
}
console.log(res.join("\n")); await b.close(); srv.close();
