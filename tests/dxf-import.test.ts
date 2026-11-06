import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { importDxf, ImportedModel } from "../src/core/dxf/import";
import { aciToRgb } from "../src/core/dxf/color";
import { readDxf, DxfFormatError } from "../src/core/dxf/reader";

const fx = (n: string) => readFileSync(new URL(`./fixtures/models/${n}`, import.meta.url), "utf8");

/** Build a minimal ASCII DXF from entity group-code lists. */
function dxf(opts: { insunits?: number; layers?: [string, number][]; blocks?: { name: string; base?: number[]; ents: (string | number)[][] }[]; ents: (string | number)[][] }) {
  const L: (string | number)[] = [];
  const pair = (c: number, v: string | number) => L.push(c, v);
  pair(0, "SECTION"); pair(2, "HEADER");
  if (opts.insunits !== undefined) { pair(9, "$INSUNITS"); pair(70, opts.insunits); }
  pair(0, "ENDSEC");
  pair(0, "SECTION"); pair(2, "TABLES"); pair(0, "TABLE"); pair(2, "LAYER");
  for (const [n, c] of opts.layers ?? []) { pair(0, "LAYER"); pair(2, n); pair(70, 0); pair(62, c); }
  pair(0, "ENDTAB"); pair(0, "ENDSEC");
  pair(0, "SECTION"); pair(2, "BLOCKS");
  for (const b of opts.blocks ?? []) {
    pair(0, "BLOCK"); pair(2, b.name); pair(70, 0);
    const [bx, by, bz] = b.base ?? [0, 0, 0];
    pair(10, bx); pair(20, by); pair(30, bz);
    for (const e of b.ents) L.push(...e);
    pair(0, "ENDBLK");
  }
  pair(0, "ENDSEC");
  pair(0, "SECTION"); pair(2, "ENTITIES");
  for (const e of opts.ents) L.push(...e);
  pair(0, "ENDSEC"); pair(0, "EOF");
  return L.join("\r\n");
}

const face = (layer: string, p: number[][], extra: (string | number)[] = []) => {
  const out: (string | number)[] = [0, "3DFACE", 8, layer, ...extra];
  p.forEach((v, i) => out.push(10 + i, v[0], 20 + i, v[1], 30 + i, v[2]));
  return out;
};

const allPositions = (m: ImportedModel) => {
  const out: number[][] = [];
  for (const mesh of m.meshes)
    for (let i = 0; i < mesh.positions.length; i += 3) out.push([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]].map((v) => +v.toFixed(4)));
  return out;
};
/** Positions back in original DXF coordinates (metres, Z-up). */
const worldZUp = (m: ImportedModel) =>
  allPositions(m).map(([x, y, z]) => [+(x + m.origin[0]).toFixed(4), +(-(z + m.origin[2])).toFixed(4), +(y + m.origin[1]).toFixed(4)]);

describe("ACI colours", () => {
  it("matches documented reference values", () => {
    expect(aciToRgb(1)).toBe(0xff0000);
    expect(aciToRgb(10)).toBe(0xff0000);
    expect(aciToRgb(11)).toBe(0xff7f7f);
    expect(aciToRgb(14)).toBe(0x990000);
    expect(aciToRgb(30)).toBe(0xff7f00);
    expect(aciToRgb(250)).toBe(0x333333);
  });
});

describe("reader", () => {
  it("rejects non-DXF and binary files with a clear German message", () => {
    expect(() => readDxf("hello world\nfoo")).toThrow(DxfFormatError);
    expect(() => readDxf("AutoCAD Binary DXF\r\n\x1a\x00...")).toThrow(/Binärformat/);
  });
});

