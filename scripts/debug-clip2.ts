import { earClip } from "../src/core/dxf/build";
const poly: [number,number][] = [[0,0],[2,0],[2,2],[0,2]];
console.log(JSON.stringify(earClip(poly.map(([x,z]) => [x,z,0] as [number,number,number]))));
