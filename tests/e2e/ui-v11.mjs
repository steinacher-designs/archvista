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
await step("materials: grouped picker", async () => {
  await p.getByTestId("tab-materials").click();
  const groups = await p.locator(".mat select").first().locator("optgroup").count();
  const opts = await p.locator(".mat select").first().locator("option").count();
  if (groups < 7 || opts < 45) throw new Error(`groups ${groups} options ${opts}`);
  res.push(`  ${groups} groups, ${opts} materials`);
  await p.screenshot({ path: outDir + "/materials.png", timeout: 180000 });
});
res.push("page errors: " + (errs.length ? errs.join(" | ") : "none"));
console.log(res.join("\n")); await b.close(); srv.close();
