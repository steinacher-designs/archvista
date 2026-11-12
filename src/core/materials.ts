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
  /** Group shown in the material picker. */
  group?: MaterialGroup;
  /** Paint-like: a user colour replaces the base colour completely (otherwise it tints the photo texture). */
  paintable?: boolean;
  /** Texture library key when it differs from id (colour variants). */
  tex?: string;
  /** Own texture image (from the CAD file's ZIP): file name; the viewer resolves where it lives. */
  image?: string;
  /** Name of the CAD material this came from. */
  cadName?: string;
  /** Use the source program's texture coordinates (SketchUp) instead of ARCHVISTA's box mapping. */
  sourceUv?: boolean;
  /** Tint the own texture so its average colour becomes `color` (SketchUp "colorize"). */
  colorize?: boolean;
}

export type MaterialGroup = "cad" | "own" | "wall" | "floor" | "wood" | "stone" | "roof" | "metal" | "glass" | "outdoor";

export const GROUP_LABEL: Record<MaterialGroup, { de: string; en: string }> = {
  cad: { de: "Aus der CAD-Datei", en: "From the CAD file" },
  own: { de: "Eigene Materialien", en: "Own materials" },
  wall: { de: "Wand & Putz", en: "Walls & plaster" }, floor: { de: "Boden", en: "Floors" }, wood: { de: "Holz", en: "Wood" },
  stone: { de: "Stein & Beton", en: "Stone & concrete" }, roof: { de: "Dach", en: "Roof" }, metal: { de: "Metall", en: "Metal" },
  glass: { de: "Glas", en: "Glass" }, outdoor: { de: "Außen", en: "Outdoor" },
};

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
  // ——— v1.1: more materials (photo textures from Poly Haven, CC0) ———
  { id: "stucco", label: { de: "Edelputz weiß", en: "White stucco" }, color: "#e9e5de", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "plaster_grey", label: { de: "Putz grau", en: "Grey plaster" }, color: "#a9a7a2", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "painted_concrete", label: { de: "Beton gestrichen", en: "Painted concrete" }, color: "#d9d7d2", roughness: 0.8, metalness: 0, texture: "concrete", scale: 2 },
  { id: "concrete_smooth", label: { de: "Beton glatt", en: "Smooth concrete" }, color: "#bdbab4", roughness: 0.75, metalness: 0, texture: "concrete", scale: 3 },
  { id: "concrete_floor", label: { de: "Betonboden geschliffen", en: "Polished concrete floor" }, color: "#a8a59f", roughness: 0.45, metalness: 0, texture: "concrete", scale: 3, clearcoat: 0.25 },
  { id: "white_brick", label: { de: "Ziegel weiß", en: "White brick" }, color: "#e3ded6", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "dark_brick", label: { de: "Klinker dunkel", en: "Dark brick" }, color: "#4a3a33", roughness: 0.85, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "marble_white", label: { de: "Marmor weiß", en: "White marble" }, color: "#ecebe8", roughness: 0.18, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.6 },
  { id: "marble_black", label: { de: "Marmor schwarz", en: "Black marble" }, color: "#2a2a2c", roughness: 0.15, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.7 },
  { id: "terrazzo", label: { de: "Terrazzo", en: "Terrazzo" }, color: "#d8d3cb", roughness: 0.3, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.4 },
  { id: "slate_floor", label: { de: "Schieferboden", en: "Slate floor" }, color: "#4b4d50", roughness: 0.6, metalness: 0, texture: "tiles", scale: 2 },
  { id: "granite_dark", label: { de: "Granit", en: "Granite" }, color: "#77736e", roughness: 0.35, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.3 },
  { id: "white_tiles", label: { de: "Fliesen weiß", en: "White tiles" }, color: "#f2f1ee", roughness: 0.2, metalness: 0, texture: "tiles", scale: 1, clearcoat: 0.5 },
  { id: "sandstone", label: { de: "Sandstein", en: "Sandstone" }, color: "#c9b28c", roughness: 0.9, metalness: 0, texture: "stone", scale: 3 },
  { id: "herringbone", label: { de: "Fischgrätparkett", en: "Herringbone parquet" }, color: "#a87a4f", roughness: 0.5, metalness: 0, texture: "wood", scale: 1.5, clearcoat: 0.2 },
  { id: "light_oak", label: { de: "Eiche hell", en: "Light oak" }, color: "#cfae84", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "smoked_oak", label: { de: "Eiche geräuchert", en: "Smoked oak" }, color: "#6e5440", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "walnut", label: { de: "Walnuss", en: "Walnut veneer" }, color: "#7a573b", roughness: 0.45, metalness: 0, texture: "wood", scale: 2, clearcoat: 0.2 },
  { id: "larch_cladding", label: { de: "Lärchenschalung", en: "Larch cladding" }, color: "#a7835c", roughness: 0.8, metalness: 0, texture: "planks", scale: 2 },
  { id: "corten", label: { de: "Cortenstahl", en: "Corten steel" }, color: "#8a4b2a", roughness: 0.75, metalness: 0.3, texture: "concrete", scale: 2 },
  { id: "metal_sheet", label: { de: "Trapezblech", en: "Profiled metal sheet" }, color: "#9aa0a6", roughness: 0.4, metalness: 0.8, texture: "planks", scale: 1.5 },
  { id: "gravel", label: { de: "Kies", en: "Gravel" }, color: "#9b958b", roughness: 0.95, metalness: 0, texture: "stone", scale: 1.5 },
  { id: "aluminium", label: { de: "Aluminium gebürstet", en: "Brushed aluminium" }, color: "#c6cacd", roughness: 0.32, metalness: 1, texture: "none", scale: 1 },
  { id: "copper", label: { de: "Kupfer", en: "Copper" }, color: "#b8733f", roughness: 0.35, metalness: 1, texture: "none", scale: 1 },
  { id: "brass", label: { de: "Messing", en: "Brass" }, color: "#c9a24f", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "black_steel", label: { de: "Stahl schwarz", en: "Black steel" }, color: "#1e2023", roughness: 0.5, metalness: 0.8, texture: "none", scale: 1 },
  { id: "glass_frosted", label: { de: "Milchglas", en: "Frosted glass" }, color: "#eef2f3", roughness: 0.45, metalness: 0, texture: "none", scale: 1, transmission: 0.8, ior: 1.5, opacity: 0.7 },
  { id: "glass_tinted", label: { de: "Glas getönt", en: "Tinted glass" }, color: "#5f7377", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.85, ior: 1.5, opacity: 0.5 },
  { id: "paint_matte", label: { de: "Farbe matt (frei wählbar)", en: "Matte paint (any colour)" }, color: "#e8e4dd", roughness: 0.9, metalness: 0, texture: "none", scale: 1, paintable: true },
  { id: "green_roof", label: { de: "Gründach", en: "Green roof" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 },
];

