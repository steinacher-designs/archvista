// ARCHVISTA — build the public, privacy-safe scene (GLB + JSON) that the website loads.

import type { PreparedScene } from "../scene";
import type { Project, Hotspot, Viewpoint, EnvironmentId, Quality, Lighting } from "../project";
import { Zone, removeGreyGeometry, pointInZone } from "../zones";
import { PRESET, MaterialPreset } from "../materials";
import { writeGlb } from "./glb";
import { cellOf } from "../analysis/spatial";

export interface PublicLevel { name: { de: string; en: string }; elevation: number; spawn: [number, number, number] | null }

export interface PublicConfig {
  format: "archvista-scene";
  version: 1;
  title: string;
  environment: EnvironmentId;
  lighting: Lighting;
  quality: Quality;
  accent: string;
  language: "de" | "en";
  bbox: { min: [number, number, number]; max: [number, number, number] };
  groundY: number;
  hasTerrain: boolean;
  start: { position: [number, number, number]; yaw: number };
  levels: PublicLevel[];
  /** Only RED zones (needed for enforcement). GREY zones are never published. */
  barriers: { polygon: [number, number][]; yMin: number; yMax: number }[];
  hotspots: Hotspot[];
  viewpoints: Viewpoint[];
  tour: boolean;
  materials: Record<string, MaterialPreset>;
  /** Interior light positions (evening scenes); never inside hidden areas. */
  lights: [number, number, number][];
}

export function effectiveZones(project: Project): Zone[] {
  return project.zones.filter((z) => z.polygon.length >= 3);
}

export function buildPublicScene(scene: PreparedScene, project: Project) {
  const zones = effectiveZones(project);
  const grey = zones.filter((z) => z.kind === "grey");
  const red = zones.filter((z) => z.kind === "red");
  const blockedAny = (p: [number, number, number], pad = 0) => zones.some((z) => z.kind !== "green" && pointInZone(p, z, pad));

  // 1) geometry with grey parts physically removed
  const meshes = scene.parts.map((p) => ({ id: p.id, layer: p.layer, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: p.indices.length / 3 }));
  const cut = removeGreyGeometry(meshes, grey);
  const byId = new Map(scene.parts.map((p) => [p.id, p]));
  const glbParts = cut.meshes.map((m) => {
    const part = byId.get(m.id)!;
    const presetId = project.materialOverrides[part.key] ?? part.auto.presetId;
    // UVs must be recomputed for clipped meshes (vertex layout changed)
    const uvs = m.positions === part.positions ? part.uvs : boxUV(m.positions, m.normals);
    return { presetId, positions: m.positions, normals: m.normals, uvs, indices: m.indices };
  });
  const glb = writeGlb(glbParts);

  // 2) levels & spawn points (walkable, not restricted)
  const a = scene.analysis;
  const levels: PublicLevel[] = a.plans.map((p) => {
    const g = a.grid;
    const rooms = a.rooms.filter((r) => r.level === p.level.index && r.covered).sort((x, y) => y.area - x.area);
    let spawn: [number, number, number] | null = null;
    const candidates: [number, number][] = rooms.map((r) => r.centroid);
    for (const [x, z] of candidates) {
      const c = cellOf(g, x, z);
      if (c < 0 || !p.walkable[c]) continue;
      const pt: [number, number, number] = [x, p.floorY[c] + 0.05, z];
      if (!blockedAny([pt[0], pt[1] + 0.5, pt[2]], 0.4)) { spawn = pt; break; }
    }
    if (!spawn) {
      // any walkable unrestricted cell
      for (let c = 0; c < p.walkable.length && !spawn; c += 7) {
        if (!p.walkable[c] || p.room[c] < 0) continue;
        const x = g.x0 + ((c % g.nx) + 0.5) * g.cell, z = g.z0 + (((c / g.nx) | 0) + 0.5) * g.cell;
        const pt: [number, number, number] = [x, p.floorY[c] + 0.05, z];
        if (!blockedAny([x, pt[1] + 0.5, z], 0.4)) spawn = pt;
      }
    }
    return { name: p.level.name, elevation: p.level.elevation, spawn };
  });

  // 3) hotspots & viewpoints that would reveal hidden or restricted areas are dropped
  const hotspots = project.hotspots.filter((h) => !grey.some((z) => pointInZone(h.position, z, 0.1)));
  const viewpoints = (project.viewpoints.length ? project.viewpoints : scene.viewpoints).filter((v) => !blockedAny(v.position, 0.3));

  const used = new Set(glbParts.map((p) => p.presetId));
  const materials: Record<string, MaterialPreset> = {};
  for (const id of used) { const pr = PRESET.get(id); if (pr) materials[id] = pr; }

  let start = scene.start;
  if (blockedAny([start.position[0], start.position[1] + 0.5, start.position[2]], 0.4)) {
    const lv = levels.find((l) => l.spawn);
    if (lv) start = { position: lv.spawn!, yaw: 0, outside: false };
  }

  const lights: [number, number, number][] = a.rooms
    .filter((r) => r.covered && r.area >= 4)
    .map((r) => [r.centroid[0], a.levels[r.level].elevation + Math.min(2.3, a.levels[r.level].height - 0.4), r.centroid[1]] as [number, number, number])
    .filter((p) => !grey.some((z) => pointInZone(p, z, 0.5)));

  const config: PublicConfig = {
    format: "archvista-scene", version: 1,
    title: project.title, environment: project.environment, lighting: project.lighting ?? "afternoon", quality: project.quality, accent: project.accent, language: project.language,
    bbox: scene.bbox, groundY: a.groundY,
    hasTerrain: scene.parts.some((p) => p.category === "terrain"),
    start: { position: start.position, yaw: start.yaw },
    levels: levels.filter((l) => l.spawn),
    barriers: red.map((z) => ({ polygon: z.polygon, yMin: z.yMin, yMax: z.yMax })),
    hotspots, viewpoints, tour: project.tour, materials, lights,
  };
  return {
    glb, config,
    stats: { removedTriangles: cut.removedTriangles, clippedTriangles: cut.clippedTriangles, triangles: glbParts.reduce((n, p) => n + p.indices.length / 3, 0) },
  };
}

function boxUV(positions: Float32Array, normals: Float32Array) {
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const ax = Math.abs(normals[i]), ay = Math.abs(normals[i + 1]), az = Math.abs(normals[i + 2]);
    if (ay >= ax && ay >= az) { uv[j] = positions[i]; uv[j + 1] = positions[i + 2]; }
    else if (ax >= az) { uv[j] = positions[i + 2]; uv[j + 1] = positions[i + 1]; }
    else { uv[j] = positions[i]; uv[j + 1] = positions[i + 1]; }
  }
  return uv;
}
