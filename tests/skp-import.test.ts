import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { importSkp, cleanSkpName } from "../src/core/skp/import";
import { prepareScene } from "../src/core/scene";
import { newProject } from "../src/core/project";
import { buildPublicScene } from "../src/core/export/public-scene";
import { setCustomPresets, type MaterialPreset } from "../src/core/materials";

const fx = (n: string) => new Uint8Array(readFileSync(new URL(`./fixtures/skp/${n}`, import.meta.url)));

describe("SketchUp import", () => {
  it("reads a current SketchUp file (2021+ format) into metres, Y-up, grounded", () => {
    const { model } = importSkp(fx("nesting_2021.skp"));
    expect(model.ok).toBe(true);
    expect(model.meshes.length).toBeGreaterThan(0);
    expect(model.stats.version).toMatch(/SketchUp 25/);
    expect(model.units.toMeters).toBe(1);
    expect(model.bbox.min[1]).toBeCloseTo(0, 5); // lowest point on the ground
    expect(model.layers.map((l) => l.name)).toContain("Layer0");
  });

  it("brings the embedded texture image and SketchUp's own texture coordinates", () => {
    const { model, images } = importSkp(fx("legacy_v2020_textured.skp"));
    const cm = model.materials.find((m) => m.name === "Checker")!;
    expect(cm.map).toMatch(/^checker\.(png|jpg)$/);
    expect(cm.sourceUv).toBe(true);
    expect(images.map((i) => i.name)).toEqual([cm.map]);
    expect([...images[0].data.subarray(1, 4)].map((c) => String.fromCharCode(c)).join("") + "|" + images[0].data[0]).toMatch(/PNG|216/); // PNG or JPEG bytes
    const textured = model.meshes.find((m) => m.material === "Checker")!;
    expect(textured.uvs!.length).toBe((textured.positions.length / 3) * 2);
    // the scene keeps the source UVs, and the published scene uses them for the own texture
    const scene = prepareScene(model);
    const part = scene.parts.find((p) => p.cadMaterial === "Checker")!;
    expect(part.uvTex).toBeDefined();
    const custom: MaterialPreset = { id: "img:checker", label: { de: "Checker", en: "Checker" }, color: "#ffffff", roughness: 0.8, metalness: 0, texture: "none", scale: 1, group: "cad", image: cm.map, cadName: "Checker", sourceUv: true };
    setCustomPresets([custom]);
    part.auto = { presetId: custom.id, reason: "cad" };
    const project = { ...newProject("x.skp", "abc"), customMaterials: [custom] };
    const pub = buildPublicScene(scene, project);
    expect(pub.config.materials[custom.id].sourceUv).toBe(true);
  });

  it("faces without a material stay neutral (not SketchUp's red default tag colour)", () => {
    const { model } = importSkp(fx("legacy_v2020_textured.skp"));
    const plain = model.meshes.find((m) => !m.material);
    if (plain) expect(plain.color).toBe(0xdddddd);
  });

  it("cleans SketchUp library names", () => {
    expect(cleanSkpName("[Roofing Tile Spanish]")).toBe("Roofing Tile Spanish");
    expect(cleanSkpName("0037_SandyBrown")).toBe("SandyBrown");
    expect(cleanSkpName("*1")).toBe("");
  });

  it("explains what to do with older files it cannot read", () => {
    expect(() => importSkp(fx("sdk_saved_tag_line_styles_materials_2020.skp"))).toThrow(/Speichern unter.*2021/);
    expect(() => importSkp(new TextEncoder().encode("kein sketchup"))).toThrow(/SketchUp-Datei/);
  });
});
