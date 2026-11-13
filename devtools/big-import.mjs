// scripts/dev/big-import.ts
import { openSync, readSync, fstatSync } from "node:fs";

// src/core/dxf/color.ts
function hsv(h, s, v) {
  const c = v * s;
  const hp = h % 360 / 60;
  const x = c * (1 - Math.abs(hp % 2 - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  const f2 = (x2) => Math.floor(x2 + 1e-6);
  return f2(r + m) << 16 | f2(g + m) << 8 | f2(b + m);
}
var LEVELS = [255, 204, 153, 127, 76];
var BASE = {
  1: 16711680,
  2: 16776960,
  3: 65280,
  4: 65535,
  5: 255,
  6: 16711935,
  7: 16777215,
  8: 8421504,
  9: 12632256,
  250: 3355443,
  251: 5263440,
  252: 6908265,
  253: 8553090,
  254: 12500670,
  255: 16777215
};
var ACI = (() => {
  const t = new Array(256).fill(16777215);
  for (let i = 1; i < 256; i++) {
    if (BASE[i] !== void 0) t[i] = BASE[i];
    else if (i >= 10 && i <= 249) {
      const group = Math.floor(i / 10) - 1;
      const v = i % 10;
      t[i] = hsv(group * 15, v % 2 === 0 ? 1 : 0.5, LEVELS[Math.floor(v / 2)]);
    }
  }
  return t;
})();
function aciToRgb(index) {
  const i = Math.abs(Math.round(index));
  if (i < 1 || i > 255) return 16777215;
  return ACI[i];
}

// src/core/weld.ts
var GrowF64 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Float64Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float64Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var GrowI32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Int32Array(cap);
  }
  push(v) {
    if (this.n === this.a.length) {
      const b = new Int32Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    this.a[this.n++] = v;
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var GrowF32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Float32Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float32Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  /** Exact-size copy (frees the spare capacity). */
  take() {
    return this.a.slice(0, this.n);
  }
};
var GrowU32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Uint32Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Uint32Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  take() {
    return this.a.slice(0, this.n);
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var Welder = class {
  constructor(cell) {
    this.cell = cell;
    this.inv = 1 / cell;
    this.mask = 31;
    this.keys = new Int32Array(32 * 3);
    this.vals = new Int32Array(32).fill(-1);
  }
  cell;
  inv;
  keys;
  vals;
  mask;
  used = 0;
  pos = new GrowF64(48);
  idx = new GrowU32(48);
  /** triangles offered / dropped because they collapsed */
  offered = 0;
  dropped = 0;
  get vertexCount() {
    return this.pos.n / 3;
  }
  get triangleCount() {
    return this.idx.n / 3;
  }
  grow() {
    const oldK = this.keys, oldV = this.vals;
    const size2 = oldV.length * 2;
    this.keys = new Int32Array(size2 * 3);
    this.vals = new Int32Array(size2).fill(-1);
    this.mask = size2 - 1;
    for (let s = 0; s < oldV.length; s++) {
      if (oldV[s] < 0) continue;
      const x = oldK[s * 3], y = oldK[s * 3 + 1], z = oldK[s * 3 + 2];
      let h = this.hash(x, y, z);
      while (this.vals[h] >= 0) h = h + 1 & this.mask;
      this.keys[h * 3] = x;
      this.keys[h * 3 + 1] = y;
      this.keys[h * 3 + 2] = z;
      this.vals[h] = oldV[s];
    }
  }
  hash(x, y, z) {
    return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & this.mask;
  }
  vertex(x, y, z) {
    const ix = Math.floor(x * this.inv) | 0, iy = Math.floor(y * this.inv) | 0, iz = Math.floor(z * this.inv) | 0;
    let h = this.hash(ix, iy, iz);
    for (; ; ) {
      const v = this.vals[h];
      if (v < 0) break;
      if (this.keys[h * 3] === ix && this.keys[h * 3 + 1] === iy && this.keys[h * 3 + 2] === iz) return v;
      h = h + 1 & this.mask;
    }
    const id = this.pos.n / 3;
    this.keys[h * 3] = ix;
    this.keys[h * 3 + 1] = iy;
    this.keys[h * 3 + 2] = iz;
    this.vals[h] = id;
    this.pos.reserve(3);
    this.pos.a[this.pos.n++] = x;
    this.pos.a[this.pos.n++] = y;
    this.pos.a[this.pos.n++] = z;
    if (++this.used * 2 > this.vals.length) this.grow();
    return id;
  }
  tri(ax, ay, az, bx, by, bz, cx, cy, cz) {
    this.offered++;
    const a = this.vertex(ax, ay, az), b = this.vertex(bx, by, bz), c = this.vertex(cx, cy, cz);
    if (a === b || b === c || a === c) {
      this.dropped++;
      return;
    }
    this.idx.reserve(3);
    this.idx.a[this.idx.n++] = a;
    this.idx.a[this.idx.n++] = b;
    this.idx.a[this.idx.n++] = c;
  }
};
var LARGE_MODEL_TRIANGLES = 3e6;
var IMPORT_BUDGET = 25e5;
function dedupeTriangles(I) {
  const n = I.length / 3;
  let size2 = 64;
  while (size2 < n * 2) size2 *= 2;
  const mask = size2 - 1;
  const keys = new Uint32Array(size2 * 3), used = new Uint8Array(size2);
  const out = new Uint32Array(I.length);
  let o = 0;
  for (let t = 0; t < n; t++) {
    let a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    if (a > b) {
      const x = a;
      a = b;
      b = x;
    }
    if (b > c) {
      const x = b;
      b = c;
      c = x;
    }
    if (a > b) {
      const x = a;
      a = b;
      b = x;
    }
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & mask;
    let dup = false;
    while (used[h]) {
      if (keys[h * 3] === a && keys[h * 3 + 1] === b && keys[h * 3 + 2] === c) {
        dup = true;
        break;
      }
      h = h + 1 & mask;
    }
    if (dup) continue;
    used[h] = 1;
    keys[h * 3] = a;
    keys[h * 3 + 1] = b;
    keys[h * 3 + 2] = c;
    out[o++] = I[t * 3];
    out[o++] = I[t * 3 + 1];
    out[o++] = I[t * 3 + 2];
  }
  return { indices: out.slice(0, o), removed: n - o / 3 };
}

// src/core/dxf/reader.ts
var DxfFormatError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DxfFormatError";
  }
};
var bytesSource = (b) => ({ size: b.length, read: (o, l) => b.subarray(o, Math.min(b.length, o + l)) });
var CHUNK = 16 * 1024 * 1024;
var utf8 = new TextDecoder("utf-8");
var PairCursor = class {
  constructor(src2, onRead) {
    this.src = src2;
    this.onRead = onRead;
    this.fill();
    if (this.buf[0] === 239 && this.buf[1] === 187 && this.buf[2] === 191) this.pos = 3;
  }
  src;
  onRead;
  buf = new Uint8Array(0);
  pos = 0;
  fileOff = 0;
  // file offset of buf[0]
  peeked = null;
  line = 0;
  /** keep the unread rest, append the next piece of the file */
  fill() {
    const readTo = this.fileOff + this.buf.length;
    if (readTo >= this.src.size) return false;
    const rest = this.buf.subarray(this.pos);
    const next = this.src.read(readTo, CHUNK);
    const b = new Uint8Array(rest.length + next.length);
    b.set(rest);
    b.set(next, rest.length);
    this.fileOff = readTo - rest.length;
    this.buf = b;
    this.pos = 0;
    this.onRead?.(Math.min(1, (this.fileOff + b.length) / Math.max(1, this.src.size)));
    return next.length > 0;
  }
  readLine() {
    let end = this.buf.indexOf(10, this.pos);
    while (end === -1) {
      if (!this.fill()) {
        end = this.buf.length;
        break;
      }
      end = this.buf.indexOf(10, this.pos);
    }
    if (this.pos >= this.buf.length) return null;
    let e = end;
    if (e > this.pos && this.buf[e - 1] === 13) e--;
    const bytes = this.buf.subarray(this.pos, e);
    this.pos = end + 1;
    this.line++;
    let ascii = true;
    for (let i = 0; i < bytes.length; i++) if (bytes[i] > 127) {
      ascii = false;
      break;
    }
    if (!ascii) return utf8.decode(bytes);
    if (bytes.length < 4096) return String.fromCharCode.apply(null, bytes);
    return utf8.decode(bytes);
  }
  next() {
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
      throw new DxfFormatError(`Ung\xFCltiger Gruppencode in Zeile ${this.line - 1}: "${c.slice(0, 30)}"`);
    }
    return [code, v.trim()];
  }
  peek() {
    if (!this.peeked) this.peeked = this.next();
    return this.peeked;
  }
};
var FACE_COORD = /* @__PURE__ */ new Set([10, 11, 12, 13, 20, 21, 22, 23, 30, 31, 32, 33]);
function addFace(list, ent) {
  const attrs = [];
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let got = 0;
  for (const [code, v] of ent.pairs) {
    if (FACE_COORD.has(code)) {
      const i = code % 10 * 3 + Math.floor(code / 10) - 1;
      if (!(got & 1 << i)) {
        got |= 1 << i;
        const n = parseFloat(v);
        if (Number.isFinite(n)) c[i] = n;
      }
    } else if (code !== 70 && code !== 5 && code !== 330 && code !== 100) attrs.push([code, v]);
  }
  const sig = attrs.map(([k, v]) => `${k}=${v}`).join("|");
  const last = list[list.length - 1];
  let fb = last && last.type === "@FACES" && last.sig === sig ? last.faces : void 0;
  if (!fb) {
    fb = { data: new Float64Array(12 * 16), count: 0, tris: 0 };
    list.push({ type: "@FACES", pairs: attrs, faces: fb, sig });
  }
  if ((fb.count + 1) * 12 > fb.data.length) {
    const d = new Float64Array(fb.data.length * 2);
    d.set(fb.data);
    fb.data = d;
  }
  fb.data.set(c, fb.count * 12);
  fb.count++;
  fb.tris += Math.abs(c[6] - c[9]) < 1e-9 && Math.abs(c[7] - c[10]) < 1e-9 && Math.abs(c[8] - c[11]) < 1e-9 ? 1 : 2;
}
function readRecord(cur, type) {
  const pairs = [];
  for (; ; ) {
    const p = cur.peek();
    if (!p || p[0] === 0) break;
    pairs.push(cur.next());
  }
  return { type, pairs };
}
function readMesh(cur) {
  const pairs = [];
  const verts = new GrowF64(3 * 64);
  const list = new GrowI32(64);
  let state = "attr";
  let vLeft = 0, fLeft = 0;
  for (; ; ) {
    const p = cur.peek();
    if (!p || p[0] === 0) break;
    cur.next();
    const [c, v] = p;
    if (state === "verts" && (c === 10 || c === 20 || c === 30)) {
      verts.push(parseFloat(v) || 0);
      if (c === 30 && --vLeft <= 0) state = "rest";
      continue;
    }
    if (state === "faces" && c === 90) {
      list.push(parseInt(v, 10) || 0);
      if (--fLeft <= 0) state = "rest";
      continue;
    }
    if (c === 92 && state === "attr") {
      vLeft = parseInt(v, 10) || 0;
      state = vLeft > 0 ? "verts" : "rest";
      continue;
    }
    if (c === 93 && list.n === 0) {
      fLeft = parseInt(v, 10) || 0;
      state = fLeft > 0 ? "faces" : "rest";
      continue;
    }
    if (state === "rest" && (c === 90 || c === 140 || c === 10 || c === 20 || c === 30)) continue;
    if (state !== "verts" && state !== "faces") pairs.push(p);
  }
  return { type: "MESH", pairs, mesh: { verts: verts.view().slice(), list: list.view().slice() } };
}
function readEntityList(cur, terminators) {
  const list = [];
  for (; ; ) {
    const p = cur.next();
    if (!p) return { list, end: null };
    if (p[0] !== 0) continue;
    const type = p[1].toUpperCase();
    if (terminators.has(type)) {
      readRecord(cur, type);
      return { list, end: type };
    }
    const ent = type === "MESH" ? readMesh(cur) : readRecord(cur, type);
    if (type === "3DFACE") {
      addFace(list, ent);
      continue;
    }
    if (type === "POLYLINE") {
      ent.children = readChildren(cur, "VERTEX");
    } else if (type === "INSERT" && num(ent.pairs, 66, 0) === 1) {
      readChildren(cur, "ATTRIB");
    }
    list.push(ent);
  }
}
function readChildren(cur, childType) {
  const out = [];
  for (; ; ) {
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
      return out;
    }
  }
}
function num(pairs, code, def) {
  for (const [c, v] of pairs) if (c === code) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}
function str(pairs, code, def = "") {
  for (const [c, v] of pairs) if (c === code) return v;
  return def;
}
function isBinaryDxf(head) {
  return head.startsWith("AutoCAD Binary DXF");
}
function readDxf(input, onRead) {
  const src2 = typeof input === "string" ? bytesSource(new TextEncoder().encode(input)) : input instanceof Uint8Array ? bytesSource(input) : input;
  const head = src2.read(0, 22);
  if (isBinaryDxf(String.fromCharCode.apply(null, head))) {
    throw new DxfFormatError(
      "Diese DXF-Datei ist im Bin\xE4rformat gespeichert. Bitte in AutoCAD mit DXFOUT als ASCII-DXF speichern (Standardeinstellung)."
    );
  }
  const cur = new PairCursor(src2, onRead);
  const out = { header: /* @__PURE__ */ new Map(), layers: /* @__PURE__ */ new Map(), blocks: /* @__PURE__ */ new Map(), entities: [], materials: /* @__PURE__ */ new Map() };
  let sawSection = false;
  for (; ; ) {
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
      else if (name === "ENTITIES") out.entities = readEntityList(cur, /* @__PURE__ */ new Set(["ENDSEC"])).list;
      else if (name === "OBJECTS") readObjects(cur, out);
      else skipSection(cur);
    }
  }
  if (!sawSection) {
    throw new DxfFormatError("Die Datei enth\xE4lt keine DXF-Abschnitte. Ist es wirklich eine DXF-Datei?");
  }
  const ver = out.header.get("$ACADVER");
  if (ver) out.version = ver[0]?.[1];
  return out;
}
function skipSection(cur) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
  }
}
function readHeader(cur, out) {
  let current = null;
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 9) {
      current = p[1];
      out.header.set(current, []);
    } else if (current) {
      out.header.get(current).push(p);
    }
  }
}
function readTables(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 0 && p[1] === "LAYER") {
      const rec = readRecord(cur, "LAYER");
      const name = str(rec.pairs, 2);
      if (!name) continue;
      const tc = rec.pairs.find(([c]) => c === 420);
      out.layers.set(name.toUpperCase(), {
        name,
        color: num(rec.pairs, 62, 7),
        trueColor: tc ? parseInt(tc[1], 10) : void 0,
        flags: num(rec.pairs, 70, 0),
        material: str(rec.pairs, 347).toUpperCase() || void 0
      });
    }
  }
}
function cmColor(v) {
  if (!Number.isFinite(v)) return void 0;
  const method = v >>> 24 & 255;
  if (method === 195) return aciToRgb(v & 255);
  return v & 16777215;
}
function readObjects(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] !== 0 || p[1].toUpperCase() !== "MATERIAL") continue;
    const P = readRecord(cur, "MATERIAL").pairs;
    const handle = str(P, 5).toUpperCase();
    const name = str(P, 1);
    if (!handle || !name) continue;
    const m = { handle, name };
    const desc = str(P, 2);
    if (desc) m.description = desc;
    if (num(P, 71, 0) === 1) {
      const c = cmColor(parseInt(str(P, 91, "NaN"), 10));
      if (c !== void 0) m.diffuse = c;
    }
    const i3 = P.findIndex(([c]) => c === 3);
    if (i3 >= 0 && P[i3][1].trim()) {
      m.diffuseMap = P[i3][1].trim();
      const mat = [];
      for (let k = i3 + 1; k < P.length && mat.length < 16; k++) if (P[k][0] === 43) mat.push(parseFloat(P[k][1]));
      const sx = mat[0];
      if (Number.isFinite(sx) && Math.abs(sx) > 1e-9 && Math.abs(sx - 1) > 1e-9) m.mapScaleU = 1 / Math.abs(sx);
    }
    const op = num(P, 140, NaN);
    if (Number.isFinite(op) && op >= 0 && op <= 1) m.opacity = op;
    out.materials.set(handle, m);
  }
}
function readBlocks(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 0 && p[1] === "BLOCK") {
      const head = readRecord(cur, "BLOCK");
      const name = str(head.pairs, 2) || str(head.pairs, 3);
      const { list } = readEntityList(cur, /* @__PURE__ */ new Set(["ENDBLK"]));
      out.blocks.set(name.toUpperCase(), {
        name,
        base: [num(head.pairs, 10, 0), num(head.pairs, 20, 0), num(head.pairs, 30, 0)],
        flags: num(head.pairs, 70, 0),
        entities: list
      });
    }
  }
}

