import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { assignFromCad, PRESETS, resolvePreset, setCustomPresets, textureKey, textureDocId, type MaterialPreset } from "../src/core/materials";
import { newProject } from "../src/core/project";
import { buildPublicScene, partMaterialId } from "../src/core/export/public-scene";
import { generateSite } from "../src/core/site/generate";
import { unzip } from "../src/core/unzip";

// ——— a DXF with MATERIAL objects, a layer material, entity materials and BYBLOCK inside a block ———
type Item = (string | number)[];
const box = (layer: string, x: number, extra: Item = []): Item[] => {
  // a 1 × 1 × 3 m column made of 3DFACEs (metres)
  const q = (a: number[], b: number[], c: number[], d: number[]): Item => [0, "3DFACE", 8, layer, ...extra, 10, a[0], 20, a[1], 30, a[2], 11, b[0], 21, b[1], 31, b[2], 12, c[0], 22, c[1], 32, c[2], 13, d[0], 23, d[1], 33, d[2]];
  const [x0, x1, y0, y1, z0, z1] = [x, x + 1, 0, 1, 0, 3];
  return [
    q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]), q([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]),
    q([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]), q([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]),
  ];
};
function cadDxf() {
  const L: Item = [];
  const p = (c: number, v: string | number) => L.push(c, v);
  p(0, "SECTION"); p(2, "HEADER"); p(9, "$INSUNITS"); p(70, 6); p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "TABLES"); p(0, "TABLE"); p(2, "LAYER");
  p(0, "LAYER"); p(2, "WALL_A"); p(70, 0); p(62, 7); p(347, "A1");  // layer material: "Masonry - Brick - Red"
  p(0, "LAYER"); p(2, "MISC"); p(70, 0); p(62, 7); p(347, "B0");    // layer material ByLayer → none
  p(0, "ENDTAB"); p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "BLOCKS");
  p(0, "BLOCK"); p(2, "DOOR"); p(70, 0); p(10, 0); p(20, 0); p(30, 0);
  for (const e of box("0", 0, [347, "B1"])) L.push(...e); // BYBLOCK material
  p(0, "ENDBLK"); p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "ENTITIES");
  for (const e of box("WALL_A", 0)) L.push(...e);                 // ByLayer → brick
  for (const e of box("MISC", 3, [347, "A2"])) L.push(...e);      // own material: oak with texture + colour
  for (const e of box("MISC", 6, [347, "A3"])) L.push(...e);      // painted colour
  L.push(0, "INSERT", 8, "MISC", 347, "A4", 2, "DOOR", 10, 9, 20, 0, 30, 0); // insert with "Glas klar" → block content BYBLOCK
  for (const e of box("MISC", 12)) L.push(...e);                  // ByLayer on MISC → no material
  p(0, "ENDSEC");
  p(0, "SECTION"); p(2, "OBJECTS");
  const mat = (h: string, name: string, extra: Item = []) => { p(0, "MATERIAL"); p(5, h); p(100, "AcDbMaterial"); p(1, name); L.push(...extra); };
  mat("B0", "ByLayer"); mat("B1", "ByBlock"); mat("B2", "Global");
  mat("A1", "Masonry - Brick - Red");
  // diffuse override (71=1) with true colour 0xC2 | rgb; texture file with a 2 m tile (matrix[0] = 0.5)
  mat("A2", "Holz Eiche geölt", [71, 1, 91, String((0xc2 << 24 | 0x8a6a4a) >>> 0), 3, "C:\\Projekte\\Haus\\Texturen\\Eiche_Diele.JPG", 43, 0.5, 43, 0, 43, 0, 43, 0, 43, 0, 43, 0.5]);
  mat("A3", "Wandfarbe Salbei", [71, 1, 91, String((0xc2 << 24 | 0x9caf88) >>> 0)]);
  mat("A4", "Glas klar", [140, 0.3]);
  p(0, "ENDSEC"); p(0, "EOF");
  return L.join("\r\n");
}

