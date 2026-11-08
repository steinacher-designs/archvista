// ARCHVISTA — SketchUp (.skp) import via OpenSKP (MIT, pure TypeScript, reads SketchUp 2013 – today).
// Produces the same ImportedModel as the DXF import, plus the texture images stored inside the file.

import { buildScene, parseSkp } from "openskp";
import type { CadMaterial, ImportedModel, ImportOptions, ImportWarning, LayerInfo, ModelMesh } from "../dxf/import";
import { textureKey } from "../materials";

export interface SkpImport {
  model: ImportedModel;
  /** Texture images embedded in the .skp, by file name (matches CadMaterial.map). */
  images: { name: string; data: Uint8Array }[];
}

interface SkpMat { name: string; color: { r: number; g: number; b: number; a: number }; transparency: number; texture: { filename: string; data: Uint8Array | null } | null; colorized?: boolean }
interface GltfMat { pbrMetallicRoughness: { baseColorFactor: number[]; baseColorTexture?: { index: number } }; doubleSided?: boolean }

/** "[Roofing Tile Spanish]" → "Roofing Tile Spanish", "0037_SandyBrown" → "SandyBrown"; "*1" (unnamed) → "". */
export function cleanSkpName(n: string): string {
  const t = n.replace(/^\[(.*)\]$/, "$1").replace(/^\d{3,4}_/, "").trim();
  return /^\*\d*$/.test(t) ? "" : t;
}

