import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { getConfig, loadConfig, resetConfig } from '../../src/data/config';
import { RunOverSystem, type ImpactEvent } from '../../src/game/combat';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { NEUTRAL_INPUT, Vehicle } from '../../src/game/vehicle';
import type { ZombieRank } from '../../src/data/config';
import { ZombiePool } from '../../src/game/zombies';

const DT = 1 / 60;

describe('RunOverSystem (B4 run-over kills, B5 car damage)', () => {
  let physics: PhysicsWorld;
  let car: Vehicle;
  let pool: ZombiePool;
  let combat: RunOverSystem;

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    build();
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  function build() {
    const cfg = getConfig();
    physics = new PhysicsWorld(cfg.physics.gravity, DT);
    physics.addGround(2000);
    car = new Vehicle(physics, cfg.vehicle, { x: 0, y: 1.0, z: 0 });
    pool = new ZombiePool(physics, 8, cfg.zombies);
    combat = new RunOverSystem(physics, car, pool, cfg.combat, cfg.vehicle.mass);
  }

  /** Settle the car, then launch it at `speed` toward +Z with a zombie standing `gap` metres ahead. */
  function driveInto(rank: ZombieRank, speed: number, seconds = 3, gap = 25) {
    for (let i = 0; i < 60; i++) {
      car.update(NEUTRAL_INPUT, DT);
      physics.step();
      physics.drainCollisions(() => {});
    }
    const z = pool.spawn(rank, { x: 0, y: 0, z: gap })!;
    for (let i = 0; i < 30; i++) {
      physics.step();
      physics.drainCollisions(() => {});
    }
    car.body.setLinvel({ x: 0, y: 0, z: speed }, true);
    const impacts: ImpactEvent[] = [];
    for (let i = 0; i < seconds / DT; i++) {
      car.update({ ...NEUTRAL_INPUT, throttle: speed > 5 ? 1 : 0 }, DT);
      combat.beforeStep();
      physics.step();
      impacts.push(...combat.collectImpacts());
    }
    return { zombie: z, impacts };
  }

  it('kills a walker at speed and reports the impact', () => {
    const { zombie, impacts } = driveInto('walker', 15);
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    const hit = impacts[0];
    expect(hit.rank).toBe('walker');
    expect(hit.relativeSpeed).toBeGreaterThan(8);
    expect(hit.damageToZombie).toBeGreaterThan(getConfig().zombies.walker.hp);
    expect(hit.killed).toBe(true);
    expect(zombie.isAlive()).toBe(false);
    expect(hit.damageToCar).toBe(0);
    expect(car.hp).toBe(getConfig().vehicle.hp);
  });

  it('only pushes a zombie on a slow bump', () => {
    const { zombie, impacts } = driveInto('walker', 2, 4, 5);
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    expect(impacts[0].relativeSpeed).toBeLessThan(getConfig().combat.runOverMinSpeed);
    expect(zombie.isAlive()).toBe(true);
    expect(zombie.hp).toBe(getConfig().zombies.walker.hp);
    expect(impacts.every((i) => i.damageToZombie === 0)).toBe(true);
    expect(zombie.getPosition().z).toBeGreaterThan(5.3); // shoved forward
  });

  it('a tank survives a mid-speed hit and damages the car', () => {
    const { zombie, impacts } = driveInto('tank', 12);
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    expect(zombie.isAlive()).toBe(true);
    expect(zombie.hp).toBeLessThan(getConfig().zombies.tank.hp);
    const total = impacts.reduce((n, i) => n + i.damageToCar, 0);
    expect(total).toBeGreaterThan(5);
    expect(car.hp).toBeCloseTo(getConfig().vehicle.hp - total, 5);
  });

  it('armor reduces damage to the car', () => {
    loadConfig({ vehicle: { armor: 50 } });
    pool.dispose();
    physics.dispose();
    build();
    const { impacts } = driveInto('tank', 12);
    const first = impacts[0];
    const raw =
      getConfig().combat.impactDamageToCar.tank *
      Math.min(1, first.relativeSpeed / getConfig().combat.impactFullSpeed);
    expect(first.damageToCar).toBeCloseTo(raw * 0.5, 5);
  });

  it('the car is destroyed at zero HP and takes no further damage', () => {
    expect(car.applyDamage(60)).toBe(60);
    expect(car.applyDamage(60)).toBe(40);
    expect(car.isDestroyed()).toBe(true);
    expect(car.applyDamage(10)).toBe(0);
  });

  describe('M1 melee weapon contact damage', () => {
    it('deals flat bonus damage on contact even with the car stationary', () => {
      const z = pool.spawn('walker', { x: 0, y: 0, z: 1 })!;
      combat.meleeDamage = 15;
      combat.beforeStep();
      const event = combat.resolve(z);
      expect(event.damageToZombie).toBeGreaterThanOrEqual(15);
      expect(z.hp).toBe(getConfig().zombies.walker.hp - event.damageToZombie);
    });

    it('does nothing extra when no melee weapon is equipped (the default)', () => {
      const z = pool.spawn('walker', { x: 0, y: 0, z: 1 })!;
      combat.beforeStep();
      const event = combat.resolve(z);
      expect(event.damageToZombie).toBe(0);
    });

    it('knocks the zombie back away from the car and staggers its AI briefly', () => {
      const z = pool.spawn('walker', { x: 0, y: 0, z: 3 })!;
      combat.meleeKnockback = 5;
      combat.beforeStep();
      combat.resolve(z);
      const v = z.body.linvel();
      expect(v.z).toBeCloseTo(5, 1); // car sits at z=0, zombie at z=3: pushed further away (+z)
      expect(z.knockbackTimeLeft).toBeGreaterThan(0);
    });

    it('a killing melee hit does not also knock the (now dead) zombie back', () => {
      const z = pool.spawn('walker', { x: 0, y: 0, z: 3 })!;
      combat.meleeDamage = 9999;
      combat.meleeKnockback = 5;
      combat.beforeStep();
      const event = combat.resolve(z);
      expect(event.killed).toBe(true);
      expect(z.knockbackTimeLeft).toBe(0);
    });
  });

  describe('M3 saw continuous contact damage', () => {
    function settleCarThenTouchZombie() {
      for (let i = 0; i < 60; i++) {
        car.update(NEUTRAL_INPUT, DT);
        physics.step();
        physics.drainCollisions(() => {});
      }
      const he = getConfig().vehicle.chassisHalfExtents;
      return pool.spawn('walker', { x: 0, y: 0, z: he.z + 0.15 })!;
    }

    it('keeps dealing damage tick after tick while touching, not just once', () => {
      combat.sawDamagePerSecond = 40;
      const z = settleCarThenTouchZombie();
      combat.beforeStep();
      physics.step();
      combat.collectImpacts();
      combat.applySawDamage(DT);
      const hpAfterOneTick = z.hp;
      for (let i = 0; i < 19; i++) {
        combat.beforeStep();
        physics.step();
        combat.collectImpacts();
        combat.applySawDamage(DT);
      }
      expect(z.hp).toBeLessThan(hpAfterOneTick);
    });

    it('does nothing when no saw is equipped (the default), even while touching', () => {
      const z = settleCarThenTouchZombie();
      const startHp = z.hp;
      for (let i = 0; i < 10; i++) {
        combat.beforeStep();
        physics.step();
        combat.collectImpacts();
        combat.applySawDamage(DT);
      }
      expect(z.hp).toBe(startHp);
    });

    it('reports a kill once continuous damage finishes the zombie off, then self-heals', () => {
      combat.sawDamagePerSecond = 9999;
      const z = settleCarThenTouchZombie();
      combat.beforeStep();
      physics.step();
      combat.collectImpacts();
      const kills = combat.applySawDamage(DT);
      expect(kills).toHaveLength(1);
      expect(kills[0].zombie).toBe(z);
      // The dead zombie is still in the touching set (no stop event fired yet); make sure a
      // further call doesn't error or report it again.
      expect(combat.applySawDamage(DT)).toHaveLength(0);
    });

    it('stops dealing damage once the zombie leaves contact, and resumes if it touches again', () => {
      combat.sawDamagePerSecond = 40;
      const z = settleCarThenTouchZombie();
      combat.beforeStep();
      physics.step();
      combat.collectImpacts();
      combat.applySawDamage(DT);
      const hpAfterTouching = z.hp;

      // Teleport the zombie far away: the collider separation fires a "stop" collision event,
      // which must clear it from the internal touching set (not just leave it stuck there).
      z.body.setTranslation({ x: 500, y: 0, z: 500 }, true);
      for (let i = 0; i < 5; i++) {
        combat.beforeStep();
        physics.step();
        combat.collectImpacts();
        combat.applySawDamage(DT);
      }
      expect(z.hp).toBe(hpAfterTouching); // no more damage once separated

      // Bring it back into contact: damage should resume, proving the set correctly forgot it
      // rather than treating the re-touch as still "already touching" from before.
      const he = getConfig().vehicle.chassisHalfExtents;
      z.body.setTranslation({ x: 0, y: 0, z: he.z + 0.15 }, true);
      for (let i = 0; i < 5; i++) {
        combat.beforeStep();
        physics.step();
        combat.collectImpacts();
        combat.applySawDamage(DT);
      }
      expect(z.hp).toBeLessThan(hpAfterTouching);
    });
  });
});
