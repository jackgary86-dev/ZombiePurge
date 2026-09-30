import { describe, it, expect, beforeAll } from 'vitest';
import { Color, Matrix4, Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { ZombieInstances } from '../../src/game/art';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { ZombiePool } from '../../src/game/zombies';

describe('ZombieInstances (B7)', () => {
  beforeAll(async () => {
    await initPhysics();
    resetConfig();
  });

  it('renders every zombie as one instance in two draw calls, hiding inactive slots', () => {
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    physics.addGround(200);
    const pool = new ZombiePool(physics, 8, getConfig().zombies);
    const view = new ZombieInstances(8, getConfig().zombieMotion);
    expect(view.bodies.count).toBe(8);
    expect(view.heads.count).toBe(8);

    pool.spawn('walker', { x: 1, y: 0, z: 2 });
    const tank = pool.spawn('tank', { x: 10, y: 0, z: 0 })!;
    physics.step();
    view.sync(pool.zombies, new Vector3(0, 5, -5));

    const m = new Matrix4();
    view.bodies.getMatrixAt(tank.poolIndex, m);
    const pos = new Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(10, 1);
    const scale = new Vector3().setFromMatrixScale(m);
    // S1: tank is wide and squat, not just uniformly bigger - a distinct proportion, not a
    // single scale factor.
    expect(scale.x).toBeCloseTo(1.75, 5);
    expect(scale.y).toBeCloseTo(1.35, 5);
    expect(scale.x).toBeGreaterThan(scale.y); // wider than it is tall, relative to a walker

    const emptySlot = pool.zombies.find((z) => !z.active)!.poolIndex; // never spawned
    view.bodies.getMatrixAt(emptySlot, m);
    expect(new Vector3().setFromMatrixScale(m).length()).toBe(0);

    view.heads.getMatrixAt(tank.poolIndex, m);
    expect(new Vector3().setFromMatrixPosition(m).y).toBeGreaterThan(pos.y);

    pool.despawn(tank);
    view.sync(pool.zombies, new Vector3());
    view.bodies.getMatrixAt(tank.poolIndex, m);
    expect(new Vector3().setFromMatrixScale(m).length()).toBe(0);
    pool.dispose();
    physics.dispose();
  });

  it('drops heads beyond the LOD distance and keeps them near the viewer', () => {
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    physics.addGround(500);
    const pool = new ZombiePool(physics, 2, getConfig().zombies);
    const near = pool.spawn('walker', { x: 0, y: 0, z: 10 })!;
    const far = pool.spawn('walker', { x: 0, y: 0, z: 200 })!;
    physics.step();
    const view = new ZombieInstances(2, getConfig().zombieMotion);
    view.sync(pool.zombies, new Vector3(0, 3, 0));
    const m = new Matrix4();
    view.heads.getMatrixAt(near.poolIndex, m);
    expect(new Vector3().setFromMatrixScale(m).x).toBeCloseTo(1, 5);
    view.heads.getMatrixAt(far.poolIndex, m);
    expect(new Vector3().setFromMatrixScale(m).length()).toBe(0);
    view.bodies.getMatrixAt(far.poolIndex, m);
    expect(new Vector3().setFromMatrixScale(m).x).toBeCloseTo(1, 5); // body still drawn
    pool.dispose();
    physics.dispose();
  });

  it('gives same-rank instances slightly different colours when colorVariance > 0 (I5)', () => {
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    physics.addGround(200);
    const pool = new ZombiePool(physics, 20, getConfig().zombies);
    for (let i = 0; i < 20; i++) pool.spawn('walker', { x: i, y: 0, z: 0 });
    physics.step();
    const view = new ZombieInstances(20, getConfig().zombieMotion);
    view.sync(pool.zombies, new Vector3());
    const c = new Color();
    const hexes = new Set<number>();
    for (let i = 0; i < 20; i++) {
      view.bodies.getColorAt(i, c);
      hexes.add(c.getHex());
    }
    expect(hexes.size).toBeGreaterThan(1);
    pool.dispose();
    physics.dispose();
  });

  it('lunges forward and scales up mid-attack (I5)', () => {
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    physics.addGround(200);
    const pool = new ZombiePool(physics, 1, getConfig().zombies);
    const z = pool.spawn('walker', { x: 0, y: 0, z: 0 })!;
    physics.step();
    const motion = getConfig().zombieMotion;
    const view = new ZombieInstances(1, motion);
    z.setState('attack');
    z.stateTime = motion.attackLungeSeconds / 2; // mid-swing, near the pulse's peak
    view.sync(pool.zombies, new Vector3());
    const m = new Matrix4();
    view.bodies.getMatrixAt(z.poolIndex, m);
    const scale = new Vector3().setFromMatrixScale(m);
    expect(scale.x).toBeGreaterThan(1); // walker's base scale is 1
    pool.dispose();
    physics.dispose();
  });
});
