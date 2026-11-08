// ARCHVISTA — four procedural environments. Every asset is generated in code (no licensed content).

import {
  BufferGeometry, Color, CylinderGeometry, ConeGeometry, DodecahedronGeometry, Float32BufferAttribute, Group, IcosahedronGeometry,
  InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, Object3D, PlaneGeometry, Quaternion,
  Vector2, Vector3, BoxGeometry, DoubleSide, CircleGeometry, ShadowMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvironmentId } from "../core/project";
import { makeMaps, waterNormals, facadeTexture } from "./textures";
import { PRESET } from "../core/materials";
import type { AssetLibrary } from "./assets";

export type Lighting = "day" | "afternoon" | "evening";

export interface EnvContext {
  center: [number, number];
  /** Building plan radius (m). */
  radius: number;
  groundY: number;
  /** Azimuth (rad) from building centre towards the main viewpoint / entrance. */
  frontAzimuth: number;
  hasTerrain: boolean;
  quality: "performance" | "balanced" | "ultra";
  lib: AssetLibrary;
  lighting: Lighting;
}

export interface EnvResult {
  group: Group;
  sky: { elevation: number; azimuth: number; turbidity: number; rayleigh: number; mie: number } | null;
  background?: string;
  fog: { color: string; near: number; far: number } | null;
  exposure: number;
  sun: { color: string; intensity: number; elevation: number; azimuth: number };
  hemi: { sky: string; ground: string; intensity: number };
  update?: (t: number) => void;
  /** HDRI key for sky + image based lighting (null = procedural sky). */
  hdri: string | null;
  /** Desired sun azimuth (deg); the HDRI is rotated so its sun lands there. */
  sunAzimuth: number;
  /** Visitors stay within this radius around the building. */
  walkRadius: number;
  /** Photographic surroundings (ground-projected panorama) instead of modelled ones. */
  photo?: { key: string; radius: number };
}

// ——— seeded random ———
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function n2(x: number, z: number) { return Math.sin(x * 0.05 + Math.sin(z * 0.031) * 2) * 0.5 + Math.sin(z * 0.043 + x * 0.017) * 0.5; }

function colorize(g: BufferGeometry, c: Color, jitter = 0, rand = Math.random) {
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const j = 1 + (rand() - 0.5) * jitter; arr[i * 3] = c.r * j; arr[i * 3 + 1] = c.g * j; arr[i * 3 + 2] = c.b * j; }
  g.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return g;
}
function blob(radius: number, detail: number, rand: () => number, squash = 1) {
  const g = new IcosahedronGeometry(radius, detail);
  const p = g.attributes.position as unknown as { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number; setXYZ(i: number, x: number, y: number, z: number): void };
  const ph = rand() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.18 * Math.sin(x * 3.1 + ph) * Math.sin(y * 2.7 + ph) * Math.sin(z * 3.3);
    p.setXYZ(i, x * k, y * k * squash, z * k);
  }
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  return g;
}
function strip(g: BufferGeometry) { g.deleteAttribute("uv"); return g.index ? g.toNonIndexed() : g; }

