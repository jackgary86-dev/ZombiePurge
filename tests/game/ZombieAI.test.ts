import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import {
  canDespawnCorpse,
  DEFAULT_ZOMBIE_AI,
  updateZombieAI,
  ZombiePool,
  type ZombieSenses,
} from '../../src/game/zombies';

const DT = 1 / 60;

describe('Zombie AI', () => {
  let physics: PhysicsWorld;
  let pool: ZombiePool;
  const senses: ZombieSenses = { carPosition: new Vector3(), carSpeed: 0, noise: 0 };

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    physics = new PhysicsWorld(getConfig().physics.gravity, DT);
    physics.addGround(1000);
    pool = new ZombiePool(physics, 2, getConfig().zombies);
    senses.carPosition.set(0, 0, 0);
    senses.carSpeed = 0;
    senses.noise = 0;
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  function run(z: ReturnType<ZombiePool['spawn']>, seconds: number, rng = () => 0.5) {
    let damage = 0;
    for (let i = 0; i < seconds / DT; i++) {
      damage += updateZombieAI(z!, DT, senses, DEFAULT_ZOMBIE_AI, rng).damage;
      physics.step();
    }
    return damage;
  }

  it('idles, then wanders, then idles again when the car is far away', () => {
    const z = pool.spawn('walker', { x: 200, y: 0, z: 200 })!;
    expect(z.state).toBe('idle');
    run(z, 3); // idle time with rng 0.5 = 2.75 s
    expect(z.state).toBe('wander');
    const start = z.getPosition().clone();
    run(z, 2);
    expect(z.getPosition().distanceTo(start)).toBeGreaterThan(0.5);
    run(z, 2.5); // wander time with rng 0.5 = 3.5 s
    expect(z.state).toBe('idle');
  });

  it('does not notice a car beyond its detection radius but the player can see it', () => {
    const walker = getConfig().zombies.walker;
    const z = pool.spawn('walker', { x: 0, y: 0, z: walker.detectionRadius + 5 })!;
    run(z, 1);
    expect(z.state).toBe('idle');
    expect(walker.detectionRadius + 5).toBeLessThan(getConfig().maps[0].fogDistance);
  });

  it('is alerted inside the detection radius, then chases and closes in', () => {
    const z = pool.spawn('runner', { x: 0, y: 0, z: 30 })!;
    run(z, 0.2);
    expect(z.state).toBe('alerted');
    expect(z.facing.z).toBeLessThan(-0.9); // turned toward the car at the origin
    run(z, DEFAULT_ZOMBIE_AI.alertedPause);
    expect(z.state).toBe('chase');
    const before = z.getPosition().z;
    run(z, 2);
    expect(z.getPosition().z).toBeLessThan(before - 5);
  });

  it('hears a fast car from further away', () => {
    const walker = getConfig().zombies.walker;
    const z = pool.spawn('walker', { x: 0, y: 0, z: walker.detectionRadius * 1.3 })!;
    run(z, 0.5);
    expect(z.state).toBe('idle');
    senses.carSpeed = DEFAULT_ZOMBIE_AI.loudSpeed + 5;
    run(z, 0.5);
    expect(z.state).toBe('alerted');
  });

  it('attacks on a cooldown when in range, and stops when the car leaves', () => {
    const z = pool.spawn('walker', { x: 0, y: 0, z: 1.5 })!;
    z.setState('chase');
    updateZombieAI(z, DT, senses);
    expect(z.state).toBe('attack');
    const damage = run(z, 2.05);
    // First hit lands immediately, then one per cooldown second: t=0, 1, 2.
    expect(damage).toBe(getConfig().zombies.walker.attackDamage * 3);

    senses.carPosition.set(0, 0, 10);
    run(z, 0.1);
    expect(z.state).toBe('chase');
  });

  it('gives up the chase when the car gets far away', () => {
    const z = pool.spawn('walker', { x: 0, y: 0, z: 10 })!;
    run(z, 1);
    expect(z.state).toBe('chase');
    senses.carPosition.set(0, 0, 500);
    run(z, 0.1);
    expect(z.state).toBe('idle');
  });

  it('dead zombies stop moving and linger before despawn', () => {
    const z = pool.spawn('runner', { x: 0, y: 0, z: 20 })!;
    run(z, 1.5);
    expect(z.getSpeed()).toBeGreaterThan(1);
    z.takeDamage(999);
    run(z, 0.5);
    expect(z.getSpeed()).toBeLessThan(0.2);
    expect(canDespawnCorpse(z)).toBe(false);
    run(z, DEFAULT_ZOMBIE_AI.deathLinger);
    expect(canDespawnCorpse(z)).toBe(true);
  });
});