describe("3DFACE, units and scale", () => {
  it("keeps real dimensions: 1000 mm quad becomes 1 m", () => {
    const m = importDxf(dxf({ insunits: 4, layers: [["W", 3]], ents: [face("W", [[0, 0, 0], [1000, 0, 0], [1000, 0, 2500], [0, 0, 2500]])] }));
    expect(m.ok).toBe(true);
    expect(m.units.toMeters).toBe(0.001);
    expect(m.units.source).toBe("header");
    const size = m.bbox.max.map((v, i) => v - m.bbox.min[i]);
    expect(size[0]).toBeCloseTo(1, 5); // x
    expect(size[1]).toBeCloseTo(2.5, 5); // DXF z → Y up
    expect(m.stats.triangles).toBe(2);
    expect(m.meshes[0].color).toBe(0x00ff00); // BYLAYER colour 3
  });

  it("triangle 3DFACE (4th = 3rd point) gives one triangle", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [face("0", [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0]])] }));
    expect(m.stats.triangles).toBe(1);
  });

  it("guesses units when $INSUNITS is missing and says so", () => {
    const m = importDxf(dxf({ ents: [face("0", [[0, 0, 0], [12000, 0, 0], [12000, 9000, 0], [0, 9000, 0]])] }));
    expect(m.units.source).toBe("guess");
    expect(m.units.toMeters).toBe(0.001);
    expect(m.warnings.some((w) => w.code === "units-guessed")).toBe(true);
  });

  it("warns when header units are implausible", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [face("0", [[0, 0, 0], [12000, 0, 0], [12000, 9000, 0], [0, 9000, 0]])] }));
    expect(m.warnings.some((w) => w.code === "units-implausible")).toBe(true);
  });

  it("user override of units is respected", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [face("0", [[0, 0, 0], [12000, 0, 0], [12000, 9000, 0]] .concat([[12000, 9000, 0]]))] }), { unitsToMeters: 0.001 });
    expect(m.bbox.max[0] - m.bbox.min[0]).toBeCloseTo(12, 5);
  });

  it("keeps float precision for georeferenced coordinates via origin offset", () => {
    const X = 5_432_100.123, Y = 312_456.789;
    const m = importDxf(dxf({ insunits: 6, ents: [face("0", [[X, Y, 400], [X + 10, Y, 400], [X + 10, Y + 8, 400], [X, Y + 8, 400]])] }));
    expect(m.bbox.max[0] - m.bbox.min[0]).toBeCloseTo(10, 4);
    const w = worldZUp(m);
    expect(Math.min(...w.map((p) => p[0]))).toBeCloseTo(X, 2);
  });
});