// src/core/dxf/math.ts
function identity() {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
function mul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}
function translate(x, y, z) {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
function scale(x, y, z) {
  const m = identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}
function rotZ(rad) {
  const m = identity();
  const c = Math.cos(rad), s = Math.sin(rad);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}
function apply(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}
function applyDir(m, p) {
  const [x, y, z] = p;
  return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
}
function det3(m) {
  return m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
}
function ocsMatrix(n) {
  const az = norm(n);
  if (Math.abs(az[0]) < 1e-12 && Math.abs(az[1]) < 1e-12 && az[2] > 0) return identity();
  const lim = 1 / 64;
  const ax = norm(Math.abs(az[0]) < lim && Math.abs(az[1]) < lim ? cross([0, 1, 0], az) : cross([0, 0, 1], az));
  const ay = norm(cross(az, ax));
  const m = identity();
  m[0] = ax[0];
  m[1] = ax[1];
  m[2] = ax[2];
  m[4] = ay[0];
  m[5] = ay[1];
  m[6] = ay[2];
  m[8] = az[0];
  m[9] = az[1];
  m[10] = az[2];
  return m;
}

// src/core/dxf/build.ts
var ACIS_TYPES = /* @__PURE__ */ new Set([
  "3DSOLID",
  "BODY",
  "REGION",
  "SURFACE",
  "EXTRUDEDSURFACE",
  "LOFTEDSURFACE",
  "PLANESURFACE",
  "REVOLVEDSURFACE",
  "SWEPTSURFACE",
  "NURBSURFACE"
]);
var ANNOTATION_TYPES = /* @__PURE__ */ new Set([
  "TEXT",
  "MTEXT",
  "DIMENSION",
  "LEADER",
  "MLEADER",
  "MULTILEADER",
  "HATCH",
  "POINT",
  "ATTDEF",
  "VIEWPORT",
  "IMAGE",
  "WIPEOUT",
  "TOLERANCE",
  "XLINE",
  "RAY",
  "SPLINE",
  "ELLIPSE",
  "ARC",
  "OLE2FRAME"
]);
function addTri(g, ax, ay, az, bx, by, bz, cx, cy, cz) {
  if (g.weld) g.weld.tri(ax, ay, az, bx, by, bz, cx, cy, cz);
  else g.tris.push(ax, ay, az, bx, by, bz, cx, cy, cz);
}
function estimateTriangles(dxf) {
  const memo = /* @__PURE__ */ new Map();
  const list = (ents, stack) => {
    let n = 0;
    for (const e of ents) {
      if (e.faces) n += e.faces.tris;
      else if (e.type === "POLYLINE") n += e.children?.length ?? 0;
      else if (e.type === "MESH") n += e.mesh ? Math.max(e.mesh.list.length / 4, e.mesh.verts.length / 3) : e.pairs.length / 4;
      else if (e.type === "INSERT") {
        const name = (str(e.pairs, 2) || "").toUpperCase();
        if (stack.includes(name) || stack.length > 32) continue;
        let b = memo.get(name);
        if (b === void 0) {
          const blk = dxf.blocks.get(name);
          b = blk ? list(blk.entities, [...stack, name]) : 0;
          memo.set(name, b);
        }
        n += b * Math.max(1, num(e.pairs, 70, 1)) * Math.max(1, num(e.pairs, 71, 1));
      }
    }
    return n;
  };
  return list(dxf.entities, []);
}
function roughExtent(dxf) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const add2 = (x, y, z) => {
    if (!Number.isFinite(x + y + z)) return;
    mn[0] = Math.min(mn[0], x);
    mn[1] = Math.min(mn[1], y);
    mn[2] = Math.min(mn[2], z);
    mx[0] = Math.max(mx[0], x);
    mx[1] = Math.max(mx[1], y);
    mx[2] = Math.max(mx[2], z);
  };
  for (const e of dxf.entities) {
    if (e.faces) {
      const d = e.faces.data;
      for (let i = 0; i < e.faces.count * 12; i += 3) add2(d[i], d[i + 1], d[i + 2]);
    } else if (e.type === "INSERT") add2(num(e.pairs, 10, 0), num(e.pairs, 20, 0), num(e.pairs, 30, 0));
  }
  return Number.isFinite(mn[0]) ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
}
var ARC_SEGMENTS = 16;
var CIRCLE_SEGMENTS = 24;
function buildGeometry(dxf, opts = {}) {
  const res = {
    groups: /* @__PURE__ */ new Map(),
    entityCounts: {},
    acis: [],
    ignored2d: 0,
    skippedHiddenLayers: 0,
    meshWithSubdivision: 0,
    missingBlocks: [],
    recursionCut: 0
  };
  const acisMap = /* @__PURE__ */ new Map();
  const acisCount = /* @__PURE__ */ new Map();
  const missing = /* @__PURE__ */ new Set();
  const layerRgb = (name) => {
    const l = dxf.layers.get(name.toUpperCase());
    if (!l) return 16777215;
    if (l.trueColor !== void 0) return l.trueColor & 16777215;
    return aciToRgb(l.color);
  };
  const layerHidden = (name) => {
    const l = dxf.layers.get(name.toUpperCase());
    return !!l && (l.color < 0 || (l.flags & 1) === 1);
  };
  const matName = (handle) => handle ? dxf.materials.get(handle.toUpperCase())?.name : void 0;
  const special = (n) => (n ?? "").toUpperCase();
  const layerMaterial = (layer) => {
    const n = matName(dxf.layers.get(layer.toUpperCase())?.material);
    const u = special(n);
    return !n || u === "GLOBAL" || u === "BYLAYER" || u === "BYBLOCK" ? void 0 : n;
  };
  const resolveMaterial = (P, layer, ctx) => {
    const n = matName(str(P, 347) || void 0);
    const u = special(n);
    if (!n || u === "BYLAYER") return layerMaterial(layer);
    if (u === "BYBLOCK") return ctx.material;
    if (u === "GLOBAL") return void 0;
    return n;
  };
  let curMat;
  const groupFor = (layer, color) => {
    const material = curMat;
    const key = `${layer}\0${color}\0${material ?? ""}`;
    let g = res.groups.get(key);
    if (!g) {
      g = { layer, color, material, tris: [], ...opts.weldCell ? { weld: new Welder(opts.weldCell) } : {} };
      res.groups.set(key, g);
    }
    return g;
  };
  const emit = (g, M, flip, a, b, c) => {
    const A = apply(M, a), B = apply(M, b), C2 = apply(M, c);
    if (flip) addTri(g, A[0], A[1], A[2], C2[0], C2[1], C2[2], B[0], B[1], B[2]);
    else addTri(g, A[0], A[1], A[2], B[0], B[1], B[2], C2[0], C2[1], C2[2]);
  };
  const quad = (g, M, flip, a, b, c, d) => {
    emit(g, M, flip, a, b, c);
    emit(g, M, flip, a, c, d);
  };
  const visit = (e, M, ctx) => {
    const P = e.pairs;
    if (e.faces) res.entityCounts["3DFACE"] = (res.entityCounts["3DFACE"] ?? 0) + e.faces.count;
    else res.entityCounts[e.type] = (res.entityCounts[e.type] ?? 0) + 1;
    if (num(P, 67, 0) === 1) return;
    if (num(P, 60, 0) === 1) return;
    let layer = str(P, 8, "0");
    if (layer === "0" && ctx.depth > 0) layer = ctx.layer;
    if (layerHidden(layer)) {
      res.skippedHiddenLayers++;
      return;
    }
    const tc = P.find(([c]) => c === 420);
    const aci = num(P, 62, 256);
    let color;
    if (tc) color = parseInt(tc[1], 10) & 16777215;
    else if (aci === 0) color = ctx.color;
    else if (aci === 256) color = layerRgb(layer);
    else color = aciToRgb(aci);
    const material = resolveMaterial(P, layer, ctx);
    curMat = material;
    const flip = det3(M) < 0;
    const thickness = num(P, 39, 0);
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    if (ACIS_TYPES.has(e.type)) {
      acisCount.set(e.type, (acisCount.get(e.type) ?? 0) + 1);
      if (!acisMap.has(e.type)) acisMap.set(e.type, /* @__PURE__ */ new Set());
      acisMap.get(e.type).add(layer);
      return;
    }
    switch (e.type) {
      case "@FACES": {
        const g = groupFor(layer, color);
        const d = e.faces.data, n = e.faces.count;
        for (let f2 = 0; f2 < n; f2++) {
          const o = f2 * 12;
          const a = [d[o], d[o + 1], d[o + 2]], b = [d[o + 3], d[o + 4], d[o + 5]], c = [d[o + 6], d[o + 7], d[o + 8]], q = [d[o + 9], d[o + 10], d[o + 11]];
          if (same(c, q)) emit(g, M, flip, a, b, c);
          else quad(g, M, flip, a, b, c, q);
        }
        return;
      }
      case "3DFACE": {
        const p = pts(P, 4);
        const g = groupFor(layer, color);
        if (same(p[2], p[3])) emit(g, M, flip, p[0], p[1], p[2]);
        else quad(g, M, flip, p[0], p[1], p[2], p[3]);
        return;
      }
      case "SOLID":
      case "TRACE": {
        const p = pts(P, 4);
        const O = mul(M, ocsMatrix(ext));
        const g = groupFor(layer, color);
        const ring = same(p[2], p[3]) ? [p[0], p[1], p[2]] : [p[0], p[1], p[3], p[2]];
        if (thickness !== 0) prism(g, O, flip, ring, thickness, true);
        else fan(g, O, flip, ring);
        return;
      }
      case "POLYLINE":
        polyline(e, M, flip, layer, color);
        return;
      case "LWPOLYLINE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const elev = num(P, 38, 0);
        const verts = [];
        let cur = null;
        for (const [c, v] of P) {
          if (c === 10) {
            cur = [parseFloat(v), 0, 0];
            verts.push(cur);
          } else if (c === 20 && cur) cur[1] = parseFloat(v);
          else if (c === 42 && cur) cur[2] = parseFloat(v);
        }
        const ring = bulgeRing(verts, (num(P, 70, 0) & 1) === 1, elev);
        const O = mul(M, ocsMatrix(ext));
        walls(groupFor(layer, color), O, flip, ring.pts, ring.closed, thickness);
        return;
      }
      case "LINE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const p = pts(P, 2);
        const d = applyDir(identity(), ext).map((x) => x * thickness);
        const g = groupFor(layer, color);
        quad(g, M, flip, p[0], p[1], add(p[1], d), add(p[0], d));
        return;
      }
      case "CIRCLE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const c0 = pts(P, 1)[0];
        const r = num(P, 40, 0);
        const ring = [];
        for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
          const a = i / CIRCLE_SEGMENTS * Math.PI * 2;
          ring.push([c0[0] + r * Math.cos(a), c0[1] + r * Math.sin(a), c0[2]]);
        }
        prism(groupFor(layer, color), mul(M, ocsMatrix(ext)), flip, ring, thickness, true);
        return;
      }
      case "MESH":
        mesh(e, M, flip, groupFor(layer, color));
        return;
      case "INSERT":
        insert(e, M, { ...ctx, layer, color, material }, layer, color);
        return;
      default:
        if (ANNOTATION_TYPES.has(e.type) || e.type === "LINE" || e.type === "CIRCLE") res.ignored2d++;
        else res.ignored2d++;
    }
  };
  const polyline = (e, M, flip, layer, color) => {
    const P = e.pairs;
    const flags = num(P, 70, 0);
    const verts = e.children ?? [];
    const g = groupFor(layer, color);
    if (flags & 64) {
      const coords = [];
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if (vf & 128 && vf & 64) coords.push([num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      }
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if (vf & 128 && !(vf & 64)) {
          const idx = [71, 72, 73, 74].map((c) => Math.abs(num(v.pairs, c, 0))).filter((i) => i > 0);
          const poly = idx.map((i) => coords[i - 1]).filter(Boolean);
          if (poly.length >= 3) fan(g, M, flip, poly);
        }
      }
      return;
    }
    if (flags & 16) {
      const m = num(P, 71, 0), n = num(P, 72, 0);
      const grid = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      if (m < 2 || n < 2 || grid.length < m * n) return;
      const closedM = (flags & 1) === 1, closedN = (flags & 32) === 32;
      const at = (i, j) => grid[i % m * n + j % n];
      for (let i = 0; i < (closedM ? m : m - 1); i++)
        for (let j = 0; j < (closedN ? n : n - 1); j++)
          quad(g, M, flip, at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j));
      return;
    }
    if (flags & 8) {
      res.ignored2d++;
      return;
    }
    const thickness = num(P, 39, 0);
    if (thickness === 0) {
      res.ignored2d++;
      return;
    }
    const elev = num(P, 30, 0);
    const raw = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 42, 0)]);
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ring = bulgeRing(raw, (flags & 1) === 1, elev);
    walls(g, mul(M, ocsMatrix(ext)), flip, ring.pts, ring.closed, thickness);
  };
  const mesh = (e, M, flip, g) => {
    const P = e.pairs;
    if (num(P, 91, 0) > 0) res.meshWithSubdivision++;
    if (e.mesh) {
      const V = e.mesh.verts, L = e.mesh.list, nv = V.length / 3;
      for (let k = 0; k < L.length; ) {
        const n = L[k++];
        if (n <= 0) break;
        const poly = [];
        for (let j = 0; j < n && k + j < L.length; j++) {
          const vi = L[k + j];
          if (vi >= 0 && vi < nv) poly.push([V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]]);
        }
        k += n;
        if (poly.length >= 3) fan(g, M, flip, poly);
      }
      return;
    }
    let i = 0;
    const vCount = (() => {
      for (; i < P.length; i++) if (P[i][0] === 92) return parseInt(P[i++][1], 10);
      return 0;
    })();
    const vs = [];
    while (i < P.length && vs.length < vCount) {
      if (P[i][0] === 10) {
        vs.push([parseFloat(P[i][1]), parseFloat(P[i + 1]?.[1] ?? "0"), parseFloat(P[i + 2]?.[1] ?? "0")]);
        i += 3;
      } else i++;
    }
    for (; i < P.length; i++) if (P[i][0] === 93) {
      i++;
      break;
    }
    const list = [];
    for (; i < P.length && P[i][0] === 90; i++) list.push(parseInt(P[i][1], 10));
    for (let k = 0; k < list.length; ) {
      const n = list[k++];
      const poly = list.slice(k, k + n).map((j) => vs[j]).filter(Boolean);
      k += n;
      if (poly.length >= 3) fan(g, M, flip, poly);
    }
  };
  const insert = (e, M, ctx, layer, color) => {
    const P = e.pairs;
    const name = str(P, 2);
    const block = dxf.blocks.get(name.toUpperCase());
    if (!block) {
      missing.add(name);
      return;
    }
    if (ctx.depth > 32 || ctx.stack.includes(name.toUpperCase())) {
      res.recursionCut++;
      return;
    }
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ins = [num(P, 10, 0), num(P, 20, 0), num(P, 30, 0)];
    const sx = num(P, 41, 1), sy = num(P, 42, 1), sz = num(P, 43, 1);
    const rot = num(P, 50, 0) * Math.PI / 180;
    const cols = Math.max(1, num(P, 70, 1)), rows = Math.max(1, num(P, 71, 1));
    const cs = num(P, 44, 0), rs = num(P, 45, 0);
    const base = mul(M, ocsMatrix(ext));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let T = mul(base, translate(ins[0], ins[1], ins[2]));
        T = mul(T, rotZ(rot));
        T = mul(T, translate(c * cs, r * rs, 0));
        T = mul(T, scale(sx, sy, sz));
        T = mul(T, translate(-block.base[0], -block.base[1], -block.base[2]));
        const child = { layer, color, material: ctx.material, depth: ctx.depth + 1, stack: [...ctx.stack, name.toUpperCase()] };
        for (const be of block.entities) visit(be, T, child);
      }
  };
  const root = { layer: "0", color: 16777215, depth: 0, stack: [] };
  for (const e of dxf.entities) visit(e, identity(), root);
  res.acis = [...acisCount.entries()].map(([type, count2]) => ({ type, count: count2, layers: [...acisMap.get(type)] }));
  res.missingBlocks = [...missing];
  return res;
  function fan(g, M, flip, poly) {
    const p = dedupeRing(poly);
    if (p.length < 3) return;
    if (p.length === 3 || p.length === 4) {
      emit(g, M, flip, p[0], p[1], p[2]);
      if (p.length === 4) emit(g, M, flip, p[0], p[2], p[3]);
      return;
    }
    for (const [a, b, c] of earClip(p)) emit(g, M, flip, p[a], p[b], p[c]);
  }
  function walls(g, O, flip, ring, closed, h) {
    const n = ring.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      quad(g, O, flip, a, b, [b[0], b[1], b[2] + h], [a[0], a[1], a[2] + h]);
    }
  }
  function prism(g, O, flip, ring, h, caps) {
    walls(g, O, flip, ring, true, h);
    if (caps) {
      fan(g, O, !flip, ring);
      fan(g, O, flip, ring.map((p) => [p[0], p[1], p[2] + h]));
    }
  }
}
function pts(P, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([num(P, 10 + i, 0), num(P, 20 + i, 0), num(P, 30 + i, 0)]);
  return out;
}
function same(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9;
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function dedupeRing(p) {
  const out = [];
  for (const v of p) if (!out.length || !same(out[out.length - 1], v)) out.push(v);
  if (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  return out;
}
function bulgeRing(v, closed, elev) {
  const out = [];
  const n = v.length;
  for (let i = 0; i < n; i++) {
    const [x, y, bulge] = v[i];
    out.push([x, y, elev]);
    const isLast = i === n - 1;
    if (Math.abs(bulge) > 1e-9 && (!isLast || closed)) {
      const [x2, y2] = v[(i + 1) % n];
      const theta = 4 * Math.atan(bulge);
      const chord = Math.hypot(x2 - x, y2 - y);
      if (chord < 1e-12) continue;
      const r = chord / (2 * Math.sin(theta / 2));
      const mx = (x + x2) / 2, my = (y + y2) / 2;
      const d = r * Math.cos(theta / 2);
      const nx = -(y2 - y) / chord, ny = (x2 - x) / chord;
      const cx = mx + nx * d, cy = my + ny * d;
      const a0 = Math.atan2(y - cy, x - cx);
      const segs = Math.max(2, Math.ceil(ARC_SEGMENTS * Math.abs(theta) / Math.PI));
      for (let s = 1; s < segs; s++) {
        const a = a0 + theta * s / segs;
        out.push([cx + Math.abs(r) * Math.cos(a), cy + Math.abs(r) * Math.sin(a), elev]);
      }
    }
  }
  return { pts: out, closed };
}
function earClip(p) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const [u, w] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [2, 0];
  const sign = (az >= ax && az >= ay ? nz : ax >= ay ? nx : ny) >= 0 ? 1 : -1;
  const q = p.map((v) => [v[u], v[w]]);
  const idx = p.map((_, i) => i);
  const tris = [];
  const area2 = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * sign;
  const inside = (pt, a, b, c) => area2(a, b, pt) >= 0 && area2(b, c, pt) >= 0 && area2(c, a, pt) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 1e4) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      if (area2(q[i0], q[i1], q[i2]) <= 0) continue;
      let ok = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inside(q[j], q[i0], q[i1], q[i2])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      tris.push([i0, i1, i2]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  else for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
  return tris;
}

// src/core/simplify.ts
var DENSE = 40;
var MIN_TRIS = 300;
function surfaceArea(p) {
  const P = p.positions, I = p.indices;
  let s = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return s;
}
function clusterPart(p, cell) {
  const P = p.positions, I = p.indices, nv = P.length / 3;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    if (P[i] < x0) x0 = P[i];
    if (P[i + 1] < y0) y0 = P[i + 1];
    if (P[i + 2] < z0) z0 = P[i + 2];
    if (P[i] > x1) x1 = P[i];
    if (P[i + 1] > y1) y1 = P[i + 1];
  }
  const nx = Math.floor((x1 - x0) / cell) + 1, ny = Math.floor((y1 - y0) / cell) + 1;
  const rep = new Int32Array(nv);
  const cells = /* @__PURE__ */ new Map();
  for (let v = 0; v < nv; v++) {
    const k = (Math.floor((P[v * 3 + 2] - z0) / cell) * ny + Math.floor((P[v * 3 + 1] - y0) / cell)) * nx + Math.floor((P[v * 3] - x0) / cell);
    const r = cells.get(k);
    if (r === void 0) {
      cells.set(k, v);
      rep[v] = v;
    } else rep[v] = r;
  }
  const keep = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = rep[I[t]], b = rep[I[t + 1]], c = rep[I[t + 2]];
    if (a !== b && b !== c && a !== c) keep.push(t);
  }
  if (keep.length * 3 === I.length) return p;
  const map = new Int32Array(nv).fill(-1);
  let n = 0;
  const idx = new Uint32Array(keep.length * 3);
  for (let i = 0; i < keep.length; i++) for (let k = 0; k < 3; k++) {
    const v = I[keep[i] + k];
    if (map[v] < 0) map[v] = n++;
    idx[i * 3 + k] = map[v];
  }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let v = 0; v < nv; v++) {
    const m = map[v];
    if (m < 0) continue;
    const r = rep[v];
    pos[m * 3] = P[r * 3];
    pos[m * 3 + 1] = P[r * 3 + 1];
    pos[m * 3 + 2] = P[r * 3 + 2];
    nrm[m * 3] = p.normals[v * 3];
    nrm[m * 3 + 1] = p.normals[v * 3 + 1];
    nrm[m * 3 + 2] = p.normals[v * 3 + 2];
    uv[m * 2] = p.uvs[v * 2];
    uv[m * 2 + 1] = p.uvs[v * 2 + 1];
  }
  return { ...p, positions: pos, normals: nrm, uvs: uv, indices: idx };
}
var triangleCount = (parts) => parts.reduce((n, p) => n + p.indices.length / 3, 0);
function simplifyToBudget(parts, budget) {
  const before = triangleCount(parts);
  if (before <= budget) return { parts, before, after: before, cell: 0 };
  const info = parts.map((p) => {
    const tris = p.indices.length / 3;
    const a = tris > MIN_TRIS ? surfaceArea(p) : 0;
    return { tris, area: a, dense: tris > MIN_TRIS && tris / Math.max(a, 1e-6) > DENSE };
  });
  const fixed = info.reduce((n, x) => n + (x.dense ? 0 : x.tris), 0);
  const denseArea = info.reduce((n, x) => n + (x.dense ? x.area : 0), 0);
  if (!denseArea) return { parts, before, after: before, cell: 0 };
  const target = Math.max(budget - fixed, budget * 0.25);
  let cell = Math.min(0.15, Math.max(0.01, Math.sqrt(2 * denseArea / target)));
  let out = parts, after = before;
  for (let attempt = 0; attempt < 4; attempt++) {
    out = parts.map((p, i) => info[i].dense ? clusterPart(p, cell) : p);
    after = triangleCount(out);
    if (after <= budget * 1.1 || cell >= 0.15) break;
    cell = Math.min(0.15, cell * Math.sqrt(after / budget) * 1.1);
  }
  return { parts: out, before, after, cell };
}

