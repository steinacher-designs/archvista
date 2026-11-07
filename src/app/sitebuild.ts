// ARCHVISTA — assemble the website: public scene, runtime, downloads and static files (no rendered stills).
import { buildPublicScene } from "../core/export/public-scene";
import { generateSite, type FileMap } from "../core/site/generate";
import type { PreparedScene } from "../core/scene";
import type { Project, Viewpoint } from "../core/project";
import { platform } from "./platform";
import { textureDocId } from "../core/materials";

export async function buildSiteFiles(project: Project, scene: PreparedScene, onProgress?: (f: number, label: string) => void): Promise<{ files: FileMap; ms: number }> {
  const t0 = performance.now();
  onProgress?.(0.05, "3D-Modell wird vorbereitet");
  const pub = buildPublicScene(scene, project);
  onProgress?.(0.75, "Website-Dateien werden geschrieben");
  const runtime = await platform.readBundled("site-runtime/viewer.js");
  if (!runtime) throw new Error("Website-Laufzeit fehlt in der Installation (site-runtime/viewer.js).");
  onProgress?.(0.8, "Pläne & Unterlagen werden eingebunden");
  const documents: { doc: NonNullable<Project["documents"]>[number]; data: Uint8Array }[] = [];
  for (const doc of project.documents ?? []) {
    const data = await platform.loadDocument(project.id, doc.id);
    if (data) documents.push({ doc, data });
  }
  const textures: { name: string; data: Uint8Array }[] = [];
  for (const m of project.customMaterials ?? []) {
    if (!m.image) continue;
    const data = await platform.loadDocument(project.id, textureDocId(m.image));
    if (data) textures.push({ name: m.image, data });
  }
  const files = await generateSite({ project, scene, pub, runtime, readAsset: (p) => platform.readBundled(`assets-lib/${p}`), documents, textures });
  onProgress?.(1, "Fertig");
  return { files, ms: performance.now() - t0 };
}

/** Hero first (main facade), then aerial, entrance, and up to two interior views. */
export function pickGalleryViews(vps: Viewpoint[]): Viewpoint[] {
  const by = (id: string) => vps.find((v) => v.id === id);
  const list = [by("ext0"), by("aerial"), by("ext1"), by("entry"), ...vps.filter((v) => v.id.startsWith("room")).slice(0, 2)].filter(Boolean) as Viewpoint[];
  return list.slice(0, 6);
}
