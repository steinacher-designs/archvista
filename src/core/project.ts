// ARCHVISTA — project document (everything the user can change; saved automatically).
import type { MaterialPreset } from "./materials";

import type { Zone } from "./zones";

export type EnvironmentId = "urban" | "forest" | "coastal" | "studio" | "custom";

/** The user's own surroundings: a 360° panorama (HDR/EXR or a JPG/PNG/WebP photo). */
export interface CustomEnvironment {
  /** storage key / file name on the website (letters, digits, - _ .) */
  file: string;
  kind: "hdr" | "exr" | "image";
  /** original file name, shown in the app */
  name: string;
  size: number;
  /** turn the panorama around the building, degrees */
  rotation: number;
  /** sharp ground around the building, blended into the photo ("photo" = only the panorama) */
  ground: "photo" | "grass" | "paving" | "sand";
  /** how high the panorama was taken, metres (default 1.7) */
  height?: number;
}
export type TemplateId = "minimal" | "dark-luxury" | "swiss" | "portfolio" | "nature" | "cinema" | "monograph" | "blueprint" | "studio" | "beton";
export type Quality = "auto" | "performance" | "balanced" | "ultra";
export type Lighting = "day" | "afternoon" | "evening";

export interface Hotspot {
  id: string;
  position: [number, number, number];
  title: string;
  text: string;
  /** Measured facts only (never invented). */
  facts?: string[];
  image?: string; // file name in project images
  materialSpec?: string;
  auto?: boolean;
  level?: number;
  /** Optional add-on: visitors try other materials on one model part (e.g. a sofa in white, blue, green). */
  variants?: HotspotVariants;
}

export interface HotspotVariants {
  /** Model part the variants apply to (part key in the app; an anonymous tag like "v1" on the website). */
  part: string;
  /** Name of the part's own material as shown to visitors (default "Original"). */
  originalName?: string;
  /** Website only: the part's current material, for the swatch. */
  original?: string;
  /** Up to three alternatives: material id (may carry a colour, "preset~#hex") and a name. */
  options: { id: string; name: string }[];
}

export interface Viewpoint {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  auto?: boolean;
  /** Eye-level inside/near the building (used in walk tours). */
  walk?: boolean;
  level?: number;
}

/** A named spot the visitor can jump to (shown in the list next to the storeys). */
export interface Place {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  /** Eye level, first-person (true) or bird's-eye orbit view (false). */
  walk: boolean;
}

/** A downloadable file on the website (plan, detail, specification …). Bytes are stored next to the project. */
export interface ProjectDocument {
  id: string;
  /** Group heading on the website, e.g. "Pläne", "Details". */
  folder: string;
  /** Display name. */
  title: string;
  fileName: string;
  size: number;
  addedAt: string;
}

export interface ProjectImage { name: string; dataUrl: string; caption?: string }

export interface Project {
  format: "archvista-project";
  version: 1;
  id: string;
  fileName: string;
  fileHash: string;
  unitsToMeters?: number;
  title: string;
  description: string;
  author: string;
  accent: string;
  template: TemplateId;
  environment: EnvironmentId;
  /** set when the user loaded own surroundings (environment "custom") */
  customEnv?: CustomEnvironment;
  lighting: Lighting;
  quality: Quality;
  language: "de" | "en";
  zones: Zone[];
  hotspots: Hotspot[];
  /** Hotspot suggestions the user removed (so they are not re-added). */
  dismissedHotspots: string[];
  materialOverrides: Record<string, string>; // part key → preset id
  /** Optional user colour per part key (hex). */
  materialColors?: Record<string, string>;
  /** Materials with own texture images: from the CAD file (id "img:…", group "cad") or added by the user (id "own:…", group "own"). */
  customMaterials?: MaterialPreset[];
  viewpoints: Viewpoint[];
  /** User-defined places, shown after the storeys. */
  places?: Place[];
  /** Custom names for detected storeys (index → name). */
  levelNames?: Record<number, string>;
  /** Storeys not shown in the list. */
  hiddenLevels?: number[];
  images: ProjectImage[];
  /** Plans, details and other downloads shown on the website. */
  documents?: ProjectDocument[];
  tour: boolean;
  publish: { owner?: string; repo?: string; url?: string; lastUploadAt?: string; lastLiveAt?: string };
  updatedAt: string;
}

export const ENVIRONMENTS: { id: EnvironmentId; de: string; en: string }[] = [
  { id: "urban", de: "Stadt", en: "Urban city" },
  { id: "forest", de: "Wald & Natur", en: "Forest & nature" },
  { id: "coastal", de: "Küste", en: "Coastal" },
  { id: "studio", de: "Studio", en: "Minimal studio" },
];

export const TEMPLATES: { id: TemplateId; de: string; en: string; accent: string }[] = [
  { id: "minimal", de: "Minimal", en: "Minimal", accent: "#1f1f1f" },
  { id: "portfolio", de: "Atelier", en: "Atelier", accent: "#B57056" },
  { id: "dark-luxury", de: "Noir", en: "Noir", accent: "#c9a96e" },
  { id: "cinema", de: "Kino", en: "Cinema", accent: "#ff5a36" },
  { id: "swiss", de: "Swiss", en: "Swiss", accent: "#e3000f" },
  { id: "nature", de: "Papier", en: "Paper", accent: "#6d7f4f" },
  { id: "monograph", de: "Monografie", en: "Monograph", accent: "#8a6d4b" },
  { id: "studio", de: "Studio", en: "Studio", accent: "#8f9fd8" },
  { id: "blueprint", de: "Plan", en: "Blueprint", accent: "#7fd1ff" },
  { id: "beton", de: "Beton", en: "Concrete", accent: "#e8501c" },
];

export function titleFromFile(name: string) {
  const base = name.replace(/\.(dxf|skp|3ds|glb|gltf)$/i, "").replace(/[_\-.]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Mein Projekt";
}

export function newProject(fileName: string, fileHash: string): Project {
  return {
    format: "archvista-project", version: 1,
    id: fileHash.slice(0, 12), fileName, fileHash,
    title: titleFromFile(fileName), description: "", author: "",
    accent: TEMPLATES[0].accent, template: "minimal", environment: "forest", lighting: "afternoon", quality: "auto", language: "de",
    zones: [], hotspots: [], dismissedHotspots: [], materialOverrides: {}, viewpoints: [], images: [], tour: true,
    publish: {}, updatedAt: new Date().toISOString(),
  };
}

/** Rule-based design engine: pick a fitting environment + template from what the model contains. */
export function autoDesign(info: { terrain: boolean; levels: number; footprint: number; roofClay: boolean; height: number }): Pick<Project, "environment" | "template" | "accent"> {
  let environment: EnvironmentId = "forest";
  if (info.terrain) environment = "studio"; // the model brings its own site; keep surroundings neutral
  else if (info.levels >= 4 || info.height > 14) environment = "urban";
  else if (info.footprint > 400) environment = "urban";
  let template: TemplateId = "minimal";
  if (environment === "urban") template = "swiss";
  else if (info.roofClay) template = "nature";
  const accent = TEMPLATES.find((t) => t.id === template)!.accent;
  return { environment, template, accent };
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  const h = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
