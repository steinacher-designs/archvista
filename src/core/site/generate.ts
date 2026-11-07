// ARCHVISTA — static website generator. Produces a complete, self-contained site as a file map.

import type { Project } from "../project";
import type { PreparedScene } from "../scene";
import type { PublicConfig } from "../export/public-scene";
import { renderTemplate, SiteData, esc } from "./templates";

export type FileMap = Map<string, Uint8Array>;
export type AssetReader = (path: string) => Promise<Uint8Array | null>;

export interface SiteInput {
  project: Project;
  scene: PreparedScene;
  pub: { glb: Uint8Array; config: PublicConfig };
  /** Built website runtime (viewer.js). */
  runtime: Uint8Array;
  /** Reads files from the bundled asset library (paths relative to assets-lib/). */
  readAsset: AssetReader;
  /** Rendered stills (jpeg) keyed by viewpoint id, captured by the app. */
  renders?: { id: string; caption: string; data: Uint8Array }[];
}

const enc = new TextEncoder();

/** Asset-library files a site needs for its environment, lighting and materials. */
export function requiredAssets(config: PublicConfig, manifest: { textures: Record<string, unknown>; hdri: Record<string, unknown>; models: Record<string, unknown> }): string[] {
  const out = new Set<string>(["manifest.json", "LICENSES.json"]);
  const tex = (k: string) => { if (manifest.textures[k]) for (const s of ["col", "nor", "arm"]) out.add(`tex/${k}_${s}.webp`); };
  for (const id of Object.keys(config.materials)) tex(id);
  const env = config.hasTerrain ? "studio" : config.environment;
  // photographic surroundings: one panorama + its HDR replace modelled terrain, plants and sky
  if (env !== "studio" && manifest.hdri[`env_${env}`]) {
    out.add(`hdri/env_${env}.hdr`); out.add(`hdri/env_${env}_bg.webp`);
    tex(env === "urban" ? "env_paving" : env === "coastal" ? "env_sand" : "grass"); // sharp ground around the building
    return [...out];
  }
  const ground: Record<string, string[]> = { forest: ["grass"], coastal: ["env_sand", "grass"], urban: ["env_asphalt", "env_paving", "grass"], studio: [] };
  ground[env].forEach(tex);
  const hdri = env === "studio" ? "studio" : config.lighting ?? "afternoon";
  if (manifest.hdri[hdri]) out.add(`hdri/${hdri}.hdr`);
  const models: Record<string, string[]> = {
    forest: ["tree_a", "tree_b", "shrub_a", "shrub_b", "grass_a", "rocks"],
    coastal: ["tree_a", "shrub_a", "grass_a", "rocks"],
    urban: ["tree_a", "shrub_a"],
    studio: [],
  };
  for (const m of models[env]) if (manifest.models[m]) out.add(`models/${m}.glb`);
  return [...out];
}

export function siteData(input: SiteInput): SiteData {
  const { project: p, scene: s, pub } = input;
  const a = s.analysis;
  const L = p.language;
  const fmt = (n: number, d = 1) => n.toLocaleString(L === "de" ? "de-AT" : "en-GB", { maximumFractionDigits: d });
  const size = [s.bbox.max[0] - s.bbox.min[0], s.bbox.max[2] - s.bbox.min[2], s.bbox.max[1] - s.bbox.min[1]];
  // visible (not hidden) rooms only — hidden areas must not leak through statistics
  const greyZones = p.zones.filter((z) => z.kind === "grey");
  const visibleRooms = a.rooms.filter((r) => r.covered && !greyZones.some((z) => z.roomId === r.id && z.level === r.level));
  const area = visibleRooms.reduce((n, r) => n + r.area, 0);
  const facts: SiteData["facts"] = [];
  if (pub.config.levels.length) facts.push({ label: L === "de" ? "Geschosse" : "Storeys", value: String(pub.config.levels.length) });
  if (area > 0) facts.push({ label: L === "de" ? "Raumfläche ca." : "Room area approx.", value: `${fmt(Math.round(area))} m²` });
  facts.push({ label: L === "de" ? "Abmessungen" : "Dimensions", value: `${fmt(size[0])} × ${fmt(size[1])} m` });
  facts.push({ label: L === "de" ? "Höhe" : "Height", value: `${fmt(size[2])} m` });
  const renders = input.renders ?? [];
  // title image: the user's own first image if there is one, otherwise the rendered main view
  const gallery = [
    ...p.images.slice(0, 1).map((im) => ({ src: `images/user-1${extOf(im.dataUrl)}`, caption: im.caption ?? "" })),
    ...renders.slice(0, 1).map((r) => ({ src: `images/${r.id}.jpg`, caption: r.caption })),
  ];
  return {
    lang: L,
    title: p.title || "Projekt",
    description: p.description,
    author: p.author,
    accent: p.accent,
    year: new Date(p.updatedAt).getFullYear(),
    facts,
    highlights: pub.config.hotspots.map((h, i) => ({ n: i + 1, title: h.title, text: h.text, image: h.image, facts: [...(h.facts ?? []), ...(h.materialSpec ? [h.materialSpec] : [])] })),
    gallery: [],
    hero: gallery[0]?.src ?? null,
    levels: pub.config.levels.map((l) => (L === "de" ? l.name.de : l.name.en)),
    hasTour: pub.config.tour && pub.config.viewpoints.length > 1,
  };
}

