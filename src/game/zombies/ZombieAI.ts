import { Vector3 } from 'three';
import type { Zombie } from './Zombie';

export interface ZombieSenses {
  /** Car position in world space. */
  carPosition: Vector3;
  /** Car forward speed magnitude, m/s. Fast driving is loud and extends detection. */
  carSpeed: number;
  /** Extra detection multiplier from other noise (gunfire, explosions). 0 = none. */
  noise: number;
}

export interface ZombieAIConfig {
  idleTimeMin: number;
  idleTimeMax: number;
  wanderTimeMin: number;
  wanderTimeMax: number;
  wanderSpeedFactor: number;
  alertedPause: number;
  /** Detection radius multiplier while the car is loud. */
  loudMultiplier: number;
  /** Speed above which the car counts as loud. */
  loudSpeed: number;
  /** Chase gives up beyond detectionRadius * this. */
  loseInterestFactor: number;
  attackRange: number;
  attackCooldown: number;
  /** Seconds a corpse lingers before it can be despawned. */
  deathLinger: number;
}

export const DEFAULT_ZOMBIE_AI: ZombieAIConfig = {
  idleTimeMin: 1.5,
  idleTimeMax: 4,
  wanderTimeMin: 2,
  wanderTimeMax: 5,
  wanderSpeedFactor: 0.4,
  alertedPause: 0.5,
  loudMultiplier: 1.5,
  loudSpeed: 15,
  loseInterestFactor: 2.5,
  attackRange: 2.4,
  attackCooldown: 1,
  deathLinger: 4,
};

export interface ShotRequest {
  origin: Vector3;
  /** Aim point (the car's position when fired). */
  target: Vector3;
  speed: number;
  damage: number;
  hitRadius: number;
}

export interface ZombieAIResult {
  /** Melee damage dealt to the car this update (0 when none). */
  damage: number;
  /** A ranged shot to spawn this update, if any. */
  shot?: ShotRequest;
}

const toCar = new Vector3();

/**
 * Advances one zombie's behaviour by dt. Pure logic over the Zombie's public
 * state; movement is handed to physics via setHorizontalVelocity. `rng` is
 * injectable so tests are deterministic.
 */
export function updateZombieAI(
  z: Zombie,
  dt: number,
  senses: ZombieSenses,
  cfg: ZombieAIConfig = DEFAULT_ZOMBIE_AI,
  rng: () => number = Math.random
): ZombieAIResult {
  z.stateTime += dt;
  z.attackCooldown = Math.max(0, z.attackCooldown - dt);

  if (z.state === 'dead') {
    z.setHorizontalVelocity(0, 0);
    return { damage: 0 };
  }

  const pos = z.getPosition();
  toCar.copy(senses.carPosition).sub(pos);
  toCar.y = 0;
  const distance = toCar.length();
  const loud = senses.carSpeed > cfg.loudSpeed ? cfg.loudMultiplier : 1;
  const detection = z.cfg.detectionRadius * loud * (1 + senses.noise);

  switch (z.state) {
    case 'idle': {
      z.setHorizontalVelocity(0, 0);
      if (distance <= detection) {
        z.setState('alerted');
      } else if (z.stateTime >= lerp(cfg.idleTimeMin, cfg.idleTimeMax, rng())) {
        z.wanderHeading = rng() * Math.PI * 2;
        z.setState('wander');
      }
      break;
    }
    case 'wander': {
      const speed = z.cfg.speed * cfg.wanderSpeedFactor;
      z.setHorizontalVelocity(Math.sin(z.wanderHeading) * speed, Math.cos(z.wanderHeading) * speed);
      if (distance <= detection) {
        z.setState('alerted');
      } else if (z.stateTime >= lerp(cfg.wanderTimeMin, cfg.wanderTimeMax, rng())) {
        z.setState('idle');
      }
      break;
    }
    case 'alerted': {
      // Freeze and turn toward the car before giving chase.
      z.setHorizontalVelocity(0, 0);
      if (distance > 1e-3) z.facing.copy(toCar).normalize();
      if (z.stateTime >= cfg.alertedPause) z.setState('chase');
      break;
    }
    case 'chase': {
      if (distance > z.cfg.detectionRadius * cfg.loseInterestFactor) {
        z.setState('idle');
        break;
      }
      const ranged = z.cfg.rangedAttack;
      if (ranged ? distance <= ranged.range : distance <= cfg.attackRange) {
        z.setState('attack');
        break;
      }
      const inv = z.cfg.speed / Math.max(distance, 1e-3);
      z.setHorizontalVelocity(toCar.x * inv, toCar.z * inv);
      break;
    }
    case 'attack': {
      z.setHorizontalVelocity(0, 0);
      if (distance > 1e-3) z.facing.copy(toCar).normalize();
      const ranged = z.cfg.rangedAttack;
      if (ranged) {
        // Spitter: stand off and lob acid; it only bites if the car is right on top of it.
        if (distance > ranged.range * 1.3) {
          z.setState('chase');
          break;
        }
        if (z.attackCooldown === 0) {
          z.attackCooldown = ranged.cooldown;
          const origin = pos.clone();
          origin.y += 1.2;
          return {
            damage: distance <= cfg.attackRange ? z.cfg.attackDamage : 0,
            shot: {
              origin,
              target: senses.carPosition.clone(),
              speed: ranged.projectileSpeed,
              damage: ranged.damage,
              hitRadius: ranged.hitRadius,
            },
          };
        }
        break;
      }
      if (distance > cfg.attackRange * 1.5) {
        z.setState('chase');
        break;
      }
      if (z.attackCooldown === 0) {
        z.attackCooldown = cfg.attackCooldown;
        return { damage: z.cfg.attackDamage };
      }
      break;
    }
  }
  return { damage: 0 };
}

export function canDespawnCorpse(z: Zombie, cfg: ZombieAIConfig = DEFAULT_ZOMBIE_AI): boolean {
  return z.state === 'dead' && z.stateTime >= cfg.deathLinger;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
