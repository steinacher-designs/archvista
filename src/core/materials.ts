// ARCHVISTA — physically based material presets and automatic, explainable assignment.

import type { Category } from "./analysis/classify";

export type TextureKind = "none" | "plaster" | "concrete" | "brick" | "wood" | "planks" | "tiles" | "roof" | "grass" | "stone";

export interface MaterialPreset {
  id: string;
  label: { de: string; en: string };
  color: string;
  roughness: number;
  metalness: number;
  texture: TextureKind;
  /** metres per texture repeat */
  scale: number;
  transmission?: number;
  ior?: number;
  clearcoat?: number;
  opacity?: number;
}

export const PRESETS: MaterialPreset[] = [
  { id: "plaster_white", label: { de: "Putz weiß", en: "White plaster" }, color: "#d6d0c6", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "plaster_warm", label: { de: "Putz warm", en: "Warm plaster" }, color: "#e6dccd", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "concrete", label: { de: "Sichtbeton", en: "Exposed concrete" }, color: "#b8b5ae", roughness: 0.86, metalness: 0, texture: "concrete", scale: 3 },
  { id: "brick", label: { de: "Klinker", en: "Brick" }, color: "#9a5039", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.2 },
  { id: "oak", label: { de: "Eichenparkett", en: "Oak parquet" }, color: "#b98b5c", roughness: 0.5, metalness: 0, texture: "wood", scale: 2.0, clearcoat: 0.15 },
  { id: "dark_wood", label: { de: "Nussholz", en: "Walnut" }, color: "#6a4831", roughness: 0.55, metalness: 0, texture: "wood", scale: 1.5 },
  { id: "timber_cladding", label: { de: "Holzschalung", en: "Timber cladding" }, color: "#9d7550", roughness: 0.8, metalness: 0, texture: "planks", scale: 1.6 },
  { id: "stone_tiles", label: { de: "Natursteinplatten", en: "Stone tiles" }, color: "#cbc4b7", roughness: 0.62, metalness: 0, texture: "tiles", scale: 1.2 },
  { id: "terrace_stone", label: { de: "Terrassenplatten", en: "Paving stone" }, color: "#a49d90", roughness: 0.8, metalness: 0, texture: "tiles", scale: 1.0 },
  { id: "roof_clay", label: { de: "Tondachziegel", en: "Clay roof tiles" }, color: "#9c4a33", roughness: 0.75, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "roof_slate", label: { de: "Dach anthrazit", en: "Anthracite roof" }, color: "#3d4045", roughness: 0.7, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "metal_anthracite", label: { de: "Metall anthrazit", en: "Anthracite metal" }, color: "#2e3135", roughness: 0.42, metalness: 0.6, texture: "none", scale: 1 },
  { id: "steel", label: { de: "Edelstahl", en: "Stainless steel" }, color: "#a3a8ad", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "glass", label: { de: "Glas", en: "Glass" }, color: "#dfe9ee", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.92, ior: 1.5, opacity: 0.35 },
  { id: "grass", label: { de: "Rasen", en: "Lawn" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 },
  { id: "lacquer_white", label: { de: "Lack weiß", en: "White lacquer" }, color: "#f1f0ee", roughness: 0.38, metalness: 0, texture: "none", scale: 1, clearcoat: 0.3 },
  { id: "natural_stone", label: { de: "Naturstein", en: "Natural stone" }, color: "#9e968a", roughness: 0.85, metalness: 0, texture: "stone", scale: 2 },
];

export const PRESET = new Map(PRESETS.map((p) => [p.id, p]));

export type Role = "all" | "top" | "under" | "side";

export interface Assignment { presetId: string; reason: "layer" | "colour" | "geometry" | "default" | "user" }

function hsl(rgb: number) {
  const r = ((rgb >> 16) & 255) / 255, g = ((rgb >> 8) & 255) / 255, b = (rgb & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

const KW = {
  concrete: /(beton|concrete|stb\b|sichtbeton)/i,
  brick: /(ziegel|brick|klinker|mauerwerk)/i,
  wood: /(holz|wood|timber|parkett|dielen|eiche|oak|larch|l[äa]rche)/i,
  tile: /(fliese|tile|stein|stone|granit|marmor|marble)/i,
  interior: /(innen|interior|int\b)/i,
  screed: /(estrich|screed)/i,
};

export function assignMaterial(layer: string, category: Category, role: Role, color: number): Assignment {
  const c = hsl(color);
  const reddish = c.s > 0.35 && (c.h < 30 || c.h > 340) && c.l < 0.75;
  const brownish = c.s > 0.25 && c.h >= 15 && c.h <= 45 && c.l < 0.7;
  switch (category) {
    case "glass": return { presetId: "glass", reason: "layer" };
    case "window": return { presetId: "metal_anthracite", reason: "layer" };
    case "door": return { presetId: "dark_wood", reason: "layer" };
    case "railing": return { presetId: "steel", reason: "layer" };
    case "terrain": return { presetId: "grass", reason: "layer" };
    case "terrace": return { presetId: role === "top" || role === "all" ? "terrace_stone" : "concrete", reason: "layer" };
    case "furniture": return { presetId: "lacquer_white", reason: "layer" };
    case "column": return { presetId: KW.wood.test(layer) ? "dark_wood" : "concrete", reason: "layer" };
    case "stair": return { presetId: KW.concrete.test(layer) ? "concrete" : KW.tile.test(layer) ? "stone_tiles" : "oak", reason: "layer" };
    case "roof": return { presetId: role === "under" ? "timber_cladding" : reddish ? "roof_clay" : "roof_slate", reason: reddish ? "colour" : "layer" };
    case "wall":
      if (KW.brick.test(layer)) return { presetId: "brick", reason: "layer" };
      if (KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      if (KW.wood.test(layer)) return { presetId: "timber_cladding", reason: "layer" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "timber_cladding", reason: "colour" };
      return { presetId: KW.interior.test(layer) ? "plaster_warm" : "plaster_white", reason: "default" };
    case "floor":
    case "ceiling":
      if (role === "under") return { presetId: "plaster_white", reason: "geometry" };
      if (role === "side") return { presetId: "plaster_white", reason: "geometry" };
      if (KW.tile.test(layer)) return { presetId: "stone_tiles", reason: "layer" };
      if (KW.screed.test(layer) || KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      return { presetId: "oak", reason: "default" };
    default: {
      if (role === "top") return { presetId: "stone_tiles", reason: "geometry" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "dark_wood", reason: "colour" };
      if (c.l < 0.3) return { presetId: "metal_anthracite", reason: "colour" };
      return { presetId: "plaster_white", reason: "default" };
    }
  }
}

/** Box-projected texture coordinates in metres (texture scale is applied by the material). */
export function boxUVs(positions: Float32Array, normals: Float32Array): Float32Array {
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const ax = Math.abs(normals[i]), ay = Math.abs(normals[i + 1]), az = Math.abs(normals[i + 2]);
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (ay >= ax && ay >= az) { uv[j] = x; uv[j + 1] = z; }
    else if (ax >= az) { uv[j] = z; uv[j + 1] = y; }
    else { uv[j] = x; uv[j + 1] = y; }
  }
  return uv;
}
