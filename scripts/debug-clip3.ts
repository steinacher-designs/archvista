import { convexPieces } from "../src/core/zones";
const z = { id: "g", kind: "grey" as const, polygon: [[0,0],[2,0],[2,2],[0,2]] as [number,number][], yMin: 0, yMax: 3, source: "drawn" as const };
for (const pc of convexPieces(z)) console.log(JSON.stringify(pc.map(p => [p.n.map(v=>+v.toFixed(2)), +p.d.toFixed(2)])));
