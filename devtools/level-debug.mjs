// scripts/dev/level-debug.ts
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
  const m2 = v - c;
  const f = (x2) => Math.floor(x2 + 1e-6);
  return f(r + m2) << 16 | f(g + m2) << 8 | f(b + m2);
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
    const m2 = { handle, name };
    const desc = str(P, 2);
    if (desc) m2.description = desc;
    if (num(P, 71, 0) === 1) {
      const c = cmColor(parseInt(str(P, 91, "NaN"), 10));
      if (c !== void 0) m2.diffuse = c;
    }
    const i3 = P.findIndex(([c]) => c === 3);
    if (i3 >= 0 && P[i3][1].trim()) {
      m2.diffuseMap = P[i3][1].trim();
      const mat = [];
      for (let k = i3 + 1; k < P.length && mat.length < 16; k++) if (P[k][0] === 43) mat.push(parseFloat(P[k][1]));
      const sx = mat[0];
      if (Number.isFinite(sx) && Math.abs(sx) > 1e-9 && Math.abs(sx - 1) > 1e-9) m2.mapScaleU = 1 / Math.abs(sx);
    }
    const op = num(P, 140, NaN);
    if (Number.isFinite(op) && op >= 0 && op <= 1) m2.opacity = op;
    out.materials.set(handle, m2);
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
  const m2 = new Float64Array(16);
  m2[0] = m2[5] = m2[10] = m2[15] = 1;
  return m2;
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
  const m2 = identity();
  m2[12] = x;
  m2[13] = y;
  m2[14] = z;
  return m2;
}
function scale(x, y, z) {
  const m2 = identity();
  m2[0] = x;
  m2[5] = y;
  m2[10] = z;
  return m2;
}
function rotZ(rad) {
  const m2 = identity();
  const c = Math.cos(rad), s = Math.sin(rad);
  m2[0] = c;
  m2[1] = s;
  m2[4] = -s;
  m2[5] = c;
  return m2;
}
function apply(m2, p) {
  const [x, y, z] = p;
  return [
    m2[0] * x + m2[4] * y + m2[8] * z + m2[12],
    m2[1] * x + m2[5] * y + m2[9] * z + m2[13],
    m2[2] * x + m2[6] * y + m2[10] * z + m2[14]
  ];
}
function applyDir(m2, p) {
  const [x, y, z] = p;
  return [m2[0] * x + m2[4] * y + m2[8] * z, m2[1] * x + m2[5] * y + m2[9] * z, m2[2] * x + m2[6] * y + m2[10] * z];
}
function det3(m2) {
  return m2[0] * (m2[5] * m2[10] - m2[9] * m2[6]) - m2[4] * (m2[1] * m2[10] - m2[9] * m2[2]) + m2[8] * (m2[1] * m2[6] - m2[5] * m2[2]);
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
  const m2 = identity();
  m2[0] = ax[0];
  m2[1] = ax[1];
  m2[2] = ax[2];
  m2[4] = ay[0];
  m2[5] = ay[1];
  m2[6] = ay[2];
  m2[8] = az[0];
  m2[9] = az[1];
  m2[10] = az[2];
  return m2;
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
    const A = apply(M, a), B = apply(M, b), C = apply(M, c);
    if (flip) addTri(g, A[0], A[1], A[2], C[0], C[1], C[2], B[0], B[1], B[2]);
    else addTri(g, A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
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
        for (let f = 0; f < n; f++) {
          const o = f * 12;
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
      const m2 = num(P, 71, 0), n = num(P, 72, 0);
      const grid = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      if (m2 < 2 || n < 2 || grid.length < m2 * n) return;
      const closedM = (flags & 1) === 1, closedN = (flags & 32) === 32;
      const at = (i, j) => grid[i % m2 * n + j % n];
      for (let i = 0; i < (closedM ? m2 : m2 - 1); i++)
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
    const cols = Math.max(1, num(P, 70, 1)), rows2 = Math.max(1, num(P, 71, 1));
    const cs = num(P, 44, 0), rs = num(P, 45, 0);
    const base = mul(M, ocsMatrix(ext));
    for (let r = 0; r < rows2; r++)
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
  res.acis = [...acisCount.entries()].map(([type, count]) => ({ type, count, layers: [...acisMap.get(type)] }));
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
    const m2 = map[v];
    if (m2 < 0) continue;
    const r = rep[v];
    pos[m2 * 3] = P[r * 3];
    pos[m2 * 3 + 1] = P[r * 3 + 1];
    pos[m2 * 3 + 2] = P[r * 3 + 2];
    nrm[m2 * 3] = p.normals[v * 3];
    nrm[m2 * 3 + 1] = p.normals[v * 3 + 1];
    nrm[m2 * 3 + 2] = p.normals[v * 3 + 2];
    uv[m2 * 2] = p.uvs[v * 2];
    uv[m2 * 2 + 1] = p.uvs[v * 2 + 1];
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
    const m2 = rawExtent * u[1];
    const score = Math.abs(Math.log10(Math.max(m2, 1e-9)) - Math.log10(30));
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
  const raw = readDxf(input, (f) => progress(0.05 + 0.25 * f, "Datei wird gelesen"));
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
    const [n, f] = UNITS[code];
    units = { name: n, toMeters: f, source: "header", rawExtent, plausible: plausibleMeters(rawExtent * f) };
    if (hasGeo && !units.plausible) {
      const [gn] = guessUnits(rawExtent);
      warnings.push({
        code: "units-implausible",
        message: `Die Datei gibt \u201E${n}\u201C als Einheit an, dann w\xE4re das Geb\xE4ude ${fmtLen(rawExtent * f)} gro\xDF. Vermutlich ist \u201E${gn}\u201C richtig \u2013 bitte pr\xFCfen.`
      });
    }
  } else {
    const [n, f] = guessUnits(rawExtent);
    units = { name: n, toMeters: f, source: "guess", rawExtent, plausible: plausibleMeters(rawExtent * f) };
    if (hasGeo)
      warnings.push({
        code: "units-guessed",
        message: `Die Datei enth\xE4lt keine Einheit. ARCHVISTA hat \u201E${n}\u201C erkannt (Geb\xE4udegr\xF6\xDFe ${fmtLen(rawExtent * f)}). Bei Bedarf mit einem Klick \xE4ndern.`
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
  const triangles = meshes.reduce((n, m2) => n + m2.triangleCount, 0);
  const vertices = meshes.reduce((n, m2) => n + m2.positions.length / 3, 0);
  const ok = triangles > 0;
  if (!ok) {
    warnings.unshift({
      code: "no-3d",
      message: b.acis.length ? "Die Datei enth\xE4lt nur ACIS-Volumenk\xF6rper, die ohne AutoCAD nicht gelesen werden k\xF6nnen. Bitte die Korrektur-Anleitung befolgen." : "In der Datei wurde keine 3D-Geometrie gefunden (nur 2D-Linien, Texte oder Bema\xDFungen).",
      detail: b.acis.length ? "acis-fix" : void 0
    });
  }
  const usedNames = new Set(meshes.map((m2) => m2.material).filter(Boolean));
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
function fmtLen(m2) {
  if (m2 >= 1e3) return `${(m2 / 1e3).toFixed(1)} km`;
  if (m2 >= 1) return `${m2.toFixed(1)} m`;
  return `${(m2 * 100).toFixed(1)} cm`;
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
function orientationShares(m2) {
  const p = m2.positions, I = m2.indices;
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
function classifyMesh(m2) {
  const { area, shares } = orientationShares(m2);
  const byLayer = categoryFromLayer(m2.layer);
  if (byLayer) return { meshId: m2.id, category: byLayer, basis: "layer", orientation: shares, area };
  const horiz = shares.up + shares.down;
  let category = "other";
  if (shares.vertical > 0.6) category = "wall";
  else if (shares.sloped > 0.4) category = "roof";
  else if (horiz > 0.6) category = "floor";
  return { meshId: m2.id, category, basis: "geometry", orientation: shares, area };
}

// scripts/dev/level-debug.ts
var fd = openSync(process.argv[2], "r");
var size = fstatSync(fd).size;
var src = { size, read: (o, l) => {
  const b = Buffer.alloc(Math.min(l, size - o));
  readSync(fd, b, 0, b.length, o);
  return new Uint8Array(b.buffer, b.byteOffset, b.length);
} };
var m = importDxf(src);
var rows = [];
var hist = /* @__PURE__ */ new Map();
for (const me of m.meshes) {
  const cat = classifyMesh(me).category;
  let up = 0, down = 0;
  const p = me.positions, I = me.indices;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    if (!l) continue;
    if (ny / l > 0.97) {
      up += l / 2;
      const k = Math.round((p[a + 1] + p[b + 1] + p[c + 1]) / 3 / 0.05);
      hist.set(k, (hist.get(k) ?? 0) + l / 2);
    } else if (ny / l < -0.97) down += l / 2;
  }
  rows.push([me.layer.slice(0, 40), cat, me.triangleCount, Math.round(up), Math.round(down)]);
}
rows.sort((a, b) => b[3] + b[4] - a[3] - a[4]);
console.log("layer | category | tris | up m\xB2 | down m\xB2");
for (const r of rows.slice(0, 15)) console.log(r.join(" | "));
console.log("up-facing area by height:", [...hist].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, a]) => `${(k * 0.05).toFixed(2)}m:${Math.round(a)}m\xB2`).join("  "));
