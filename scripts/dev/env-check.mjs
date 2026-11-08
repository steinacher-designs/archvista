// End-to-end: own surroundings — load HDR and JPG panoramas, rotate, ground, website preview.
import { chromium } from "playwright"; import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dist, dxf, dir] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer(async (q, r) => { let f = decodeURIComponent(q.url.split("?")[0]); if (f === "/") f = "/index.html"; try { const b = await readFile(path.join(dist, f)); r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem("av-maxfps", "2"); localStorage.setItem("av-auto", "0"); sessionStorage.setItem("av-gpu-hint", "off"); });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "warning" && m.text().includes("archvista")) errs.push(m.text()); });
const res = []; const ok = (n, c, x = "") => res.push(`${c ? "✓" : "✗"} ${n}${x ? " " + x : ""}`);
const sky = () => p.evaluate(() => { const v = window.__archvistaViewer; const s = v.skybox; return s ? { rot: +s.rotation.y.toFixed(3), toneMapped: s.material.toneMapped, env: !!v.scene.environment, ground: v.envGroup.children.some((c) => c.geometry?.type === "CircleGeometry" && c.material?.map) } : null; });
await p.goto(`http://localhost:${srv.address().port}/`);
await p.getByTestId("file").setInputFiles(dxf);
await p.getByTestId("viewer").waitFor({ timeout: 120000 });
await p.getByTestId("tab-environment").click();
// 1) HDR panorama
await p.getByTestId("env-custom-file").setInputFiles(path.join(dir, "Mein Strand.hdr"));
await p.waitForTimeout(12000);
let s = await sky();
ok("HDR: panorama as background + light", !!s && s.env && s.toneMapped === true, JSON.stringify(s));
ok("tile shows file name", (await p.getByTestId("env-custom").textContent()).includes("Mein Strand.hdr"));
await p.screenshot({ path: path.join(dir, "env-hdr.png"), timeout: 180000 });
// 2) rotate 180°
await p.getByTestId("env-rotate").evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "180"); el.dispatchEvent(new Event("input", { bubbles: true })); });
await p.waitForTimeout(6000);
const s2 = await sky();
ok("rotate turns the panorama", s2 && Math.abs(s2.rot - Math.PI) < 0.01, `${s?.rot} → ${s2?.rot}`);
// 3) ground: paving
await p.locator(".envctl .chips button", { hasText: "Pflaster" }).click();
await p.waitForTimeout(8000);
ok("ground 'Pflaster' blends in", (await sky())?.ground === true);
// 4) normal JPG panorama
await p.getByTestId("env-custom-file").setInputFiles(path.join(dir, "Platz Panorama.jpg"));
await p.waitForTimeout(10000);
s = await sky();
ok("JPG panorama: photo background, light from the photo", !!s && s.env && s.toneMapped === false, JSON.stringify(s));
await p.screenshot({ path: path.join(dir, "env-jpg.png"), timeout: 180000 });
// 5) a normal (non-360) photo is accepted with a clear note
await p.getByTestId("env-custom-file").setInputFiles(path.join(dir, "Normales Foto.jpg"));
await p.waitForTimeout(4000);
const note = await p.getByTestId("env-custom-msg").textContent().catch(() => "");
ok("non-360 photo: clear note", /kein 360°-Panorama/.test(note), note.slice(0, 90));
// back to the real panorama, then the website preview
await p.getByTestId("env-custom-file").setInputFiles(path.join(dir, "Mein Strand.hdr"));
await p.waitForTimeout(6000);
await p.getByTestId("step-preview").click();
await p.getByTestId("preview-web").click();
let frame = null;
for (let i = 0; i < 60 && !frame; i++) { await p.waitForTimeout(1000); frame = p.frames().find((f) => f.url().includes("__preview")); }
if (frame) await frame.waitForFunction(() => window.archvista && !document.querySelector(".av-loading"), null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(15000);
const site = frame ? await frame.evaluate(() => { const v = window.archvista; return { sky: !!v?.skybox, rot: v?.skybox ? +v.skybox.rotation.y.toFixed(3) : null, env: !!v?.scene.environment }; }) : null;
ok("website shows own surroundings", !!site?.sky && site.env && Math.abs(site.rot - Math.PI) < 0.01, JSON.stringify(site));
await p.screenshot({ path: path.join(dir, "env-web.png"), timeout: 180000 });
res.push("page errors: " + (errs.length ? errs.join(" | ") : "none"));
console.log(res.join("\n")); await b.close(); srv.close();