describe("materials from the CAD file", () => {
  const model = importDxf(cadDxf());

  it("reads MATERIAL objects and resolves ByLayer, own and ByBlock materials", () => {
    const byMat = new Map(model.meshes.map((m) => [m.material ?? "-", m]));
    expect([...byMat.keys()].sort()).toEqual(["-", "Glas klar", "Holz Eiche geölt", "Masonry - Brick - Red", "Wandfarbe Salbei"].sort());
    expect(byMat.get("Masonry - Brick - Red")!.layer).toBe("WALL_A");
    expect(byMat.get("Glas klar")!.layer).toBe("MISC"); // layer-0 block content takes the insert's layer and material
    const oak = model.materials.find((m) => m.name === "Holz Eiche geölt")!;
    expect(oak.color).toBe(0x8a6a4a);
    expect(oak.map).toBe("Eiche_Diele.JPG"); // file name only, folders removed
    expect(oak.mapSize).toBeCloseTo(2);
    expect(model.materials.find((m) => m.name === "Glas klar")!.opacity).toBeCloseTo(0.3);
    expect(model.materials.some((m) => /^by(layer|block)$|^global$/i.test(m.name))).toBe(false);
  });

  it("maps CAD materials to fitting ARCHVISTA materials and keeps paint colours", () => {
    const scene = prepareScene(model);
    const auto = (mat: string) => scene.parts.find((p) => p.cadMaterial === mat)!.auto;
    expect(auto("Masonry - Brick - Red")).toMatchObject({ presetId: "brick", reason: "cad" });
    expect(auto("Holz Eiche geölt").presetId).toMatch(/oak|timber|larch/);
    expect(auto("Glas klar").presetId).toBe("glass");
    expect(auto("Wandfarbe Salbei")).toMatchObject({ presetId: "paint_matte", color: "#9caf88" });
    // the colour reaches the published scene without the user touching anything
    const p = newProject("x.dxf", "abc");
    const salbei = scene.parts.find((x) => x.cadMaterial === "Wandfarbe Salbei")!;
    expect(partMaterialId(salbei, p)).toBe("paint_matte~#9caf88");
    // parts without a CAD material keep the old key format (existing projects stay valid)
    expect(scene.parts.find((x) => !x.cadMaterial)!.key).not.toContain("|m:");
    expect(salbei.key).toContain("|m:Wandfarbe Salbei");
  });

  it("knows common German and English material names", () => {
    const a = (name: string, cat: Parameters<typeof assignFromCad>[1] = "wall") => assignFromCad({ name }, cat)?.presetId;
    expect(a("Beton - Sichtbeton glatt")).toBe("concrete_smooth");
    expect(a("Estrich", "floor")).toBe("concrete_floor");
    expect(a("Dachziegel rot", "roof")).toBe("roof_clay");
    expect(a("Ceramic - Tile - White")).toBe("white_tiles");
    expect(a("Metal - Stainless Steel")).toBe("steel");
    expect(a("Corten Fassade")).toBe("corten");
    expect(a("Putz grau")).toBe("plaster_grey");
    expect(a("Sitework - Grass")).toBe("grass");
    expect(a("Marmor Carrara")).toBe("marble_white");
    expect(a("Lärche Schalung")).toBe("larch_cladding");
    expect(a("Material1")).toBeUndefined(); // unknown name, no colour → normal rules decide
  });

  it("every rule points to a real material", () => {
    const ids = new Set(PRESETS.map((p) => p.id));
    for (const n of ["glas milchig", "glas getönt", "gründach", "kies", "schiefer", "weißer ziegel", "dunkler klinker", "terrazzo", "marmor schwarz", "granit", "sandstein", "beton gestrichen", "fischgrät", "nuss", "räuchereiche", "mahagoni", "esche holz", "kupfer", "messing", "alu", "schwarzer stahl", "zink", "trapezblech", "metall", "naturstein", "edelputz", "putz warm", "lack", "farbe"])
      expect(ids.has(assignFromCad({ name: n }, "wall")!.presetId), n).toBe(true);
  });

  it("own texture images: material, website file and storage-safe names", async () => {
    const key = textureKey("Eiche_Diele.JPG");
    expect(key).toBe("eiche_diele.jpg");
    expect(textureKey("Größe & Fuge (1).PNG")).toBe("groesse_fuge_1.png");
    expect(textureDocId(key)).toMatch(/^[A-Za-z0-9_-]+$/);
    const custom: MaterialPreset = { id: "img:holz_eiche_geoelt", label: { de: "Holz Eiche geölt", en: "Holz Eiche geölt" }, color: "#8a6a4a", roughness: 0.8, metalness: 0, texture: "none", scale: 2, group: "cad", image: key, cadName: "Holz Eiche geölt" };
    setCustomPresets([custom]);
    expect(resolvePreset("img:holz_eiche_geoelt")?.image).toBe(key);
    const scene = prepareScene(model);
    for (const p of scene.parts) if (p.cadMaterial === "Holz Eiche geölt") p.auto = { presetId: custom.id, reason: "cad" };
    const project = { ...newProject("x.dxf", "abc"), customMaterials: [custom] };
    const pub = buildPublicScene(scene, project);
    expect(pub.config.materials[custom.id].image).toBe(key);
    const files = await generateSite({ project, scene, pub, runtime: new Uint8Array([1]), readAsset: async () => null, textures: [{ name: key, data: new Uint8Array([7, 7]) }, { name: "unused.png", data: new Uint8Array([1]) }] });
    expect(files.get(`assets/tex-user/${key}`)).toEqual(new Uint8Array([7, 7]));
    expect(files.has("assets/tex-user/unused.png")).toBe(false);
    // no CAD/layer names leak into the published files except the material label the user sees
    expect(new TextDecoder().decode(files.get("assets/scene.json")!)).not.toContain("WALL_A");
  });
});

