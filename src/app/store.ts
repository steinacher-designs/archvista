// ARCHVISTA — application state: project document with undo/redo, processing, autosave.

import { create } from "zustand";
import type { ImportedModel } from "../core/dxf/import";
import type { PreparedScene } from "../core/scene";
import { autoDesign, newProject, sha256Hex, type Project } from "../core/project";
import { PRESET, textureKey, setCustomPresets, type MaterialPreset } from "../core/materials";
import { unzip, baseName, ZipError } from "../core/unzip";
import { saveTexture } from "./textures";
import { platform } from "./platform";
import type { WorkerIn, WorkerOut } from "./worker";
import { STRINGS, type Strings } from "./i18n";

export type Screen = "home" | "processing" | "work" | "failed";
export type Step = "customize" | "preview" | "publish";
export type Tab = "environment" | "light" | "design" | "areas" | "places" | "hotspots" | "materials" | "project" | "documents";

type ModelMeta = Omit<ImportedModel, "meshes">;

interface State {
  lang: "de" | "en";
  t: Strings;
  screen: Screen;
  step: Step;
  tab: Tab;
  autoMode: boolean;
  progress: { fraction: number; label: string };
  error: { message: string; detail?: string } | null;
  dxf: Uint8Array | null;
  fileName: string;
  model: ModelMeta | null;
  scene: PreparedScene | null;
  project: Project | null;
  past: Project[];
  future: Project[];
  saving: boolean;
  timings: Record<string, number>;
  startedAt: number;
  setLang(l: "de" | "en"): void;
  setStep(s: Step): void;
  setTab(t: Tab): void;
  setAutoMode(b: boolean): void;
  openFile(file: File): Promise<void>;
  openBytes(bytes: Uint8Array, fileName: string, existing?: Project, images?: { name: string; data: Uint8Array }[]): Promise<void>;
  reprocess(unitsToMeters: number): Promise<void>;
  /** Change the project. Discrete edits create an undo step; `coalesce` merges rapid edits (typing). */
  update(fn: (p: Project) => void, opts?: { coalesce?: string }): void;
  undo(): void;
  redo(): void;
  resetAuto(): void;
  goHome(): void;
  addTiming(k: string, ms: number): void;
}

let lastCoalesce: { key: string; at: number } | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function automatic(project: Project, scene: PreparedScene, model: ModelMeta): Project {
  const roof = scene.parts.filter((p) => p.category === "roof").map((p) => (project.materialOverrides[p.key] ?? p.auto.presetId).split("~")[0]);
  const footprint = (model.bbox.max[0] - model.bbox.min[0]) * (model.bbox.max[2] - model.bbox.min[2]);
  const d = autoDesign({
    terrain: scene.parts.some((p) => p.category === "terrain"),
    levels: scene.analysis.levels.length,
    footprint,
    roofClay: roof.includes("roof_clay"),
    height: model.bbox.max[1] - model.bbox.min[1],
  });
  return {
    ...project, ...d,
    lighting: "afternoon", quality: "auto", tour: true,
    zones: [], materialOverrides: {}, dismissedHotspots: [],
    hotspots: scene.hotspotSuggestions.map((h) => ({ ...h })),
    viewpoints: scene.viewpoints.map((v) => ({ ...v })),
  };
}

