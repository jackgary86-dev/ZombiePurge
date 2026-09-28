import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildQuarantineLabColliders,
  buildQuarantineLabMeshes,
  generateQuarantineLab,
} from '../../src/game/world/QuarantineLabMap';

describe('E8/I7 Quarantine Lab Zone map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateQuarantineLab(17, 900);
    const b = generateQuarantineLab(17, 900);
    expect(a).toEqual(b);
    const limit = 450 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('builds four rings of five wall pieces each (three solid sides, one split by a doorway)', () => {
    const layout = generateQuarantineLab(17, 900);
    expect(layout.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4); // outer perimeter
    expect(layout.pieces.filter((p) => p.kind === 'labWall')).toHaveLength(4 * 5);
    expect(layout.pieces.filter((p) => p.kind === 'pod')).toHaveLength(8);
    expect(layout.roads).toHaveLength(0);
    expect(layout.trees).toHaveLength(0);
  });

  it('leaves the very centre (the boss chamber) free of walls', () => {
    const layout = generateQuarantineLab(17, 900);
    for (const p of layout.pieces) {
      if (p.kind !== 'labWall') continue;
      expect(Math.hypot(p.position.x, p.position.z)).toBeGreaterThan(50);
    }
  });

  it('builds one mesh per piece and the ground, and gives pods a distinct glow material', () => {
    const layout = generateQuarantineLab(17, 900);
    const group = buildQuarantineLabMeshes(layout);
    expect(group.children).toHaveLength(1 + layout.pieces.length);
    const pod = group.children.find((c) => c.name === 'pod') as import('three').Mesh;
    expect((pod.material as import('three').MeshStandardMaterial).color.getHex()).toBe(0x6dffb0);
  });

  it('builds colliders and leaves each ring doorway physically open', () => {
    const layout = generateQuarantineLab(17, 900);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildQuarantineLabColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + 1);
    physics.step();

    // The innermost ring's solid side (not its gap) stops a ray fired along it.
    const solidSide = layout.pieces.find(
      (p) => p.kind === 'labWall' && Math.hypot(p.position.x, p.position.z) < 100
    )!;
    const blocked = physics.world.castRay(
      new RAPIER.Ray(
        { x: solidSide.position.x, y: 50, z: solidSide.position.z },
        { x: 0, y: -1, z: 0 }
      ),
      100,
      true
    );
    expect(blocked).not.toBeNull();
    expect(50 - blocked!.timeOfImpact).toBeGreaterThan(0.5);
    physics.dispose();
  });

  it('exposes a spawn point and an exit that sit outside the outer ring', () => {
    const layout = generateQuarantineLab(17, 900);
    expect(Math.hypot(layout.spawn.x, layout.spawn.z)).toBeGreaterThan(300);
    expect(Math.hypot(layout.exit.x, layout.exit.z)).toBeGreaterThan(300);
  });
});
