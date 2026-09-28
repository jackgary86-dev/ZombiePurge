import { describe, it, expect, beforeAll } from 'vitest';
import { BoxGeometry, Mesh } from 'three';
import {
  buildKitColliders,
  buildKitMeshes,
  mulberry32,
  type KitLayout,
} from '../../src/game/world/PlaceholderMapKit';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';

function layout(): KitLayout {
  return {
    size: 200,
    spawn: { x: 0, y: 1.2, z: 0 },
    pieces: [
      {
        kind: 'wall',
        position: { x: 0, y: 2, z: 0 },
        halfExtents: { x: 5, y: 2, z: 1 },
        yaw: 0,
        pitch: 0,
      },
      {
        kind: 'crate',
        position: { x: 10, y: 1, z: 0 },
        halfExtents: { x: 1, y: 1, z: 1 },
        yaw: 0,
        pitch: 0,
      },
    ],
    trees: [{ x: 20, z: 20, height: 5, canopy: 2 }],
    roads: [{ x1: 0, z1: -100, x2: 0, z2: 100, width: 10 }],
    exit: { x: 90, z: 0 },
  };
}

describe('mulberry32', () => {
  it('is deterministic for the same seed and varies with a different one', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    const seqC = [c(), c(), c()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const v of [...seqA, ...seqC]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('PlaceholderMapKit', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('builds one mesh per piece, plus two per tree, one per road, plus the ground', () => {
    const l = layout();
    const group = buildKitMeshes(l, {
      ground: 0x336633,
      pieces: { wall: 0x555555, crate: 0x996633 },
    });
    expect(group.children).toHaveLength(1 + l.pieces.length + l.trees.length * 2 + l.roads.length);
    expect(group.getObjectByName('ground')).toBeDefined();
    expect(group.getObjectByName('wall')).toBeDefined();
    expect(group.getObjectByName('crate')).toBeDefined();
  });

  it('falls back to a default colour for a kind missing from the palette', () => {
    const l = layout();
    expect(() => buildKitMeshes(l, { ground: 0x336633, pieces: {} })).not.toThrow();
  });

  it('calls the decorator once per piece with a working material factory', () => {
    const l = layout();
    const seen: string[] = [];
    buildKitMeshes(l, { ground: 0x336633, pieces: {} }, (piece, mesh, group, material) => {
      seen.push(piece.kind);
      expect(mesh.name).toBe(piece.kind);
      const extra = new Mesh(new BoxGeometry(1, 1, 1), material('topper', 0xff00ff));
      group.add(extra);
    });
    expect(seen).toEqual(['wall', 'crate']);
  });

  it('builds colliders the physics world can hit (ground + pieces + tree trunks)', () => {
    const l = layout();
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildKitColliders(physics, l);
    expect(created).toBe(l.pieces.length + l.trees.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: 0, y: 50, z: 0 }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(0.5); // stopped by the wall, above ground level
    physics.dispose();
  });
});
