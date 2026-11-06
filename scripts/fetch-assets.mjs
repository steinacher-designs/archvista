// ARCHVISTA — development-time asset fetcher.
// Downloads CC0 assets from Poly Haven (https://polyhaven.com, licence: CC0 1.0), converts them to
// web-friendly WebP / simplified GLB and records provenance in assets-lib/LICENSES.json.
// The resulting files are committed and shipped with the app; end users never download from Poly Haven.
import { mkdir, writeFile, readFile, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const OUT = path.resolve("assets-lib");
const UA = { "User-Agent": "ARCHVISTA-asset-pipeline/1.0" };
const api = async (p) => (await fetch(`https://api.polyhaven.com/${p}`, { headers: UA })).json();
const dl = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(url + " " + r.status); return Buffer.from(await r.arrayBuffer()); };

/** preset id → Poly Haven texture id */
export const TEXTURES = {
  plaster_white: "white_plaster_rough_01",
  plaster_warm: "clay_plaster",
  concrete: "concrete_wall_008",
  brick: "brick_wall_02",
  oak: "wood_floor",
  dark_wood: "dark_wooden_planks",
  timber_cladding: "wood_planks",
  stone_tiles: "granite_tile",
  terrace_stone: "rectangular_paving",
  roof_clay: "clay_roof_tiles_02",
  roof_slate: "roof_slates_02",
  grass: "acg:Grass001:2.0", // ambientCG (CC0) — Poly Haven has no lush lawn
  natural_stone: "sandstone_blocks_05",
  // environment grounds
  env_sand: "coast_sand_01",
  env_asphalt: "asphalt_02",
  env_forest: "forest_ground_04",
  env_paving: "precast_stone_paving",
};
export const HDRIS = {
  day: "kloofendal_48d_partly_cloudy_puresky",
  afternoon: "qwantani_late_afternoon_puresky",
  evening: "belfast_sunset_puresky",
  studio: "studio_small_09",
};
export const MODELS = {
  shrub_a: { id: "shrub_04", ratio: 0.5 },
  shrub_b: { id: "shrub_01", ratio: 0.25 },
  grass_a: { id: "grass_medium_01", ratio: 0.35 },
  rocks: { id: "rock_moss_set_01", ratio: 0.3 },
  tree_a: { id: "island_tree_01", ratio: 0.04 },
  tree_b: { id: "tree_small_02", ratio: 0.03 },
};

const licences = existsSync(path.join(OUT, "LICENSES.json")) ? JSON.parse(await readFile(path.join(OUT, "LICENSES.json"), "utf8")) : {};
const record = async (key, id, kind) => {
  const info = await api(`info/${id}`);
  licences[key] = { polyhaven_id: id, name: info.name, kind, authors: Object.keys(info.authors ?? {}), licence: "CC0 1.0", url: `https://polyhaven.com/a/${id}`, dimensions_mm: info.dimensions ?? null };
  return info;
};

async function textures(only) {
  await mkdir(path.join(OUT, "tex"), { recursive: true });
  for (const [key, id] of Object.entries(TEXTURES)) {
    if (only && !only.includes(key)) continue;
    const dest = path.join(OUT, "tex", key);
    if (existsSync(dest + "_col.webp")) { console.log("skip", key); continue; }
    if (id.startsWith("acg:")) { await ambientcg(key, id, dest); continue; }
    const files = await api(`files/${id}`);
    const info = await record(key, id, "texture");
    const pick = (k, res) => files[k]?.[res]?.jpg?.url ?? files[k]?.[res]?.png?.url;
    const col = await dl(pick("Diffuse", "2k"));
    const nor = await dl(pick("nor_gl", "1k"));
    const arm = await dl(pick("arm", "1k"));
    await sharp(col).webp({ quality: 80 }).toFile(dest + "_col.webp");
    await sharp(nor).webp({ quality: 88 }).toFile(dest + "_nor.webp");
    await sharp(arm).webp({ quality: 85 }).toFile(dest + "_arm.webp");
    console.log("tex", key, id, info.dimensions);
  }
}

/** ambientCG (https://ambientcg.com, CC0 1.0): zip with Color / NormalGL / Roughness / AmbientOcclusion. */
async function ambientcg(key, spec, dest) {
  const [, id, size] = spec.split(":");
  const zip = await dl(`https://ambientcg.com/get?file=${id}_2K-JPG.zip`);
  const dir = path.resolve(".asset-cache/acg", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "a.zip"), zip);
  execFileSync("unzip", ["-o", "-q", path.join(dir, "a.zip"), "-d", dir]);
  const f = (s) => path.join(dir, `${id}_2K-JPG_${s}.jpg`);
  await sharp(f("Color")).webp({ quality: 80 }).toFile(dest + "_col.webp");
  await sharp(f("NormalGL")).resize(1024, 1024).webp({ quality: 88 }).toFile(dest + "_nor.webp");
  const ao = await sharp(f("AmbientOcclusion")).resize(1024, 1024).greyscale().raw().toBuffer();
  const ro = await sharp(f("Roughness")).resize(1024, 1024).greyscale().raw().toBuffer();
  const arm = Buffer.alloc(1024 * 1024 * 3);
  for (let i = 0; i < 1024 * 1024; i++) { arm[i * 3] = ao[i]; arm[i * 3 + 1] = ro[i]; arm[i * 3 + 2] = 0; }
  await sharp(arm, { raw: { width: 1024, height: 1024, channels: 3 } }).webp({ quality: 85 }).toFile(dest + "_arm.webp");
  licences[key] = { source: "ambientCG", id, name: id, kind: "texture", authors: ["ambientCG (Lennart Demes)"], licence: "CC0 1.0", url: `https://ambientcg.com/view?id=${id}`, dimensions_mm: [+size * 1000, +size * 1000] };
  console.log("tex", key, "ambientCG", id);
}

