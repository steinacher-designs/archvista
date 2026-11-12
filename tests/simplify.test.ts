import { describe, it, expect } from "vitest";
import { simplifyToBudget, clusterPart, isDetailPart, triangleCount } from "../src/core/simplify";

/** UV sphere (fine detail) */
function sphere(cx: number, r: number, seg: number) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg / 2; i++) for (let j = 0; j <= seg; j++) {
    const th = (Math.PI * i) / (seg / 2), ph = (2 * Math.PI * j) / seg;
    pos.push(cx + r * Math.sin(th) * Math.cos(ph), r + r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
  }
  const w = seg + 1;
  for (let i = 0; i < seg / 2; i++) for (let j = 0; j < seg; j++) { const a = i * w + j; idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1); }
  const positions = Float32Array.from(pos);
  return { key: "sofa", positions, normals: positions.slice(), uvs: new Float32Array((pos.length / 3) * 2), indices: Uint32Array.from(idx) };
}
/** big wall: 20 × 3 m, two triangles */
const wall = () => ({ key: "wall", positions: Float32Array.from([0, 0, 0, 20, 0, 0, 20, 3, 0, 0, 3, 0]), normals: new Float32Array(12), uvs: new Float32Array(8), indices: Uint32Array.from([0, 1, 2, 0, 2, 3]) });

describe("display simplification of very large models", () => {
  const many = Array.from({ length: 40 }, (_, i) => sphere(i * 1.2, 0.4, 96));
  it("small models stay exactly as they are", () => {
    const parts = [wall(), sphere(0, 0.4, 16)];
    const r = simplifyToBudget(parts, 100_000);
    expect(r.parts).toBe(parts);
    expect(r.cell).toBe(0);
  });
  it("only fine detail is thinned out; walls stay exact; keys and fields stay", () => {
    expect(isDetailPart(many[0])).toBe(true);
    expect(isDetailPart(wall())).toBe(false);
    const parts = [wall(), ...many];
    const before = triangleCount(parts);
    const r = simplifyToBudget(parts, before / 6);
    expect(r.after).toBeLessThanOrEqual((before / 6) * 1.1);
    expect(r.parts[0]).toBe(parts[0]);
    expect(r.parts[1].key).toBe("sofa");
    // the simplified sphere keeps its size (no shrinking)
    const P = r.parts[1].positions; let mx = -Infinity, mn = Infinity;
    for (let i = 1; i < P.length; i += 3) { mx = Math.max(mx, P[i]); mn = Math.min(mn, P[i]); }
    expect(mx - mn).toBeGreaterThan(0.7);
  });
  it("clustering drops collapsed triangles and keeps indices valid", () => {
    const s = clusterPart(sphere(0, 0.4, 96), 0.05);
    expect(s.indices.length).toBeLessThan(sphere(0, 0.4, 96).indices.length);
    const nv = s.positions.length / 3;
    for (const i of s.indices) expect(i).toBeLessThan(nv);
    expect(s.normals.length).toBe(nv * 3); expect(s.uvs.length).toBe(nv * 2);
  });
});
