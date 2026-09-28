import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, loadConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import {
  aimBallistic,
  ProjectileSystem,
  updateZombieAI,
  ZombiePool,
  type ZombieSenses,
} from '../../src/game/zombies';

const DT = 1 / 60;

describe('B6 Spitter ranged attack', () => {
  let physics: PhysicsWorld;
  let pool: ZombiePool;
  const senses: ZombieSenses = { carPosition: new Vector3(), carSpeed: 0, noise: 0 };

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    physics = new PhysicsWorld(getConfig().physics.gravity, DT);
    physics.addGround(500);
    pool = new ZombiePool(physics, 2, getConfig().zombies);
    senses.carPosition.set(0, 0.8, 0);
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  it('config rejects a spit range that reaches beyond detection', () => {
    expect(() => loadConfig({ zombies: { spitter: { rangedAttack: { range: 90 } } } })).toThrow(
      /rangedAttack.range must be less than detectionRadius/
    );
  });

  it('stands off at range and spits on a cooldown instead of biting', () => {
    const spitter = pool.spawn('spitter', { x: 0, y: 0, z: 20 })!;
    const ranged = getConfig().zombies.spitter.rangedAttack!;
    let shots = 0;
    let melee = 0;
    for (let i = 0; i < 60 * 6; i++) {
      const r = updateZombieAI(spitter, DT, senses);
      if (r.shot) shots++;
      melee += r.damage;
      physics.step();
    }
    expect(spitter.state).toBe('attack');
    expect(spitter.getPosition().z).toBeGreaterThan(10); // never closed to melee range
    expect(melee).toBe(0);
    // ~0.5 s alert pause, then a shot immediately and one per cooldown.
    expect(shots).toBeGreaterThanOrEqual(Math.floor((6 - 0.6) / ranged.cooldown));
    expect(shots).toBeLessThanOrEqual(Math.ceil(6 / ranged.cooldown) + 1);
  });

  it('a walker still bites at melee range', () => {
    const walker = pool.spawn('walker', { x: 0, y: 0, z: 1.5 })!;
    walker.setState('chase');
    let melee = 0;
    for (let i = 0; i < 60; i++) {
      const r = updateZombieAI(walker, DT, senses);
      expect(r.shot).toBeUndefined();
      melee += r.damage;
      physics.step();
    }
    expect(melee).toBeGreaterThan(0);
  });

  it('ballistic aim lands the glob on the target', () => {
    const origin = new Vector3(0, 1.2, 0);
    const target = new Vector3(12, 0.8, 16);
    const v = aimBallistic(origin, target, 22, new Vector3());
    const p = origin.clone();
    let closest = Infinity;
    for (let t = 0; t < 6; t += DT) {
      v.y += -9.81 * DT;
      p.addScaledVector(v, DT);
      closest = Math.min(closest, p.distanceTo(target));
      if (p.y < 0) break;
    }
    expect(closest).toBeLessThan(0.6);
  });

  it('projectiles hit the car for the configured damage and expire on the ground', () => {
    const system = new ProjectileSystem(4);
    const car = new Vector3(0, 0.8, 20);
    system.fire({
      origin: new Vector3(0, 1.2, 0),
      target: car.clone(),
      speed: 22,
      damage: 5,
      hitRadius: 1.6,
    });
    system.fire({
      origin: new Vector3(0, 1.2, 0),
      target: new Vector3(40, 0, -40),
      speed: 22,
      damage: 5,
      hitRadius: 1.6,
    });
    expect(system.activeCount).toBe(2);
    let damage = 0;
    for (let i = 0; i < 60 * 6; i++)
      damage += system.update(DT, car, 1.2).reduce((n, h) => n + h.damage, 0);
    expect(damage).toBe(5);
    expect(system.activeCount).toBe(0);
  });
});
