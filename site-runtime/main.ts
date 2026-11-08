// ARCHVISTA website runtime: mounts the 3D viewer into every element with [data-archvista].
import { ArchViewer } from "../src/viewer/viewer";
import { t } from "../src/viewer/hud";
import type { PublicConfig } from "../src/core/export/public-scene";

async function fetchWithProgress(url: string, onProgress: (f: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    onProgress(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

function webgl2(): boolean {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export async function mount(el: HTMLElement) {
  const base = el.dataset.base ?? "assets/";
  const cfg: PublicConfig = await (await fetch(base + "scene.json")).json();
  const lang = (el.dataset.lang as "de" | "en") ?? cfg.language ?? "de";
  const loading = document.createElement("div");
  loading.className = "av-loading";
  loading.innerHTML = `<div>${t(lang, "loading")}</div><div class="av-track"><div class="av-fill"></div></div>`;
  el.appendChild(loading);
  if (!webgl2()) { loading.innerHTML = `<div>${t(lang, "webgl")}</div>`; return; }
  const viewer = new ArchViewer(el, { language: lang, cinematic: el.dataset.cinematic === "1", vr: true, assetBase: el.dataset.lib ?? base + "lib/", imageBase: base + "tex-user/", envBase: base + "env-user/" });
  const glb = await fetchWithProgress(base + "scene.glb", (f) => { (loading.querySelector(".av-fill") as HTMLElement).style.width = `${Math.round(f * 100)}%`; });
  if (location.search.includes("still")) viewer.paused = true;
  await viewer.loadGlb(glb, cfg);
  loading.style.opacity = "0";
  setTimeout(() => loading.remove(), 700);
  (window as unknown as { archvista?: ArchViewer }).archvista = viewer;
  // deep links from the page: [data-av-go="walk|tour|level:1|vp:ext0"]
  document.querySelectorAll<HTMLElement>("[data-av-go]").forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    const [k, v] = (b.dataset.avGo ?? "").split(":");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (k === "walk") viewer.startWalk(true);
    else if (k === "tour") viewer.startTour();
    else if (k === "vr") void viewer.enterVR();
    else if (k === "level") viewer.goToLevel(+v);
    else if (k === "vp") { const vp = cfg.viewpoints.find((x) => x.id === v); if (vp) viewer.goTo(vp); }
  }));
  return viewer;
}

document.querySelectorAll<HTMLElement>("[data-archvista]").forEach((el) => { mount(el).catch((err) => {
  console.error(err);
  el.innerHTML = `<div class="av-loading"><div>3D-Modell konnte nicht geladen werden / Could not load the 3D model.</div><small style="opacity:.6">${String(err.message ?? err)}</small></div>`;
}); });
