import type { GameConfig, ZombieRank } from './types';

export const ZOMBIE_RANKS: ZombieRank[] = ['walker', 'runner', 'spitter', 'brute', 'tank', 'boss'];

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid game config:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

function positive(value: number, path: string, problems: string[]): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    problems.push(`${path} must be a positive number (got ${String(value)})`);
  }
}

function nonNegative(value: number, path: string, problems: string[]): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    problems.push(`${path} must be zero or greater (got ${String(value)})`);
  }
}

export function collectConfigProblems(config: GameConfig): string[] {
  const problems: string[] = [];

  if (config.physics.gravity >= 0) problems.push('physics.gravity must be negative (pulls down)');
  positive(config.physics.fixedTimeStep, 'physics.fixedTimeStep', problems);

  const v = config.vehicle;
  positive(v.mass, 'vehicle.mass', problems);
  positive(v.topSpeed, 'vehicle.topSpeed', problems);
  positive(v.acceleration, 'vehicle.acceleration', problems);
  positive(v.brakingDeceleration, 'vehicle.brakingDeceleration', problems);
  positive(v.reverseSpeed, 'vehicle.reverseSpeed', problems);
  positive(v.steering.maxAngle, 'vehicle.steering.maxAngle', problems);
  positive(v.steering.sensitivity, 'vehicle.steering.sensitivity', problems);
  positive(v.steering.returnSpeed, 'vehicle.steering.returnSpeed', problems);
  nonNegative(v.friction.rollingResistance, 'vehicle.friction.rollingResistance', problems);
  nonNegative(v.friction.airResistance, 'vehicle.friction.airResistance', problems);
  positive(v.handbrake.brakingMultiplier, 'vehicle.handbrake.brakingMultiplier', problems);
  positive(v.hp, 'vehicle.hp', problems);
  nonNegative(v.armor, 'vehicle.armor', problems);

  const c = config.camera;
  positive(c.distance, 'camera.distance', problems);
  positive(c.height, 'camera.height', problems);
  positive(c.baseFov, 'camera.baseFov', problems);
  nonNegative(c.speedFovBoost, 'camera.speedFovBoost', problems);
  positive(c.followLerp, 'camera.followLerp', problems);
  positive(c.orbitSensitivity, 'camera.orbitSensitivity', problems);
  positive(c.recenterSpeed, 'camera.recenterSpeed', problems);

  for (const rank of ZOMBIE_RANKS) {
    const z = config.zombies[rank];
    if (!z) {
      problems.push(`zombies.${rank} is missing`);
      continue;
    }
    if (z.rank !== rank) problems.push(`zombies.${rank}.rank must be "${rank}" (got "${z.rank}")`);
    positive(z.hp, `zombies.${rank}.hp`, problems);
    positive(z.speed, `zombies.${rank}.speed`, problems);
    positive(z.detectionRadius, `zombies.${rank}.detectionRadius`, problems);
    nonNegative(z.attackDamage, `zombies.${rank}.attackDamage`, problems);
    nonNegative(z.coinValue, `zombies.${rank}.coinValue`, problems);
    if (config.rewards.coinsPerRank[rank] === undefined) {
      problems.push(`rewards.coinsPerRank.${rank} is missing`);
    } else {
      nonNegative(config.rewards.coinsPerRank[rank], `rewards.coinsPerRank.${rank}`, problems);
    }
  }

  positive(config.rewards.metersPerDistanceCoin, 'rewards.metersPerDistanceCoin', problems);
  const kept = config.rewards.coinsKeptOnDeathPercent;
  if (typeof kept !== 'number' || kept < 0 || kept > 100) {
    problems.push(
      `rewards.coinsKeptOnDeathPercent must be between 0 and 100 (got ${String(kept)})`
    );
  }

  if (config.maps.length === 0) problems.push('maps must contain at least one map');
  const ids = new Set<string>();
  config.maps.forEach((map, i) => {
    if (!map.id) problems.push(`maps[${i}].id is required`);
    if (ids.has(map.id)) problems.push(`maps[${i}].id "${map.id}" is duplicated`);
    ids.add(map.id);
    positive(map.size, `maps[${i}].size`, problems);
    positive(map.fogDistance, `maps[${i}].fogDistance`, problems);
    for (const rank of map.zombieRanks) {
      if (!ZOMBIE_RANKS.includes(rank))
        problems.push(`maps[${i}].zombieRanks has unknown rank "${rank}"`);
      // The visibility advantage: the player must always see zombies before they notice the car.
      else if (config.zombies[rank].detectionRadius >= map.fogDistance) {
        problems.push(
          `maps[${i}] (${map.id}): zombies.${rank}.detectionRadius (${config.zombies[rank].detectionRadius}) must be less than fogDistance (${map.fogDistance})`
        );
      }
    }
  });

  return problems;
}

export function assertValidConfig(config: GameConfig): void {
  const problems = collectConfigProblems(config);
  if (problems.length > 0) throw new ConfigError(problems);
}