export function deciduousTree(seed: number): BufferGeometry {
  const r = rng(seed);
  const parts: BufferGeometry[] = [];
  const trunk = new CylinderGeometry(0.12, 0.2, 3.2, 7); trunk.translate(0, 1.6, 0);
  parts.push(colorize(strip(trunk), new Color("#5a4636"), 0.2, r));
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const b = blob(1.2 + r() * 0.9, 1, r, 0.85);
    b.translate((r() - 0.5) * 2.2, 3.6 + r() * 1.8, (r() - 0.5) * 2.2);
    parts.push(colorize(strip(b), new Color().setHSL(0.22 + r() * 0.07, 0.55, 0.17 + r() * 0.07), 0.25, r));
  }
  return mergeGeometries(parts)!;
}
export function conifer(seed: number): BufferGeometry {
  const r = rng(seed);
  const parts: BufferGeometry[] = [];
  const trunk = new CylinderGeometry(0.1, 0.18, 2, 6); trunk.translate(0, 1, 0);
  parts.push(colorize(strip(trunk), new Color("#4b3a2c"), 0.2, r));
  const h = 7 + r() * 5;
  for (let i = 0; i < 5; i++) {
    const rad = (1 - i / 5) * (1.8 + r() * 0.4) + 0.3;
    const c = new ConeGeometry(rad, h / 3.2, 8, 1);
    c.translate(0, 1.6 + (i * h) / 6 + h / 6.4, 0);
    parts.push(colorize(strip(c), new Color().setHSL(0.36 + r() * 0.05, 0.42, 0.09 + r() * 0.04), 0.3, r));
  }
  return mergeGeometries(parts)!;
}
export function stonePine(seed: number): BufferGeometry {
  const r = rng(seed);
  const parts: BufferGeometry[] = [];
  const trunk = new CylinderGeometry(0.12, 0.22, 6, 7); trunk.translate(0.3, 3, 0); trunk.rotateZ(-0.06);
  parts.push(colorize(strip(trunk), new Color("#6b4f3a"), 0.2, r));
  for (let i = 0; i < 4; i++) {
    const b = blob(1.6 + r() * 0.6, 1, r, 0.45);
    b.translate((r() - 0.5) * 2.5 + 0.4, 6.2 + r() * 0.6, (r() - 0.5) * 2.5);
    parts.push(colorize(strip(b), new Color().setHSL(0.26, 0.42, 0.14 + r() * 0.05), 0.25, r));
  }
  return mergeGeometries(parts)!;
}
function bush(seed: number) {
  const r = rng(seed);
  const parts = [0, 1, 2].map(() => { const b = blob(0.5 + r() * 0.3, 1, r, 0.8); b.translate((r() - 0.5) * 0.8, 0.4, (r() - 0.5) * 0.8); return colorize(strip(b), new Color().setHSL(0.25 + r() * 0.05, 0.5, 0.15), 0.3, r); });
  return mergeGeometries(parts)!;
}
function rock(seed: number) {
  const r = rng(seed);
  const g = new DodecahedronGeometry(0.6, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.5), p.getY(i) * (0.5 + r() * 0.3), p.getZ(i) * (0.8 + r() * 0.5));
  g.computeVertexNormals();
  return colorize(strip(g), new Color("#8d8a84"), 0.15, r);
}

const vertexMat = () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: false });

function scatter(geo: BufferGeometry, positions: { x: number; z: number; y: number; s: number; rot: number }[], castShadow = true): InstancedMesh {
  const m = new InstancedMesh(geo, vertexMat(), positions.length);
  const mat = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0);
  positions.forEach((p, i) => { q.setFromAxisAngle(up, p.rot); mat.compose(new Vector3(p.x, p.y, p.z), q, new Vector3(p.s, p.s, p.s)); m.setMatrixAt(i, mat); });
  m.castShadow = castShadow; m.receiveShadow = true;
  return m;
}

function groundMaterial(presetId: string, repeatScale = 1) {
  const pr = PRESET.get(presetId)!;
  const maps = makeMaps(pr.texture, pr.color);
  const mat = new MeshStandardMaterial({ color: "#ffffff", roughness: pr.roughness, metalness: 0, vertexColors: false });
  if (maps) {
    for (const k of ["map", "normalMap", "roughnessMap"] as const) { const t = maps[k].clone(); t.repeat.set(1 / (pr.scale * repeatScale), 1 / (pr.scale * repeatScale)); t.needsUpdate = true; mat[k] = t; }
  } else mat.color.set(pr.color);
  return mat;
}

/** Terrain disc: flat inside `flat` radius, gentle hills outside. UVs in metres. */
function terrain(ctx: EnvContext, size: number, hill: number, flat: number, heightFn?: (x: number, z: number, d: number) => number) {
  const seg = ctx.quality === "performance" ? 90 : 160;
  const g = new PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ctx.center[0], z = p.getZ(i) + ctx.center[1];
    const d = Math.hypot(p.getX(i), p.getZ(i));
    const t = Math.min(1, Math.max(0, (d - flat) / (flat * 2)));
    let y = ctx.groundY - 0.02 + hill * t * t * (0.6 + 0.4 * n2(x, z));
    if (heightFn) y = heightFn(x, z, d);
    p.setXYZ(i, x, y, z);
    uv.setXY(i, x, z);
  }
  g.computeVertexNormals();
  return g;
}

