// ARCHVISTA — public import API: DXF text → web-ready indexed meshes in metres (Y-up).

import { readDxf, num, type RawMaterial } from "./reader";
import { buildGeometry, BuildResult } from "./build";

export type UnitSource = "header" | "guess" | "user";

export interface UnitInfo {
  name: string;
  toMeters: number;
  source: UnitSource;
  /** Raw drawing extent (largest bbox side) in drawing units. */
  rawExtent: number;
  plausible: boolean;
}

export interface ModelMesh {
  id: string;
  layer: string;
  color: number;
  /** CAD material name, if the drawing assigns one. */
  material?: string;
  /** Texture coordinates from the source program (SketchUp), in texture tiles. */
  uvs?: Float32Array;
  /** Visible from the front only (SketchUp face painted differently on each side). */
  singleSided?: boolean;
  positions: Float32Array; // metres, Y-up, relative to origin
  normals: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
}

export interface LayerInfo {
  name: string;
  color: number;
  triangleCount: number;
}

export interface ImportWarning {
  code: string;
  message: string; // German, user-facing
  detail?: string;
}

/** A material defined in the CAD file (only those actually used by geometry). */
export interface CadMaterial {
  name: string;
  description?: string;
  /** 0xRRGGBB, when the material sets its own colour */
  color?: number;
  /** texture file name only (no folders), e.g. "Ziegel_rot.jpg" */
  map?: string;
  /** metres per texture tile, if the file says so */
  mapSize?: number;
  /** the texture is placed by the source program's own UVs (SketchUp) */
  sourceUv?: boolean;
  /** SketchUp "colorize": the texture is tinted to `color` */
  colorize?: boolean;
  /** the source says the material is fully opaque (SketchUp knows transparency exactly) */
  opaque?: boolean;
  opacity?: number;
}

export interface ImportedModel {
  meshes: ModelMesh[];
  materials: CadMaterial[];
  layers: LayerInfo[];
  units: UnitInfo;
  /** World offset (metres, Y-up) subtracted from all positions to keep float precision. */
  origin: [number, number, number];
  bbox: { min: [number, number, number]; max: [number, number, number] };
  stats: {
    version?: string;
    entityCounts: Record<string, number>;
    triangles: number;
    vertices: number;
    removedDegenerate: number;
    removedDuplicate: number;
    flippedForConsistency: number;
    closedShellsOutward: number;
  };
  warnings: ImportWarning[];
  /** True if there is any usable 3D geometry at all. */
  ok: boolean;
}

const UNITS: Record<number, [string, number]> = {
  1: ["Zoll", 0.0254], 2: ["Fuß", 0.3048], 4: ["Millimeter", 0.001], 5: ["Zentimeter", 0.01],
  6: ["Meter", 1], 7: ["Kilometer", 1000], 10: ["Yard", 0.9144], 14: ["Dezimeter", 0.1],
};

export const UNIT_CHOICES: [string, number][] = [
  ["Millimeter", 0.001], ["Zentimeter", 0.01], ["Meter", 1], ["Zoll", 0.0254], ["Fuß", 0.3048],
];

/** A building's largest dimension is expected between 2 m and 2 km. */
function plausibleMeters(extentM: number) {
  return extentM >= 2 && extentM <= 2000;
}

export function guessUnits(rawExtent: number): [string, number] {
  // Choose the unit making the model's largest side look like a building (ideal ≈ 10–100 m).
  let best = UNIT_CHOICES[2];
  let bestScore = Infinity;
  for (const u of [UNIT_CHOICES[0], UNIT_CHOICES[1], UNIT_CHOICES[2]]) {
    const m = rawExtent * u[1];
    const score = Math.abs(Math.log10(Math.max(m, 1e-9)) - Math.log10(30));
    if (score < bestScore) { bestScore = score; best = u; }
  }
  return best;
}

export interface ImportOptions {
  /** Override drawing units (metres per drawing unit). */
  unitsToMeters?: number;
  onProgress?: (fraction: number, label: string) => void;
}

export function importDxf(text: string, opts: ImportOptions = {}): ImportedModel {
  const progress = opts.onProgress ?? (() => {});
  progress(0.05, "Datei wird gelesen");
  const raw = readDxf(text);
  progress(0.3, "Geometrie wird rekonstruiert");
  const built = buildGeometry(raw);
  progress(0.6, "Modell wird optimiert");
  return finalize(built, raw.header.get("$INSUNITS"), raw.version, opts, progress, raw.materials);
}

