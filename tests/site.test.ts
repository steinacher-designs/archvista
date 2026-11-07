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
  it("renders all six templates, each visibly different and complete", async () => {
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
    expect(new Set(styles).size).toBe(6);
  });

  it("uses only relative URLs, so GitHub Pages sub paths and offline folders work", async () => {
    for (const t of TEMPLATES) {
      const { files } = await site((p) => { p.template = t.id; });
      const urls = [...html(files).matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
      for (const u of urls) expect(u.startsWith("/") || u.startsWith("file:"), `${t.id}: ${u}`).toBe(false);
    }
  });

  it("has no highlights or gallery section; only one title image is shipped", async () => {
    const renders = ["a", "b", "c"].map((id) => ({ id, caption: id, data: new Uint8Array([1, 2, 3]) }));
    for (const t of TEMPLATES) {
      const project = newProject("house_mm.dxf", "abc");
      project.template = t.id; project.hotspots = scene.hotspotSuggestions; project.viewpoints = scene.viewpoints;
      const pub = buildPublicScene(scene, project);
      const files = await generateSite({ project, scene, pub, runtime, readAsset, renders });
      const h = html(files);
      expect(h).not.toMatch(/Highlights|Galerie|id="galerie"|class="hls"|class="gal"/);
      expect([...files.keys()].filter((k) => k.startsWith("images/"))).toEqual(["images/a.jpg"]);
      if (t.id !== "cinema" && t.id !== "swiss") expect(h).toContain('src="images/a.jpg"');
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
