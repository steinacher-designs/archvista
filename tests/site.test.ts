import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildPublicScene } from "../src/core/export/public-scene";
import { newProject, TEMPLATES, ENVIRONMENTS } from "../src/core/project";
import { generateSite, gitBlobSha } from "../src/core/site/generate";

const model = importDxf(readFileSync(new URL("./fixtures/models/house_mm.dxf", import.meta.url), "utf8"));
const scene = prepareScene(model);
const readAsset = async (p: string) => { const f = new URL(`../assets-lib/${p}`, import.meta.url); return existsSync(f) ? new Uint8Array(readFileSync(f)) : null; };
const runtime = new TextEncoder().encode("/* runtime */");

async function site(mut: (p: ReturnType<typeof newProject>) => void = () => {}) {
  const project = newProject("house_mm.dxf", "abc");
  project.hotspots = scene.hotspotSuggestions;
  project.viewpoints = scene.viewpoints;
  mut(project);
  const pub = buildPublicScene(scene, project);
  return { files: await generateSite({ project, scene, pub, runtime, readAsset }), project, pub };
}
const html = (f: Map<string, Uint8Array>) => new TextDecoder().decode(f.get("index.html")!);

describe("website generator", () => {
  it("renders all ten templates, each visibly different and complete", async () => {
    const pages: string[] = [];
    for (const t of TEMPLATES) {
      const { files } = await site((p) => { p.template = t.id; p.title = "Haus am See"; p.description = "Ein Wohnhaus.\n\nZweiter Absatz."; p.author = "Studio Muster"; });
      const h = html(files);
      expect(h).toContain("data-archvista");
      expect(h).toContain('src="assets/viewer.js"');
      expect(h).toContain("Haus am See");
      expect(h).toContain("Studio Muster");
      expect(h).toMatch(/<html lang="de">/);
      pages.push(h);
    }
    // the <style> blocks must all differ (genuinely different designs, not recoloured copies)
    const styles = pages.map((p) => p.match(/<style>([\s\S]*?)<\/style>/)![1]);
    expect(new Set(styles).size).toBe(10);
    expect(TEMPLATES.length).toBe(10);
  });

  it("uses only relative URLs, so GitHub Pages sub paths and offline folders work", async () => {
    for (const t of TEMPLATES) {
      const { files } = await site((p) => { p.template = t.id; });
      const urls = [...html(files).matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
      for (const u of urls) expect(u.startsWith("/") || u.startsWith("file:"), `${t.id}: ${u}`).toBe(false);
    }
  });

  it("ships no rendered stills; info text and plans appear only when filled in", async () => {
    for (const t of TEMPLATES) {
      const project = newProject("house_mm.dxf", "abc");
      project.template = t.id; project.hotspots = scene.hotspotSuggestions; project.viewpoints = scene.viewpoints;
      const pub = buildPublicScene(scene, project);
      const files = await generateSite({ project, scene, pub, runtime, readAsset });
      const h = html(files);
      expect(h).not.toMatch(/Highlights|Galerie|<img/);
      expect([...files.keys()].filter((k) => k.startsWith("images/"))).toEqual([]);
      expect(h, t.id).not.toContain('id="plaene"');
      expect(h, t.id).not.toContain('class="txt"><p');
      expect(h).toContain("data-archvista");
    }
  });

  it("escapes user text", async () => {
    const { files } = await site((p) => { p.title = '<script>alert(1)</script>"'; });
    expect(html(files)).not.toContain("<script>alert(1)</script>");
    expect(html(files)).toContain("&lt;script&gt;");
  });

  it("ships the 3D scene, runtime and only the needed library assets for each environment", async () => {
    for (const env of ENVIRONMENTS) {
      const { files } = await site((p) => { p.environment = env.id; p.lighting = "evening"; });
      const keys = [...files.keys()];
      expect(keys).toEqual(expect.arrayContaining(["index.html", "credits.html", "assets/scene.glb", "assets/scene.json", "assets/viewer.js", ".nojekyll"]));
      const hdr = keys.filter((k) => k.endsWith(".hdr"));
      expect(hdr).toEqual([env.id === "studio" ? "assets/lib/hdri/studio.hdr" : `assets/lib/hdri/env_${env.id}.hdr`]);
      if (env.id !== "studio") expect(keys).toContain(`assets/lib/hdri/env_${env.id}_bg.webp`);
      expect(keys.some((k) => k.includes("/models/"))).toBe(false); // photo surroundings need no plant models
      // only textures of materials actually used (+ environment ground)
      expect(keys).not.toContain("assets/lib/tex/brick_col.webp");
    }
  });

  it("credits page lists the CC0 sources that are actually included", async () => {
    const { files } = await site((p) => { p.environment = "forest"; });
    const c = new TextDecoder().decode(files.get("credits.html")!);
    expect(c).toMatch(/CC0/);
    expect(c).toMatch(/polyhaven\.com/);
    expect(c).toMatch(/Alps Field/); // the panorama of the nature environment
    expect(c).not.toMatch(/Spiaggia/i); // beach panorama not shipped in the nature site
  });

  it("facts are measured and exclude hidden rooms", async () => {
    const all = html((await site()).files);
    const upper = scene.analysis.rooms.filter((r) => r.level === 1);
    const lv = scene.analysis.levels[1];
    const hidden = html((await site((p) => {
      p.zones = [{ id: "g", kind: "grey", polygon: upper[0].outline, yMin: lv.elevation - 0.2, yMax: lv.elevation + lv.height - 0.05, source: "room", roomId: upper[0].id, level: 1 }];
    })).files);
    const area = (h: string) => +(h.match(/([\d.]+) m²/)![1].replace(".", ""));
    expect(area(hidden)).toBeLessThan(area(all));
  });

  it("git blob SHA matches git's algorithm", async () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(await gitBlobSha(new TextEncoder().encode("hello\n"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });
});

describe("v1.1: documents, places, storey names, materials", () => {
  const doc = (id: string, folder: string, fileName: string, size = 3) => ({ id, folder, title: fileName.replace(/\.[^.]+$/, ""), fileName, size, addedAt: "" });
  const bytes = (s: string) => new TextEncoder().encode(s);

  it("ships documents as real files grouped by folder, in every design", async () => {
    for (const t of TEMPLATES) {
      const project = newProject("house_mm.dxf", "abc");
      project.template = t.id;
      project.documents = [doc("a", "Pläne", "Grundriss EG.pdf"), doc("b", "Pläne", "Grundriss EG.pdf"), doc("c", "Details", "Fenster D1.dwg", 2_500_000)];
      const pub = buildPublicScene(scene, project);
      const files = await generateSite({ project, scene, pub, runtime, readAsset, documents: project.documents.map((d) => ({ doc: d, data: bytes(d.id) })) });
      expect(new TextDecoder().decode(files.get("downloads/Pläne/Grundriss EG.pdf")!)).toBe("a");
      expect(new TextDecoder().decode(files.get("downloads/Pläne/Grundriss EG (2).pdf")!)).toBe("b");
      expect(files.has("downloads/Details/Fenster D1.dwg")).toBe(true);
      const h = html(files);
      expect(h).toContain('id="plaene"');
      expect(h).toMatch(/Pläne &amp; Unterlagen|Pläne & Unterlagen/);
      expect(h).toContain('href="downloads/Pl%C3%A4ne/Grundriss%20EG.pdf" target="_blank"'); // PDFs open in the browser
      expect(h).toContain('href="downloads/Details/Fenster%20D1.dwg" download'); // DWGs download
      expect(h).toMatch(/2,5 MB/);
    }
  });

  it("no documents → no section", async () => {
    expect(html((await site()).files)).not.toContain('id="plaene"');
  });

  it("own places and renamed / hidden storeys reach the website; places in hidden areas are dropped", async () => {
    const upper = scene.analysis.rooms.filter((r) => r.level === 1);
    const lv = scene.analysis.levels[1];
    const { pub } = await site((p) => {
      p.levelNames = { 0: "Wohnen" };
      p.hiddenLevels = [2];
      p.places = [
        { id: "k", name: "Küche", position: [upper[0].centroid[0], lv.elevation + 1.65, upper[0].centroid[1]], target: [0, 0, 0], walk: true },
        { id: "g", name: "Geheim", position: [upper[1].centroid[0], lv.elevation + 1.65, upper[1].centroid[1]], target: [0, 0, 0], walk: true },
      ];
      p.zones = [{ id: "z", kind: "grey", polygon: upper[1].outline, yMin: lv.elevation - 0.2, yMax: lv.elevation + lv.height, source: "room", roomId: upper[1].id, level: 1 }];
    });
    expect(pub.config.levels[0].name.de).toBe("Wohnen");
    expect(pub.config.levels.find((l) => l.hidden)).toBeTruthy();
    expect(pub.config.places.map((p) => p.name)).toEqual(["Küche"]);
  });

  it("offers many materials, each in a picker group; colour variants keep the base texture", async () => {
    const { PRESETS, resolvePreset, withColour } = await import("../src/core/materials");
    expect(PRESETS.length).toBeGreaterThanOrEqual(45);
    for (const p of PRESETS) expect(p.group).toBeTruthy();
    const v = resolvePreset(withColour("brick", "#123456"))!;
    expect(v.color).toBe("#123456");
    expect(v.tex).toBe("brick");
    // a site using a colour variant ships the base texture
    const part = scene.parts.find((p) => p.category === "wall")!;
    const { files } = await site((p) => { p.materialOverrides[part.key] = "marble_white"; p.materialColors = { [part.key]: "#ff0000" }; });
    expect(files.has("assets/lib/tex/marble_white_col.webp")).toBe(true);
    const cfg = JSON.parse(new TextDecoder().decode(files.get("assets/scene.json")!));
    expect(Object.keys(cfg.materials)).toContain("marble_white~#ff0000");
  });
});

describe("own surroundings (360° panorama)", () => {
  const ce = { file: "mein_platz.hdr", kind: "hdr" as const, name: "Mein Platz.hdr", size: 3, rotation: 90, ground: "paving" as const };

  it("goes into the website config and ships the panorama + chosen ground", async () => {
    const project = newProject("house_mm.dxf", "abc");
    project.environment = "custom"; project.customEnv = ce;
    const pub = buildPublicScene(scene, project);
    expect(pub.config.environment).toBe("custom");
    expect(pub.config.customEnv).toEqual({ file: "mein_platz.hdr", kind: "hdr", rotation: 90, ground: "paving" });
    expect(JSON.stringify(pub.config)).not.toContain("Mein Platz"); // only what the viewer needs
    const files = await generateSite({ project, scene, pub, runtime, readAsset, environmentFile: { name: "mein_platz.hdr", data: new Uint8Array([1, 2, 3]) } });
    expect(files.get("assets/env-user/mein_platz.hdr")).toEqual(new Uint8Array([1, 2, 3]));
    const keys = [...files.keys()];
    expect(keys.some((k) => k.includes("/hdri/"))).toBe(false); // no built-in panorama needed
    expect(keys).toContain("assets/lib/tex/env_paving_col.webp");
  });

  it("falls back to the studio when the panorama is missing, and ships nothing extra for 'photo only'", async () => {
    const p1 = newProject("house_mm.dxf", "abc"); p1.environment = "custom";
    expect(buildPublicScene(scene, p1).config.environment).toBe("studio");
    const p2 = newProject("house_mm.dxf", "abc"); p2.environment = "custom"; p2.customEnv = { ...ce, ground: "photo" };
    const pub = buildPublicScene(scene, p2);
    const files = await generateSite({ project: p2, scene, pub, runtime, readAsset });
    expect([...files.keys()].some((k) => k.includes("/tex/env_") || k.includes("/tex/grass"))).toBe(false);
  });
});
