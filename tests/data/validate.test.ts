import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/data/defaults';
import { collectConfigProblems, assertValidConfig, ConfigError } from '../../src/data/validate';
import type { GameConfig } from '../../src/data/types';

/** A fresh, valid clone of the defaults, mutated in place by each test. */
function cfg(): GameConfig {
  return structuredClone(DEFAULT_CONFIG);
}

function problems(mutate: (c: GameConfig) => void): string[] {
  const c = cfg();
  mutate(c);
  return collectConfigProblems(c);
}

describe('config validation (H3): every field DEFAULT_CONFIG must keep valid', () => {
  it('the untouched defaults have no problems at all', () => {
    expect(collectConfigProblems(cfg())).toEqual([]);
    expect(() => assertValidConfig(cfg())).not.toThrow();
  });

  it('assertValidConfig throws ConfigError listing every problem, readable in .message', () => {
    const c = cfg();
    c.physics.gravity = 9.81;
    c.vehicle.mass = -1;
    expect(() => assertValidConfig(c)).toThrow(ConfigError);
    try {
      assertValidConfig(c);
    } catch (err) {
      const e = err as ConfigError;
      expect(e.problems).toContain('physics.gravity must be negative (pulls down)');
      expect(e.problems).toContain('vehicle.mass must be a positive number (got -1)');
      expect(e.message).toContain('vehicle.mass');
    }
  });

  it('physics', () => {
    expect(problems((c) => (c.physics.gravity = 0))).toContain(
      'physics.gravity must be negative (pulls down)'
    );
    expect(problems((c) => (c.physics.fixedTimeStep = 0))).toContain(
      'physics.fixedTimeStep must be a positive number (got 0)'
    );
  });

  it('vehicle: core stats, steering bounds, and the one plain-number field', () => {
    expect(problems((c) => (c.vehicle.topSpeed = -1))).toContain(
      'vehicle.topSpeed must be a positive number (got -1)'
    );
    expect(problems((c) => (c.vehicle.hp = 0))).toContain(
      'vehicle.hp must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vehicle.armor = -1))).toContain(
      'vehicle.armor must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.vehicle.steering.highSpeedFactor = 0))).toContain(
      'vehicle.steering.highSpeedFactor must be in (0, 1] (got 0)'
    );
    expect(problems((c) => (c.vehicle.steering.highSpeedFactor = 1.5))).toContain(
      'vehicle.steering.highSpeedFactor must be in (0, 1] (got 1.5)'
    );
    expect(problems((c) => (c.vehicle.wheels.attachHeight = Number.NaN))).toContain(
      'vehicle.wheels.attachHeight must be a number'
    );
  });

  it('vehicle: N1 engine tuning swing factor must stay in [0, 1]', () => {
    expect(problems((c) => (c.vehicle.engineTuning.swingFactor = -0.1))).toContain(
      'vehicle.engineTuning.swingFactor must be in [0, 1] (got -0.1)'
    );
    expect(problems((c) => (c.vehicle.engineTuning.swingFactor = 1.1))).toContain(
      'vehicle.engineTuning.swingFactor must be in [0, 1] (got 1.1)'
    );
    expect(problems((c) => (c.vehicle.engineTuning.swingFactor = 1))).toEqual([]);
  });

  it('vehicle: P1 stability assist bounds', () => {
    expect(problems((c) => (c.vehicle.stability.uprightSpringTorque = -1))).toContain(
      'vehicle.stability.uprightSpringTorque must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.vehicle.stability.uprightDamping = -1))).toContain(
      'vehicle.stability.uprightDamping must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.vehicle.stability.maxUprightTorque = 0))).toContain(
      'vehicle.stability.maxUprightTorque must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vehicle.stability.maxCorrectedAngle = 0))).toContain(
      'vehicle.stability.maxCorrectedAngle must be in (0, PI] (got 0)'
    );
    expect(problems((c) => (c.vehicle.stability.maxCorrectedAngle = Math.PI * 1.1))).toContain(
      `vehicle.stability.maxCorrectedAngle must be in (0, PI] (got ${Math.PI * 1.1})`
    );
    expect(problems((c) => (c.vehicle.stability.maxCorrectedAngle = Math.PI))).toEqual([]);
  });

  it('camera', () => {
    expect(problems((c) => (c.camera.distance = 0))).toContain(
      'camera.distance must be a positive number (got 0)'
    );
    expect(problems((c) => (c.camera.speedFovBoost = -1))).toContain(
      'camera.speedFovBoost must be zero or greater (got -1)'
    );
  });

  it('zombies: missing rank, rank mismatch, and a ranged attack that outranges detection', () => {
    expect(
      problems((c) => {
        delete (c.zombies as Record<string, unknown>).walker;
      })
    ).toContain('zombies.walker is missing');
    expect(problems((c) => (c.zombies.walker.rank = 'runner'))).toContain(
      'zombies.walker.rank must be "walker" (got "runner")'
    );
    expect(problems((c) => (c.zombies.walker.hp = 0))).toContain(
      'zombies.walker.hp must be a positive number (got 0)'
    );
    expect(
      problems((c) => (c.zombies.spitter.rangedAttack!.range = c.zombies.spitter.detectionRadius))
    ).toContain('zombies.spitter.rangedAttack.range must be less than detectionRadius');
    expect(problems((c) => (c.zombies.spitter.rangedAttack!.cooldown = 0))).toContain(
      'zombies.spitter.rangedAttack.cooldown must be a positive number (got 0)'
    );
    expect(
      problems((c) => {
        delete (c.rewards.coinsPerRank as Record<string, unknown>).boss;
      })
    ).toContain('rewards.coinsPerRank.boss is missing');
    expect(problems((c) => (c.rewards.coinsPerRank.boss = -1))).toContain(
      'rewards.coinsPerRank.boss must be zero or greater (got -1)'
    );
  });

  it('rewards: distance bonus, combo, coins kept on death', () => {
    expect(problems((c) => (c.rewards.metersPerDistanceCoin = 0))).toContain(
      'rewards.metersPerDistanceCoin must be a positive number (got 0)'
    );
    expect(problems((c) => (c.rewards.combo.maxMultiplier = 1.5))).toContain(
      'rewards.combo.maxMultiplier must be an integer >= 1 (got 1.5)'
    );
    expect(problems((c) => (c.rewards.combo.maxMultiplier = 0))).toContain(
      'rewards.combo.maxMultiplier must be an integer >= 1 (got 0)'
    );
    expect(problems((c) => (c.rewards.coinsKeptOnDeathPercent = 150))).toContain(
      'rewards.coinsKeptOnDeathPercent must be between 0 and 100 (got 150)'
    );
    expect(problems((c) => (c.rewards.coinsKeptOnDeathPercent = -1))).toContain(
      'rewards.coinsKeptOnDeathPercent must be between 0 and 100 (got -1)'
    );
  });

  it('combat: an empty weapon tier list, a bad tier, and the missing per-rank impact table', () => {
    expect(problems((c) => (c.combat.machineGun = []))).toContain(
      'combat.machineGun needs at least one tier'
    );
    expect(problems((c) => (c.combat.machineGun[0].unlockHeat = 0))).toContain(
      'combat.machineGun[0].unlockHeat must be between 0 and 1'
    );
    expect(problems((c) => (c.combat.machineGun[0].unlockHeat = 1))).toContain(
      'combat.machineGun[0].unlockHeat must be between 0 and 1'
    );
    expect(problems((c) => (c.combat.flamethrower[0].range = 0))).toContain(
      'combat.flamethrower[0].range must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.shotgun[0].pellets = 0))).toContain(
      'combat.shotgun[0].pellets must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.rockets[0].splashRadius = 0))).toContain(
      'combat.rockets[0].splashRadius must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.spikes = []))).toContain(
      'combat.spikes needs at least one tier'
    );
    expect(problems((c) => (c.combat.spikes[0].damage = 0))).toContain(
      'combat.spikes[0].damage must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.spikes[0].knockback = -1))).toContain(
      'combat.spikes[0].knockback must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.combat.saw = []))).toContain('combat.saw needs at least one tier');
    expect(problems((c) => (c.combat.saw[0].damagePerSecond = 0))).toContain(
      'combat.saw[0].damagePerSecond must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.hammer = []))).toContain(
      'combat.hammer needs at least one tier'
    );
    expect(problems((c) => (c.combat.hammer[0].damage = 0))).toContain(
      'combat.hammer[0].damage must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.hammer[0].knockback = -1))).toContain(
      'combat.hammer[0].knockback must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.combat.hammer[0].radius = 0))).toContain(
      'combat.hammer[0].radius must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.hammer[0].cooldownSeconds = 0))).toContain(
      'combat.hammer[0].cooldownSeconds must be a positive number (got 0)'
    );
    expect(problems((c) => (c.combat.runOverDamageFactor = 0))).toContain(
      'combat.runOverDamageFactor must be a positive number (got 0)'
    );
    expect(
      problems((c) => {
        delete (c.combat.impactDamageToCar as Record<string, unknown>).tank;
      })
    ).toContain('combat.impactDamageToCar.tank is missing');
  });

  it('hud (G1): fraction thresholds and pulse timing', () => {
    expect(problems((c) => (c.hud.lowHpFraction = 0))).toContain(
      'hud.lowHpFraction must be between 0 and 1 (got 0)'
    );
    expect(problems((c) => (c.hud.lowHpFraction = 1))).toContain(
      'hud.lowHpFraction must be between 0 and 1 (got 1)'
    );
    expect(problems((c) => (c.hud.lowFuelFraction = 1.5))).toContain(
      'hud.lowFuelFraction must be between 0 and 1 (got 1.5)'
    );
    expect(problems((c) => (c.hud.counterPulseSeconds = 0))).toContain(
      'hud.counterPulseSeconds must be a positive number (got 0)'
    );
  });

  it('vfx (G2): screen shake, slow-mo bounds, blood', () => {
    expect(problems((c) => (c.vfx.screenShake.perDamage = -1))).toContain(
      'vfx.screenShake.perDamage must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.vfx.screenShake.max = 0))).toContain(
      'vfx.screenShake.max must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vfx.slowMo.multiKillThreshold = 1))).toContain(
      'vfx.slowMo.multiKillThreshold must be an integer >= 2 (got 1)'
    );
    expect(problems((c) => (c.vfx.slowMo.multiKillThreshold = 2.5))).toContain(
      'vfx.slowMo.multiKillThreshold must be an integer >= 2 (got 2.5)'
    );
    expect(problems((c) => (c.vfx.slowMo.timeScale = 0))).toContain(
      'vfx.slowMo.timeScale must be between 0 and 1 (got 0)'
    );
    expect(problems((c) => (c.vfx.slowMo.timeScale = 1))).toContain(
      'vfx.slowMo.timeScale must be between 0 and 1 (got 1)'
    );
    expect(problems((c) => (c.vfx.blood.maxSplatters = 0))).toContain(
      'vfx.blood.maxSplatters must be a positive number (got 0)'
    );
  });

  it('vfx (I9): muzzle flash, skid marks, drive trail', () => {
    expect(problems((c) => (c.vfx.muzzleFlash.durationSeconds = 0))).toContain(
      'vfx.muzzleFlash.durationSeconds must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vfx.muzzleFlash.size = -1))).toContain(
      'vfx.muzzleFlash.size must be a positive number (got -1)'
    );
    expect(problems((c) => (c.vfx.skidMarks.intervalSeconds = 0))).toContain(
      'vfx.skidMarks.intervalSeconds must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vfx.skidMarks.maxMarks = 0.5))).toContain(
      'vfx.skidMarks.maxMarks must be an integer >= 1 (got 0.5)'
    );
    expect(problems((c) => (c.vfx.driveTrail.minSpeed = -1))).toContain(
      'vfx.driveTrail.minSpeed must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.vfx.driveTrail.intervalSeconds = 0))).toContain(
      'vfx.driveTrail.intervalSeconds must be a positive number (got 0)'
    );
    expect(problems((c) => (c.vfx.driveTrail.maxPuffs = 0))).toContain(
      'vfx.driveTrail.maxPuffs must be an integer >= 1 (got 0)'
    );
  });

  it('audio (G3): engine range, skid speed, zombie groan voices', () => {
    expect(problems((c) => (c.audio.engine.maxHz = c.audio.engine.idleHz))).toContain(
      'audio.engine.maxHz must be greater than audio.engine.idleHz'
    );
    expect(problems((c) => (c.audio.engine.idleHz = -1))).toContain(
      'audio.engine.idleHz must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.audio.engine.nitroPitchBoost = 0))).toContain(
      'audio.engine.nitroPitchBoost must be a positive number (got 0)'
    );
    expect(problems((c) => (c.audio.skidMinSpeed = 0))).toContain(
      'audio.skidMinSpeed must be a positive number (got 0)'
    );
    expect(problems((c) => (c.audio.zombieGroan.maxVoices = 0))).toContain(
      'audio.zombieGroan.maxVoices must be an integer >= 1 (got 0)'
    );
    expect(problems((c) => (c.audio.zombieGroan.maxVoices = 2.5))).toContain(
      'audio.zombieGroan.maxVoices must be an integer >= 1 (got 2.5)'
    );
  });

  it('performance (H1): frame-rate target and zombie budget', () => {
    expect(problems((c) => (c.performance.targetFps = 0))).toContain(
      'performance.targetFps must be a positive number (got 0)'
    );
    expect(problems((c) => (c.performance.zombieBudget = 0))).toContain(
      'performance.zombieBudget must be an integer >= 1 (got 0)'
    );
    expect(problems((c) => (c.performance.zombieBudget = 10.5))).toContain(
      'performance.zombieBudget must be an integer >= 1 (got 10.5)'
    );
  });

  it('assetBudget (I2): every category needs a positive triangle count and a valid texture size', () => {
    expect(problems((c) => (c.assetBudget.car.maxTriangles = 0))).toContain(
      'assetBudget.car.maxTriangles must be an integer >= 1 (got 0)'
    );
    expect(problems((c) => (c.assetBudget.zombie.maxTriangles = 100.5))).toContain(
      'assetBudget.zombie.maxTriangles must be an integer >= 1 (got 100.5)'
    );
    expect(problems((c) => (c.assetBudget.boss.textureSize = -1))).toContain(
      'assetBudget.boss.textureSize must be an integer >= 0 (got -1)'
    );
    // 0 is valid for a category that shares another kit's atlas (upgradePart, smallProp).
    expect(problems((c) => (c.assetBudget.upgradePart.textureSize = 0))).toEqual([]);
  });

  it('carDamage (I3): thresholds must be fractions with wrecked below dented', () => {
    expect(problems((c) => (c.carDamage.dentedBelowFraction = 0))).toContain(
      'carDamage.dentedBelowFraction must be between 0 and 1 (got 0)'
    );
    expect(problems((c) => (c.carDamage.dentedBelowFraction = 1))).toContain(
      'carDamage.dentedBelowFraction must be between 0 and 1 (got 1)'
    );
    expect(problems((c) => (c.carDamage.wreckedBelowFraction = 0))).toContain(
      'carDamage.wreckedBelowFraction must be between 0 and 1 (got 0)'
    );
    expect(
      problems((c) => {
        c.carDamage.dentedBelowFraction = 0.3;
        c.carDamage.wreckedBelowFraction = 0.5;
      })
    ).toContain(
      'carDamage.wreckedBelowFraction must be less than carDamage.dentedBelowFraction (got 0.5 >= 0.3)'
    );
  });

  it('zombieMotion (I5): variance is a fraction, bob/lunge magnitudes are non-negative', () => {
    expect(problems((c) => (c.zombieMotion.colorVariance = 1.5))).toContain(
      'zombieMotion.colorVariance must be between 0 and 1 (got 1.5)'
    );
    expect(problems((c) => (c.zombieMotion.colorVariance = -0.1))).toContain(
      'zombieMotion.colorVariance must be between 0 and 1 (got -0.1)'
    );
    expect(problems((c) => (c.zombieMotion.bobAmplitude = -1))).toContain(
      'zombieMotion.bobAmplitude must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.zombieMotion.bobFrequency = 0))).toContain(
      'zombieMotion.bobFrequency must be a positive number (got 0)'
    );
    expect(problems((c) => (c.zombieMotion.attackLungeDistance = -1))).toContain(
      'zombieMotion.attackLungeDistance must be zero or greater (got -1)'
    );
    expect(problems((c) => (c.zombieMotion.attackLungeSeconds = 0))).toContain(
      'zombieMotion.attackLungeSeconds must be a positive number (got 0)'
    );
  });

  it('garage (R1): walk speed, bounds and camera lerp must all stay positive', () => {
    expect(problems((c) => (c.garage.walkSpeed = 0))).toContain(
      'garage.walkSpeed must be a positive number (got 0)'
    );
    expect(problems((c) => (c.garage.bounds.x = -1))).toContain(
      'garage.bounds.x must be a positive number (got -1)'
    );
    expect(problems((c) => (c.garage.bounds.z = 0))).toContain(
      'garage.bounds.z must be a positive number (got 0)'
    );
    expect(problems((c) => (c.garage.cameraLerp = -2))).toContain(
      'garage.cameraLerp must be a positive number (got -2)'
    );
  });

  it('snap zones (R3): duplicate ids, missing/conflicting slot-or-category, bad radius', () => {
    expect(problems((c) => (c.snapZones[1].id = c.snapZones[0].id))).toContain(
      `snapZones[1].id "${DEFAULT_CONFIG.snapZones[0].id}" is duplicated`
    );
    expect(
      problems((c) => {
        delete c.snapZones[0].slot;
        delete c.snapZones[0].category;
      })
    ).toContain('snapZones[0] needs a slot or a category');
    expect(
      problems((c) => {
        c.snapZones[0].category = 'armor';
      })
    ).toContain(`snapZones[0] can't have both a slot and a category`);
    expect(problems((c) => (c.snapZones[0].radius = 0))).toContain(
      'snapZones[0].radius must be a positive number (got 0)'
    );
  });

  it('upgrades: id required/duplicated, unknown category, weapon without a slot', () => {
    expect(
      problems((c) => {
        c.upgrades[0].id = '';
      })
    ).toContain('upgrades[0] (?).id is required');
    expect(
      problems((c) => {
        c.upgrades[1].id = c.upgrades[0].id;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is duplicated')]));
    expect(
      problems((c) => {
        c.upgrades[0].category = 'nope' as never;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('category "nope" is unknown')]));
    const weapon = cfg().upgrades.find((u) => u.category === 'weapon')!;
    expect(
      problems((c) => {
        delete c.upgrades.find((u) => u.id === weapon.id)!.slot;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is a weapon and needs a slot')]));
    const melee = cfg().upgrades.find((u) => u.category === 'melee')!;
    expect(
      problems((c) => {
        delete c.upgrades.find((u) => u.id === melee.id)!.slot;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is a melee and needs a slot')]));
    const engineType = cfg().upgrades.find((u) => u.category === 'engineType')!;
    expect(
      problems((c) => {
        delete c.upgrades.find((u) => u.id === engineType.id)!.slot;
      })
    ).toEqual(
      expect.arrayContaining([expect.stringContaining('is a engineType and needs a slot')])
    );
    expect(problems((c) => (c.upgrades[0].tiers = []))).toEqual(
      expect.arrayContaining([expect.stringContaining('needs at least one tier')])
    );
    expect(problems((c) => (c.upgrades[0].tiers[0].tier = 2))).toEqual(
      expect.arrayContaining([expect.stringContaining('tiers[0].tier must be 1 (got 2)')])
    );
    expect(problems((c) => (c.upgrades[0].tiers[1].price = 1))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('price must not be lower than the previous tier'),
      ])
    );
    expect(problems((c) => (c.upgrades[0].tiers[0].unlockMap = 9))).toEqual(
      expect.arrayContaining([expect.stringContaining('unlockMap must be a map number 1-5')])
    );
    expect(
      problems((c) => {
        (c.upgrades[0].tiers[0].modifiers as Record<string, unknown>).topSpeed = 'lots';
      })
    ).toEqual(
      expect.arrayContaining([expect.stringContaining('modifiers.topSpeed must be a number')])
    );
  });

  it('cosmetics (L1): category/option id required and unique, needs a free (stock) option', () => {
    expect(
      problems((c) => {
        c.cosmetics[0].id = '';
      })
    ).toContain('cosmetics[0] (?).id is required');
    expect(
      problems((c) => {
        c.cosmetics.push({ ...c.cosmetics[0] });
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is duplicated')]));
    expect(problems((c) => (c.cosmetics[0].options = []))).toContain(
      'cosmetics[0] (paint) needs at least one option'
    );
    expect(
      problems((c) => {
        c.cosmetics[0].options[0].id = '';
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('.options[0] (?).id is required')]));
    expect(
      problems((c) => {
        c.cosmetics[0].options[1].id = c.cosmetics[0].options[0].id;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is duplicated')]));
    expect(problems((c) => (c.cosmetics[0].options[0].price = -1))).toEqual(
      expect.arrayContaining([expect.stringContaining('price must be zero or greater')])
    );
    expect(
      problems((c) => {
        for (const opt of c.cosmetics[0].options) opt.price = 100;
      })
    ).toContain('cosmetics[0] (paint) needs at least one option priced 0 (the stock/default look)');
  });

  it('cosmetics (L5): option opacity, when present, must be between 0 and 1', () => {
    expect(
      problems((c) => {
        c.cosmetics[0].options[0].opacity = 1.5;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('opacity must be between 0 and 1')]));
    expect(
      problems((c) => {
        c.cosmetics[0].options[0].opacity = -0.1;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('opacity must be between 0 and 1')]));
    expect(problems((c) => (c.cosmetics[0].options[0].opacity = 0.5))).toEqual([]);
  });

  it('maps: id, generator, chunk size, density/grip bounds, out-of-bounds geometry', () => {
    expect(problems((c) => (c.maps = []))).toContain('maps must contain at least one map');
    expect(
      problems((c) => {
        c.maps[1].id = c.maps[0].id;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is duplicated')]));
    expect(problems((c) => (c.maps[0].chunkSize = c.maps[0].size + 1))).toContain(
      'maps[0].chunkSize must not exceed size'
    );
    expect(problems((c) => (c.maps[0].generator = 'nope' as never))).toEqual(
      expect.arrayContaining([expect.stringContaining('generator "nope" is unknown')])
    );
    expect(problems((c) => (c.maps[0].spawnDensity = 1.5))).toEqual(
      expect.arrayContaining([expect.stringContaining('spawnDensity must be between 0 and 1')])
    );
    expect(problems((c) => (c.maps[0].groundGrip = 0))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('groundGrip must be between 0 (exclusive) and 2'),
      ])
    );
    const withZone = cfg();
    withZone.maps[1].spawnZones = [{ x: 0, z: 0, radius: 10, weight: 1 }];
    expect(
      problems((c) => {
        c.maps[1].spawnZones = [{ x: c.maps[1].size, z: 0, radius: 10, weight: 1 }];
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('centre is outside the map')]));
    expect(
      problems((c) => {
        c.maps[1].pickups = [{ kind: 'gas', x: c.maps[1].size, z: 0 }];
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('is outside the map')]));
    expect(problems((c) => (c.maps[0].storyIndex = 9))).toEqual(
      expect.arrayContaining([expect.stringContaining('storyIndex must be 1-5')])
    );
    expect(problems((c) => (c.maps[0].zombieRanks = ['nope' as never]))).toEqual(
      expect.arrayContaining([expect.stringContaining('unknown rank "nope"')])
    );
    expect(
      problems((c) => {
        c.maps[0].zombieRanks = ['walker'];
        c.zombies.walker.detectionRadius = c.maps[0].fogDistance + 1;
      })
    ).toEqual(expect.arrayContaining([expect.stringContaining('must be less than fogDistance')]));
  });

  it('map spawnerTuning (Q1): every numeric field must stay positive, with sane min/max pairs', () => {
    const slaughterIndex = DEFAULT_CONFIG.maps.findIndex((m) => m.spawnerTuning);
    expect(slaughterIndex).toBeGreaterThanOrEqual(0);
    expect(problems((c) => (c.maps[slaughterIndex].spawnerTuning!.spawnMinDistance = -1))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('spawnerTuning.spawnMinDistance must be a positive number'),
      ])
    );
    expect(
      problems((c) => {
        c.maps[slaughterIndex].spawnerTuning!.spawnMinDistance = 300;
        c.maps[slaughterIndex].spawnerTuning!.spawnMaxDistance = 200;
      })
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('spawnMaxDistance must be greater than spawnMinDistance'),
      ])
    );
    expect(problems((c) => (c.maps[slaughterIndex].spawnerTuning!.despawnDistance = 0))).toEqual(
      expect.arrayContaining([expect.stringContaining('spawnerTuning.despawnDistance')])
    );
    expect(problems((c) => (c.maps[slaughterIndex].spawnerTuning!.spawnsPerSecond = 0))).toEqual(
      expect.arrayContaining([expect.stringContaining('spawnerTuning.spawnsPerSecond')])
    );
    expect(
      problems((c) => {
        c.maps[slaughterIndex].spawnerTuning!.clusterMin = 10;
        c.maps[slaughterIndex].spawnerTuning!.clusterMax = 5;
      })
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('clusterMax must not be less than clusterMin'),
      ])
    );
  });

  it('map boss (F4): position bounds, stats, slam and ranged sub-fields', () => {
    const bossMapIndex = DEFAULT_CONFIG.maps.findIndex((m) => m.boss);
    expect(bossMapIndex).toBeGreaterThanOrEqual(0);
    expect(
      problems((c) => {
        c.maps[bossMapIndex].boss!.position = { x: c.maps[bossMapIndex].size, z: 0 };
      })
    ).toEqual(
      expect.arrayContaining([expect.stringContaining('boss.position is outside the map')])
    );
    expect(problems((c) => (c.maps[bossMapIndex].boss!.hp = 0))).toEqual(
      expect.arrayContaining([expect.stringContaining('boss.hp must be a positive number')])
    );
    expect(problems((c) => (c.maps[bossMapIndex].boss!.attackDamage = -1))).toEqual(
      expect.arrayContaining([expect.stringContaining('boss.attackDamage must be zero or greater')])
    );
    expect(problems((c) => (c.maps[bossMapIndex].boss!.slam!.radius = 0))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('boss.slam.radius must be a positive number'),
      ])
    );
    const rangedBossIndex = DEFAULT_CONFIG.maps.findIndex((m) => m.boss?.rangedAttack);
    expect(rangedBossIndex).toBeGreaterThanOrEqual(0);
    expect(problems((c) => (c.maps[rangedBossIndex].boss!.rangedAttack!.cooldown = 0))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('boss.rangedAttack.cooldown must be a positive number'),
      ])
    );
  });

  it('map music (G3): base frequency and mood', () => {
    const musicMapIndex = DEFAULT_CONFIG.maps.findIndex((m) => m.music);
    expect(musicMapIndex).toBeGreaterThanOrEqual(0);
    expect(problems((c) => (c.maps[musicMapIndex].music!.baseHz = 0))).toEqual(
      expect.arrayContaining([expect.stringContaining('music.baseHz must be a positive number')])
    );
    expect(problems((c) => (c.maps[musicMapIndex].music!.mood = 'moody' as never))).toEqual(
      expect.arrayContaining([expect.stringContaining('music.mood "moody" is unknown')])
    );
  });
});
