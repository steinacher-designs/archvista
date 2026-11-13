// ARCHVISTA — 3D Studio (.3ds) import. Reads the chunk format (objects, triangles, materials with colour,
// transparency and texture file name) and hands it to the same pipeline as the DXF import (units, welding,
// orientation, crease normals). Written from the public 3DS chunk documentation; no third-party code.

import { addTri, type BuildResult, type TriGroup } from "../dxf/build";
import { Welder, LARGE_MODEL_TRIANGLES } from "../weld";
import type { RawMaterial } from "../dxf/reader";
import { finalize, guessUnits, type ImportedModel, type ImportOptions } from "../dxf/import";

const C = {
  MAIN: 0x4d4d, EDITOR: 0x3d3d, OBJECT: 0x4000, HIDDEN: 0x4010, TRIMESH: 0x4100, VERTICES: 0x4110, FACES: 0x4120, FACE_MAT: 0x4130,
  MATERIAL: 0xafff, MAT_NAME: 0xa000, MAT_DIFFUSE: 0xa020, MAT_TRANSPARENCY: 0xa050, MAT_TEXMAP: 0xa200, MAP_NAME: 0xa300,
  COLOR_F: 0x0010, COLOR_24: 0x0011, LIN_COLOR_24: 0x0012, LIN_COLOR_F: 0x0013, PERCENT_I: 0x0030, PERCENT_F: 0x0031,
};

export class TdsFormatError extends Error {}

interface Chunk { id: number; start: number; end: number }

