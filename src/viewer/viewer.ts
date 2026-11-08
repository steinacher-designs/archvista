// ARCHVISTA — the immersive 3D viewer used both inside the desktop app and on every published website.

import {
  NeutralToneMapping, Box3, BufferAttribute, BufferGeometry, Timer, Color, DirectionalLight, Fog, Group, HalfFloatType, WebGLRenderTarget,
  HemisphereLight, Material, Mesh, MeshPhysicalMaterial, Object3D, PCFShadowMap, PerspectiveCamera, Plane,
  PMREMGenerator, Raycaster, Scene, SRGBColorSpace, Texture, Vector2, Vector3, WebGLRenderer, DoubleSide, FrontSide,
} from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import { buildCollider, Walker, DEFAULT_WALKER } from "./physics";
import { buildEnvironment, disposeGroup, EnvResult, type Lighting } from "./environments";
import { AssetLibrary } from "./assets";
import { PointLight, CircleGeometry, CanvasTexture, ShadowMaterial, Quaternion, MeshBasicMaterial, TextureLoader, RepeatWrapping } from "three";
import { GroundedSkybox } from "three/examples/jsm/objects/GroundedSkybox.js";
import { makeMaps } from "./textures";
import type { PublicConfig } from "../core/export/public-scene";
import type { EnvironmentId, Hotspot, Quality, Viewpoint } from "../core/project";
import { pointInPolygon } from "../core/zones";
import type { MaterialPreset } from "../core/materials";
import { HUD_CSS, t as tr, type Lang } from "./hud";

Mesh.prototype.raycast = acceleratedRaycast;

export type Mode = "walk" | "orbit";
type Tier = "performance" | "balanced" | "ultra";

export interface ViewerOptions {
  hud?: boolean;
  language?: Lang;
  /** Editor: clicking geometry reports a pick instead of moving. */
  onPick?: (p: [number, number, number], normal: [number, number, number]) => void;
  onHotspot?: (h: Hotspot) => void;
  onStatus?: (s: { tier: Tier; fps: number }) => void;
  cinematic?: boolean;
  preserveDrawingBuffer?: boolean;
  /** Base URL of the bundled asset library (HDRIs, photo textures, plant models). */
  assetBase?: string | null;
  /** Offer "VR headset" (WebXR) when the browser supports immersive VR (published websites). */
  vr?: boolean;
  /** Where own texture images live: base URL (websites) … */
  imageBase?: string;
  /** … or a resolver (desktop app: images are stored with the project). */
  resolveImage?: (name: string) => Promise<string | null>;
  /** Own surroundings (panorama): base URL on websites, resolver in the desktop app. */
  envBase?: string;
  resolveEnv?: (file: string) => Promise<string | null>;
}

export interface BuildingPart { presetId: string; /** editor only: which model part this is (never published) */ key?: string; /** visible from the front only */ singleSided?: boolean; positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array | Uint16Array }