// src/core/dxf/import.ts
var UNITS = {
  1: ["Zoll", 0.0254],
  2: ["Fu\xDF", 0.3048],
  4: ["Millimeter", 1e-3],
  5: ["Zentimeter", 0.01],
  6: ["Meter", 1],
  7: ["Kilometer", 1e3],
  10: ["Yard", 0.9144],
  14: ["Dezimeter", 0.1]
};
var UNIT_CHOICES = [
  ["Millimeter", 1e-3],
  ["Zentimeter", 0.01],
  ["Meter", 1],
  ["Zoll", 0.0254],
  ["Fu\xDF", 0.3048]
];
function plausibleMeters(extentM) {
  return extentM >= 2 && extentM <= 2e3;
}
function guessUnits(rawExtent) {
  let best = UNIT_CHOICES[2];
  let bestScore = Infinity;
  for (const u of [UNIT_CHOICES[0], UNIT_CHOICES[1], UNIT_CHOICES[2]]) {
    const m = rawExtent * u[1];
    const score = Math.abs(Math.log10(Math.max(m, 1e-9)) - Math.log10(30));
    if (score < bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}
function importDxf(input, opts = {}) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "Datei wird gelesen");
  const raw = readDxf(input, (f2) => progress(0.05 + 0.25 * f2, "Datei wird gelesen"));
  progress(0.3, "Geometrie wird rekonstruiert");
  let weldCell;
  if (estimateTriangles(raw) > LARGE_MODEL_TRIANGLES) {
    const code = num(raw.header.get("$INSUNITS") ?? [], 70, 0);
    const toM = opts.unitsToMeters ?? UNITS[code]?.[1] ?? guessUnits(roughExtent(raw))[1];
    weldCell = 0.01 / toM;
  }
  const built = buildGeometry(raw, { weldCell });
  progress(0.6, "Modell wird optimiert");
  return finalize(built, raw.header.get("$INSUNITS"), raw.version, opts, progress, raw.materials);
}
function finalize(b, insunitsPairs, version, opts, progress, rawMaterials = /* @__PURE__ */ new Map()) {
  const warnings = [];
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of b.groups.values()) {
    const arr = g.weld ? g.weld.pos.view() : g.tris;
    for (let i = 0; i < arr.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const v = arr[i + k];
        if (v < mn[k]) mn[k] = v;
        if (v > mx[k]) mx[k] = v;
      }
  }
  const hasGeo = Number.isFinite(mn[0]);
  const rawExtent = hasGeo ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
  const code = insunitsPairs ? num(insunitsPairs, 70, 0) : 0;
  let units;
  if (opts.unitsToMeters) {
    const n = UNIT_CHOICES.find((u) => u[1] === opts.unitsToMeters)?.[0] ?? "Benutzerdefiniert";
    units = { name: n, toMeters: opts.unitsToMeters, source: "user", rawExtent, plausible: plausibleMeters(rawExtent * opts.unitsToMeters) };
  } else if (UNITS[code]) {
    const [n, f2] = UNITS[code];
    units = { name: n, toMeters: f2, source: "header", rawExtent, plausible: plausibleMeters(rawExtent * f2) };
    if (hasGeo && !units.plausible) {
      const [gn] = guessUnits(rawExtent);
      warnings.push({
        code: "units-implausible",
        message: `Die Datei gibt \u201E${n}\u201C als Einheit an, dann w\xE4re das Geb\xE4ude ${fmtLen(rawExtent * f2)} gro\xDF. Vermutlich ist \u201E${gn}\u201C richtig \u2013 bitte pr\xFCfen.`
      });
    }
  } else {
    const [n, f2] = guessUnits(rawExtent);
    units = { name: n, toMeters: f2, source: "guess", rawExtent, plausible: plausibleMeters(rawExtent * f2) };
    if (hasGeo)
      warnings.push({
        code: "units-guessed",
        message: `Die Datei enth\xE4lt keine Einheit. ARCHVISTA hat \u201E${n}\u201C erkannt (Geb\xE4udegr\xF6\xDFe ${fmtLen(rawExtent * f2)}). Bei Bedarf mit einem Klick \xE4ndern.`
      });
  }
  const s = units.toMeters;
  const origin = hasGeo ? [(mn[0] + mx[0]) / 2 * s, mn[2] * s, -((mn[1] + mx[1]) / 2) * s] : [0, 0, 0];
  let removedDegenerate = 0, removedDuplicate = 0, flipped = 0, outward = 0;
  const meshes = [];
  const layerMap = /* @__PURE__ */ new Map();
  const bmin = [Infinity, Infinity, Infinity];
  const bmax = [-Infinity, -Infinity, -Infinity];
  let gi = 0;
  const groups = [...b.groups.values()];
  const welded = groups.filter((g) => g.weld);
  if (welded.length) {
    const parts = welded.map((g) => {
      const w = g.weld, P = w.pos.view();
      const positions = new Float32Array(P.length);
      for (let i = 0; i < P.length; i += 3) {
        positions[i] = P[i] * s - origin[0];
        positions[i + 1] = P[i + 2] * s - origin[1];
        positions[i + 2] = -P[i + 1] * s - origin[2];
      }
      removedDegenerate += w.dropped;
      const dd = dedupeTriangles(w.idx.view());
      removedDuplicate += dd.removed;
      const indices = dd.indices;
      g.weld = void 0;
      return { g, positions, normals: new Float32Array(positions.length), uvs: new Float32Array(positions.length / 3 * 2), indices };
    });
    const otherTris = groups.reduce((n, g) => n + (g.weld ? 0 : g.tris.length / 9), 0);
    const reduced = simplifyToBudget(parts, Math.max(IMPORT_BUDGET - otherTris, IMPORT_BUDGET / 4)).parts;
    for (const p of reduced) {
      if (!p.indices.length) continue;
      if (p.indices.length / 3 <= 15e5) {
        const r = orientConsistently(p.positions, p.indices);
        flipped += r.flipped;
        outward += r.outward;
      }
      const flat = flatten(p.positions, p.indices);
      for (let i = 0; i < flat.positions.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (flat.positions[i + k] < bmin[k]) bmin[k] = flat.positions[i + k];
          if (flat.positions[i + k] > bmax[k]) bmax[k] = flat.positions[i + k];
        }
      const g = p.g;
      meshes.push({ id: `m${gi++}`, layer: g.layer, color: g.color, ...g.material ? { material: g.material } : {}, positions: flat.positions, normals: flat.normals, indices: flat.indices, triangleCount: flat.indices.length / 3 });
      const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
      li.triangleCount += flat.indices.length / 3;
      layerMap.set(g.layer, li);
    }
    warnings.push({ code: "large-model", message: `Sehr gro\xDFes Modell: Feine Details (z. B. M\xF6bel) wurden beim Einlesen vereinfacht, damit es fl\xFCssig bleibt. W\xE4nde, B\xF6den und D\xE4cher bleiben exakt.` });
  }
  for (const g of groups) {
    if (g.tris.length === 0 && !g.weld) continue;
    progress(0.6 + 0.35 * gi / Math.max(1, groups.length), "Modell wird optimiert");
    const tri = g.tris;
    const pos = [];
    const idx = [];
    const weld = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new Set();
    const vid = (x, y, z) => {
      const X = x * s - origin[0], Y = z * s - origin[1], Z = -y * s - origin[2];
      const key = `${Math.round(X * 1e4)},${Math.round(Y * 1e4)},${Math.round(Z * 1e4)}`;
      let i = weld.get(key);
      if (i === void 0) {
        i = pos.length / 3;
        pos.push(X, Y, Z);
        weld.set(key, i);
      }
      return i;
    };
    for (let i = 0; i < tri.length; i += 9) {
      const a = vid(tri[i], tri[i + 1], tri[i + 2]);
      const bb = vid(tri[i + 3], tri[i + 4], tri[i + 5]);
      const c = vid(tri[i + 6], tri[i + 7], tri[i + 8]);
      if (a === bb || bb === c || a === c || triArea(pos, a, bb, c) < 1e-8) {
        removedDegenerate++;
        continue;
      }
      const key = [a, bb, c].sort((x, y) => x - y).join(",");
      if (seen.has(key)) {
        removedDuplicate++;
        continue;
      }
      seen.add(key);
      idx.push(a, bb, c);
    }
    if (!idx.length) continue;
    const r = orientConsistently(pos, idx);
    flipped += r.flipped;
    outward += r.outward;
    const split = splitByCrease(pos, idx, 35);
    const positions = split.positions;
    const indices = split.indices;
    for (let i = 0; i < positions.length; i += 3)
      for (let k = 0; k < 3; k++) {
        if (positions[i + k] < bmin[k]) bmin[k] = positions[i + k];
        if (positions[i + k] > bmax[k]) bmax[k] = positions[i + k];
      }
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...g.material ? { material: g.material } : {},
      positions,
      normals: split.normals,
      indices,
      triangleCount: indices.length / 3
    });
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  for (const a of b.acis) {
    warnings.push({
      code: "acis",
      message: `${a.count}\xD7 ${a.type} (ACIS-Volumenk\xF6rper) auf Layer ${a.layers.join(", ")} kann nicht gelesen werden. Diese Teile fehlen im Modell.`,
      detail: "acis-fix"
    });
  }
  if (b.meshWithSubdivision)
    warnings.push({ code: "mesh-subd", message: `${b.meshWithSubdivision} Netzobjekte sind gegl\xE4ttet (Gl\xE4ttungsstufe > 0). \xDCbernommen wird das ungegl\xE4ttete Grundnetz.` });
  if (b.missingBlocks.length)
    warnings.push({ code: "missing-block", message: `Fehlende Blockdefinitionen: ${b.missingBlocks.slice(0, 5).join(", ")}${b.missingBlocks.length > 5 ? " \u2026" : ""}` });
  if (b.skippedHiddenLayers)
    warnings.push({ code: "hidden-layers", message: `${b.skippedHiddenLayers} Objekte auf ausgeschalteten oder gefrorenen Layern wurden nicht \xFCbernommen.` });
  if (b.recursionCut)
    warnings.push({ code: "recursion", message: `${b.recursionCut} sich selbst enthaltende Blockeinf\xFCgungen wurden \xFCbersprungen.` });
  const triangles = meshes.reduce((n, m) => n + m.triangleCount, 0);
  const vertices = meshes.reduce((n, m) => n + m.positions.length / 3, 0);
  const ok = triangles > 0;
  if (!ok) {
    warnings.unshift({
      code: "no-3d",
      message: b.acis.length ? "Die Datei enth\xE4lt nur ACIS-Volumenk\xF6rper, die ohne AutoCAD nicht gelesen werden k\xF6nnen. Bitte die Korrektur-Anleitung befolgen." : "In der Datei wurde keine 3D-Geometrie gefunden (nur 2D-Linien, Texte oder Bema\xDFungen).",
      detail: b.acis.length ? "acis-fix" : void 0
    });
  }
  const usedNames = new Set(meshes.map((m) => m.material).filter(Boolean));
  const materials = [];
  for (const rm of rawMaterials.values()) {
    if (!usedNames.has(rm.name) || materials.some((x) => x.name === rm.name)) continue;
    const file = rm.diffuseMap?.split(/[\\/]/).pop()?.trim();
    materials.push({
      name: rm.name,
      ...rm.description ? { description: rm.description } : {},
      ...rm.diffuse !== void 0 ? { color: rm.diffuse } : {},
      ...file ? { map: file } : {},
      ...rm.mapScaleU ? { mapSize: rm.mapScaleU * units.toMeters } : {},
      ...rm.opacity !== void 0 && rm.opacity < 1 ? { opacity: rm.opacity } : {}
    });
  }
  progress(1, "Fertig");
  return {
    meshes,
    materials,
    layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
    units,
    origin,
    bbox: ok ? { min: bmin, max: bmax } : { min: [0, 0, 0], max: [0, 0, 0] },
    stats: {
      version,
      entityCounts: b.entityCounts,
      triangles,
      vertices,
      removedDegenerate,
      removedDuplicate,
      flippedForConsistency: flipped,
      closedShellsOutward: outward
    },
    warnings,
    ok
  };
}
function flatten(P, I) {
  const n = I.length / 3;
  const positions = new Float32Array(n * 9), normals = new Float32Array(n * 9), indices = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (let k = 0; k < 3; k++) {
      const src2 = k === 0 ? a : k === 1 ? b : c, o = t * 9 + k * 3;
      positions[o] = P[src2];
      positions[o + 1] = P[src2 + 1];
      positions[o + 2] = P[src2 + 2];
      normals[o] = nx;
      normals[o + 1] = ny;
      normals[o + 2] = nz;
      indices[t * 3 + k] = t * 3 + k;
    }
  }
  return { positions, normals, indices };
}
function fmtLen(m) {
  if (m >= 1e3) return `${(m / 1e3).toFixed(1)} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  return `${(m * 100).toFixed(1)} cm`;
}
function triArea(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}
function orientConsistently(pos, idx) {
  const n = idx.length / 3;
  const edges = /* @__PURE__ */ new Map();
  const nv = pos.length / 3;
  const ek = (a, b) => a < b ? a * nv + b : b * nv + a;
  for (let t = 0; t < n; t++)
    for (let k = 0; k < 3; k++) {
      const key = ek(idx[t * 3 + k], idx[t * 3 + (k + 1) % 3]);
      const l = edges.get(key);
      if (l) l.push(t);
      else edges.set(key, [t]);
    }
  const dirOf = (t, a, b) => {
    for (let k = 0; k < 3; k++) if (idx[t * 3 + k] === a && idx[t * 3 + (k + 1) % 3] === b) return 1;
    return -1;
  };
  const flip = (t) => {
    const x = idx[t * 3 + 1];
    idx[t * 3 + 1] = idx[t * 3 + 2];
    idx[t * 3 + 2] = x;
  };
  const comp = new Int32Array(n).fill(-1);
  let flipped = 0, outward = 0, cid = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const members = [s];
    comp[s] = cid;
    let closed = true;
    for (let qi = 0; qi < members.length; qi++) {
      const t = members[qi];
      for (let k = 0; k < 3; k++) {
        const a = idx[t * 3 + k], b = idx[t * 3 + (k + 1) % 3];
        const list = edges.get(ek(a, b));
        if (list.length > 2) continue;
        for (const u of list) {
          if (u === t || comp[u] !== -1) continue;
          if (dirOf(u, a, b) === 1) {
            flip(u);
            flipped++;
          }
          comp[u] = cid;
          members.push(u);
        }
      }
    }
    const cnt = /* @__PURE__ */ new Map();
    for (const t of members)
      for (let k = 0; k < 3; k++) {
        const key = ek(idx[t * 3 + k], idx[t * 3 + (k + 1) % 3]);
        cnt.set(key, (cnt.get(key) ?? 0) + 1);
      }
    for (const c of cnt.values()) if (c !== 2) {
      closed = false;
      break;
    }
    if (closed && members.length >= 4) {
      let vol = 0;
      for (const t of members) {
        const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
        vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
      }
      if (vol < 0) {
        for (const t of members) flip(t);
      }
      outward++;
    }
    cid++;
  }
  return { flipped, outward };
}
function splitByCrease(pos, idx, creaseDeg) {
  const nt = idx.length / 3;
  const fn = new Float64Array(nt * 3);
  const fa = new Float64Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[t * 3] = nx / l;
    fn[t * 3 + 1] = ny / l;
    fn[t * 3 + 2] = nz / l;
    fa[t] = l;
  }
  const cos = Math.cos(creaseDeg * Math.PI / 180);
  const nv = pos.length / 3;
  const inc = Array.from({ length: nv }, () => []);
  for (let i = 0; i < idx.length; i++) inc[idx[i]].push(i);
  const outP = [], outN = [];
  const outI = new Uint32Array(idx.length);
  for (let v = 0; v < nv; v++) {
    const clusters = [];
    for (const corner of inc[v]) {
      const t = corner / 3 | 0;
      const n = [fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]];
      let cl = clusters.find((c) => c.n[0] * n[0] + c.n[1] * n[1] + c.n[2] * n[2] > cos);
      if (!cl) {
        cl = { n, acc: [0, 0, 0], id: outP.length / 3 };
        clusters.push(cl);
        outP.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        outN.push(0, 0, 0);
      }
      cl.acc[0] += n[0] * fa[t];
      cl.acc[1] += n[1] * fa[t];
      cl.acc[2] += n[2] * fa[t];
      outI[corner] = cl.id;
    }
    for (const c of clusters) {
      const l = Math.hypot(...c.acc) || 1;
      outN[c.id * 3] = c.acc[0] / l;
      outN[c.id * 3 + 1] = c.acc[1] / l;
      outN[c.id * 3 + 2] = c.acc[2] / l;
    }
  }
  return { positions: new Float32Array(outP), normals: new Float32Array(outN), indices: outI };
}

// src/core/tds/import.ts
var C = {
  MAIN: 19789,
  EDITOR: 15677,
  OBJECT: 16384,
  HIDDEN: 16400,
  TRIMESH: 16640,
  VERTICES: 16656,
  FACES: 16672,
  FACE_MAT: 16688,
  MATERIAL: 45055,
  MAT_NAME: 40960,
  MAT_DIFFUSE: 40992,
  MAT_TRANSPARENCY: 41040,
  MAT_TEXMAP: 41472,
  MAP_NAME: 41728,
  COLOR_F: 16,
  COLOR_24: 17,
  LIN_COLOR_24: 18,
  LIN_COLOR_F: 19,
  PERCENT_I: 48,
  PERCENT_F: 49
};
var TdsFormatError = class extends Error {
};
function importTds(bytes, opts = {}) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "3DS-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 6 || dv.getUint16(0, true) !== C.MAIN) throw new TdsFormatError("Das ist keine g\xFCltige 3DS-Datei.");
  const chunk = (at, limit) => {
    if (at + 6 > limit) return null;
    const len = dv.getUint32(at + 2, true);
    if (len < 6 || at + len > limit) return null;
    return { id: dv.getUint16(at, true), start: at + 6, end: at + len };
  };
  const children = (c, from = c.start) => {
    const out = [];
    for (let p = from; p < c.end; ) {
      const k = chunk(p, c.end);
      if (!k) break;
      out.push(k);
      p = k.end;
    }
    return out;
  };
  const cstr = (at, limit) => {
    let e = at;
    while (e < limit && bytes[e] !== 0) e++;
    return [new TextDecoder("latin1").decode(bytes.subarray(at, e)), e + 1];
  };
  const color = (c) => {
    let best;
    for (const k of children(c)) {
      if (k.id === C.COLOR_24 || k.id === C.LIN_COLOR_24) best = bytes[k.start] << 16 | bytes[k.start + 1] << 8 | bytes[k.start + 2];
      else if (k.id === C.COLOR_F || k.id === C.LIN_COLOR_F) {
        const f2 = (i) => Math.max(0, Math.min(255, Math.round(dv.getFloat32(k.start + i * 4, true) * 255)));
        best = f2(0) << 16 | f2(1) << 8 | f2(2);
      }
      if (best !== void 0 && (k.id === C.COLOR_24 || k.id === C.COLOR_F)) break;
    }
    return best;
  };
  const percent = (c) => {
    for (const k of children(c)) {
      if (k.id === C.PERCENT_I) return dv.getInt16(k.start, true);
      if (k.id === C.PERCENT_F) return dv.getFloat32(k.start, true);
    }
    return void 0;
  };
  const root = chunk(0, bytes.length);
  if (!root) throw new TdsFormatError("Die 3DS-Datei ist besch\xE4digt.");
  const editor = children(root).find((k) => k.id === C.EDITOR);
  if (!editor) throw new TdsFormatError("Die 3DS-Datei enth\xE4lt keine 3D-Daten.");
  const materials = /* @__PURE__ */ new Map();
  const groups = /* @__PURE__ */ new Map();
  let objects = 0, hidden = 0, faces = 0;
  const editorItems = children(editor);
  for (const m of editorItems.filter((k) => k.id === C.MATERIAL)) {
    const rm = { handle: "", name: "" };
    for (const k of children(m)) {
      if (k.id === C.MAT_NAME) rm.name = cstr(k.start, k.end)[0];
      else if (k.id === C.MAT_DIFFUSE) {
        const c = color(k);
        if (c !== void 0) rm.diffuse = c;
      } else if (k.id === C.MAT_TRANSPARENCY) {
        const t = percent(k);
        if (t !== void 0 && t > 0) rm.opacity = Math.max(0, Math.min(1, 1 - t / 100));
      } else if (k.id === C.MAT_TEXMAP) {
        for (const s of children(k)) if (s.id === C.MAP_NAME) {
          const n = cstr(s.start, s.end)[0].trim();
          if (n) rm.diffuseMap = n;
        }
      }
    }
    if (!rm.name) continue;
    rm.handle = rm.name.toUpperCase();
    materials.set(rm.handle, rm);
  }
  const groupFor = (layer, mat) => {
    const rm = mat ? materials.get(mat.toUpperCase()) : void 0;
    const color2 = rm?.diffuse ?? 13421772;
    const key = `${layer}\0${mat ?? ""}`;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { layer, color: color2, material: rm ? rm.name : void 0, tris: [], ...weldCell ? { weld: new Welder(weldCell) } : {} });
    return g;
  };
  const objs = editorItems.filter((k) => k.id === C.OBJECT);
  let weldCell;
  {
    let total = 0;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const meshes = [];
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
          if (v < mn[k]) mn[k] = v;
          if (v > mx[k]) mx[k] = v;
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
    if (parts.some((k) => k.id === C.HIDDEN)) {
      hidden++;
      return;
    }
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
      const faceMat = new Array(nf).fill(void 0);
      for (const g of children(fc, faceEnd)) {
        if (g.id !== C.FACE_MAT) continue;
        const [mn, p] = cstr(g.start, g.end);
        const n = dv.getUint16(p, true);
        for (let i = 0; i < n; i++) {
          const f2 = dv.getUint16(p + 2 + i * 2, true);
          if (f2 < nf) faceMat[f2] = mn;
        }
      }
      const layer = name || `Objekt ${objects}`;
      for (let f2 = 0; f2 < nf; f2++) {
        const at = fc.start + 2 + f2 * 8;
        const a = dv.getUint16(at, true), b = dv.getUint16(at + 2, true), c = dv.getUint16(at + 4, true);
        if (a >= nv || b >= nv || c >= nv) continue;
        addTri(groupFor(layer, faceMat[f2]), V[a * 3], V[a * 3 + 1], V[a * 3 + 2], V[b * 3], V[b * 3 + 1], V[b * 3 + 2], V[c * 3], V[c * 3 + 1], V[c * 3 + 2]);
        faces++;
      }
    }
  });
  progress(0.55, "Modell wird optimiert");
  const built = {
    groups,
    entityCounts: { "3DS-Objekte": objects, "3DS-Dreiecke": faces },
    acis: [],
    ignored2d: 0,
    skippedHiddenLayers: hidden,
    meshWithSubdivision: 0,
    missingBlocks: [],
    recursionCut: 0
  };
  return finalize(built, void 0, "3DS", opts, progress, materials);
}

// src/core/materials.ts
var PRESETS = [
  { id: "plaster_white", label: { de: "Putz wei\xDF", en: "White plaster" }, color: "#d6d0c6", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "plaster_warm", label: { de: "Putz warm", en: "Warm plaster" }, color: "#e6dccd", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "concrete", label: { de: "Sichtbeton", en: "Exposed concrete" }, color: "#b8b5ae", roughness: 0.86, metalness: 0, texture: "concrete", scale: 3 },
  { id: "brick", label: { de: "Klinker", en: "Brick" }, color: "#9a5039", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.2 },
  { id: "oak", label: { de: "Eichenparkett", en: "Oak parquet" }, color: "#b98b5c", roughness: 0.5, metalness: 0, texture: "wood", scale: 2, clearcoat: 0.15 },
  { id: "dark_wood", label: { de: "Nussholz", en: "Walnut" }, color: "#6a4831", roughness: 0.55, metalness: 0, texture: "wood", scale: 1.5 },
  { id: "timber_cladding", label: { de: "Holzschalung", en: "Timber cladding" }, color: "#9d7550", roughness: 0.8, metalness: 0, texture: "planks", scale: 1.6 },
  { id: "stone_tiles", label: { de: "Natursteinplatten", en: "Stone tiles" }, color: "#cbc4b7", roughness: 0.62, metalness: 0, texture: "tiles", scale: 1.2 },
  { id: "terrace_stone", label: { de: "Terrassenplatten", en: "Paving stone" }, color: "#a49d90", roughness: 0.8, metalness: 0, texture: "tiles", scale: 1 },
  { id: "roof_clay", label: { de: "Tondachziegel", en: "Clay roof tiles" }, color: "#9c4a33", roughness: 0.75, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "roof_slate", label: { de: "Dach anthrazit", en: "Anthracite roof" }, color: "#3d4045", roughness: 0.7, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "metal_anthracite", label: { de: "Metall anthrazit", en: "Anthracite metal" }, color: "#2e3135", roughness: 0.42, metalness: 0.6, texture: "none", scale: 1 },
  { id: "steel", label: { de: "Edelstahl", en: "Stainless steel" }, color: "#a3a8ad", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "glass", label: { de: "Glas", en: "Glass" }, color: "#dfe9ee", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.92, ior: 1.5, opacity: 0.35 },
  { id: "grass", label: { de: "Rasen", en: "Lawn" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 },
  { id: "lacquer_white", label: { de: "Lack wei\xDF", en: "White lacquer" }, color: "#f1f0ee", roughness: 0.38, metalness: 0, texture: "none", scale: 1, clearcoat: 0.3 },
  { id: "natural_stone", label: { de: "Naturstein", en: "Natural stone" }, color: "#9e968a", roughness: 0.85, metalness: 0, texture: "stone", scale: 2 },
  // ——— v1.1: more materials (photo textures from Poly Haven, CC0) ———
  { id: "stucco", label: { de: "Edelputz wei\xDF", en: "White stucco" }, color: "#e9e5de", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "plaster_grey", label: { de: "Putz grau", en: "Grey plaster" }, color: "#a9a7a2", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "painted_concrete", label: { de: "Beton gestrichen", en: "Painted concrete" }, color: "#d9d7d2", roughness: 0.8, metalness: 0, texture: "concrete", scale: 2 },
  { id: "concrete_smooth", label: { de: "Beton glatt", en: "Smooth concrete" }, color: "#bdbab4", roughness: 0.75, metalness: 0, texture: "concrete", scale: 3 },
  { id: "concrete_floor", label: { de: "Betonboden geschliffen", en: "Polished concrete floor" }, color: "#a8a59f", roughness: 0.45, metalness: 0, texture: "concrete", scale: 3, clearcoat: 0.25 },
  { id: "white_brick", label: { de: "Ziegel wei\xDF", en: "White brick" }, color: "#e3ded6", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "dark_brick", label: { de: "Klinker dunkel", en: "Dark brick" }, color: "#4a3a33", roughness: 0.85, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "marble_white", label: { de: "Marmor wei\xDF", en: "White marble" }, color: "#ecebe8", roughness: 0.18, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.6 },
  { id: "marble_black", label: { de: "Marmor schwarz", en: "Black marble" }, color: "#2a2a2c", roughness: 0.15, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.7 },
  { id: "terrazzo", label: { de: "Terrazzo", en: "Terrazzo" }, color: "#d8d3cb", roughness: 0.3, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.4 },
  { id: "slate_floor", label: { de: "Schieferboden", en: "Slate floor" }, color: "#4b4d50", roughness: 0.6, metalness: 0, texture: "tiles", scale: 2 },
  { id: "granite_dark", label: { de: "Granit", en: "Granite" }, color: "#77736e", roughness: 0.35, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.3 },
  { id: "white_tiles", label: { de: "Fliesen wei\xDF", en: "White tiles" }, color: "#f2f1ee", roughness: 0.2, metalness: 0, texture: "tiles", scale: 1, clearcoat: 0.5 },
  { id: "sandstone", label: { de: "Sandstein", en: "Sandstone" }, color: "#c9b28c", roughness: 0.9, metalness: 0, texture: "stone", scale: 3 },
  { id: "herringbone", label: { de: "Fischgr\xE4tparkett", en: "Herringbone parquet" }, color: "#a87a4f", roughness: 0.5, metalness: 0, texture: "wood", scale: 1.5, clearcoat: 0.2 },
  { id: "light_oak", label: { de: "Eiche hell", en: "Light oak" }, color: "#cfae84", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "smoked_oak", label: { de: "Eiche ger\xE4uchert", en: "Smoked oak" }, color: "#6e5440", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "walnut", label: { de: "Walnuss", en: "Walnut veneer" }, color: "#7a573b", roughness: 0.45, metalness: 0, texture: "wood", scale: 2, clearcoat: 0.2 },
  { id: "larch_cladding", label: { de: "L\xE4rchenschalung", en: "Larch cladding" }, color: "#a7835c", roughness: 0.8, metalness: 0, texture: "planks", scale: 2 },
  { id: "corten", label: { de: "Cortenstahl", en: "Corten steel" }, color: "#8a4b2a", roughness: 0.75, metalness: 0.3, texture: "concrete", scale: 2 },
  { id: "metal_sheet", label: { de: "Trapezblech", en: "Profiled metal sheet" }, color: "#9aa0a6", roughness: 0.4, metalness: 0.8, texture: "planks", scale: 1.5 },
  { id: "gravel", label: { de: "Kies", en: "Gravel" }, color: "#9b958b", roughness: 0.95, metalness: 0, texture: "stone", scale: 1.5 },
  { id: "aluminium", label: { de: "Aluminium geb\xFCrstet", en: "Brushed aluminium" }, color: "#c6cacd", roughness: 0.32, metalness: 1, texture: "none", scale: 1 },
  { id: "copper", label: { de: "Kupfer", en: "Copper" }, color: "#b8733f", roughness: 0.35, metalness: 1, texture: "none", scale: 1 },
  { id: "brass", label: { de: "Messing", en: "Brass" }, color: "#c9a24f", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "black_steel", label: { de: "Stahl schwarz", en: "Black steel" }, color: "#1e2023", roughness: 0.5, metalness: 0.8, texture: "none", scale: 1 },
  { id: "glass_frosted", label: { de: "Milchglas", en: "Frosted glass" }, color: "#eef2f3", roughness: 0.45, metalness: 0, texture: "none", scale: 1, transmission: 0.8, ior: 1.5, opacity: 0.7 },
  { id: "glass_tinted", label: { de: "Glas get\xF6nt", en: "Tinted glass" }, color: "#5f7377", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.85, ior: 1.5, opacity: 0.5 },
  { id: "paint_matte", label: { de: "Farbe matt (frei w\xE4hlbar)", en: "Matte paint (any colour)" }, color: "#e8e4dd", roughness: 0.9, metalness: 0, texture: "none", scale: 1, paintable: true },
  { id: "green_roof", label: { de: "Gr\xFCndach", en: "Green roof" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 }
];
var GROUPS = {
  plaster_white: "wall",
  plaster_warm: "wall",
  stucco: "wall",
  plaster_grey: "wall",
  paint_matte: "wall",
  lacquer_white: "wall",
  brick: "stone",
  white_brick: "stone",
  dark_brick: "stone",
  concrete: "stone",
  concrete_smooth: "stone",
  painted_concrete: "stone",
  natural_stone: "stone",
  sandstone: "stone",
  marble_white: "stone",
  marble_black: "stone",
  oak: "floor",
  herringbone: "floor",
  terrazzo: "floor",
  slate_floor: "floor",
  granite_dark: "floor",
  white_tiles: "floor",
  stone_tiles: "floor",
  concrete_floor: "floor",
  light_oak: "wood",
  smoked_oak: "wood",
  walnut: "wood",
  dark_wood: "wood",
  timber_cladding: "wood",
  larch_cladding: "wood",
  roof_clay: "roof",
  roof_slate: "roof",
  green_roof: "roof",
  metal_sheet: "roof",
  metal_anthracite: "metal",
  steel: "metal",
  aluminium: "metal",
  copper: "metal",
  brass: "metal",
  black_steel: "metal",
  corten: "metal",
  glass: "glass",
  glass_frosted: "glass",
  glass_tinted: "glass",
  grass: "outdoor",
  terrace_stone: "outdoor",
  gravel: "outdoor"
};
for (const p of PRESETS) p.group = GROUPS[p.id] ?? "wall";
for (const id of ["plaster_white", "plaster_warm", "stucco", "plaster_grey", "lacquer_white", "painted_concrete"]) PRESETS.find((p) => p.id === id).paintable = true;
var BASE2 = new Map(PRESETS.map((p) => [p.id, p]));
function hsl(rgb) {
  const r = (rgb >> 16 & 255) / 255, g = (rgb >> 8 & 255) / 255, b = (rgb & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
var KW = {
  concrete: /(beton|concrete|stb\b|sichtbeton)/i,
  brick: /(ziegel|brick|klinker|mauerwerk)/i,
  wood: /(holz|wood|timber|parkett|dielen|eiche|oak|larch|l[äa]rche)/i,
  tile: /(fliese|tile|stein|stone|granit|marmor|marble)/i,
  interior: /(innen|interior|int\b)/i,
  screed: /(estrich|screed)/i
};
function assignMaterial(layer, category, role, color) {
  const c = hsl(color);
  const reddish = c.s > 0.35 && (c.h < 30 || c.h > 340) && c.l < 0.75;
  const brownish = c.s > 0.25 && c.h >= 15 && c.h <= 45 && c.l < 0.7;
  switch (category) {
    case "glass":
      return { presetId: "glass", reason: "layer" };
    case "window":
      return { presetId: "metal_anthracite", reason: "layer" };
    case "door":
      return { presetId: "dark_wood", reason: "layer" };
    case "railing":
      return { presetId: "steel", reason: "layer" };
    case "terrain":
      return { presetId: "grass", reason: "layer" };
    case "terrace":
      return { presetId: role === "top" || role === "all" ? "terrace_stone" : "concrete", reason: "layer" };
    case "furniture":
      return { presetId: "lacquer_white", reason: "layer" };
    case "column":
      return { presetId: KW.wood.test(layer) ? "dark_wood" : "concrete", reason: "layer" };
    case "stair":
      return { presetId: KW.concrete.test(layer) ? "concrete" : KW.tile.test(layer) ? "stone_tiles" : "oak", reason: "layer" };
    case "roof":
      return { presetId: role === "under" ? "timber_cladding" : reddish ? "roof_clay" : "roof_slate", reason: reddish ? "colour" : "layer" };
    case "wall":
      if (KW.brick.test(layer)) return { presetId: "brick", reason: "layer" };
      if (KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      if (KW.wood.test(layer)) return { presetId: "timber_cladding", reason: "layer" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "timber_cladding", reason: "colour" };
      return { presetId: KW.interior.test(layer) ? "plaster_warm" : "plaster_white", reason: "default" };
    case "floor":
    case "ceiling":
      if (role === "under") return { presetId: "plaster_white", reason: "geometry" };
      if (role === "side") return { presetId: "plaster_white", reason: "geometry" };
      if (KW.tile.test(layer)) return { presetId: "stone_tiles", reason: "layer" };
      if (KW.screed.test(layer) || KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      return { presetId: "oak", reason: "default" };
    default: {
      if (role === "top") return { presetId: "stone_tiles", reason: "geometry" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "dark_wood", reason: "colour" };
      if (c.l < 0.3) return { presetId: "metal_anthracite", reason: "colour" };
      return { presetId: "plaster_white", reason: "default" };
    }
  }
}
var hex = (rgb) => "#" + rgb.toString(16).padStart(6, "0");
var CAD_RULES = [
  [/(glas|glass|verglas|glazing|window\s*pane)/, (t) => /(milch|frost|satin|matt|opal|translucent|safety)/.test(t) ? "glass_frosted" : /(get[öo]nt|tint|grau|grey|gray|bronze|smoke)/.test(t) ? "glass_tinted" : "glass"],
  [/(gr[üu]ndach|green\s*roof|sedum)/, "green_roof"],
  [/(rasen|gras|grass|lawn|turf)/, "grass"],
  [/(kies|schotter|gravel|split\b)/, "gravel"],
  [/(dachziegel|roof(ing)?\s*tile|clay\s*tile|spanish\s*tile|tile\s*spanish|biber|tondach|ziegeldach|terracotta\s*roof)/, "roof_clay"],
  [/(schiefer|slate|shingle|schindel|eternit)/, (_t, cat) => cat === "floor" ? "slate_floor" : "roof_slate"],
  [/(klinker|brick|ziegel|backstein|mauerwerk|masonry)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_brick" : /(dunkel|dark|schwarz|black|anthrazit)/.test(t) ? "dark_brick" : "brick"],
  [/(terrazzo)/, "terrazzo"],
  [/(marmor|marble)/, (t) => /(schwarz|black|nero|dunkel|dark)/.test(t) ? "marble_black" : "marble_white"],
  [/(granit|granite)/, "granite_dark"],
  [/(sandstein|sandstone)/, "sandstone"],
  [/(beton|concrete|zement|cement|estrich|screed)/, (t, cat) => /(estrich|screed|geschliffen|polished|floor|boden)/.test(t) || cat === "floor" ? "concrete_floor" : /(glatt|smooth|sicht|fair)/.test(t) ? "concrete_smooth" : /(gestrichen|painted)/.test(t) ? "painted_concrete" : "concrete"],
  [/(fliese|tile|keramik|ceramic|porzellan|porcelain|feinstein)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_tiles" : "stone_tiles"],
  [/(fischgr[äa]t|herringbone)/, "herringbone"],
  [/(nuss|walnut)/, "walnut"],
  [/(r[äa]ucher|smoked)/, "smoked_oak"],
  [/(l[äa]rche|larch|schalung|cladding|siding|boarding)/, "larch_cladding"],
  [/(mahagoni|mahogany|kirsch|cherry|teak|wenge|dunkles?\s*holz|dark\s*wood)/, "dark_wood"],
  [/(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine|hell|light)/, (t) => /(holz|wood|timber|parkett|parquet|dielen|floor)/.test(t) || /(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine)/.test(t) ? "light_oak" : ""],
  [/(eiche|oak|parkett|parquet|dielen|floorboard|holz|wood|timber|plywood|sperrholz)/, (_t, cat) => cat === "wall" ? "timber_cladding" : cat === "door" ? "dark_wood" : "oak"],
  [/(corten|cor-ten|rost|rust|weathering)/, "corten"],
  [/(kupfer|copper)/, "copper"],
  [/(messing|brass|bronze)/, "brass"],
  [/(alu)/, "aluminium"],
  [/(schwarz|black).*(stahl|steel|metal)|(stahl|steel|metal).*(schwarz|black)/, "black_steel"],
  [/(edelstahl|stainless|inox|chrom|chrome|stahl|steel)/, "steel"],
  [/(anthrazit|anthracite|zink|zinc)/, "metal_anthracite"],
  [/(blech|sheet|trapez|corrugated|wellblech)/, "metal_sheet"],
  [/(metall|metal)/, "aluminium"],
  [/(naturstein|natural\s*stone|bruchstein|stein|stone|rock)/, "natural_stone"],
  [/(edelputz|stucco|reibputz)/, "stucco"],
  [/(putz|plaster|render|verputz|gips|gypsum|drywall|trockenbau)/, (t) => /(grau|grey|gray)/.test(t) ? "plaster_grey" : /(warm|beige|sand|creme|cream)/.test(t) ? "plaster_warm" : "plaster_white"],
  [/(lack|lacquer|gloss|hochglanz)/, "lacquer_white"],
  [/(farbe|paint|anstrich)/, "paint_matte"]
];
function assignFromCad(cad, category) {
  const text = `${cad.name} ${cad.description ?? ""} ${cad.map ?? ""}`.toLowerCase().replace(/[_\-.]+/g, " ");
  let id = "";
  for (const [re, to] of CAD_RULES) {
    if (!re.test(text)) continue;
    id = typeof to === "string" ? to : to(text, category);
    if (id.startsWith("glass") && cad.opaque) {
      id = "";
      continue;
    }
    if (id) break;
  }
  if (!id && cad.opacity !== void 0 && cad.opacity < 0.8) id = "glass";
  if (!id && cad.color === void 0) return null;
  if (!id) id = "paint_matte";
  const pr = BASE2.get(id);
  if (!pr) return null;
  const color = cad.color !== void 0 && pr.paintable ? hex(cad.color) : void 0;
  return { presetId: id, reason: "cad", ...color ? { color } : {} };
}
function textureKey(file) {
  const t = file.normalize("NFC").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  const dot = t.lastIndexOf(".");
  const stem = (dot > 0 ? t.slice(0, dot) : t).replace(/[^a-z0-9-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "textur";
  const ext = dot > 0 ? t.slice(dot + 1).replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  return ext ? `${stem}.${ext}` : stem;
}
function boxUVs(positions, normals) {
  const uv = new Float32Array(positions.length / 3 * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const ax = Math.abs(normals[i]), ay = Math.abs(normals[i + 1]), az = Math.abs(normals[i + 2]);
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (ay >= ax && ay >= az) {
      uv[j] = x;
      uv[j + 1] = z;
    } else if (ax >= az) {
      uv[j] = z;
      uv[j + 1] = y;
    } else {
      uv[j] = x;
      uv[j + 1] = y;
    }
  }
  return uv;
}

// src/core/gltf/import.ts
var GltfFormatError = class extends Error {
};
var ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul2(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0],
    2 * (xy + wz) * s[0],
    2 * (xz - wy) * s[0],
    0,
    2 * (xy - wz) * s[1],
    (1 - 2 * (xx + zz)) * s[1],
    2 * (yz + wx) * s[1],
    0,
    2 * (xz + wy) * s[2],
    2 * (yz - wx) * s[2],
    (1 - 2 * (xx + yy)) * s[2],
    0,
    t[0],
    t[1],
    t[2],
    1
  ];
}
function normalMat(m) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f2 = m[9], g = m[2], h = m[6], i = m[10];
  const n = [e * i - f2 * h, -(d * i - f2 * g), d * h - e * g, -(b * i - c * h), a * i - c * g, -(a * h - b * g), b * f2 - c * e, -(a * f2 - c * d), a * e - b * d];
  const det = a * n[0] + b * n[1] + c * n[2];
  return { n, flip: det < 0 };
}
var lin2srgb = (v) => Math.round(255 * Math.max(0, Math.min(1, v <= 31308e-7 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));
function smoothNormals(P, I, out) {
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      out[v] += nx;
      out[v + 1] += ny;
      out[v + 2] += nz;
    }
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
    out[i] /= l;
    out[i + 1] /= l;
    out[i + 2] /= l;
  }
}
function importGltf(bytes, opts = {}, resources = []) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "glTF-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let json, bin = null;
  if (bytes.length >= 12 && dv.getUint32(0, true) === 1179937895) {
    let p = 12;
    while (p + 8 <= bytes.length) {
      const len = dv.getUint32(p, true), type = dv.getUint32(p + 4, true);
      const data = bytes.subarray(p + 8, p + 8 + len);
      if (type === 1313821514) json = JSON.parse(new TextDecoder().decode(data));
      else if (type === 5130562 && !bin) bin = data;
      p += 8 + len + (4 - len % 4) % 4;
    }
    if (!json) throw new GltfFormatError("Die GLB-Datei ist besch\xE4digt.");
  } else {
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new GltfFormatError("Das ist keine g\xFCltige glTF- oder GLB-Datei.");
    }
  }
  if (!json.asset || String(json.asset.version ?? "").split(".")[0] !== "2") throw new GltfFormatError("Nur glTF 2.0 wird unterst\xFCtzt. Bitte das Modell als glTF 2.0 / GLB exportieren.");
  const req = json.extensionsRequired ?? [];
  if (req.some((x) => /draco|meshopt/i.test(x))) throw new GltfFormatError("Diese GLB-Datei ist komprimiert (Draco/Meshopt). Bitte beim Export die Kompression ausschalten und erneut versuchen.");
  const byName = new Map(resources.map((r) => [r.name.toLowerCase(), r.data]));
  const fromUri = (uri) => {
    if (uri.startsWith("data:")) {
      const comma = uri.indexOf(",");
      const meta = uri.slice(5, comma), body = uri.slice(comma + 1);
      if (/;base64/i.test(meta)) {
        const s2 = atob(body);
        const out = new Uint8Array(s2.length);
        for (let i = 0; i < s2.length; i++) out[i] = s2.charCodeAt(i);
        return out;
      }
      return new TextEncoder().encode(decodeURIComponent(body));
    }
    const n = decodeURIComponent(uri).split(/[\\/]/).pop().toLowerCase();
    return byName.get(n) ?? null;
  };
  const missing = [];
  const buffers = (json.buffers ?? []).map((b, i) => {
    if (b.uri === void 0) return i === 0 ? bin : null;
    const d = fromUri(b.uri);
    if (!d) missing.push(decodeURIComponent(b.uri).split(/[\\/]/).pop() ?? String(b.uri));
    return d;
  });
  if (missing.length) throw new GltfFormatError(`Zur glTF-Datei fehlt ${missing.join(", ")}. Bitte als .glb exportieren \u2013 oder die .gltf zusammen mit allen Dateien als ZIP importieren.`);
  const view = (i) => {
    const v = json.bufferViews[i];
    const b = buffers[v.buffer];
    if (!b) throw new GltfFormatError("Die glTF-Datei ist unvollst\xE4ndig.");
    return { data: b.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength), stride: v.byteStride };
  };
  const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const accessor = (i) => {
    const a = json.accessors[i];
    const n = NUM[a.type], cs = SIZE[a.componentType];
    const out = new Float64Array(a.count * n);
    if (a.bufferView !== void 0) {
      const { data, stride } = view(a.bufferView);
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const st = stride || n * cs, off = a.byteOffset ?? 0;
      const rd = (p) => {
        switch (a.componentType) {
          case 5126:
            return d.getFloat32(p, true);
          case 5125:
            return d.getUint32(p, true);
          case 5123: {
            const v = d.getUint16(p, true);
            return a.normalized ? v / 65535 : v;
          }
          case 5122: {
            const v = d.getInt16(p, true);
            return a.normalized ? Math.max(v / 32767, -1) : v;
          }
          case 5121: {
            const v = d.getUint8(p);
            return a.normalized ? v / 255 : v;
          }
          default: {
            const v = d.getInt8(p);
            return a.normalized ? Math.max(v / 127, -1) : v;
          }
        }
      };
      for (let e = 0; e < a.count; e++) for (let k = 0; k < n; k++) out[e * n + k] = rd(off + e * st + k * cs);
    }
    if (a.sparse) {
      const s2 = a.sparse;
      const iv = view(s2.indices.bufferView), vv = view(s2.values.bufferView);
      const id = new DataView(iv.data.buffer, iv.data.byteOffset + (s2.indices.byteOffset ?? 0));
      const vd = new DataView(vv.data.buffer, vv.data.byteOffset + (s2.values.byteOffset ?? 0));
      const ics = SIZE[s2.indices.componentType];
      for (let e = 0; e < s2.count; e++) {
        const idx = ics === 4 ? id.getUint32(e * 4, true) : ics === 2 ? id.getUint16(e * 2, true) : id.getUint8(e);
        for (let k = 0; k < n; k++) out[idx * n + k] = a.componentType === 5126 ? vd.getFloat32((e * n + k) * 4, true) : vd.getUint16((e * n + k) * 2, true);
      }
    }
    return out;
  };
  const images = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Map();
  const matInfo = /* @__PURE__ */ new Map();
  const imageOf = (texIndex) => {
    const t = json.textures?.[texIndex];
    const src2 = t?.source ?? t?.extensions?.EXT_texture_webp?.source;
    const img = src2 !== void 0 ? json.images?.[src2] : void 0;
    if (!img) return null;
    const data = img.bufferView !== void 0 ? view(img.bufferView).data.slice() : img.uri ? fromUri(img.uri) : null;
    if (!data) return null;
    const mime = img.mimeType ?? (/\.png$/i.test(img.uri ?? "") ? "image/png" : /\.webp$/i.test(img.uri ?? "") ? "image/webp" : "image/jpeg");
    return { data, ext: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg" };
  };
  const material = (mi) => {
    if (mi === void 0) return { color: 14540253, textured: false, glass: false };
    let info = matInfo.get(mi);
    if (info) return info;
    const m = json.materials?.[mi] ?? {};
    const pbr = m.pbrMetallicRoughness ?? {};
    const f2 = pbr.baseColorFactor ?? [1, 1, 1, 1];
    const color = lin2srgb(f2[0]) << 16 | lin2srgb(f2[1]) << 8 | lin2srgb(f2[2]);
    const name = String(m.name ?? "").trim() || `Material ${mi + 1}`;
    const tex = pbr.baseColorTexture?.index !== void 0 ? imageOf(pbr.baseColorTexture.index) : null;
    const glass = !!m.extensions?.KHR_materials_transmission?.transmissionFactor;
    if (!used.has(name)) {
      const cm = { name, color };
      if (tex) {
        const file = textureKey(`${name}.${tex.ext}`);
        cm.map = file;
        cm.sourceUv = true;
        images.set(file, tex.data);
        if (f2[0] < 0.97 || f2[1] < 0.97 || f2[2] < 0.97) cm.colorize = true;
      }
      const alpha = m.alphaMode === "BLEND" ? f2[3] ?? 1 : 1;
      if (glass) cm.opacity = 0.3;
      else if (alpha < 0.98) cm.opacity = alpha;
      else cm.opaque = true;
      used.set(name, cm);
    }
    info = { name, color, textured: !!tex, glass };
    matInfo.set(mi, info);
    return info;
  };
  const warnings = [];
  const s = opts.unitsToMeters ?? 1;
  const groups = /* @__PURE__ */ new Map();
  let prims = 0, skipped = 0;
  const sceneIdx = json.scene ?? 0;
  const roots = json.scenes?.[sceneIdx]?.nodes ?? (json.nodes ?? []).map((_, i) => i);
  const primTris = (p) => {
    const n = p.indices !== void 0 ? json.accessors[p.indices].count : json.accessors[p.attributes?.POSITION]?.count ?? 0;
    return (p.mode ?? 4) === 4 ? n / 3 : Math.max(0, n - 2);
  };
  let worldTris = 0;
  const count2 = (ni, depth) => {
    const node = json.nodes?.[ni];
    if (!node || depth > 64) return;
    if (node.mesh !== void 0) for (const p of json.meshes[node.mesh]?.primitives ?? []) worldTris += (p.mode ?? 4) >= 4 ? primTris(p) : 0;
    for (const c of node.children ?? []) count2(c, depth + 1);
  };
  for (const r of roots) count2(r, 0);
  const large = worldTris > LARGE_MODEL_TRIANGLES;
  let keep = large ? IMPORT_BUDGET / worldTris : 1;
  const cache = /* @__PURE__ */ new Map();
  const readPrim = (p, textured) => {
    const P = accessor(p.attributes.POSITION);
    const N = p.attributes.NORMAL !== void 0 ? accessor(p.attributes.NORMAL) : null;
    const T = textured && p.attributes.TEXCOORD_0 !== void 0 ? accessor(p.attributes.TEXCOORD_0) : null;
    const vc = P.length / 3;
    const mode = p.mode ?? 4;
    let I = p.indices !== void 0 ? accessor(p.indices) : Uint32Array.from({ length: vc }, (_, i) => i);
    if (mode === 5 || mode === 6) {
      const t = new GrowU32(Math.max(3, (I.length - 2) * 3));
      for (let i = 2; i < I.length; i++) {
        if (mode === 5) {
          if (i % 2) {
            t.push(I[i - 1]);
            t.push(I[i - 2]);
            t.push(I[i]);
          } else {
            t.push(I[i - 2]);
            t.push(I[i - 1]);
            t.push(I[i]);
          }
        } else {
          t.push(I[0]);
          t.push(I[i - 1]);
          t.push(I[i]);
        }
      }
      I = t.take();
    }
    return { P, N, T, I, vc };
  };
  const prim = (mi, pi, p, textured, w) => {
    if (!large) return readPrim(p, textured);
    const key = `${mi}/${pi}`;
    let c = cache.get(key);
    if (c) return c;
    const r = readPrim(p, textured);
    const nI = r.I.length - r.I.length % 3;
    const indices = new Uint32Array(nI);
    for (let i = 0; i < nI; i++) indices[i] = r.I[i] < r.vc ? r.I[i] : 0;
    const part = { positions: Float32Array.from(r.P), normals: r.N ? Float32Array.from(r.N) : new Float32Array(r.P.length), uvs: r.T ? Float32Array.from(r.T) : new Float32Array(r.vc * 2), indices };
    if (!r.N) smoothNormals(part.positions, indices, part.normals);
    const sc = Math.cbrt(Math.abs(w[0] * (w[5] * w[10] - w[9] * w[6]) - w[4] * (w[1] * w[10] - w[9] * w[2]) + w[8] * (w[1] * w[6] - w[5] * w[2]))) * s || 1;
    const tris = nI / 3, a = surfaceArea(part) * sc * sc;
    let out = part;
    if (tris > 300 && tris / Math.max(a, 1e-6) > 40) {
      const cell = Math.min(0.15, Math.max(5e-3, Math.sqrt(2 * a / Math.max(1, tris * keep))));
      out = clusterPart(part, cell / sc);
    }
    c = { P: out.positions, N: out.normals, T: r.T ? out.uvs : null, I: out.indices, vc: out.positions.length / 3 };
    cache.set(key, c);
    return c;
  };
  const visit = (ni, parent, layer, depth) => {
    const node = json.nodes?.[ni];
    if (!node || depth > 64) return;
    const local = node.matrix ? node.matrix : trs(node.translation, node.rotation, node.scale);
    const world = mul2(parent, local);
    const name = String(node.name ?? "").trim();
    const lay = layer || name;
    if (node.mesh !== void 0) addMesh(node.mesh, world, lay || String(json.meshes[node.mesh]?.name ?? "").trim() || "Modell");
    for (const c of node.children ?? []) visit(c, world, depth === 0 && !name ? "" : lay, depth + 1);
  };
  let placed = 0;
  let counting = false;
  const need = /* @__PURE__ */ new Map();
  const addMesh = (mi, w, layer) => {
    const mesh = json.meshes[mi];
    const { n: nm, flip } = normalMat(w);
    (mesh?.primitives ?? []).forEach((p, pi) => {
      const mode = p.mode ?? 4;
      if (mode < 4 || p.attributes?.POSITION === void 0) {
        if (!counting) skipped++;
        return;
      }
      const info = material(p.material);
      const { P, N, T, I, vc } = prim(mi, pi, p, info.textured, w);
      const key = `${layer}\0${info.name ?? ""}\0${info.color}`;
      if (counting) {
        const c = need.get(key) ?? { v: 0, i: 0 };
        c.v += N ? vc : I.length;
        c.i += I.length;
        need.set(key, c);
        return;
      }
      prims++;
      if (++placed % 500 === 0) progress(0.1 + 0.45 * Math.min(1, placed / Math.max(1, json.nodes.length)), "Objekte werden gelesen");
      let g = groups.get(key);
      if (!g) {
        const c = need.get(key);
        groups.set(key, g = { layer, material: info.name, color: info.color, textured: info.textured, pos: new GrowF32(c ? c.v * 3 : 1024), nrm: new GrowF32(c ? c.v * 3 : 1024), uv: new GrowF32(c ? c.v * 2 : 1024), idx: new GrowU32(c ? c.i : 1024) });
      }
      if (info.textured && !g.textured) g.textured = true;
      const put = (vi, fn) => {
        const x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
        const wx = w[0] * x + w[4] * y + w[8] * z + w[12], wy = w[1] * x + w[5] * y + w[9] * z + w[13], wz = w[2] * x + w[6] * y + w[10] * z + w[14];
        g.pos.push(wx * s);
        g.pos.push(wy * s);
        g.pos.push(wz * s);
        let nx, ny, nz;
        if (fn) [nx, ny, nz] = fn;
        else {
          const a = N[vi * 3], b = N[vi * 3 + 1], c = N[vi * 3 + 2];
          nx = nm[0] * a + nm[3] * b + nm[6] * c;
          ny = nm[1] * a + nm[4] * b + nm[7] * c;
          nz = nm[2] * a + nm[5] * b + nm[8] * c;
          const l = (Math.hypot(nx, ny, nz) || 1) * (flip ? -1 : 1);
          nx /= l;
          ny /= l;
          nz /= l;
        }
        g.nrm.push(nx);
        g.nrm.push(ny);
        g.nrm.push(nz);
        g.uv.push(T ? T[vi * 2] : 0);
        g.uv.push(T ? T[vi * 2 + 1] : 0);
      };
      if (N) {
        const base = g.pos.n / 3;
        g.pos.reserve(vc * 3);
        g.nrm.reserve(vc * 3);
        g.uv.reserve(vc * 2);
        g.idx.reserve(I.length);
        for (let v = 0; v < vc; v++) put(v);
        for (let i = 0; i + 2 < I.length; i += 3) {
          const a = I[i], b = I[i + 1], c = I[i + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) {
            g.idx.push(base + a);
            g.idx.push(base + c);
            g.idx.push(base + b);
          } else {
            g.idx.push(base + a);
            g.idx.push(base + b);
            g.idx.push(base + c);
          }
        }
      } else {
        for (let i = 0; i + 2 < I.length; i += 3) {
          let a = I[i], b = I[i + 1], c = I[i + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) {
            const t = b;
            b = c;
            c = t;
          }
          const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
          const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
          let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
          const tx = nm[0] * fx + nm[3] * fy + nm[6] * fz, ty = nm[1] * fx + nm[4] * fy + nm[7] * fz, tz = nm[2] * fx + nm[5] * fy + nm[8] * fz;
          const l = Math.hypot(tx, ty, tz) || 1;
          fx = tx / l;
          fy = ty / l;
          fz = tz / l;
          const base = g.pos.n / 3;
          put(a, [fx, fy, fz]);
          put(b, [fx, fy, fz]);
          put(c, [fx, fy, fz]);
          g.idx.push(base);
          g.idx.push(base + 1);
          g.idx.push(base + 2);
        }
      }
    });
  };
  if (large) {
    counting = true;
    for (const r of roots) visit(r, ident(), "", 0);
    const total = [...need.values()].reduce((n, c) => n + c.i / 3, 0);
    if (total > IMPORT_BUDGET * 1.5) {
      keep *= IMPORT_BUDGET / total;
      cache.clear();
      need.clear();
      for (const r of roots) visit(r, ident(), "", 0);
    }
    counting = false;
    progress(0.35, "Objekte werden gelesen");
  }
  for (const r of roots) visit(r, ident(), "", 0);
  progress(0.6, "Modell wird optimiert");
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of groups.values()) {
    const A = g.pos.a;
    for (let i = 0; i < g.pos.n; i += 3) for (let k = 0; k < 3; k++) {
      const v = A[i + k];
      if (v < mn[k]) mn[k] = v;
      if (v > mx[k]) mx[k] = v;
    }
  }
  const ok = Number.isFinite(mn[0]);
  const meshes = [];
  const layerMap = /* @__PURE__ */ new Map();
  const origin = ok ? [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2] : [0, 0, 0];
  let gi = 0, triangles = 0, vertices = 0;
  let list = [...groups.values()].filter((g) => g.idx.n).map((g) => {
    const positions = g.pos.a.subarray(0, g.pos.n);
    for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) positions[i + k] -= origin[k];
    const r = { g, positions, normals: g.nrm.a.subarray(0, g.nrm.n), uvs: g.uv.a.subarray(0, g.uv.n), indices: g.idx.a.subarray(0, g.idx.n) };
    g.pos = g.nrm = g.uv = new GrowF32(1);
    g.idx = new GrowU32(1);
    return r;
  });
  if (large) list = simplifyToBudget(list, IMPORT_BUDGET).parts;
  if (large) warnings.push({ code: "large-model", message: "Sehr gro\xDFes Modell: Feine Details (z. B. M\xF6bel) wurden beim Einlesen vereinfacht, damit es fl\xFCssig bleibt. W\xE4nde, B\xF6den und D\xE4cher bleiben exakt." });
  for (const { g, positions, normals, uvs, indices } of list) {
    if (!indices.length) continue;
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...g.material ? { material: g.material } : {},
      positions,
      normals,
      indices: indices instanceof Uint32Array ? indices : Uint32Array.from(indices),
      triangleCount: indices.length / 3,
      ...g.textured ? { uvs } : {}
    });
    triangles += indices.length / 3;
    vertices += positions.length / 3;
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  const size2 = ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0];
  const rawExtent = Math.max(...size2) / s;
  const plausible = rawExtent * s >= 2 && rawExtent * s <= 2e3;
  if (!ok) warnings.push({ code: "no-3d", message: "In der glTF/GLB-Datei wurden keine Fl\xE4chen gefunden." });
  else if (!plausible) warnings.push({ code: "units-implausible", message: `Das Modell ist ${(rawExtent * s).toFixed(1)} m gro\xDF \u2013 ungew\xF6hnlich f\xFCr ein Geb\xE4ude. Bei Bedarf die Einheit korrigieren.` });
  if (skipped) warnings.push({ code: "gltf-lines", message: `${skipped} Linien-/Punkt-Teil(e) ohne Fl\xE4chen wurden weggelassen.` });
  progress(1, "Fertig");
  return {
    model: {
      meshes,
      materials: [...used.values()],
      layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
      units: { name: s === 1 ? "Meter" : `Faktor ${s}`, toMeters: s, source: opts.unitsToMeters ? "user" : "header", rawExtent, plausible },
      origin,
      bbox: ok ? { min: [mn[0] - origin[0], mn[1] - origin[1], mn[2] - origin[2]], max: [mx[0] - origin[0], mx[1] - origin[1], mx[2] - origin[2]] } : { min: [0, 0, 0], max: [0, 0, 0] },
      stats: { version: `glTF ${json.asset.version}${json.asset.generator ? ` (${String(json.asset.generator).slice(0, 40)})` : ""}`, entityCounts: { "glTF-Teile": prims, "Dreiecke": triangles }, triangles, vertices, removedDegenerate: 0, removedDuplicate: 0, flippedForConsistency: 0, closedShellsOutward: 0 },
      warnings,
      ok
    },
    images: [...images].map(([name, data]) => ({ name, data }))
  };
}

// src/core/analysis/classify.ts
var RULES = [
  ["glass", /(glas|glass|glazing|verglas|scheibe|vitre)/i],
  ["window", /(fenster|window|wind\b|fen\b|^a-glaz|oberlicht|skylight)/i],
  ["door", /(t[üu]r|tuer|door|\btor\b|portal)/i],
  ["stair", /(treppe|stufe|stair|step|rampe|ramp)/i],
  ["railing", /(gel[äa]nder|gelaender|railing|handlauf|handrail|balustr|br[üu]stung)/i],
  ["column", /(st[üu]tze|stuetze|column|s[äa]ule|saeule|pfeiler|pillar|\bcol\b)/i],
  ["roof", /(dach|roof|attika|ziegel|traufe|first)/i],
  ["terrain", /(gel[äa]nde|gelaende|terrain|topo|site|landscape|rasen|lawn|grund\b|umgebung)/i],
  ["terrace", /(terrasse|terrace|balkon|balcony|loggia|deck\b|patio)/i],
  ["furniture", /(m[öo]bel|moebel|furn|einrichtung|ausstattung|k[üu]che|kitchen|sanit|bad\b|equip)/i],
  ["ceiling", /(decke|ceiling|slab|geschossdecke|unterzug)/i],
  ["floor", /(boden|floor|estrich|belag|fu[ßs]boden|parkett|fliese|bodenplatte|fundament)/i],
  ["wall", /(wand|w[äa]nde|wall|mauer|fassade|facade|attika|brick|ziegelwand|beton)/i]
];
function categoryFromLayer(layer) {
  for (const [c, re] of RULES) if (re.test(layer)) return c;
  return null;
}
function orientationShares(m) {
  const p = m.positions, I = m.indices;
  let up = 0, down = 0, vertical = 0, sloped = 0, total = 0;
  for (let i = 0; i < I.length; i += 3) {
    const n = triNormalArea(p, I[i], I[i + 1], I[i + 2]);
    const ny = n.ny;
    total += n.area;
    if (ny > 0.95) up += n.area;
    else if (ny < -0.95) down += n.area;
    else if (Math.abs(ny) < 0.2) vertical += n.area;
    else sloped += n.area;
  }
  const t = total || 1;
  return { area: total, shares: { up: up / t, down: down / t, vertical: vertical / t, sloped: sloped / t } };
}
function triNormalArea(p, a, b, c) {
  a *= 3;
  b *= 3;
  c *= 3;
  const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
  const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { nx: nx / l, ny: ny / l, nz: nz / l, area: l / 2 };
}
function classifyMesh(m) {
  const { area, shares } = orientationShares(m);
  const byLayer = categoryFromLayer(m.layer);
  if (byLayer) return { meshId: m.id, category: byLayer, basis: "layer", orientation: shares, area };
  const horiz = shares.up + shares.down;
  let category = "other";
  if (shares.vertical > 0.6) category = "wall";
  else if (shares.sloped > 0.4) category = "roof";
  else if (horiz > 0.6) category = "floor";
  return { meshId: m.id, category, basis: "geometry", orientation: shares, area };
}

// src/core/analysis/spatial.ts
var SKIP_FOR_FLOORS = ["roof", "terrain", "furniture", "glass", "window", "railing", "stair", "door"];
function analyse(input) {
  const { meshes, categories, bbox } = input;
  const notes = [];
  const ext = Math.max(bbox.max[0] - bbox.min[0], bbox.max[2] - bbox.min[2]);
  const cell = Math.max(0.1, ext / 1500);
  const margin = 2;
  const grid = {
    x0: bbox.min[0] - margin,
    z0: bbox.min[2] - margin,
    cell,
    nx: Math.ceil((bbox.max[0] - bbox.min[0] + 2 * margin) / cell),
    nz: Math.ceil((bbox.max[2] - bbox.min[2] + 2 * margin) / cell)
  };
  const levels = detectLevels(meshes, categories, bbox);
  if (!levels.length) notes.push("Keine Geschossebene erkannt \u2013 Begehung startet au\xDFen.");
  const plans = levels.map((lv) => planLevel(meshes, categories, grid, lv));
  const kept = plans.filter((p) => count(p.walkable) * cell * cell >= 8);
  kept.forEach((p, i) => {
    p.level.index = i;
  });
  nameLevels(kept.map((p) => p.level), bbox.min[1]);
  for (let i = 0; i < kept.length; i++)
    kept[i].level.height = i + 1 < kept.length ? kept[i + 1].level.elevation - kept[i].level.elevation : 3;
  const rooms = [];
  for (const p of kept) findRooms(p, grid, rooms);
  const entrance = findEntrance(kept, grid, rooms);
  if (!entrance && kept.length) notes.push("Kein Eingang erkannt \u2013 der Besuch startet vor dem Geb\xE4ude.");
  const hasTerrain = meshes.some((m) => categories.get(m.id) === "terrain");
  return { grid, levels: kept.map((p) => p.level), plans: kept, rooms, entrance, groundY: hasTerrain ? bbox.min[1] - 0.05 : bbox.min[1], notes };
}
function count(a) {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i];
  return n;
}
function detectLevels(meshes, categories, bbox) {
  const bin = 0.05;
  const hist = /* @__PURE__ */ new Map();
  for (const m of meshes) {
    if (SKIP_FOR_FLOORS.includes(categories.get(m.id) ?? "other")) continue;
    const p = m.positions, I = m.indices;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (!l || ny / l < 0.97) continue;
      const y = (p[a + 1] + p[b + 1] + p[c + 1]) / 3;
      const k = Math.round(y / bin);
      hist.set(k, (hist.get(k) ?? 0) + l / 2);
    }
  }
  const entries = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const maxA = entries[0][1];
  const accepted = [];
  for (const [k, a] of entries) {
    if (a < Math.max(4, 0.12 * maxA)) break;
    const y = k * bin;
    if (accepted.every((u) => Math.abs(u - y) >= 2)) accepted.push(y);
  }
  accepted.sort((a, b) => a - b);
  void bbox;
  return accepted.map((y, i) => ({ index: i, elevation: y, height: 3, name: { de: "", en: "" } }));
}
function nameLevels(levels, minY) {
  let g = levels.findIndex((l) => l.elevation >= minY - 0.01 && l.elevation <= minY + 1.5);
  if (g < 0) g = 0;
  levels.forEach((l, i) => {
    const d = i - g;
    if (d === 0) l.name = { de: "Erdgeschoss", en: "Ground floor" };
    else if (d < 0) l.name = { de: d === -1 ? "Untergeschoss" : `${-d}. Untergeschoss`, en: d === -1 ? "Basement" : `Basement ${-d}` };
    else if (i === levels.length - 1 && d >= 2) l.name = { de: "Dachgeschoss", en: "Top floor" };
    else l.name = { de: `${d}. Obergeschoss`, en: `Floor ${d}` };
  });
}
function planLevel(meshes, categories, g, level) {
  const N = g.nx * g.nz;
  const floorY = new Float32Array(N).fill(NaN);
  const ceilY = new Float32Array(N).fill(Infinity);
  const blocked = new Uint8Array(N);
  const e = level.elevation;
  const cuts = [e + 0.35, e + 0.75];
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    if (ny < 0.7 || cat === "roof") return;
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.45 || ymin > e + 0.45) return;
    rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i, y) => {
      if (y <= e + 0.45 && y >= e - 0.45 && !(floorY[i] >= y)) floorY[i] = y;
    });
  }, categories);
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.1 || ymin > e + 4) return;
    for (const h of cuts) if (ymin < h && ymax > h) cutSegment(g, blocked, h, ax, ay, az, bx, by, bz, cx, cy, cz);
    if (Math.abs(ny) > 0.05) {
      rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i, y) => {
        const f2 = floorY[i];
        if (!Number.isNaN(f2) && (ny < 0 ? y > f2 - 0.03 : y > f2 + 0.05) && y < ceilY[i]) ceilY[i] = y;
      });
    }
    void cat;
  }, categories);
  const walkable = new Uint8Array(N);
  for (let i = 0; i < N; i++) walkable[i] = !Number.isNaN(floorY[i]) && ceilY[i] - floorY[i] >= 1.9 && !blocked[i] ? 1 : 0;
  return { level, floorY, ceilY, walkable, blocked, room: new Int32Array(N).fill(-1) };
}
function forEachTri(meshes, fn, categories) {
  for (const m of meshes) {
    const cat = categories.get(m.id) ?? "other";
    const p = m.positions, I = m.indices;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      fn(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2], ny / l, cat);
    }
  }
}
function rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, cb) {
  const minX = Math.max(0, Math.floor((Math.min(ax, bx, cx) - g.x0) / g.cell));
  const maxX = Math.min(g.nx - 1, Math.floor((Math.max(ax, bx, cx) - g.x0) / g.cell));
  const minZ = Math.max(0, Math.floor((Math.min(az, bz, cz) - g.z0) / g.cell));
  const maxZ = Math.min(g.nz - 1, Math.floor((Math.max(az, bz, cz) - g.z0) / g.cell));
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(d) < 1e-12) return;
  for (let j = minZ; j <= maxZ; j++) {
    const pz = g.z0 + (j + 0.5) * g.cell;
    for (let i = minX; i <= maxX; i++) {
      const px = g.x0 + (i + 0.5) * g.cell;
      const w1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
      const w2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      cb(j * g.nx + i, w1 * ay + w2 * by + w3 * cy);
    }
  }
}
function cutSegment(g, out, h, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const pts2 = [];
  const edge = (x12, y1, z12, x22, y2, z22) => {
    if ((y1 - h) * (y2 - h) < 0) {
      const t = (h - y1) / (y2 - y1);
      pts2.push([x12 + t * (x22 - x12), z12 + t * (z22 - z12)]);
    }
  };
  edge(ax, ay, az, bx, by, bz);
  edge(bx, by, bz, cx, cy, cz);
  edge(cx, cy, cz, ax, ay, az);
  if (pts2.length < 2) return;
  const [[x1, z1], [x2, z2]] = pts2;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(len / (g.cell * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const x = x1 + (x2 - x1) * s / steps, z = z1 + (z2 - z1) * s / steps;
    const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
    if (i >= 0 && j >= 0 && i < g.nx && j < g.nz) out[j * g.nx + i] = 1;
  }
}
function dilate(src2, g, r) {
  const tmp = new Uint8Array(src2.length), out = new Uint8Array(src2.length);
  for (let j = 0; j < g.nz; j++) {
    let last = -1e9;
    for (let i = 0; i < g.nx; i++) {
      if (src2[j * g.nx + i]) last = i;
      if (i - last <= r) tmp[j * g.nx + i] = 1;
    }
    last = 1e9;
    for (let i = g.nx - 1; i >= 0; i--) {
      if (src2[j * g.nx + i]) last = i;
      if (last - i <= r) tmp[j * g.nx + i] = 1;
    }
  }
  for (let i = 0; i < g.nx; i++) {
    let last = -1e9;
    for (let j = 0; j < g.nz; j++) {
      if (tmp[j * g.nx + i]) last = j;
      if (j - last <= r) out[j * g.nx + i] = 1;
    }
    last = 1e9;
    for (let j = g.nz - 1; j >= 0; j--) {
      if (tmp[j * g.nx + i]) last = j;
      if (last - j <= r) out[j * g.nx + i] = 1;
    }
  }
  return out;
}
function findRooms(p, g, rooms) {
  const N = g.nx * g.nz;
  const r = Math.max(2, Math.round(0.65 / g.cell));
  const closed = dilate(p.blocked, g, r);
  const exterior = new Uint8Array(N);
  const q = [];
  for (let i = 0; i < g.nx; i++) for (const j of [0, g.nz - 1]) push(j * g.nx + i);
  for (let j = 0; j < g.nz; j++) for (const i of [0, g.nx - 1]) push(j * g.nx + i);
  function push(c) {
    if (!closed[c] && !exterior[c]) {
      exterior[c] = 1;
      q.push(c);
    }
  }
  while (q.length) {
    const c = q.pop();
    const i = c % g.nx, j = c / g.nx | 0;
    if (i > 0) push(c - 1);
    if (i < g.nx - 1) push(c + 1);
    if (j > 0) push(c - g.nx);
    if (j < g.nz - 1) push(c + g.nx);
  }
  const minCells = Math.ceil(1.5 / (g.cell * g.cell));
  const seedOf = p.room;
  const local = [];
  for (let s = 0; s < N; s++) {
    if (seedOf[s] !== -1 || !p.walkable[s] || closed[s] || exterior[s]) continue;
    const comp = [s];
    const id = rooms.length + local.length;
    seedOf[s] = id;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k];
      const i = c % g.nx, j = c / g.nx | 0;
      for (const n of [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || closed[n] || exterior[n]) continue;
        seedOf[n] = id;
        comp.push(n);
      }
    }
    if (comp.length < minCells) {
      for (const c of comp) seedOf[c] = -2;
      continue;
    }
    local.push({ id, level: p.level.index, cells: comp.length, area: 0, centroid: [0, 0], outline: [], covered: true });
  }
  for (let i = 0; i < N; i++) if (seedOf[i] === -2) seedOf[i] = -1;
  let frontier = [];
  for (let c = 0; c < N; c++) if (seedOf[c] >= 0) frontier.push(c);
  for (let step = 0; step < r + 1 && frontier.length; step++) {
    const next = [];
    for (const c of frontier) {
      const i = c % g.nx, j = c / g.nx | 0;
      for (const n of [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || exterior[n]) continue;
        seedOf[n] = seedOf[c];
        next.push(n);
      }
    }
    frontier = next;
  }
  for (const room of local) {
    let n = 0, sx = 0, sz = 0, cov = 0;
    for (let c = 0; c < N; c++) if (seedOf[c] === room.id) {
      n++;
      sx += c % g.nx;
      sz += c / g.nx | 0;
      if (Number.isFinite(p.ceilY[c])) cov++;
    }
    room.covered = cov > n * 0.6;
    room.cells = n;
    room.area = Math.round(n * g.cell * g.cell * 10) / 10;
    room.centroid = [g.x0 + (sx / n + 0.5) * g.cell, g.z0 + (sz / n + 0.5) * g.cell];
    room.outline = traceOutline(seedOf, room.id, g);
    rooms.push(room);
  }
}
function traceOutline(lbl, id, g) {
  const W = g.nx + 1;
  const next = /* @__PURE__ */ new Map();
  const at = (i, j) => i >= 0 && j >= 0 && i < g.nx && j < g.nz && lbl[j * g.nx + i] === id;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      if (lbl[j * g.nx + i] !== id) continue;
      if (!at(i, j - 1)) next.set(j * W + i, j * W + i + 1);
      if (!at(i + 1, j)) next.set(j * W + i + 1, (j + 1) * W + i + 1);
      if (!at(i, j + 1)) next.set((j + 1) * W + i + 1, (j + 1) * W + i);
      if (!at(i - 1, j)) next.set((j + 1) * W + i, j * W + i);
    }
  let best = [];
  const used = /* @__PURE__ */ new Set();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let v = start;
    while (!used.has(v) && next.has(v)) {
      used.add(v);
      loop.push(v);
      v = next.get(v);
    }
    if (loop.length > best.length) best = loop;
  }
  const pts2 = best.map((v) => [v % W, v / W | 0]);
  const simp = [];
  for (let k = 0; k < pts2.length; k++) {
    const a = pts2[(k + pts2.length - 1) % pts2.length], b = pts2[k], c = pts2[(k + 1) % pts2.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) simp.push(b);
  }
  return simp.map(([i, j]) => [g.x0 + i * g.cell, g.z0 + j * g.cell]);
}
function findEntrance(plans, g, rooms) {
  for (const p of plans) {
    const N = g.nx * g.nz;
    const seen = new Uint8Array(N);
    const q = [];
    const nb = (c) => {
      const i = c % g.nx, j = c / g.nx | 0;
      return [i > 0 ? c - 1 : -1, i < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1];
    };
    for (let c = 0; c < N; c++) {
      if (!p.walkable[c] || p.room[c] >= 0) continue;
      if (nb(c).some((n2) => n2 < 0 || Number.isNaN(p.floorY[n2]) && !p.blocked[n2])) {
        seen[c] = 1;
        q.push(c);
      }
    }
    const thresholds = [];
    for (let k = 0; k < q.length; k++) {
      const c = q[k];
      for (const n2 of nb(c)) {
        if (n2 < 0 || seen[n2] || !p.walkable[n2]) continue;
        if (p.room[n2] >= 0) {
          thresholds.push(n2);
          continue;
        }
        seen[n2] = 1;
        q.push(n2);
      }
    }
    if (!thresholds.length) continue;
    const tset = new Set(thresholds);
    const clusters = [];
    const done = /* @__PURE__ */ new Set();
    for (const t of tset) {
      if (done.has(t)) continue;
      const cl = [t];
      done.add(t);
      for (let k = 0; k < cl.length; k++) {
        const c = cl[k];
        const i = c % g.nx, j = c / g.nx | 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          const n2 = (j + dj) * g.nx + (i + di);
          if (tset.has(n2) && !done.has(n2)) {
            done.add(n2);
            cl.push(n2);
          }
        }
      }
      clusters.push(cl);
    }
    let best = null;
    for (const cl of clusters) {
      const width = cl.length * g.cell;
      if (width < 0.6) continue;
      const room2 = rooms.find((r) => r.id === p.room[cl[0]]);
      const score = (room2?.area ?? 0) + Math.min(width, 2.5) * 10;
      if (!best || score > best.score) best = { cl, score };
    }
    if (!best) continue;
    let sx = 0, sz = 0, sy = 0;
    for (const c of best.cl) {
      sx += c % g.nx;
      sz += c / g.nx | 0;
      sy += p.floorY[c];
    }
    const n = best.cl.length;
    const cx = g.x0 + (sx / n + 0.5) * g.cell, cz = g.z0 + (sz / n + 0.5) * g.cell;
    const room = rooms.find((r) => r.id === p.room[best.cl[0]]);
    let ix = room.centroid[0] - cx, iz = room.centroid[1] - cz;
    const xs = best.cl.map((c) => c % g.nx), zs = best.cl.map((c) => c / g.nx | 0);
    const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
    if (spanX > spanZ) {
      ix = 0;
      iz = Math.sign(iz) || 1;
    } else if (spanZ > spanX) {
      iz = 0;
      ix = Math.sign(ix) || 1;
    }
    const l = Math.hypot(ix, iz) || 1;
    return { level: p.level.index, position: [cx, sy / n, cz], inward: [ix / l, iz / l], width: Math.max(spanX, spanZ) * g.cell + g.cell };
  }
  return null;
}
function cellOf(g, x, z) {
  const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
  if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return -1;
  return j * g.nx + i;
}

// src/core/scene.ts
var SPLIT_ROLES = ["floor", "ceiling", "terrace", "roof"];
function subMesh(m, tris) {
  const map = /* @__PURE__ */ new Map();
  const pos = [], nrm = [], uv = [];
  const idx = new Uint32Array(tris.length);
  tris.forEach((v, j) => {
    let n = map.get(v);
    if (n === void 0) {
      n = pos.length / 3;
      map.set(v, n);
      pos.push(m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]);
      nrm.push(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]);
      if (m.uvs) uv.push(m.uvs[v * 2], m.uvs[v * 2 + 1]);
    }
    idx[j] = n;
  });
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: idx, triangleCount: idx.length / 3, ...m.uvs ? { uvs: new Float32Array(uv) } : {} };
}
function orientationGroups(m) {
  const g = /* @__PURE__ */ new Map();
  const I = m.indices;
  for (let i = 0; i < I.length; i += 3) {
    const n = triNormalArea(m.positions, I[i], I[i + 1], I[i + 2]);
    const k = n.ny > 0.7 ? "top" : n.ny < -0.7 ? "under" : Math.abs(n.ny) < 0.2 ? "side" : "slope";
    let l = g.get(k);
    if (!l) g.set(k, l = []);
    l.push(I[i], I[i + 1], I[i + 2]);
  }
  return g;
}
function partition(meshes, cadMaterials = []) {
  const parts = [];
  const cad = new Map(cadMaterials.map((c) => [c.name, c]));
  let n = 0;
  const make = (m, sub, category, basis, role) => {
    const cm = m.material ? cad.get(m.material) ?? { name: m.material } : void 0;
    return {
      id: `p${n++}`,
      // the CAD material is part of the key only when there is one (older projects keep their keys)
      key: `${m.layer}|${category}|${role}|${m.color}${m.material ? `|m:${m.material}` : ""}`,
      layer: m.layer,
      category,
      basis,
      role,
      color: m.color,
      ...m.material ? { cadMaterial: m.material } : {},
      ...m.singleSided ? { singleSided: true } : {},
      positions: sub.positions,
      normals: sub.normals,
      indices: sub.indices,
      uvs: boxUVs(sub.positions, sub.normals),
      ...sub.uvs ? { uvTex: sub.uvs } : {},
      auto: cm && assignFromCad(cm, category) || assignMaterial(m.layer, category, role, m.color)
    };
  };
  for (const m of meshes) {
    const byLayer = categoryFromLayer(m.layer);
    if (byLayer && !SPLIT_ROLES.includes(byLayer)) {
      parts.push(make(m, m, byLayer, "layer", "all"));
      continue;
    }
    const groups = orientationGroups(m);
    if (byLayer) {
      for (const [k, tris] of groups) {
        const role = k === "top" ? "top" : k === "under" ? "under" : byLayer === "roof" && k === "slope" ? "all" : "side";
        parts.push(make(m, subMesh(m, tris), byLayer, "layer", role));
      }
      continue;
    }
    const whole2 = classifyMesh(m);
    if (groups.size === 1 && whole2.category !== "other") {
      const [k] = [...groups.keys()];
      parts.push(make(m, m, whole2.category, "geometry", whole2.category === "floor" ? k === "under" ? "under" : "top" : "all"));
      continue;
    }
    for (const [k, tris] of groups) {
      const cat = k === "side" ? "wall" : k === "slope" ? "roof" : "floor";
      const role = k === "top" ? "top" : k === "under" ? "under" : "all";
      parts.push(make(m, subMesh(m, tris), cat, "geometry", role));
    }
  }
  return parts;
}
function prepareScene(model2, onProgress2) {
  const t02 = performance.now();
  const parts = partition(model2.meshes, model2.materials);
  const t12 = performance.now();
  onProgress2?.(0.4, "R\xE4ume und Geschosse werden erkannt");
  const asMeshes = parts.map((p) => ({ id: p.id, layer: p.layer, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: p.indices.length / 3 }));
  const analysis = analyse({ meshes: asMeshes, categories: new Map(parts.map((p) => [p.id, p.category])), bbox: model2.bbox });
  const t2 = performance.now();
  onProgress2?.(0.8, "Blickpunkte werden vorgeschlagen");
  const bbox = model2.bbox;
  const start = startPosition(analysis, bbox);
  const viewpoints = suggestViewpoints(analysis, bbox, start);
  const hotspotSuggestions = suggestHotspots(analysis);
  onProgress2?.(1, "Fertig");
  return {
    parts,
    analysis,
    bbox,
    start,
    viewpoints,
    hotspotSuggestions,
    timings: { partition: t12 - t02, analysis: t2 - t12, suggestions: performance.now() - t2 }
  };
}
var EYE = 1.65;
function startPosition(a, bbox) {
  if (a.entrance) {
    const e = a.entrance;
    const x = e.position[0] - e.inward[0] * 3.5, z2 = e.position[2] - e.inward[1] * 3.5;
    return { position: [x, Math.min(e.position[1], a.groundY) + 0.02, z2], yaw: Math.atan2(-e.inward[0], -e.inward[1]), outside: true };
  }
  const cx = (bbox.min[0] + bbox.max[0]) / 2;
  const z = bbox.max[2] + 6;
  return { position: [cx, a.groundY + 0.02, z], yaw: 0, outside: true };
}
function suggestViewpoints(a, bbox, start) {
  const cx = (bbox.min[0] + bbox.max[0]) / 2, cz = (bbox.min[2] + bbox.max[2]) / 2;
  const sx = bbox.max[0] - bbox.min[0], sz = bbox.max[2] - bbox.min[2], sy = bbox.max[1] - bbox.min[1];
  const diag = Math.hypot(sx, sz);
  const ty = bbox.min[1] + sy * 0.4;
  const vps = [];
  const base = Math.atan2(start.position[0] - cx, start.position[2] - cz);
  const names = ["Hauptansicht", "Seitenansicht", "R\xFCckansicht", "Seitenansicht 2"];
  [0.6, -0.6 + Math.PI / 2, Math.PI + 0.6, -Math.PI / 2 - 0.6].forEach((off, i) => {
    const ang = base + off;
    const d = Math.max(diag * 0.95, 12);
    vps.push({ id: `ext${i}`, name: names[i], position: [cx + Math.sin(ang) * d, a.groundY + EYE + sy * 0.15, cz + Math.cos(ang) * d], target: [cx, ty, cz], auto: true });
  });
  vps.push({ id: "aerial", name: "Vogelperspektive", position: [cx + Math.sin(base + 0.7) * diag * 1.1, bbox.max[1] + diag * 0.8, cz + Math.cos(base + 0.7) * diag * 1.1], target: [cx, ty, cz], auto: true });
  if (a.entrance) {
    const e = a.entrance;
    vps.push({ id: "entry", name: "Eingang", position: [start.position[0], start.position[1] + EYE, start.position[2]], target: [e.position[0], e.position[1] + 1.2, e.position[2]], auto: true, walk: true });
  }
  for (const r of a.rooms.filter((r2) => r2.covered && r2.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    const g = a.grid;
    let best = -1, bd = -1;
    for (let c = 0; c < plan.room.length; c++) {
      if (plan.room[c] !== r.id || !plan.walkable[c]) continue;
      const x = g.x0 + (c % g.nx + 0.5) * g.cell, z = g.z0 + ((c / g.nx | 0) + 0.5) * g.cell;
      const d = Math.hypot(x - r.centroid[0], z - r.centroid[1]);
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
    if (best < 0) continue;
    const bx = g.x0 + (best % g.nx + 0.5) * g.cell, bz = g.z0 + ((best / g.nx | 0) + 0.5) * g.cell;
    const k = Math.min(0.6, bd * 0.3) / (bd || 1);
    const px = bx + (r.centroid[0] - bx) * k, pz = bz + (r.centroid[1] - bz) * k;
    const fy = plan.floorY[cellOf(g, px, pz)] ?? plan.level.elevation;
    vps.push({ id: `room${r.id}`, name: `${plan.level.name.de} \xB7 Raum ${r.id + 1}`, position: [px, (Number.isFinite(fy) ? fy : plan.level.elevation) + EYE, pz], target: [r.centroid[0], plan.level.elevation + 1.3, r.centroid[1]], auto: true, walk: true, level: r.level });
  }
  return vps;
}
function suggestHotspots(a) {
  const out = [];
  for (const r of a.rooms.filter((r2) => r2.covered && r2.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    let c = cellOf(a.grid, r.centroid[0], r.centroid[1]);
    let pos = r.centroid;
    if (c < 0 || plan.room[c] !== r.id) {
      let bd = Infinity;
      for (let k = 0; k < plan.room.length; k++) {
        if (plan.room[k] !== r.id) continue;
        const x = a.grid.x0 + (k % a.grid.nx + 0.5) * a.grid.cell, z = a.grid.z0 + ((k / a.grid.nx | 0) + 0.5) * a.grid.cell;
        const d = Math.hypot(x - r.centroid[0], z - r.centroid[1]);
        if (d < bd) {
          bd = d;
          c = k;
          pos = [x, z];
        }
      }
    }
    out.push({
      id: `hs-room${r.id}`,
      position: [pos[0], plan.level.elevation + 1.4, pos[1]],
      title: `Raum ${r.id + 1}`,
      text: "",
      facts: [`${plan.level.name.de}`, `Fl\xE4che ca. ${r.area.toLocaleString("de-AT")} m\xB2 (aus dem Modell gemessen)`],
      auto: true,
      level: r.level
    });
  }
  return out;
}

// scripts/dev/big-import.ts
var f = process.argv[2];
var fd = openSync(f, "r");
var size = fstatSync(fd).size;
var src = { size, read: (o, l) => {
  const b = Buffer.alloc(Math.min(l, size - o));
  readSync(fd, b, 0, b.length, o);
  return new Uint8Array(b.buffer, b.byteOffset, b.length);
} };
var mem = () => {
  const m = process.memoryUsage();
  return `heap ${m.heapUsed / 1e6 | 0} MB, total ${m.rss / 1e6 | 0} MB`;
};
var peak = 0;
var tick = setInterval(() => {
  peak = Math.max(peak, process.memoryUsage().rss);
}, 200);
var t0 = Date.now();
var lastP = "";
var onProgress = (fr, l) => {
  const s = `${l} ${Math.round(fr * 100)}%`;
  if (s !== lastP && Math.round(fr * 100) % 10 === 0) {
    lastP = s;
    console.log(`  ${((Date.now() - t0) / 1e3).toFixed(0)}s ${s} \xB7 ${mem()}`);
  }
};
var whole = () => src.read(0, size);
var model = /\.dxf$/i.test(f) ? importDxf(src, { onProgress }) : /\.3ds$/i.test(f) ? importTds(whole(), { onProgress }) : importGltf(whole(), { onProgress }).model;
var t1 = Date.now();
console.log("import", (t1 - t0) / 1e3, "s \xB7 triangles", model.stats.triangles, "\xB7 ok", model.ok, "\xB7", mem(), "\xB7 warnings", model.warnings.map((w) => w.code).join(","));
console.log("bbox", JSON.stringify(model.bbox), "units", model.units.name);
var scene = prepareScene(model);
console.log("scene", (Date.now() - t1) / 1e3, "s \xB7 parts", scene.parts.length, "\xB7 levels", scene.analysis.levels.length, "\xB7", mem(), "\xB7 peak", Math.max(peak, process.memoryUsage().rss) / 1e6 | 0, "MB");
clearInterval(tick);
