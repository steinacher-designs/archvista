// ARCHVISTA — assemble the website: public scene, gallery renders from the live viewer, static files.
import { buildPublicScene } from "../core/export/public-scene";
import { generateSite, type FileMap } from "../core/site/generate";
import type { PreparedScene } from "../core/scene";
import type { Project, Viewpoint } from "../core/project";
import { platform } from "./platform";
import { getViewer } from "./useViewer";

const renderCache = new Map<string, Uint8Array>();

export async function buildSiteFiles(project: Project, scene: PreparedScene, onProgress?: (f: number, label: string) => void): Promise<{ files: FileMap; ms: number }> {
  const t0 = performance.now();
  onProgress?.(0.05, "3D-Modell wird vorbereitet");
  const pub = buildPublicScene(scene, project);
  onProgress?.(0.25, "Titelbild wird gerendert");
  const renders: { id: string; caption: string; data: Uint8Array }[] = [];
  const viewer = getViewer();
  // only the title image is rendered (no gallery); skipped when the user supplied an own image
  const shots = project.images.length ? [] : pickGalleryViews(pub.config.viewpoints).slice(0, 1);
  if (viewer) {
    await viewer.assetsSettled(20000);
    for (let i = 0; i < shots.length; i++) {
      const vp = shots[i];
      // same settings → same picture: reuse earlier renders (incremental republishing)
      const key = JSON.stringify([vp, project.environment, project.lighting, project.materialOverrides, project.zones, project.template === "cinema"]);
      let data = renderCache.get(key);
      if (!data) {
        const blob = await viewer.capture(vp, 1600, 1000);
        data = new Uint8Array(await blob.arrayBuffer());
        renderCache.set(key, data);
      }
      renders.push({ id: `view-${vp.id}`, caption: vp.name, data });
      onProgress?.(0.25 + 0.45 * ((i + 1) / shots.length), "Titelbild wird gerendert");
    }
  }
  onProgress?.(0.75, "Website-Dateien werden geschrieben");
  const runtime = await platform.readBundled("site-runtime/viewer.js");
  if (!runtime) throw new Error("Website-Laufzeit fehlt in der Installation (site-runtime/viewer.js).");
  onProgress?.(0.8, "Pläne & Unterlagen werden eingebunden");
  const documents: { doc: NonNullable<Project["documents"]>[number]; data: Uint8Array }[] = [];
  for (const doc of project.documents ?? []) {
    const data = await platform.loadDocument(project.id, doc.id);
    if (data) documents.push({ doc, data });
  }
  const files = await generateSite({ project, scene, pub, runtime, readAsset: (p) => platform.readBundled(`assets-lib/${p}`), renders, documents });
  onProgress?.(1, "Fertig");
  return { files, ms: performance.now() - t0 };
}

/** Hero first (main facade), then aerial, entrance, and up to two interior views. */
export function pickGalleryViews(vps: Viewpoint[]): Viewpoint[] {
  const by = (id: string) => vps.find((v) => v.id === id);
  const list = [by("ext0"), by("aerial"), by("ext1"), by("entry"), ...vps.filter((v) => v.id.startsWith("room")).slice(0, 2)].filter(Boolean) as Viewpoint[];
  return list.slice(0, 6);
}