async function hdris() {
  await mkdir(path.join(OUT, "hdri"), { recursive: true });
  for (const [key, id] of Object.entries(HDRIS)) {
    const dest = path.join(OUT, "hdri", key + ".hdr");
    if (existsSync(dest)) { console.log("skip", key); continue; }
    const files = await api(`files/${id}`);
    await record("hdri_" + key, id, "hdri");
    await writeFile(dest, await dl(files.hdri["2k"].hdr.url));
    console.log("hdri", key, id);
  }
}

/** keep = fraction of leaf cards kept, wood = simplification ratio for opaque parts */
export const MODEL_LOD = {
  shrub_a: { keep: 0.35, wood: 0.3 }, shrub_b: { keep: 0.2, wood: 0.3 }, grass_a: { keep: 0.12, wood: 0.3 },
  rocks: { keep: 1, wood: 0.25 }, tree_a: { keep: 0.11, wood: 0.05 }, tree_b: { keep: 0.07, wood: 0.05 },
};

async function models() {
  await mkdir(path.join(OUT, "models"), { recursive: true });
  const raw = path.resolve(".asset-cache/raw");
  for (const [key, { id }] of Object.entries(MODELS)) {
    const dest = path.join(OUT, "models", key + ".glb");
    if (existsSync(dest) && !process.env.FORCE) { console.log("skip", key); continue; }
    const files = await api(`files/${id}`);
    await record("model_" + key, id, "model");
    const g = files.gltf["1k"].gltf;
    const dir = path.join(raw, key);
    if (!existsSync(path.join(dir, "model.gltf"))) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "model.gltf"), await dl(g.url));
      for (const [rel, f] of Object.entries(g.include ?? {})) {
        await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
        await writeFile(path.join(dir, rel), await dl(f.url));
      }
    }
    // Poly Haven's glTF uses JPG (no alpha). Merge the separate alpha mask into the leaf colour texture.
    const alphaKey = ["leaves_alpha", "Alpha", "Mask"].find((k) => files[k]);
    if (alphaKey && !existsSync(path.join(dir, "rgba.done"))) {
      const gltf = JSON.parse(await readFile(path.join(dir, "model.gltf"), "utf8"));
      const alpha = await sharp(await dl(files[alphaKey]["1k"].jpg.url)).greyscale().raw().toBuffer({ resolveWithObject: true });
      const leafMats = gltf.materials.filter((m) => m.alphaMode && m.alphaMode !== "OPAQUE");
      for (const m of leafMats) {
        const texIdx = m.pbrMetallicRoughness?.baseColorTexture?.index;
        if (texIdx === undefined) continue;
        const img = gltf.images[gltf.textures[texIdx].source];
        const src = path.join(dir, img.uri);
        const { data, info } = await sharp(src).resize(alpha.info.width, alpha.info.height).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const rgba = Buffer.alloc(info.width * info.height * 4);
        for (let i = 0; i < info.width * info.height; i++) {
          rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = alpha.data[i];
        }
        const out = img.uri.replace(/\.jpg$/i, "_rgba.png");
        await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(dir, out));
        img.uri = out; img.mimeType = "image/png";
      }
      await writeFile(path.join(dir, "model.gltf"), JSON.stringify(gltf));
      await writeFile(path.join(dir, "rgba.done"), "1");
    }
    const lod = MODEL_LOD[key];
    execFileSync("node", [path.resolve("scripts/lod-tree.mjs"), path.join(dir, "model.gltf"), dest, String(lod.keep), String(lod.wood)], { stdio: "pipe", maxBuffer: 1 << 28 });
    console.log("model", key, id, ((await stat(dest)).size / 1e6).toFixed(2), "MB");
  }
}

const what = process.argv[2] ?? "all";
if (what === "all" || what === "textures") await textures();
if (what === "all" || what === "hdri") await hdris();
if (what === "all" || what === "models") await models();
await writeFile(path.join(OUT, "LICENSES.json"), JSON.stringify(licences, null, 2));
// manifest consumed by the viewer (texture real-world sizes in metres)
const manifest = { textures: {}, hdri: {}, models: {} };
for (const [k, v] of Object.entries(licences)) {
  if (v.kind === "texture") manifest.textures[k] = { size: Math.round(((v.dimensions_mm?.[0] ?? 2000) / 1000) * 1000) / 1000 };
  else if (v.kind === "hdri") manifest.hdri[k.slice(5)] = {};
  else manifest.models[k.slice(6)] = {};
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log("done");
