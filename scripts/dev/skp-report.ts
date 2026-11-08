// Dev helper: what ARCHVISTA makes of a .skp — meshes, materials, automatic assignment.
import { readFileSync } from "node:fs";
import { importSkp } from "../../src/core/skp/import";
import { prepareScene } from "../../src/core/scene";
const { model, images } = importSkp(new Uint8Array(readFileSync(process.argv[2])));
const scene = prepareScene(model);
const tri = (f: (m: (typeof model.meshes)[number]) => boolean) => model.meshes.filter(f).reduce((n, m) => n + m.triangleCount, 0);
console.log("triangles", model.stats.triangles, "| one-sided", tri((m) => !!m.singleSided), "| unpainted", tri((m) => !m.material), "| images", images.length);
const rows = new Map<string, number>();
for (const p of scene.parts) { const k = `${p.cadMaterial ?? "(ohne Material)"} → ${p.auto.presetId}${p.auto.color ? " " + p.auto.color : ""} [${p.auto.reason}]`; rows.set(k, (rows.get(k) ?? 0) + p.indices.length / 3); }
for (const [k, n] of [...rows].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(n).padStart(7), k);
console.log("colorized:", model.materials.filter((m) => m.colorize).map((m) => m.name).join(", "));
