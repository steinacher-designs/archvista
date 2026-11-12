// Measures the cost of one frame in the app with a big model, with and without shadows / with parts hidden. args: dist model
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, model] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(model);
await p.getByTestId("viewer").waitFor({ timeout: 600000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const v = window.__archvistaViewer; const gl = v.renderer.getContext();
  const t = (label) => { const s = performance.now(); v.composer.render(0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return `${label}: ${Math.round(performance.now() - s)} ms`; };
  let tris = 0, meshes = 0; v.building.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index?.count ?? 0) / 3; } });
  const out = [`simplified ${v.simplified} drawn ${v.displayTriangles} tier ${v.tier} pr ${v.renderer.getPixelRatio()} soft ${v.softwareRendering} meshes ${meshes} tris ${tris}`];
  out.push(t("full")); out.push(t("full again"));
  v.renderer.shadowMap.autoUpdate = false; out.push(t("no shadow update")); v.renderer.shadowMap.autoUpdate = true;
  const hidden = []; v.building.traverse((o) => { if (o.isMesh && (o.geometry.index?.count ?? 0) / 3 > 50000) { o.visible = false; hidden.push(o); } });
  out.push(t(`big meshes hidden (${hidden.length})`)); hidden.forEach((o) => (o.visible = true));
  return out.join("\n");
});
console.log(r); await b.close(); srv.close();
