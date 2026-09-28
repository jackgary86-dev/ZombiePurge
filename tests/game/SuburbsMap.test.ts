import { describe, it, expect, beforeAll } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildSuburbsColliders,
  buildSuburbsMeshes,
  generateSuburbs,
  suburbsSpawn,
} from '../../src/game/world/SuburbsMap';

describe('E4/I6 Suburbs map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateSuburbs(3, 900);
    const b = generateSuburbs(3, 900);
    expect(a).toEqual(b);
    const limit = 450 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
    }
    for (const tree of a.trees) {
      expect(Math.abs(tree.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(tree.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('lays out two cul-de-sacs of houses, a park and a signposted exit', () => {
    const layout = generateSuburbs(3, 900);
    expect(layout.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4);
    const houses = layout.pieces.filter((p) => p.kind === 'house');
    expect(houses.length).toBeGreaterThanOrEqual(16);
    // Houses split roughly evenly either side of the crossroads (x=0).
    expect(houses.filter((h) => h.position.x > 0).length).toBeGreaterThan(0);
    expect(houses.filter((h) => h.position.x < 0).length).toBeGreaterThan(0);
    expect(layout.pieces.filter((p) => p.kind === 'fence').length).toBeGreaterThan(0);
    expect(layout.pieces.filter((p) => p.kind === 'car').length).toBeGreaterThan(0);
    expect(layout.pieces.filter((p) => p.kind === 'gate')).toHaveLength(2);
    expect(layout.trees.length).toBeGreaterThan(10);
    expect(layout.roads.length).toBeGreaterThan(0);
    // The exit sits on the map's edge, away from the centre.
    expect(Math.abs(layout.exit.x)).toBeGreaterThan(400);
  });

  it('builds one mesh per piece (houses get an extra roof) plus trees and the ground', () => {
    const layout = generateSuburbs(3, 900);
    const group = buildSuburbsMeshes(layout);
    const houses = layout.pieces.filter((p) => p.kind === 'house').length;
    const fountains = layout.pieces.filter((p) => p.kind === 'fountain').length;
    // ground + 1 mesh/piece + 1 roof/house + 1 water plane/fountain + 2 meshes/tree + 1/road.
    expect(group.children).toHaveLength(
      1 + layout.pieces.length + houses + fountains + layout.trees.length * 2 + layout.roads.length
    );
    expect(group.getObjectByName('ground')).toBeDefined();
    expect(group.getObjectByName('house')).toBeDefined();
    expect(group.getObjectByName('gate')).toBeDefined();
  });

  it('builds colliders for every piece and tree', () => {
    const layout = generateSuburbs(3, 900);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildSuburbsColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + layout.trees.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();

    // A house blocks a ray fired straight down one cul-de-sac's east lane.
    const house = layout.pieces.find((p) => p.kind === 'house')!;
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: house.position.x, y: 50, z: house.position.z }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(0.5);
    physics.dispose();
  });

  it('exposes a spawn point inside the arena', () => {
    const spawn = suburbsSpawn(generateSuburbs(3, 900));
    expect(spawn).toBeInstanceOf(Vector3);
    expect(Math.abs(spawn.x)).toBeLessThan(450);
    expect(Math.abs(spawn.z)).toBeLessThan(450);
  });
});