function finalize(
  b: BuildResult,
  insunitsPairs: [number, string][] | undefined,
  version: string | undefined,
  opts: ImportOptions,
  progress: (f: number, l: string) => void,
  rawMaterials: Map<string, RawMaterial> = new Map()
): ImportedModel {
  const warnings: ImportWarning[] = [];

  // Raw extent in drawing units (Z-up DXF coordinates).
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of b.groups.values())
    for (let i = 0; i < g.tris.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const v = g.tris[i + k];
        if (v < mn[k]) mn[k] = v;
        if (v > mx[k]) mx[k] = v;
      }
  const hasGeo = Number.isFinite(mn[0]);
  const rawExtent = hasGeo ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;

  // Units
  const code = insunitsPairs ? num(insunitsPairs, 70, 0) : 0;
  let units: UnitInfo;
  if (opts.unitsToMeters) {
    const n = UNIT_CHOICES.find((u) => u[1] === opts.unitsToMeters)?.[0] ?? "Benutzerdefiniert";
    units = { name: n, toMeters: opts.unitsToMeters, source: "user", rawExtent, plausible: plausibleMeters(rawExtent * opts.unitsToMeters) };
  } else if (UNITS[code]) {
    const [n, f] = UNITS[code];
    units = { name: n, toMeters: f, source: "header", rawExtent, plausible: plausibleMeters(rawExtent * f) };
    if (hasGeo && !units.plausible) {
      const [gn] = guessUnits(rawExtent);
      warnings.push({
        code: "units-implausible",
        message: `Die Datei gibt „${n}“ als Einheit an, dann wäre das Gebäude ${fmtLen(rawExtent * f)} groß. Vermutlich ist „${gn}“ richtig – bitte prüfen.`,
      });
    }
  } else {
    const [n, f] = guessUnits(rawExtent);
    units = { name: n, toMeters: f, source: "guess", rawExtent, plausible: plausibleMeters(rawExtent * f) };
    if (hasGeo)
      warnings.push({
        code: "units-guessed",
        message: `Die Datei enthält keine Einheit. ARCHVISTA hat „${n}“ erkannt (Gebäudegröße ${fmtLen(rawExtent * f)}). Bei Bedarf mit einem Klick ändern.`,
      });
  }
  const s = units.toMeters;

  // Origin: centre of footprint, lowest point → keeps float32 precise for georeferenced drawings.
  const origin: [number, number, number] = hasGeo
    ? [((mn[0] + mx[0]) / 2) * s, mn[2] * s, -((mn[1] + mx[1]) / 2) * s]
    : [0, 0, 0];

  let removedDegenerate = 0, removedDuplicate = 0, flipped = 0, outward = 0;
  const meshes: ModelMesh[] = [];
  const layerMap = new Map<string, LayerInfo>();
  const bmin: [number, number, number] = [Infinity, Infinity, Infinity];
  const bmax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let gi = 0;
  const groups = [...b.groups.values()];
  for (const g of groups) {
    progress(0.6 + (0.35 * gi) / Math.max(1, groups.length), "Modell wird optimiert");
    // DXF (x, y, z) Z-up → (x, z, -y) Y-up, scaled to metres, minus origin.
    const tri = g.tris;
    const pos: number[] = [];
    const idx: number[] = [];
    const weld = new Map<string, number>();
    const seen = new Set<string>();
    const vid = (x: number, y: number, z: number) => {
      const X = x * s - origin[0], Y = z * s - origin[1], Z = -y * s - origin[2];
      const key = `${Math.round(X * 1e4)},${Math.round(Y * 1e4)},${Math.round(Z * 1e4)}`;
      let i = weld.get(key);
      if (i === undefined) {
        i = pos.length / 3;
        pos.push(X, Y, Z);
        weld.set(key, i);
      }
      return i;
    };
    for (let i = 0; i < tri.length; i += 9) {
      const a = vid(tri[i], tri[i + 1], tri[i + 2]);
      const bb = vid(tri[i + 3], tri[i + 4], tri[i + 5]);
      const c = vid(tri[i + 6], tri[i + 7], tri[i + 8]);
      if (a === bb || bb === c || a === c || triArea(pos, a, bb, c) < 1e-8) { removedDegenerate++; continue; }
      const key = [a, bb, c].sort((x, y) => x - y).join(",");
      if (seen.has(key)) { removedDuplicate++; continue; }
      seen.add(key);
      idx.push(a, bb, c);
    }
    if (!idx.length) continue;
    const r = orientConsistently(pos, idx);
    flipped += r.flipped;
    outward += r.outward;
    const split = splitByCrease(pos, idx, 35);
    const positions = split.positions;
    const indices = split.indices;
    for (let i = 0; i < positions.length; i += 3)
      for (let k = 0; k < 3; k++) {
        if (positions[i + k] < bmin[k]) bmin[k] = positions[i + k];
        if (positions[i + k] > bmax[k]) bmax[k] = positions[i + k];
      }
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...(g.material ? { material: g.material } : {}),
      positions,
      normals: split.normals,
      indices,
      triangleCount: indices.length / 3,
    });
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }

  // ——— honest reporting ———
  for (const a of b.acis) {
    warnings.push({
      code: "acis",
      message: `${a.count}× ${a.type} (ACIS-Volumenkörper) auf Layer ${a.layers.join(", ")} kann nicht gelesen werden. Diese Teile fehlen im Modell.`,
      detail: "acis-fix",
    });
  }
  if (b.meshWithSubdivision)
    warnings.push({ code: "mesh-subd", message: `${b.meshWithSubdivision} Netzobjekte sind geglättet (Glättungsstufe > 0). Übernommen wird das ungeglättete Grundnetz.` });
  if (b.missingBlocks.length)
    warnings.push({ code: "missing-block", message: `Fehlende Blockdefinitionen: ${b.missingBlocks.slice(0, 5).join(", ")}${b.missingBlocks.length > 5 ? " …" : ""}` });
  if (b.skippedHiddenLayers)
    warnings.push({ code: "hidden-layers", message: `${b.skippedHiddenLayers} Objekte auf ausgeschalteten oder gefrorenen Layern wurden nicht übernommen.` });
  if (b.recursionCut)
    warnings.push({ code: "recursion", message: `${b.recursionCut} sich selbst enthaltende Blockeinfügungen wurden übersprungen.` });

  const triangles = meshes.reduce((n, m) => n + m.triangleCount, 0);
  const vertices = meshes.reduce((n, m) => n + m.positions.length / 3, 0);
  const ok = triangles > 0;
  if (!ok) {
    warnings.unshift({
      code: "no-3d",
      message: b.acis.length
        ? "Die Datei enthält nur ACIS-Volumenkörper, die ohne AutoCAD nicht gelesen werden können. Bitte die Korrektur-Anleitung befolgen."
        : "In der Datei wurde keine 3D-Geometrie gefunden (nur 2D-Linien, Texte oder Bemaßungen).",
      detail: b.acis.length ? "acis-fix" : undefined,
    });
  }
  // CAD materials actually used by the geometry
  const usedNames = new Set(meshes.map((m) => m.material).filter(Boolean) as string[]);
  const materials: CadMaterial[] = [];
  for (const rm of rawMaterials.values()) {
    if (!usedNames.has(rm.name) || materials.some((x) => x.name === rm.name)) continue;
    const file = rm.diffuseMap?.split(/[\\/]/).pop()?.trim();
    materials.push({
      name: rm.name,
      ...(rm.description ? { description: rm.description } : {}),
      ...(rm.diffuse !== undefined ? { color: rm.diffuse } : {}),
      ...(file ? { map: file } : {}),
      ...(rm.mapScaleU ? { mapSize: rm.mapScaleU * units.toMeters } : {}),
      ...(rm.opacity !== undefined && rm.opacity < 1 ? { opacity: rm.opacity } : {}),
    });
  }
  progress(1, "Fertig");
  return {
    meshes,
    materials,
    layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
    units,
    origin,
    bbox: ok ? { min: bmin, max: bmax } : { min: [0, 0, 0], max: [0, 0, 0] },
    stats: {
      version, entityCounts: b.entityCounts, triangles, vertices,
      removedDegenerate, removedDuplicate, flippedForConsistency: flipped, closedShellsOutward: outward,
    },
    warnings,
    ok,
  };
}

