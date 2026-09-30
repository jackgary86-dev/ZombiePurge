import { describe, it, expect, beforeAll } from 'vitest';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import {
  buildIndustrialCityColliders,
  buildIndustrialCityMeshes,
  generateIndustrialCity,
} from '../../src/game/world/IndustrialCityMap';

describe('E6/I7 Industrial City map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is deterministic and fits inside the map bounds', () => {
    const a = generateIndustrialCity(11, 1100);
    const b = generateIndustrialCity(11, 1100);
    expect(a).toEqual(b);
    const limit = 550 + 2;
    for (const piece of a.pieces) {
      expect(Math.abs(piece.position.x)).toBeLessThanOrEqual(limit);
      expect(Math.abs(piece.position.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('packs the grid with warehouses on tight streets, leaving the centre clear', () => {
    const layout = generateIndustrialCity(11, 1100);
    expect(layout.pieces.filter((p) => p.kind === 'wall')).toHaveLength(4);
    const warehouses = layout.pieces.filter((p) => p.kind === 'warehouse');
    expect(warehouses.length).toBeGreaterThan(20);
    for (const w of warehouses) {
      expect(Math.hypot(w.position.x, w.position.z)).toBeGreaterThan(80); // centre courtyard is clear
    }
    expect(layout.pieces.filter((p) => p.kind === 'ramp').length).toBeGreaterThan(0);
    expect(layout.pieces.filter((p) => p.kind === 'gate')).toHaveLength(2);
    expect(layout.trees).toHaveLength(0);
  });

  it('builds one mesh per piece plus one per road and the ground', () => {
    const layout = generateIndustrialCity(11, 1100);
    const group = buildIndustrialCityMeshes(layout);
    // S4: warehouses get a roof cap + vent (2 extra meshes each), crates get a strap (1 extra),
    // and gates get a lamp (1 extra) - all purely visual add-ons.
    const warehouses = layout.pieces.filter((p) => p.kind === 'warehouse').length;
    const crates = layout.pieces.filter((p) => p.kind === 'crate').length;
    const gates = layout.pieces.filter((p) => p.kind === 'gate').length;
    const decorationExtras = warehouses * 2 + crates * 1 + gates * 1;
    expect(group.children).toHaveLength(
      1 + layout.pieces.length + layout.roads.length + decorationExtras
    );
    expect(group.getObjectByName('warehouse')).toBeDefined();
  });

  it('builds colliders for every piece', () => {
    const layout = generateIndustrialCity(11, 1100);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const created = buildIndustrialCityColliders(physics, layout);
    expect(created).toBe(layout.pieces.length + 1);
    expect(physics.world.colliders.len()).toBe(created);
    physics.step();
    const warehouse = layout.pieces.find((p) => p.kind === 'warehouse')!;
    const hit = physics.world.castRay(
      new RAPIER.Ray(
        { x: warehouse.position.x, y: 50, z: warehouse.position.z },
        { x: 0, y: -1, z: 0 }
      ),
      100,
      true
    );
    expect(hit).not.toBeNull();
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(0.5);
    physics.dispose();
  });

  it('exposes a spawn point inside the arena, away from the exit', () => {
    const layout = generateIndustrialCity(11, 1100);
    expect(Math.abs(layout.spawn.x)).toBeLessThan(550);
    expect(Math.abs(layout.spawn.z)).toBeLessThan(550);
    expect(Math.abs(layout.spawn.x - layout.exit.x)).toBeGreaterThan(100);
  });
});