const GROUPS: Record<string, MaterialGroup> = {
  plaster_white: "wall", plaster_warm: "wall", stucco: "wall", plaster_grey: "wall", paint_matte: "wall", lacquer_white: "wall",
  brick: "stone", white_brick: "stone", dark_brick: "stone", concrete: "stone", concrete_smooth: "stone", painted_concrete: "stone", natural_stone: "stone", sandstone: "stone", marble_white: "stone", marble_black: "stone",
  oak: "floor", herringbone: "floor", terrazzo: "floor", slate_floor: "floor", granite_dark: "floor", white_tiles: "floor", stone_tiles: "floor", concrete_floor: "floor",
  light_oak: "wood", smoked_oak: "wood", walnut: "wood", dark_wood: "wood", timber_cladding: "wood", larch_cladding: "wood",
  roof_clay: "roof", roof_slate: "roof", green_roof: "roof", metal_sheet: "roof",
  metal_anthracite: "metal", steel: "metal", aluminium: "metal", copper: "metal", brass: "metal", black_steel: "metal", corten: "metal",
  glass: "glass", glass_frosted: "glass", glass_tinted: "glass",
  grass: "outdoor", terrace_stone: "outdoor", gravel: "outdoor",
};
for (const p of PRESETS) p.group = GROUPS[p.id] ?? "wall";
// plaster-like surfaces take a user colour as paint
for (const id of ["plaster_white", "plaster_warm", "stucco", "plaster_grey", "lacquer_white", "painted_concrete"]) PRESETS.find((p) => p.id === id)!.paintable = true;