function fmtLen(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  return `${(m * 100).toFixed(1)} cm`;
}

function triArea(p: number[], a: number, b: number, c: number) {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}

/**
 * Make triangle winding consistent across shared edges (BFS per connected component);
 * closed shells are then turned outward using the signed volume.
 */
export function orientConsistently(pos: number[], idx: number[]): { flipped: number; outward: number } {
  const n = idx.length / 3;
  const edges = new Map<number, number[]>(); // undirected edge key → triangles
  const nv = pos.length / 3;
  const ek = (a: number, b: number) => (a < b ? a * nv + b : b * nv + a);
  for (let t = 0; t < n; t++)
    for (let k = 0; k < 3; k++) {
      const key = ek(idx[t * 3 + k], idx[t * 3 + ((k + 1) % 3)]);
      const l = edges.get(key);
      if (l) l.push(t); else edges.set(key, [t]);
    }
  const dirOf = (t: number, a: number, b: number) => {
    for (let k = 0; k < 3; k++) if (idx[t * 3 + k] === a && idx[t * 3 + ((k + 1) % 3)] === b) return 1;
    return -1;
  };
  const flip = (t: number) => { const x = idx[t * 3 + 1]; idx[t * 3 + 1] = idx[t * 3 + 2]; idx[t * 3 + 2] = x; };
  const comp = new Int32Array(n).fill(-1);
  let flipped = 0, outward = 0, cid = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const members: number[] = [s];
    comp[s] = cid;
    let closed = true;
    for (let qi = 0; qi < members.length; qi++) {
      const t = members[qi];
      for (let k = 0; k < 3; k++) {
        const a = idx[t * 3 + k], b = idx[t * 3 + ((k + 1) % 3)];
        const list = edges.get(ek(a, b))!;
        if (list.length > 2) continue; // non-manifold: do not propagate across
        for (const u of list) {
          if (u === t || comp[u] !== -1) continue;
          // Neighbour must traverse the shared edge in the opposite direction.
          if (dirOf(u, a, b) === 1) { flip(u); flipped++; }
          comp[u] = cid;
          members.push(u);
        }
      }
    }
    // Closed if every edge is used exactly twice by triangles of this component.
    const cnt = new Map<number, number>();
    for (const t of members)
      for (let k = 0; k < 3; k++) {
        const key = ek(idx[t * 3 + k], idx[t * 3 + ((k + 1) % 3)]);
        cnt.set(key, (cnt.get(key) ?? 0) + 1);
      }
    for (const c of cnt.values()) if (c !== 2) { closed = false; break; }
    if (closed && members.length >= 4) {
      let vol = 0;
      for (const t of members) {
        const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
        vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
             - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
             + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
      }
      if (vol < 0) { for (const t of members) flip(t); }
      outward++;
    }
    cid++;
  }
  return { flipped, outward };
}

