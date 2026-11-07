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
