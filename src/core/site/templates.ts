// ARCHVISTA — six website designs. Rule-based, local, no AI service. All paths are relative
// so the site works from a file folder, any web server and any GitHub Pages sub path.

import type { TemplateId } from "../project";

export interface SiteData {
  lang: "de" | "en";
  title: string;
  description: string;
  author: string;
  accent: string;
  year: number;
  facts: { label: string; value: string }[];
  highlights: { n: number; title: string; text: string; facts: string[]; image?: string }[];
  gallery: { src: string; caption: string }[];
  hero: string | null; // image path
  levels: string[];
  hasTour: boolean;
  buildId?: string;
}

const T = {
  de: { experience: "Erleben", project: "Projekt", gallery: "Galerie", highlights: "Highlights", walk: "Begehen", tour: "Rundgang starten",
    explore: "Gebäude in 3D erkunden", about: "Über das Projekt", by: "Entwurf", made: "Erstellt mit ARCHVISTA", credits: "Bildnachweise & Lizenzen",
    noDesc: "", scroll: "Scrollen", enter: "Eintreten", facts: "Kennzahlen", measured: "aus dem 3D-Modell gemessen", fullscreen: "Vollbild" },
  en: { experience: "Experience", project: "Project", gallery: "Gallery", highlights: "Highlights", walk: "Walk through", tour: "Start tour",
    explore: "Explore the building in 3D", about: "About the project", by: "Design", made: "Made with ARCHVISTA", credits: "Credits & licences",
    noDesc: "", scroll: "Scroll", enter: "Enter", facts: "Key figures", measured: "measured from the 3D model", fullscreen: "Full screen" },
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
const paras = (s: string) => s.split(/\n{2,}/).filter((p) => p.trim()).map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");

function head(d: SiteData, css: string, extra = "") {
  return `<!doctype html>
<html lang="${d.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description.slice(0, 160) || d.title)}">
<meta property="og:title" content="${esc(d.title)}">
${d.hero ? `<meta property="og:image" content="${esc(d.hero)}">` : ""}
<meta name="generator" content="ARCHVISTA">
${d.buildId ? `<meta name="archvista-build" content="${esc(d.buildId)}">` : ""}
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="modulepreload" href="assets/viewer.js">
<style>${BASE_CSS}${css}</style>
${extra}
</head>`;
}

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{margin:0;--accent:ACCENT}
img{max-width:100%;display:block}a{color:inherit}
.viewer{position:relative;width:100%;height:min(82vh,860px);min-height:420px;border-radius:var(--radius,0);overflow:hidden;background:#111}
.viewer [data-archvista]{position:absolute;inset:0}
.gal{display:grid;gap:var(--gap,16px)}
.gal figure{margin:0}.gal figcaption{font-size:.85em;opacity:.7;margin-top:.5em}
.hl-n{display:inline-flex;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:none}
.facts small{display:block;opacity:.6}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;z-index:9;background:#fff;color:#000;padding:8px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

function viewerBlock(d: SiteData, opts: { cinematic?: boolean } = {}) {
  return `<div class="viewer" data-av-fullscreen><div data-archvista data-base="assets/" data-lang="${d.lang}"${opts.cinematic ? ' data-cinematic="1"' : ""}></div></div>`;
}
function scripts() {
  return `<script type="module" src="assets/viewer.js"></script>`;
}
function factList(d: SiteData, cls = "facts") {
  if (!d.facts.length) return "";
  return `<dl class="${cls}">${d.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>`;
}
function highlights(d: SiteData, cls = "hls") {
  if (!d.highlights.length) return "";
  return `<ol class="${cls}">${d.highlights.map((h) => `<li><span class="hl-n">${h.n}</span><div><h3>${esc(h.title)}</h3>${h.text ? paras(h.text) : ""}${h.facts.length ? `<p class="hl-f">${h.facts.map(esc).join(" · ")}</p>` : ""}</div></li>`).join("")}</ol>`;
}
function gallery(d: SiteData, cls = "gal") {
  if (!d.gallery.length) return "";
  return `<div class="${cls}">${d.gallery.map((g) => `<figure><img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy" decoding="async">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
}
function footer(d: SiteData, t: (typeof T)["de"]) {
  return `<footer class="foot"><span>© ${d.year}${d.author ? " " + esc(d.author) : ""}</span><span><a href="credits.html">${t.credits}</a> · ${t.made}</span></footer>`;
}
const actions = (d: SiteData, t: (typeof T)["de"], cls = "btn") =>
  `<a href="#erleben" class="${cls}" data-av-go="walk">${t.walk}</a>${d.hasTour ? `<a href="#erleben" class="${cls} ghost" data-av-go="tour">${t.tour}</a>` : ""}`;

// ——— 1. Minimal Architecture ———
function minimal(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:17px/1.65 "Inter","Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif;color:#151515;background:#fff;--radius:4px}
.wrap{max-width:1240px;margin:0 auto;padding:0 28px}
nav{display:flex;justify-content:space-between;align-items:center;height:72px;border-bottom:1px solid #eee;position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);z-index:5}
nav b{font-weight:600;letter-spacing:.02em}nav a{text-decoration:none;margin-left:28px;font-size:14px;color:#555}
.hero{padding:96px 0 56px}.hero h1{font-size:clamp(40px,7vw,96px);line-height:1;font-weight:600;letter-spacing:-.03em;margin:0 0 24px;max-width:12ch}
.hero p{font-size:20px;color:#555;max-width:56ch;margin:0}
.heroimg{margin:48px 0 0;aspect-ratio:16/8;object-fit:cover;width:100%;border-radius:4px}
section{padding:96px 0;border-top:1px solid #eee}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#888;font-weight:500;margin:0 0 32px}
.btn{display:inline-block;padding:14px 22px;background:#151515;color:#fff;text-decoration:none;border-radius:2px;margin-right:10px;font-size:15px}.btn.ghost{background:none;color:#151515;border:1px solid #151515}
.cta{margin:28px 0 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:32px;margin:0}.facts dt{font-size:13px;color:#888}.facts dd{margin:4px 0 0;font-size:30px;font-weight:500}
.two{display:grid;grid-template-columns:1fr 1.4fr;gap:64px}.two .txt{font-size:19px}
.hls{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px}.hls li{display:flex;gap:16px}.hls h3{margin:2px 0 8px;font-size:19px;font-weight:600}.hl-f{color:#888;font-size:14px}
.gal{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.gal img{aspect-ratio:3/2;object-fit:cover;border-radius:4px}
.foot{display:flex;justify-content:space-between;padding:40px 28px;color:#888;font-size:13px;max-width:1240px;margin:0 auto;border-top:1px solid #eee;flex-wrap:wrap;gap:8px}
@media (max-width:760px){.two{grid-template-columns:1fr;gap:24px}nav a{display:none}section{padding:64px 0}}
`)}
<body><a class="skip" href="#erleben">3D</a>
<nav class="wrap"><b>${esc(d.title)}</b><span><a href="#erleben">${t.experience}</a><a href="#projekt">${t.project}</a>${d.gallery.length ? `<a href="#galerie">${t.gallery}</a>` : ""}</span></nav>
<header class="wrap hero"><h1>${esc(d.title)}</h1>${d.description ? `<p>${esc(firstSentence(d.description))}</p>` : ""}<div class="cta">${actions(d, t)}</div>
${d.hero ? `<img class="heroimg" src="${esc(d.hero)}" alt="${esc(d.title)}">` : ""}</header>
<section id="erleben" class="wrap"><h2>${t.explore}</h2>${viewerBlock(d)}</section>
<section id="projekt" class="wrap"><h2>${t.about}</h2><div class="two"><div>${factList(d)}<p style="color:#999;font-size:13px;margin-top:24px">${t.measured}</p></div><div class="txt">${paras(d.description)}${d.author ? `<p><small style="color:#888">${t.by}</small><br>${esc(d.author)}</p>` : ""}</div></div></section>
${d.highlights.length ? `<section class="wrap"><h2>${t.highlights}</h2>${highlights(d)}</section>` : ""}
${d.gallery.length ? `<section id="galerie" class="wrap"><h2>${t.gallery}</h2>${gallery(d)}</section>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}

// ——— 2. Dark Luxury ———
function darkLuxury(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:17px/1.75 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:#e9e4da;background:#0b0b0c}
.sans{font-family:"Inter","Segoe UI",system-ui,sans-serif}
.hero{position:relative;height:100vh;min-height:560px;display:flex;align-items:flex-end;overflow:hidden}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.04);filter:brightness(.62)}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,12,.2) 0,rgba(11,11,12,.0) 40%,#0b0b0c 100%)}
.hero .in{position:relative;z-index:1;padding:0 6vw 12vh;max-width:1100px}
.kick{font:500 12px/1 "Inter","Segoe UI",system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:var(--accent)}
h1{font-weight:400;font-size:clamp(44px,8vw,120px);line-height:.98;margin:18px 0 28px;letter-spacing:-.01em}
.btn{font:500 13px/1 "Inter","Segoe UI",system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;display:inline-block;padding:18px 28px;border:1px solid var(--accent);color:#0b0b0c;background:var(--accent);text-decoration:none;margin:0 12px 12px 0}
.btn.ghost{background:transparent;color:var(--accent)}
section{padding:120px 6vw;max-width:1400px;margin:0 auto}
h2{font-weight:400;font-size:clamp(30px,4vw,54px);margin:0 0 48px;line-height:1.1}
.line{width:64px;height:1px;background:var(--accent);margin:0 0 28px}
.viewer{height:min(86vh,900px);border:1px solid #2a2722}
.facts{display:flex;flex-wrap:wrap;gap:64px;margin:0 0 56px}.facts dt{font:500 11px/1 "Inter",system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#8d8576}.facts dd{margin:12px 0 0;font-size:40px;color:var(--accent)}
.txt{max-width:62ch;font-size:20px;color:#cfc8ba}
.hls{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1px;background:#2a2722;border:1px solid #2a2722}.hls li{background:#0b0b0c;padding:36px;display:flex;gap:18px}.hls h3{font-weight:400;font-size:24px;margin:0 0 10px}.hl-n{background:transparent;border:1px solid var(--accent);color:var(--accent)}.hl-f{color:#8d8576;font-size:14px}
.gal{grid-template-columns:repeat(12,1fr);--gap:20px}.gal figure{grid-column:span 6}.gal figure:nth-child(3n+1){grid-column:span 12}.gal img{width:100%;aspect-ratio:16/9;object-fit:cover}
.foot{display:flex;justify-content:space-between;padding:48px 6vw;color:#6d675c;font:13px "Inter",system-ui,sans-serif;border-top:1px solid #1d1b18;flex-wrap:wrap;gap:8px}.foot a{color:#a69b84}
@media (max-width:760px){.gal figure{grid-column:span 12!important}section{padding:80px 6vw}}
`)}
<body>
<header class="hero">${d.hero ? `<img src="${esc(d.hero)}" alt="">` : ""}<div class="in"><div class="kick">${d.author ? esc(d.author) : t.project}</div><h1>${esc(d.title)}</h1>${actions(d, t)}</div></header>
<section id="erleben"><div class="line"></div><h2>${t.explore}</h2>${viewerBlock(d)}</section>
<section id="projekt"><div class="line"></div><h2>${t.about}</h2>${factList(d)}<div class="txt">${paras(d.description)}</div></section>
${d.highlights.length ? `<section><div class="line"></div><h2>${t.highlights}</h2>${highlights(d)}</section>` : ""}
${d.gallery.length ? `<section id="galerie"><div class="line"></div><h2>${t.gallery}</h2>${gallery(d)}</section>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}

// ——— 3. Swiss Editorial ———
function swiss(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:16px/1.5 "Helvetica Neue",Helvetica,"Arial Nova",Arial,sans-serif;color:#000;background:#f4f3ef}
.g{display:grid;grid-template-columns:repeat(12,1fr);column-gap:20px;padding:0 20px}
header.top{border-bottom:2px solid #000;padding:16px 20px;display:flex;justify-content:space-between;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:.02em}
header.top a{text-decoration:none;margin-left:20px}
.hero{padding:40px 0 20px}.hero h1{grid-column:1/-1;font-size:clamp(56px,13vw,220px);line-height:.86;letter-spacing:-.045em;font-weight:700;margin:0}
.hero .meta{grid-column:1/5;margin-top:28px;font-size:15px}.hero .lead{grid-column:6/12;margin-top:28px;font-size:22px;line-height:1.3;font-weight:500}
.hero img{grid-column:1/-1;margin-top:40px;width:100%;aspect-ratio:21/9;object-fit:cover}
.sec{border-top:2px solid #000;padding:20px 0 80px}.num{grid-column:1/3;font-weight:700;font-size:14px}.num span{color:var(--accent)}
.sec h2{grid-column:3/-1;font-size:clamp(28px,4vw,56px);line-height:1;letter-spacing:-.02em;margin:0 0 32px;font-weight:700}
.body{grid-column:3/-1}
.btn{display:inline-block;background:var(--accent);color:#fff;font-weight:700;text-transform:uppercase;font-size:14px;padding:14px 18px;text-decoration:none;margin:0 8px 8px 0}.btn.ghost{background:#000}
.facts{grid-column:3/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-top:1px solid #000;margin:0 0 32px}.facts div{border-right:1px solid #000;padding:10px 12px 18px 0}.facts dt{font-size:12px;text-transform:uppercase;font-weight:700}.facts dd{margin:20px 0 0;font-size:44px;font-weight:700;letter-spacing:-.03em}
.cols{columns:2 320px;column-gap:20px;font-size:18px}
.hls{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0;border-top:1px solid #000}.hls li{border-bottom:1px solid #000;padding:16px 16px 24px 0;display:flex;gap:14px}.hls h3{margin:0 0 6px;font-size:20px}.hl-n{border-radius:0;background:#000}.hl-f{font-size:13px}
.gal{grid-template-columns:repeat(3,1fr);--gap:20px}.gal img{aspect-ratio:4/5;object-fit:cover;filter:grayscale(.1)}
.viewer{height:min(80vh,820px)}
.foot{display:flex;justify-content:space-between;border-top:2px solid #000;padding:16px 20px 40px;font-size:13px;font-weight:700;text-transform:uppercase;flex-wrap:wrap;gap:8px}
@media (max-width:760px){.g>*{grid-column:1/-1!important}.gal{grid-template-columns:1fr}}
`)}
<body>
<header class="top"><span>${esc(d.title)}</span><span><a href="#erleben">${t.experience}</a><a href="#projekt">${t.project}</a></span></header>
<div class="g hero"><h1>${esc(d.title)}</h1><div class="meta">${d.author ? `${t.by}<br><b>${esc(d.author)}</b><br>` : ""}${d.year}</div><div class="lead">${esc(firstSentence(d.description))}<div style="margin-top:20px">${actions(d, t)}</div></div>${d.hero ? `<img src="${esc(d.hero)}" alt="${esc(d.title)}">` : ""}</div>
<div id="erleben" class="g sec"><div class="num"><span>01</span></div><h2>${t.explore}</h2><div class="body">${viewerBlock(d)}</div></div>
<div id="projekt" class="g sec"><div class="num"><span>02</span></div><h2>${t.about}</h2>${factList(d)}<div class="body cols">${paras(d.description)}</div></div>
${d.highlights.length ? `<div class="g sec"><div class="num"><span>03</span></div><h2>${t.highlights}</h2><div class="body">${highlights(d)}</div></div>` : ""}
${d.gallery.length ? `<div id="galerie" class="g sec"><div class="num"><span>04</span></div><h2>${t.gallery}</h2><div class="body">${gallery(d)}</div></div>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}

// ——— 4. Creative Portfolio ———
function portfolio(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:17px/1.6 "Inter","Segoe UI",system-ui,sans-serif;color:#17151f;background:#f6f4ff;--radius:28px}
.wrap{max-width:1280px;margin:0 auto;padding:0 24px}
nav{display:flex;justify-content:space-between;align-items:center;padding:22px 24px;max-width:1280px;margin:0 auto}
nav b{font-size:18px}nav .pill{background:#17151f;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none;font-size:14px}
.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;align-items:stretch;margin-top:12px}
.card{background:#fff;border-radius:28px;padding:44px;box-shadow:0 1px 0 rgba(0,0,0,.04)}
.hero .card.c1{background:var(--accent);color:#fff;display:flex;flex-direction:column;justify-content:space-between;min-height:520px}
.hero h1{font-size:clamp(44px,6.4vw,92px);line-height:.95;margin:0;letter-spacing:-.035em;font-weight:800}
.hero .imgc{padding:0;overflow:hidden}.hero .imgc img{width:100%;height:100%;object-fit:cover}
.tag{display:inline-block;background:rgba(255,255,255,.18);padding:6px 12px;border-radius:99px;font-size:13px;margin-bottom:18px}
.btn{display:inline-block;padding:15px 24px;border-radius:99px;background:#fff;color:#17151f;text-decoration:none;font-weight:600;margin:8px 8px 0 0}.btn.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)}
section{margin:24px auto}
h2{font-size:clamp(32px,4vw,52px);letter-spacing:-.03em;margin:0 0 24px;font-weight:800}
.viewer{border-radius:28px;height:min(80vh,820px)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0}.facts div{background:#f6f4ff;border-radius:18px;padding:18px}.facts dt{font-size:13px;color:#6b6780}.facts dd{margin:6px 0 0;font-size:32px;font-weight:800;color:var(--accent)}
.hls{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.hls li{background:#fff;border-radius:22px;padding:26px;display:flex;gap:14px;transition:transform .2s}.hls li:hover{transform:translateY(-4px) rotate(-.3deg)}.hls h3{margin:0 0 6px}.hl-f{color:#6b6780;font-size:14px}
.gal{grid-template-columns:repeat(auto-fit,minmax(300px,1fr));--gap:16px}.gal img{border-radius:22px;aspect-ratio:1;object-fit:cover}.gal figure:nth-child(2n) img{aspect-ratio:4/5}
.foot{display:flex;justify-content:space-between;max-width:1280px;margin:40px auto;padding:0 24px;color:#6b6780;font-size:14px;flex-wrap:wrap;gap:8px}
@media (max-width:860px){.hero,.grid2{grid-template-columns:1fr}.hero .card.c1{min-height:380px}.card{padding:28px}}
`)}
<body>
<nav><b>${esc(d.title)}</b><a class="pill" href="#erleben">${t.explore} →</a></nav>
<div class="wrap hero"><div class="card c1"><div><span class="tag">${d.author ? esc(d.author) : t.project} · ${d.year}</span><h1>${esc(d.title)}</h1></div><div>${actions(d, t)}</div></div><div class="card imgc">${d.hero ? `<img src="${esc(d.hero)}" alt="${esc(d.title)}">` : ""}</div></div>
<section id="erleben" class="wrap"><div class="card"><h2>${t.explore}</h2>${viewerBlock(d)}</div></section>
<section id="projekt" class="wrap grid2"><div class="card"><h2>${t.about}</h2>${paras(d.description)}</div><div class="card"><h2>${t.facts}</h2>${factList(d)}<p style="color:#6b6780;font-size:13px">${t.measured}</p></div></section>
${d.highlights.length ? `<section class="wrap"><h2 style="padding:0 8px">${t.highlights}</h2>${highlights(d)}</section>` : ""}
${d.gallery.length ? `<section id="galerie" class="wrap"><h2 style="padding:0 8px">${t.gallery}</h2>${gallery(d)}</section>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}

// ——— 5. Nature & Material ———
function nature(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:18px/1.7 "Iowan Old Style","Palatino Linotype",Georgia,serif;color:#2c2a24;background:#f1ece2;--radius:220px 220px 18px 18px}
.sans{font-family:"Inter","Segoe UI",system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}
nav{display:flex;justify-content:center;gap:36px;padding:28px;font:500 13px "Inter",system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}nav a{text-decoration:none;color:#6c6650}
.hero{text-align:center;padding:40px 0 80px}
.hero .k{font:500 13px "Inter",system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}
.hero h1{font-weight:400;font-style:italic;font-size:clamp(46px,7vw,104px);line-height:1.02;margin:18px auto 28px;max-width:14ch}
.hero img{width:min(820px,100%);margin:48px auto 0;aspect-ratio:4/5;object-fit:cover;border-radius:420px 420px 24px 24px}
.btn{font:600 14px "Inter",system-ui,sans-serif;display:inline-block;padding:15px 26px;border-radius:99px;background:var(--accent);color:#fff;text-decoration:none;margin:6px}.btn.ghost{background:transparent;color:#2c2a24;box-shadow:inset 0 0 0 1px #2c2a24}
section{padding:90px 0}
h2{font-weight:400;font-style:italic;font-size:clamp(34px,4vw,56px);text-align:center;margin:0 0 44px}
.viewer{border-radius:24px;height:min(78vh,800px);box-shadow:0 30px 80px rgba(60,50,30,.25)}
.leaf{display:block;margin:0 auto 20px;width:34px;height:34px;color:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start}
.facts{margin:0;font-family:"Inter",system-ui,sans-serif}.facts div{display:flex;justify-content:space-between;border-bottom:1px solid #d4ccb9;padding:16px 0}.facts dt{color:#6c6650}.facts dd{margin:0;font-weight:600}
.hls{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px}.hls li{background:#faf7f0;border-radius:18px;padding:30px;display:flex;gap:16px}.hls h3{font-weight:400;font-size:24px;margin:0 0 8px}.hl-f{font:13px "Inter",system-ui,sans-serif;color:#8a836b}
.gal{grid-template-columns:repeat(auto-fit,minmax(300px,1fr));--gap:28px}.gal img{border-radius:18px;aspect-ratio:4/5;object-fit:cover}.gal figure:nth-child(odd){margin-top:48px}
.foot{display:flex;justify-content:space-between;padding:40px 28px;max-width:1180px;margin:0 auto;font:13px "Inter",system-ui,sans-serif;color:#8a836b;border-top:1px solid #d4ccb9;flex-wrap:wrap;gap:8px}
@media (max-width:820px){.two{grid-template-columns:1fr;gap:32px}.gal figure:nth-child(odd){margin-top:0}}
`)}
<body>
<nav><a href="#erleben">${t.experience}</a><a href="#projekt">${t.project}</a>${d.gallery.length ? `<a href="#galerie">${t.gallery}</a>` : ""}</nav>
<header class="wrap hero"><div class="k">${d.author ? esc(d.author) : t.project}</div><h1>${esc(d.title)}</h1>${actions(d, t)}${d.hero ? `<img src="${esc(d.hero)}" alt="${esc(d.title)}">` : ""}</header>
<section id="erleben" class="wrap">${LEAF}<h2>${t.explore}</h2>${viewerBlock(d)}</section>
<section id="projekt" class="wrap">${LEAF}<h2>${t.about}</h2><div class="two"><div>${paras(d.description)}</div><div>${factList(d)}<p style="font:13px Inter,system-ui,sans-serif;color:#8a836b">${t.measured}</p></div></div></section>
${d.highlights.length ? `<section class="wrap">${LEAF}<h2>${t.highlights}</h2>${highlights(d)}</section>` : ""}
${d.gallery.length ? `<section id="galerie" class="wrap">${LEAF}<h2>${t.gallery}</h2>${gallery(d)}</section>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}
const LEAF = `<svg class="leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15Z"/><path d="M5 19 14 10"/></svg>`;

// ——— 6. Immersive Cinema ———
function cinema(d: SiteData) {
  const t = T[d.lang];
  return `${head(d, `
body{font:16px/1.6 "Inter","Segoe UI",system-ui,sans-serif;color:#f2f2f2;background:#000}
.stage{position:relative;height:100vh;height:100svh}
.stage .viewer{position:absolute;inset:0;height:auto;min-height:0;border-radius:0}
.bars::before,.bars::after{content:"";position:absolute;left:0;right:0;height:6vh;background:#000;z-index:2;pointer-events:none}.bars::before{top:0}.bars::after{bottom:0}
.title{position:absolute;left:5vw;top:12vh;z-index:3;pointer-events:none;max-width:70vw}
.title h1{font-size:clamp(40px,8vw,128px);line-height:.9;letter-spacing:-.04em;margin:0;font-weight:800;text-shadow:0 10px 50px rgba(0,0,0,.6)}
.title .k{color:var(--accent);letter-spacing:.3em;text-transform:uppercase;font-size:12px;font-weight:600}
.title .cta{pointer-events:auto;margin-top:22px}
.btn{display:inline-block;padding:13px 20px;background:var(--accent);color:#000;font-weight:700;text-decoration:none;margin:0 10px 10px 0;border-radius:2px}.btn.ghost{background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(8px)}
.scroll{position:absolute;right:5vw;bottom:9vh;z-index:3;font-size:11px;letter-spacing:.3em;text-transform:uppercase;opacity:.7}
section{max-width:1200px;margin:0 auto;padding:120px 5vw}
h2{font-size:clamp(28px,4vw,60px);letter-spacing:-.03em;margin:0 0 40px;font-weight:800}
h2 em{color:var(--accent);font-style:normal}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;margin:0 0 48px}.facts dt{font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.6}.facts dd{margin:8px 0 0;font-size:46px;font-weight:800}
.txt{font-size:22px;max-width:60ch;color:#cfcfcf}
.hls{list-style:none;padding:0;margin:0;counter-reset:x}.hls li{display:flex;gap:20px;padding:28px 0;border-top:1px solid #222}.hls h3{margin:0 0 6px;font-size:24px}.hl-n{background:none;border:1px solid var(--accent);color:var(--accent)}.hl-f{opacity:.6;font-size:14px}
.gal{grid-template-columns:1fr;--gap:6px}.gal img{width:100%;aspect-ratio:2.39/1;object-fit:cover}.gal figcaption{padding:8px 0 20px}
.foot{display:flex;justify-content:space-between;padding:40px 5vw;color:#777;font-size:13px;border-top:1px solid #222;flex-wrap:wrap;gap:8px}
`)}
<body>
<div class="stage bars" id="erleben">${viewerBlock(d, { cinematic: true })}<div class="title"><div class="k">${d.author ? esc(d.author) : t.project}</div><h1>${esc(d.title)}</h1><div class="cta">${actions(d, t)}</div></div><div class="scroll">${t.scroll} ↓</div></div>
<section id="projekt"><h2>${t.about.split(" ").slice(0, -1).join(" ")} <em>${t.about.split(" ").slice(-1)[0]}</em></h2>${factList(d)}<div class="txt">${paras(d.description)}</div></section>
${d.highlights.length ? `<section><h2>${t.highlights}</h2>${highlights(d)}</section>` : ""}
${d.gallery.length ? `<section id="galerie"><h2>${t.gallery}</h2>${gallery(d)}</section>` : ""}
${footer(d, t)}${scripts()}</body></html>`;
}

function firstSentence(s: string) {
  const m = s.trim().match(/^.{0,220}?[.!?](\s|$)/);
  return m ? m[0].trim() : s.trim().slice(0, 220);
}

export const RENDERERS: Record<TemplateId, (d: SiteData) => string> = {
  minimal, "dark-luxury": darkLuxury, swiss, portfolio, nature, cinema,
};

export function renderTemplate(id: TemplateId, d: SiteData): string {
  return RENDERERS[id](d).replace("ACCENT", d.accent);
}
