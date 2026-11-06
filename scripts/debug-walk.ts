import { readFileSync } from "node:fs";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildCollider, Walker } from "../src/viewer/physics";
const model = importDxf(readFileSync("tests/fixtures/models/house_mm.dxf", "utf8"));
const scene = prepareScene(model); const a = scene.analysis;
const plan = (x: number, y: number): [number, number] => [x - model.origin[0], -y - model.origin[2]];
const r = 200, y = a.groundY;
const w = new Walker(buildCollider([...scene.parts.map(p => ({ positions: p.positions, indices: p.indices })), { positions: new Float32Array([-r,y,-r,r,y,-r,r,y,r,-r,y,-r,r,y,r,-r,y,r]) }]));
const mode = process.argv[2];
let targets: [number,number][];
if (mode === "door") { const e = a.entrance!; w.teleport(scene.start.position, scene.start.yaw); targets = [[e.position[0], e.position[2]+1],[e.position[0], e.position[2]-3]]; console.log("start", scene.start.position, "groundY", y, "lvl", a.levels[0].elevation); }
else { const [x0,z0]=plan(10.15,3.0); w.teleport([x0, a.levels[0].elevation+0.05, z0]); targets=[plan(10.15,8.6)]; }
let ti=0;
for (let t=0;t<20 && ti<targets.length;t+=1/30){ const [tx,tz]=targets[ti]; const dx=tx-w.feet.x,dz=tz-w.feet.z; if(Math.hypot(dx,dz)<0.25){ti++;continue;} w.yaw=Math.atan2(-dx,-dz); w.update(1/30,{x:0,z:1}); if (Math.round(t*30)%10===0) console.log(t.toFixed(2), w.feet.toArray().map(v=>v.toFixed(2)).join(","), w.onGround); }
console.log("reached", ti);
