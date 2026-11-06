import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Vector3 } from "three";
import { importDxf } from "../src/core/dxf/import";
import { prepareScene } from "../src/core/scene";
import { buildCollider, Walker } from "../src/viewer/physics";
import { Zone, redBarrierTriangles, removeGreyGeometry, pointInPolygon } from "../src/core/zones";
import { buildPublicScene } from "../src/core/export/public-scene";
import { newProject } from "../src/core/project";
import { readGlb } from "../src/core/export/glb";

const model = importDxf(readFileSync(new URL("./fixtures/models/house_mm.dxf", import.meta.url), "utf8"));
const scene = prepareScene(model);
const a = scene.analysis;
/** DXF metres (x, y) → model plan (x, z) */
const plan = (x: number, y: number): [number, number] => [x - model.origin[0], -y - model.origin[2]];

function groundQuad(y: number, r = 200) {
  return { positions: new Float32Array([-r, y, -r, r, y, -r, r, y, r, -r, y, -r, r, y, r, -r, y, r]) };
}
function collider(zones: Zone[] = []) {
  return buildCollider([
    ...scene.parts.map((p) => ({ positions: p.positions, indices: p.indices })),
    groundQuad(a.groundY),
    { positions: redBarrierTriangles(zones) },
  ]);
}
/** Autopilot: walk towards each target in turn; returns trace of feet positions. */
function walkPath(w: Walker, targets: [number, number][], seconds = 40, onStep?: (p: Vector3) => void) {
  const trace: Vector3[] = [];
  let ti = 0;
  for (let t = 0; t < seconds && ti < targets.length; t += 1 / 30) {
    const [tx, tz] = targets[ti];
    const dx = tx - w.feet.x, dz = tz - w.feet.z;
    if (Math.hypot(dx, dz) < 0.25) { ti++; continue; }
    w.yaw = Math.atan2(-dx, -dz);
    w.update(1 / 30, { x: 0, z: 1 });
    trace.push(w.feet.clone());
    onStep?.(w.feet);
  }
  return { trace, reached: ti >= targets.length };
}

describe("automatic analysis of the test house", () => {
  it("finds 3 storeys incl. ground floor at slab height", () => {
    expect(a.levels.map((l) => l.name.de)).toEqual(["Erdgeschoss", "1. Obergeschoss", "Dachgeschoss"]);
    expect(a.levels[0].elevation + model.origin[1]).toBeCloseTo(0, 1);
    expect(a.levels[1].elevation + model.origin[1]).toBeCloseTo(3.0, 1);
  });
  it("finds the two upper-floor rooms separated by the inner wall", () => {
    const upper = a.rooms.filter((r) => r.level === 1);
    expect(upper.length).toBe(2);
    for (const r of upper) expect(r.area).toBeGreaterThan(35);
  });
  it("detects the front door in the south wall, facing into the house", () => {
    expect(a.entrance).not.toBeNull();
    const [ex, ez] = plan(6.0, 0);
    expect(a.entrance!.position[0]).toBeCloseTo(ex, 0);
    expect(Math.abs(a.entrance!.position[2] - ez)).toBeLessThan(0.5);
    expect(a.entrance!.inward[1]).toBe(-1); // towards +DXF-y = −Z
    expect(scene.start.outside).toBe(true);
  });
  it("suggests viewpoints and factual hotspots only", () => {
    expect(scene.viewpoints.length).toBeGreaterThanOrEqual(6);
    for (const h of scene.hotspotSuggestions) {
      expect(h.text).toBe("");
      expect(h.facts!.join(" ")).toMatch(/gemessen/);
    }
  });
  it("assigns plausible materials automatically", () => {
    const byCat = (c: string, role?: string) => scene.parts.filter((p) => p.category === c && (!role || p.role === role)).map((p) => p.auto.presetId);
    expect(byCat("glass")).toEqual(expect.arrayContaining(["glass"]));
    expect(byCat("roof")).toContain("roof_clay"); // red layer colour
    expect(byCat("ceiling", "top")).toContain("oak");
    expect(byCat("ceiling", "under")).toContain("plaster_white");
  });
});