export class ArchViewer {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.05, 6000);
  private composer!: EffectComposer;
  private aoPass: GTAOPass | null = null;
  private sky: Sky | null = null;
  private sun = new DirectionalLight("#ffffff", 3);
  private hemi = new HemisphereLight("#ffffff", "#444444", 0.5);
  private pmrem: PMREMGenerator;
  private envTex: Texture | null = null;
  private building = new Group();
  private envGroup: Group | null = null;
  private envRes: EnvResult | null = null;
  private walker: Walker | null = null;
  private orbit: OrbitControls;
  private clock = new Timer();
  private keys = new Set<string>();
  private touchMove = { x: 0, z: 0 };
  private config: PublicConfig | null = null;
  private tier: Tier = "balanced";
  private quality: Quality = "auto";
  private raf = 0;
  private disposed = false;
  private hudEl: HTMLDivElement | null = null;
  private hsLayer: HTMLDivElement;
  private hsEls = new Map<string, HTMLDivElement>();
  private hotspots: Hotspot[] = [];
  private clipPlane = new Plane(new Vector3(0, -1, 0), 1e6);
  private tour: { list: Viewpoint[]; i: number; t: number; from: [Vector3, Vector3]; to: [Vector3, Vector3]; hold: boolean } | null = null;
  private camAnim: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; t: number; dur: number } | null = null;
  private frameTimes: number[] = [];
  private adaptiveDone = false;
  /** On-demand rendering: frames still to draw although nothing moves (scene/material/asset changes). */
  private dirty = 5;
  private lastCam = new Float64Array(16);
  private lastRenderAt = 0;
  private stepUps = 0;
  private wasLoading = false;
  /** Number of frames drawn so far (diagnostics). */
  framesDrawn = 0;
  private lastOrbitPos = new Vector3();
  private bvhForPick: MeshBVH | null = null;
  private mats = new Map<string, Material>();
  mode: Mode = "orbit";
  /** When true the loop stops rendering (hidden view, stills, tests). */
  private _paused = false;
  get paused() { return this._paused; }
  set paused(v: boolean) { this._paused = v; if (!v) this.invalidate(5); }
  /** Optional frame cap (tests on software renderers, battery saving). 0 = unlimited. */
  maxFps = 0;
  private lastFrame = 0;
  lang: Lang;
  private resizeObs: ResizeObserver;
  private cinematic: boolean;
  readonly lib: AssetLibrary;
  private envGen = 0;
  private roomLights: PointLight[] = [];
  private skybox: GroundedSkybox | null = null;

  constructor(private container: HTMLElement, private opts: ViewerOptions = {}) {
    this.lang = opts.language ?? "de";
    this.cinematic = !!opts.cinematic;
    this.lib = new AssetLibrary(opts.assetBase ?? null);
    this.renderer = new WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.preserveDrawingBuffer, stencil: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    const cv = this.renderer.domElement;
    cv.className = "av-canvas";
    cv.tabIndex = 0;
    container.classList.add("av-root");
    container.appendChild(cv);
    if (!document.getElementById("av-hud-css")) {
      const st = document.createElement("style"); st.id = "av-hud-css"; st.textContent = HUD_CSS; document.head.appendChild(st);
    }
    this.hsLayer = document.createElement("div");
    this.hsLayer.className = "av-hotspots";
    container.appendChild(this.hsLayer);
    this.pmrem = new PMREMGenerator(this.renderer);
    this.scene.add(this.building, this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    this.orbit = new OrbitControls(this.camera, cv);
    this.orbit.enableDamping = true;
    this.orbit.addEventListener("change", () => this.invalidate(2));
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.setupComposer();
    this.resize();
    this.loop();
  }

  // ——— loading ———
  async loadGlb(data: ArrayBuffer, config: PublicConfig) {
    const gltf = await new GLTFLoader().parseAsync(data, "");
    const parts: BuildingPart[] = [];
    gltf.scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const g = m.geometry as BufferGeometry;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as Material;
      parts.push({
        presetId: mat.name,
        singleSided: mat.side !== DoubleSide,
        positions: g.attributes.position.array as Float32Array,
        normals: g.attributes.normal.array as Float32Array,
        uvs: (g.attributes.uv?.array as Float32Array) ?? new Float32Array((g.attributes.position.count) * 2),
        indices: (g.index!.array as Uint32Array | Uint16Array),
      });
    });
    this.setBuilding(parts, config);
  }

  /** Replace the building (used directly by the desktop app for instant previews). */
  setBuilding(parts: BuildingPart[], config: PublicConfig, opts: { keepView?: boolean } = {}) {
    this.invalidate(8);
    this.highlight(null);
    this.config = config;
    disposeGroup(this.building);
    this.building.clear();
    this.mats.clear();
    this.matRank = 0;
    for (const p of parts) {
      if (!p.indices.length) continue;
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(p.positions, 3));
      g.setAttribute("normal", new BufferAttribute(p.normals, 3));
      g.setAttribute("uv", new BufferAttribute(p.uvs, 2));
      g.setIndex(new BufferAttribute(p.indices, 1));
      g.computeBoundingSphere();
      g.boundsTree = new MeshBVH(g);
      const mesh = new Mesh(g, this.material(p.presetId, config.materials[p.presetId], !!p.singleSided));
      mesh.userData.singleSided = !!p.singleSided;
      const glass = p.presetId === "glass";
      mesh.castShadow = !glass;
      mesh.receiveShadow = true;
      mesh.userData.presetId = p.presetId;
      mesh.userData.key = p.key;
      if (glass) mesh.renderOrder = 2;
      this.building.add(mesh);
    }
    this.rebuildCollider();
    this.setHotspots(config.hotspots);
    this.applyEnvironment(config.environment);
    this.applyTier(this.quality === "auto" ? this.autoTier() : (this.quality as Tier));
    if (!this.walker) this.mode = "orbit";
    if (!opts.keepView) this.resetView();
    if (this.opts.hud !== false) this.buildHud();
  }

  /**
   * Editor: change materials in place — no rebuild, the camera stays where it is.
   * `byKey` maps model part → material id. Returns false when the building has no part keys (then rebuild).
   */
  setPartMaterials(byKey: Map<string, string>, materials: Record<string, MaterialPreset>): boolean {
    if (!this.config) return true;
    let keyed = false;
    this.config = { ...this.config, materials: { ...this.config.materials, ...materials } };
    this.building.traverse((o) => {
      const me = o as Mesh;
      if (!me.isMesh || !me.userData.key) return;
      keyed = true;
      const id = byKey.get(me.userData.key);
      if (!id || id === me.userData.presetId) return;
      me.material = this.material(id, materials[id], !!me.userData.singleSided);
      me.userData.presetId = id;
      const glass = id.split("~")[0] === "glass";
      me.castShadow = !glass; me.renderOrder = glass ? 2 : 0;
    });
    // free materials nobody uses any more (colour dragging creates many)
    const used = new Set<Material>();
    this.building.traverse((o) => { const me = o as Mesh; if (me.isMesh) used.add(me.material as Material); });
    for (const [id, m] of this.mats) if (!used.has(m)) { disposeMaterial(m); this.mats.delete(id); }
    this.invalidate(8);
    return keyed;
  }

  // ——— editor: highlight parts / click a surface to find its part ———
  private matRank = 0;
  private hlGroup = new Group();
  private hlMat = new MeshBasicMaterial({ color: "#5d6db0", transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -12, side: DoubleSide });
  private hlKey: string | null = null;
  /** Tint all surfaces of one model part (null clears). */
  highlight(key: string | null) {
    if (key === this.hlKey) return;
    this.hlKey = key;
    if (!this.hlGroup.parent) { this.hlGroup.name = "highlight"; this.scene.add(this.hlGroup); this.hlMat.clippingPlanes = [this.clipPlane]; }
    this.hlGroup.clear();
    if (key) this.building.traverse((o) => {
      const me = o as Mesh;
      if (me.isMesh && me.userData.key === key) { const h = new Mesh(me.geometry, this.hlMat); h.renderOrder = 5; h.raycast = () => {}; this.hlGroup.add(h); }
    });
    this.invalidate(4);
  }
  private onPartPick: ((key: string) => void) | null = null;
  /** While set, a click (not a drag) on the model reports which part was hit. */
  setPartPickHandler(fn: ((key: string) => void) | null) { this.onPartPick = fn; }
  private partAt(e: MouseEvent): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    ray.firstHitOnly = true;
    const hit = ray.intersectObject(this.building, true).find((h) => (h.object as Mesh).userData.key);
    return hit ? (hit.object as Mesh).userData.key as string : null;
  }

  private material(id: string, pr?: MaterialPreset, singleSided = false): Material {
    // one-sided surfaces (SketchUp faces painted differently front/back) get their own material: FrontSide
    const ck = singleSided ? `${id}\u00001s` : id;
    const hit = this.mats.get(ck);
    if (hit) return hit;
    pr = pr ?? { id, label: { de: id, en: id }, color: "#cccccc", roughness: 0.8, metalness: 0, texture: "none", scale: 1 };
    const m = new MeshPhysicalMaterial({
      name: id, color: pr.texture === "none" ? pr.color : "#ffffff", roughness: pr.roughness, metalness: pr.metalness,
      clearcoat: pr.clearcoat ?? 0, side: singleSided ? FrontSide : DoubleSide, clippingPlanes: [this.clipPlane],
    });
    // surfaces in exactly the same plane with different materials would flicker ("z-fighting"):
    // a tiny, fixed depth priority per material decides consistently which one is seen
    m.polygonOffset = true; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = -(this.matRank++ % 16);
    if (pr.transmission) {
      m.transparent = true;
      m.opacity = pr.opacity ?? 0.3;
      m.roughness = 0.02;
      m.envMapIntensity = 1.5;
      m.depthWrite = false;
      m.side = singleSided ? FrontSide : DoubleSide;
      m.ior = pr.ior ?? 1.5;
    }
    const maps = makeMaps(pr.texture, pr.color);
    if (maps) {
      for (const k of ["map", "normalMap", "roughnessMap"] as const) {
        const tx = maps[k].clone();
        tx.repeat.set(1 / pr.scale, 1 / pr.scale);
        tx.needsUpdate = true;
        m[k] = tx;
      }
      m.normalScale.set(0.8, 0.8);
    }
    // own texture image (from the CAD file): tiles every `scale` metres, colour stays neutral
    if (pr.image) {
      const img = pr.image;
      void (async () => {
        // always asynchronous: the material must be registered (this.mats) before the check below
        const url = await (this.opts.resolveImage ? this.opts.resolveImage(img) : Promise.resolve(`${this.opts.imageBase ?? "assets/tex-user/"}${encodeURIComponent(img)}`));
        if (!url || this.mats.get(ck) !== m) return;
        try {
          const tx = await new TextureLoader().loadAsync(url);
          if (this.mats.get(ck) !== m) { tx.dispose(); return; }
          tx.wrapS = tx.wrapT = RepeatWrapping; tx.colorSpace = SRGBColorSpace; tx.anisotropy = 8;
          const rep = 1 / Math.max(0.05, pr!.scale || 1);
          tx.repeat.set(rep, rep);
          m.map = tx; m.color.set("#ffffff");
          // look at the picture once: SketchUp "colorize" tint, and real holes for PNGs with transparency
          const st = imageStats(tx.image as CanvasImageSource);
          if (st && pr!.colorize) {
            const target = new Color(pr!.color), avg = new Color().setRGB(st.r, st.g, st.b, SRGBColorSpace);
            m.color.setRGB(Math.min(8, target.r / Math.max(avg.r, 1e-3)), Math.min(8, target.g / Math.max(avg.g, 1e-3)), Math.min(8, target.b / Math.max(avg.b, 1e-3)));
          }
          if (st?.holes) { m.alphaTest = 0.5; m.transparent = false; }
          m.needsUpdate = true;
          this.invalidate(4);
        } catch (e) { console.warn("[archvista] Texturbild nicht geladen:", url, e); /* keep the plain colour */ }
      })();
    }
    // upgrade to photo-scanned textures when the asset library has them
    if (pr.texture !== "none") {
      this.lib.photo(pr.tex ?? id).then((ph) => {
        if (!ph || this.mats.get(ck) !== m) return;
        const rep = 1 / ph.size;
        const c = (t: Texture) => { const x = t.clone(); x.repeat.set(rep, rep); x.needsUpdate = true; return x; };
        // paint-like surfaces: relief from the scan, colour stays exactly the chosen colour
        const keepColour = !!pr!.paintable;
        const userTint = !!pr!.tex && !keepColour; // colour variant of a photo material
        m.map = keepColour ? null : c(ph.map);
        m.normalMap = c(ph.normalMap);
        const arm = c(ph.arm);
        m.roughnessMap = arm; m.aoMap = arm; m.aoMapIntensity = keepColour ? 0.5 : 1;
        m.roughness = 1; m.metalness = pr!.metalness * 0.6;
        m.color.set(keepColour ? pr!.color : userTint ? new Color(pr!.color).lerp(new Color(1, 1, 1), 0.3) : tintFor(pr!.color));
        m.normalScale.set(1, 1);
        m.needsUpdate = true;
      });
    }
    this.mats.set(ck, m);
    return m;
  }

  /** Replace material assignment live (desktop editor). */
  setPresetFor(meshPreset: string, pr: MaterialPreset) {
    this.invalidate(8);
    this.mats.delete(meshPreset);
    const m = this.material(meshPreset, pr);
    this.building.traverse((o) => { const me = o as Mesh; if (me.isMesh && me.userData.presetId === meshPreset) me.material = m; });
  }

  private rebuildCollider() {
    if (!this.config) return;
    const soups: { positions: Float32Array; indices?: Uint32Array }[] = [];
    this.building.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const g = m.geometry;
      soups.push({ positions: g.attributes.position.array as Float32Array, indices: Uint32Array.from(g.index!.array) });
    });
    const y = this.config.groundY, r = 2000;
    soups.push({ positions: new Float32Array([-r, y, -r, r, y, r, r, y, -r, -r, y, -r, -r, y, r, r, y, r]) });
    soups.push({ positions: barrierSoup(this.config.barriers) });
    const bvh = buildCollider(soups);
    this.bvhForPick = bvh;
    const c = this.center();
    const opt = { ...DEFAULT_WALKER, boundary: { x: c[0], z: c[1], r: this.envRes?.walkRadius ?? 200 } };
    if (!this.walker) {
      this.walker = new Walker(bvh, opt);
      this.walker.teleport(this.config.start.position, this.config.start.yaw);
    } else { this.walker.setCollider(bvh); this.walker.opt = opt; }
  }

  setBarriers(barriers: PublicConfig["barriers"]) {
    this.invalidate(8);
    if (!this.config) return;
    this.config = { ...this.config, barriers };
    this.rebuildCollider();
    // if the visitor now stands inside a restricted area, move them to the start
    if (this.walker && this.insideBarrier(this.walker.eye())) this.walker.teleport(this.config.start.position, this.config.start.yaw);
  }

  insideBarrier(p: Vector3, pad = 0.3) {
    for (const b of this.config?.barriers ?? []) {
      if (p.y < b.yMin - pad || p.y > b.yMax + pad) continue;
      if (pointInPolygon(p.x, p.z, b.polygon)) return true;
    }
    return false;
  }

  private center(): [number, number] {
    const b = this.config!.bbox;
    return [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];
  }

  // ——— environment, lighting, quality ———
  setEnvironment(id: EnvironmentId, customEnv?: PublicConfig["customEnv"]) {
    if (!this.config) return;
    this.config = { ...this.config, environment: id, customEnv };
    this.applyEnvironment(id);
    this.rebuildCollider();
  }

  private applyEnvironment(id: EnvironmentId) {
    this.invalidate(8);
    const cfg = this.config!;
    if (this.envGroup) { this.scene.remove(this.envGroup); disposeGroup(this.envGroup); }
    const b = cfg.bbox;
    const radius = Math.hypot(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2;
    const c = this.center();
    const front = Math.atan2(cfg.start.position[0] - c[0], cfg.start.position[2] - c[1]);
    const lighting: Lighting = cfg.lighting ?? "afternoon";
    const env = buildEnvironment(cfg.hasTerrain ? "studio" : id, { center: c, radius, groundY: cfg.groundY, frontAzimuth: front, hasTerrain: cfg.hasTerrain, quality: this.tier, lib: this.lib, lighting });
    this.envRes = env;
    this.envGroup = env.group;
    this.scene.add(env.group);
    const gen = ++this.envGen;
    // asset manifest still loading: show the fallback now, upgrade to the photo surroundings when known
    if (id !== "studio" && !cfg.hasTerrain && this.lib.hasSync("hdri", `env_${id}`) === undefined) {
      this.lib.whenReady().then(() => { if (gen === this.envGen && this.config?.environment === id && this.lib.hasSync("hdri", `env_${id}`)) { this.applyEnvironment(id); this.rebuildCollider(); } });
    }
    // 1) immediate procedural sky (shown until the HDRI has loaded, and as offline fallback)
    if (this.sky) { this.scene.remove(this.sky); this.sky.geometry.dispose(); (this.sky.material as Material).dispose(); this.sky = null; }
    this.envTex?.dispose();
    const sunDir = dirFrom(env.sun.elevation, env.sun.azimuth);
    if (env.sky) {
      const sky = new Sky();
      sky.scale.setScalar(5000);
      const u = sky.material.uniforms;
      u.turbidity.value = env.sky.turbidity; u.rayleigh.value = env.sky.rayleigh; u.mieCoefficient.value = env.sky.mie; u.mieDirectionalG.value = 0.8;
      u.sunPosition.value.copy(sunDir);
      const tmp = new Scene(); tmp.add(sky);
      this.envTex = this.pmrem.fromScene(tmp, 0.02).texture;
      tmp.remove(sky);
      this.sky = sky;
      this.scene.add(sky);
      this.scene.background = null;
    } else {
      this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
      this.scene.background = new Color(env.background ?? "#e9e7e3");
    }
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = env.sky ? 0.35 : 0.5;
    this.scene.fog = env.fog ? new Fog(env.fog.color, env.fog.near, env.fog.far) : null;
    this.sun.color.set(env.sun.color);
    this.sun.intensity = env.sun.intensity;
    this.hemi.color.set(env.hemi.sky); this.hemi.groundColor.set(env.hemi.ground); this.hemi.intensity = env.hemi.intensity;
    this.renderer.toneMappingExposure = env.exposure;
    this.setRoomLights(lighting === "evening" && id !== "studio");
    if (this.skybox) { this.scene.remove(this.skybox); this.skybox.geometry.dispose(); (this.skybox.material as Material).dispose(); this.skybox = null; }
    this.orbit.maxDistance = env.photo ? env.photo.radius * 0.7 : Infinity;
    // 2a) photographic surroundings: panorama on the ground + lighting from the same HDR
    const own = id === "custom" && !cfg.hasTerrain ? cfg.customEnv : undefined;
    const photoSource = own ? this.customEnvSource(own) : env.photo ? this.lib.photoEnv(env.photo.key).then((x) => (x ? { ...x, hdrBackground: false } : null)) : null;
    if (env.photo && photoSource) photoSource.then((ph) => {
      if (!ph || gen !== this.envGen || this.disposed) return;
      const h = ph.hdri;
      // built-in panoramas: sun placed to light the front; own panoramas: as photographed, turned by the user
      const theta = own ? (own.rotation * Math.PI) / 180 : (env.sunAzimuth * Math.PI) / 180 - Math.atan2(h.sunDir.x, h.sunDir.z);
      const camH = own?.height ?? ph.cameraHeight;
      const sky = new GroundedSkybox(ph.background, camH, env.photo!.radius, 96);
      const sm = sky.material as Material & { toneMapped: boolean; fog: boolean };
      sm.toneMapped = ph.hdrBackground; sm.fog = false; // a photo is already finished; HDR light values need tone mapping
      sky.position.set(c[0], cfg.groundY + camH - 0.01, c[1]);
      sky.rotation.y = theta;
      this.skybox = sky;
      if (this.sky) { this.scene.remove(this.sky); this.sky = null; }
      this.scene.add(sky);
      this.scene.background = new Color("#000000");
      const pm = this.pmrem.fromEquirectangular(h.texture).texture;
      this.envTex?.dispose(); this.envTex = pm;
      this.scene.environment = pm;
      this.scene.environmentRotation.set(0, theta, 0);
      this.scene.environmentIntensity = 0.9;
      this.scene.fog = null;
      const dir = h.sunDir.clone().applyAxisAngle(new Vector3(0, 1, 0), theta);
      if (dir.y < 0.12) { dir.y = 0.12; dir.normalize(); }
      this.sun.color.copy(h.sunColor).lerp(new Color(1, 1, 1), 0.5);
      this.sun.intensity = Math.min(3.4, 1.4 + Math.asin(dir.y) * 5);
      this.hemi.intensity = 0.03;
      this.fitShadow(dir);
      const groundKey = own ? ({ photo: null, grass: "grass", paving: "env_paving", sand: "env_sand" } as const)[own.ground] : id === "urban" ? "env_paving" : id === "coastal" ? "env_sand" : "grass";
      if (groundKey) void this.addGroundBlend(groundKey, h.ground, gen);
    });
    // 2b) real HDRI sky + matching sun, once loaded
    if (env.hdri) this.lib.hdri(env.hdri).then((h) => {
      if (!h || gen !== this.envGen || this.disposed) return;
      const hdrAz = Math.atan2(h.sunDir.x, h.sunDir.z);
      const theta = (env.sunAzimuth * Math.PI) / 180 - hdrAz;
      const dir = h.sunDir.clone().applyAxisAngle(new Vector3(0, 1, 0), theta);
      if (dir.y < 0.07) { dir.y = 0.07; dir.normalize(); } // keep a usable shadow at sunset
      const pm = this.pmrem.fromEquirectangular(h.texture).texture;
      this.envTex?.dispose();
      this.envTex = pm;
      this.scene.environment = pm;
      this.scene.environmentRotation.set(0, theta, 0);
      if (env.sky) {
        if (this.sky) { this.scene.remove(this.sky); this.sky = null; }
        this.scene.background = h.texture;
        this.scene.backgroundRotation.set(0, theta, 0);
        this.scene.backgroundIntensity = 1;
        if (this.scene.fog) (this.scene.fog as Fog).color.copy(h.horizon);
      }
      const elev = Math.asin(dir.y);
      this.scene.environmentIntensity = env.sky ? (lighting === "evening" ? 0.7 : 0.5) : 0.7;
      this.sun.color.copy(h.sunColor).lerp(new Color(1, 1, 1), lighting === "evening" ? 0.35 : 0.5);
      this.sun.intensity = env.sky ? Math.min(3.6, 1.4 + elev * 5) : 2.2;
      this.hemi.intensity = 0.05;
      if (env.sky) this.fitShadow(dir);
    });
    this.fitShadow(sunDir);
  }

  /**
   * The ground of a projected panorama is smeared close to the camera. Around the building a sharp
   * photo-scanned ground (colour-matched to the panorama) fades softly into the photo.
   */
  private async addGroundBlend(key: string, groundLinear: Color, gen: number) {
    const ph = await this.lib.photo(key);
    if (!ph || gen !== this.envGen || !this.envGroup || !this.config) return;
    const b = this.config.bbox;
    const R = Math.hypot(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2 + 14;
    const c = this.center();
    // hue of the panorama's ground, brightness of the texture itself
    const texAvg = averageColor(ph.map.image as CanvasImageSource & { width: number; height: number });
    const lum = (x: Color) => 0.2126 * x.r + 0.7152 * x.g + 0.0722 * x.b || 1;
    const tint = new Color(groundLinear.r / lum(groundLinear), groundLinear.g / lum(groundLinear), groundLinear.b / lum(groundLinear));
    if (texAvg) tint.multiply(new Color(lum(texAvg) / (texAvg.r || 1), lum(texAvg) / (texAvg.g || 1), lum(texAvg) / (texAvg.b || 1)));
    tint.r = Math.min(1.6, tint.r); tint.g = Math.min(1.6, tint.g); tint.b = Math.min(1.6, tint.b);
    const rep = 1 / ph.size;
    const cl = (t: Texture) => { const x = t.clone(); x.repeat.set(rep, rep); x.needsUpdate = true; return x; };
    const mat = new MeshPhysicalMaterial({ map: cl(ph.map), normalMap: cl(ph.normalMap), roughnessMap: cl(ph.arm), roughness: 1, color: tint, transparent: true, depthWrite: false, alphaMap: radialAlpha(), polygonOffset: true, polygonOffsetFactor: -1 });
    const geo = new CircleGeometry(R, 72);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    const uv1 = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) { uv1[i * 2] = uv.getX(i); uv1[i * 2 + 1] = uv.getY(i); uv.setXY(i, pos.getX(i) + c[0], pos.getZ(i) + c[1]); }
    geo.setAttribute("uv1", new BufferAttribute(uv1, 2));
    (mat.alphaMap as Texture).channel = 1; // radial fade uses the disc's own 0..1 coordinates
    const disc = new Mesh(geo, mat);
    disc.position.set(c[0], this.config.groundY + 0.003, c[1]);
    disc.renderOrder = 1;
    this.envGroup.add(disc);
    this.envGroup.traverse((o) => { if ((o as Mesh).material instanceof ShadowMaterial) o.renderOrder = 2; });
  }

  /** Own panorama: where the file is (app: stored with the project; website: assets/env-user/). */
  private async customEnvSource(own: NonNullable<PublicConfig["customEnv"]>) {
    const url = this.opts.resolveEnv ? await this.opts.resolveEnv(own.file) : `${this.opts.envBase ?? "assets/env-user/"}${encodeURIComponent(own.file)}`;
    return url ? this.lib.customEnv(url, own.kind) : null;
  }

  /** Warm interior lights for evening scenes (rooms from the analysis, never in restricted areas). */
  private setRoomLights(on: boolean) {
    this.invalidate(8);
    for (const l of this.roomLights) { this.scene.remove(l); l.dispose(); }
    this.roomLights = [];
    const glass = this.mats.get("glass") as MeshPhysicalMaterial | undefined;
    if (glass) { glass.emissive.set(on ? "#ffb46b" : "#000000"); glass.emissiveIntensity = on ? 0.35 : 0; }
    if (!on) return;
    const pts = this.config?.lights ?? [];
    for (const p of pts.slice(0, 10)) {
      const l = new PointLight("#ffbe7a", 14, 9, 2);
      l.position.set(...p);
      this.scene.add(l);
      this.roomLights.push(l);
    }
  }

  setLighting(l: Lighting) {
    if (!this.config) return;
    this.config = { ...this.config, lighting: l };
    this.applyEnvironment(this.config.environment);
  }

  private fitShadow(sunDir: Vector3) {
    const b = this.config!.bbox;
    const box = new Box3(new Vector3(...b.min), new Vector3(...b.max)).expandByScalar(6);
    const c = box.getCenter(new Vector3());
    const r = box.getSize(new Vector3()).length() / 2;
    this.sun.position.copy(c).addScaledVector(sunDir, r * 2);
    this.sun.target.position.copy(c);
    const cam = this.sun.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 0.5; cam.far = r * 4;
    cam.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.03;
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.adaptiveDone = q !== "auto";
    this.applyTier(q === "auto" ? this.autoTier() : q);
  }

  /** True when the browser draws with the CPU (no working graphics driver): Microsoft Basic Render Driver / WARP, SwiftShader, llvmpipe. */
  get softwareRendering(): boolean {
    return /basic render driver|warp|swiftshader|llvmpipe|softpipe|software/i.test(this.gpuName());
  }

  private autoTier(): Tier {
    const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
    if (coarse) return "performance";
    // laptops with integrated graphics start light; the measurement can still step up
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      if (/intel|uhd|iris|radeon\(tm\) graphics|radeon graphics|vega \d|adreno|mali|apple m\d|swiftshader|llvmpipe|basic render driver|warp/i.test(name)) return "performance";
    } catch { /* unknown → balanced */ }
    return "balanced";
  }

  /** Graphics chip as reported by the browser (shown in settings, helps support). */
  gpuName(): string {
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch { return "unbekannt"; }
  }

  private applyTier(t: Tier) {
    this.invalidate(8);
    this.tier = t;
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    const soft = t === "performance" && this.softwareRendering;
    // without a graphics driver every pixel is computed by the CPU: render fewer of them and cap the frame rate
    this.renderer.setPixelRatio(soft ? 0.8 : t === "ultra" ? Math.min(dpr, 2) : t === "balanced" ? Math.min(dpr, 1.25) : Math.min(dpr, 1));
    if (soft && this.maxFps === 0) this.maxFps = 30;
    const size = soft ? 512 : t === "ultra" ? 4096 : t === "balanced" ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.radius = t === "performance" ? 1 : 3;
    this.setupComposer();
    this.resize();
    this.opts.onStatus?.({ tier: t, fps: 0 });
    this.updateHudState();
  }

  setCinematic(on: boolean) { this.cinematic = on; this.setupComposer(); this.resize(); }

  private setupComposer() {
    this.composer?.dispose();
    this.renderer.toneMapping = NeutralToneMapping;
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    const rt = new WebGLRenderTarget(w, h, { type: HalfFloatType, samples: this.tier === "performance" ? 0 : 4 });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.aoPass = null;
    if (this.tier !== "performance") {
      const ao = new GTAOPass(this.scene, this.camera, w, h);
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: this.tier === "ultra" ? 16 : 10 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: this.tier === "ultra" ? 16 : 8 });
      ao.blendIntensity = 0.85;
      // the ground-projected panorama is a backdrop, not geometry: keep it out of the occlusion buffers
      const aoRender = ao.render.bind(ao);
      ao.render = (...args: Parameters<typeof ao.render>) => {
        const sky = this.skybox, catcher = this.envRes?.photo ? this.envGroup : null;
        if (sky) sky.visible = false;
        if (catcher) catcher.visible = false;
        try { aoRender(...args); } finally { if (sky) sky.visible = true; if (catcher) catcher.visible = true; }
      };
      composer.addPass(ao);
      this.aoPass = ao;
    }
    if (this.cinematic || this.tier === "ultra") composer.addPass(new UnrealBloomPass(new Vector2(w, h), this.cinematic ? 0.35 : 0.18, 0.6, 0.92));
    composer.addPass(new OutputPass());
    if (this.cinematic) composer.addPass(new ShaderPass(VIGNETTE));
    if (this.tier === "performance" && !this.softwareRendering) composer.addPass(new SMAAPass());
    this.composer = composer;
  }

  private resize() {
    this.invalidate(8);
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  // ——— navigation ———
  resetView() {
    const cfg = this.config!;
    const vp = cfg.viewpoints.find((v) => !v.walk) ?? null;
    if (vp) this.flyTo(vp, false);
    else { this.camera.position.set(cfg.bbox.max[0] + 15, cfg.bbox.max[1] + 8, cfg.bbox.max[2] + 15); this.orbit.target.set(...this.centerPoint()); }
    this.orbit.update();
  }

  centerPoint(): [number, number, number] {
    const b = this.config!.bbox;
    return [(b.min[0] + b.max[0]) / 2, b.min[1] + (b.max[1] - b.min[1]) * 0.35, (b.min[2] + b.max[2]) / 2];
  }

  setMode(m: Mode) {
    this.mode = m;
    this.stopTour();
    this.clipLevel(null);
    if (m === "walk" && this.walker) {
      this.orbit.enabled = false;
      this.walker.teleport(this.walker.feet.clone(), this.walker.yaw);
      this.walker.pitch = 0;
    } else {
      this.orbit.enabled = true;
      if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
      const e = this.camera.position.clone();
      this.orbit.target.set(...this.centerPoint());
      if (e.distanceTo(this.orbit.target) < 6) this.resetView();
    }
    this.updateHudState();
  }

  startWalk(fromStart = true) {
    if (fromStart && this.walker && this.config) this.walker.teleport(this.config.start.position, this.config.start.yaw);
    this.setMode("walk");
  }

  goToLevel(i: number) {
    const lv = this.config?.levels[i];
    if (!lv) return;
    if (this.mode === "walk" && this.walker && lv.spawn) {
      const p = new Vector3(...lv.spawn);
      if (this.insideBarrier(new Vector3(p.x, p.y + 1, p.z))) return; // never teleport into restricted areas
      this.walker.teleport(p, this.walker.yaw);
    } else {
      // orbit: cut-away view above this storey
      const next = this.config!.levels[i + 1];
      this.clipLevel(next ? next.elevation - 0.15 : null);
      const c = this.center();
      this.orbit.target.set(c[0], lv.elevation + 1, c[1]);
    }
    this.updateHudState(i);
  }

  clipLevel(y: number | null) {
    this.invalidate(8);
    this.clipPlane.constant = y === null ? 1e6 : y;
  }

  /** Move the camera to a viewpoint (validated against restrictions). */
  goTo(vp: Viewpoint, animate = true) {
    const pos = new Vector3(...vp.position);
    if (this.insideBarrier(pos)) return false;
    if (vp.walk && this.mode === "walk" && this.walker) {
      this.walker.teleport(new Vector3(pos.x, pos.y - DEFAULT_WALKER.eye, pos.z), Math.atan2(-(vp.target[0] - pos.x), -(vp.target[2] - pos.z)));
      return true;
    }
    if (this.mode === "walk") this.setMode("orbit");
    this.flyTo(vp, animate);
    return true;
  }

  private flyTo(vp: Viewpoint, animate: boolean) {
    const to: [Vector3, Vector3] = [new Vector3(...vp.position), new Vector3(...vp.target)];
    if (!animate) { this.camera.position.copy(to[0]); this.orbit.target.copy(to[1]); this.orbit.update(); return; }
    this.camAnim = { from: [this.camera.position.clone(), this.orbit.target.clone()], to, t: 0, dur: 2.2 };
  }

  startTour() {
    const list = (this.config?.viewpoints ?? []).filter((v) => !this.insideBarrier(new Vector3(...v.position)));
    if (!list.length) return;
    this.setMode("orbit");
    this.tour = { list, i: -1, t: 0, from: [new Vector3(), new Vector3()], to: [new Vector3(), new Vector3()], hold: true };
    this.updateHudState();
  }

  stopTour() { if (this.tour) { this.tour = null; this.fade(false); this.updateHudState(); } }

  private fade(on: boolean) {
    this.container.classList.toggle("av-fade", on);
  }

  // ——— hotspots ———
  setHotspots(list: Hotspot[]) {
    this.invalidate(8);
    this.hotspots = list;
    for (const el of this.hsEls.values()) el.remove();
    this.hsEls.clear();
    list.forEach((h, i) => {
      const el = document.createElement("div");
      el.className = "av-hs";
      el.textContent = String(i + 1);
      el.title = h.title;
      el.addEventListener("click", (e) => { e.stopPropagation(); this.opts.onHotspot ? this.opts.onHotspot(h) : this.showHotspot(h); });
      this.hsLayer.appendChild(el);
      this.hsEls.set(h.id, el);
    });
  }

  private showHotspot(h: Hotspot) {
    const panel = this.container.querySelector(".av-panel") as HTMLDivElement | null;
    if (!panel) return;
    panel.innerHTML = "";
    const close = document.createElement("button"); close.className = "av-x"; close.textContent = "×"; close.onclick = () => panel.classList.remove("open");
    const h3 = document.createElement("h3"); h3.textContent = h.title;
    panel.append(close, h3);
    if (h.image) { const img = document.createElement("img"); img.src = h.image; img.alt = h.title; panel.append(img); }
    if (h.text) for (const para of h.text.split(/\n{2,}/)) { const p = document.createElement("p"); p.textContent = para; panel.append(p); }
    if (h.materialSpec) { const p = document.createElement("p"); p.className = "av-spec"; p.textContent = h.materialSpec; panel.append(p); }
    if (h.facts?.length) { const ul = document.createElement("ul"); for (const f of h.facts) { const li = document.createElement("li"); li.textContent = f; ul.append(li); } panel.append(ul); }
    panel.classList.add("open");
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private frame = 0;
  private updateHotspots() {
    this.frame++;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new Vector3();
    const ray = new Raycaster();
    for (const hs of this.hotspots) {
      const el = this.hsEls.get(hs.id);
      if (!el) continue;
      v.set(...hs.position);
      const dist = v.distanceTo(this.camera.position);
      v.project(this.camera);
      let visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 60;
      if (visible && this.bvhForPick && (this.frame + hs.id.length) % 6 === 0 || el.dataset.occluded === undefined) {
        // occlusion test against the building (spread over frames to stay cheap)
        const dir = new Vector3(...hs.position).sub(this.camera.position).normalize();
        ray.set(this.camera.position, dir);
        const hit = this.bvhForPick?.raycastFirst(ray.ray, DoubleSide);
        el.dataset.occluded = hit && hit.distance < dist - 0.3 ? "1" : "0";
      }
      if (el.dataset.occluded === "1") visible = false;
      el.style.display = visible ? "flex" : "none";
      if (visible) el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
    }
  }

  // ——— input ———
  private bindInput() {
    const cv = this.renderer.domElement;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const k = e.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(k)) {
        if (down) this.keys.add(k); else this.keys.delete(k);
        if (this.mode === "walk") e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", () => this.keys.clear());
    let downAt: { x: number; y: number } | null = null;
    cv.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener("click", (e) => {
      if (this.onPartPick && this.mode !== "walk") {
        const dragged = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5;
        if (!dragged) { const k = this.partAt(e); if (k) this.onPartPick(k); }
        return;
      }
      if (this.opts.onPick) {
        const hit = this.pick(e);
        if (hit) this.opts.onPick(hit.point, hit.normal);
        return;
      }
      if (this.mode === "walk" && !isCoarse()) cv.requestPointerLock?.();
      if (this.tour) this.stopTour();
    });
    document.addEventListener("pointerlockchange", () => {
      this.container.classList.toggle("av-locked", document.pointerLockElement === cv);
    });
    document.addEventListener("mousemove", (e) => {
      if (this.mode !== "walk" || !this.walker || document.pointerLockElement !== cv) return;
      this.walker.yaw -= e.movementX * 0.0022;
      this.walker.pitch = Math.max(-1.45, Math.min(1.45, this.walker.pitch - e.movementY * 0.0022));
      this.invalidate(1);
    });
    // touch: the visible joystick (bottom left) walks; dragging anywhere on the picture looks around
    let look: { id: number; x: number; y: number } | null = null;
    cv.addEventListener("touchstart", (e) => {
      if (this.mode !== "walk") return;
      for (const t of Array.from(e.changedTouches)) if (!look) look = { id: t.identifier, x: t.clientX, y: t.clientY };
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener("touchmove", (e) => {
      if (this.mode !== "walk" || !this.walker) return;
      for (const t of Array.from(e.changedTouches)) {
        if (look && t.identifier === look.id) {
          this.walker.yaw -= (t.clientX - look.x) * 0.006;
          this.walker.pitch = Math.max(-1.3, Math.min(1.3, this.walker.pitch - (t.clientY - look.y) * 0.006));
          look.x = t.clientX; look.y = t.clientY;
          this.invalidate(1);
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) if (look && t.identifier === look.id) look = null;
    };
    cv.addEventListener("touchend", end); cv.addEventListener("touchcancel", end);
    this.cleanup.push(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });
  }
  private cleanup: (() => void)[] = [];

  pick(e: MouseEvent): { point: [number, number, number]; normal: [number, number, number] } | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    ray.firstHitOnly = true;
    const hits = ray.intersectObject(this.building, true);
    const h = hits[0];
    if (!h) return null;
    const n = h.face?.normal ?? new Vector3(0, 1, 0);
    return { point: h.point.toArray() as [number, number, number], normal: n.toArray() as [number, number, number] };
  }

  // ——— main loop ———
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused || this.xrRig) return;
    if (this.maxFps > 0) { const now = performance.now(); if (now - this.lastFrame < 1000 / this.maxFps) return; this.lastFrame = now; }
    this.clock.update();
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.getElapsed();
    if (!this.config) { this.renderer.render(this.scene, this.camera); return; }
    this.envRes?.update?.(t);
    if (this.mode === "walk" && this.walker) {
      const mv = { x: 0, z: 0 };
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) mv.z += 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) mv.z -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mv.x += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mv.x -= 1;
      mv.x += this.touchMove.x; mv.z += this.touchMove.z;
      this.walker.update(dt, mv, this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"));
      this.walker.eye(this.camera.position);
      this.camera.rotation.set(this.walker.pitch, this.walker.yaw, 0, "YXZ");
    } else {
      this.runTour(dt);
      if (this.camAnim) {
        const a = this.camAnim;
        a.t = Math.min(1, a.t + dt / a.dur);
        const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
        this.camera.position.lerpVectors(a.from[0], a.to[0], k);
        this.orbit.target.lerpVectors(a.from[1], a.to[1], k);
        if (a.t >= 1) this.camAnim = null;
      }
      this.orbit.update();
      // restriction guard: the orbit camera may not enter red zones or go below ground
      if (this.insideBarrier(this.camera.position) || this.camera.position.y < this.config.groundY + 0.3) this.camera.position.copy(this.lastOrbitPos);
      else this.lastOrbitPos.copy(this.camera.position);
    }
    // draw only when something changed: camera moved, animation running, assets arriving or scene edited
    this.camera.updateMatrixWorld();
    const m = this.camera.matrixWorld.elements;
    let moved = false;
    for (let i = 0; i < 16; i++) if (Math.abs(m[i] - this.lastCam[i]) > 1e-6) { moved = true; break; }
    const loading = this.lib.pending() > 0;
    if (loading) this.dirty = Math.max(this.dirty, 2);
    else if (this.wasLoading) this.dirty = Math.max(this.dirty, 12);
    this.wasLoading = loading;
    if (!moved && this.dirty <= 0 && !this.camAnim && !this.tour && !this.envRes?.update) return;
    if (this.dirty > 0) this.dirty--;
    this.lastCam.set(m);
    const now = performance.now();
    const interval = this.lastRenderAt ? now - this.lastRenderAt : 0;
    this.lastRenderAt = now;
    this.updateHotspots();
    this.composer.render(dt);
    this.framesDrawn++;
    // only continuous movement says something about the frame rate
    // (consecutive frames of a movement; longer gaps are pauses between interactions)
    if (moved && this.movedLast && interval > 0 && interval < 1500) this.adapt(interval / 1000);
    this.movedLast = moved;
  };

  /** Ask for a few more frames (after scene, material or environment changes). */
  invalidate(frames = 3) { this.dirty = Math.max(this.dirty, frames); }

  private runTour(dt: number) {
    const tour = this.tour;
    if (!tour) return;
    tour.t += dt;
    if (tour.hold && (tour.i < 0 || tour.t > 3.0)) {
      tour.i = (tour.i + 1) % tour.list.length;
      const prev = tour.list[(tour.i + tour.list.length - 1) % tour.list.length], next = tour.list[tour.i];
      const cut = !!(next.walk || prev.walk) || tour.i === 0;
      if (cut) {
        this.fade(true);
        setTimeout(() => { if (!this.tour) return; this.flyTo(next, false); this.fade(false); }, 600);
        tour.t = -0.6;
      } else { this.flyTo(next, true); tour.t = -2.2; }
      tour.hold = true;
    }
  }

  private slowStreak = 0;
  private movedLast = false;

  private adapt(dt: number) {
    if (this.quality !== "auto") return;
    // emergency brake: clearly stuttering (under ~12 fps) for 5 frames → step down at once, never step up again
    if (dt > 0.085) this.slowStreak++; else this.slowStreak = 0;
    if (this.slowStreak >= 5 && this.tier !== "performance") {
      this.slowStreak = 0; this.stepUps = 99; this.frameTimes = [];
      this.applyTier(this.tier === "ultra" ? "balanced" : "performance");
      return;
    }
    if (this.adaptiveDone || dt > 0.25) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 45) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    this.frameTimes = [];
    const fps = 1 / sorted[Math.floor(sorted.length / 2)]; // median: robust against single hitches
    this.opts.onStatus?.({ tier: this.tier, fps });
    if (fps < 40 && this.tier !== "performance") { this.applyTier(this.tier === "ultra" ? "balanced" : "performance"); return; } // keep measuring
    if (fps > 57 && this.tier !== "ultra" && this.stepUps < 1 && !isCoarse() && !this.softwareRendering) { this.stepUps++; this.applyTier(this.tier === "performance" ? "balanced" : "ultra"); return; }
    this.adaptiveDone = true;
  }

  /** Render exactly one frame (stills, tests). Waits for pending assets first. */
  async renderOnce() {
    await this.assetsSettled();
    if (this.mode === "walk" && this.walker) {
      this.walker.update(1 / 60, { x: 0, z: 0 });
      this.walker.eye(this.camera.position);
      this.camera.rotation.set(this.walker.pitch, this.walker.yaw, 0, "YXZ");
    } else this.orbit.update();
    this.updateHotspots();
    this.composer.render(0.016);
  }

  /** Resolves when the asynchronous asset upgrades (sky, textures, plants) have finished. */
  async assetsSettled(timeoutMs = 60000) {
    const t0 = performance.now();
    let last = -1;
    for (;;) {
      const n = this.lib.pending();
      if (n === 0 && last === 0) return;
      if (performance.now() - t0 > timeoutMs) return;
      last = n;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  /** Render a still image (for galleries) from a viewpoint. */
  async capture(vp: Viewpoint | null, width = 1600, height = 1000, type = "image/jpeg"): Promise<Blob> {
    const saved = { pos: this.camera.position.clone(), target: this.orbit.target.clone(), mode: this.mode, aspect: this.camera.aspect };
    if (vp) { this.camera.position.set(...vp.position); this.camera.lookAt(...vp.target); }
    const prevPR = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.hsLayer.style.display = "none";
    this.composer.render(0.016);
    const blob = await new Promise<Blob>((res, rej) => this.renderer.domElement.toBlob((b) => (b ? res(b) : rej(new Error("capture failed"))), type, 0.88));
    this.renderer.setPixelRatio(prevPR);
    this.hsLayer.style.display = "";
    this.camera.position.copy(saved.pos); this.orbit.target.copy(saved.target);
    this.resize();
    return blob;
  }

  // ——— HUD ———
  private buildHud() {
    this.hudEl?.remove();
    const L = (k: Parameters<typeof tr>[1]) => tr(this.lang, k);
    const hud = document.createElement("div");
    hud.className = "av-hud";
    const levels = this.config!.levels;
    hud.innerHTML = `
      <div class="av-bar">
        <button data-a="walk" class="av-b">${L("walk")}</button>
        <button data-a="orbit" class="av-b">${L("orbit")}</button>
        ${this.config!.tour && this.config!.viewpoints.length > 1 ? `<button data-a="tour" class="av-b">${L("tour")}</button>` : ""}
        <span class="av-sep"></span>
        <button data-a="quality" class="av-b av-q" title="${L("quality")}"></button>
        <button data-a="fs" class="av-b" title="${L("fullscreen")}" aria-label="${L("fullscreen")}">⤢</button>
        <button data-a="vr" class="av-b av-vr" hidden>${L("vr")}</button>
      </div>
      ${this.jumpList(levels)}
      <div class="av-joy" aria-hidden="true"><div class="av-knob"></div></div>
      <div class="av-hint"></div>
      <div class="av-panel"></div>`;
    hud.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b) return;
      e.stopPropagation();
      const a = b.dataset.a;
      if (b.dataset.lv) this.goToLevel(+b.dataset.lv);
      else if (b.dataset.place) { const pl = this.config!.places?.find((x) => x.id === b.dataset.place); if (pl) this.goToPlace(pl); hud.querySelectorAll("[data-lv],[data-place]").forEach((x) => x.classList.toggle("on", x === b)); }
      else if (a === "walk") this.startWalk(this.mode !== "walk");
      else if (a === "orbit") this.setMode("orbit");
      else if (a === "tour") (this.tour ? this.stopTour() : this.startTour());
      else if (a === "quality") {
        const order: Quality[] = ["auto", "performance", "balanced", "ultra"];
        this.setQuality(order[(order.indexOf(this.quality) + 1) % order.length]);
      } else if (a === "vr") { void this.enterVR();
      } else if (a === "fs") void this.toggleFullscreen();
    });
    this.bindJoystick(hud.querySelector<HTMLElement>(".av-joy")!);
    this.container.appendChild(hud);
    this.hudEl = hud;
    this.updateHudState();
    if (this.opts.vr) void this.vrSupported().then((ok) => { const b = hud.querySelector<HTMLElement>("[data-a=vr]"); if (b) b.hidden = !ok; });
  }

  /** Walking joystick for touch screens: drag the knob; distance from the centre = speed. */
  private bindJoystick(joy: HTMLElement) {
    const knob = joy.querySelector<HTMLElement>(".av-knob")!;
    let id: number | null = null, cx = 0, cy = 0;
    const R = 44;
    const move = (x: number, y: number) => {
      let dx = x - cx, dy = y - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.touchMove.x = dx / R; this.touchMove.z = -dy / R;
      this.invalidate(1);
    };
    const stop = () => { id = null; knob.style.transform = ""; this.touchMove.x = 0; this.touchMove.z = 0; joy.classList.remove("on"); };
    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = joy.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      id = e.pointerId; joy.setPointerCapture(e.pointerId); joy.classList.add("on");
      move(e.clientX, e.clientY);
    });
    joy.addEventListener("pointermove", (e) => { if (e.pointerId === id) { e.preventDefault(); move(e.clientX, e.clientY); } });
    joy.addEventListener("pointerup", (e) => { if (e.pointerId === id) stop(); });
    joy.addEventListener("pointercancel", (e) => { if (e.pointerId === id) stop(); });
    joy.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  }

  /** Full screen. Phones that cannot do real full screen for web pages (iPhone) get the 3D view filling the window instead. */
  async toggleFullscreen() {
    const root = (this.container.closest("[data-av-fullscreen]") ?? this.container) as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (root.classList.contains("av-pseudo-fs")) { this.setPseudoFs(root, false); return; }
    if (document.fullscreenElement || d.webkitFullscreenElement) { (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.()); return; }
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      else throw new Error("no fullscreen");
      // landscape is nicer for walking; only works in full screen and not everywhere
      try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"); } catch { /* ignore */ }
    } catch { this.setPseudoFs(root, true); }
  }

  private setPseudoFs(root: HTMLElement, on: boolean) {
    root.classList.toggle("av-pseudo-fs", on);
    document.documentElement.classList.toggle("av-noscroll", on);
    if (on) {
      const esc = (e: KeyboardEvent) => { if (e.key === "Escape") this.setPseudoFs(root, false); };
      window.addEventListener("keydown", esc);
      this.pseudoFsOff = () => window.removeEventListener("keydown", esc);
    } else { this.pseudoFsOff?.(); this.pseudoFsOff = null; }
    this.hudEl?.classList.toggle("av-isfs", on);
    this.resize();
  }
  private pseudoFsOff: (() => void) | null = null;

  // ——— VR headsets (WebXR) ———
  private xrRig: Group | null = null;
  private xrSnapReady = true;
  private xrSaved: { pos: Vector3; quat: Quaternion; mode: "orbit" | "walk" } | null = null;

  /** True when a VR headset can be used in this browser (e.g. Meta Quest browser, Chrome/Edge with SteamVR/WMR). */
  async vrSupported(): Promise<boolean> {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    try { return !!xr && (await xr.isSessionSupported("immersive-vr")); } catch { return false; }
  }

  get inVR() { return !!this.xrRig; }

  /** Step into the building with a VR headset: standing at the entrance (or where you are walking), left stick walks, right stick turns. */
  async enterVR(): Promise<boolean> {
    const xr = (navigator as Navigator & { xr?: { requestSession(m: string, o: unknown): Promise<XRSession> } }).xr;
    if (!xr || !this.config || !this.walker || this.xrRig) return false;
    let session: XRSession;
    try { session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] }); } catch { return false; }
    this.stopTour();
    this.xrSaved = { pos: this.camera.position.clone(), quat: this.camera.quaternion.clone(), mode: this.mode === "walk" ? "walk" : "orbit" };
    if (this.mode !== "walk") this.walker.teleport(this.config.start.position, this.config.start.yaw);
    const rig = new Group();
    rig.name = "vr-rig";
    this.scene.add(rig);
    rig.add(this.camera);
    this.camera.position.set(0, 0, 0); this.camera.quaternion.identity();
    this.xrRig = rig;
    this.placeRig();
    rig.rotation.y = this.walker.yaw;
    const r = this.renderer;
    r.xr.enabled = true;
    r.xr.setReferenceSpaceType("local-floor");
    r.shadowMap.autoUpdate = true;
    if (this.hudEl) this.hudEl.style.display = "none";
    session.addEventListener("end", () => this.exitVRCleanup());
    try { await r.xr.setSession(session as never); } catch { this.exitVRCleanup(); return false; }
    let last = performance.now();
    r.setAnimationLoop((now) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
      this.xrFrame(dt, session);
    });
    return true;
  }

  exitVR() { void this.renderer.xr.getSession()?.end(); }

  private placeRig() {
    const w = this.walker!, rig = this.xrRig!;
    const feetY = w.eye().y - w.opt.eye; // smoothed floor height (stairs)
    rig.position.set(w.feet.x, feetY, w.feet.z);
  }

  private xrFrame(dt: number, session: XRSession) {
    const w = this.walker, rig = this.xrRig;
    if (!w || !rig) return;
    this.envRes?.update?.(this.clock.getElapsed());
    // controllers: left stick = walk in viewing direction, right stick = 30° snap turn
    let mx = 0, mz = 0, turn = 0;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || gp.axes.length < 2) continue;
      const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0], ay = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
      if (src.handedness === "right") turn = ax;
      else { mx = ax; mz = -ay; }
    }
    if (Math.abs(turn) < 0.6) this.xrSnapReady = true;
    else if (this.xrSnapReady) { rig.rotation.y -= Math.sign(turn) * Math.PI / 6; this.xrSnapReady = false; }
    if (Math.abs(mx) < 0.15) mx = 0;
    if (Math.abs(mz) < 0.15) mz = 0;
    // walking direction follows the head
    const head = this.renderer.xr.getCamera();
    const fwd = new Vector3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(new Quaternion()));
    w.yaw = Math.atan2(-fwd.x, -fwd.z);
    w.update(dt, { x: mx, z: mz });
    this.placeRig();
    this.renderer.render(this.scene, this.camera);
  }

  private exitVRCleanup() {
    const rig = this.xrRig;
    if (!rig) return;
    const r = this.renderer;
    r.setAnimationLoop(null);
    r.xr.enabled = false;
    rig.remove(this.camera);
    this.scene.remove(rig);
    this.xrRig = null;
    const saved = this.xrSaved;
    this.camera.position.copy(saved?.pos ?? this.camera.position);
    if (saved) this.camera.quaternion.copy(saved.quat);
    if (this.walker) this.walker.yaw = rig.rotation.y;
    if (this.hudEl) this.hudEl.style.display = "";
    this.resize();
    if (saved?.mode === "walk") this.setMode("walk");
    this.invalidate(8);
  }

  /** Storeys (top floor first) followed by the user's own places. */
  private jumpList(levels: PublicConfig["levels"]): string {
    const name = (n: { de: string; en: string }) => esc(this.lang === "de" ? n.de : n.en);
    const lv = levels.map((l, i) => ({ l, i })).filter(({ l }) => !l.hidden).reverse();
    const places = this.config?.places ?? [];
    const showLevels = lv.length > 1 || (lv.length === 1 && places.length > 0);
    if (!showLevels && !places.length) return "";
    return `<div class="av-levels">
      ${showLevels ? lv.map(({ l, i }) => `<button data-lv="${i}" class="av-b av-lv">${name(l.name)}</button>`).join("") : ""}
      ${showLevels && places.length ? `<span class="av-hsep"></span>` : ""}
      ${places.map((p) => `<button data-place="${esc(p.id)}" class="av-b av-lv av-place">${esc(p.name)}</button>`).join("")}
    </div>`;
  }

  /** Jump to a user-defined place (walk places start first-person, others fly the orbit camera). */
  goToPlace(p: { position: [number, number, number]; target: [number, number, number]; walk: boolean; name: string; id: string }) {
    if (this.insideBarrier(new Vector3(...p.position))) return;
    if (p.walk && this.walker) {
      this.stopTour();
      const yaw = Math.atan2(-(p.target[0] - p.position[0]), -(p.target[2] - p.position[2]));
      this.setMode("walk");
      this.walker.teleport(new Vector3(p.position[0], p.position[1] - DEFAULT_WALKER.eye, p.position[2]), yaw);
      const d = new Vector3(...p.target).sub(new Vector3(...p.position));
      this.walker.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(d.y, Math.hypot(d.x, d.z))));
      return;
    }
    this.clipLevel(null);
    this.goTo({ id: p.id, name: p.name, position: p.position, target: p.target });
  }

  /** Current camera view, for saving it as a place in the editor. */
  currentView(): { position: [number, number, number]; target: [number, number, number]; walk: boolean } {
    const pos = this.camera.position.clone();
    if (this.mode === "walk") {
      const dir = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      return { position: pos.toArray() as [number, number, number], target: pos.clone().addScaledVector(dir, 3).toArray() as [number, number, number], walk: true };
    }
    return { position: pos.toArray() as [number, number, number], target: this.orbit.target.toArray() as [number, number, number], walk: false };
  }

  setPlaces(places: PublicConfig["places"], levels?: PublicConfig["levels"]) {
    this.invalidate(8);
    if (!this.config) return;
    this.config = { ...this.config, places, ...(levels ? { levels } : {}) };
    if (this.hudEl) this.buildHud();
  }

  private updateHudState(level?: number) {
    const hud = this.hudEl;
    if (!hud) return;
    const L = (k: Parameters<typeof tr>[1]) => tr(this.lang, k);
    hud.querySelectorAll<HTMLButtonElement>("[data-a=walk]").forEach((b) => b.classList.toggle("on", this.mode === "walk"));
    hud.classList.toggle("av-walking", this.mode === "walk");
    hud.querySelectorAll<HTMLButtonElement>("[data-a=orbit]").forEach((b) => b.classList.toggle("on", this.mode === "orbit" && !this.tour));
    hud.querySelectorAll<HTMLButtonElement>("[data-a=tour]").forEach((b) => b.classList.toggle("on", !!this.tour));
    if (level !== undefined) hud.querySelectorAll<HTMLButtonElement>("[data-lv],[data-place]").forEach((b) => b.classList.toggle("on", b.dataset.lv !== undefined && +b.dataset.lv === level));
    const q = hud.querySelector<HTMLButtonElement>(".av-q");
    if (q) q.textContent = `◐ ${this.quality === "auto" ? L("auto") : L(this.tier)}`;
    const hint = hud.querySelector<HTMLDivElement>(".av-hint");
    if (hint) hint.textContent = this.mode === "walk" ? (isCoarse() ? L("hintTouch") : L("hintWalk")) : L("hintOrbit");
  }

  /** Editor: while set, clicks on the model report the hit point instead of navigating. */
  setPickHandler(fn: ViewerOptions["onPick"] | null) {
    this.opts.onPick = fn ?? undefined;
    this.renderer.domElement.style.cursor = fn ? "crosshair" : "";
  }

  setLanguage(l: Lang) { this.lang = l; if (this.hudEl) this.buildHud(); }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.cleanup.forEach((f) => f());
    this.orbit.dispose();
    disposeGroup(this.building);
    if (this.envGroup) disposeGroup(this.envGroup);
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.hsLayer.remove();
    this.hudEl?.remove();
  }
}