const BASE = new Map(PRESETS.map((p) => [p.id, p]));

/**
 * Material ids may carry a user colour: "plaster_white~#a3b1c2". The derived preset keeps the
 * base id in `tex` so the photo texture of the base material is used.
 */
/** Materials with own texture images (id "img:…"), registered per project. */
const CUSTOM = new Map<string, MaterialPreset>();
export function setCustomPresets(list: MaterialPreset[] | undefined) {
  CUSTOM.clear();
  for (const p of list ?? []) CUSTOM.set(p.id, p);
}
export const customPresets = () => [...CUSTOM.values()];

export function resolvePreset(id: string): MaterialPreset | undefined {
  const [baseId, colour] = id.split("~");
  const base = BASE.get(baseId) ?? CUSTOM.get(baseId);
  if (!base || !colour) return base;
  return { ...base, id, color: colour, tex: baseId } as MaterialPreset;
}
export const withColour = (presetId: string, colour?: string) => (colour ? `${presetId.split("~")[0]}~${colour}` : presetId.split("~")[0]);
export const baseId = (presetId: string) => presetId.split("~")[0];

/** Map-like accessor kept for existing callers. */
export const PRESET = { get: resolvePreset, has: (id: string) => !!resolvePreset(id) };

export type Role = "all" | "top" | "under" | "side";

export interface Assignment {
  presetId: string;
  reason: "layer" | "colour" | "geometry" | "default" | "user" | "cad";
  /** colour taken from the CAD material (hex) */
  color?: string;
}

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