export function computeNormals(p: Float32Array, idx: Uint32Array): Float32Array {
  const nrm = new Float32Array(p.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { nrm[v] += nx; nrm[v + 1] += ny; nrm[v + 2] += nz; }
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
    nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
  }
  return nrm;
}

/**
 * Architectural shading: keep hard edges (wall corners) sharp but smooth curved surfaces.
 * Vertices are duplicated where incident face normals differ by more than `creaseDeg`.
 */
export function splitByCrease(pos: number[], idx: number[], creaseDeg: number) {
  const nt = idx.length / 3;
  const fn = new Float64Array(nt * 3);
  const fa = new Float64Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[t * 3] = nx / l; fn[t * 3 + 1] = ny / l; fn[t * 3 + 2] = nz / l;
    fa[t] = l;
  }
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  const nv = pos.length / 3;
  const inc: number[][] = Array.from({ length: nv }, () => []);
  for (let i = 0; i < idx.length; i++) inc[idx[i]].push(i); // corner ids
  const outP: number[] = [], outN: number[] = [];
  const outI = new Uint32Array(idx.length);
  for (let v = 0; v < nv; v++) {
    const clusters: { n: [number, number, number]; acc: [number, number, number]; id: number }[] = [];
    for (const corner of inc[v]) {
      const t = (corner / 3) | 0;
      const n: [number, number, number] = [fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]];
      let cl = clusters.find((c) => c.n[0] * n[0] + c.n[1] * n[1] + c.n[2] * n[2] > cos);
      if (!cl) {
        cl = { n, acc: [0, 0, 0], id: outP.length / 3 };
        clusters.push(cl);
        outP.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        outN.push(0, 0, 0);
      }
      cl.acc[0] += n[0] * fa[t]; cl.acc[1] += n[1] * fa[t]; cl.acc[2] += n[2] * fa[t];
      outI[corner] = cl.id;
    }
    for (const c of clusters) {
      const l = Math.hypot(...c.acc) || 1;
      outN[c.id * 3] = c.acc[0] / l; outN[c.id * 3 + 1] = c.acc[1] / l; outN[c.id * 3 + 2] = c.acc[2] / l;
    }
  }
  return { positions: new Float32Array(outP), normals: new Float32Array(outN), indices: outI };
}
