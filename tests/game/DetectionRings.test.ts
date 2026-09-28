import { describe, it, expect, beforeAll } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { DetectionRings } from '../../src/game/art';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { ZombiePool } from '../../src/game/zombies';

describe('E2 detection debug rings', () => {
  beforeAll(async () => {
    await initPhysics();
    resetConfig();
  });

  it('is hidden by default and sizes rings to detection radius when enabled', () => {
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    physics.addGround(200);
    const pool = new ZombiePool(physics, 4, getConfig().zombies);
    const runner = pool.spawn('runner', { x: 10, y: 0, z: 0 })!;
    runner.setState('chase');
    physics.step();
    const rings = new DetectionRings(4);
    const car = new Vector3(0, 1, 0);
    rings.sync(pool.zombies, car, 300, 1);
    expect(rings.zombieRings.visible).toBe(false);

    rings.enabled = true;
    rings.sync(pool.zombies, car, 300, 1.5);
    expect(rings.zombieRings.visible).toBe(true);
    const m = new Matrix4();
    rings.zombieRings.getMatrixAt(runner.poolIndex, m);
    const s = new Vector3().setFromMatrixScale(m);
    expect(s.x).toBeCloseTo(getConfig().zombies.runner.detectionRadius * 1.5, 3);
    rings.viewRing.getMatrixAt(0, m);
    expect(new Vector3().setFromMatrixScale(m).x).toBeCloseTo(300, 3);

    rings.enabled = false;
    rings.sync(pool.zombies, car, 300, 1);
    expect(rings.zombieRings.visible).toBe(false);
    pool.dispose();
    physics.dispose();
  });
});