export const useStore = create<State>((set, get) => ({
  lang: (localStorage.getItem("av-lang") as "de" | "en") ?? "de",
  t: STRINGS[(localStorage.getItem("av-lang") as "de" | "en") ?? "de"],
  screen: "home",
  step: "customize",
  tab: "environment",
  autoMode: localStorage.getItem("av-auto") !== "0",
  progress: { fraction: 0, label: "" },
  error: null,
  dxf: null,
  fileName: "",
  model: null,
  scene: null,
  project: null,
  past: [],
  future: [],
  saving: false,
  timings: {},
  startedAt: 0,

  setLang(l) { localStorage.setItem("av-lang", l); set({ lang: l, t: STRINGS[l] }); },
  setStep(step) { set({ step }); },
  setTab(tab) { set({ tab }); },
  setAutoMode(b) { localStorage.setItem("av-auto", b ? "1" : "0"); set({ autoMode: b }); },

  async openFile(file) {
    const de = get().lang === "de";
    if (/\.zip$/i.test(file.name)) {
      // DXF + texture images in one ZIP
      try {
        const keep = (n: string) => !n.startsWith("__MACOSX/") && /\.(dxf|3ds|gltf|glb|bin|jpe?g|png|webp)$/i.test(n);
        const entries = await unzip(new Uint8Array(await file.arrayBuffer()), keep);
        const dxfs = entries.filter((e) => /\.(dxf|3ds|gltf|glb)$/i.test(e.name)).sort((a, b) => b.data.length - a.data.length);
        if (!dxfs.length) { set({ screen: "failed", error: { message: de ? "Im ZIP wurde keine .dxf-, .3ds- oder .gltf/.glb-Datei gefunden." : "No .dxf, .3ds or .gltf/.glb file found in the ZIP." } }); return; }
        const images = entries.filter((e) => !/\.(dxf|3ds|gltf|glb)$/i.test(e.name)).map((e) => ({ name: baseName(e.name), data: e.data }));
        await get().openBytes(dxfs[0].data, baseName(dxfs[0].name), undefined, images);
      } catch (err) {
        set({ screen: "failed", error: { message: err instanceof ZipError ? err.message : (de ? "Das ZIP konnte nicht gelesen werden." : "Could not read the ZIP.") } });
      }
      return;
    }
    if (!/\.(dxf|skp|3ds|glb|gltf)$/i.test(file.name)) {
      set({ screen: "failed", error: { message: de ? "Bitte eine .dxf-, .skp-, .3ds- oder .glb-Datei (oder ein ZIP mit Modell und Texturbildern) verwenden. DWG-Dateien bitte in AutoCAD mit _DXFOUT als DXF speichern." : "Please use a .dxf, .skp, .3ds or .glb file (or a ZIP with the model and texture images). Save DWG files as DXF in AutoCAD with _DXFOUT." } });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await get().openBytes(bytes, file.name);
  },

  async openBytes(bytes, fileName, existing, images) {
    set({ screen: "processing", error: null, progress: { fraction: 0.01, label: "" }, dxf: bytes, fileName, startedAt: performance.now(), timings: {} });
    const hash = existing?.fileHash ?? (await sha256Hex(bytes));
    const format = /\.skp$/i.test(fileName) ? "skp" as const : /\.3ds$/i.test(fileName) ? "3ds" as const : /\.(glb|gltf)$/i.test(fileName) ? "gltf" as const : "dxf" as const;
    // a .gltf reads its .bin and pictures from the same ZIP; those pictures then come back as the model's textures
    const files = format === "gltf" ? (images ?? []) : undefined;
    const res = await runWorker({ type: "process", dxf: bytes.slice().buffer, unitsToMeters: existing?.unitsToMeters, format, ...(files?.length ? { files } : {}) }, (f, label) => set({ progress: { fraction: f, label } }));
    if (res.type === "error") { set({ screen: "failed", error: { message: res.message, detail: res.detail } }); return; }
    if (res.type !== "done") return;
    if (!res.model.ok) { set({ screen: "failed", model: res.model, error: { message: res.model.warnings[0]?.message ?? get().t.noGeometry, detail: res.model.warnings[0]?.detail } }); return; }
    // materials with own texture images (ZIP import), kept with the project for later sessions
    let customs = existing?.customMaterials;
    // images: from a ZIP, or embedded in a SketchUp file (those are re-read from the .skp every time)
    const imgs = [...(format === "gltf" ? [] : images ?? []), ...(res.images ?? [])];
    const embedded = format === "skp" || format === "gltf"; // textures travel inside the model file
    // SketchUp files carry their textures: always re-read, so improvements to the import reach existing projects too
    // the user's own materials are never touched by a re-import
    const own = (existing?.customMaterials ?? []).filter((m) => m.group === "own");
    if (imgs.length && (images?.length || embedded || !existing?.customMaterials?.some((m) => m.group !== "own"))) customs = [...await cadTextures(existing?.id ?? newProject(fileName, hash).id, res.model, imgs), ...own];
    applyCadTextures(res.scene, customs);
    if (!embedded) noteMissingTextures(res.model, customs, !!images?.length, get().lang);
    let project = existing ?? automatic({ ...newProject(fileName, hash), ...(customs?.length ? { customMaterials: customs } : {}) }, res.scene, res.model);
    project = { ...project, language: project.language ?? get().lang, ...(existing && embedded ? { customMaterials: customs } : {}) };
    set({ model: res.model, scene: res.scene, project, past: [], future: [], screen: "work", step: "customize", timings: res.timings });
    void platform.saveProject(project, existing ? undefined : bytes);
  },

  async reprocess(unitsToMeters) {
    const { dxf, fileName, project } = get();
    if (!dxf || !project) return;
    // zones / hotspots were placed in the old scale; they are reset with the new geometry
    const p = { ...project, unitsToMeters, zones: [], hotspots: [], viewpoints: [] };
    await get().openBytes(dxf, fileName, p);
    const s = get().scene;
    if (s) get().update((pp) => { pp.hotspots = s.hotspotSuggestions; pp.viewpoints = s.viewpoints; });
  },

  update(fn, opts) {
    const cur = get().project;
    if (!cur) return;
    const next: Project = structuredClone(cur);
    fn(next);
    next.updatedAt = new Date().toISOString();
    const now = Date.now();
    const merge = opts?.coalesce && lastCoalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.at < 1200;
    lastCoalesce = opts?.coalesce ? { key: opts.coalesce, at: now } : null;
    set((s) => ({ project: next, past: merge ? s.past : [...s.past.slice(-60), cur], future: [], saving: true }));
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => { await platform.saveProject(get().project!); set({ saving: false }); }, 700);
  },

  undo() {
    const { past, project, future } = get();
    if (!past.length || !project) return;
    set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future] });
    void platform.saveProject(past[past.length - 1]);
  },
  redo() {
    const { past, project, future } = get();
    if (!future.length || !project) return;
    set({ project: future[0], future: future.slice(1), past: [...past, project] });
    void platform.saveProject(future[0]);
  },
  resetAuto() {
    const { project, scene, model } = get();
    if (!project || !scene || !model) return;
    const a = automatic(project, scene, model);
    get().update((p) => { Object.assign(p, { ...a, title: p.title, description: p.description, author: p.author, images: p.images, publish: p.publish, language: p.language }); });
  },
  goHome() { set({ screen: "home", scene: null, model: null, project: null, dxf: null, past: [], future: [] }); },
  addTiming(k, ms) { set((s) => ({ timings: { ...s.timings, [k]: ms } })); },
}));