describe("ZIP reader", () => {
  // build a small ZIP (one stored, one deflated entry, a folder, and a UTF-8 name) by hand
  function zip(entries: { name: string; data: Uint8Array; deflate?: boolean }[]) {
    const enc = new TextEncoder();
    const locals: Uint8Array[] = [], central: Uint8Array[] = [];
    let off = 0;
    for (const e of entries) {
      const name = enc.encode(e.name);
      const body = e.deflate ? new Uint8Array(deflateRawSync(e.data)) : e.data;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(6, 0x800, true); lh.setUint16(8, e.deflate ? 8 : 0, true);
      lh.setUint32(18, body.length, true); lh.setUint32(22, e.data.length, true); lh.setUint16(26, name.length, true);
      const local = new Uint8Array([...new Uint8Array(lh.buffer), ...name, ...body]);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(8, 0x800, true); ch.setUint16(10, e.deflate ? 8 : 0, true);
      ch.setUint32(20, body.length, true); ch.setUint32(24, e.data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array([...new Uint8Array(ch.buffer), ...name]));
      locals.push(local); off += local.length;
    }
    const cd = central.reduce((n, c) => n + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, cd, true); end.setUint32(16, off, true);
    const parts = [...locals, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
    let o = 0; for (const x of parts) { out.set(x, o); o += x.length; }
    return out;
  }

  it("reads stored and deflated entries with UTF-8 names and skips folders", async () => {
    const text = new TextEncoder().encode("0\r\nSECTION\r\n".repeat(200));
    const z = zip([{ name: "Haus/", data: new Uint8Array() }, { name: "Haus/Wohnhaus.dxf", data: text, deflate: true }, { name: "Haus/Ziegel ä.png", data: new Uint8Array([137, 80, 78, 71]) }]);
    const out = await unzip(z);
    expect(out.map((e) => e.name)).toEqual(["Haus/Wohnhaus.dxf", "Haus/Ziegel ä.png"]);
    expect(out[0].data).toEqual(text);
    expect(out[1].data).toEqual(new Uint8Array([137, 80, 78, 71]));
    expect((await unzip(z, (n) => n.endsWith(".png"))).length).toBe(1);
  });

  it("rejects files that are not ZIPs", async () => {
    await expect(unzip(new TextEncoder().encode("not a zip at all"))).rejects.toThrow(/kein gültiges ZIP/);
  });
});