export function importTds(bytes: Uint8Array, opts: ImportOptions = {}): ImportedModel {
  const progress = opts.onProgress ?? (() => {});
  progress(0.05, "3DS-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 6 || dv.getUint16(0, true) !== C.MAIN) throw new TdsFormatError("Das ist keine gültige 3DS-Datei.");
  const chunk = (at: number, limit: number): Chunk | null => {
    if (at + 6 > limit) return null;
    const len = dv.getUint32(at + 2, true);
    if (len < 6 || at + len > limit) return null; // damaged: stop reading this level
    return { id: dv.getUint16(at, true), start: at + 6, end: at + len };
  };
  const children = (c: Chunk, from = c.start): Chunk[] => {
    const out: Chunk[] = [];
    for (let p = from; p < c.end;) { const k = chunk(p, c.end); if (!k) break; out.push(k); p = k.end; }
    return out;
  };
  const cstr = (at: number, limit: number): [string, number] => {
    let e = at; while (e < limit && bytes[e] !== 0) e++;
    return [new TextDecoder("latin1").decode(bytes.subarray(at, e)), e + 1];
  };
  const color = (c: Chunk): number | undefined => {
    let best: number | undefined;
    for (const k of children(c)) {
      if (k.id === C.COLOR_24 || k.id === C.LIN_COLOR_24) best = (bytes[k.start] << 16) | (bytes[k.start + 1] << 8) | bytes[k.start + 2];
      else if (k.id === C.COLOR_F || k.id === C.LIN_COLOR_F) {
        const f = (i: number) => Math.max(0, Math.min(255, Math.round(dv.getFloat32(k.start + i * 4, true) * 255)));
        best = (f(0) << 16) | (f(1) << 8) | f(2);
      }
      if (best !== undefined && (k.id === C.COLOR_24 || k.id === C.COLOR_F)) break; // prefer the non-gamma value
    }
    return best;
  };
  const percent = (c: Chunk): number | undefined => {
    for (const k of children(c)) {
      if (k.id === C.PERCENT_I) return dv.getInt16(k.start, true);
      if (k.id === C.PERCENT_F) return dv.getFloat32(k.start, true);
    }
    return undefined;
  };

  const root = chunk(0, bytes.length);
  if (!root) throw new TdsFormatError("Die 3DS-Datei ist beschädigt.");
  const editor = children(root).find((k) => k.id === C.EDITOR);
  if (!editor) throw new TdsFormatError("Die 3DS-Datei enthält keine 3D-Daten.");

  const materials = new Map<string, RawMaterial>();
  const groups = new Map<string, TriGroup>();
  let objects = 0, hidden = 0, faces = 0;
  const editorItems = children(editor);
  // materials first (objects refer to them by name)
  for (const m of editorItems.filter((k) => k.id === C.MATERIAL)) {
    const rm: RawMaterial = { handle: "", name: "" };
    for (const k of children(m)) {
      if (k.id === C.MAT_NAME) rm.name = cstr(k.start, k.end)[0];
      else if (k.id === C.MAT_DIFFUSE) { const c = color(k); if (c !== undefined) rm.diffuse = c; }
      else if (k.id === C.MAT_TRANSPARENCY) { const t = percent(k); if (t !== undefined && t > 0) rm.opacity = Math.max(0, Math.min(1, 1 - t / 100)); }
      else if (k.id === C.MAT_TEXMAP) { for (const s of children(k)) if (s.id === C.MAP_NAME) { const n = cstr(s.start, s.end)[0].trim(); if (n) rm.diffuseMap = n; } }
    }
    if (!rm.name) continue;
    rm.handle = rm.name.toUpperCase();
    materials.set(rm.handle, rm);
  }
  const groupFor = (layer: string, mat: string | undefined): TriGroup => {
    const rm = mat ? materials.get(mat.toUpperCase()) : undefined;
    const color = rm?.diffuse ?? 0xcccccc;
    const key = `${layer}\u0000${mat ?? ""}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { layer, color, material: rm ? rm.name : undefined, tris: [], ...(weldCell ? { weld: new Welder(weldCell) } : {}) }));
    return g;
  };
  const objs = editorItems.filter((k) => k.id === C.OBJECT);
  // very large files: count faces and measure first; then points are welded on a 1 cm grid while reading
  let weldCell: number | undefined;
  {
    let total = 0;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const meshes: Chunk[] = [];
    for (const o of objs) {
      const [, after] = cstr(o.start, o.end);
      for (const tm of children(o, after)) if (tm.id === C.TRIMESH) {
        const fc = children(tm).find((k) => k.id === C.FACES);
        if (fc) total += dv.getUint16(fc.start, true);
        meshes.push(tm);
      }
    }
    if (total > LARGE_MODEL_TRIANGLES) {
      for (const tm of meshes) {
        const vc = children(tm).find((k) => k.id === C.VERTICES);
        if (!vc) continue;
        const nv = dv.getUint16(vc.start, true);
        for (let i = 0; i < nv && vc.start + 2 + i * 12 + 12 <= vc.end; i += 7) for (let k = 0; k < 3; k++) {
          const v = dv.getFloat32(vc.start + 2 + i * 12 + k * 4, true);
          if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v;
        }
      }
      const ext = Number.isFinite(mn[0]) ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
      weldCell = 0.01 / (opts.unitsToMeters ?? guessUnits(ext)[1]);
    }
  }
  objs.forEach((o, oi) => {
    if (oi % 50 === 0) progress(0.1 + 0.4 * (oi / Math.max(1, objs.length)), "Objekte werden gelesen");
    const [name, after] = cstr(o.start, o.end);
    const parts = children(o, after);
    if (parts.some((k) => k.id === C.HIDDEN)) { hidden++; return; } // hidden in 3ds Max
    for (const tm of parts.filter((k) => k.id === C.TRIMESH)) {
      objects++;
      const sub = children(tm);
      const vc = sub.find((k) => k.id === C.VERTICES), fc = sub.find((k) => k.id === C.FACES);
      if (!vc || !fc) continue;
      const nv = dv.getUint16(vc.start, true);
      const V = new Float32Array(nv * 3);
      for (let i = 0; i < nv * 3 && vc.start + 2 + i * 4 + 4 <= vc.end; i++) V[i] = dv.getFloat32(vc.start + 2 + i * 4, true);
      const nf = dv.getUint16(fc.start, true);
      const faceEnd = fc.start + 2 + nf * 8;
      const faceMat = new Array<string | undefined>(nf).fill(undefined);
      for (const g of children(fc, faceEnd)) {
        if (g.id !== C.FACE_MAT) continue;
        const [mn, p] = cstr(g.start, g.end);
        const n = dv.getUint16(p, true);
        for (let i = 0; i < n; i++) { const f = dv.getUint16(p + 2 + i * 2, true); if (f < nf) faceMat[f] = mn; }
      }
      const layer = name || `Objekt ${objects}`;
      for (let f = 0; f < nf; f++) {
        const at = fc.start + 2 + f * 8;
        const a = dv.getUint16(at, true), b = dv.getUint16(at + 2, true), c = dv.getUint16(at + 4, true);
        if (a >= nv || b >= nv || c >= nv) continue;
        // 3DS stores vertices in world space, Z up, in the file's units — exactly like DXF drawing coordinates
        addTri(groupFor(layer, faceMat[f]), V[a * 3], V[a * 3 + 1], V[a * 3 + 2], V[b * 3], V[b * 3 + 1], V[b * 3 + 2], V[c * 3], V[c * 3 + 1], V[c * 3 + 2]);
        faces++;
      }
    }
  });
  progress(0.55, "Modell wird optimiert");
  const built: BuildResult = {
    groups, entityCounts: { "3DS-Objekte": objects, "3DS-Dreiecke": faces }, acis: [], ignored2d: 0,
    skippedHiddenLayers: hidden, meshWithSubdivision: 0, missingBlocks: [], recursionCut: 0,
  };
  // 3DS has no reliable unit: guessed from the model size (one click to correct, as with DXF)
  return finalize(built, undefined, "3DS", opts, progress, materials);
}
