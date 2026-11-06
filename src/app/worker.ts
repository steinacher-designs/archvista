// ARCHVISTA — background worker: DXF import + automatic scene preparation (keeps the UI responsive).
import { importDxf } from "../core/dxf/import";
import { prepareScene } from "../core/scene";

export type WorkerIn = { type: "process"; dxf: ArrayBuffer; unitsToMeters?: number };
export type WorkerOut =
  | { type: "progress"; fraction: number; label: string }
  | { type: "done"; model: ReturnType<typeof strip>; scene: ReturnType<typeof prepareScene>; timings: Record<string, number> }
  | { type: "error"; message: string; detail?: string };

function strip(m: ReturnType<typeof importDxf>) {
  // the UI needs metadata only; geometry continues in `scene.parts`
  return { ...m, meshes: [] as never[] };
}

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);
  try {
    const t0 = performance.now();
    const text = new TextDecoder("utf-8").decode(e.data.dxf);
    const model = importDxf(text, { unitsToMeters: e.data.unitsToMeters, onProgress: (f, label) => post({ type: "progress", fraction: f * 0.55, label }) });
    const t1 = performance.now();
    if (!model.ok) { post({ type: "done", model: strip(model), scene: null as never, timings: { import: t1 - t0 } }); return; }
    const scene = prepareScene(model, (f, label) => post({ type: "progress", fraction: 0.55 + f * 0.45, label }));
    const t2 = performance.now();
    const transfer: Transferable[] = [];
    for (const p of scene.parts) transfer.push(p.positions.buffer, p.normals.buffer, p.uvs.buffer, p.indices.buffer);
    for (const pl of scene.analysis.plans) transfer.push(pl.floorY.buffer, pl.ceilY.buffer, pl.walkable.buffer, pl.blocked.buffer, pl.room.buffer);
    post({ type: "done", model: strip(model), scene, timings: { import: t1 - t0, analysis: t2 - t1, ...scene.timings } }, transfer);
  } catch (err) {
    const e2 = err as Error;
    post({ type: "error", message: e2.message, detail: e2.name });
  }
};
