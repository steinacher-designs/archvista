// App check with a huge model: import time, JS heap, then a few edits (material, colour, area tab). args: dist model outPrefix
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, model, out] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-precise-memory-info"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("crash", () => errs.push("PAGE CRASHED"));
p.on("console", (m) => { if (m.text().startsWith("PROBE")) console.log(m.text()); if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
const cdp = await p.context().newCDPSession(p); await cdp.send("Performance.enable");
const heap = async () => { const m = (await cdp.send("Performance.getMetrics")).metrics; const g = (n) => m.find((x) => x.name === n)?.value ?? 0; return `${(g("JSHeapUsedSize") / 1e6) | 0} MB heap`; };
const T = Date.now(); const t = () => `${((Date.now() - T) / 1000).toFixed(1)}s`;
await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch {} localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.waitForTimeout(1000);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
await p.getByTestId("file").setInputFiles(model);
await p.waitForFunction(() => document.querySelector(".progress, [data-testid=progress]") || true);
await cdp.send("Profiler.start");
await p.getByTestId("viewer").waitFor({ timeout: 600000 }).catch((e) => errs.push("viewer never appeared: " + e.message));
console.log("viewer up", t(), await heap());
await p.waitForTimeout(5000);
console.log("settled", t(), await heap());
{ const { profile } = await cdp.send("Profiler.stop"); const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
  console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${Math.round(v / 1000)}ms ${k}`).join("\n")); }
await p.screenshot({ path: `${out}-1.png`, timeout: 120000 });
await cdp.send("Profiler.start");
for (const tab of ["tab-materials", "tab-hotspots", "tab-areas", "tab-materials"]) {
  const s = Date.now(); console.log("  click at", Math.round(await p.evaluate(() => performance.now()))); await p.getByTestId(tab).click().catch((e) => errs.push(tab + " " + e.message)); await p.waitForTimeout(300);
  console.log(tab, Date.now() - s, "ms");
}
{ const { profile } = await cdp.send("Profiler.stop"); const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
  console.log("TABS PROFILE\n" + [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${Math.round(v / 1000)}ms ${k}`).join("\n")); }
const s1 = Date.now(); await p.locator(".mhead").first().click(); await p.waitForTimeout(200); console.log("open row", Date.now() - s1, "ms");
const s2 = Date.now(); await p.locator(".mtile").nth(3).click(); await p.waitForTimeout(500); console.log("change material", Date.now() - s2, "ms", await heap());
await p.screenshot({ path: `${out}-2.png`, timeout: 120000 });
const lt = await p.evaluate(() => window.__lt); console.log("long tasks >1s:", JSON.stringify(lt.filter((x) => x[1] > 1000)), "total blocked", lt.reduce((a, x) => a + x[1], 0), "ms in", lt.length);
console.log("errors:", errs.length ? errs.join(" | ") : "none");
await b.close(); srv.close();
