// Minimal column-major 4x4 matrix helpers (Float64) — keeps the import pipeline dependency-free
// so it runs identically in a Web Worker, in Node tests and in the desktop app.

export type Mat4 = Float64Array;
export type V3 = [number, number, number];

export function identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

export function translate(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

export function scale(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[0] = x; m[5] = y; m[10] = z;
  return m;
}

export function rotZ(rad: number): Mat4 {
  const m = identity();
  const c = Math.cos(rad), s = Math.sin(rad);
  m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
  return m;
}

export function apply(m: Mat4, p: V3): V3 {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

export function applyDir(m: Mat4, p: V3): V3 {
  const [x, y, z] = p;
  return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
}

export function det3(m: Mat4): number {
  return (
    m[0] * (m[5] * m[10] - m[9] * m[6]) -
    m[4] * (m[1] * m[10] - m[9] * m[2]) +
    m[8] * (m[1] * m[6] - m[5] * m[2])
  );
}

export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
}

/** DXF Arbitrary Axis Algorithm: OCS → WCS matrix for a given extrusion direction. */
export function ocsMatrix(n: V3): Mat4 {
  const az = norm(n);
  if (Math.abs(az[0]) < 1e-12 && Math.abs(az[1]) < 1e-12 && az[2] > 0) return identity();
  const lim = 1 / 64;
  const ax = norm(Math.abs(az[0]) < lim && Math.abs(az[1]) < lim ? cross([0, 1, 0], az) : cross([0, 0, 1], az));
  const ay = norm(cross(az, ax));
  const m = identity();
  m[0] = ax[0]; m[1] = ax[1]; m[2] = ax[2];
  m[4] = ay[0]; m[5] = ay[1]; m[6] = ay[2];
  m[8] = az[0]; m[9] = az[1]; m[10] = az[2];
  return m;
}
