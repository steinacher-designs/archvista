// ARCHVISTA — minimal ZIP reader (stored + deflate) using the platform's DecompressionStream. No dependencies.

export interface ZipEntry { name: string; data: Uint8Array }

export class ZipError extends Error {}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

/** Reads all files of a ZIP archive (folders skipped). `filter` decides which entries are decompressed. */
export async function unzip(bytes: Uint8Array, filter: (name: string) => boolean = () => true): Promise<ZipEntry[]> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // end of central directory: search backwards (comment can be up to 64 KB)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new ZipError("Die Datei ist kein gültiges ZIP-Archiv.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const utf8 = new TextDecoder("utf-8");
  const latin = new TextDecoder("latin1");
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) throw new ZipError("Das ZIP-Archiv ist beschädigt.");
    const flags = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const rawName = bytes.subarray(p + 46, p + 46 + nameLen);
    const name = (flags & 0x800 ? utf8 : latin).decode(rawName).replace(/\\/g, "/");
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/") || !filter(name)) continue;
    if (flags & 1) throw new ZipError(`„${name}“ ist verschlüsselt. Bitte ein ZIP ohne Passwort verwenden.`);
    if (local + 30 > bytes.length || dv.getUint32(local, true) !== 0x04034b50) throw new ZipError("Das ZIP-Archiv ist beschädigt.");
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + csize);
    if (method === 0) out.push({ name, data: raw.slice() });
    else if (method === 8) out.push({ name, data: await inflateRaw(raw) });
    else throw new ZipError(`„${name}“ verwendet ein Kompressionsverfahren, das ARCHVISTA nicht kennt. Bitte mit Windows („Senden an → ZIP-komprimierter Ordner“) packen.`);
  }
  return out;
}

export const baseName = (path: string) => path.split("/").pop() ?? path;