export async function generateSite(input: SiteInput): Promise<FileMap> {
  const files: FileMap = new Map();
  const { project: p } = input;
  // info-point images: data URLs become files, the public config references the file
  const hsImages: [string, Uint8Array][] = [];
  const cfg: PublicConfig = { ...input.pub.config, hotspots: input.pub.config.hotspots.map((h, i) => {
    if (!h.image?.startsWith("data:")) return h;
    const b = dataUrlBytes(h.image);
    if (!b) return { ...h, image: undefined };
    const name = `images/hotspot-${i + 1}${extOf(h.image)}`;
    hsImages.push([name, b]);
    return { ...h, image: name };
  }) };
  const pub = { ...input.pub, config: cfg };
  input = { ...input, pub };
  const data = siteData(input);
  // deterministic build id: changes whenever the scene or the page settings change
  data.buildId = (await gitBlobSha(enc.encode(JSON.stringify(pub.config) + JSON.stringify(data)))).slice(0, 12);
  files.set("index.html", enc.encode(renderTemplate(p.template, data)));
  files.set("assets/scene.glb", pub.glb);
  files.set("assets/scene.json", enc.encode(JSON.stringify(pub.config)));
  files.set("assets/viewer.js", input.runtime);
  files.set("assets/favicon.svg", enc.encode(favicon(p.accent)));
  files.set(".nojekyll", new Uint8Array());
  // asset library subset
  const manifestBytes = await input.readAsset("manifest.json");
  const manifest = manifestBytes ? JSON.parse(new TextDecoder().decode(manifestBytes)) : { textures: {}, hdri: {}, models: {} };
  const licences = JSON.parse(new TextDecoder().decode((await input.readAsset("LICENSES.json")) ?? enc.encode("{}")));
  const used: Record<string, { name: string; authors: string[]; url: string; licence: string }> = {};
  const shipped = new Set<string>();
  for (const rel of requiredAssets(pub.config, manifest)) {
    if (rel === "manifest.json") continue;
    const b = await input.readAsset(rel);
    if (!b) continue;
    files.set(`assets/lib/${rel}`, b);
    shipped.add(rel);
  }
  // the site's manifest lists only what it ships, so the viewer never asks for missing files
  const has = (dir: string, key: string, suffix: string) => shipped.has(`${dir}/${key}${suffix}`);
  const trimmed = {
    textures: Object.fromEntries(Object.entries(manifest.textures).filter(([k]) => has("tex", k, "_col.webp"))),
    hdri: Object.fromEntries(Object.entries(manifest.hdri).filter(([k]) => has("hdri", k, ".hdr"))),
    models: Object.fromEntries(Object.entries(manifest.models).filter(([k]) => has("models", k, ".glb"))),
  };
  files.set("assets/lib/manifest.json", enc.encode(JSON.stringify(trimmed)));
  for (const [k, v] of Object.entries(licences) as [string, { name: string; authors: string[]; url: string; licence: string }][]) {
    const kk = k.replace(/^(hdri_|model_)/, "");
    const inSite = [...files.keys()].some((f) => f.includes(`/${kk}.`) || f.includes(`/${kk}_`));
    if (inSite) used[k] = v;
  }
  // images
  if (!p.images.length) for (const r of (input.renders ?? []).slice(0, 1)) files.set(`images/${r.id}.jpg`, r.data);
  for (const [k, v] of hsImages) files.set(k, v);
  p.images.slice(0, 1).forEach((im) => { const b = dataUrlBytes(im.dataUrl); if (b) files.set(`images/user-1${extOf(im.dataUrl)}`, b); });
  files.set("credits.html", enc.encode(credits(p, used)));
  return files;
}

function credits(p: Project, used: Record<string, { name: string; authors: string[]; url: string; licence: string }>) {
  const de = p.language === "de";
  const rows = Object.values(used).map((v) => `<li><a href="${esc(v.url)}">${esc(v.name)}</a> — ${esc(v.authors.join(", "))} · ${esc(v.licence)}</li>`).join("");
  return `<!doctype html><html lang="${p.language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${de ? "Bildnachweise" : "Credits"} – ${esc(p.title)}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:60px auto;padding:0 24px;color:#222}a{color:${esc(p.accent)}}</style>
<h1>${de ? "Bildnachweise & Lizenzen" : "Credits & licences"}</h1>
<p>${de ? "Das 3D-Modell stammt aus den Planunterlagen des Projekts" : "The 3D model comes from the project's drawings"}${p.author ? ` (${esc(p.author)})` : ""}.
${de ? "Umgebung, Himmel und Materialoberflächen verwenden freie Inhalte (CC0) von Poly Haven und ambientCG:" : "Surroundings, sky and material surfaces use free (CC0) content from Poly Haven and ambientCG:"}</p>
<ul>${rows}</ul>
<p>${de ? "3D-Darstellung: three.js (MIT-Lizenz). Erstellt mit ARCHVISTA." : "3D rendering: three.js (MIT licence). Made with ARCHVISTA."}</p>
<p><a href="index.html">← ${de ? "Zurück" : "Back"}</a></p></html>`;
}

function favicon(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${esc(accent)}"/><path d="M14 46 32 16l18 30z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>`;
}

function extOf(dataUrl: string) {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp)/);
  return m ? "." + (m[1] === "jpeg" ? "jpg" : m[1]) : ".jpg";
}
function dataUrlBytes(dataUrl: string): Uint8Array | null {
  const i = dataUrl.indexOf(",");
  if (i < 0) return null;
  const bin = atob(dataUrl.slice(i + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

/** git blob SHA-1 of file content — lets the publisher skip unchanged files. */
export async function gitBlobSha(data: Uint8Array): Promise<string> {
  const header = enc.encode(`blob ${data.length}\0`);
  const buf = new Uint8Array(header.length + data.length);
  buf.set(header); buf.set(data, header.length);
  const h = await crypto.subtle.digest("SHA-1", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
