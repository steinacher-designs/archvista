// Dev helper: what is under given screen points for a camera view? (material, side, normal vs view)
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, skp] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "2"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(skp);
await p.getByTestId("viewer").waitFor({ timeout: 300000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const v = window.__archvistaViewer, cv = v.renderer.domElement, rect = cv.getBoundingClientRect();
  v.paused = true;
  v.camera.position.set(-6, 4, 8); v.camera.lookAt(0, 1.5, 0); v.camera.updateMatrixWorld();
  const out = [];
  for (const [fx, fy, label] of [[0.8, 0.85, "floor right"], [0.75, 0.1, "ceiling"], [0.3, 0.8, "floor left"]]) {
    const ev = { clientX: rect.left + rect.width * fx, clientY: rect.top + rect.height * fy };
    const h = v.pick(ev);
    if (!h) { out.push(label + ": nothing"); continue; }
    // find the mesh: nearest building mesh containing the point is not exposed; report point + normal vs camera
    const toCam = [v.camera.position.x - h.point[0], v.camera.position.y - h.point[1], v.camera.position.z - h.point[2]];
    const facing = toCam[0] * h.normal[0] + toCam[1] * h.normal[1] + toCam[2] * h.normal[2];
    out.push(`${label}: y=${h.point[1].toFixed(2)} normal=${h.normal.map((x) => x.toFixed(2))} ${facing > 0 ? "faces camera" : "FACES AWAY"}`);
  }
  // materials of meshes hit by a raycast along the view (use the scene's raycast via pick's internals is private): list meshes near floor height
  const mats = new Map();
  v.building.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; if (bb.max.y - bb.min.y < 0.3 && bb.max.x - bb.min.x > 3) mats.set(o.userData.presetId + (o.material.side === 0 ? " (1s)" : ""), `y ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)}`); } });
  out.push("flat large meshes: " + [...mats].map(([k, y]) => k + " " + y).join(" | "));
  return out.join("\n");
});
console.log(r); await b.close(); srv.close();
