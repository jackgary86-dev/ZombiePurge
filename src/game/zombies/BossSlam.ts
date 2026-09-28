import type { Vector3 } from 'three';
import type { Zombie } from './Zombie';

/**
 * F4: a boss's ground-slam AOE — independent of its normal melee/ranged attack, so
 * every boss (whatever its moveset) gets this on top. Returns the damage dealt to the
 * car this step (0 most steps: out of range, on cooldown, no slam configured, or dead).
 */
export function updateBossSlam(z: Zombie, dt: number, carPosition: Vector3): number {
  if (!z.cfg.slam || !z.isAlive()) return 0;
  z.slamCooldown = Math.max(0, z.slamCooldown - dt);
  if (z.slamCooldown > 0) return 0;
  const pos = z.getPosition();
  const dx = carPosition.x - pos.x;
  const dz = carPosition.z - pos.z;
  if (dx * dx + dz * dz > z.cfg.slam.radius * z.cfg.slam.radius) return 0;
  z.slamCooldown = z.cfg.slam.cooldown;
  return z.cfg.slam.damage;
}
