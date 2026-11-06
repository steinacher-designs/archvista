import { removeGreyGeometry } from "../src/core/zones";
// unit square zone, triangle crossing it
const z = { id: "g", kind: "grey" as const, polygon: [[0,0],[2,0],[2,2],[0,2]] as [number,number][], yMin: 0, yMax: 3, source: "drawn" as const };
const m = { id: "a", layer: "x", color: 0, positions: new Float32Array([1,1,1, 5,1,1, 1,1,5]), normals: new Float32Array(9), indices: new Uint32Array([0,1,2]), triangleCount: 1 };
const r = removeGreyGeometry([m], [z]);
console.log(r.removedTriangles, r.clippedTriangles, Array.from(r.meshes[0]?.positions ?? []).map(v=>+v.toFixed(2)).join(" "));
