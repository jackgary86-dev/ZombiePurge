import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { VehicleConfig, ZombieRank } from '../../data/types';
import type { Vehicle } from '../vehicle/Vehicle';
import type { Zombie } from '../zombies/Zombie';
import { ZOMBIE_CAPSULE } from '../zombies/Zombie';

/** I12 placeholder art: primitives that match the physics shapes until real models land (I3, I5). */

export interface CarView {
  group: Group;
  wheels: Mesh[];
  sync(car: Vehicle): void;
}

export function buildPlaceholderCar(cfg: VehicleConfig): CarView {
  const he = cfg.chassisHalfExtents;
  const group = new Group();
  group.name = 'car';

  const body = new Mesh(
    new BoxGeometry(he.x * 2, he.y * 2, he.z * 2),
    new MeshStandardMaterial({ color: 0xc8402e, roughness: 0.5, metalness: 0.2 })
  );
  body.castShadow = true;
  group.add(body);

  const cabin = new Mesh(
    new BoxGeometry(he.x * 1.6, he.y * 1.2, he.z * 0.9),
    new MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.3, metalness: 0.4 })
  );
  cabin.position.set(0, he.y * 1.4, -he.z * 0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeometry = new CylinderGeometry(cfg.wheels.radius, cfg.wheels.radius, 0.3, 18);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelMaterial = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wheels = [0, 1, 2, 3].map(() => {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.castShadow = true;
    return wheel;
  });

  const scratchQ = new Quaternion();
  const yawQ = new Quaternion();
  const up = new Vector3(0, 1, 0);
  return {
    group,
    wheels,
    sync(car: Vehicle) {
      car.getPosition(group.position);
      car.getQuaternion(group.quaternion);
      car.wheels.forEach((state, i) => {
        const wheel = wheels[i];
        if (!wheel.parent) group.parent?.add(wheel);
        wheel.position.copy(state.worldPosition);
        yawQ.setFromAxisAngle(up, -state.steerAngle);
        wheel.quaternion.copy(scratchQ.copy(group.quaternion).multiply(yawQ));
      });
    },
  };
}

const RANK_STYLE: Record<ZombieRank, { color: number; scale: number }> = {
  walker: { color: 0x8a9a7a, scale: 1 },
  runner: { color: 0xa0a070, scale: 0.95 },
  spitter: { color: 0x9cff3a, scale: 1 },
  brute: { color: 0x6f5a4a, scale: 1.35 },
  tank: { color: 0x555a50, scale: 1.8 },
  boss: { color: 0xff5a1f, scale: 2.8 },
};

const DEAD_TINT = new Color(0x3a3030);
const bodyGeometry = new CapsuleGeometry(
  ZOMBIE_CAPSULE.radius,
  ZOMBIE_CAPSULE.halfHeight * 2,
  4,
  8
);
const headGeometry = new SphereGeometry(0.2, 8, 6);
/**
 * B7: every zombie is one instance in two InstancedMeshes (body, head), so a horde of
 * hundreds costs two draw calls. Colour per instance comes from the rank; corpses tip
 * over and fade to grey. A simple LOD drops heads beyond `headLodDistance`.
 */
export class ZombieInstances {
  readonly bodies: InstancedMesh;
  readonly heads: InstancedMesh;
  headLodDistance = 120;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private readonly facingQ = new Quaternion();
  private readonly lieDownQ = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  private readonly up = new Vector3(0, 1, 0);
  private readonly color = new Color();
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private readonly lastRank: (ZombieRank | null)[];
  private readonly deadFade: number[];

  constructor(readonly capacity: number) {
    const material = new MeshStandardMaterial({ roughness: 0.95 });
    this.bodies = new InstancedMesh(bodyGeometry, material, capacity);
    this.heads = new InstancedMesh(headGeometry, material, capacity);
    for (const mesh of [this.bodies, this.heads]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < capacity; i++) {
        mesh.setMatrixAt(i, this.hidden);
        mesh.setColorAt(i, this.color.set(0xffffff));
      }
    }
    this.lastRank = new Array(capacity).fill(null);
    this.deadFade = new Array(capacity).fill(0);
  }

  /** Writes one instance per pool slot. `viewer` is the camera position for LOD. */
  sync(zombies: readonly Zombie[], viewer: Vector3): void {
    for (let i = 0; i < this.capacity; i++) {
      const z = zombies[i];
      if (!z || !z.active) {
        if (this.lastRank[i] !== null) {
          this.bodies.setMatrixAt(i, this.hidden);
          this.heads.setMatrixAt(i, this.hidden);
          this.lastRank[i] = null;
        }
        continue;
      }
      if (this.lastRank[i] !== z.rank) {
        this.lastRank[i] = z.rank;
        this.deadFade[i] = 0;
        this.color.set(RANK_STYLE[z.rank].color);
        this.bodies.setColorAt(i, this.color);
        this.heads.setColorAt(i, this.color);
      }
      const s = RANK_STYLE[z.rank].scale;
      z.getPosition(this.position);
      const yaw = Math.atan2(z.facing.x, z.facing.z);
      this.facingQ.setFromAxisAngle(this.up, yaw);
      if (z.state === 'dead') {
        this.quaternion.copy(this.facingQ).multiply(this.lieDownQ);
        this.position.y -= ZOMBIE_CAPSULE.halfHeight * s * 0.8;
        if (this.deadFade[i] < 1) {
          this.deadFade[i] = Math.min(1, this.deadFade[i] + 0.05);
          this.color.set(RANK_STYLE[z.rank].color).lerp(DEAD_TINT, this.deadFade[i]);
          this.bodies.setColorAt(i, this.color);
          this.heads.setColorAt(i, this.color);
        }
      } else {
        this.quaternion.copy(this.facingQ);
      }
      this.scale.set(s, s, s);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.bodies.setMatrixAt(i, this.matrix);

      if (this.position.distanceToSquared(viewer) > this.headLodDistance * this.headLodDistance) {
        this.heads.setMatrixAt(i, this.hidden);
      } else {
        // Head sits on top of the capsule in local space; rotate with the body.
        this.position.addScaledVector(
          this.up.clone().applyQuaternion(this.quaternion),
          (ZOMBIE_CAPSULE.halfHeight + ZOMBIE_CAPSULE.radius + 0.05) * s
        );
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.heads.setMatrixAt(i, this.matrix);
      }
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
  }
}

const globGeometry = new SphereGeometry(0.28, 8, 6);
const globMaterial = new MeshStandardMaterial({
  color: 0x9cff3a,
  emissive: 0x3a7a10,
  roughness: 0.4,
});

/** Pooled acid glob visuals for the Spitter's projectiles. */
export class ProjectileViews {
  readonly meshes: Mesh[];

  constructor(capacity: number) {
    this.meshes = Array.from({ length: capacity }, () => {
      const m = new Mesh(globGeometry, globMaterial);
      m.visible = false;
      return m;
    });
  }

  sync(projectiles: { active: boolean; position: Vector3 }[]): void {
    projectiles.forEach((p, i) => {
      const m = this.meshes[i];
      if (!m) return;
      m.visible = p.active;
      if (p.active) m.position.copy(p.position);
    });
  }
}
