// ARCHVISTA — rule-based recognition of building parts from layer names and geometry.
// Never claims certainty: every result carries how it was derived.

import type { ModelMesh } from "../dxf/import";

export type Category =
  | "wall" | "floor" | "ceiling" | "roof" | "glass" | "window" | "door" | "stair" | "column"
  | "railing" | "terrain" | "furniture" | "terrace" | "other";

export type Basis = "layer" | "geometry";

export interface PartInfo {
  meshId: string;
  category: Category;
  basis: Basis;
  /** Unit-area-weighted orientation shares. */
  orientation: { up: number; down: number; vertical: number; sloped: number };
  area: number;
}

/** Layer keywords, German + English + common CAD standards (AIA, DIN 276-ish names). Order matters. */
const RULES: [Category, RegExp][] = [
  ["glass", /(glas|glass|glazing|verglas|scheibe|vitre)/i],
  ["window", /(fenster|window|wind\b|fen\b|^a-glaz|oberlicht|skylight)/i],
  ["door", /(t[üu]r|tuer|door|\btor\b|portal)/i],
  ["stair", /(treppe|stufe|stair|step|rampe|ramp)/i],
  ["railing", /(gel[äa]nder|gelaender|railing|handlauf|handrail|balustr|br[üu]stung)/i],
  ["column", /(st[üu]tze|stuetze|column|s[äa]ule|saeule|pfeiler|pillar|\bcol\b)/i],
  ["roof", /(dach|roof|attika|ziegel|traufe|first)/i],
  ["terrain", /(gel[äa]nde|gelaende|terrain|topo|site|landscape|rasen|lawn|grund\b|umgebung)/i],
  ["terrace", /(terrasse|terrace|balkon|balcony|loggia|deck\b|patio)/i],
  ["furniture", /(m[öo]bel|moebel|furn|einrichtung|ausstattung|k[üu]che|kitchen|sanit|bad\b|equip)/i],
  ["ceiling", /(decke|ceiling|slab|geschossdecke|unterzug)/i],
  ["floor", /(boden|floor|estrich|belag|fu[ßs]boden|parkett|fliese|bodenplatte|fundament)/i],
  ["wall", /(wand|w[äa]nde|wall|mauer|fassade|facade|attika|brick|ziegelwand|beton)/i],
];

export function categoryFromLayer(layer: string): Category | null {
  for (const [c, re] of RULES) if (re.test(layer)) return c;
  return null;
}

export function orientationShares(m: ModelMesh) {
  const p = m.positions, I = m.indices;
  let up = 0, down = 0, vertical = 0, sloped = 0, total = 0;
  for (let i = 0; i < I.length; i += 3) {
    const n = triNormalArea(p, I[i], I[i + 1], I[i + 2]);
    const ny = n.ny;
    total += n.area;
    if (ny > 0.95) up += n.area;
    else if (ny < -0.95) down += n.area;
    else if (Math.abs(ny) < 0.2) vertical += n.area;
    else sloped += n.area;
  }
  const t = total || 1;
  return { area: total, shares: { up: up / t, down: down / t, vertical: vertical / t, sloped: sloped / t } };
}

export function triNormalArea(p: Float32Array, a: number, b: number, c: number) {
  a *= 3; b *= 3; c *= 3;
  const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
  const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { nx: nx / l, ny: ny / l, nz: nz / l, area: l / 2 };
}

export function classifyMesh(m: ModelMesh): PartInfo {
  const { area, shares } = orientationShares(m);
  const byLayer = categoryFromLayer(m.layer);
  if (byLayer) return { meshId: m.id, category: byLayer, basis: "layer", orientation: shares, area };
  // Geometric fallback. Note: closed boxes have equal up/down shares; "vertical" dominates for walls.
  const horiz = shares.up + shares.down;
  let category: Category = "other";
  if (shares.vertical > 0.6) category = "wall";
  else if (shares.sloped > 0.4) category = "roof";
  else if (horiz > 0.6) category = "floor";
  return { meshId: m.id, category, basis: "geometry", orientation: shares, area };
}

/**
 * Meshes whose layer gives no hint (e.g. everything on layer "0") are split by face orientation,
 * so a single-layer export still gets walls, floors and roofs with different materials.
 */
export function splitUnrecognised(meshes: ModelMesh[]): ModelMesh[] {
  const out: ModelMesh[] = [];
  for (const m of meshes) {
    if (categoryFromLayer(m.layer)) { out.push(m); continue; }
    const buckets: Record<string, number[]> = { v: [], h: [], s: [] };
    const p = m.positions, I = m.indices;
    for (let i = 0; i < I.length; i += 3) {
      const n = triNormalArea(p, I[i], I[i + 1], I[i + 2]);
      const k = Math.abs(n.ny) > 0.95 ? "h" : Math.abs(n.ny) < 0.2 ? "v" : "s";
      buckets[k].push(I[i], I[i + 1], I[i + 2]);
    }
    const nonEmpty = Object.entries(buckets).filter(([, v]) => v.length);
    if (nonEmpty.length <= 1) { out.push(m); continue; }
    for (const [k, idx] of nonEmpty) {
      // compact vertex set
      const map = new Map<number, number>();
      const pos: number[] = [], nrm: number[] = [];
      const ni = new Uint32Array(idx.length);
      idx.forEach((v, j) => {
        let n = map.get(v);
        if (n === undefined) {
          n = pos.length / 3; map.set(v, n);
          pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);
          nrm.push(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]);
        }
        ni[j] = n;
      });
      out.push({ ...m, id: `${m.id}${k}`, positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: ni, triangleCount: ni.length / 3 });
    }
  }
  return out;
}

export const CATEGORY_LABEL: Record<Category, { de: string; en: string }> = {
  wall: { de: "Wand", en: "Wall" }, floor: { de: "Boden", en: "Floor" }, ceiling: { de: "Decke", en: "Ceiling" },
  roof: { de: "Dach", en: "Roof" }, glass: { de: "Glas", en: "Glass" }, window: { de: "Fensterrahmen", en: "Window frame" },
  door: { de: "Tür", en: "Door" }, stair: { de: "Treppe", en: "Stairs" }, column: { de: "Stütze", en: "Column" },
  railing: { de: "Geländer", en: "Railing" }, terrain: { de: "Gelände", en: "Terrain" }, furniture: { de: "Möbel", en: "Furniture" },
  terrace: { de: "Terrasse", en: "Terrace" }, other: { de: "Sonstiges", en: "Other" },
};
