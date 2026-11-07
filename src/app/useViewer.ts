// ARCHVISTA — keeps the live 3D view in sync with the project (incremental: only what changed is rebuilt).
import { useEffect, useRef } from "react";
import { ArchViewer } from "../viewer/viewer";
import { publicConfig, publicParts } from "../core/export/public-scene";
import type { PreparedScene } from "../core/scene";
import type { Project, Hotspot } from "../core/project";

let current: ArchViewer | null = null;
export const getViewer = () => current;

export function useViewer(host: React.RefObject<HTMLDivElement | null>, scene: PreparedScene | null, project: Project | null, opts: { lang: "de" | "en"; onPick?: (p: [number, number, number]) => void; onHotspot?: (h: Hotspot) => void }) {
  const viewer = useRef<ArchViewer | null>(null);
  const pickRef = useRef(opts.onPick);
  pickRef.current = opts.onPick;
  const hsRef = useRef(opts.onHotspot);
  hsRef.current = opts.onHotspot;

  useEffect(() => {
    if (!host.current) return;
    const v = new ArchViewer(host.current, {
      language: opts.lang, assetBase: "/assets-lib/", preserveDrawingBuffer: true,
      onHotspot: (h) => hsRef.current?.(h),
    });
    const cap = localStorage.getItem("av-maxfps"); if (cap !== null) v.maxFps = Number(cap);
    viewer.current = v; current = v;
    return () => { v.dispose(); viewer.current = null; current = null; };
  }, [host]);

  // enable picking only when requested
  useEffect(() => {
    const v = viewer.current;
    v?.setPickHandler(opts.onPick ? (p) => pickRef.current?.(p) : null);
  }, [!!opts.onPick]);

  // geometry: rebuild when the scene, hidden areas or materials change
  const greyKey = project ? JSON.stringify(project.zones.filter((z) => z.kind === "grey")) : "";
  const matKey = project ? JSON.stringify([project.materialOverrides, project.materialColors]) : "";
  useEffect(() => {
    const v = viewer.current;
    if (!v || !scene || !project) return;
    const id = setTimeout(() => {
      const pp = publicParts(scene, project);
      const cfg = publicConfig(scene, project, new Set(pp.parts.map((p) => p.presetId)));
      v.setBuilding(pp.parts, cfg);
    }, 60);
    return () => clearTimeout(id);
  }, [scene, greyKey, matKey]);

  // light-weight updates
  useEffect(() => { if (project) viewer.current?.setEnvironment(project.environment); }, [project?.environment]);
  useEffect(() => { if (project) viewer.current?.setLighting(project.lighting); }, [project?.lighting]);
  useEffect(() => { if (project) viewer.current?.setQuality(project.quality); }, [project?.quality]);
  const redKey = project ? JSON.stringify(project.zones.filter((z) => z.kind === "red")) : "";
  useEffect(() => {
    if (!project) return;
    viewer.current?.setBarriers(project.zones.filter((z) => z.kind === "red" && z.polygon.length >= 3).map((z) => ({ polygon: z.polygon, yMin: z.yMin, yMax: z.yMax })));
  }, [redKey]);
  const hsKey = project ? JSON.stringify(project.hotspots) : "";
  useEffect(() => { if (project) viewer.current?.setHotspots(project.hotspots); }, [hsKey]);
  useEffect(() => { viewer.current?.setLanguage(opts.lang); }, [opts.lang]);
  const placesKey = project ? JSON.stringify([project.places, project.levelNames, project.hiddenLevels]) : "";
  useEffect(() => {
    if (!project || !scene) return;
    const cfg = publicConfig(scene, project, new Set());
    viewer.current?.setPlaces(cfg.places, cfg.levels);
  }, [placesKey]);
  useEffect(() => { viewer.current?.setCinematic(project?.template === "cinema"); }, [project?.template]);
  return viewer;
}
