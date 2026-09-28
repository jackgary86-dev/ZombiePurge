import { describe, it, expect, beforeAll } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import { NEUTRAL_INPUT, Vehicle } from '../../src/game/vehicle';
import {
  buildGreyboxColliders,
  buildGreyboxMeshes,
  createGreyboxLayout,
  greyboxSpawn,
} from '../../src/game/world';

describe('Greybox map', () => {
  beforeAll(async () => {
    await initPhysics();
    resetConfig();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = createGreyboxLayout(500);
    const b = createGreyboxLayout(500);
    expect(a).toEqual(b);
    expect(a.pieces.length).toBeGreaterThan(30);
    const limit = 250 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
      expect(piece.position.y).toBeGreaterThan(0);
    }
    expect(a.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4);
    expect(a.pieces.filter((p) => p.kind === 'ramp')).toHaveLength(4);
  });

  it('builds one mesh per piece plus the ground', () => {
    const layout = createGreyboxLayout(500);
    const group = buildGreyboxMeshes(layout);
    expect(group.children).toHaveLength(layout.pieces.length + 1);
    expect(group.getObjectByName('ground')).toBeDefined();
  });

  it('builds colliders the physics world can hit', () => {
    const layout = createGreyboxLayout(500);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildGreyboxColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    // Rapier only answers scene queries once the world has stepped.
    physics.step();

    // A ray dropped onto the first ramp should hit above ground level.
    const ramp = layout.pieces.find((p) => p.kind === 'ramp')!;
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: ramp.position.x, y: 50, z: ramp.position.z }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(0.5);

    // The perimeter wall stops a ray fired across an empty lane toward +X.
    const wallHit = physics.world.castRay(
      new RAPIER.Ray({ x: 0, y: 1, z: 30 }, { x: 1, y: 0, z: 0 }),
      1000,
      true
    );
    expect(wallHit).not.toBeNull();
    expect(wallHit!.timeOfImpact).toBeGreaterThan(245);
    expect(wallHit!.timeOfImpact).toBeLessThan(255);
    physics.dispose();
  });

  it('lets the car drive up a ramp and leave the ground', () => {
    const cfg = getConfig();
    const layout = createGreyboxLayout(500);
    const physics = new PhysicsWorld(cfg.physics.gravity, 1 / 60);
    buildGreyboxColliders(physics, layout);
    // Start 45 m before the +Z ramp (at z=60, facing -Z toward centre), driving +Z into it.
    const car = new Vehicle(physics, cfg.vehicle, { x: 0, y: 1.2, z: 15 });
    let maxHeight = 0;
    let airborne = false;
    for (let i = 0; i < 60 * 8; i++) {
      car.update({ ...NEUTRAL_INPUT, throttle: 1 }, 1 / 60);
      physics.step();
      const p = car.getPosition();
      maxHeight = Math.max(maxHeight, p.y);
      if (!car.isGrounded() && p.z > 60) airborne = true;
    }
    expect(maxHeight).toBeGreaterThan(3);
    expect(airborne).toBe(true);
    physics.dispose();
  });

  it('exposes a spawn point inside the arena', () => {
    const spawn = greyboxSpawn(createGreyboxLayout(500));
    expect(spawn).toBeInstanceOf(Vector3);
    expect(Math.abs(spawn.x)).toBeLessThan(250);
    expect(Math.abs(spawn.z)).toBeLessThan(250);
  });
});
