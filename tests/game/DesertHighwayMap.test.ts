import { describe, it, expect, beforeAll } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildDesertHighwayColliders,
  buildDesertHighwayMeshes,
  generateDesertHighway,
} from '../../src/game/world/DesertHighwayMap';

describe('E5/I7 Desert Highway map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateDesertHighway(5, 1600);
    const b = generateDesertHighway(5, 1600);
    expect(a).toEqual(b);
    const limit = 800 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('runs one long highway with gas stations and jump ramps along it', () => {
    const layout = generateDesertHighway(5, 1600);
    expect(layout.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4);
    const stations = layout.pieces.filter((p) => p.kind === 'station');
    expect(stations.length).toBeGreaterThanOrEqual(3);
    // Stations alternate sides of the road.
    expect(stations.some((s) => s.position.x > 0)).toBe(true);
    expect(stations.some((s) => s.position.x < 0)).toBe(true);
    expect(layout.pieces.filter((p) => p.kind === 'pump').length).toBe(stations.length * 2);
    expect(layout.pieces.filter((p) => p.kind === 'ramp').length).toBeGreaterThanOrEqual(3);
    expect(layout.trees).toHaveLength(0); // desert: cacti/rocks, not trees
    expect(layout.pieces.filter((p) => p.kind === 'cactus').length).toBeGreaterThan(0);
    expect(layout.pieces.filter((p) => p.kind === 'rock').length).toBeGreaterThan(0);
    // The exit sits at the far end of the highway, away from the spawn.
    expect(layout.exit.z).toBeGreaterThan(700);
    expect(layout.spawn.z).toBeLessThan(-700);
  });

  it('builds one mesh per piece plus two per prop-tree(none) and the ground', () => {
    const layout = generateDesertHighway(5, 1600);
    const group = buildDesertHighwayMeshes(layout);
    expect(group.children).toHaveLength(1 + layout.pieces.length + layout.roads.length);
    expect(group.getObjectByName('ground')).toBeDefined();
    expect(group.getObjectByName('station')).toBeDefined();
  });

  it('builds colliders for every piece', () => {
    const layout = generateDesertHighway(5, 1600);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildDesertHighwayColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();
    const station = layout.pieces.find((p) => p.kind === 'station')!;
    const hit = physics.world.castRay(
      new RAPIER.Ray(
        { x: station.position.x, y: 50, z: station.position.z },
        { x: 0, y: -1, z: 0 }
      ),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(0.5);
    physics.dispose();
  });

  it('exposes a spawn point inside the arena', () => {
    const spawn = generateDesertHighway(5, 1600).spawn;
    expect(new Vector3(spawn.x, spawn.y, spawn.z)).toBeInstanceOf(Vector3);
    expect(Math.abs(spawn.x)).toBeLessThan(800);
    expect(Math.abs(spawn.z)).toBeLessThan(800);
  });
});
