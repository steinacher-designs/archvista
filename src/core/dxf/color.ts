// AutoCAD Color Index (ACI) → RGB, generated from the documented palette structure.

function hsv(h: number, s: number, v: number): number {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  const f = (x: number) => Math.floor(x + 1e-6);
  return (f(r + m) << 16) | (f(g + m) << 8) | f(b + m);
}

const LEVELS = [255, 204, 153, 127, 76];
const BASE: Record<number, number> = {
  1: 0xff0000, 2: 0xffff00, 3: 0x00ff00, 4: 0x00ffff, 5: 0x0000ff, 6: 0xff00ff,
  7: 0xffffff, 8: 0x808080, 9: 0xc0c0c0,
  250: 0x333333, 251: 0x505050, 252: 0x696969, 253: 0x828282, 254: 0xbebebe, 255: 0xffffff,
};

export const ACI: number[] = (() => {
  const t = new Array<number>(256).fill(0xffffff);
  for (let i = 1; i < 256; i++) {
    if (BASE[i] !== undefined) t[i] = BASE[i];
    else if (i >= 10 && i <= 249) {
      const group = Math.floor(i / 10) - 1;
      const v = i % 10;
      t[i] = hsv(group * 15, v % 2 === 0 ? 1 : 0.5, LEVELS[Math.floor(v / 2)]);
    }
  }
  return t;
})();

export function aciToRgb(index: number): number {
  const i = Math.abs(Math.round(index));
  if (i < 1 || i > 255) return 0xffffff;
  return ACI[i];
}

export function hex(rgb: number): string {
  return "#" + rgb.toString(16).padStart(6, "0");
}
