import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildPublicScene, partMaterialId } from "../src/core/export/public-scene";
import { readGlb } from "../src/core/export/glb";
import { newProject } from "../src/core/project";
import { resolvePreset, setCustomPresets, type MaterialPreset } from "../src/core/materials";

const model = importDxf(readFileSync(new URL("./fixtures/models/house_mm.dxf", import.meta.url), "utf8"));
const scene = prepareScene(model);

describe("own materials & materials to try (info point add-on)", () => {
  const target = scene.parts[0];
  const own: MaterialPreset = { id: "own:abc123", label: { de: "Stoff Petrol", en: "Stoff Petrol" }, color: "#2f6b6b", roughness: 0.88, metalness: 0, texture: "none", scale: 1, group: "own", image: "own-abc123-stoff.jpg" };
  const project = () => {
    const p = newProject("house_mm.dxf", "abc");
    p.customMaterials = [own];
    p.hotspots = [{ id: "sofa", position: [0, 1, 0], title: "Couch", text: "", variants: { part: target.key, options: [{ id: "plaster_white~#475480", name: "Blau" }, { id: own.id, name: "" }] } }];
    return p;
  };

  it("own materials resolve like built-in ones, also with a colour", () => {
    setCustomPresets([own]);
    expect(resolvePreset(own.id)?.label.de).toBe("Stoff Petrol");
    expect(resolvePreset(`${own.id}~#ff0000`)?.color).toBe("#ff0000");
  });

  it("publishes the variants with an anonymous tag, the materials, and a separate mesh", () => {
    const p = project();
    const pub = buildPublicScene(scene, p);
    const h = pub.config.hotspots.find((x) => x.id === "sofa")!;
    expect(h.variants?.part).toBe("v1");
    expect(h.variants?.original).toBe(partMaterialId(target, p));
    expect(h.variants?.options.map((o) => o.name)).toEqual(["Blau", "Stoff Petrol"]);
    for (const id of ["plaster_white~#475480", own.id, h.variants!.original!]) expect(pub.config.materials[id]).toBeTruthy();
    const { json } = readGlb(pub.glb);
    const tagged = json.nodes.filter((n: { extras?: { av?: string } }) => n.extras?.av === "v1");
    expect(tagged.length).toBeGreaterThan(0);
    // no layer names on the website
    expect(JSON.stringify(pub.config)).not.toContain(target.key);
  });

  it("without the add-on nothing changes", () => {
    const p = project();
    const before = buildPublicScene(scene, { ...p, hotspots: [] });
    expect(before.config.hotspots).toEqual([]);
    expect(readGlb(before.glb).json.nodes.some((n: { extras?: unknown }) => n.extras)).toBe(false);
    const empty = buildPublicScene(scene, { ...p, hotspots: [{ ...p.hotspots[0], variants: { part: target.key, options: [] } }] });
    expect(empty.config.hotspots[0].variants).toBeUndefined();
  });
});
