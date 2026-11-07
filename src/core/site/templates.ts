// ARCHVISTA — ten website designs. The live 3D model is always the centre of the page; info text and
// plans appear only when the user filled them in. No rendered stills, no web fonts (works offline,
// no third-party requests), all paths relative (works from a folder, any server, GitHub Pages sub paths).

import type { TemplateId } from "../project";

export interface SiteData {
  lang: "de" | "en";
  title: string;
  description: string;
  author: string;
  accent: string;
  year: number;
  facts: { label: string; value: string }[];
  levels: string[];
  hasTour: boolean;
  /** Downloads grouped by folder. */
  documents?: { folder: string; items: { title: string; href: string; ext: string; size: string; open: boolean }[] }[];
  buildId?: string;
}

const T = {
  de: { model: "3D-Modell", project: "Projekt", info: "Info", by: "Entwurf", made: "Erstellt mit ARCHVISTA", credits: "Bildnachweise",
    measured: "aus dem 3D-Modell gemessen", docs: "Pläne & Unterlagen", close: "Schließen", drawing: "Zeichnung", date: "Datum", sheet: "Blatt",
    hint: "Ziehen zum Umsehen · „Begehen“ für einen Rundgang zu Fuß" },
  en: { model: "3D model", project: "Project", info: "Info", by: "Design", made: "Made with ARCHVISTA", credits: "Credits",
    measured: "measured from the 3D model", docs: "Plans & documents", close: "Close", drawing: "Drawing", date: "Date", sheet: "Sheet",
    hint: "Drag to look around · “Walk” to explore on foot" },
};
type Tx = (typeof T)["de"];

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
const paras = (s: string) => s.split(/\n{2,}/).filter((p) => p.trim()).map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");

const SANS = `"Helvetica Neue","Segoe UI Variable Text","Segoe UI",Helvetica,Arial,system-ui,-apple-system,sans-serif`;
const DISPLAY = `"Helvetica Neue","Segoe UI Variable Display","Segoe UI",Helvetica,Arial,system-ui,sans-serif`;
const SERIF = `"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif`;
const MONO = `ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace`;

function head(d: SiteData, css: string, theme: string) {
  return `<!doctype html>
<html lang="${d.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description.slice(0, 160) || d.title)}">
<meta property="og:title" content="${esc(d.title)}">
<meta name="theme-color" content="${theme}">
<meta name="generator" content="ARCHVISTA">
${d.buildId ? `<meta name="archvista-build" content="${esc(d.buildId)}">` : ""}
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="modulepreload" href="assets/viewer.js">
<style>${BASE_CSS}${css}</style>
</head>`;
}

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}body{margin:0;--accent:ACCENT;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}p{margin:0 0 1em}p:last-child{margin-bottom:0}
.viewer{position:relative;width:100%;overflow:hidden;background:#15161a}
.viewer [data-archvista]{position:absolute;inset:0}
.facts{display:flex;flex-wrap:wrap;gap:var(--fgap,28px 40px);margin:0;padding:0}.facts div{min-width:0}.facts dt{opacity:.55;font-size:.78em;letter-spacing:.04em}.facts dd{margin:3px 0 0}
.docs{display:grid;gap:28px}.docs h3{margin:0 0 6px;font:inherit}.docs ul{list-style:none;margin:0;padding:0}
.docs a{display:flex;align-items:center;gap:16px;padding:15px 2px;text-decoration:none;border-bottom:1px solid var(--line,rgba(0,0,0,.1));transition:padding .25s,background-color .25s}
.docs a:hover{padding-left:10px;padding-right:10px;background:var(--hover,rgba(0,0,0,.03))}
.docs .ext{flex:none;min-width:44px;text-align:center;font:600 10.5px/1 ${SANS};letter-spacing:.08em;padding:6px 7px;border-radius:4px;border:1px solid currentColor;opacity:.75}
.docs .tt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.docs .sz{opacity:.5;font-size:.85em;white-space:nowrap;font-variant-numeric:tabular-nums}
.docs .dl{flex:none;width:18px;height:18px;opacity:.45;transition:transform .25s,opacity .25s}.docs a:hover .dl{transform:translateY(2px);opacity:1}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;z-index:20;background:#fff;color:#000;padding:8px}
.foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;font-size:12.5px;opacity:.6}.foot a{text-decoration:none}.foot a:hover{text-decoration:underline}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
`;

const DL = `<svg class="dl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>`;

