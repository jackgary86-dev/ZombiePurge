import { describe, it, expect, beforeAll } from 'vitest';
import { Matrix4, Vector3 } from 'three';
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
    const view = new ZombieInstances(8);
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
    expect(scale.x).toBeCloseTo(1.8, 5); // tank is bigger

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
    const view = new ZombieInstances(2);
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
});
