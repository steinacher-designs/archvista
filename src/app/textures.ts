// ARCHVISTA — own texture images (from a CAD file's ZIP), stored with the project like plan documents.
import { platform } from "./platform";
import { textureDocId } from "../core/materials";

const urls = new Map<string, Promise<string | null>>();

const mime = (name: string) => /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : "image/jpeg";

/** Object URL of a project texture (cached for the session). */
export function textureUrl(projectId: string, name: string): Promise<string | null> {
  const k = `${projectId}/${name}`;
  let p = urls.get(k);
  if (!p) {
    p = platform.loadDocument(projectId, textureDocId(name)).then((b) => (b ? URL.createObjectURL(new Blob([b as BlobPart], { type: mime(name) })) : null));
    urls.set(k, p);
  }
  return p;
}

export async function saveTexture(projectId: string, name: string, bytes: Uint8Array) {
  await platform.saveDocument(projectId, textureDocId(name), bytes);
  urls.delete(`${projectId}/${name}`);
}

// ——— own surroundings (360° panorama) ———
export const envDocId = (file: string) => `env-${file.replace(/\./g, "_")}`.slice(0, 64);
const envUrls = new Map<string, Promise<string | null>>();
const envMime = (f: string) => /\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : /\.(jpe?g)$/i.test(f) ? "image/jpeg" : "application/octet-stream";
export function envUrl(projectId: string, file: string): Promise<string | null> {
  const k = `${projectId}/${file}`;
  let p = envUrls.get(k);
  if (!p) {
    p = platform.loadDocument(projectId, envDocId(file)).then((b) => (b ? URL.createObjectURL(new Blob([b as BlobPart], { type: envMime(file) })) : null));
    envUrls.set(k, p);
  }
  return p;
}
export async function saveEnv(projectId: string, file: string, bytes: Uint8Array) {
  await platform.saveDocument(projectId, envDocId(file), bytes);
  envUrls.delete(`${projectId}/${file}`);
}

// ——— own materials: a photo the user adds (kept small enough for websites) ———
/** Reads an image file; very large photos are scaled down to 2048 px and stored as JPEG. */
export async function prepareImage(file: File): Promise<{ bytes: Uint8Array; ext: string }> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const ext = /\.png$/i.test(file.name) ? "png" : /\.webp$/i.test(file.name) ? "webp" : "jpg";
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(new Blob([raw as BlobPart], { type: mime(file.name) })); } catch { throw new Error("Das Bild konnte nicht gelesen werden. Bitte JPG, PNG oder WebP verwenden."); }
  const max = 2048;
  if (bmp.width <= max && bmp.height <= max && raw.length < 4_000_000) { bmp.close(); return { bytes: raw, ext }; }
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const keepAlpha = ext === "png";
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, keepAlpha ? "image/png" : "image/jpeg", 0.88));
  if (!blob) return { bytes: raw, ext };
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: keepAlpha ? "png" : "jpg" };
}