describe("blocks and transformations", () => {
  const unitBox = [face("0", [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]])];

  it("applies insertion point, rotation and scale; layer 0 inherits insert layer; BYBLOCK colour", () => {
    const m = importDxf(dxf({
      insunits: 6,
      layers: [["MOEBEL", 1]],
      blocks: [{ name: "B", ents: [face("0", [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], [62, 0])] }],
      ents: [[0, "INSERT", 8, "MOEBEL", 62, 5, 2, "B", 10, 10, 20, 0, 30, 0, 41, 2, 42, 3, 43, 1, 50, 90]],
    }));
    expect(m.meshes).toHaveLength(1);
    expect(m.meshes[0].layer).toBe("MOEBEL");
    expect(m.meshes[0].color).toBe(0x0000ff); // BYBLOCK → insert colour 5 (blue)
    const w = worldZUp(m);
    const xs = w.map((p) => p[0]), ys = w.map((p) => p[1]);
    // rotated 90°: x-extent = 3 (scaled y), y-extent = 2 (scaled x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(3, 4);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 4);
    expect(Math.max(...xs)).toBeCloseTo(10, 4);
  });

  it("handles nested blocks with base points", () => {
    const m = importDxf(dxf({
      insunits: 6,
      blocks: [
        { name: "INNER", base: [1, 1, 0], ents: unitBox },
        { name: "OUTER", ents: [[0, "INSERT", 8, "0", 2, "INNER", 10, 100, 20, 0, 30, 0]] },
      ],
      ents: [[0, "INSERT", 8, "0", 2, "OUTER", 10, 0, 20, 50, 30, 7]],
    }));
    const w = worldZUp(m);
    expect(Math.min(...w.map((p) => p[0]))).toBeCloseTo(99, 4);
    expect(Math.min(...w.map((p) => p[1]))).toBeCloseTo(49, 4);
    expect(w[0][2]).toBeCloseTo(7, 4);
  });

  it("expands MINSERT arrays", () => {
    const m = importDxf(dxf({ insunits: 6, blocks: [{ name: "B", ents: unitBox }], ents: [[0, "INSERT", 8, "0", 2, "B", 10, 0, 20, 0, 30, 0, 70, 3, 71, 2, 44, 5, 45, 4]] }));
    expect(m.stats.triangles).toBe(12);
  });

  it("detects self-referencing blocks without hanging", () => {
    const m = importDxf(dxf({ insunits: 6, blocks: [{ name: "LOOP", ents: [...unitBox, [0, "INSERT", 8, "0", 2, "LOOP", 10, 2, 20, 0, 30, 0]] }], ents: [[0, "INSERT", 8, "0", 2, "LOOP", 10, 0, 20, 0, 30, 0]] }));
    expect(m.ok).toBe(true);
    expect(m.warnings.some((w) => w.code === "recursion")).toBe(true);
  });

  it("mirrored insert keeps outward winding (negative scale)", () => {
    // closed tetrahedron as polyface inside block, inserted mirrored
    const tet = [
      [0, "POLYLINE", 8, "0", 66, 1, 70, 64, 71, 4, 72, 4, 10, 0, 20, 0, 30, 0],
      ...[[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]].map((p) => [0, "VERTEX", 8, "0", 10, p[0], 20, p[1], 30, p[2], 70, 192]),
      ...[[1, 3, 2], [1, 2, 4], [2, 3, 4], [3, 1, 4]].map((f) => [0, "VERTEX", 8, "0", 10, 0, 20, 0, 30, 0, 70, 128, 71, f[0], 72, f[1], 73, f[2]]),
      [0, "SEQEND"],
    ];
    const m = importDxf(dxf({ insunits: 6, blocks: [{ name: "T", ents: tet }], ents: [[0, "INSERT", 8, "0", 2, "T", 10, 0, 20, 0, 30, 0, 41, -1]] }));
    expect(m.stats.triangles).toBe(4);
    expect(signedVolume(m)).toBeGreaterThan(0);
  });
});

describe("OCS / extrusion", () => {
  it("CIRCLE with thickness becomes a capped cylinder of correct size", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [[0, "CIRCLE", 8, "S", 10, 5, 20, 5, 30, 0, 40, 0.5, 39, 3]] }));
    const s = m.bbox.max.map((v, i) => v - m.bbox.min[i]);
    expect(s[1]).toBeCloseTo(3, 4);
    expect(s[0]).toBeCloseTo(1, 1);
    expect(signedVolume(m)).toBeGreaterThan(Math.PI * 0.25 * 3 * 0.95);
  });

  it("SOLID with downward extrusion (0,0,-1) is placed via the arbitrary axis algorithm", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [[0, "SOLID", 8, "S", 10, 1, 20, 1, 30, 2, 11, 2, 21, 1, 31, 2, 12, 1, 22, 2, 32, 2, 13, 2, 23, 2, 33, 2, 210, 0, 220, 0, 230, -1]] }));
    const w = worldZUp(m);
    // OCS (0,0,-1) maps x → -x, z → -z
    expect(Math.max(...w.map((p) => p[0]))).toBeCloseTo(-1, 4);
    expect(w[0][2]).toBeCloseTo(-2, 4);
  });

  it("LWPOLYLINE with thickness and bulge produces curved walls", () => {
    const m = importDxf(dxf({ insunits: 6, ents: [[0, "LWPOLYLINE", 8, "W", 90, 2, 70, 0, 39, 2.5, 10, 0, 20, 0, 42, 1, 10, 4, 20, 0]] }));
    expect(m.stats.triangles).toBeGreaterThan(10); // semicircle tessellated
    const w = worldZUp(m);
    expect(Math.min(...w.map((p) => p[1]))).toBeCloseTo(-2, 1); // bulge 1 = half circle radius 2 (clockwise side)
  });
});

