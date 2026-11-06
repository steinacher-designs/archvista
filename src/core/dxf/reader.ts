// ARCHVISTA — low-level ASCII DXF reader.
// Turns the group-code/value stream into sections, tables, blocks and raw entities.
// Written from the public DXF reference; no third-party code.

export type Pair = [code: number, value: string];

export interface RawEntity {
  type: string;
  pairs: Pair[];
  /** Child records (VERTEX for POLYLINE, ATTRIB for INSERT). */
  children?: RawEntity[];
}

export interface RawBlock {
  name: string;
  base: [number, number, number];
  flags: number;
  entities: RawEntity[];
}

export interface RawLayer {
  name: string;
  color: number; // ACI, negative = layer off
  trueColor?: number;
  flags: number; // 1 = frozen, 4 = locked
}

export interface RawDxf {
  header: Map<string, Pair[]>;
  layers: Map<string, RawLayer>;
  blocks: Map<string, RawBlock>;
  entities: RawEntity[];
  version?: string;
}

export class DxfFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DxfFormatError";
  }
}

/** Fast line cursor that avoids splitting a 100 MB string into an array. */
class PairCursor {
  private pos = 0;
  private readonly len: number;
  peeked: Pair | null = null;
  line = 0;
  constructor(private readonly src: string) {
    this.len = src.length;
    if (src.charCodeAt(0) === 0xfeff) this.pos = 1;
  }
  private readLine(): string | null {
    if (this.pos >= this.len) return null;
    let end = this.src.indexOf("\n", this.pos);
    if (end === -1) end = this.len;
    let s = this.src.slice(this.pos, end);
    this.pos = end + 1;
    this.line++;
    if (s.endsWith("\r")) s = s.slice(0, -1);
    return s;
  }
  next(): Pair | null {
    if (this.peeked) {
      const p = this.peeked;
      this.peeked = null;
      return p;
    }
    const c = this.readLine();
    if (c === null) return null;
    const v = this.readLine();
    if (v === null) return null;
    const code = parseInt(c.trim(), 10);
    if (Number.isNaN(code)) {
      throw new DxfFormatError(`Ungültiger Gruppencode in Zeile ${this.line - 1}: "${c.slice(0, 30)}"`);
    }
    return [code, v.trim()];
  }
  peek(): Pair | null {
    if (!this.peeked) this.peeked = this.next();
    return this.peeked;
  }
}

/** Collect pairs until the next code-0 record. */
function readRecord(cur: PairCursor, type: string): RawEntity {
  const pairs: Pair[] = [];
  for (;;) {
    const p = cur.peek();
    if (!p || p[0] === 0) break;
    pairs.push(cur.next()!);
  }
  return { type, pairs };
}

function readEntityList(cur: PairCursor, terminators: Set<string>): { list: RawEntity[]; end: string | null } {
  const list: RawEntity[] = [];
  for (;;) {
    const p = cur.next();
    if (!p) return { list, end: null };
    if (p[0] !== 0) continue;
    const type = p[1].toUpperCase();
    if (terminators.has(type)) {
      readRecord(cur, type); // consume terminator body
      return { list, end: type };
    }
    const ent = readRecord(cur, type);
    if (type === "POLYLINE") {
      ent.children = readChildren(cur, "VERTEX");
    } else if (type === "INSERT" && num(ent.pairs, 66, 0) === 1) {
      readChildren(cur, "ATTRIB"); // attributes are text — not needed for geometry
    }
    list.push(ent);
  }
}

function readChildren(cur: PairCursor, childType: string): RawEntity[] {
  const out: RawEntity[] = [];
  for (;;) {
    const p = cur.peek();
    if (!p) return out;
    if (p[0] !== 0) {
      cur.next();
      continue;
    }
    const type = p[1].toUpperCase();
    if (type === childType) {
      cur.next();
      out.push(readRecord(cur, type));
    } else if (type === "SEQEND") {
      cur.next();
      readRecord(cur, type);
      return out;
    } else {
      // Malformed file without SEQEND — stop here, leave record for caller.
      return out;
    }
  }
}

