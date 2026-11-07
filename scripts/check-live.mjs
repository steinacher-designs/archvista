// Visit a published ARCHVISTA website like a visitor (desktop + phone), report errors, take screenshots.
import { chromium, devices } from "playwright";
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1366, height: 820 } }], ["phone", { ...devices["iPhone 13"] }]]) {
  const ctx = await b.newContext(ctxOpts);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("response", (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  const t0 = Date.now();
  await p.goto(url + "?still");
  await p.waitForFunction(() => window.archvista, null, { timeout: 180000 });
  await p.evaluate(async () => { await window.archvista.assetsSettled(); await window.archvista.renderOnce(); });
  const ms = Date.now() - t0;
  await p.screenshot({ path: `${out}-${name}-top.png`, timeout: 180000 });
  await p.evaluate(() => document.querySelector("#erleben")?.scrollIntoView());
  await p.evaluate(async () => { await window.archvista.renderOnce(); });
  await p.screenshot({ path: `${out}-${name}-3d.png`, timeout: 180000 });
  console.log(`${name}: 3D ready in ${(ms / 1000).toFixed(1)} s (software rendering), errors: ${errs.length ? errs.join(" | ") : "none"}`);
  await ctx.close();
}
await b.close();