describe("MESH, polygon mesh, ACIS", () => {
  it("reports ACIS solids honestly and does not invent geometry", () => {
    const m = importDxf(fx("acis_only.dxf"));
    expect(m.ok).toBe(false);
    expect(m.stats.triangles).toBe(0);
    expect(m.warnings[0].code).toBe("no-3d");
    expect(m.warnings[0].detail).toBe("acis-fix");
    expect(m.warnings.some((w) => w.code === "acis" && /VOLUMEN/.test(w.message))).toBe(true);
  });

  it("2D-only drawing is rejected with explanation", () => {
    const m = importDxf(dxf({ insunits: 4, ents: [[0, "LINE", 8, "0", 10, 0, 20, 0, 30, 0, 11, 1000, 21, 0, 31, 0], [0, "TEXT", 8, "0", 10, 0, 20, 0, 30, 0, 40, 100, 1, "Hallo"]] }));
    expect(m.ok).toBe(false);
    expect(m.warnings[0].message).toMatch(/keine 3D-Geometrie/);
  });

  it("skips frozen / off layers and reports it", () => {
    const m = importDxf(dxf({ insunits: 6, layers: [["AUS", -3]], ents: [face("AUS", [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]), face("0", [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]])] }));
    expect(m.stats.triangles).toBe(2);
    expect(m.warnings.some((w) => w.code === "hidden-layers")).toBe(true);
  });
});

describe("generated architectural model (house_mm.dxf, written by ezdxf)", () => {
  const m = importDxf(fx("house_mm.dxf"));
  it("imports with correct real-world size", () => {
    expect(m.ok).toBe(true);
    expect(m.units.name).toBe("Millimeter");
    const size = m.bbox.max.map((v, i) => v - m.bbox.min[i]);
    // footprint incl. terrace & roof overhang: x from -0.5 to 16 → 16.5 m; height -0.3..8.6 → 8.9 m
    expect(size[0]).toBeCloseTo(16.5, 2);
    expect(size[1]).toBeCloseTo(8.9, 2);
  });
  it("reads every relevant entity type and layer", () => {
    for (const t of ["POLYLINE", "3DFACE", "MESH", "INSERT", "CIRCLE", "LWPOLYLINE", "SOLID"]) expect(m.stats.entityCounts[t]).toBeGreaterThan(0);
    const names = m.layers.map((l) => l.name);
    for (const l of ["A-WAND", "A-WAND-INNEN", "A-BODEN", "A-DECKE", "A-DACH", "A-FENSTER-GLAS", "A-TREPPE", "A-STUETZE", "A-MAUER", "A-TERRASSE"]) expect(names).toContain(l);
    expect(names).not.toContain("A-TEXT");
  });
  it("nested window blocks: glass keeps own layer, frame inherits insert layer", () => {
    expect(m.layers.find((l) => l.name === "A-FENSTER-GLAS")!.triangleCount).toBe(2 * 5); // 5 windows
    expect(m.layers.find((l) => l.name === "A-FENSTER")!.triangleCount).toBe(5 * 4 * 12);
  });
  it("stairs: 17 scaled step inserts reach the upper floor", () => {
    const stairs = m.meshes.filter((x) => x.layer === "A-TREPPE");
    let top = -Infinity;
    for (const s of stairs) for (let i = 1; i < s.positions.length; i += 3) top = Math.max(top, s.positions[i]);
    expect(top + m.origin[1]).toBeCloseTo(3.0, 3);
  });
  it("closed wall boxes are oriented outward", () => {
    expect(m.stats.closedShellsOutward).toBeGreaterThan(50);
  });
});

describe("unitless metres variant", () => {
  it("guesses metres and yields the same size as the mm file", () => {
    const a = importDxf(fx("house_unitless_m.dxf"));
    expect(a.units.toMeters).toBe(1);
    expect(a.bbox.max[0] - a.bbox.min[0]).toBeCloseTo(16.5, 2);
  });
});

function signedVolume(m: ImportedModel) {
  let v = 0;
  for (const mesh of m.meshes) {
    const p = mesh.positions, I = mesh.indices;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    }
  }
  return v;
}
