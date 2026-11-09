// Website check: walk mode → click an indoor place → stand inside → walk; walls stop you. No tour button.
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dir, out, placeName = "Wohnzimmer"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".webp": "image/webp" };
const srv = http.createServer(async (q, r) => { try { let f = decodeURIComponent(q.url.split("?")[0]); if (f.endsWith("/")) f += "index.html"; const buf = await readFile(path.join(dir, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(buf); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const res = []; const ok = (n, c, x = "") => res.push(`${c ? "✓" : "✗"} ${n}${x ? " " + x : ""}`);
await p.goto(`http://localhost:${srv.address().port}/`);
await p.waitForFunction(() => window.archvista && !document.querySelector(".av-loading"), null, { timeout: 300000 });
await p.waitForTimeout(2000);
ok("no 'Rundgang' button", (await p.locator("[data-a=tour]").count()) === 0);
const st = () => p.evaluate(() => { const v = window.archvista, c = v.camera.position, bb = v.config.bbox; return { mode: v.mode, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), inside: c.x > bb.min[0] && c.x < bb.max[0] && c.z > bb.min[2] && c.z < bb.max[2] }; });
// 1) from walk mode
await p.locator("[data-a=walk]").click(); await p.waitForTimeout(1500);
const before = await st();
await p.locator(".av-place", { hasText: placeName }).click(); await p.waitForTimeout(2500);
const a = await st();
ok(`walk: '${placeName}' puts you inside`, a.mode === "walk" && a.inside, `${JSON.stringify(before)} → ${JSON.stringify(a)}`);
// walk forward 4 s: you move, but never leave through the walls
await p.locator("[data-archvista] canvas").focus().catch(() => {});
await p.keyboard.down("KeyW"); await p.waitForTimeout(4000); await p.keyboard.up("KeyW");
await p.keyboard.down("KeyA"); await p.waitForTimeout(3000); await p.keyboard.up("KeyA");
await p.waitForTimeout(800);
const w = await st();
ok("walking inside works, walls hold", w.inside && Math.hypot(w.x - a.x, w.z - a.z) > 0.3, JSON.stringify(w));
await p.screenshot({ path: `${out}-inside.png`, timeout: 120000 });
// 2) from look-around mode: an indoor place switches to walking
await p.locator("[data-a=orbit]").click(); await p.waitForTimeout(1500);
await p.locator(".av-place", { hasText: "Küche" }).click(); await p.waitForTimeout(2500);
const k = await st();
ok("look-around: indoor place 'Küche' → walking, inside", k.mode === "walk" && k.inside, JSON.stringify(k));
// 3) an outside view stays a camera flight in look-around mode
await p.locator("[data-a=orbit]").click(); await p.waitForTimeout(1000);
await p.locator(".av-place", { hasText: "Außenansicht" }).click(); await p.waitForFunction(() => !window.archvista.camAnim, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1000);
const o = await st();
ok("look-around: outside view stays look-around", o.mode === "orbit", JSON.stringify(o));
res.push("page errors: " + (errs.length ? errs.join(" | ") : "none"));
console.log(res.join("\n")); await b.close(); srv.close();