export function num(pairs: Pair[], code: number, def: number): number {
  for (const [c, v] of pairs) if (c === code) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}

export function str(pairs: Pair[], code: number, def = ""): string {
  for (const [c, v] of pairs) if (c === code) return v;
  return def;
}

export function isBinaryDxf(head: string): boolean {
  return head.startsWith("AutoCAD Binary DXF");
}

export function readDxf(text: string): RawDxf {
  if (isBinaryDxf(text.slice(0, 22))) {
    throw new DxfFormatError(
      "Diese DXF-Datei ist im Binärformat gespeichert. Bitte in AutoCAD mit DXFOUT als ASCII-DXF speichern (Standardeinstellung)."
    );
  }
  const cur = new PairCursor(text);
  const out: RawDxf = { header: new Map(), layers: new Map(), blocks: new Map(), entities: [] };
  let sawSection = false;

  for (;;) {
    const p = cur.next();
    if (!p) break;
    if (p[0] === 0 && p[1] === "EOF") break;
    if (p[0] === 0 && p[1] === "SECTION") {
      sawSection = true;
      const nameP = cur.next();
      const name = nameP?.[1]?.toUpperCase() ?? "";
      if (name === "HEADER") readHeader(cur, out);
      else if (name === "TABLES") readTables(cur, out);
      else if (name === "BLOCKS") readBlocks(cur, out);
      else if (name === "ENTITIES") out.entities = readEntityList(cur, new Set(["ENDSEC"])).list;
      else skipSection(cur);
    }
  }
  if (!sawSection) {
    throw new DxfFormatError("Die Datei enthält keine DXF-Abschnitte. Ist es wirklich eine DXF-Datei?");
  }
  const ver = out.header.get("$ACADVER");
  if (ver) out.version = ver[0]?.[1];
  return out;
}

function skipSection(cur: PairCursor) {
  for (;;) {
    const p = cur.next();
    if (!p || (p[0] === 0 && p[1] === "ENDSEC")) return;
  }
}

function readHeader(cur: PairCursor, out: RawDxf) {
  let current: string | null = null;
  for (;;) {
    const p = cur.next();
    if (!p || (p[0] === 0 && p[1] === "ENDSEC")) return;
    if (p[0] === 9) {
      current = p[1];
      out.header.set(current, []);
    } else if (current) {
      out.header.get(current)!.push(p);
    }
  }
}

function readTables(cur: PairCursor, out: RawDxf) {
  for (;;) {
    const p = cur.next();
    if (!p || (p[0] === 0 && p[1] === "ENDSEC")) return;
    if (p[0] === 0 && p[1] === "LAYER") {
      const rec = readRecord(cur, "LAYER");
      const name = str(rec.pairs, 2);
      if (!name) continue;
      const tc = rec.pairs.find(([c]) => c === 420);
      out.layers.set(name.toUpperCase(), {
        name,
        color: num(rec.pairs, 62, 7),
        trueColor: tc ? parseInt(tc[1], 10) : undefined,
        flags: num(rec.pairs, 70, 0),
      });
    }
  }
}

function readBlocks(cur: PairCursor, out: RawDxf) {
  for (;;) {
    const p = cur.next();
    if (!p || (p[0] === 0 && p[1] === "ENDSEC")) return;
    if (p[0] === 0 && p[1] === "BLOCK") {
      const head = readRecord(cur, "BLOCK");
      const name = str(head.pairs, 2) || str(head.pairs, 3);
      const { list } = readEntityList(cur, new Set(["ENDBLK"]));
      out.blocks.set(name.toUpperCase(), {
        name,
        base: [num(head.pairs, 10, 0), num(head.pairs, 20, 0), num(head.pairs, 30, 0)],
        flags: num(head.pairs, 70, 0),
        entities: list,
      });
    }
  }
}
