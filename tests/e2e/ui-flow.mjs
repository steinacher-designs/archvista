// ARCHVISTA end-to-end UI test (browser build, headless Chromium with software WebGL).
// usage: node tests/e2e/ui-flow.mjs <dist dir> <dxf> <screenshot dir>
import { chromium } from "playwright"; import http from "node:http"; import { readFile, mkdir } from "node:fs/promises"; import path from "node:path";
const [dist, dxf, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".webp": "image/webp", ".hdr": "application/octet-stream", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => {
  let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html";
  try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(0);
const url = `http://localhost:${srv.address().port}/`;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await page.addInitScript(() => { localStorage.setItem("av-maxfps", "0.5"); localStorage.setItem("av-auto", "0"); });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const results = [];
const step = async (name, fn) => { const t0 = Date.now(); try { await fn(); results.push(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); } catch (e) { results.push(`✗ ${name}: ${e.message.split("\n")[0]}`); } };
const shot = (n) => page.screenshot({ path: path.join(outDir, n + ".png"), timeout: 180000 });

await step("home screen", async () => { await page.goto(url); await page.getByText("DXF-Datei hierher ziehen").waitFor(); await shot("01-home"); });
const t0 = Date.now();
await step("import DXF via file chooser", async () => {
  await page.getByTestId("file").setInputFiles(dxf);
  await page.getByTestId("viewer").waitFor({ timeout: 120000 });
  results.push(`  import+analysis until workspace: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
});
await step("workspace shows detected storeys and entrance", async () => {
  const stats = await page.locator(".rail .stats").innerText();
  if (!/3 Geschosse erkannt/.test(stats) || !/Eingang erkannt/.test(stats)) throw new Error(stats);
  await page.waitForTimeout(6000); await shot("02-workspace");
});
for (const env of ["urban", "coastal", "studio", "forest"]) await step(`switch environment: ${env}`, async () => { await page.getByTestId(`env-${env}`).click(); await page.waitForTimeout(1500); if (!(await page.getByTestId(`env-${env}`).getAttribute("class")).includes("on")) throw new Error("not selected"); });
await step("lighting: evening", async () => { await page.getByTestId("tab-light").click(); await page.getByTestId("light-evening").click(); });
for (const tp of ["minimal", "dark-luxury", "swiss", "portfolio", "nature", "cinema"]) await step(`template ${tp}`, async () => { await page.getByTestId("tab-design").click(); await page.getByTestId(`tpl-${tp}`).click(); });
await step("undo/redo", async () => { await page.getByRole("button", { name: "Rückgängig" }).click(); await page.getByRole("button", { name: "Wiederholen" }).click(); });
await step("title edit", async () => { await page.getByTestId("tab-project").click(); await page.getByTestId("title").fill("Haus am Waldrand"); });
await step("restrict a room by clicking the plan", async () => {
  await page.getByTestId("tab-areas").click();
  await page.locator(".chips button", { hasText: "1. Obergeschoss" }).click();
  const box = await page.getByTestId("plan").boundingBox();
  // click right-third of the plan (east room on the upper floor)
  await page.getByTestId("plan").click({ position: { x: box.width * 0.62, y: box.height * 0.5 } });
  await page.locator(".zlist li").first().waitFor({ timeout: 5000 });
  await shot("03-areas");
});
await step("add info point by clicking the model", async () => {
  await page.getByTestId("tab-hotspots").click();
  const before = await page.locator(".hs").count();
  await page.getByTestId("add-hotspot").click();
  const vb = await page.getByTestId("viewer").boundingBox();
  await page.mouse.click(vb.x + vb.width * 0.5, vb.y + vb.height * 0.5);
  await page.waitForTimeout(500);
  const after = await page.locator(".hs").count();
  if (after !== before + 1) throw new Error(`hotspots ${before} → ${after}`);
});
await step("preview website (desktop)", async () => {
  await page.getByTestId("next").click();
  await page.getByTestId("preview-web").click();
  const frame = page.frameLocator("[data-testid=site-frame]");
  await frame.locator("[data-archvista]").waitFor({ timeout: 240000 });
  await page.waitForTimeout(4000);
  await shot("04-website-preview");
});
await step("publish step + offline export (zip)", async () => {
  await page.getByTestId("next").click();
  const dl = page.waitForEvent("download", { timeout: 240000 });
  await page.getByTestId("export").click();
  const d = await dl;
  await d.saveAs(path.join(outDir, "site.zip"));
  await shot("05-publish");
});
results.push(`page errors: ${errors.length ? errors.slice(0, 5).join(" | ") : "none"}`);
console.log(results.join("\n"));
await browser.close(); srv.close();
