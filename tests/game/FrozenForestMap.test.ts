import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildFrozenForestColliders,
  buildFrozenForestMeshes,
  generateFrozenForest,
} from '../../src/game/world/FrozenForestMap';

describe('E7/I7 Frozen Mountain Forest map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateFrozenForest(13, 1400);
    const b = generateFrozenForest(13, 1400);
    expect(a).toEqual(b);
    const limit = 700 + 2;
    for (const t of a.trees) {
      expect(Math.abs(t.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(t.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('is a dense forest split by a road to the pass, with a clear boss courtyard', () => {
    const layout = generateFrozenForest(13, 1400);
    expect(layout.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4);
    expect(layout.trees.length).toBeGreaterThan(100);
    expect(layout.pieces.filter((p) => p.kind === 'boulder').length).toBeGreaterThan(0);
    expect(layout.roads.length).toBeGreaterThanOrEqual(2);
    // Nothing sits inside the courtyard right around the exit.
    for (const t of layout.trees) {
      expect(Math.hypot(t.x - layout.exit.x, t.z - layout.exit.z)).toBeGreaterThan(50);
    }
  });

  it('builds one mesh per piece plus two per tree, one per road, and the ground', () => {
    const layout = generateFrozenForest(13, 1400);
    const group = buildFrozenForestMeshes(layout);
    // S4: every boulder gets a snow cap (1 extra mesh) - a purely visual add-on.
    const boulders = layout.pieces.filter((p) => p.kind === 'boulder').length;
    expect(group.children).toHaveLength(
      1 + layout.pieces.length + layout.trees.length * 2 + layout.roads.length + boulders
    );
    expect(group.getObjectByName('ground')).toBeDefined();
  });

  it('builds colliders for every piece and tree', () => {
    const layout = generateFrozenForest(13, 1400);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildFrozenForestColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + layout.trees.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();
    const tree = layout.trees[0];
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: tree.x, y: 50, z: tree.z }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(hit).not.toBeNull();
    physics.dispose();
  });

  it('exposes a spawn point inside the arena', () => {
    const layout = generateFrozenForest(13, 1400);
    expect(Math.abs(layout.spawn.x)).toBeLessThan(700);
    expect(Math.abs(layout.spawn.z)).toBeLessThan(700);
  });
});
