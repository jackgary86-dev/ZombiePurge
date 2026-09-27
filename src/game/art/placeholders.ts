import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
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
const materials = new Map<ZombieRank, MeshStandardMaterial>();

function rankMaterial(rank: ZombieRank): MeshStandardMaterial {
  let m = materials.get(rank);
  if (!m) {
    m = new MeshStandardMaterial({ color: RANK_STYLE[rank].color, roughness: 0.95 });
    materials.set(rank, m);
  }
  return m;
}

/** One reusable visual per pool slot; restyled on each spawn. */
export class ZombieView {
  readonly group = new Group();
  private readonly body: Mesh;
  private readonly head: Mesh;
  private readonly material = new MeshStandardMaterial({ roughness: 0.95 });
  private rank: ZombieRank | null = null;
  private readonly facingQ = new Quaternion();
  private readonly lieDownQ = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  private readonly up = new Vector3(0, 1, 0);

  constructor() {
    this.body = new Mesh(bodyGeometry, this.material);
    this.body.castShadow = true;
    this.head = new Mesh(headGeometry, this.material);
    this.head.position.y = ZOMBIE_CAPSULE.halfHeight + ZOMBIE_CAPSULE.radius + 0.05;
    this.group.add(this.body, this.head);
    this.group.visible = false;
  }

  sync(z: Zombie): void {
    if (!z.active) {
      this.group.visible = false;
      this.rank = null;
      return;
    }
    if (this.rank !== z.rank) {
      this.rank = z.rank;
      this.material.color.copy(rankMaterial(z.rank).color);
      const s = RANK_STYLE[z.rank].scale;
      this.group.scale.set(s, s, s);
    }
    this.group.visible = true;
    z.getPosition(this.group.position);
    const yaw = Math.atan2(z.facing.x, z.facing.z);
    this.facingQ.setFromAxisAngle(this.up, yaw);
    if (z.state === 'dead') {
      // Corpse: tip over and fade toward grey while it lingers.
      this.group.quaternion.copy(this.facingQ).multiply(this.lieDownQ);
      this.group.position.y -= ZOMBIE_CAPSULE.halfHeight * this.group.scale.y * 0.8;
      this.material.color.lerp(DEAD_TINT, 0.05);
    } else {
      this.group.quaternion.copy(this.facingQ);
    }
  }
}
