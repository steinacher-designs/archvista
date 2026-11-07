// ARCHVISTA v1.1 UI check: places tab, plans tab (upload), material picker with colour.
import { chromium } from "playwright"; import http from "node:http"; import { readFile, writeFile, mkdir } from "node:fs/promises"; import path from "node:path";
const [dist, dxf, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".hdr": "application/octet-stream", ".glb": "model/gltf-binary" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "0.5"); localStorage.setItem("av-auto", "0"); });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const res = []; const step = async (n, fn) => { try { await fn(); res.push("✓ " + n); } catch (e) { res.push("✗ " + n + ": " + e.message.split("\n")[0]); } };
await p.goto(`http://localhost:${srv.address().port}/`);
await step("credit on home", async () => { await p.getByText("Judith Steinacher").waitFor({ timeout: 10000 }); await p.screenshot({ path: outDir + "/home.png", timeout: 120000 }); });
await p.getByTestId("file").setInputFiles(dxf);
await p.getByTestId("viewer").waitFor({ timeout: 120000 });
await step("places: save current view", async () => {
  await p.getByTestId("tab-places").click();
  await p.getByTestId("place-name").fill("Küche");
  await p.getByTestId("place-add").click();
  await p.locator(".zlist input[value='Küche']").waitFor({ timeout: 5000 });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: outDir + "/places.png", timeout: 180000 });
});
await step("plans: add files", async () => {
  await p.getByTestId("tab-documents").click();
  await writeFile(outDir + "/Grundriss EG.pdf", "%PDF-1.4 demo"); await writeFile(outDir + "/Detail D1.dwg", "AC1032 demo");
  await p.getByTestId("docs-files").setInputFiles([outDir + "/Grundriss EG.pdf", outDir + "/Detail D1.dwg"]);
  await p.locator(".zlist li").nth(1).waitFor({ timeout: 10000 });
  await p.screenshot({ path: outDir + "/plans.png", timeout: 180000 });
});
await step("materials: visual picker, instant change, camera stays", async () => {
  await p.getByTestId("tab-materials").click();
  await p.locator(".mhead").first().click();
  const groups = await p.locator(".mgl").count(), tiles = await p.locator(".mtile").count();
  if (groups < 7 || tiles < 45) throw new Error(`groups ${groups} tiles ${tiles}`);
  res.push(`  ${groups} groups, ${tiles} materials`);
  const cam = () => p.evaluate(() => { const c = window.__av?.camera; return c ? c.position.toArray().map((v) => v.toFixed(3)).join(",") : ""; });
  await p.evaluate(() => { window.__av = window.__archvistaViewer; });
  await p.mouse.move(500, 400); await p.mouse.down(); await p.mouse.move(560, 430, { steps: 6 }); await p.mouse.up(); // orbit a bit
  let before = await cam();
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(4500); const c = await cam(); if (c === before) break; before = c; } // wait until the camera rests
  const target = p.locator(".mtile:not(.on)").nth(3);
  const id = (await target.getAttribute("data-testid")).slice(5);
  await target.click();
  await p.waitForTimeout(6000);
  const after = await cam();
  const dist = Math.hypot(...before.split(",").map((v, i) => +v - +after.split(",")[i]));
  if (dist > 0.1) throw new Error(`camera jumped ${dist.toFixed(2)} m: ${before} → ${after}`);
  const used = await p.evaluate((id) => { let n = 0; window.__av.scene.traverse((o) => { if (o.isMesh && o.userData.presetId === id) n++; }); return n; }, id);
  if (!used) throw new Error("material not applied in 3D");
  res.push(`  ${id} applied to ${used} mesh(es), camera stayed (${dist.toFixed(3)} m)`);
  await p.screenshot({ path: outDir + "/materials.png", timeout: 180000 });
  // click a surface in 3D → its row opens
  await p.locator(".mhead").first().click(); // close
  const box = await p.getByTestId("viewer").boundingBox();
  let opened = null;
  for (const [fx, fy] of [[0.5, 0.5], [0.45, 0.55], [0.55, 0.45], [0.5, 0.6]]) {
    await p.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await p.waitForTimeout(2500);
    if (await p.locator(".mrow.open").count()) { opened = await p.locator(".mrow.open .mhead b").textContent(); break; }
  }
  if (!opened) throw new Error("click on the model did not open a part");
  res.push(`  click on model opened: ${opened}`);
});
res.push("page errors: " + (errs.length ? errs.join(" | ") : "none"));
console.log(res.join("\n")); await b.close(); srv.close();
