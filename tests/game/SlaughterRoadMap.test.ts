import { describe, it, expect, beforeAll } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildSlaughterRoadColliders,
  buildSlaughterRoadMeshes,
  generateSlaughterRoad,
  SLAUGHTER_ROAD_WIDTH,
} from '../../src/game/world/SlaughterRoadMap';

describe('Q1 Slaughtermode road', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateSlaughterRoad(77, 2200);
    const b = generateSlaughterRoad(77, 2200);
    expect(a).toEqual(b);
    const limit = 1100 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('is one long straight road with continuous flanking walls and a far-end backstop', () => {
    const layout = generateSlaughterRoad(77, 2200);
    expect(layout.roads).toHaveLength(1);
    const road = layout.roads[0];
    expect(road.x1).toBe(road.x2); // dead straight, no branches
    expect(road.z2 - road.z1).toBe(2200);
    expect(road.width).toBe(SLAUGHTER_ROAD_WIDTH);

    const walls = layout.pieces.filter((p) => p.kind === 'wall');
    expect(walls).toHaveLength(3); // two flanks + one far-end backstop
    const flanks = walls.filter((w) => w.halfExtents.z === 1100);
    expect(flanks).toHaveLength(2);
    expect(flanks.some((w) => w.position.x > 0)).toBe(true);
    expect(flanks.some((w) => w.position.x < 0)).toBe(true);
    // Flanks sit just outside the road's own half-width, not out at the map's outer edge.
    for (const w of flanks) expect(Math.abs(w.position.x)).toBeLessThan(SLAUGHTER_ROAD_WIDTH);

    const backstop = walls.find((w) => w.halfExtents.z !== 1100)!;
    expect(backstop.position.z).toBeGreaterThan(1000); // at the far end, not the spawn end
  });

  it('spawns at the near end, and the exit sits at the far end', () => {
    const layout = generateSlaughterRoad(77, 2200);
    expect(layout.spawn.z).toBeLessThan(-1000);
    expect(layout.exit.z).toBeGreaterThan(1000);
    expect(layout.trees).toHaveLength(0);
  });

  it('builds one mesh per piece plus the road and the ground', () => {
    const layout = generateSlaughterRoad(77, 2200);
    const group = buildSlaughterRoadMeshes(layout);
    expect(group.children).toHaveLength(1 + layout.pieces.length + layout.roads.length);
    expect(group.getObjectByName('ground')).toBeDefined();
    expect(group.getObjectByName('wall')).toBeDefined();
  });

  it('builds colliders for every piece, confining the car to the corridor', () => {
    const layout = generateSlaughterRoad(77, 2200);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildSlaughterRoadColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();
    const flank = layout.pieces.find((p) => p.kind === 'wall' && p.halfExtents.z === 1100)!;
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: flank.position.x, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(5 - hit!.timeOfImpact).toBeGreaterThan(0.5); // stopped by the wall, not the ground
    physics.dispose();
  });

  it('exposes a spawn point inside the arena', () => {
    const spawn = generateSlaughterRoad(77, 2200).spawn;
    expect(new Vector3(spawn.x, spawn.y, spawn.z)).toBeInstanceOf(Vector3);
    expect(Math.abs(spawn.x)).toBeLessThan(1100);
    expect(Math.abs(spawn.z)).toBeLessThan(1100);
  });
});
