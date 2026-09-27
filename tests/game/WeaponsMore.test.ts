import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import {
  Flamethrower,
  FRONT_MOUNT,
  RocketLauncher,
  ROOF_MOUNT,
  Shotgun,
  updateBurning,
  WeaponMount,
} from '../../src/game/combat';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { NEUTRAL_INPUT, Vehicle } from '../../src/game/vehicle';
import { ZombiePool } from '../../src/game/zombies';

const DT = 1 / 60;

function seeded(seed = 3) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('D10 flamethrower and D11 shotgun / rockets', () => {
  let physics: PhysicsWorld;
  let car: Vehicle;
  let pool: ZombiePool;
  const cameraDir = new Vector3(0, 0, 1);

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    const cfg = getConfig();
    physics = new PhysicsWorld(cfg.physics.gravity, DT);
    physics.addGround(500);
    car = new Vehicle(physics, cfg.vehicle, { x: 0, y: 1, z: 0 });
    pool = new ZombiePool(physics, 12, cfg.zombies);
    for (let i = 0; i < 60; i++) {
      car.update(NEUTRAL_INPUT, DT);
      physics.step();
    }
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  it('flamethrower burns everything in its cone, keeps burning after, and drinks fuel', () => {
    const stats = getConfig().combat.flamethrower[0];
    let fuel = 60;
    const flame = new Flamethrower(pool, stats, (l) => {
      const drawn = Math.min(fuel, l);
      fuel -= drawn;
      return drawn;
    });
    const mount = new WeaponMount(car, FRONT_MOUNT);
    mount.aimMode = 'camera';
    const inCone = pool.spawn('walker', { x: 0, y: 0, z: 8 })!;
    const inCone2 = pool.spawn('walker', { x: 1.5, y: 0, z: 10 })!;
    const outside = pool.spawn('walker', { x: 0, y: 0, z: -8 })!;
    const tooFar = pool.spawn('walker', { x: 0, y: 0, z: 40 })!;
    for (let i = 0; i < 5; i++) physics.step();

    let kills = 0;
    for (let i = 0; i < 30; i++) {
      // half a second of flame
      mount.update(pool, cameraDir, stats.cone, stats.range);
      kills += flame.update(DT, true, mount).length;
      kills += updateBurning(pool, DT).length;
      physics.step();
    }
    expect(flame.firing).toBe(true);
    expect(fuel).toBeCloseTo(60 - stats.fuelPerSecond * 0.5, 2);
    expect(inCone.hp).toBeLessThan(getConfig().zombies.walker.hp);
    expect(inCone.burnTimeLeft).toBeGreaterThan(0);
    expect(outside.hp).toBe(getConfig().zombies.walker.hp);
    expect(tooFar.hp).toBe(getConfig().zombies.walker.hp);

    // Flame off: burning finishes them.
    for (let i = 0; i < 60 * 4; i++) {
      kills += updateBurning(pool, DT).length;
      physics.step();
    }
    expect(inCone.isAlive()).toBe(false);
    expect(inCone2.isAlive()).toBe(false);
    expect(kills).toBe(2);

    fuel = 0;
    mount.update(pool, cameraDir, stats.cone, stats.range);
    flame.update(DT, true, mount);
    expect(flame.firing).toBe(false); // dry tank, no flame
  });

  it('shotgun spreads pellets, pumps between shots, and reloads an empty magazine', () => {
    const stats = getConfig().combat.shotgun[0];
    const gun = new Shotgun(physics, car, pool, stats, seeded());
    const mount = new WeaponMount(car, ROOF_MOUNT);
    mount.aimMode = 'camera';
    const z = pool.spawn('brute', { x: 0, y: 0, z: 3.5 })!; // close enough that the spread can't miss entirely
    for (let i = 0; i < 5; i++) physics.step();

    mount.update(pool, cameraDir, 0, stats.range);
    const first = gun.update(DT, true, mount);
    expect(first).toHaveLength(stats.pellets);
    const hits = first.filter((s) => s.hit === z).length;
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(hits).toBeLessThan(stats.pellets); // spread means some pellets miss
    expect(z.hp).toBe(getConfig().zombies.brute.hp - hits * stats.damagePerPellet);
    expect(gun.state.rounds).toBe(stats.magazine - 1);

    expect(gun.update(DT, true, mount)).toHaveLength(0); // pumping
    let shots = 1;
    for (let i = 0; i < 60 * 10; i++) {
      mount.update(pool, cameraDir, 0, stats.range);
      if (gun.update(DT, true, mount).length) shots++;
      physics.step();
      if (gun.state.reloading) break;
    }
    expect(shots).toBe(stats.magazine);
    expect(gun.state.reloading).toBe(true);
    for (let i = 0; i < stats.reloadSeconds * 60 + 2; i++) gun.update(DT, false, mount);
    expect(gun.state.reloading).toBe(false);
    expect(gun.state.rounds).toBe(stats.magazine);
  });

  it('rockets fly, explode on contact, and splash a whole cluster', () => {
    const stats = getConfig().combat.rockets[0];
    const launcher = new RocketLauncher(physics, car, pool, stats);
    const mount = new WeaponMount(car, ROOF_MOUNT);
    mount.aimMode = 'camera';
    const cluster = [0, 1, 2, 3, 4].map((i) =>
      pool.spawn('walker', { x: (i - 2) * 1.5, y: 0, z: 30 + (i % 2) })!
    );
    const far = pool.spawn('walker', { x: 0, y: 0, z: 60 })!;
    for (let i = 0; i < 5; i++) physics.step();

    const explosions = [];
    for (let i = 0; i < 60 * 3; i++) {
      mount.update(pool, cameraDir, 0, 100);
      cameraDir.set(0, 0, 1);
      explosions.push(...launcher.update(DT, i === 0, mount));
      physics.step();
      if (explosions.length) break;
    }
    expect(explosions).toHaveLength(1);
    expect(explosions[0].position.z).toBeGreaterThan(25);
    expect(explosions[0].position.z).toBeLessThan(33);
    expect(explosions[0].kills.length).toBe(5);
    expect(cluster.every((z) => !z.isAlive())).toBe(true);
    expect(far.isAlive()).toBe(true);
    expect(launcher.state.rounds).toBe(stats.magazine - 1);
  });
});
