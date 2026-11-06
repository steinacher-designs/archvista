// ARCHVISTA — project document (everything the user can change; saved automatically).

import type { Zone } from "./zones";

export type EnvironmentId = "urban" | "forest" | "coastal" | "studio";
export type TemplateId = "minimal" | "dark-luxury" | "swiss" | "portfolio" | "nature" | "cinema";
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
  lighting: Lighting;
  quality: Quality;
  language: "de" | "en";
  zones: Zone[];
  hotspots: Hotspot[];
  /** Hotspot suggestions the user removed (so they are not re-added). */
  dismissedHotspots: string[];
  materialOverrides: Record<string, string>; // part key → preset id
  viewpoints: Viewpoint[];
  images: ProjectImage[];
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
  { id: "minimal", de: "Minimal Architektur", en: "Minimal Architecture", accent: "#1f1f1f" },
  { id: "dark-luxury", de: "Dark Luxury", en: "Dark Luxury", accent: "#c9a96e" },
  { id: "swiss", de: "Swiss Editorial", en: "Swiss Editorial", accent: "#e3000f" },
  { id: "portfolio", de: "Kreatives Portfolio", en: "Creative Portfolio", accent: "#5b4cff" },
  { id: "nature", de: "Natur & Material", en: "Nature & Material", accent: "#6d7f4f" },
  { id: "cinema", de: "Immersives Kino", en: "Immersive Cinema", accent: "#ff5a36" },
];

export function titleFromFile(name: string) {
  const base = name.replace(/\.dxf$/i, "").replace(/[_\-.]+/g, " ").trim();
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
