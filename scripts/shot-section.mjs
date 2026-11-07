// Dev helper: screenshot one section (#id) of static pages. args: outPrefix selector dir...
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [out, sel, ...dirs] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const dir of dirs) {
  const srv = http.createServer(async (q, r) => { try { let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html"; r.end(await readFile(path.join(dir, f))); } catch { r.writeHead(404); r.end(); } }).listen(0);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(`http://localhost:${srv.address().port}/?still`); await p.waitForTimeout(1500);
  const el = p.locator(sel).first();
  await el.screenshot({ path: `${out}-${path.basename(dir)}.png`, timeout: 120000 });
  await p.close(); srv.close();
}
await b.close();
