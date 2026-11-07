// ARCHVISTA — platform abstraction. Desktop (Tauri) and a browser fallback used for development and UI tests.

import type { Project } from "../core/project";
import type { Fetch } from "../core/publish/github";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function core() { return import("@tauri-apps/api/core"); }

export interface RecentProject { id: string; title: string; fileName: string; updatedAt: string; thumb?: string }

export const platform = {
  /** Read a file the app ships with (website runtime, asset library). */
  async readBundled(path: string): Promise<Uint8Array | null> {
    try {
      const r = await fetch(`/${path}`);
      if (!r.ok) return null;
      return new Uint8Array(await r.arrayBuffer());
    } catch { return null; }
  },

  async saveProject(p: Project, dxf?: Uint8Array, thumb?: string) {
    if (isTauri) {
      const { invoke } = await core();
      await invoke("project_save", { id: p.id, json: JSON.stringify(p), thumb: thumb ?? null });
      if (dxf) await invoke("project_save_source", dxf, { headers: { "x-id": p.id } });
      return;
    }
    try {
      localStorage.setItem(`av-project-${p.id}`, JSON.stringify(p));
      if (thumb) localStorage.setItem(`av-thumb-${p.id}`, thumb);
    } catch { /* storage full: autosave is best effort in the browser build */ }
    if (dxf) await idbPut(`dxf-${p.id}`, dxf);
  },

  async listProjects(): Promise<RecentProject[]> {
    if (isTauri) {
      const { invoke } = await core();
      return invoke<RecentProject[]>("project_list");
    }
    const out: RecentProject[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith("av-project-")) continue;
      try { const p = JSON.parse(localStorage.getItem(k)!); out.push({ id: p.id, title: p.title, fileName: p.fileName, updatedAt: p.updatedAt, thumb: localStorage.getItem(`av-thumb-${p.id}`) ?? undefined }); } catch { /* skip */ }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async loadProject(id: string): Promise<{ project: Project; dxf: Uint8Array } | null> {
    if (isTauri) {
      const { invoke } = await core();
      const json = await invoke<string | null>("project_load", { id });
      if (!json) return null;
      const dxf = new Uint8Array(await invoke<ArrayBuffer>("project_load_source", { id }));
      return { project: JSON.parse(json), dxf };
    }
    const j = localStorage.getItem(`av-project-${id}`);
    const dxf = await idbGet(`dxf-${id}`);
    return j && dxf ? { project: JSON.parse(j), dxf } : null;
  },

  async saveDocument(projectId: string, docId: string, bytes: Uint8Array) {
    if (isTauri) { const { invoke } = await core(); await invoke("doc_save", bytes, { headers: { "x-id": projectId, "x-doc": docId } }); return; }
    await idbPut(`doc-${projectId}-${docId}`, bytes);
  },
  async loadDocument(projectId: string, docId: string): Promise<Uint8Array | null> {
    try {
      if (isTauri) { const { invoke } = await core(); return new Uint8Array(await invoke<ArrayBuffer>("doc_load", { id: projectId, doc: docId })); }
      return await idbGet(`doc-${projectId}-${docId}`);
    } catch { return null; }
  },
  async deleteDocument(projectId: string, docId: string) {
    if (isTauri) { const { invoke } = await core(); await invoke("doc_delete", { id: projectId, doc: docId }).catch(() => {}); return; }
    try { const db = await idb(); db.transaction("kv", "readwrite").objectStore("kv").delete(`doc-${projectId}-${docId}`); } catch { /* ignore */ }
  },

  async deleteProject(id: string) {
    if (isTauri) { const { invoke } = await core(); await invoke("project_delete", { id }); return; }
    localStorage.removeItem(`av-project-${id}`); localStorage.removeItem(`av-thumb-${id}`);
  },

  /** Let the user pick a folder and write the static website there. Returns the folder or null. */
  async exportSite(files: Map<string, Uint8Array>, suggestedName: string, onProgress?: (f: number) => void): Promise<string | null> {
    if (isTauri) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, title: "Ordner für die Website wählen" });
      if (!dir || Array.isArray(dir)) return null;
      const { invoke } = await core();
      const target = `${dir}\\${suggestedName}`.replace(/\\/g, navigator.userAgent.includes("Windows") ? "\\" : "/");
      let i = 0;
      for (const [path, data] of files) {
        await invoke("write_site_file", data, { headers: { "x-dir": encodeURIComponent(target), "x-path": encodeURIComponent(path) } });
        onProgress?.(++i / files.size);
      }
      return target;
    }
    // browser fallback: ZIP download
    const { zipFiles } = await import("./zip");
    const blob = new Blob([zipFiles(files, suggestedName) as BlobPart], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${suggestedName}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return `${suggestedName}.zip`;
  },

  /** Serve the generated site to the in-app preview frame. Returns the URL of index.html. */
  async previewSite(files: Map<string, Uint8Array>): Promise<string> {
    if (isTauri) {
      const { invoke } = await core();
      await invoke("preview_clear");
      for (const [path, data] of files) await invoke("preview_put", data, { headers: { "x-path": encodeURIComponent(path) } });
      // Windows/Android use http://<scheme>.localhost, macOS/Linux <scheme>://localhost
      return navigator.userAgent.includes("Windows") ? "http://preview.localhost/index.html" : "preview://localhost/index.html";
    }
    return servePreviewViaServiceWorker(files);
  },

  async openExternal(url: string) {
    if (isTauri) { const { openUrl } = await import("@tauri-apps/plugin-opener"); await openUrl(url); return; }
    window.open(url, "_blank", "noopener");
  },

  async revealFolder(path: string) {
    if (isTauri) { const { revealItemInDir } = await import("@tauri-apps/plugin-opener"); await revealItemInDir(path); }
  },

  /** HTTP without CORS limits (Tauri) — required for the GitHub device flow. */
  fetch: (async (url, init) => {
    if (isTauri) {
      const { fetch: tfetch } = await import("@tauri-apps/plugin-http");
      return tfetch(url, init as RequestInit);
    }
    return fetch(url, init as RequestInit);
  }) as Fetch,

  secret: {
    async get(key: string): Promise<string | null> {
      if (isTauri) { const { invoke } = await core(); return invoke<string | null>("secret_get", { key }); }
      return sessionStorage.getItem(`av-secret-${key}`);
    },
    async set(key: string, value: string) {
      if (isTauri) { const { invoke } = await core(); await invoke("secret_set", { key, value }); return; }
      sessionStorage.setItem(`av-secret-${key}`, value); // browser dev build: session only, never persisted
    },
    async remove(key: string) {
      if (isTauri) { const { invoke } = await core(); await invoke("secret_delete", { key }); return; }
      sessionStorage.removeItem(`av-secret-${key}`);
    },
  },

  /** A .dxf passed by the operating system (double-click / "open with"). */
  async startupFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
    if (!isTauri) return null;
    const { invoke } = await core();
    const f = await invoke<{ name: string; bytes: number[] } | null>("startup_file");
    return f ? { name: f.name, bytes: new Uint8Array(f.bytes) } : null;
  },

  async appendBenchmark(line: Record<string, unknown>) {
    if (isTauri) { const { invoke } = await core(); await invoke("benchmark_append", { line: JSON.stringify(line) }).catch(() => {}); }
    else console.info("[benchmark]", line);
  },
};

// ——— browser fallbacks ———
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("archvista", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key: string, v: Uint8Array) {
  const db = await idb();
  await new Promise<void>((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await idb();
  return new Promise((res) => { const r = db.transaction("kv").objectStore("kv").get(key); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); });
}

let swReady: Promise<ServiceWorkerRegistration> | null = null;
async function servePreviewViaServiceWorker(files: Map<string, Uint8Array>): Promise<string> {
  if (!("serviceWorker" in navigator)) throw new Error("Vorschau benötigt einen aktuellen Browser.");
  swReady ??= navigator.serviceWorker.register("/preview-sw.js", { scope: "/__preview/" }).then(() => navigator.serviceWorker.ready);
  const reg = await swReady;
  const sw = reg.active ?? reg.waiting ?? reg.installing;
  const payload: Record<string, Uint8Array> = {};
  for (const [k, v] of files) payload[k] = v;
  await new Promise<void>((res) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => res();
    sw!.postMessage({ type: "files", files: payload }, [ch.port2]);
  });
  return `/__preview/index.html?t=${Date.now()}`;
}