const VIGNETTE = {
  uniforms: { tDiffuse: { value: null }, darkness: { value: 0.55 }, offset: { value: 0.95 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 u = (vUv - 0.5) * vec2(offset); c.rgb = mix(c.rgb, vec3(1.0 - darkness), dot(u, u)); gl_FragColor = c; }",
};

function barrierSoup(barriers: PublicConfig["barriers"]): Float32Array {
  const out: number[] = [];
  for (const b of barriers) {
    const p = b.polygon;
    for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length];
      out.push(ax, b.yMin, az, bx, b.yMin, bz, bx, b.yMax, bz, ax, b.yMin, az, bx, b.yMax, bz, ax, b.yMax, az);
    }
  }
  return new Float32Array(out);
}

/** Photo textures already contain the colour; keep only a subtle tint of the preset colour. */
function tintFor(hex: string) {
  const c = new Color(hex);
  const l = (c.r + c.g + c.b) / 3 || 1;
  return new Color(Math.min(1, 0.85 + (c.r / l - 1) * 0.08), Math.min(1, 0.85 + (c.g / l - 1) * 0.08), Math.min(1, 0.85 + (c.b / l - 1) * 0.08)).multiplyScalar(1.15);
}

function radialAlpha(): CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d")!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "#fff"); g.addColorStop(0.55, "#fff"); g.addColorStop(1, "#000");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new CanvasTexture(cv);
}

