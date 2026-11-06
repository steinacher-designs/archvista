// ARCHVISTA — automatic scene preparation: import result → categorised, textured parts + analysis + suggestions.

import type { ImportedModel, ModelMesh } from "./dxf/import";
import { Category, categoryFromLayer, classifyMesh, triNormalArea } from "./analysis/classify";
import { analyse, SpatialAnalysis, cellOf } from "./analysis/spatial";
import { assignMaterial, boxUVs, Role, Assignment } from "./materials";
import type { Hotspot, Viewpoint } from "./project";

export interface ScenePart {
  id: string;
  /** Stable key used for user overrides across re-imports. */
  key: string;
  layer: string;
  category: Category;
  basis: "layer" | "geometry";
  role: Role;
  color: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  auto: Assignment;
}

export interface PreparedScene {
  parts: ScenePart[];
  analysis: SpatialAnalysis;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  start: { position: [number, number, number]; yaw: number; outside: boolean };
  viewpoints: Viewpoint[];
  hotspotSuggestions: Hotspot[];
  timings: Record<string, number>;
}

const SPLIT_ROLES: Category[] = ["floor", "ceiling", "terrace", "roof"];

function subMesh(m: ModelMesh, tris: number[]): Omit<ModelMesh, "id" | "layer" | "color"> {
  const map = new Map<number, number>();
  const pos: number[] = [], nrm: number[] = [];
  const idx = new Uint32Array(tris.length);
  tris.forEach((v, j) => {
    let n = map.get(v);
    if (n === undefined) {
      n = pos.length / 3; map.set(v, n);
      pos.push(m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]);
      nrm.push(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]);
    }
    idx[j] = n;
  });
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: idx, triangleCount: idx.length / 3 };
}

/** Split a mesh into orientation groups. Returns [roleOrCategoryKey, triangle indices]. */
function orientationGroups(m: ModelMesh): Map<string, number[]> {
  const g = new Map<string, number[]>();
  const I = m.indices;
  for (let i = 0; i < I.length; i += 3) {
    const n = triNormalArea(m.positions, I[i], I[i + 1], I[i + 2]);
    const k = n.ny > 0.7 ? "top" : n.ny < -0.7 ? "under" : Math.abs(n.ny) < 0.2 ? "side" : "slope";
    let l = g.get(k);
    if (!l) g.set(k, (l = []));
    l.push(I[i], I[i + 1], I[i + 2]);
  }
  return g;
}

export function partition(meshes: ModelMesh[]): ScenePart[] {
  const parts: ScenePart[] = [];
  let n = 0;
  const make = (m: ModelMesh, sub: Omit<ModelMesh, "id" | "layer" | "color">, category: Category, basis: "layer" | "geometry", role: Role): ScenePart => ({
    id: `p${n++}`,
    key: `${m.layer}|${category}|${role}|${m.color}`,
    layer: m.layer, category, basis, role, color: m.color,
    positions: sub.positions, normals: sub.normals, indices: sub.indices,
    uvs: boxUVs(sub.positions, sub.normals),
    auto: assignMaterial(m.layer, category, role, m.color),
  });
  for (const m of meshes) {
    const byLayer = categoryFromLayer(m.layer);
    if (byLayer && !SPLIT_ROLES.includes(byLayer)) { parts.push(make(m, m, byLayer, "layer", "all")); continue; }
    const groups = orientationGroups(m);
    if (byLayer) {
      // floors / slabs / roofs: different surface per orientation
      for (const [k, tris] of groups) {
        const role: Role = k === "top" ? "top" : k === "under" ? "under" : byLayer === "roof" && k === "slope" ? "all" : "side";
        parts.push(make(m, subMesh(m, tris), byLayer, "layer", role));
      }
      continue;
    }
    // unknown layer: infer category per orientation
    const whole = classifyMesh(m);
    if (groups.size === 1 && whole.category !== "other") {
      const [k] = [...groups.keys()];
      parts.push(make(m, m, whole.category, "geometry", whole.category === "floor" ? (k === "under" ? "under" : "top") : "all"));
      continue;
    }
    for (const [k, tris] of groups) {
      const cat: Category = k === "side" ? "wall" : k === "slope" ? "roof" : "floor";
      const role: Role = k === "top" ? "top" : k === "under" ? "under" : "all";
      parts.push(make(m, subMesh(m, tris), cat, "geometry", role));
    }
  }
  return parts;
}

export function prepareScene(model: ImportedModel, onProgress?: (f: number, label: string) => void): PreparedScene {
  const t0 = performance.now();
  const parts = partition(model.meshes);
  const t1 = performance.now();
  onProgress?.(0.4, "Räume und Geschosse werden erkannt");
  const asMeshes: ModelMesh[] = parts.map((p) => ({ id: p.id, layer: p.layer, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: p.indices.length / 3 }));
  const analysis = analyse({ meshes: asMeshes, categories: new Map(parts.map((p) => [p.id, p.category])), bbox: model.bbox });
  const t2 = performance.now();
  onProgress?.(0.8, "Blickpunkte werden vorgeschlagen");
  const bbox = model.bbox;
  const start = startPosition(analysis, bbox);
  const viewpoints = suggestViewpoints(analysis, bbox, start);
  const hotspotSuggestions = suggestHotspots(analysis);
  onProgress?.(1, "Fertig");
  return {
    parts, analysis, bbox, start, viewpoints, hotspotSuggestions,
    timings: { partition: t1 - t0, analysis: t2 - t1, suggestions: performance.now() - t2 },
  };
}