function viewer(d: SiteData, cls = "viewer", cinematic = false) {
  return `<div class="${cls}" id="modell" data-av-fullscreen><div data-archvista data-base="assets/" data-lang="${d.lang}"${cinematic ? ' data-cinematic="1"' : ""}></div></div>`;
}
const script = `<script type="module" src="assets/viewer.js"></script>`;
function facts(d: SiteData, cls = "facts") {
  if (!d.facts.length) return "";
  return `<dl class="${cls}">${d.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>`;
}
/** Download list, grouped by folder. */
function docs(d: SiteData) {
  if (!d.documents?.length) return "";
  const many = d.documents.length > 1;
  return `<div class="docs">${d.documents.map((g) => `<div class="docs-g">${many || g.folder ? `<h3>${esc(g.folder)}</h3>` : ""}<ul>${g.items.map((it) =>
    `<li><a href="${esc(it.href)}"${it.open ? ' target="_blank" rel="noopener"' : " download"}><span class="ext">${esc(it.ext)}</span><span class="tt">${esc(it.title)}</span><span class="sz">${esc(it.size)}</span>${DL}</a></li>`).join("")}</ul></div>`).join("")}</div>`;
}
const has = (d: SiteData) => ({ info: !!d.description.trim(), docs: !!d.documents?.length });
function foot(d: SiteData, t: Tx, cls = "foot") {
  return `<footer class="${cls}"><span>© ${d.year}${d.author ? " " + esc(d.author) : ""}</span><span><a href="credits.html">${t.credits}</a> · ${t.made}</span></footer>`;
}
/** Small in-page navigation: only links to sections that exist. */
function nav(d: SiteData, t: Tx) {
  const h = has(d);
  return [`<a href="#modell">${t.model}</a>`, h.info ? `<a href="#projekt">${t.project}</a>` : "", h.docs ? `<a href="#plaene">${t.docs}</a>` : ""].join("");
}

