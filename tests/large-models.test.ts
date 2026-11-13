import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { importGltf } from "../src/core/gltf/import";
import { prepareScene } from "../src/core/scene";
import { writeGlb } from "../src/core/export/glb";
import { Welder, dedupeTriangles } from "../src/core/weld";
import type { ByteSource } from "../src/core/dxf/reader";

const house = readFileSync(new URL("./fixtures/models/house_mm.dxf", import.meta.url), "utf8");

/** A source that hands out tiny pieces: every line and every CR/LF pair gets split somewhere. */
const tiny = (text: string, piece = 7): ByteSource => { const b = new TextEncoder().encode(text); return { size: b.length, read: (o, l) => b.subarray(o, Math.min(b.length, o + Math.min(l, piece))) }; };

/** Dense "furniture" (sphere of 3DFACEs, mm) as a block, placed n times, inside a 20 × 10 m box of walls. */
function bigDxf(n: number, seg = 40, opts: { doubleFloor?: boolean } = {}) {
  const L: string[] = [];
  const p = (c: number, v: string | number) => L.push(String(c), String(v));
  const face = (layer: string, pts: number[][]) => { p(0, "3DFACE"); p(8, layer); pts.forEach(([x, y, z], k) => { p(10 + k, x); p(20 + k, y); p(30 + k, z); }); };
  p(0, "SECTION"); p(2, "HEADER"); p(9, "$INSUNITS"); p(70, 4); p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "BLOCKS"); p(0, "BLOCK"); p(8, "0"); p(2, "SOFA"); p(70, 0); p(10, 0); p(20, 0); p(30, 0);
  const r = 400;
  const q = (i: number, j: number) => { const th = (Math.PI * i) / seg, ph = (Math.PI * j) / seg; return [r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r + r * Math.cos(th)]; };
  for (let i = 0; i < seg; i++) for (let j = 0; j < 2 * seg; j++) face("M-MOEBEL", [q(i, j), q(i + 1, j), q(i + 1, j + 1), q(i, j + 1)]);
  p(0, "ENDBLK"); p(8, "0"); p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "ENTITIES");
  const W = 20000, D = 10000, H = 3000;
  face("A-BODEN", [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]]);
  if (opts.doubleFloor) face("A-BODEN", [[0, 0, 0], [0, D, 0], [W, D, 0], [W, 0, 0]]); // back copy (SketchUp style)
  for (const [x0, y0, x1, y1] of [[0, 0, W, 0], [W, 0, W, D], [W, D, 0, D], [0, D, 0, 0]]) face("A-WAND", [[x0, y0, 0], [x1, y1, 0], [x1, y1, H], [x0, y0, H]]);
  for (let k = 0; k < n; k++) { p(0, "INSERT"); p(8, "M-MOEBEL"); p(2, "SOFA"); p(10, 1000 + (k % 16) * 1100); p(20, 1000 + Math.floor(k / 16) * 1100); p(30, 0); }
  p(0, "ENDSEC"); p(0, "EOF");
  return L.join("\r\n") + "\r\n";
}

describe("very large models", () => {
  it("the DXF reader gives the same result however the file is cut into pieces", () => {
    const a = importDxf(house), b = importDxf(tiny(house));
    expect(b.stats.triangles).toBe(a.stats.triangles);
    expect(b.bbox).toEqual(a.bbox);
    expect(b.layers.map((l) => l.name)).toEqual(a.layers.map((l) => l.name));
  });

  it("welder: points in one cell merge, collapsed triangles are dropped; duplicates (any order) removed", () => {
    const w = new Welder(0.01);
    w.tri(0, 0, 0, 1, 0, 0, 0, 1, 0);
    w.tri(0.001, 0, 0, 1.002, 0, 0, 0, 1.003, 0); // same cells → same vertices
    w.tri(0, 0, 0, 0.004, 0, 0, 0, 0.003, 0);     // collapses
    expect(w.vertexCount).toBe(3);
    expect(w.dropped).toBe(1);
    const d = dedupeTriangles(w.idx.view());
    expect(d.indices.length).toBe(3);
    expect(dedupeTriangles(Uint32Array.from([0, 1, 2, 2, 1, 0, 1, 2, 0, 3, 4, 5])).removed).toBe(2);
    // many points: the typed hash table grows correctly
    const g = new Welder(1);
    for (let i = 0; i < 50000; i++) g.tri(i * 3, 0, 0, i * 3 + 1, 0, 0, i * 3, 1, 0);
    expect(g.vertexCount).toBe(150000);
    expect(g.triangleCount).toBe(50000);
  });

  it("huge DXF: details thinned to the budget while reading, walls exact, storeys found", () => {
    const text = bigDxf(48);
    const normal = importDxf(text);
    const big = importDxf(tiny(text, 1 << 20), { large: { threshold: 10_000, budget: 60_000 } });
    expect(normal.stats.triangles).toBeGreaterThan(250_000);
    expect(big.stats.triangles).toBeLessThanOrEqual(66_000);
    expect(big.warnings.some((w) => w.code === "large-model")).toBe(true);
    for (let k = 0; k < 3; k++) { expect(big.bbox.min[k]).toBeCloseTo(normal.bbox.min[k], 2); expect(big.bbox.max[k]).toBeCloseTo(normal.bbox.max[k], 2); }
    // walls and floor keep their exact triangles
    const tri = (m: typeof big, layer: string) => m.layers.find((l) => l.name === layer)?.triangleCount;
    expect(tri(big, "A-WAND")).toBe(tri(normal, "A-WAND"));
    expect(prepareScene(big).analysis.levels.length).toBe(1);
  });

  it("huge DXF: front/back copies of a face (SketchUp exports) count once – the floor stays walkable", () => {
    const big = importDxf(bigDxf(48, 40, { doubleFloor: true }), { large: { threshold: 10_000, budget: 60_000 } });
    expect(big.layers.find((l) => l.name === "A-BODEN")?.triangleCount).toBe(2);
    expect(prepareScene(big).analysis.levels.length).toBe(1);
  });

  it("huge GLB: thinned to the budget, textures' UVs kept", () => {
    const seg = 60, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= seg; i++) for (let j = 0; j <= seg; j++) { const th = (Math.PI * i) / seg, ph = (2 * Math.PI * j) / seg; pos.push(0.4 * Math.sin(th) * Math.cos(ph), 0.4 + 0.4 * Math.cos(th), 0.4 * Math.sin(th) * Math.sin(ph)); }
    for (let i = 0; i < seg; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j; idx.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2); }
    const parts = Array.from({ length: 30 }, (_, k) => {
      const P = Float32Array.from(pos); for (let i = 0; i < P.length; i += 3) P[i] += k * 1.1;
      return { presetId: "plaster_white", positions: P, normals: P.slice(), uvs: new Float32Array((P.length / 3) * 2).fill(0.5), indices: Uint32Array.from(idx) };
    });
    const glb = writeGlb([...parts, { presetId: "concrete", positions: Float32Array.from([-1, 0, -1, 40, 0, -1, 40, 0, 2, -1, 0, 2]), normals: Float32Array.from([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), uvs: new Float32Array(8), indices: Uint32Array.from([0, 2, 1, 0, 3, 2]) }]);
    const { model } = importGltf(glb, { large: { threshold: 10_000, budget: 30_000 } });
    expect(model.stats.triangles).toBeLessThanOrEqual(33_000);
    expect(model.stats.triangles).toBeGreaterThan(2_000);
    expect(model.warnings.some((w) => w.code === "large-model")).toBe(true);
    expect(model.bbox.max[0] - model.bbox.min[0]).toBeCloseTo(41, 0);
  });
});
