import { describe, it, expect } from "vitest";
import { importTds } from "../src/core/tds/import";
import { prepareScene } from "../src/core/scene";

// ——— minimal 3DS writer (chunk format) for tests ———
const u16 = (v: number) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return b; };
const f32 = (v: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, v, true); return b; };
const str = (s: string) => new Uint8Array([...new TextEncoder().encode(s), 0]);
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const chunk = (id: number, ...body: Uint8Array[]) => { const b = cat(...body); const h = new Uint8Array(6); const dv = new DataView(h.buffer); dv.setUint16(0, id, true); dv.setUint32(2, b.length + 6, true); return cat(h, b); };

/** A 10 m × 10 m × 6 m box (millimetres) as one object; its top uses a textured material, the sides a glass material. */
function box3ds(opts: { hiddenObject?: boolean } = {}) {
  const S = 10000, H = 6000;
  const v = [[0, 0, 0], [S, 0, 0], [S, S, 0], [0, S, 0], [0, 0, H], [S, 0, H], [S, S, H], [0, S, H]];
  const f = [[4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7], [0, 2, 1], [0, 3, 2]];
  const verts = chunk(0x4110, u16(v.length), ...v.flat().map(f32));
  const faceMat = (name: string, idx: number[]) => chunk(0x4130, str(name), u16(idx.length), ...idx.map(u16));
  const faces = chunk(0x4120, u16(f.length), ...f.flatMap((t) => [u16(t[0]), u16(t[1]), u16(t[2]), u16(7)]), faceMat("Dachziegel rot", [0, 1]), faceMat("Glas klar", [2, 3, 4, 5, 6, 7, 8, 9]));
  const obj = (name: string, extra: Uint8Array[] = []) => chunk(0x4000, str(name), ...extra, chunk(0x4100, verts, faces));
  const mat = (name: string, rgb: number[], more: Uint8Array[] = []) => chunk(0xafff, chunk(0xa000, str(name)), chunk(0xa020, chunk(0x0011, new Uint8Array(rgb))), ...more);
  const editor = chunk(0x3d3d,
    mat("Dachziegel rot", [160, 70, 40], [chunk(0xa200, chunk(0x0030, u16(100)), chunk(0xa300, str("ZIEGEL.JPG")))]),
    mat("Glas klar", [200, 220, 230], [chunk(0xa050, chunk(0x0030, u16(70)))]),
    obj("Haus"),
    ...(opts.hiddenObject ? [obj("Versteckt", [chunk(0x4010)])] : []),
  );
  return chunk(0x4d4d, chunk(0x0002, new Uint8Array([3, 0, 0, 0])), editor);
}

describe("3DS import", () => {
  it("reads objects, triangles and units (guessed like DXF)", () => {
    const m = importTds(box3ds());
    expect(m.ok).toBe(true);
    expect(m.stats.triangles).toBe(12);
    expect(m.units.name).toBe("Millimeter");
    const size = m.bbox.max.map((v, i) => +(v - m.bbox.min[i]).toFixed(3));
    expect(size).toEqual([10, 6, 10]); // x, height (Y-up), depth
    expect(m.layers.map((l) => l.name)).toEqual(["Haus"]);
  });

  it("materials: name, colour, transparency and texture file", () => {
    const m = importTds(box3ds());
    const roof = m.materials.find((x) => x.name === "Dachziegel rot")!;
    expect(roof.color).toBe((160 << 16) | (70 << 8) | 40);
    expect(roof.map).toBe("ZIEGEL.JPG");
    expect(m.materials.find((x) => x.name === "Glas klar")!.opacity).toBeCloseTo(0.3);
    const scene = prepareScene(m);
    const auto = (n: string) => scene.parts.find((p) => p.cadMaterial === n)?.auto.presetId;
    expect(auto("Dachziegel rot")).toBe("roof_clay");
    expect(auto("Glas klar")).toBe("glass");
  });

  it("skips objects hidden in 3ds Max", () => {
    expect(importTds(box3ds({ hiddenObject: true })).stats.triangles).toBe(12);
  });

  it("rejects files that are not 3DS", () => {
    expect(() => importTds(new TextEncoder().encode("0\nSECTION\n"))).toThrow(/keine gültige 3DS-Datei/);
  });
});