function averageColor(img: (CanvasImageSource & { width: number; height: number }) | undefined): Color | null {
  if (!img || typeof document === "undefined") return null;
  const cv = document.createElement("canvas"); cv.width = cv.height = 16;
  const x = cv.getContext("2d", { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(img, 0, 0, 16, 16);
  const d = x.getImageData(0, 0, 16, 16).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return new Color().setRGB(r / n / 255, g / n / 255, b / n / 255, SRGBColorSpace);
}

function dirFrom(elevDeg: number, azDeg: number) {
  const e = (elevDeg * Math.PI) / 180, a = (azDeg * Math.PI) / 180;
  return new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clamp = (v: number) => Math.max(-1, Math.min(1, v));
/** Average colour (sRGB 0–1) and whether the image has transparent holes — from a small downscaled copy. */
function imageStats(img: CanvasImageSource): { r: number; g: number; b: number; holes: boolean } | null {
  try {
    const n = 24;
    const cv: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(n, n) : Object.assign(document.createElement("canvas"), { width: n, height: n });
    const ctx = cv.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    let r = 0, g = 0, b = 0, w = 0, clear = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a < 0.5) clear++;
      r += d[i] * a; g += d[i + 1] * a; b += d[i + 2] * a; w += a;
    }
    if (!w) return null;
    return { r: r / w / 255, g: g / w / 255, b: b / w / 255, holes: clear > d.length / 4 * 0.03 };
  } catch { return null; }
}

function disposeMaterial(m: Material) {
  const mm = m as MeshPhysicalMaterial;
  for (const k of ["map", "normalMap", "roughnessMap", "aoMap"] as const) {
    const t = mm[k];
    // aoMap and roughnessMap may be the same texture
    if (t && !(k === "aoMap" && t === mm.roughnessMap)) t.dispose();
  }
  m.dispose();
}

const isCoarse = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
void FrontSide; void Object3D;
