import { Quaternion, Vector3 } from 'three';
import type {
  FlamethrowerTierStats,
  GunTierStats,
  HammerTierStats,
  RocketTierStats,
  ShotgunTierStats,
} from '../../data/types';
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

export interface KillReport {
  zombie: Zombie;
  position: { x: number; y: number; z: number };
}

/** Advances burning zombies (flamethrower DoT) and returns those it killed this step. */
export function updateBurning(pool: ZombiePool, dt: number): KillReport[] {
  const kills: KillReport[] = [];
  for (const z of pool.active()) {
    if (z.burnTimeLeft <= 0 || !z.isAlive()) continue;
    z.burnTimeLeft = Math.max(0, z.burnTimeLeft - dt);
    if (z.takeDamage(z.burnDamagePerSecond * dt)) {
      const p = z.getPosition();
      kills.push({ zombie: z, position: { x: p.x, y: p.y, z: p.z } });
    }
  }
  return kills;
}

export interface MagazineState {
  rounds: number;
  magazine: number;
  reloading: boolean;
  reloadLeft: number;
}

/** D10: front-mounted cone of fire. Direct damage in the cone, then burning, and it drinks car fuel. */
export class Flamethrower {
  firing = false;
  private readonly toZombie = new Vector3();

  constructor(
    private readonly pool: ZombiePool,
    public stats: FlamethrowerTierStats,
    /** Draws fuel from the car; returns litres actually drawn (0 when the tank is dry). */
    private readonly drainFuel: (litres: number) => number
  ) {}

  update(dt: number, trigger: boolean, mount: WeaponMount): KillReport[] {
    const kills: KillReport[] = [];
    this.firing = false;
    if (!trigger) return kills;
    if (this.drainFuel(this.stats.fuelPerSecond * dt) <= 0) return kills;
    this.firing = true;
    const cosLimit = Math.cos(this.stats.cone);
    for (const z of this.pool.active()) {
      if (!z.isAlive()) continue;
      this.toZombie.copy(z.getPosition()).sub(mount.origin);
      const dist = this.toZombie.length();
      if (dist > this.stats.range || dist < 1e-3) continue;
      if (this.toZombie.dot(mount.direction) / dist < cosLimit) continue;
      z.burnTimeLeft = this.stats.burnSeconds;
      z.burnDamagePerSecond = this.stats.burnDamagePerSecond;
      if (z.takeDamage(this.stats.damagePerSecond * dt)) {
        const p = z.getPosition();
        kills.push({ zombie: z, position: { x: p.x, y: p.y, z: p.z } });
      }
    }
    return kills;
  }
}

const scratchDir = new Vector3();
const scratchRight = new Vector3();
const scratchUp = new Vector3(0, 1, 0);

/** D11: pump shotgun. Each shot is `pellets` rays inside the spread cone; magazine + reload. */
export class Shotgun {
  rounds: number;
  reloadLeft = 0;
  private pump = 0;
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly car: Vehicle,
    private readonly pool: ZombiePool,
    public stats: ShotgunTierStats,
    private readonly rng: () => number = Math.random
  ) {
    this.rounds = stats.magazine;
  }

  get state(): MagazineState {
    return {
      rounds: this.rounds,
      magazine: this.stats.magazine,
      reloading: this.reloadLeft > 0,
      reloadLeft: this.reloadLeft,
    };
  }

  update(dt: number, trigger: boolean, mount: WeaponMount): ShotEvent[] {
    this.pump = Math.max(0, this.pump - dt);
    if (this.reloadLeft > 0) {
      this.reloadLeft = Math.max(0, this.reloadLeft - dt);
      if (this.reloadLeft === 0) this.rounds = this.stats.magazine;
      return [];
    }
    if (!trigger || this.pump > 0) return [];
    if (this.rounds <= 0) {
      this.reloadLeft = this.stats.reloadSeconds;
      return [];
    }
    this.rounds--;
    this.pump = this.stats.pumpSeconds;
    if (this.rounds === 0) this.reloadLeft = this.stats.reloadSeconds;
    return this.firePellets(mount);
  }

  private firePellets(mount: WeaponMount): ShotEvent[] {
    const shots: ShotEvent[] = [];
    scratchRight.copy(mount.direction).cross(scratchUp).normalize();
    const localUp = new Vector3().copy(scratchRight).cross(mount.direction).normalize();
    for (let i = 0; i < this.stats.pellets; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = Math.sqrt(this.rng()) * this.stats.spread;
      scratchDir
        .copy(mount.direction)
        .addScaledVector(scratchRight, Math.cos(a) * Math.tan(r))
        .addScaledVector(localUp, Math.sin(a) * Math.tan(r))
        .normalize();
      this.ray.origin = { x: mount.origin.x, y: mount.origin.y, z: mount.origin.z };
      this.ray.dir = { x: scratchDir.x, y: scratchDir.y, z: scratchDir.z };
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
      const end = mount.origin.clone().addScaledVector(scratchDir, distance);
      let zombie: Zombie | null = null;
      let killed = false;
      if (hit) {
        zombie = this.pool.fromColliderHandle(hit.collider.handle) ?? null;
        if (zombie && zombie.isAlive()) killed = zombie.takeDamage(this.stats.damagePerPellet);
        else zombie = null;
      }
      shots.push({
        origin: mount.origin.clone(),
        end,
        hit: zombie,
        killed,
        damage: zombie ? this.stats.damagePerPellet : 0,
      });
    }
    return shots;
  }
}

export interface Rocket {
  active: boolean;
  readonly position: Vector3;
  readonly velocity: Vector3;
  age: number;
}