/** Saves the ZIP's images that CAD materials refer to and creates one material per CAD material. */
async function cadTextures(projectId: string, model: ModelMeta, images: { name: string; data: Uint8Array }[]): Promise<MaterialPreset[]> {
  const byName = new Map(images.map((i) => [i.name.toLowerCase(), i]));
  const out: MaterialPreset[] = [];
  const saved = new Set<string>();
  for (const cm of model.materials ?? []) {
    const img = cm.map ? byName.get(cm.map.toLowerCase()) : undefined;
    if (!img) continue;
    const key = textureKey(img.name);
    if (!saved.has(key)) { await saveTexture(projectId, key, img.data); saved.add(key); }
    out.push({
      id: `img:${textureKey(cm.name).replace(/\./g, "_")}`, label: { de: cm.name, en: cm.name },
      color: cm.color !== undefined ? "#" + cm.color.toString(16).padStart(6, "0") : "#b9b9b9",
      roughness: 0.8, metalness: 0, texture: "none", scale: !cm.sourceUv && cm.mapSize && cm.mapSize > 0.01 && cm.mapSize < 100 ? cm.mapSize : 1,
      group: "cad", image: key, cadName: cm.name, ...(cm.sourceUv ? { sourceUv: true } : {}), ...(cm.colorize ? { colorize: true } : {}),
      ...(cm.opacity !== undefined ? { transmission: 1, opacity: cm.opacity } : {}),
    });
  }
  return out;
}

/** Parts whose CAD material has an own texture use it automatically. */
function applyCadTextures(scene: PreparedScene, customs: MaterialPreset[] | undefined) {
  setCustomPresets(customs);
  if (!customs?.length) return;
  const byCad = new Map(customs.map((c) => [c.cadName, c.id]));
  for (const p of scene.parts) {
    const id = p.cadMaterial ? byCad.get(p.cadMaterial) : undefined;
    if (id) p.auto = { presetId: id, reason: "cad" };
  }
}

/** Honest note when the drawing names texture images that are not available. */
function noteMissingTextures(model: ModelMeta, customs: MaterialPreset[] | undefined, hadZip: boolean, lang: "de" | "en") {
  const withMap = (model.materials ?? []).filter((m) => m.map);
  const have = new Set((customs ?? []).map((c) => c.cadName));
  const missing = withMap.filter((m) => !have.has(m.name));
  if (!missing.length) return;
  const files = [...new Set(missing.map((m) => m.map!))];
  const unsupported = files.filter((f) => !/\.(jpe?g|png|webp)$/i.test(f));
  const de = lang === "de";
  const list = files.slice(0, 4).join(", ") + (files.length > 4 ? " …" : "");
  model.warnings.push({
    code: "cad-textures",
    message: hadZip
      ? (de ? `${files.length} Texturbild(er) aus der Zeichnung fehlen im ZIP (${list}). Diese Flächen bekommen ein passendes ARCHVISTA-Material.` : `${files.length} texture image(s) named in the drawing are missing from the ZIP (${list}). Those surfaces get a matching ARCHVISTA material.`)
        + (unsupported.length ? (de ? ` ${unsupported.length} davon (z. B. TIF/BMP) bitte als JPG oder PNG speichern.` : ` ${unsupported.length} of them (e.g. TIF/BMP) need saving as JPG or PNG.`) : "")
      : (de ? `Die Zeichnung verwendet ${files.length} Texturbild(er) (${list}). Um sie zu übernehmen: DXF und Bilder zusammen als ZIP importieren.` : `The drawing uses ${files.length} texture image(s) (${list}). To use them, import the DXF together with the images as a ZIP.`),
  } as ModelMeta["warnings"][number]);
}

function runWorker(msg: WorkerIn, onProgress: (f: number, label: string) => void): Promise<WorkerOut> {
  return new Promise((resolve) => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      if (e.data.type === "progress") onProgress(e.data.fraction, e.data.label);
      else { resolve(e.data); w.terminate(); }
    };
    w.onerror = (e) => { resolve({ type: "error", message: e.message || "Unbekannter Fehler beim Lesen der Datei." }); w.terminate(); };
    w.postMessage(msg, [msg.dxf]);
  });
}

export function presetLabel(id: string, lang: "de" | "en") {
  return PRESET.get(id)?.label[lang] ?? id;
}