// ——— materials from the CAD file ———
const hex = (rgb: number) => "#" + rgb.toString(16).padStart(6, "0");
/** Keyword rules for CAD material names (German + English, incl. Autodesk library names). First match wins. */
const CAD_RULES: [RegExp, string | ((t: string, cat: Category) => string)][] = [
  [/(glas|glass|verglas|glazing|window\s*pane)/, (t) => /(milch|frost|satin|matt|opal|translucent|safety)/.test(t) ? "glass_frosted" : /(get[öo]nt|tint|grau|grey|gray|bronze|smoke)/.test(t) ? "glass_tinted" : "glass"],
  [/(gr[üu]ndach|green\s*roof|sedum)/, "green_roof"],
  [/(rasen|gras|grass|lawn|turf)/, "grass"],
  [/(kies|schotter|gravel|split\b)/, "gravel"],
  [/(dachziegel|roof(ing)?\s*tile|clay\s*tile|spanish\s*tile|tile\s*spanish|biber|tondach|ziegeldach|terracotta\s*roof)/, "roof_clay"],
  [/(schiefer|slate|shingle|schindel|eternit)/, (_t, cat) => cat === "floor" ? "slate_floor" : "roof_slate"],
  [/(klinker|brick|ziegel|backstein|mauerwerk|masonry)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_brick" : /(dunkel|dark|schwarz|black|anthrazit)/.test(t) ? "dark_brick" : "brick"],
  [/(terrazzo)/, "terrazzo"],
  [/(marmor|marble)/, (t) => /(schwarz|black|nero|dunkel|dark)/.test(t) ? "marble_black" : "marble_white"],
  [/(granit|granite)/, "granite_dark"],
  [/(sandstein|sandstone)/, "sandstone"],
  [/(beton|concrete|zement|cement|estrich|screed)/, (t, cat) => /(estrich|screed|geschliffen|polished|floor|boden)/.test(t) || cat === "floor" ? "concrete_floor" : /(glatt|smooth|sicht|fair)/.test(t) ? "concrete_smooth" : /(gestrichen|painted)/.test(t) ? "painted_concrete" : "concrete"],
  [/(fliese|tile|keramik|ceramic|porzellan|porcelain|feinstein)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_tiles" : "stone_tiles"],
  [/(fischgr[äa]t|herringbone)/, "herringbone"],
  [/(nuss|walnut)/, "walnut"],
  [/(r[äa]ucher|smoked)/, "smoked_oak"],
  [/(l[äa]rche|larch|schalung|cladding|siding|boarding)/, "larch_cladding"],
  [/(mahagoni|mahogany|kirsch|cherry|teak|wenge|dunkles?\s*holz|dark\s*wood)/, "dark_wood"],
  [/(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine|hell|light)/, (t) => /(holz|wood|timber|parkett|parquet|dielen|floor)/.test(t) || /(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine)/.test(t) ? "light_oak" : ""],
  [/(eiche|oak|parkett|parquet|dielen|floorboard|holz|wood|timber|plywood|sperrholz)/, (_t, cat) => cat === "wall" ? "timber_cladding" : cat === "door" ? "dark_wood" : "oak"],
  [/(corten|cor-ten|rost|rust|weathering)/, "corten"],
  [/(kupfer|copper)/, "copper"],
  [/(messing|brass|bronze)/, "brass"],
  [/(alu)/, "aluminium"],
  [/(schwarz|black).*(stahl|steel|metal)|(stahl|steel|metal).*(schwarz|black)/, "black_steel"],
  [/(edelstahl|stainless|inox|chrom|chrome|stahl|steel)/, "steel"],
  [/(anthrazit|anthracite|zink|zinc)/, "metal_anthracite"],
  [/(blech|sheet|trapez|corrugated|wellblech)/, "metal_sheet"],
  [/(metall|metal)/, "aluminium"],
  [/(naturstein|natural\s*stone|bruchstein|stein|stone|rock)/, "natural_stone"],
  [/(edelputz|stucco|reibputz)/, "stucco"],
  [/(putz|plaster|render|verputz|gips|gypsum|drywall|trockenbau)/, (t) => /(grau|grey|gray)/.test(t) ? "plaster_grey" : /(warm|beige|sand|creme|cream)/.test(t) ? "plaster_warm" : "plaster_white"],
  [/(lack|lacquer|gloss|hochglanz)/, "lacquer_white"],
  [/(farbe|paint|anstrich)/, "paint_matte"],
];

/**
 * Material for a part that carries a CAD material: by name (and description / texture file name),
 * keeping the CAD colour where the material is paint-like. Returns null when nothing fits.
 */
export function assignFromCad(cad: { name: string; description?: string; map?: string; color?: number; opacity?: number; opaque?: boolean }, category: Category): Assignment | null {
  const text = `${cad.name} ${cad.description ?? ""} ${cad.map ?? ""}`.toLowerCase().replace(/[_\-.]+/g, " ");
  let id = "";
  for (const [re, to] of CAD_RULES) {
    if (!re.test(text)) continue;
    id = typeof to === "string" ? to : to(text, category);
    // the file says it is not see-through (e.g. SketchUp "Glass Railing Color" = the frame): no glass
    if (id.startsWith("glass") && cad.opaque) { id = ""; continue; }
    if (id) break;
  }
  if (!id && cad.opacity !== undefined && cad.opacity < 0.8) id = "glass";
  if (!id && cad.color === undefined) return null;
  if (!id) id = "paint_matte";
  const pr = BASE.get(id);
  if (!pr) return null;
  const color = cad.color !== undefined && pr.paintable ? hex(cad.color) : undefined;
  return { presetId: id, reason: "cad", ...(color ? { color } : {}) };
}

/** File-name key for an own texture: lower case, safe characters only. */
export function textureKey(file: string) {
  const t = file.normalize("NFC").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  const dot = t.lastIndexOf(".");
  const stem = (dot > 0 ? t.slice(0, dot) : t).replace(/[^a-z0-9-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "textur";
  const ext = dot > 0 ? t.slice(dot + 1).replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  return ext ? `${stem}.${ext}` : stem;
}
/** Storage id (letters, digits, - and _ only) for a texture key. */
export const textureDocId = (key: string) => `tex-${key.replace(/\./g, "_")}`.slice(0, 64);

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
