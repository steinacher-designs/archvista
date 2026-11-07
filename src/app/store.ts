// ARCHVISTA — application state: project document with undo/redo, processing, autosave.

import { create } from "zustand";
import type { ImportedModel } from "../core/dxf/import";
import type { PreparedScene } from "../core/scene";
import { autoDesign, newProject, sha256Hex, type Project } from "../core/project";
import { PRESET } from "../core/materials";
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
  openBytes(bytes: Uint8Array, fileName: string, existing?: Project): Promise<void>;
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
  const roof = scene.parts.filter((p) => p.category === "roof").map((p) => project.materialOverrides[p.key] ?? p.auto.presetId);
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
    if (!/\.dxf$/i.test(file.name)) {
      set({ screen: "failed", error: { message: get().lang === "de" ? "Bitte eine .dxf-Datei verwenden. DWG-Dateien bitte in AutoCAD mit _DXFOUT als DXF speichern." : "Please use a .dxf file. Save DWG files as DXF in AutoCAD with _DXFOUT." } });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await get().openBytes(bytes, file.name);
  },

  async openBytes(bytes, fileName, existing) {
    set({ screen: "processing", error: null, progress: { fraction: 0.01, label: "" }, dxf: bytes, fileName, startedAt: performance.now(), timings: {} });
    const hash = existing?.fileHash ?? (await sha256Hex(bytes));
    const res = await runWorker({ type: "process", dxf: bytes.slice().buffer, unitsToMeters: existing?.unitsToMeters }, (f, label) => set({ progress: { fraction: f, label } }));
    if (res.type === "error") { set({ screen: "failed", error: { message: res.message, detail: res.detail } }); return; }
    if (res.type !== "done") return;
    if (!res.model.ok) { set({ screen: "failed", model: res.model, error: { message: res.model.warnings[0]?.message ?? get().t.noGeometry, detail: res.model.warnings[0]?.detail } }); return; }
    let project = existing ?? automatic(newProject(fileName, hash), res.scene, res.model);
    project = { ...project, language: project.language ?? get().lang };
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