function ringPositions(ctx: EnvContext, count: number, rMin: number, rMax: number, seed: number, avoid?: (x: number, z: number) => boolean) {
  const r = rng(seed);
  const out: { x: number; z: number; y: number; s: number; rot: number }[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const a = r() * Math.PI * 2, d = rMin + Math.sqrt(r()) * (rMax - rMin);
    const x = ctx.center[0] + Math.cos(a) * d, z = ctx.center[1] + Math.sin(a) * d;
    // keep the view towards the main facade open
    const rel = Math.atan2(x - ctx.center[0], z - ctx.center[1]);
    const da = Math.abs(((rel - ctx.frontAzimuth + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da < 0.45 && d < rMin * 2.2) continue;
    if (avoid?.(x, z)) continue;
    out.push({ x, z, y: ctx.groundY, s: 0.8 + r() * 0.5, rot: r() * Math.PI * 2 });
  }
  return out;
}

// ——— real assets (async upgrades; procedural versions stay as fallback) ———

/** Swap a ground material to the photo-scanned version when it has loaded. */
function photoGround(ctx: EnvContext, mat: MeshStandardMaterial, key: string, repeatScale = 1) {
  ctx.lib.photo(key).then((ph) => {
    if (!ph) return;
    const rep = 1 / (ph.size * repeatScale);
    const set = (t: import("three").Texture) => { const c = t.clone(); c.repeat.set(rep, rep); c.needsUpdate = true; return c; };
    mat.map = set(ph.map); mat.normalMap = set(ph.normalMap);
    const arm = set(ph.arm);
    mat.roughnessMap = arm; mat.aoMap = arm; mat.roughness = 1; mat.metalness = 0;
    if (!mat.vertexColors) mat.color.set("#ffffff");
    mat.needsUpdate = true;
  });
  return mat;
}

/** Place instances of a real plant/rock model once it has loaded. Heights in metres. */
function placeModel(ctx: EnvContext, group: Group, key: string, pts: { x: number; z: number; y: number; s: number; rot: number }[], height: [number, number]) {
  if (!pts.length) return;
  ctx.lib.model(key).then((asset) => {
    if (!asset) return;
    const mtx = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0);
    for (const part of asset.parts) {
      const im = new InstancedMesh(part.geometry, part.material, pts.length);
      pts.forEach((p, i) => {
        const h = height[0] + (height[1] - height[0]) * ((p.s - 0.8) / 0.5);
        const k = h / (asset.height || 1);
        q.setFromAxisAngle(up, p.rot);
        mtx.compose(new Vector3(p.x, p.y - 0.05, p.z), q, new Vector3(k, k, k));
        im.setMatrixAt(i, mtx);
      });
      im.castShadow = true; im.receiveShadow = true;
      im.frustumCulled = false;
      group.add(im);
    }
  });
}

const counts = (ctx: EnvContext, n: number) => Math.max(1, Math.round(n * (ctx.quality === "ultra" ? 1.3 : ctx.quality === "balanced" ? 1 : 0.4)));

function sunFor(ctx: EnvContext) {
  const base = deg(ctx.frontAzimuth);
  // opposite side to the main camera (which looks from front-right): raking light + one facade in shade
  return ctx.lighting === "evening" ? base - 50 : ctx.lighting === "afternoon" ? base - 62 : base - 70;
}
function exposureFor(ctx: EnvContext, day: number) { return ctx.lighting === "evening" ? day * 1.45 : ctx.lighting === "afternoon" ? day * 1.08 : day; }

// ——— environments ———

function forest(ctx: EnvContext): EnvResult {
  const g = new Group();
  const flat = ctx.radius + 12;
  const tg = terrain(ctx, 900, 14, flat);
  const ground = new Mesh(tg, photoGround(ctx, groundMaterial("grass"), "grass"));
  ground.receiveShadow = true;
  g.add(ground);
  const heightAt = (x: number, z: number) => {
    const d = Math.hypot(x - ctx.center[0], z - ctx.center[1]);
    const t = Math.min(1, Math.max(0, (d - flat) / (flat * 2)));
    return ctx.groundY - 0.02 + 14 * t * t * (0.6 + 0.4 * n2(x, z));
  };
  const onGround = (p: { x: number; z: number; y: number; s: number; rot: number }) => ({ ...p, y: heightAt(p.x, p.z) });
  // far: low-poly silhouettes that dissolve in the haze
  const types = [0, 1, 2].map((s) => conifer(10 + s)).concat([deciduousTree(20)]);
  types.forEach((geo, k) => g.add(scatter(geo, ringPositions(ctx, counts(ctx, 90), flat + 55, 300, 100 + k).map(onGround), false)));
  // near: real scanned trees, shrubs, grass and rocks
  placeModel(ctx, g, "tree_a", ringPositions(ctx, counts(ctx, 14), flat + 2, flat + 55, 201).map(onGround), [6, 9]);
  placeModel(ctx, g, "tree_b", ringPositions(ctx, counts(ctx, 12), flat + 4, flat + 55, 202).map(onGround), [7, 11]);
  placeModel(ctx, g, "shrub_a", ringPositions(ctx, counts(ctx, 24), ctx.radius + 2, flat + 10, 203), [0.8, 1.4]);
  placeModel(ctx, g, "shrub_b", ringPositions(ctx, counts(ctx, 16), ctx.radius + 3, flat + 20, 204), [1.0, 1.8]);
  placeModel(ctx, g, "grass_a", ringPositions(ctx, counts(ctx, 260), ctx.radius + 1.5, flat + 30, 205).map(onGround), [0.35, 0.6]);
  placeModel(ctx, g, "rocks", ringPositions(ctx, counts(ctx, 6), flat + 3, flat + 30, 206).map(onGround), [0.8, 1.4]);
  const az = sunFor(ctx);
  return {
    group: g, hdri: ctx.lighting, sunAzimuth: az,
    sky: { elevation: 34, azimuth: az, turbidity: 6, rayleigh: 1.6, mie: 0.005 },
    fog: { color: "#b8c8d2", near: 90, far: 650 },
    exposure: exposureFor(ctx, 0.75),
    sun: { color: "#ffe9cc", intensity: 3.4, elevation: 34, azimuth: az },
    hemi: { sky: "#bcd3e6", ground: "#3a4426", intensity: 0.15 },
    walkRadius: flat + 25,
  };
}

function coastal(ctx: EnvContext): EnvResult {
  const g = new Group();
  const seaDir = ctx.frontAzimuth + Math.PI; // sea behind the building
  const sx = Math.sin(seaDir), sz = Math.cos(seaDir);
  const shore = ctx.radius + 28;
  const heightFn = (x: number, z: number, d: number) => {
    const along = (x - ctx.center[0]) * sx + (z - ctx.center[1]) * sz;
    const flat = ctx.radius + 8;
    let y = ctx.groundY - 0.02;
    if (along > shore) y -= Math.min(3.5, (along - shore) * 0.12);
    else if (d > flat) y += Math.max(0, Math.min(1, (d - flat) / 60)) * 6 * (0.5 + 0.5 * n2(x, z)) * Math.max(0, Math.min(1, (shore - along) / 30));
    return y;
  };
  const tg = terrain(ctx, 900, 0, ctx.radius + 8, heightFn);
  const p = tg.attributes.position, col = new Float32Array(p.count * 3);
  const dune = new Color("#cbbf98"), sand = new Color("#ffffff");
  for (let i = 0; i < p.count; i++) {
    const along = (p.getX(i) - ctx.center[0]) * sx + (p.getZ(i) - ctx.center[1]) * sz;
    const t = Math.min(1, Math.max(0, (along - (shore - 25)) / 20));
    const c = dune.clone().lerp(sand, t);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute("color", new Float32BufferAttribute(col, 3));
  const sandMat = new MeshStandardMaterial({ color: "#e3d3ae", roughness: 0.95, vertexColors: true });
  const ground = new Mesh(tg, photoGround(ctx, sandMat, "env_sand")); ground.receiveShadow = true; g.add(ground);
  // garden lawn around the house
  const lawnGeo = new CircleGeometry(ctx.radius + 10, 64); lawnGeo.rotateX(-Math.PI / 2);
  const luv = lawnGeo.attributes.uv, lp = lawnGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) luv.setXY(i, lp.getX(i) + ctx.center[0], lp.getZ(i) + ctx.center[1]);
  const lawn = new Mesh(lawnGeo, photoGround(ctx, groundMaterial("grass"), "grass"));
  lawn.position.set(ctx.center[0], ctx.groundY - 0.005, ctx.center[1]); lawn.receiveShadow = true; g.add(lawn);
  // sea
  const normals = waterNormals();
  normals.repeat.set(60, 60);
  const water = new MeshPhysicalMaterial({ color: "#0b3a47", roughness: 0.04, metalness: 0, normalMap: normals, normalScale: new Vector2(0.45, 0.45), clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 });
  const sea = new Mesh(new PlaneGeometry(4000, 4000), water);
  sea.rotateX(-Math.PI / 2);
  sea.position.set(ctx.center[0] + sx * (shore + 1600), ctx.groundY - 1.1, ctx.center[1] + sz * (shore + 1600));
  g.add(sea);
  const inland = (x: number, z: number) => (x - ctx.center[0]) * sx + (z - ctx.center[1]) * sz > shore - 22;
  const H = (q: { x: number; z: number; y: number; s: number; rot: number }) => ({ ...q, y: heightFn(q.x, q.z, Math.hypot(q.x - ctx.center[0], q.z - ctx.center[1])) });
  [0, 1, 2].forEach((k) => g.add(scatter(stonePine(30 + k), ringPositions(ctx, counts(ctx, 24), ctx.radius + 40, 220, 40 + k, inland).map(H), false)));
  placeModel(ctx, g, "tree_a", ringPositions(ctx, counts(ctx, 8), ctx.radius + 10, ctx.radius + 40, 301, inland).map(H), [5, 8]);
  placeModel(ctx, g, "shrub_a", ringPositions(ctx, counts(ctx, 22), ctx.radius + 2, ctx.radius + 26, 302, inland).map(H), [0.7, 1.3]);
  placeModel(ctx, g, "grass_a", ringPositions(ctx, counts(ctx, 220), ctx.radius + 6, shore + 4, 303).map(H), [0.4, 0.7]);
  placeModel(ctx, g, "rocks", ringPositions(ctx, counts(ctx, 8), shore - 6, shore + 14, 304).map(H), [0.8, 1.8]);
  const az = ctx.lighting === "day" ? deg(seaDir) - 110 : deg(seaDir) - 120;
  return {
    group: g, hdri: ctx.lighting, sunAzimuth: az,
    sky: { elevation: 18, azimuth: az, turbidity: 4, rayleigh: 2.2, mie: 0.006 },
    fog: { color: "#d2dee6", near: 200, far: 1800 },
    exposure: exposureFor(ctx, 0.72),
    sun: { color: "#ffe2bd", intensity: 3.2, elevation: 18, azimuth: az },
    hemi: { sky: "#d6e8f5", ground: "#b5a37f", intensity: 0.15 },
    update: (t) => { normals.offset.set(t * 0.004, t * 0.0025); },
    walkRadius: shore,
  };
}

function urban(ctx: EnvContext): EnvResult {
  const g = new Group();
  const plot = ctx.radius + 6;
  const road = 10, walk = 3.5;
  const [cx, cz] = ctx.center;
  const y0 = ctx.groundY;
  const plane = (w: number, d: number, x: number, z: number, y: number, mat: MeshStandardMaterial) => {
    const geo = new PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + x, p.getZ(i) + z);
    const m = new Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
  };
  const asphalt = groundMaterial("concrete", 2); asphalt.color.set("#5d6064"); asphalt.roughness = 0.95;
  g.add(plane(1200, 1200, cx, cz, y0 - 0.15, photoGround(ctx, asphalt, "env_asphalt")));
  g.add(plane((plot + walk) * 2, (plot + walk) * 2, cx, cz, y0 - 0.008, photoGround(ctx, groundMaterial("stone_tiles"), "env_paving")));
  g.add(plane(plot * 2, plot * 2, cx, cz, y0 - 0.002, photoGround(ctx, groundMaterial("grass"), "grass")));
  const kerb = new Mesh(new BoxGeometry((plot + walk) * 2 + 0.3, 0.15, (plot + walk) * 2 + 0.3), new MeshStandardMaterial({ color: "#a7a39b", roughness: 0.8 }));
  kerb.position.set(cx, y0 - 0.085, cz); kerb.receiveShadow = true; g.add(kerb);
  const r = rng(77);
  const variants = [0, 1, 2, 3].map((v) => ({ geos: [] as BufferGeometry[], tex: facadeTexture(v + 3) }));
  const inner = plot + walk + road;
  const dense = ctx.quality === "ultra" ? 1 : ctx.quality === "balanced" ? 0.8 : 0.5;
  for (let i = -6; i <= 6; i++)
    for (let j = -6; j <= 6; j++) {
      const bx = cx + i * 34, bz = cz + j * 34;
      if (Math.abs(bx - cx) < inner + 14 && Math.abs(bz - cz) < inner + 14) continue;
      const rel = Math.atan2(bx - cx, bz - cz);
      const da = Math.abs(((rel - ctx.frontAzimuth + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < 0.35 && Math.hypot(bx - cx, bz - cz) < inner + 60) continue;
      if (r() > dense) continue;
      const w = 16 + r() * 10, d = 16 + r() * 10, h = 9 + r() * (Math.hypot(i, j) > 3 ? 45 : 18);
      const box = new BoxGeometry(w, h, d);
      const uv = box.attributes.uv, pos = box.attributes.position, nrm = box.attributes.normal;
      for (let k = 0; k < uv.count; k++) {
        const nx = Math.abs(nrm.getX(k)), ny = Math.abs(nrm.getY(k));
        const u = ny > 0.5 ? 0 : nx > 0.5 ? pos.getZ(k) : pos.getX(k);
        uv.setXY(k, ny > 0.5 ? 0.05 : u / 28, ny > 0.5 ? 0.02 : (pos.getY(k) + h / 2) / 42);
      }
      box.translate(bx, y0 + h / 2, bz);
      variants[Math.floor(r() * 4)].geos.push(box);
    }
  for (const v of variants) {
    if (!v.geos.length) continue;
    const m = new Mesh(mergeGeometries(v.geos)!, new MeshStandardMaterial({ map: v.tex, roughness: 0.6, metalness: 0.15 }));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  const treePos: { x: number; z: number; y: number; s: number; rot: number }[] = [];
  const lampPos: typeof treePos = [];
  const e = plot + walk - 1.2;
  for (let s = -e; s <= e; s += 9) for (const [x, z] of [[s, -e], [s, e], [-e, s], [e, s]]) treePos.push({ x: cx + x, z: cz + z, y: y0, s: 0.8 + r() * 0.5, rot: r() * 6 });
  for (let s = -e + 4.5; s <= e; s += 18) for (const [x, z] of [[s, -e], [s, e], [-e, s], [e, s]]) lampPos.push({ x: cx + x, z: cz + z, y: y0, s: 1, rot: 0 });
  const frontClear = (p: { x: number; z: number }) => {
    const rel = Math.atan2(p.x - cx, p.z - cz);
    return Math.abs(((rel - ctx.frontAzimuth + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.3;
  };
  placeModel(ctx, g, "tree_a", treePos.filter(frontClear), [6, 8]);
  placeModel(ctx, g, "shrub_a", ringPositions(ctx, counts(ctx, 18), ctx.radius + 1.5, plot - 1, 401), [0.7, 1.2]);
  const lamp = mergeGeometries([colorize(strip(new CylinderGeometry(0.06, 0.08, 4.5, 6).translate(0, 2.25, 0)), new Color("#2c2f33")), colorize(strip(new BoxGeometry(0.5, 0.12, 0.25).translate(0.2, 4.5, 0)), new Color("#2c2f33"))])!;
  g.add(scatter(lamp, lampPos, false));
  const az = sunFor(ctx);
  return {
    group: g, hdri: ctx.lighting, sunAzimuth: az,
    sky: { elevation: 42, azimuth: az, turbidity: 8, rayleigh: 1.2, mie: 0.008 },
    fog: { color: "#bfc7ce", near: 140, far: 700 },
    exposure: exposureFor(ctx, 0.72),
    sun: { color: "#fff6e8", intensity: 3.2, elevation: 42, azimuth: az },
    hemi: { sky: "#d9e4ee", ground: "#6f6d68", intensity: 0.15 },
    walkRadius: plot + walk + road * 0.5,
  };
}

function studio(ctx: EnvContext): EnvResult {
  const g = new Group();
  const R = Math.max(40, ctx.radius * 4);
  const mat = new MeshStandardMaterial({ color: "#e4e2de", roughness: 0.92, metalness: 0, side: DoubleSide });
  const floor = new Mesh(new CircleGeometry(R, 96), mat);
  floor.rotateX(-Math.PI / 2); floor.position.set(ctx.center[0], ctx.groundY - 0.01, ctx.center[1]); floor.receiveShadow = true;
  g.add(floor);
  const prof: Vector2[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push(new Vector2(R - R * 0.25 * (1 - Math.cos(a)) + R * 0.25, R * 0.25 * Math.sin(a))); }
  prof.push(new Vector2(R * 1.25, R * 0.9));
  const cyc = new Mesh(new LatheGeometry(prof.map((v) => new Vector2(v.x * 0.8, v.y)), 96, ctx.frontAzimuth + Math.PI / 2 + 0.6, Math.PI * 2 - 1.2), mat);
  cyc.position.set(ctx.center[0], ctx.groundY - 0.01, ctx.center[1]); cyc.receiveShadow = true;
  g.add(cyc);
  const az = deg(ctx.frontAzimuth) + 65;
  return {
    group: g, sky: null, background: "#e9e7e3", hdri: "studio", sunAzimuth: az,
    fog: { color: "#e9e7e3", near: R * 0.9, far: R * 2.4 },
    exposure: 0.85,
    sun: { color: "#ffffff", intensity: 2.6, elevation: 48, azimuth: az },
    hemi: { sky: "#ffffff", ground: "#d8d4ce", intensity: 0.3 },
    walkRadius: R * 0.7,
  };
}

const deg = (r: number) => (r * 180) / Math.PI;

/** Real photo panorama from Poly Haven, projected onto the ground; only an invisible shadow catcher is modelled. */
function photo(ctx: EnvContext, key: string): EnvResult {
  const g = new Group();
  const radius = Math.max(120, ctx.radius * 8);
  const catcher = new Mesh(new CircleGeometry(radius * 0.9, 64), new ShadowMaterial({ opacity: 0.42, color: "#1a1814" }));
  catcher.rotateX(-Math.PI / 2);
  catcher.position.set(ctx.center[0], ctx.groundY + 0.005, ctx.center[1]);
  catcher.receiveShadow = true;
  g.add(catcher);
  const az = deg(ctx.frontAzimuth) - 62;
  return {
    group: g, hdri: null, sunAzimuth: az, sky: null,
    fog: null, exposure: 0.85,
    sun: { color: "#fff4e6", intensity: 3, elevation: 35, azimuth: az },
    hemi: { sky: "#ffffff", ground: "#666666", intensity: 0.05 },
    walkRadius: Math.min(radius * 0.6, ctx.radius + 30),
    photo: { key, radius },
  };
}

export function buildEnvironment(id: EnvironmentId, ctx: EnvContext): EnvResult {
  if (id === "custom") return photo(ctx, "custom"); // the viewer loads the user's panorama itself
  if (id !== "studio" && ctx.lib.hasSync("hdri", `env_${id}`)) return photo(ctx, `env_${id}`);
  switch (id) {
    case "forest": return forest(ctx);
    case "coastal": return coastal(ctx);
    case "urban": return urban(ctx);
    default: return studio(ctx);
  }
}

export function disposeGroup(o: Object3D) {
  o.traverse((c) => {
    const m = c as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mt of mats) {
      for (const v of Object.values(mt)) if (v && typeof v === "object" && "isTexture" in v && !(v as { isDataTexture?: boolean }).isDataTexture) (v as { dispose(): void }).dispose();
      mt.dispose();
    }
  });
}
