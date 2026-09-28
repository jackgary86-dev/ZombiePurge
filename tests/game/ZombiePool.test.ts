import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { ZombiePool, ZOMBIE_CAPSULE } from '../../src/game/zombies';

describe('Zombie and ZombiePool', () => {
  let physics: PhysicsWorld;
  let pool: ZombiePool;

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    physics = new PhysicsWorld(getConfig().physics.gravity, 1 / 60);
    physics.addGround(200);
    pool = new ZombiePool(physics, 4, getConfig().zombies);
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  it('spawns with stats from the rank config and caps at capacity', () => {
    const tank = pool.spawn('tank', { x: 1, y: 0, z: 2 })!;
    expect(tank).not.toBeNull();
    expect(tank.rank).toBe('tank');
    expect(tank.hp).toBe(getConfig().zombies.tank.hp);
    expect(tank.cfg.coinValue).toBe(15);
    expect(tank.state).toBe('idle');
    expect(tank.isAlive()).toBe(true);
    expect(pool.aliveCount).toBe(1);

    expect(pool.spawn('walker', { x: 0, y: 0, z: 0 })).not.toBeNull();
    expect(pool.spawn('walker', { x: 0, y: 0, z: 0 })).not.toBeNull();
    expect(pool.spawn('walker', { x: 0, y: 0, z: 0 })).not.toBeNull();
    expect(pool.spawn('walker', { x: 0, y: 0, z: 0 })).toBeNull();
    expect(pool.aliveCount).toBe(4);
  });

  it('recycles despawned zombies and resets their state', () => {
    const z = pool.spawn('runner', { x: 5, y: 0, z: 5 })!;
    z.takeDamage(z.hp);
    expect(z.isAlive()).toBe(false);
    pool.despawn(z);
    expect(pool.aliveCount).toBe(0);
    expect(z.active).toBe(false);

    const again = pool.spawn('brute', { x: 0, y: 0, z: 0 })!;
    expect(again).toBe(z);
    expect(again.rank).toBe('brute');
    expect(again.hp).toBe(getConfig().zombies.brute.hp);
    expect(again.state).toBe('idle');
    expect(Array.from(pool.active())).toEqual([z]);
  });

  it('stands on the ground, upright, and moves when driven', () => {
    const z = pool.spawn('walker', { x: 0, y: 0, z: 0 })!;
    for (let i = 0; i < 60; i++) physics.step();
    expect(z.getFeetY()).toBeCloseTo(0, 1);

    for (let i = 0; i < 60; i++) {
      z.setHorizontalVelocity(0, 2);
      physics.step();
    }
    const p = z.getPosition();
    expect(p.z).toBeGreaterThan(1.5);
    expect(p.y).toBeCloseTo(ZOMBIE_CAPSULE.halfHeight + ZOMBIE_CAPSULE.radius, 1);
    expect(z.facing.z).toBeCloseTo(1);
    // Damping and ground friction trim the commanded velocity a little within a step.
    expect(z.getSpeed()).toBeGreaterThan(1.5);
    expect(z.getSpeed()).toBeLessThanOrEqual(2.01);
    const r = z.body.rotation();
    expect(Math.abs(r.x) + Math.abs(r.z)).toBeLessThan(1e-6);
  });

  it('tracks damage and death, and ignores hits on the dead', () => {
    const z = pool.spawn('walker', { x: 0, y: 0, z: 0 })!;
    expect(z.takeDamage(5)).toBe(false);
    expect(z.hp).toBe(getConfig().zombies.walker.hp - 5);
    expect(z.takeDamage(1000)).toBe(true);
    expect(z.hp).toBe(0);
    expect(z.state).toBe('dead');
    expect(z.takeDamage(1)).toBe(false);
  });

  it('maps collider handles back to active zombies', () => {
    const z = pool.spawn('spitter', { x: 0, y: 0, z: 0 })!;
    expect(pool.fromColliderHandle(z.collider.handle)).toBe(z);
    pool.despawn(z);
    expect(pool.fromColliderHandle(z.collider.handle)).toBeUndefined();
  });

  it('inactive zombies do not collide with anything', () => {
    const z = pool.spawn('walker', { x: 0, y: 0, z: 0 })!;
    pool.despawn(z);
    for (let i = 0; i < 30; i++) physics.step();
    expect(z.body.translation().y).toBeCloseTo(-100, 3);
  });
});
