// ARCHVISTA — background worker: DXF import + automatic scene preparation (keeps the UI responsive).
import { importDxf } from "../core/dxf/import";
import { prepareScene } from "../core/scene";
import { importSkp } from "../core/skp/import";

export type WorkerIn = { type: "process"; dxf: ArrayBuffer; unitsToMeters?: number; format?: "dxf" | "skp" };
export type WorkerOut =
  | { type: "progress"; fraction: number; label: string }
  | { type: "done"; model: ReturnType<typeof strip>; scene: ReturnType<typeof prepareScene>; timings: Record<string, number>; images?: { name: string; data: Uint8Array }[] }
  | { type: "error"; message: string; detail?: string };

function strip(m: ReturnType<typeof importDxf>) {
  // the UI needs metadata only; geometry continues in `scene.parts`
  return { ...m, meshes: [] as never[] };
}

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);
  try {
    const t0 = performance.now();
    const onProgress = (f: number, label: string) => post({ type: "progress", fraction: f * 0.55, label });
    let images: { name: string; data: Uint8Array }[] | undefined;
    let model: ReturnType<typeof importDxf>;
    if (e.data.format === "skp") {
      const r = importSkp(new Uint8Array(e.data.dxf), { unitsToMeters: e.data.unitsToMeters, onProgress });
      model = r.model; images = r.images;
    } else {
      model = importDxf(new TextDecoder("utf-8").decode(e.data.dxf), { unitsToMeters: e.data.unitsToMeters, onProgress });
    }
    const t1 = performance.now();
    if (!model.ok) { post({ type: "done", model: strip(model), scene: null as never, timings: { import: t1 - t0 } }); return; }
    const scene = prepareScene(model, (f, label) => post({ type: "progress", fraction: 0.55 + f * 0.45, label }));
    const t2 = performance.now();
    const bufs = new Set<ArrayBufferLike>();
    for (const p of scene.parts) for (const a of [p.positions, p.normals, p.uvs, p.indices, p.uvTex]) if (a) bufs.add(a.buffer);
    for (const pl of scene.analysis.plans) for (const a of [pl.floorY, pl.ceilY, pl.walkable, pl.blocked, pl.room]) bufs.add(a.buffer);
    post({ type: "done", model: strip(model), scene, images, timings: { import: t1 - t0, analysis: t2 - t1, ...scene.timings } }, [...bufs] as Transferable[]);
  } catch (err) {
    const e2 = err as Error;
    post({ type: "error", message: e2.message, detail: e2.name });
  }
};
