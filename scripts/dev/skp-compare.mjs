// Dev helper: render a .skp from a front-left 3/4 view (studio), to compare with SketchUp's own thumbnail.
import { chromium } from "playwright"; import http from "node:http"; import { readFile, writeFile } from "node:fs/promises"; import path from "node:path";
const [dist, skp, out, env = "studio"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "1"); localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(skp);
await p.getByTestId("viewer").waitFor({ timeout: 600000 });
await p.getByTestId("tab-environment").click(); await p.getByTestId(`env-${env}`).click();
await p.waitForTimeout(30000);
for (const [i, dir] of [[1, [-0.75, 0.42, 1.0]], [2, [0.9, 0.35, 0.8]]]) {
  const png = await p.evaluate(async (dir) => {
    const v = window.__archvistaViewer; const bb = v.config.bbox;
    const c = [(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2];
    const s = Math.max(bb.max[0] - bb.min[0], bb.max[2] - bb.min[2]) * 0.95;
    const blob = await v.capture({ id: "c", name: "c", position: [c[0] + dir[0] * s, c[1] + dir[1] * s, c[2] + dir[2] * s], target: c }, 1200, 800);
    const buf = new Uint8Array(await blob.arrayBuffer()); let str = ""; for (const x of buf) str += String.fromCharCode(x); return btoa(str);
  }, dir);
  await writeFile(`${out}-${i}.jpg`, Buffer.from(png, "base64"));
}
console.log("done; page errors:", errs.length ? errs.join(" | ") : "none");
await b.close(); srv.close();
