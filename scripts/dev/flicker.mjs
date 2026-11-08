// Dev helper: flicker measure — same view twice, camera nudged 2 mm; counts pixels that jump. args: dist skp outPrefix
import { chromium } from "playwright"; import http from "node:http"; import { readFile, writeFile } from "node:fs/promises"; import path from "node:path";
const [dist, skp, out] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "2"); localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(skp);
await p.getByTestId("viewer").waitFor({ timeout: 300000 });
await p.getByTestId("tab-environment").click(); await p.getByTestId("env-urban").click();
await p.waitForTimeout(15000);
const shots = [];
for (const [i, vp] of [[0, { position: [9, 1.6, 9], target: [0, 1.0, 0] }], [1, { position: [-6, 4, 8], target: [0, 1.5, 0] }], [2, { position: [3, 1.6, -9], target: [0, 1.2, 0] }]]) {
  const pair = [];
  for (const d of [0, 0.002]) {
    const png = await p.evaluate(async ({ vp, d }) => {
      const v = window.__archvistaViewer;
      const blob = await v.capture({ id: "t", name: "t", position: [vp.position[0] + d, vp.position[1] + d, vp.position[2]], target: vp.target }, 960, 600);
      const buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of buf) s += String.fromCharCode(x); return btoa(s);
    }, { vp, d });
    const f = `${out}-v${i}-${d ? "b" : "a"}.jpg`; await writeFile(f, Buffer.from(png, "base64")); pair.push(f);
  }
  shots.push(pair);
}
console.log(JSON.stringify(shots));
await b.close(); srv.close();
