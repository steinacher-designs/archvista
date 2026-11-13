// Dev helper: memory/size of openskp's instanced scene for a big .skp. args: file
import { readFileSync } from "node:fs";
import { buildInstancedScene } from "openskp";
const b = readFileSync(process.argv[2]);
const t0 = Date.now();
const sc = buildInstancedScene(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
let local = 0; for (const r of sc.meshResources) for (const p of r.primitives) local += p.indices.length / 3;
const byId = new Map(sc.meshResources.map((r) => [r.id, r]));
let world = 0, nodes = 0;
const walk = (n: any) => { nodes++; const r = n.meshResourceId ? byId.get(n.meshResourceId) : undefined; if (r) for (const p of r.primitives) world += p.indices.length / 3; for (const c of n.children ?? []) walk(c); };
walk(sc.sceneHierarchy);
console.log("instanced", (Date.now() - t0) / 1000, "s · resources", sc.meshResources.length, "· local tris", local, "· world tris", world, "· nodes", nodes, "· rss", (process.memoryUsage().rss / 1e6) | 0, "MB · keys", Object.keys(sc.sceneHierarchy).join(","));