export interface Explosion {
  position: Vector3;
  radius: number;
  kills: KillReport[];
}

/** D11: rocket launcher. Rockets fly straight, explode on anything solid, and splash-damage zombies with falloff. */
export class RocketLauncher {
  rounds: number;
  reloadLeft = 0;
  readonly rockets: Rocket[] = [];
  private interval = 0;
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  private readonly step = new Vector3();

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly car: Vehicle,
    private readonly pool: ZombiePool,
    public stats: RocketTierStats,
    capacity = 12
  ) {
    this.rounds = stats.magazine;
    for (let i = 0; i < capacity; i++)
      this.rockets.push({
        active: false,
        position: new Vector3(),
        velocity: new Vector3(),
        age: 0,
      });
  }

  get state(): MagazineState {
    return {
      rounds: this.rounds,
      magazine: this.stats.magazine,
      reloading: this.reloadLeft > 0,
      reloadLeft: this.reloadLeft,
    };
  }

  /** Fires when asked and flies every rocket; returns explosions that happened this step. */
  update(dt: number, trigger: boolean, mount: WeaponMount): Explosion[] {
    this.interval = Math.max(0, this.interval - dt);
    if (this.reloadLeft > 0) {
      this.reloadLeft = Math.max(0, this.reloadLeft - dt);
      if (this.reloadLeft === 0) this.rounds = this.stats.magazine;
    } else if (trigger && this.interval <= 0) {
      if (this.rounds <= 0) this.reloadLeft = this.stats.reloadSeconds;
      else {
        const rocket = this.rockets.find((r) => !r.active);
        if (rocket) {
          rocket.active = true;
          rocket.age = 0;
          rocket.position.copy(mount.origin).addScaledVector(mount.direction, 1.5);
          rocket.velocity.copy(mount.direction).multiplyScalar(this.stats.speed);
          this.rounds--;
          this.interval = this.stats.fireInterval;
          if (this.rounds === 0) this.reloadLeft = this.stats.reloadSeconds;
        }
      }
    }

    const explosions: Explosion[] = [];
    for (const r of this.rockets) {
      if (!r.active) continue;
      r.age += dt;
      this.step.copy(r.velocity).multiplyScalar(dt);
      const length = this.step.length();
      this.ray.origin = { x: r.position.x, y: r.position.y, z: r.position.z };
      this.ray.dir = { x: this.step.x / length, y: this.step.y / length, z: this.step.z / length };
      const hit = this.physics.world.castRay(
        this.ray,
        length + 0.3,
        true,
        undefined,
        undefined,
        undefined,
        this.car.body
      );
      if (hit || r.position.y <= 0.05 || r.age > 6) {
        if (hit) r.position.addScaledVector(this.step, hit.timeOfImpact / Math.max(length, 1e-6));
        explosions.push(this.explode(r.position.clone()));
        r.active = false;
      } else {
        r.position.add(this.step);
      }
    }
    return explosions;
  }

  private explode(at: Vector3): Explosion {
    const kills: KillReport[] = [];
    const radius = this.stats.splashRadius;
    for (const z of this.pool.active()) {
      if (!z.isAlive()) continue;
      const d = z.getPosition().distanceTo(at);
      if (d > radius) continue;
      const damage = this.stats.damage * (1 - (0.6 * d) / radius);
      if (z.takeDamage(damage)) {
        const p = z.getPosition();
        kills.push({ zombie: z, position: { x: p.x, y: p.y, z: p.z } });
      }
    }
    return { position: at, radius, kills };
  }
}

/** M4: seconds a zombie ignores its own AI movement after a hammer knockback shove. */
const HAMMER_STUN_SECONDS = 0.35;

export interface SwingResult {
  /** True the step the cooldown expired and the hammer actually swung (whether or not it hit). */
  swung: boolean;
  hits: number;
  kills: KillReport[];
}

const hammerKnockbackDir = new Vector3();

/**
 * M4: a periodic AOE burst on its own cooldown - unlike the spike cluster (every physical
 * contact) or the saw (continuous while touching), the hammer needs no contact at all. Anything
 * within `radius` of the car when the cooldown expires takes damage and a knockback shove.
 */
export class HammerSwing {
  cooldownLeft = 0;

  constructor(
    private readonly pool: ZombiePool,
    public stats: HammerTierStats
  ) {}

  /** Call once per Playing tick with the car's current world position. */
  update(dt: number, carPosition: Vector3): SwingResult {
    this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    if (this.cooldownLeft > 0) return { swung: false, hits: 0, kills: [] };
    this.cooldownLeft = this.stats.cooldownSeconds;

    const kills: KillReport[] = [];
    let hits = 0;
    for (const z of this.pool.active()) {
      if (!z.isAlive()) continue;
      const d = z.getPosition().distanceTo(carPosition);
      if (d > this.stats.radius) continue;
      hits++;
      const killed = z.takeDamage(this.stats.damage);
      if (killed) {
        const p = z.getPosition();
        kills.push({ zombie: z, position: { x: p.x, y: p.y, z: p.z } });
        continue;
      }
      if (this.stats.knockback > 0) {
        hammerKnockbackDir.copy(z.getPosition()).sub(carPosition);
        hammerKnockbackDir.y = 0;
        if (hammerKnockbackDir.lengthSq() > 1e-6) {
          hammerKnockbackDir.normalize();
          z.setHorizontalVelocity(
            hammerKnockbackDir.x * this.stats.knockback,
            hammerKnockbackDir.z * this.stats.knockback
          );
          z.knockbackTimeLeft = HAMMER_STUN_SECONDS;
        }
      }
    }
    return { swung: true, hits, kills };
  }
}
