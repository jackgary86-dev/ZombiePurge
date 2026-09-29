import type { GameConfig, UpgradeCategory, ZombieRank } from './types';

export const ZOMBIE_RANKS: ZombieRank[] = [
  'walker',
  'runner',
  'spitter',
  'brute',
  'tank',
  'iceZombie',
  'boss',
];

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
  positive(v.chassisHalfExtents.x, 'vehicle.chassisHalfExtents.x', problems);
  positive(v.chassisHalfExtents.y, 'vehicle.chassisHalfExtents.y', problems);
  positive(v.chassisHalfExtents.z, 'vehicle.chassisHalfExtents.z', problems);
  positive(v.wheels.radius, 'vehicle.wheels.radius', problems);
  positive(v.wheels.halfTrack, 'vehicle.wheels.halfTrack', problems);
  positive(v.wheels.halfWheelbase, 'vehicle.wheels.halfWheelbase', problems);
  if (!Number.isFinite(v.wheels.attachHeight))
    problems.push('vehicle.wheels.attachHeight must be a number');
  positive(v.suspension.restLength, 'vehicle.suspension.restLength', problems);
  positive(v.suspension.stiffness, 'vehicle.suspension.stiffness', problems);
  nonNegative(v.suspension.damping, 'vehicle.suspension.damping', problems);
  positive(v.tires.grip, 'vehicle.tires.grip', problems);
  positive(v.tires.maxFriction, 'vehicle.tires.maxFriction', problems);
  positive(v.tires.handbrakeGripMultiplier, 'vehicle.tires.handbrakeGripMultiplier', problems);
  positive(v.steering.maxAngle, 'vehicle.steering.maxAngle', problems);
  if (v.steering.highSpeedFactor <= 0 || v.steering.highSpeedFactor > 1) {
    problems.push(
      `vehicle.steering.highSpeedFactor must be in (0, 1] (got ${String(v.steering.highSpeedFactor)})`
    );
  }
  nonNegative(v.airControl.pitchTorque, 'vehicle.airControl.pitchTorque', problems);
  nonNegative(v.airControl.yawTorque, 'vehicle.airControl.yawTorque', problems);
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
    if (z.rangedAttack) {
      positive(z.rangedAttack.range, `zombies.${rank}.rangedAttack.range`, problems);
      positive(
        z.rangedAttack.projectileSpeed,
        `zombies.${rank}.rangedAttack.projectileSpeed`,
        problems
      );
      positive(z.rangedAttack.cooldown, `zombies.${rank}.rangedAttack.cooldown`, problems);
      nonNegative(z.rangedAttack.damage, `zombies.${rank}.rangedAttack.damage`, problems);
      positive(z.rangedAttack.hitRadius, `zombies.${rank}.rangedAttack.hitRadius`, problems);
      if (z.rangedAttack.range >= z.detectionRadius) {
        problems.push(`zombies.${rank}.rangedAttack.range must be less than detectionRadius`);
      }
    }
    nonNegative(z.coinValue, `zombies.${rank}.coinValue`, problems);
    if (config.rewards.coinsPerRank[rank] === undefined) {
      problems.push(`rewards.coinsPerRank.${rank} is missing`);
    } else {
      nonNegative(config.rewards.coinsPerRank[rank], `rewards.coinsPerRank.${rank}`, problems);
    }
  }

  positive(config.rewards.metersPerDistanceCoin, 'rewards.metersPerDistanceCoin', problems);
  if (config.combat.machineGun.length === 0)
    problems.push('combat.machineGun needs at least one tier');
  config.combat.machineGun.forEach((g, i) => {
    positive(g.damage, `combat.machineGun[${i}].damage`, problems);
    positive(g.fireRate, `combat.machineGun[${i}].fireRate`, problems);
    positive(g.range, `combat.machineGun[${i}].range`, problems);
    positive(g.heatPerShot, `combat.machineGun[${i}].heatPerShot`, problems);
    positive(g.coolPerSecond, `combat.machineGun[${i}].coolPerSecond`, problems);
    if (g.unlockHeat <= 0 || g.unlockHeat >= 1)
      problems.push(`combat.machineGun[${i}].unlockHeat must be between 0 and 1`);
    positive(g.autoAimCone, `combat.machineGun[${i}].autoAimCone`, problems);
  });
  config.combat.flamethrower.forEach((f, i) => {
    positive(f.damagePerSecond, `combat.flamethrower[${i}].damagePerSecond`, problems);
    positive(f.range, `combat.flamethrower[${i}].range`, problems);
    positive(f.cone, `combat.flamethrower[${i}].cone`, problems);
    nonNegative(f.burnSeconds, `combat.flamethrower[${i}].burnSeconds`, problems);
    nonNegative(f.burnDamagePerSecond, `combat.flamethrower[${i}].burnDamagePerSecond`, problems);
    nonNegative(f.fuelPerSecond, `combat.flamethrower[${i}].fuelPerSecond`, problems);
  });
  config.combat.shotgun.forEach((g, i) => {
    positive(g.pellets, `combat.shotgun[${i}].pellets`, problems);
    positive(g.damagePerPellet, `combat.shotgun[${i}].damagePerPellet`, problems);
    positive(g.spread, `combat.shotgun[${i}].spread`, problems);
    positive(g.range, `combat.shotgun[${i}].range`, problems);
    positive(g.pumpSeconds, `combat.shotgun[${i}].pumpSeconds`, problems);
    positive(g.magazine, `combat.shotgun[${i}].magazine`, problems);
    positive(g.reloadSeconds, `combat.shotgun[${i}].reloadSeconds`, problems);
  });
  config.combat.rockets.forEach((r, i) => {
    positive(r.damage, `combat.rockets[${i}].damage`, problems);
    positive(r.splashRadius, `combat.rockets[${i}].splashRadius`, problems);
    positive(r.speed, `combat.rockets[${i}].speed`, problems);
    positive(r.magazine, `combat.rockets[${i}].magazine`, problems);
    positive(r.reloadSeconds, `combat.rockets[${i}].reloadSeconds`, problems);
    positive(r.fireInterval, `combat.rockets[${i}].fireInterval`, problems);
  });
  nonNegative(config.combat.runOverMinSpeed, 'combat.runOverMinSpeed', problems);
  positive(config.combat.runOverDamageFactor, 'combat.runOverDamageFactor', problems);
  positive(config.combat.impactFullSpeed, 'combat.impactFullSpeed', problems);
  for (const rank of ZOMBIE_RANKS) {
    const dmg = config.combat.impactDamageToCar[rank];
    if (dmg === undefined) problems.push(`combat.impactDamageToCar.${rank} is missing`);
    else nonNegative(dmg, `combat.impactDamageToCar.${rank}`, problems);
  }
  const combo = config.rewards.combo;
  positive(combo.windowSeconds, 'rewards.combo.windowSeconds', problems);
  positive(combo.killsPerStep, 'rewards.combo.killsPerStep', problems);
  if (!Number.isInteger(combo.maxMultiplier) || combo.maxMultiplier < 1) {
    problems.push(
      `rewards.combo.maxMultiplier must be an integer >= 1 (got ${String(combo.maxMultiplier)})`
    );
  }
  const kept = config.rewards.coinsKeptOnDeathPercent;
  if (typeof kept !== 'number' || kept < 0 || kept > 100) {
    problems.push(
      `rewards.coinsKeptOnDeathPercent must be between 0 and 100 (got ${String(kept)})`
    );
  }

  const hud = config.hud;
  if (hud.lowHpFraction <= 0 || hud.lowHpFraction >= 1) {
    problems.push(`hud.lowHpFraction must be between 0 and 1 (got ${String(hud.lowHpFraction)})`);
  }
  if (hud.lowFuelFraction <= 0 || hud.lowFuelFraction >= 1) {
    problems.push(
      `hud.lowFuelFraction must be between 0 and 1 (got ${String(hud.lowFuelFraction)})`
    );
  }
  positive(hud.counterPulseSeconds, 'hud.counterPulseSeconds', problems);

  const shake = config.vfx.screenShake;
  nonNegative(shake.perDamage, 'vfx.screenShake.perDamage', problems);
  nonNegative(shake.perKill, 'vfx.screenShake.perKill', problems);
  positive(shake.max, 'vfx.screenShake.max', problems);
  positive(shake.decayPerSecond, 'vfx.screenShake.decayPerSecond', problems);

  const slowMo = config.vfx.slowMo;
  if (!Number.isInteger(slowMo.multiKillThreshold) || slowMo.multiKillThreshold < 2) {
    problems.push(
      `vfx.slowMo.multiKillThreshold must be an integer >= 2 (got ${String(slowMo.multiKillThreshold)})`
    );
  }
  if (slowMo.timeScale <= 0 || slowMo.timeScale >= 1) {
    problems.push(`vfx.slowMo.timeScale must be between 0 and 1 (got ${String(slowMo.timeScale)})`);
  }
  positive(slowMo.holdSeconds, 'vfx.slowMo.holdSeconds', problems);
  positive(slowMo.rampSeconds, 'vfx.slowMo.rampSeconds', problems);

  const blood = config.vfx.blood;
  positive(blood.splattersPerKill, 'vfx.blood.splattersPerKill', problems);
  positive(blood.maxSplatters, 'vfx.blood.maxSplatters', problems);

  const muzzleFlash = config.vfx.muzzleFlash;
  positive(muzzleFlash.durationSeconds, 'vfx.muzzleFlash.durationSeconds', problems);
  positive(muzzleFlash.size, 'vfx.muzzleFlash.size', problems);

  const skidMarks = config.vfx.skidMarks;
  positive(skidMarks.intervalSeconds, 'vfx.skidMarks.intervalSeconds', problems);
  positive(skidMarks.lifetimeSeconds, 'vfx.skidMarks.lifetimeSeconds', problems);
  if (!Number.isInteger(skidMarks.maxMarks) || skidMarks.maxMarks < 1) {
    problems.push(
      `vfx.skidMarks.maxMarks must be an integer >= 1 (got ${String(skidMarks.maxMarks)})`
    );
  }

  const driveTrail = config.vfx.driveTrail;
  nonNegative(driveTrail.minSpeed, 'vfx.driveTrail.minSpeed', problems);
  positive(driveTrail.intervalSeconds, 'vfx.driveTrail.intervalSeconds', problems);
  positive(driveTrail.lifetimeSeconds, 'vfx.driveTrail.lifetimeSeconds', problems);
  if (!Number.isInteger(driveTrail.maxPuffs) || driveTrail.maxPuffs < 1) {
    problems.push(
      `vfx.driveTrail.maxPuffs must be an integer >= 1 (got ${String(driveTrail.maxPuffs)})`
    );
  }

  const engineAudio = config.audio.engine;
  nonNegative(engineAudio.idleHz, 'audio.engine.idleHz', problems);
  positive(engineAudio.maxHz, 'audio.engine.maxHz', problems);
  if (engineAudio.maxHz <= engineAudio.idleHz) {
    problems.push('audio.engine.maxHz must be greater than audio.engine.idleHz');
  }
  positive(engineAudio.nitroPitchBoost, 'audio.engine.nitroPitchBoost', problems);
  positive(config.audio.skidMinSpeed, 'audio.skidMinSpeed', problems);
  const groan = config.audio.zombieGroan;
  positive(groan.maxDistance, 'audio.zombieGroan.maxDistance', problems);
  positive(groan.intervalSeconds, 'audio.zombieGroan.intervalSeconds', problems);
  if (!Number.isInteger(groan.maxVoices) || groan.maxVoices < 1) {
    problems.push(
      `audio.zombieGroan.maxVoices must be an integer >= 1 (got ${String(groan.maxVoices)})`
    );
  }

  positive(config.performance.targetFps, 'performance.targetFps', problems);
  if (!Number.isInteger(config.performance.zombieBudget) || config.performance.zombieBudget < 1) {
    problems.push(
      `performance.zombieBudget must be an integer >= 1 (got ${String(config.performance.zombieBudget)})`
    );
  }

  const budgetCategories = [
    'car',
    'upgradePart',
    'zombie',
    'zombieLod1',
    'zombieLod2',
    'boss',
    'smallProp',
    'largeProp',
  ] as const;
  for (const cat of budgetCategories) {
    const b = config.assetBudget[cat];
    if (!Number.isInteger(b.maxTriangles) || b.maxTriangles < 1) {
      problems.push(
        `assetBudget.${cat}.maxTriangles must be an integer >= 1 (got ${String(b.maxTriangles)})`
      );
    }
    if (!Number.isInteger(b.textureSize) || b.textureSize < 0) {
      problems.push(
        `assetBudget.${cat}.textureSize must be an integer >= 0 (got ${String(b.textureSize)})`
      );
    }
  }

  const carDamage = config.carDamage;
  if (carDamage.dentedBelowFraction <= 0 || carDamage.dentedBelowFraction >= 1) {
    problems.push(
      `carDamage.dentedBelowFraction must be between 0 and 1 (got ${String(carDamage.dentedBelowFraction)})`
    );
  }
  if (carDamage.wreckedBelowFraction <= 0 || carDamage.wreckedBelowFraction >= 1) {
    problems.push(
      `carDamage.wreckedBelowFraction must be between 0 and 1 (got ${String(carDamage.wreckedBelowFraction)})`
    );
  }
  if (carDamage.wreckedBelowFraction >= carDamage.dentedBelowFraction) {
    problems.push(
      `carDamage.wreckedBelowFraction must be less than carDamage.dentedBelowFraction (got ${String(carDamage.wreckedBelowFraction)} >= ${String(carDamage.dentedBelowFraction)})`
    );
  }

  const motion = config.zombieMotion;
  if (motion.colorVariance < 0 || motion.colorVariance > 1) {
    problems.push(
      `zombieMotion.colorVariance must be between 0 and 1 (got ${String(motion.colorVariance)})`
    );
  }
  nonNegative(motion.bobAmplitude, 'zombieMotion.bobAmplitude', problems);
  positive(motion.bobFrequency, 'zombieMotion.bobFrequency', problems);
  nonNegative(motion.attackLungeDistance, 'zombieMotion.attackLungeDistance', problems);
  positive(motion.attackLungeSeconds, 'zombieMotion.attackLungeSeconds', problems);

  const upgradeIds = new Set<string>();
  const categories: UpgradeCategory[] = [
    'engine',
    'tires',
    'health',
    'armor',
    'fuel',
    'weapon',
    'ram',
    'nitro',
    'radar',
    'headlights',
  ];
  config.upgrades.forEach((u, i) => {
    const at = `upgrades[${i}] (${u.id || '?'})`;
    if (!u.id) problems.push(`${at}.id is required`);
    if (upgradeIds.has(u.id)) problems.push(`${at}.id "${u.id}" is duplicated`);
    upgradeIds.add(u.id);
    if (!categories.includes(u.category))
      problems.push(`${at}.category "${u.category}" is unknown`);
    if (u.category === 'weapon' && !u.slot) problems.push(`${at} is a weapon and needs a slot`);
    if (u.tiers.length === 0) problems.push(`${at} needs at least one tier`);
    let lastPrice = 0;
    u.tiers.forEach((t, ti) => {
      if (t.tier !== ti + 1)
        problems.push(`${at}.tiers[${ti}].tier must be ${ti + 1} (got ${t.tier})`);
      nonNegative(t.price, `${at}.tiers[${ti}].price`, problems);
      if (t.price < lastPrice)
        problems.push(`${at}.tiers[${ti}].price must not be lower than the previous tier`);
      lastPrice = t.price;
      if (!Number.isInteger(t.unlockMap) || t.unlockMap < 1 || t.unlockMap > 5) {
        problems.push(
          `${at}.tiers[${ti}].unlockMap must be a map number 1-5 (got ${String(t.unlockMap)})`
        );
      }
      for (const [k, v] of Object.entries(t.modifiers)) {
        if (typeof v !== 'number' || !Number.isFinite(v))
          problems.push(`${at}.tiers[${ti}].modifiers.${k} must be a number`);
      }
    });
  });

  const cosmeticCategoryIds = new Set<string>();
  const cosmeticOptionIds = new Set<string>();
  config.cosmetics.forEach((category, ci) => {
    const cat = `cosmetics[${ci}] (${category.id || '?'})`;
    if (!category.id) problems.push(`${cat}.id is required`);
    if (cosmeticCategoryIds.has(category.id))
      problems.push(`${cat}.id "${category.id}" is duplicated`);
    cosmeticCategoryIds.add(category.id);
    if (category.options.length === 0) problems.push(`${cat} needs at least one option`);
    let hasFreeOption = false;
    category.options.forEach((opt, oi) => {
      const at = `${cat}.options[${oi}] (${opt.id || '?'})`;
      if (!opt.id) problems.push(`${at}.id is required`);
      if (cosmeticOptionIds.has(opt.id)) problems.push(`${at}.id "${opt.id}" is duplicated`);
      cosmeticOptionIds.add(opt.id);
      nonNegative(opt.price, `${at}.price`, problems);
      if (opt.price === 0) hasFreeOption = true;
      if (opt.opacity !== undefined && (opt.opacity < 0 || opt.opacity > 1)) {
        problems.push(`${at}.opacity must be between 0 and 1 (got ${opt.opacity})`);
      }
    });
    if (category.options.length > 0 && !hasFreeOption) {
      problems.push(`${cat} needs at least one option priced 0 (the stock/default look)`);
    }
  });

  if (config.maps.length === 0) problems.push('maps must contain at least one map');
  const ids = new Set<string>();
  config.maps.forEach((map, i) => {
    if (!map.id) problems.push(`maps[${i}].id is required`);
    if (ids.has(map.id)) problems.push(`maps[${i}].id "${map.id}" is duplicated`);
    ids.add(map.id);
    positive(map.size, `maps[${i}].size`, problems);
    positive(map.fogDistance, `maps[${i}].fogDistance`, problems);
    positive(map.chunkSize, `maps[${i}].chunkSize`, problems);
    if (map.chunkSize > map.size) problems.push(`maps[${i}].chunkSize must not exceed size`);
    if (
      ![
        'greybox',
        'openfield',
        'suburbs',
        'desertHighway',
        'industrialCity',
        'frozenForest',
        'quarantineLab',
      ].includes(map.generator)
    ) {
      problems.push(`maps[${i}].generator "${map.generator}" is unknown`);
    }
    if (
      map.spawnDensity !== undefined &&
      (map.spawnDensity < 0 || map.spawnDensity > 1 || Number.isNaN(map.spawnDensity))
    ) {
      problems.push(`maps[${i}].spawnDensity must be between 0 and 1`);
    }
    if (
      map.groundGrip !== undefined &&
      (map.groundGrip <= 0 || map.groundGrip > 2 || Number.isNaN(map.groundGrip))
    ) {
      problems.push(`maps[${i}].groundGrip must be between 0 (exclusive) and 2`);
    }
    const half = map.size / 2;
    for (const [zi, zone] of (map.spawnZones ?? []).entries()) {
      positive(zone.radius, `maps[${i}].spawnZones[${zi}].radius`, problems);
      nonNegative(zone.weight, `maps[${i}].spawnZones[${zi}].weight`, problems);
      if (Math.abs(zone.x) > half || Math.abs(zone.z) > half)
        problems.push(`maps[${i}].spawnZones[${zi}] centre is outside the map`);
    }
    for (const [pi, pickup] of (map.pickups ?? []).entries()) {
      if (Math.abs(pickup.x) > half || Math.abs(pickup.z) > half)
        problems.push(`maps[${i}].pickups[${pi}] is outside the map`);
    }
    if (
      map.storyIndex !== undefined &&
      (!Number.isInteger(map.storyIndex) || map.storyIndex < 1 || map.storyIndex > 5)
    ) {
      problems.push(`maps[${i}].storyIndex must be 1-5`);
    }
    for (const rank of map.zombieRanks) {
      if (!ZOMBIE_RANKS.includes(rank))
        problems.push(`maps[${i}].zombieRanks has unknown rank "${rank}"`);
      // The visibility advantage: the player must always see zombies before they notice the car.
      // (config.zombies[rank] itself is already reported missing above; skip re-crashing on it.)
      else if (config.zombies[rank] && config.zombies[rank].detectionRadius >= map.fogDistance) {
        problems.push(
          `maps[${i}] (${map.id}): zombies.${rank}.detectionRadius (${config.zombies[rank].detectionRadius}) must be less than fogDistance (${map.fogDistance})`
        );
      }
    }
    if (map.boss) {
      if (Math.abs(map.boss.position.x) > half || Math.abs(map.boss.position.z) > half) {
        problems.push(`maps[${i}].boss.position is outside the map`);
      }
      if (map.boss.hp !== undefined) positive(map.boss.hp, `maps[${i}].boss.hp`, problems);
      if (map.boss.speed !== undefined) positive(map.boss.speed, `maps[${i}].boss.speed`, problems);
      if (map.boss.attackDamage !== undefined) {
        nonNegative(map.boss.attackDamage, `maps[${i}].boss.attackDamage`, problems);
      }
      if (map.boss.slam) {
        positive(map.boss.slam.radius, `maps[${i}].boss.slam.radius`, problems);
        nonNegative(map.boss.slam.damage, `maps[${i}].boss.slam.damage`, problems);
        positive(map.boss.slam.cooldown, `maps[${i}].boss.slam.cooldown`, problems);
      }
      if (map.boss.rangedAttack) {
        positive(map.boss.rangedAttack.range, `maps[${i}].boss.rangedAttack.range`, problems);
        positive(
          map.boss.rangedAttack.projectileSpeed,
          `maps[${i}].boss.rangedAttack.projectileSpeed`,
          problems
        );
        positive(map.boss.rangedAttack.cooldown, `maps[${i}].boss.rangedAttack.cooldown`, problems);
        nonNegative(map.boss.rangedAttack.damage, `maps[${i}].boss.rangedAttack.damage`, problems);
        positive(
          map.boss.rangedAttack.hitRadius,
          `maps[${i}].boss.rangedAttack.hitRadius`,
          problems
        );
      }
    }
    if (map.music) {
      positive(map.music.baseHz, `maps[${i}].music.baseHz`, problems);
      if (!['calm', 'tense', 'dread'].includes(map.music.mood)) {
        problems.push(`maps[${i}].music.mood "${map.music.mood}" is unknown`);
      }
    }
  });

  return problems;
}

export function assertValidConfig(config: GameConfig): void {
  const problems = collectConfigProblems(config);
  if (problems.length > 0) throw new ConfigError(problems);
}
