// ARCHVISTA — first-person walker: capsule vs. BVH collision, gravity, stairs, ground snapping.
// DOM-free so it runs in the browser and in automated Node tests.

import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Line3, Matrix4, Mesh, Ray, Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";

export interface WalkerOptions {
  radius: number;
  height: number;
  eye: number;
  stepHeight: number;
  gravity: number;
  walkSpeed: number;
  sprintSpeed: number;
  /** Visitors cannot leave this circle (site boundary), in plan x/z. */
  boundary?: { x: number; z: number; r: number };
}

export const DEFAULT_WALKER: WalkerOptions = {
  radius: 0.25, height: 1.8, eye: 1.65, stepHeight: 0.42, gravity: 9.81, walkSpeed: 1.6, sprintSpeed: 3.6,
};

/** Build a collision BVH from triangle soups (positions only). */
export function buildCollider(soups: { positions: Float32Array; indices?: Uint32Array | Uint16Array }[]): MeshBVH {
  let n = 0;
  for (const s of soups) n += s.indices ? s.indices.length : s.positions.length / 3;
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const s of soups) {
    if (s.indices) {
      for (let i = 0; i < s.indices.length; i++) {
        const v = s.indices[i] * 3;
        pos[o++] = s.positions[v]; pos[o++] = s.positions[v + 1]; pos[o++] = s.positions[v + 2];
      }
    } else { pos.set(s.positions, o); o += s.positions.length; }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return new MeshBVH(g);
}

export class Walker {
  readonly feet = new Vector3();
  readonly velocity = new Vector3();
  onGround = false;
  yaw = 0;
  pitch = 0;
  private seg = new Line3();
  private box = new Box3();
  private tv = new Vector3();
  private tv2 = new Vector3();
  private ray = new Ray();
  private mesh: Mesh;
  private eyeSmooth = 0;

  constructor(public bvh: MeshBVH, public opt: WalkerOptions = DEFAULT_WALKER) {
    this.mesh = new Mesh(bvh.geometry);
    this.mesh.matrixWorld = new Matrix4();
  }

  setCollider(bvh: MeshBVH) {
    this.bvh = bvh;
    this.mesh = new Mesh(bvh.geometry);
  }

  teleport(p: Vector3 | [number, number, number], yaw?: number) {
    if (Array.isArray(p)) this.feet.set(p[0], p[1], p[2]); else this.feet.copy(p);
    this.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = yaw;
    this.eyeSmooth = this.feet.y;
    this.onGround = false;
    this.snapDown(1.5);
  }

  /** Camera eye position (smoothed vertically so stair steps don't jerk). */
  eye(out = new Vector3()) {
    return out.set(this.feet.x, this.eyeSmooth + this.opt.eye, this.feet.z);
  }

  /**
   * Advance the simulation. `move` = desired horizontal direction in camera space
   * (x = strafe right, z = forward), each in [-1, 1].
   */
  update(dt: number, move: { x: number; z: number }, sprint = false) {
    dt = Math.min(dt, 0.1);
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    const speed = sprint ? this.opt.sprintSpeed : this.opt.walkSpeed;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward = (-sin, -cos) for yaw rotating around Y with camera looking down -Z
    let wx = move.x * cos - move.z * sin, wz = -move.x * sin - move.z * cos;
    const l = Math.hypot(wx, wz);
    if (l > 1) { wx /= l; wz /= l; }
    for (let i = 0; i < steps; i++) this.step(h, wx * speed, wz * speed);
    // eye smoothing: fast when going up, a bit softer when going down
    const k = 1 - Math.exp(-dt * 14);
    this.eyeSmooth += (this.feet.y - this.eyeSmooth) * k;
    if (Math.abs(this.feet.y - this.eyeSmooth) > 0.6) this.eyeSmooth = this.feet.y;
  }