// ——— 1. Minimal — white, quiet, the model as a large framed picture ———
function minimal(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:16px/1.65 ${SANS};color:#141414;background:#fff;--line:#ececec}
.w{max-width:1360px;margin:0 auto;padding:0 clamp(18px,3vw,40px)}
header{display:flex;align-items:center;justify-content:space-between;height:68px;gap:20px}
header b{font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
header nav{display:flex;gap:28px;font-size:14px;color:#777}header nav a{text-decoration:none}header nav a:hover{color:#141414}
.viewer{height:min(78svh,880px);min-height:440px;border-radius:6px}
.intro{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,6vw,96px);padding:clamp(48px,7vw,104px) 0;align-items:start}
h1{font:600 clamp(36px,5vw,64px)/1.02 ${DISPLAY};letter-spacing:-.035em;margin:0 0 28px}
.facts{font-size:15px}.facts dd{font-size:20px;font-weight:500}
.txt{font-size:18px;line-height:1.7;color:#333;max-width:58ch}.by{margin-top:28px;font-size:14px;color:#888}
section{padding:0 0 clamp(56px,7vw,104px)}h2{font:500 12px/1 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:#999;margin:0 0 20px}
.docs{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:28px 64px}.docs h3{font-size:13px;color:#999;padding-bottom:6px}
.foot{padding:28px 0 40px;border-top:1px solid #ececec}
@media (max-width:820px){.intro{grid-template-columns:1fr}header nav{display:none}}
`, "#ffffff")}
<body><a class="skip" href="#modell">${t.model}</a>
<header class="w"><b>${esc(d.title)}</b><nav>${nav(d, t)}</nav></header>
<main class="w">${viewer(d)}
<div class="intro" id="projekt"><div><h1>${esc(d.title)}</h1>${facts(d)}</div>${h.info || d.author ? `<div class="txt">${paras(d.description)}${d.author ? `<p class="by">${t.by} · ${esc(d.author)}</p>` : ""}</div>` : ""}</div>
${h.docs ? `<section id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}
${foot(d, t, "foot")}</main>${script}</body></html>`;
}

// ——— 2. Noir — the model fills the screen, title over it; dark, serif, refined ———
function darkLuxury(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:17px/1.75 ${SERIF};color:#ece7dd;background:#0c0c0d;--line:rgba(236,231,221,.12);--hover:rgba(236,231,221,.04)}
.stage{position:relative;height:100svh;min-height:520px}
.viewer{position:absolute;inset:0}
.cap{position:absolute;left:0;right:0;top:0;padding:clamp(22px,4vw,48px);pointer-events:none;background:linear-gradient(180deg,rgba(12,12,13,.72),rgba(12,12,13,0));z-index:2}
.kick{font:500 11px/1 ${SANS};letter-spacing:.34em;text-transform:uppercase;color:var(--accent)}
h1{font-weight:400;font-size:clamp(34px,5.4vw,76px);line-height:1.02;margin:14px 0 0;letter-spacing:-.01em;max-width:16ch}
.down{position:absolute;right:clamp(22px,4vw,48px);bottom:34px;z-index:2;font:500 11px/1 ${SANS};letter-spacing:.3em;text-transform:uppercase;color:rgba(236,231,221,.7);text-decoration:none}
.col{max-width:760px;margin:0 auto;padding:clamp(72px,10vw,140px) 24px 0}
.rule{width:56px;height:1px;background:var(--accent);margin:0 0 40px}
.txt{font-size:20px;line-height:1.8;color:#d9d3c7}.txt p:first-child::first-letter{float:left;font-size:3.3em;line-height:.9;padding:6px 10px 0 0;color:var(--accent)}
.facts{margin-top:56px;font:15px/1.4 ${SANS};--fgap:24px 56px;padding-top:28px;border-top:1px solid var(--line)}.facts dd{font:400 26px/1.2 ${SERIF};color:#fff}
h2{font:500 11px/1 ${SANS};letter-spacing:.34em;text-transform:uppercase;color:var(--accent);margin:0 0 28px}
.docs h3{font:italic 18px ${SERIF};color:#bdb5a6}.docs .ext{color:var(--accent);opacity:1}
.foot{max-width:760px;margin:0 auto;padding:110px 24px 48px;font-family:${SANS}}
`, "#0c0c0d")}
<body><a class="skip" href="#modell">${t.model}</a>
<div class="stage">${viewer(d)}<div class="cap"><div class="kick">${esc(d.author || t.project)}</div><h1>${esc(d.title)}</h1></div>${h.info || h.docs ? `<a class="down" href="#projekt">${t.info} ↓</a>` : ""}</div>
<main class="col" id="projekt"><div class="rule"></div>${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}
${h.docs ? `<section id="plaene" style="margin-top:96px"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}</main>
${foot(d, t)}${script}</body></html>`;
}

// ——— 3. Swiss — strict grid, oversized grotesk, one signal colour ———
function swiss(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:16px/1.5 ${SANS};color:#111;background:#f3f2ee;--line:#111;--hover:rgba(0,0,0,.04)}
.g{display:grid;grid-template-columns:repeat(12,1fr);column-gap:20px;padding:0 clamp(16px,3vw,40px)}
.top{padding-top:28px;padding-bottom:22px;align-items:end;border-bottom:2px solid #111}
.mark{grid-column:span 2;display:flex;gap:10px;align-items:center;font-weight:700;font-size:13px;letter-spacing:.02em}.mark i{width:14px;height:14px;background:var(--accent);display:block}
.top nav{grid-column:7/-1;display:flex;gap:24px;justify-content:flex-end;font-size:13px;font-weight:600}.top nav a{text-decoration:none}
h1{grid-column:1/-1;font:700 clamp(44px,9.5vw,168px)/.88 ${DISPLAY};letter-spacing:-.055em;margin:clamp(40px,6vw,80px) 0 clamp(24px,3vw,40px)}
.viewer{grid-column:1/-1;height:min(74svh,860px);min-height:420px}
.lab{grid-column:span 3;font-weight:700;font-size:13px;padding-top:14px;border-top:2px solid #111}
.body{grid-column:4/-1;padding-top:12px;border-top:2px solid #111}
.row{margin-top:clamp(56px,7vw,96px)}
.txt{font-size:21px;line-height:1.45;font-weight:500;max-width:34em;letter-spacing:-.005em}
.facts{margin-top:36px;--fgap:20px 48px}.facts dt{opacity:1;font-weight:700;font-size:12px}.facts dd{font-size:28px;font-weight:700;letter-spacing:-.03em}
.docs{gap:36px}.docs h3{font-weight:700;font-size:13px}.docs a{border-bottom-width:1px}.docs .ext{border:0;background:var(--accent);color:#fff;opacity:1;border-radius:0}
.foot{grid-column:1/-1;margin-top:clamp(64px,8vw,120px);padding:16px 0 32px;border-top:2px solid #111;opacity:1;font-weight:600;font-size:12px}
@media (max-width:820px){.lab,.body{grid-column:1/-1}.lab{border-top:2px solid #111}.body{border-top:0}.top nav{display:none}.mark{grid-column:1/-1}}
`, "#f3f2ee")}
<body><a class="skip" href="#modell">${t.model}</a>
<header class="g top"><div class="mark"><i></i>${esc(d.author || "ARCHVISTA")}</div><nav>${nav(d, t)}</nav></header>
<main class="g"><h1>${esc(d.title)}</h1>${viewer(d)}
<div class="lab row" id="projekt">${t.project}</div><div class="body row">${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}</div>
${h.docs ? `<div class="lab row" id="plaene">${t.docs}</div><div class="body row">${docs(d)}</div>` : ""}
${foot(d, t)}</main>${script}</body></html>`;
}

// ——— 4. Atelier — split screen: calm info column left, model fills the right ———
function portfolio(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:15.5px/1.65 ${SANS};color:#1d1c1a;background:#faf9f7;--line:#e7e3dc}
.split{display:grid;grid-template-columns:minmax(340px,420px) 1fr;min-height:100svh}
aside{padding:clamp(28px,3.4vw,52px);display:flex;flex-direction:column;gap:40px;border-right:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b857a}.brand i{width:8px;height:8px;border-radius:50%;background:var(--accent)}
h1{font:600 clamp(30px,2.8vw,44px)/1.08 ${DISPLAY};letter-spacing:-.03em;margin:0}
.by{margin-top:12px;color:#8b857a}
.txt{color:#45423d}
.facts{--fgap:18px 32px;font-size:14px}.facts dd{font-size:17px;font-weight:600}
h2{font:600 11px/1 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:#8b857a;margin:0 0 10px}
.docs{gap:22px}.docs h3{font-weight:600;font-size:13px}.docs a{padding:12px 2px;font-size:14.5px}
.foot{margin-top:auto;padding-top:24px;border-top:1px solid var(--line);flex-direction:column;gap:4px}
.viewer{position:sticky;top:0;height:100svh}
@media (max-width:900px){.split{grid-template-columns:1fr}.viewer{position:relative;height:72svh;order:-1}aside{border-right:0}}
`, "#faf9f7")}
<body><a class="skip" href="#modell">${t.model}</a>
<div class="split"><aside><div class="brand"><i></i>${t.project}</div>
<div id="projekt"><h1>${esc(d.title)}</h1>${d.author ? `<div class="by">${esc(d.author)}</div>` : ""}</div>
${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}
${h.docs ? `<section id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}
${foot(d, t)}</aside>${viewer(d)}</div>${script}</body></html>`;
}

// ——— 5. Papier — warm paper, serif, the model set like a plate in a book ———
function nature(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:18px/1.7 ${SERIF};color:#2b2822;background:#efe9df;--line:rgba(43,40,34,.14);--hover:rgba(43,40,34,.04)}
.w{max-width:1280px;margin:0 auto;padding:0 clamp(16px,3vw,40px)}
header.w{text-align:center;padding-top:clamp(48px,7vw,96px);padding-bottom:clamp(32px,4vw,52px)}
.kick{font:500 12px/1 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:var(--accent)}
h1{font-weight:400;font-size:clamp(38px,6vw,84px);line-height:1.02;letter-spacing:-.015em;margin:18px auto 0;max-width:14ch}
.plate{background:#f8f4ec;padding:clamp(10px,1.4vw,18px);border-radius:22px;box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 30px 60px -30px rgba(60,45,20,.35)}
.viewer{height:min(76svh,860px);min-height:420px;border-radius:14px}
.col{max-width:700px;margin:0 auto;padding:clamp(56px,8vw,112px) 0 0}
.orn{display:block;width:26px;height:26px;margin:0 auto 34px;color:var(--accent)}
.txt{font-size:20px}
.facts{justify-content:center;text-align:center;margin-top:48px;font:14px/1.4 ${SANS};--fgap:20px 48px}.facts dd{font:400 24px/1.2 ${SERIF}}
h2{text-align:center;font-weight:400;font-size:30px;margin:0 0 28px}
.docs h3{font:italic 18px ${SERIF};opacity:.75}.docs .ext{color:var(--accent);opacity:1}
.foot{max-width:700px;margin:0 auto;padding:96px 0 48px;font-family:${SANS};justify-content:center;text-align:center}
`, "#efe9df")}
<body><a class="skip" href="#modell">${t.model}</a>
<header class="w"><div class="kick">${esc(d.author || t.project)}</div><h1>${esc(d.title)}</h1></header>
<main class="w"><div class="plate">${viewer(d)}</div>
<div class="col" id="projekt"><svg class="orn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M3 20 12 5l9 15z"/><path d="M8 20v-5h8v5"/></svg>${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}</div>
${h.docs ? `<section class="col" id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}
</main>${foot(d, t)}${script}</body></html>`;
}

// ——— 6. Kino — nothing but the model; information slides in on request ———
function cinema(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
html,body{height:100%;overflow:hidden}
body{font:15.5px/1.65 ${SANS};color:#f2f2f2;background:#000;--line:rgba(255,255,255,.12);--hover:rgba(255,255,255,.05)}
.viewer{position:fixed;inset:0;background:#000}
.bar{position:fixed;left:0;right:0;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px clamp(16px,2.6vw,32px);background:linear-gradient(180deg,rgba(0,0,0,.6),rgba(0,0,0,0));pointer-events:none}
.bar b{font-weight:600;letter-spacing:.01em;font-size:15px;text-shadow:0 1px 8px rgba(0,0,0,.5)}.bar b span{opacity:.6;font-weight:400;margin-left:10px}
.open{pointer-events:auto;font:600 13px/1 ${SANS};color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;background:rgba(20,20,20,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.14)}
.open:hover{background:var(--accent);border-color:var(--accent)}
.drawer{position:fixed;top:0;right:0;bottom:0;z-index:10;width:min(440px,100%);padding:72px clamp(22px,3vw,40px) 32px;overflow:auto;background:rgba(14,14,15,.9);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-left:1px solid var(--line);transform:translateX(102%);transition:transform .45s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;gap:36px}.drawer>*{flex-shrink:0}
.drawer:target{transform:none}
.x{position:absolute;top:18px;right:18px;color:#fff;text-decoration:none;font-size:13px;opacity:.7}.x:hover{opacity:1}
h1{font:600 30px/1.1 ${DISPLAY};letter-spacing:-.025em;margin:0}.by{opacity:.6;margin-top:8px}
.txt{color:#cfcfcf}
.facts{--fgap:16px 32px;font-size:14px}.facts dd{font-size:17px;font-weight:600}
h2{font:600 11px/1 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 8px}
.docs a{padding:12px 2px}.docs h3{font-weight:600;font-size:13px;opacity:.7}
.foot{margin-top:auto}
`, "#000000")}
<body><a class="skip" href="#modell">${t.model}</a>
${viewer(d, "viewer", true)}
<div class="bar"><b>${esc(d.title)}${d.author ? `<span>${esc(d.author)}</span>` : ""}</b><a class="open" href="#info">${h.docs && !h.info ? t.docs : t.info}</a></div>
<aside class="drawer" id="info"><a class="x" href="#modell">${t.close} ✕</a>
<div id="projekt"><h1>${esc(d.title)}</h1>${d.author ? `<div class="by">${esc(d.author)}</div>` : ""}</div>
${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}
${h.docs ? `<section id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}
${foot(d, t)}</aside>${script}</body></html>`;
}

// ——— 7. Monografie — centred, book-like, the model in a passe-partout ———
function monograph(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:17px/1.75 ${SERIF};color:#222;background:#fbfbfa;--line:#e6e4df}
header{text-align:center;padding:clamp(56px,8vw,120px) 24px clamp(40px,5vw,72px)}
.sc{font:500 11.5px/1 ${SANS};letter-spacing:.3em;text-transform:uppercase;color:#999}
h1{font-weight:400;font-style:italic;font-size:clamp(40px,6.4vw,92px);line-height:1;letter-spacing:-.02em;margin:22px 0 18px}
.by{font:14px/1 ${SANS};color:#777}.by::before,.by::after{content:"";display:inline-block;width:28px;height:1px;background:#bbb;vertical-align:middle;margin:0 14px}
.mat{max-width:1240px;margin:0 auto;padding:clamp(14px,3.4vw,52px);background:#efeeea}
.viewer{height:min(70svh,780px);min-height:400px;box-shadow:0 0 0 1px rgba(0,0,0,.06)}
.col{max-width:640px;margin:0 auto;padding:clamp(64px,9vw,128px) 24px 0}
.txt{text-align:justify;hyphens:auto;-webkit-hyphens:auto}.txt p+p{text-indent:1.6em;margin-top:-.4em}
.facts{margin-top:56px;justify-content:center;text-align:center;font:13px/1.4 ${SANS};--fgap:18px 44px}.facts dd{font:italic 22px/1.2 ${SERIF};color:#222}
h2{text-align:center;font:500 11.5px/1 ${SANS};letter-spacing:.3em;text-transform:uppercase;color:#999;margin:0 0 30px}
.docs h3{font:italic 17px ${SERIF};color:#666}
.foot{max-width:640px;margin:0 auto;padding:110px 24px 48px;font-family:${SANS};justify-content:center}
`, "#fbfbfa")}
<body><a class="skip" href="#modell">${t.model}</a>
<header><div class="sc">${t.project} · ${d.year}</div><h1>${esc(d.title)}</h1>${d.author ? `<div class="by">${esc(d.author)}</div>` : ""}</header>
<main><div class="mat">${viewer(d)}</div>
${h.info || d.facts.length ? `<div class="col" id="projekt">${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}</div>` : ""}
${h.docs ? `<section class="col" id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}</main>
${foot(d, t)}${script}</body></html>`;
}

// ——— 8. Plan — a drawing sheet: grid paper, hairlines, title block ———
function blueprint(d: SiteData) {
  const t = T[d.lang], h = has(d);
  const date = new Date(d.year, 0, 1).getFullYear();
  return `${head(d, `
body{font:14.5px/1.6 ${MONO};color:#dfe7f3;background:#0f2238;background-image:linear-gradient(rgba(150,190,240,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(150,190,240,.07) 1px,transparent 1px),linear-gradient(rgba(150,190,240,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(150,190,240,.035) 1px,transparent 1px);background-size:120px 120px,120px 120px,24px 24px,24px 24px;--line:rgba(200,220,245,.18);--hover:rgba(200,220,245,.05)}
.sheet{max-width:1400px;margin:clamp(14px,2.4vw,36px) auto;border:1px solid rgba(200,220,245,.55);outline:1px solid rgba(200,220,245,.2);outline-offset:6px}
.top{display:flex;justify-content:space-between;gap:16px;padding:12px 18px;border-bottom:1px solid rgba(200,220,245,.55);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.top nav{display:flex;gap:20px}.top a{text-decoration:none;opacity:.8}.top a:hover{opacity:1;color:var(--accent)}
.viewer{height:min(72svh,820px);min-height:400px;border-bottom:1px solid rgba(200,220,245,.55)}
.low{display:grid;grid-template-columns:1fr minmax(300px,420px)}
.notes{padding:28px;border-right:1px solid rgba(200,220,245,.55)}
.lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}
.txt{font:15.5px/1.7 ${SANS};color:#cdd8e8;max-width:62ch}
.tb{display:grid;grid-template-columns:auto 1fr;font-size:12.5px}
.tb div{padding:10px 14px;border-bottom:1px solid rgba(200,220,245,.3)}.tb div:nth-child(odd){color:rgba(223,231,243,.55);border-right:1px solid rgba(200,220,245,.3);text-transform:uppercase;letter-spacing:.08em;font-size:11px}
.tbw .big{font:600 22px/1.15 ${SANS};letter-spacing:-.01em;color:#fff;padding:16px 14px;border-bottom:1px solid rgba(200,220,245,.3)}
.reg{padding:28px;border-top:1px solid rgba(200,220,245,.55)}
.docs{grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:24px 48px}.docs h3{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}.docs .ext{color:var(--accent);opacity:1;border-radius:0}
.foot{padding:12px 18px;border-top:1px solid rgba(200,220,245,.55);font-size:11px;letter-spacing:.06em;opacity:.65}
@media (max-width:860px){.low{grid-template-columns:1fr}.notes{border-right:0;border-bottom:1px solid rgba(200,220,245,.55)}.top nav{display:none}}
`, "#0f2238")}
<body><a class="skip" href="#modell">${t.model}</a>
<div class="sheet"><div class="top"><span>${esc(d.title)}</span><nav>${nav(d, t)}</nav></div>
${viewer(d)}
<div class="low" id="projekt"><div class="notes">${h.info ? `<p class="lab">${t.project}</p><div class="txt">${paras(d.description)}</div>` : `<p class="lab">${t.model}</p><div class="txt">${t.hint}</div>`}</div>
<div class="tbw"><div class="big">${esc(d.title)}</div><div class="tb">${d.author ? `<div>${t.by}</div><div>${esc(d.author)}</div>` : ""}${d.facts.map((f) => `<div>${esc(f.label)}</div><div>${esc(f.value)}</div>`).join("")}<div>${t.date}</div><div>${date}</div><div>${t.sheet}</div><div>3D · 1/1</div></div></div></div>
${h.docs ? `<section class="reg" id="plaene"><p class="lab">${t.docs}</p>${docs(d)}</section>` : ""}
${foot(d, t)}</div>${script}</body></html>`;
}

// ——— 9. Studio — dark split: big model left, slim information column right ———
function studio(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:15px/1.65 ${SANS};color:#e8e8e6;background:#151517;--line:rgba(255,255,255,.09);--hover:rgba(255,255,255,.04)}
.split{display:grid;grid-template-columns:1fr minmax(320px,400px);height:100svh}
.viewer{height:100%;background:#0e0e10}
aside{overflow:auto;padding:clamp(28px,3vw,44px);display:flex;flex-direction:column;gap:36px;background:#1b1b1e;border-left:1px solid var(--line)}aside>*{flex-shrink:0}
.tag{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9a9a96}.tag i{width:18px;height:2px;background:var(--accent)}
h1{font:600 clamp(28px,2.4vw,38px)/1.1 ${DISPLAY};letter-spacing:-.025em;margin:14px 0 0;color:#fff}
.by{margin-top:10px;color:#9a9a96}
.txt{color:#b9b9b5}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}.facts div{background:#1b1b1e;padding:14px 16px}.facts dd{font-size:18px;font-weight:600;color:#fff}
h2{font:600 11px/1 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:#9a9a96;margin:0 0 6px}
.docs{gap:20px}.docs h3{font-size:12.5px;font-weight:600;color:#9a9a96}.docs a{padding:12px 4px}.docs .ext{color:var(--accent);opacity:1}
.foot{margin-top:auto;flex-direction:column;gap:4px}
@media (max-width:900px){.split{grid-template-columns:1fr;height:auto}.viewer{height:70svh}aside{border-left:0}}
`, "#151517")}
<body><a class="skip" href="#modell">${t.model}</a>
<div class="split">${viewer(d)}<aside><div id="projekt"><span class="tag"><i></i>${t.project}</span><h1>${esc(d.title)}</h1>${d.author ? `<div class="by">${esc(d.author)}</div>` : ""}</div>
${h.info ? `<div class="txt">${paras(d.description)}</div>` : ""}${facts(d)}
${h.docs ? `<section id="plaene"><h2>${t.docs}</h2>${docs(d)}</section>` : ""}
${foot(d, t)}</aside></div>${script}</body></html>`;
}

// ——— 10. Beton — raw concrete grey, heavy uppercase, thick rules ———
function beton(d: SiteData) {
  const t = T[d.lang], h = has(d);
  return `${head(d, `
body{font:16px/1.55 ${SANS};color:#161616;background:#d6d4cf;--line:#161616;--hover:rgba(0,0,0,.05)}
.w{padding:0 clamp(14px,2.4vw,32px)}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:6px solid #161616;font:700 12px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase}
header nav{display:flex;gap:22px}header a{text-decoration:none}header a:hover{color:var(--accent)}
h1{font:800 clamp(48px,11vw,200px)/.84 ${DISPLAY};letter-spacing:-.05em;text-transform:uppercase;margin:clamp(28px,4vw,56px) 0 clamp(20px,3vw,40px);overflow-wrap:anywhere}
.viewer{height:min(76svh,880px);min-height:420px;outline:6px solid #161616}
.blocks{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:0;margin-top:clamp(48px,6vw,88px);border-top:6px solid #161616}
.blk{padding:28px 28px 36px 0}.blk+.blk{padding-left:28px;border-left:2px solid #161616}
.no{font:800 13px/1 ${SANS};letter-spacing:.1em;margin-bottom:18px}.no b{color:var(--accent)}
.txt{font-size:19px;line-height:1.5;font-weight:500;max-width:44ch}
.facts{--fgap:18px 40px}.facts dt{opacity:1;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.1em}.facts dd{font:800 34px/1 ${DISPLAY};letter-spacing:-.04em}
.docs h3{font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.1em}.docs a{border-bottom:2px solid #161616}.docs .ext{border:2px solid #161616;border-radius:0;opacity:1;font-weight:800}
.foot{margin-top:clamp(48px,6vw,88px);padding:16px 0 28px;border-top:6px solid #161616;opacity:1;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
@media (max-width:860px){.blk+.blk{padding-left:0;border-left:0;border-top:2px solid #161616}header nav{display:none}}
`, "#d6d4cf")}
<body><a class="skip" href="#modell">${t.model}</a>
<div class="w"><header><span>${esc(d.author || "ARCHVISTA")}</span><nav>${nav(d, t)}</nav></header>
<h1>${esc(d.title)}</h1>${viewer(d)}
<div class="blocks" id="projekt">${h.info ? `<div class="blk"><div class="no"><b>01</b> ${t.project}</div><div class="txt">${paras(d.description)}</div></div>` : ""}<div class="blk"><div class="no"><b>${h.info ? "02" : "01"}</b> ${t.model}</div>${facts(d)}</div></div>
${h.docs ? `<div class="blocks" id="plaene"><div class="blk" style="grid-column:1/-1;padding-right:0"><div class="no"><b>${h.info ? "03" : "02"}</b> ${t.docs}</div>${docs(d)}</div></div>` : ""}
${foot(d, t)}</div>${script}</body></html>`;
}

export const RENDERERS: Record<TemplateId, (d: SiteData) => string> = {
  minimal, "dark-luxury": darkLuxury, swiss, portfolio, nature, cinema, monograph, blueprint, studio, beton,
};

export function renderTemplate(id: TemplateId, d: SiteData): string {
  return (RENDERERS[id] ?? minimal)(d).replace("ACCENT", d.accent);
}