const EYE = 1.65;

function startPosition(a: SpatialAnalysis, bbox: PreparedScene["bbox"]): PreparedScene["start"] {
  if (a.entrance) {
    const e = a.entrance;
    const x = e.position[0] - e.inward[0] * 3.5, z = e.position[2] - e.inward[1] * 3.5;
    // ground outside the entrance
    return { position: [x, Math.min(e.position[1], a.groundY) + 0.02, z], yaw: Math.atan2(-e.inward[0], -e.inward[1]), outside: true };
  }
  // no entrance: in front of the longest facade, looking at the building
  const cx = (bbox.min[0] + bbox.max[0]) / 2;
  const z = bbox.max[2] + 6;
  return { position: [cx, a.groundY + 0.02, z], yaw: 0, outside: true };
}

function suggestViewpoints(a: SpatialAnalysis, bbox: PreparedScene["bbox"], start: PreparedScene["start"]): Viewpoint[] {
  const cx = (bbox.min[0] + bbox.max[0]) / 2, cz = (bbox.min[2] + bbox.max[2]) / 2;
  const sx = bbox.max[0] - bbox.min[0], sz = bbox.max[2] - bbox.min[2], sy = bbox.max[1] - bbox.min[1];
  const diag = Math.hypot(sx, sz);
  const ty = bbox.min[1] + sy * 0.4;
  const vps: Viewpoint[] = [];
  // main facade direction: towards the start (entrance side)
  const base = Math.atan2(start.position[0] - cx, start.position[2] - cz);
  const names = ["Hauptansicht", "Seitenansicht", "Rückansicht", "Seitenansicht 2"];
  [0.6, -0.6 + Math.PI / 2, Math.PI + 0.6, -Math.PI / 2 - 0.6].forEach((off, i) => {
    const ang = base + off;
    const d = Math.max(diag * 0.95, 12);
    vps.push({ id: `ext${i}`, name: names[i], position: [cx + Math.sin(ang) * d, a.groundY + EYE + sy * 0.15, cz + Math.cos(ang) * d], target: [cx, ty, cz], auto: true });
  });
  vps.push({ id: "aerial", name: "Vogelperspektive", position: [cx + Math.sin(base + 0.7) * diag * 1.1, bbox.max[1] + diag * 0.8, cz + Math.cos(base + 0.7) * diag * 1.1], target: [cx, ty, cz], auto: true });
  if (a.entrance) {
    const e = a.entrance;
    vps.push({ id: "entry", name: "Eingang", position: [start.position[0], start.position[1] + EYE, start.position[2]], target: [e.position[0], e.position[1] + 1.2, e.position[2]], auto: true, walk: true });
  }
  // one interior view per covered room: from the room cell farthest from the centroid
  for (const r of a.rooms.filter((r) => r.covered && r.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    const g = a.grid;
    let best = -1, bd = -1;
    for (let c = 0; c < plan.room.length; c++) {
      if (plan.room[c] !== r.id || !plan.walkable[c]) continue;
      const x = g.x0 + ((c % g.nx) + 0.5) * g.cell, z = g.z0 + (((c / g.nx) | 0) + 0.5) * g.cell;
      const d = Math.hypot(x - r.centroid[0], z - r.centroid[1]);
      if (d > bd) { bd = d; best = c; }
    }
    if (best < 0) continue;
    const bx = g.x0 + ((best % g.nx) + 0.5) * g.cell, bz = g.z0 + (((best / g.nx) | 0) + 0.5) * g.cell;
    const k = Math.min(0.6, bd * 0.3) / (bd || 1);
    const px = bx + (r.centroid[0] - bx) * k, pz = bz + (r.centroid[1] - bz) * k;
    const fy = plan.floorY[cellOf(g, px, pz)] ?? plan.level.elevation;
    vps.push({ id: `room${r.id}`, name: `${plan.level.name.de} · Raum ${r.id + 1}`, position: [px, (Number.isFinite(fy) ? fy : plan.level.elevation) + EYE, pz], target: [r.centroid[0], plan.level.elevation + 1.3, r.centroid[1]], auto: true, walk: true, level: r.level });
  }
  return vps;
}

function suggestHotspots(a: SpatialAnalysis): Hotspot[] {
  const out: Hotspot[] = [];
  for (const r of a.rooms.filter((r) => r.covered && r.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    let c = cellOf(a.grid, r.centroid[0], r.centroid[1]);
    let pos: [number, number] = r.centroid;
    if (c < 0 || plan.room[c] !== r.id) {
      // centroid outside the room (L-shape): nearest room cell
      let bd = Infinity;
      for (let k = 0; k < plan.room.length; k++) {
        if (plan.room[k] !== r.id) continue;
        const x = a.grid.x0 + ((k % a.grid.nx) + 0.5) * a.grid.cell, z = a.grid.z0 + (((k / a.grid.nx) | 0) + 0.5) * a.grid.cell;
        const d = Math.hypot(x - r.centroid[0], z - r.centroid[1]);
        if (d < bd) { bd = d; c = k; pos = [x, z]; }
      }
    }
    out.push({
      id: `hs-room${r.id}`,
      position: [pos[0], plan.level.elevation + 1.4, pos[1]],
      title: `Raum ${r.id + 1}`,
      text: "",
      facts: [`${plan.level.name.de}`, `Fläche ca. ${r.area.toLocaleString("de-AT")} m² (aus dem Modell gemessen)`],
      auto: true,
      level: r.level,
    });
  }
  return out;
}