describe("first-person walking", () => {
  it("walks from the start through the front door into the house", () => {
    const w = new Walker(collider());
    w.teleport(scene.start.position, scene.start.yaw);
    const e = a.entrance!;
    const inside: [number, number] = [e.position[0] + e.inward[0] * 2, e.position[2] + e.inward[1] * 2];
    const r = walkPath(w, [[e.position[0] - e.inward[0] * 1, e.position[2] - e.inward[1] * 1], inside]);
    expect(r.reached).toBe(true);
    expect(w.feet.y).toBeCloseTo(a.levels[0].elevation, 1); // stepped up onto the slab
  });

  it("cannot walk through an exterior wall", () => {
    const w = new Walker(collider());
    const [x, z] = plan(3, 5); // inside, living room
    w.teleport([x, a.levels[0].elevation + 0.05, z]);
    const [ox, oz] = plan(-3, 5); // 3 m outside the west wall (no window there at y=5? window is 3.5–4.7)
    walkPath(w, [[ox, oz]], 10);
    const [wallX] = plan(0, 0);
    expect(w.feet.x).toBeGreaterThan(wallX + 0.15);
  });

  it("climbs the stairs to the upper floor", () => {
    const w = new Walker(collider());
    const [x0, z0] = plan(10.15, 3.0);
    w.teleport([x0, a.levels[0].elevation + 0.05, z0]);
    const [x1, z1] = plan(10.15, 8.6);
    const [x2, z2] = plan(8.0, 8.0);
    const r = walkPath(w, [[x1, z1], [x2, z2]], 40);
    expect(r.reached).toBe(true);
    expect(w.feet.y).toBeCloseTo(a.levels[1].elevation, 1);
  });

  it("gravity: dropped from 2 m lands on the floor", () => {
    const w = new Walker(collider());
    const [x, z] = plan(3, 5);
    w.teleport([x, a.levels[0].elevation + 0.05, z]);
    w.feet.y += 2; w.onGround = false;
    for (let i = 0; i < 90; i++) w.update(1 / 60, { x: 0, z: 0 });
    expect(w.feet.y).toBeCloseTo(a.levels[0].elevation, 1);
  });
});

describe("restricted (red) and hidden (grey) zones", () => {
  const upper = a.rooms.filter((r) => r.level === 1);
  const lv = a.levels[1];
  const redRoom = upper.reduce((m, r) => (r.centroid[0] > m.centroid[0] ? r : m)); // east room
  const red: Zone = { id: "z1", kind: "red", polygon: redRoom.outline, yMin: lv.elevation - 0.2, yMax: lv.elevation + lv.height - 0.05, source: "room", roomId: redRoom.id };

  it("a red room cannot be entered on foot", () => {
    const w = new Walker(collider([red]));
    const west = upper.find((r) => r !== redRoom)!;
    w.teleport([west.centroid[0], lv.elevation + 0.05, west.centroid[1]]);
    let entered = false;
    walkPath(w, [[redRoom.centroid[0], redRoom.centroid[1]]], 20, (p) => {
      if (pointInPolygon(p.x, p.z, red.polygon) && p.y > red.yMin) entered = true;
    });
    expect(entered).toBe(false);
  });

  it("the same room is reachable without the restriction (control)", () => {
    const w = new Walker(collider([]));
    const west = upper.find((r) => r !== redRoom)!;
    w.teleport([west.centroid[0], lv.elevation + 0.05, west.centroid[1]]);
    const r = walkPath(w, [[plan(6.0, 5.5)[0] - 0.8, plan(6.0, 5.5)[1]], [plan(6.0, 5.5)[0] + 0.8, plan(6.0, 5.5)[1]], [redRoom.centroid[0], redRoom.centroid[1]]], 30);
    expect(r.reached).toBe(true);
  });

  it("grey zones are clipped out of the geometry and absent from the public GLB", () => {
    const grey: Zone = { ...red, id: "g1", kind: "grey" };
    const project = newProject("house_mm.dxf", "abc");
    project.zones = [grey];
    const pub = buildPublicScene(scene, project);
    const { json, positions } = readGlb(pub.glb);
    // strictly inside the grey prism (5 mm tolerance for cut faces on the boundary)
    let inside = 0;
    const shrink = (p: [number, number][]) => p; // polygon edges are exact cut planes
    for (const arr of positions)
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i], y = arr[i + 1], z = arr[i + 2];
        if (y > grey.yMin + 0.005 && y < grey.yMax - 0.005 && pointInPolygon(x, z, shrink(grey.polygon)) && distInside(x, z, grey.polygon) > 0.005) inside++;
      }
    expect(inside).toBe(0);
    expect(pub.stats.removedTriangles + pub.stats.clippedTriangles).toBeGreaterThan(0);
    // no layer names leak into the public file
    const txt = JSON.stringify(json);
    expect(txt).not.toMatch(/A-WAND|A-DECKE|A-FENSTER/);
    // grey zone outlines are not published, red zones are
    expect(JSON.stringify(pub.config)).not.toContain('"grey"');
  });

  it("removeGreyGeometry keeps everything when no grey zone exists", () => {
    const meshes = scene.parts.map((p) => ({ id: p.id, layer: p.layer, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: p.indices.length / 3 }));
    expect(removeGreyGeometry(meshes, [red]).removedTriangles).toBe(0);
  });
});

function distInside(x: number, z: number, poly: [number, number][]) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    d = Math.min(d, Math.hypot(x - (ax + t * vx), z - (az + t * vz)));
  }
  return d;
}