export function importSkp(bytes: Uint8Array, opts: ImportOptions = {}): SkpImport {
  const progress = opts.onProgress ?? (() => {});
  progress(0.05, "SketchUp-Datei wird gelesen");
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  let model: ReturnType<typeof parseSkp>, scene: ReturnType<typeof buildScene>;
  try {
    model = parseSkp(ab);
    progress(0.3, "Geometrie wird aufgebaut");
    scene = buildScene(ab, { respectEdgeVisibility: true });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const legacy = /legacy/i.test(msg);
    throw new Error(legacy
      ? "Diese SketchUp-Datei stammt aus einer älteren Version (2013–2020) und enthält etwas, das ARCHVISTA noch nicht lesen kann. Abhilfe: Datei in SketchUp öffnen und mit „Datei → Speichern unter“ in einer aktuellen Version (2021 oder neuer) speichern – dann klappt der Import."
      : "Die SketchUp-Datei konnte nicht gelesen werden. Bitte in SketchUp mit „Datei → Speichern unter“ neu speichern und erneut versuchen.");
  }
  progress(0.6, "Modell wird optimiert");
  const warnings: ImportWarning[] = [];
  const mats: SkpMat[] = (Array.isArray(model.materials) ? model.materials : Object.values(model.materials ?? {})) as SkpMat[];
  const hiddenLayers = new Set(((model.layers ?? []) as { name: string; hidden: boolean }[]).filter((l) => l.hidden).map((l) => l.name));
  const textures = scene.textures;

  // glTF materials carry colour/texture only — find the SketchUp material each one came from
  const same = (a?: Uint8Array | null, b?: Uint8Array | null) => !!a && !!b && a.length === b.length && a[0] === b[0] && a[a.length >> 1] === b[b.length >> 1] && a[a.length - 1] === b[b.length - 1];
  const used = new Map<string, CadMaterial>();
  const images = new Map<string, Uint8Array>();
  // SketchUp 2021+ keeps each tag's colour as a material "Layer_<tag>"; unpainted faces come out in that
  // colour. Those are not materials the user chose: treat them as unpainted.
  const isTagColour = (m: SkpMat) => /^Layer_/.test(m.name);
  const realMats = mats.filter((m) => !isTagColour(m));
  const tagRgb = new Set([
    ...mats.filter(isTagColour).map((m) => `${m.color.r},${m.color.g},${m.color.b}`),
    ...((model.layers ?? []) as { color?: { r: number; g: number; b: number } }[]).filter((l) => l.color).map((l) => `${l.color!.r},${l.color!.g},${l.color!.b}`),
  ]);
  const matFor = (g: GltfMat): { name?: string; color: number; textured: boolean } => {
    const f = g.pbrMetallicRoughness.baseColorFactor;
    const [r, gg, b] = f.map((v) => Math.round(v * 255));
    const ti = g.pbrMetallicRoughness.baseColorTexture?.index;
    const rgb = (m: SkpMat) => m.color.r === r && m.color.g === gg && m.color.b === b;
    let src: SkpMat | undefined;
    if (ti !== undefined) {
      const withTex = realMats.filter((m) => same(m.texture?.data, textures[ti]?.data)); // one image can serve several materials
      src = withTex.find(rgb) ?? withTex[0];
    } else if (!tagRgb.has(`${r},${gg},${b}`)) {
      // (a colour equal to a tag colour is SketchUp's "unpainted" — those faces get ARCHVISTA's rules)
      src = realMats.find((m) => !m.texture?.data && rgb(m));
    }
    // faces without a material: neutral, so ARCHVISTA's own rules decide (not the tag colour SketchUp shows)
    if (!src) return { color: 0xdddddd, textured: false };
    const name = cleanSkpName(src.name) || src.name;
    if (!used.has(name)) {
      const cm: CadMaterial = { name, color: (r << 16) | (gg << 8) | b };
      if (ti !== undefined && src.colorized) cm.colorize = true; // SketchUp tints this texture with the material colour
      if (ti !== undefined && textures[ti]) {
        const ext = textures[ti].mimeType === "image/png" ? "png" : "jpg";
        const file = textureKey(`${name}.${ext}`);
        cm.map = file;
        cm.sourceUv = true;
        images.set(file, textures[ti].data);
      }
      const alpha = f[3] ?? 1;
      if (alpha < 0.98) cm.opacity = alpha; else cm.opaque = true;
      used.set(name, cm);
    }
    return { name, color: (r << 16) | (gg << 8) | b, textured: ti !== undefined };
  };

  // merge primitives by tag + material → fewer, larger meshes
  const s = opts.unitsToMeters ?? 1; // SketchUp stores real sizes; a factor only when the user corrects units
  type Acc = { layer: string; material?: string; color: number; textured: boolean; single: boolean; pos: number[]; nrm: number[]; uv: number[]; idx: number[] };
  const groups = new Map<string, Acc>();
  const gm = scene.gltfMaterials as GltfMat[];
  let skippedHidden = 0, removedDup = 0, flippedWinding = 0;
  // the same triangle twice in the same place (e.g. a component copied onto itself) flickers in any renderer:
  // keep the first. A front/back pair of one-sided copies is not a duplicate (each is seen from one side).
  const seen = new Map<string, { single: boolean; dir: number }[]>();
  const q = (v: number) => Math.round(v * 1e4); // 0.1 mm
  const duplicate = (P: Float32Array, a: number, b: number, c: number, single: boolean): boolean => {
    const v = [a, b, c].map((i) => `${q(P[i * 3])},${q(P[i * 3 + 1])},${q(P[i * 3 + 2])}`);
    const key = [...v].sort().join("|");
    // winding direction relative to the sorted order (+1 / -1)
    const order = [v.indexOf([...v].sort()[0]), 0, 0];
    const i0 = order[0], dir = v[(i0 + 1) % 3] < v[(i0 + 2) % 3] ? 1 : -1;
    const list = seen.get(key);
    if (!list) { seen.set(key, [{ single, dir }]); return false; }
    if (list.some((t) => !t.single || !single || t.dir === dir)) return true;
    list.push({ single, dir });
    return false;
  };
  for (const p of scene.glbPrimitives) {
    const layer = scene.meshIndex[p.geomName]?.layer || "Untagged";
    if (hiddenLayers.has(layer)) { skippedHidden++; continue; }
    const gmat = gm[p.materialIndex] ?? { pbrMetallicRoughness: { baseColorFactor: [0.87, 0.87, 0.87, 1] }, doubleSided: true };
    const m = matFor(gmat);
    // a face painted differently on its two sides arrives as two one-sided copies: keep them one-sided (no flicker)
    const single = gmat.doubleSided !== true;
    const key = `${layer}\u0000${m.name ?? ""}\u0000${m.color}\u0000${single ? 1 : 2}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { layer, material: m.name, color: m.color, textured: m.textured, single, pos: [], nrm: [], uv: [], idx: [] }));
    const base = g.pos.length / 3;
    for (let i = 0; i < p.positions.length; i++) g.pos.push(p.positions[i] * s);
    for (let i = 0; i < p.normals.length; i++) g.nrm.push(p.normals[i]);
    for (let i = 0; i < p.uvs.length; i++) g.uv.push(p.uvs[i]);
    const P = p.positions, N = p.normals;
    for (let i = 0; i < p.indices.length; i += 3) {
      const a = p.indices[i];
      let b = p.indices[i + 1], c = p.indices[i + 2];
      // the triangulation's winding does not always match the face normal: make it match, so the front of a
      // triangle is the side its normal points to (correct light, and one-sided copies face the right way)
      const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
      const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
      const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
      if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0) { const t = b; b = c; c = t; flippedWinding++; }
      if (duplicate(P, a, b, c, single)) { removedDup++; continue; }
      g.idx.push(a + base, b + base, c + base);
    }
  }

  // origin: centre of footprint, lowest point (like the DXF import)
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of groups.values()) for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) {
    const v = g.pos[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v;
  }
  const ok = Number.isFinite(mn[0]);
  const origin: [number, number, number] = ok ? [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2] : [0, 0, 0];
  const meshes: ModelMesh[] = [];
  const layerMap = new Map<string, LayerInfo>();
  let gi = 0, triangles = 0, vertices = 0;
  for (const g of groups.values()) {
    if (!g.idx.length) continue;
    const positions = new Float32Array(g.pos.length);
    for (let i = 0; i < g.pos.length; i += 3) { positions[i] = g.pos[i] - origin[0]; positions[i + 1] = g.pos[i + 1] - origin[1]; positions[i + 2] = g.pos[i + 2] - origin[2]; }
    const indices = Uint32Array.from(g.idx);
    meshes.push({
      id: `m${gi++}`, layer: g.layer, color: g.color, ...(g.material ? { material: g.material } : {}),
      positions, normals: Float32Array.from(g.nrm), indices, triangleCount: indices.length / 3,
      ...(g.textured ? { uvs: Float32Array.from(g.uv) } : {}),
      ...(g.single ? { singleSided: true } : {}),
    });
    triangles += indices.length / 3; vertices += positions.length / 3;
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  const size = ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0];
  const rawExtent = Math.max(...size) / s;
  const plausible = rawExtent * s >= 2 && rawExtent * s <= 2000;
  if (!ok) warnings.push({ code: "no-3d", message: "In der SketchUp-Datei wurden keine sichtbaren Flächen gefunden." });
  else if (!plausible) warnings.push({ code: "units-implausible", message: `Das Modell ist ${(rawExtent * s).toFixed(1)} m groß – ungewöhnlich für ein Gebäude. Bei Bedarf die Einheit korrigieren.` });
  if (removedDup > 50) warnings.push({ code: "duplicates", message: `${removedDup.toLocaleString("de-AT")} doppelt übereinanderliegende Flächen wurden entfernt (sie würden flackern).` });
  if (skippedHidden) warnings.push({ code: "hidden-tags", message: `${skippedHidden} Teil(e) auf ausgeblendeten Tags wurden weggelassen – wie in SketchUp.` });
  progress(1, "Fertig");
  return {
    model: {
      meshes,
      materials: [...used.values()],
      layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
      units: { name: s === 1 ? "Meter" : `Faktor ${s}`, toMeters: s, source: opts.unitsToMeters ? "user" : "header", rawExtent, plausible },
      origin,
      bbox: ok ? { min: [mn[0] - origin[0], mn[1] - origin[1], mn[2] - origin[2]], max: [mx[0] - origin[0], mx[1] - origin[1], mx[2] - origin[2]] } : { min: [0, 0, 0], max: [0, 0, 0] },
      stats: { version: `SketchUp ${String(model.version ?? "").replace(/[{}]/g, "")}`, entityCounts: { "SketchUp-Flächen (Dreiecke)": triangles }, triangles, vertices, removedDegenerate: 0, removedDuplicate: removedDup, flippedForConsistency: flippedWinding, closedShellsOutward: 0 },
      warnings,
      ok,
    },
    images: [...images].map(([name, data]) => ({ name, data })),
  };
}