  private step(dt: number, vx: number, vz: number) {
    const o = this.opt;
    if (this.onGround && (vx || vz)) this.tryStepUp(vx, vz);
    this.velocity.x = vx;
    this.velocity.z = vz;
    this.velocity.y = this.onGround ? Math.min(this.velocity.y, 0) : Math.max(this.velocity.y - o.gravity * dt, -30);
    const wasGround = this.onGround;
    this.feet.addScaledVector(this.velocity, dt);
    this.resolve();
    if (wasGround && !this.onGround && this.velocity.y <= 0) {
      if (this.snapDown(o.stepHeight + 0.05)) this.onGround = true;
    }
    if (o.boundary) {
      const dx = this.feet.x - o.boundary.x, dz = this.feet.z - o.boundary.z;
      const d = Math.hypot(dx, dz);
      if (d > o.boundary.r) { this.feet.x = o.boundary.x + (dx / d) * o.boundary.r; this.feet.z = o.boundary.z + (dz / d) * o.boundary.r; }
    }
    if (this.feet.y < -500) this.feet.y = -500; // safety
  }

  private resolve() {
    const o = this.opt;
    const seg = this.seg;
    seg.start.set(this.feet.x, this.feet.y + o.radius, this.feet.z);
    seg.end.set(this.feet.x, this.feet.y + o.height - o.radius, this.feet.z);
    const before = this.tv2.copy(seg.start);
    const tri = new Vector3(), cap = new Vector3();
    for (let iter = 0; iter < 3; iter++) {
      this.box.makeEmpty();
      this.box.expandByPoint(seg.start).expandByPoint(seg.end);
      this.box.min.addScalar(-o.radius); this.box.max.addScalar(o.radius);
      let moved = false;
      this.bvh.shapecast({
        intersectsBounds: (b) => b.intersectsBox(this.box),
        intersectsTriangle: (t) => {
          const dist = t.closestPointToSegment(seg, tri, cap);
          if (dist < o.radius) {
            const depth = o.radius - dist;
            const dir = this.tv.subVectors(cap, tri);
            if (dir.lengthSq() < 1e-12) t.getNormal(dir);
            dir.normalize();
            seg.start.addScaledVector(dir, depth);
            seg.end.addScaledVector(dir, depth);
            moved = true;
          }
          return false;
        },
      });
      if (!moved) break;
    }
    const delta = this.tv.subVectors(seg.start, before);
    this.onGround = delta.y > Math.abs(delta.length() * 0.25) && delta.y > 1e-6;
    // also grounded when resting exactly on a surface
    if (!this.onGround && this.velocity.y <= 0) this.onGround = this.groundBelow(0.02) !== null;
    this.feet.add(delta);
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;
  }

  /** Distance to walkable ground below the feet (≤ maxDist), or null. */
  groundBelow(maxDist: number): number | null {
    this.ray.origin.set(this.feet.x, this.feet.y + 0.05, this.feet.z);
    this.ray.direction.set(0, -1, 0);
    const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
    if (!hit || hit.distance - 0.05 > maxDist) return null;
    return hit.distance - 0.05;
  }

  private snapDown(maxDist: number): boolean {
    const d = this.groundBelow(maxDist);
    if (d === null) return false;
    this.feet.y -= d;
    this.velocity.y = 0;
    return true;
  }

  private tryStepUp(vx: number, vz: number) {
    const o = this.opt;
    const l = Math.hypot(vx, vz);
    const dx = vx / l, dz = vz / l;
    // several probe distances: robust against short treads and small gaps in real-world models
    for (const probe of [o.radius + 0.04, o.radius + 0.12, o.radius * 0.6]) {
      this.ray.origin.set(this.feet.x + dx * probe, this.feet.y + o.stepHeight + 0.02, this.feet.z + dz * probe);
      this.ray.direction.set(0, -1, 0);
      const hit = this.bvh.raycastFirst(this.ray, DoubleSide);
      if (!hit) continue;
      const rise = this.ray.origin.y - hit.distance - this.feet.y;
      if (rise <= 0.02 || rise > o.stepHeight) continue;
      if (hit.face && Math.abs(hit.face.normal.y) < 0.7) continue; // not a tread
      this.ray.origin.set(this.feet.x + dx * probe, hit.point.y + 0.05, this.feet.z + dz * probe);
      this.ray.direction.set(0, 1, 0);
      const up = this.bvh.raycastFirst(this.ray, DoubleSide);
      if (up && up.distance < o.height - 0.1) continue; // no headroom
      this.feet.y += rise + 0.005;
      return;
    }
  }
}
