import { Vector3 } from 'three';
import type { ShotRequest } from './ZombieAI';

export interface Projectile {
  active: boolean;
  readonly position: Vector3;
  readonly velocity: Vector3;
  damage: number;
  hitRadius: number;
  age: number;
}

export interface ProjectileHit {
  position: Vector3;
  damage: number;
}

const GRAVITY = -9.81;
const MAX_AGE = 6;
const scratch = new Vector3();

/**
 * Simple ballistic acid globs (Spitter). Pure math rather than physics bodies:
 * a hit is a distance check against the car, and misses splash on the ground.
 */
export class ProjectileSystem {
  readonly projectiles: Projectile[] = [];

  constructor(capacity = 64) {
    for (let i = 0; i < capacity; i++) {
      this.projectiles.push({
        active: false,
        position: new Vector3(),
        velocity: new Vector3(),
        damage: 0,
        hitRadius: 1,
        age: 0,
      });
    }
  }

  /** Launches toward the target with a lobbed arc that lands on it at the configured speed. */
  fire(shot: ShotRequest): Projectile | null {
    const p = this.projectiles.find((x) => !x.active);
    if (!p) return null;
    p.active = true;
    p.age = 0;
    p.damage = shot.damage;
    p.hitRadius = shot.hitRadius;
    p.position.copy(shot.origin);
    aimBallistic(shot.origin, shot.target, shot.speed, p.velocity);
    return p;
  }

  /** Advances globs and returns hits on the car (its position and a rough radius). */
  update(dt: number, carPosition: Vector3, carRadius: number): ProjectileHit[] {
    const hits: ProjectileHit[] = [];
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.age += dt;
      p.velocity.y += GRAVITY * dt;
      p.position.addScaledVector(p.velocity, dt);
      const near = scratch.copy(p.position).sub(carPosition).length() <= p.hitRadius + carRadius;
      if (near) {
        hits.push({ position: p.position.clone(), damage: p.damage });
        p.active = false;
      } else if (p.position.y <= 0 || p.age > MAX_AGE) {
        p.active = false;
      }
    }
    return hits;
  }

  get activeCount(): number {
    return this.projectiles.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }
}

/**
 * Sets `out` to a launch velocity of magnitude `speed` that lands on `target`,
 * preferring the low arc. Falls back to a 45 degree lob if the target is out of reach.
 */
export function aimBallistic(
  origin: Vector3,
  target: Vector3,
  speed: number,
  out: Vector3
): Vector3 {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dz);
  const g = -GRAVITY;
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * dist * dist + 2 * dy * v2);
  let angle: number;
  if (disc < 0 || dist < 1e-3) {
    angle = Math.PI / 4;
  } else {
    angle = Math.atan2(v2 - Math.sqrt(disc), g * dist);
  }
  const horizontal = Math.cos(angle) * speed;
  const nx = dist > 1e-3 ? dx / dist : 0;
  const nz = dist > 1e-3 ? dz / dist : 1;
  return out.set(nx * horizontal, Math.sin(angle) * speed, nz * horizontal);
}
