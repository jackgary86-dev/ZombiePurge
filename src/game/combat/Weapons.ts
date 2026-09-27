import { Quaternion, Vector3 } from 'three';
import type { GunTierStats } from '../../data/types';
import { PhysicsWorld, RAPIER } from '../physics/PhysicsWorld';
import type { Vehicle } from '../vehicle/Vehicle';
import type { Zombie } from '../zombies/Zombie';
import type { ZombiePool } from '../zombies/ZombiePool';

export type AimMode = 'camera' | 'auto';

export interface MountConfig {
  /** Local offset from the chassis centre where shots originate. */
  localOffset: Vector3;
}

export const ROOF_MOUNT: MountConfig = { localOffset: new Vector3(0, 0.8, 0.2) };
export const FRONT_MOUNT: MountConfig = { localOffset: new Vector3(0, 0.1, 2.2) };

export interface ShotEvent {
  origin: Vector3;
  end: Vector3;
  hit: Zombie | null;
  killed: boolean;
  damage: number;
}

export interface WeaponState {
  heat: number;
  overheated: boolean;
  firing: boolean;
}

const LOCAL_FORWARD = new Vector3(0, 0, 1);

/**
 * D8: a mount on the car that resolves where a weapon aims each step - toward the
 * camera's look direction, or auto-aimed at the nearest live zombie inside a cone.
 */
export class WeaponMount {
  readonly origin = new Vector3();
  readonly direction = new Vector3(0, 0, 1);
  aimMode: AimMode = 'auto';
  target: Zombie | null = null;
  private readonly q = new Quaternion();
  private readonly forward = new Vector3();
  private readonly toTarget = new Vector3();

  constructor(
    private readonly car: Vehicle,
    private readonly cfg: MountConfig
  ) {}

  /** Recomputes origin/direction. `cameraDir` is the camera's world look direction. */
  update(pool: ZombiePool, cameraDir: Vector3, coneHalfAngle: number, range: number): void {
    this.car.getQuaternion(this.q);
    this.origin.copy(this.cfg.localOffset).applyQuaternion(this.q).add(this.car.getPosition());
    this.forward.copy(LOCAL_FORWARD).applyQuaternion(this.q);
    this.forward.y = 0;
    this.forward.normalize();

    this.target = null;
    if (this.aimMode === 'auto') {
      this.target = this.nearestInCone(pool, this.forward, coneHalfAngle, range);
    }
    if (this.target) {
      this.toTarget.copy(this.target.getPosition()).sub(this.origin);
      this.toTarget.y += 0.3; // aim at the chest, not the feet
      this.direction.copy(this.toTarget).normalize();
    } else if (this.aimMode === 'camera') {
      this.direction.copy(cameraDir).normalize();
      if (this.direction.lengthSq() < 1e-6) this.direction.copy(this.forward);
    } else {
      this.direction.copy(this.forward);
    }
  }

  nearestInCone(
    pool: ZombiePool,
    axis: Vector3,
    coneHalfAngle: number,
    range: number
  ): Zombie | null {
    const cosLimit = Math.cos(coneHalfAngle);
    let best: Zombie | null = null;
    let bestDist = range * range;
    for (const z of pool.active()) {
      if (!z.isAlive()) continue;
      this.toTarget.copy(z.getPosition()).sub(this.origin);
      const d2 = this.toTarget.lengthSq();
      if (d2 > bestDist || d2 < 1e-6) continue;
      this.toTarget.y = 0;
      const cos = this.toTarget.dot(axis) / Math.max(this.toTarget.length(), 1e-6);
      if (cos < cosLimit) continue;
      best = z;
      bestDist = d2;
    }
    return best;
  }

  /** Yaw of the current aim relative to the car, for the turret visual. */
  yawRelativeToCar(): number {
    const local = this.direction.clone().applyQuaternion(this.q.clone().invert());
    return Math.atan2(local.x, local.z);
  }
}

/** D9: hitscan machine gun with heat. Holding fire past 100% heat locks it until it cools. */
export class MachineGun {
  heat = 0;
  overheated = false;
  private cooldown = 0;
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  private readonly end = new Vector3();

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly car: Vehicle,
    private readonly pool: ZombiePool,
    public stats: GunTierStats
  ) {}

  get state(): WeaponState {
    return { heat: this.heat, overheated: this.overheated, firing: this.cooldown > 0 };
  }

  /** Advances heat and fires from the mount while `trigger` is held. Returns the shots fired this step. */
  update(dt: number, trigger: boolean, mount: WeaponMount): ShotEvent[] {
    const shots: ShotEvent[] = [];
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.overheated && this.heat <= this.stats.unlockHeat) this.overheated = false;

    if (trigger && !this.overheated) {
      while (this.cooldown <= 0 && !this.overheated) {
        shots.push(this.fire(mount));
        this.cooldown += 1 / this.stats.fireRate;
        this.heat = Math.min(1, this.heat + this.stats.heatPerShot);
        if (this.heat >= 1) this.overheated = true;
      }
    } else {
      this.heat = Math.max(0, this.heat - this.stats.coolPerSecond * dt);
    }
    return shots;
  }

  private fire(mount: WeaponMount): ShotEvent {
    this.ray.origin = { x: mount.origin.x, y: mount.origin.y, z: mount.origin.z };
    this.ray.dir = { x: mount.direction.x, y: mount.direction.y, z: mount.direction.z };
    const hit = this.physics.world.castRay(
      this.ray,
      this.stats.range,
      true,
      undefined,
      undefined,
      undefined,
      this.car.body
    );
    const distance = hit ? hit.timeOfImpact : this.stats.range;
    this.end.copy(mount.origin).addScaledVector(mount.direction, distance);
    let zombie: Zombie | null = null;
    let killed = false;
    if (hit) {
      zombie = this.pool.fromColliderHandle(hit.collider.handle) ?? null;
      if (zombie && zombie.isAlive()) killed = zombie.takeDamage(this.stats.damage);
      else zombie = null;
    }
    return {
      origin: mount.origin.clone(),
      end: this.end.clone(),
      hit: zombie,
      killed,
      damage: zombie ? this.stats.damage : 0,
    };
  }
}
