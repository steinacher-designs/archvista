import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { earClip } from "../src/core/dxf/build";
import { pointInPolygon } from "../src/core/zones";
const model = importDxf(readFileSync("tests/fixtures/models/house_mm.dxf", "utf8"));
const s = prepareScene(model); const a = s.analysis;
const up = a.rooms.filter(r => r.level === 1); const r = up.reduce((m, r) => r.centroid[0] > m.centroid[0] ? r : m);
const poly = r.outline;
let A = 0; for (let i = 0; i < poly.length; i++) { const [x1,z1]=poly[i],[x2,z2]=poly[(i+1)%poly.length]; A += x1*z2-x2*z1; }
const tris = earClip(poly.map(([x,z]) => [x,z,0] as [number,number,number]));
let T = 0; for (const [i,j,k] of tris) { const [a1,b1]=poly[i],[a2,b2]=poly[j],[a3,b3]=poly[k]; T += Math.abs((a2-a1)*(b3-b1)-(b2-b1)*(a3-a1))/2; }
console.log("poly area", Math.abs(A/2).toFixed(3), "tri area", T.toFixed(3), "n", poly.length, "tris", tris.length);
console.log(JSON.stringify(poly.map(p=>p.map(v=>+v.toFixed(2)))));
import { removeGreyGeometry } from "../src/core/zones";
const lv = a.levels[1];
const z = { id: "g", kind: "grey" as const, polygon: poly, yMin: lv.elevation - 0.2, yMax: lv.elevation + lv.height - 0.05, source: "room" as const };
const meshes = s.parts.map(p => ({ id: p.id, layer: p.layer+"/"+p.role, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: 0 }));
const res = removeGreyGeometry(meshes, [z]);
const cnt: Record<string, number> = {};
for (const m of res.meshes) for (let i = 0; i < m.positions.length; i += 3) { const x=m.positions[i],y=m.positions[i+1],zz=m.positions[i+2]; if (y>z.yMin+0.005&&y<z.yMax-0.005&&pointInPolygon(x,zz,poly)) { let d=Infinity; for (let k=0,j=poly.length-1;k<poly.length;j=k++){const [ax,az]=poly[j],[bx,bz]=poly[k];const vx=bx-ax,vz=bz-az;const t=Math.max(0,Math.min(1,((x-ax)*vx+(zz-az)*vz)/(vx*vx+vz*vz||1)));d=Math.min(d,Math.hypot(x-(ax+t*vx),zz-(az+t*vz)));} if (d>0.005) { cnt[m.layer]=(cnt[m.layer]??0)+1; if (cnt[m.layer]<3) console.log(m.layer, x.toFixed(3), y.toFixed(3), zz.toFixed(3), d.toFixed(4)); } } }
console.log(cnt, res.removedTriangles, res.clippedTriangles);
