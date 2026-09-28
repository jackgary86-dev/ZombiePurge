import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { updateBossSlam, ZombiePool } from '../../src/game/zombies';

const DT = 1 / 60;

describe('F4 boss slam', () => {
  let physics: PhysicsWorld;
  let pool: ZombiePool;

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    physics = new PhysicsWorld(getConfig().physics.gravity, DT);
    physics.addGround(500);
    pool = new ZombiePool(physics, 2, getConfig().zombies);
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  it('never slams a boss with no slam configured', () => {
    const boss = pool.spawn('boss', { x: 0, y: 0, z: 0 })!;
    const car = new Vector3(1, 0.8, 1);
    for (let i = 0; i < 300; i++) expect(updateBossSlam(boss, DT, car)).toBe(0);
  });

  it('deals its configured damage only within radius, then goes on cooldown', () => {
    const boss = pool.spawn(
      'boss',
      { x: 0, y: 0, z: 0 },
      { slam: { radius: 8, damage: 50, cooldown: 3 } }
    )!;
    const far = new Vector3(50, 0.8, 50);
    expect(updateBossSlam(boss, DT, far)).toBe(0);

    const near = new Vector3(4, 0.8, 0);
    // Spawn seeds a half-cooldown "warm-up" so it doesn't slam the instant it appears.
    let hits = 0;
    let total = 0;
    for (let i = 0; i < 60 * 4; i++) {
      const dmg = updateBossSlam(boss, DT, near);
      if (dmg > 0) {
        hits++;
        total += dmg;
      }
    }
    expect(hits).toBe(1);
    expect(total).toBe(50);
  });

  it('slams again once the cooldown elapses', () => {
    const boss = pool.spawn(
      'boss',
      { x: 0, y: 0, z: 0 },
      { slam: { radius: 8, damage: 20, cooldown: 1 } }
    )!;
    const near = new Vector3(2, 0.8, 0);
    let hits = 0;
    for (let i = 0; i < 60 * 5; i++) {
      if (updateBossSlam(boss, DT, near) > 0) hits++;
    }
    // ~4.5 s of eligible time after the 0.5 s warm-up, at a 1 s cooldown.
    expect(hits).toBeGreaterThanOrEqual(4);
    expect(hits).toBeLessThanOrEqual(5);
  });

  it('a dead boss never slams', () => {
    const boss = pool.spawn(
      'boss',
      { x: 0, y: 0, z: 0 },
      { slam: { radius: 8, damage: 50, cooldown: 0.1 } }
    )!;
    boss.takeDamage(boss.maxHp);
    const near = new Vector3(1, 0.8, 0);
    for (let i = 0; i < 60; i++) expect(updateBossSlam(boss, DT, near)).toBe(0);
  });
});
