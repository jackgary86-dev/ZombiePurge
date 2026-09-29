import { describe, it, expect } from 'vitest';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { COSMETIC_PART_NAMES, syncBumperStyle, syncDoorStyle } from '../../src/game/art';

const HE = { x: 1, y: 0.5, z: 2 };

describe('L3 cosmetic bumper style', () => {
  it('builds a stock bumper as a single low box', () => {
    const car = new Group();
    syncBumperStyle(car, 'bumper_stock', HE);
    const bumper = car.getObjectByName(COSMETIC_PART_NAMES.bumper)!;
    expect(bumper).toBeDefined();
    expect(bumper.children).toHaveLength(1);
  });

  it('swapping to chrome replaces the geometry, not just recolours it', () => {
    const car = new Group();
    syncBumperStyle(car, 'bumper_stock', HE);
    const stockMesh = car.getObjectByName(COSMETIC_PART_NAMES.bumper)!.children[0] as Mesh;
    const stockGeometryType = stockMesh.geometry.type;

    syncBumperStyle(car, 'bumper_chrome', HE);
    const chromeMesh = car.getObjectByName(COSMETIC_PART_NAMES.bumper)!.children[0] as Mesh;
    expect(chromeMesh.geometry.type).not.toBe(stockGeometryType);
    expect((chromeMesh.material as MeshStandardMaterial).metalness).toBe(1);
  });

  it('the brush guard style adds several posts alongside the rail', () => {
    const car = new Group();
    syncBumperStyle(car, 'bumper_guard', HE);
    const bumper = car.getObjectByName(COSMETIC_PART_NAMES.bumper)!;
    expect(bumper.children.length).toBeGreaterThan(3); // 1 rail + 3 posts
  });

  it('an unknown style falls back to stock rather than leaving the car bare', () => {
    const car = new Group();
    syncBumperStyle(car, 'nonsense', HE);
    expect(car.getObjectByName(COSMETIC_PART_NAMES.bumper)!.children).toHaveLength(1);
  });

  it('re-syncing never duplicates the bumper part', () => {
    const car = new Group();
    syncBumperStyle(car, 'bumper_stock', HE);
    syncBumperStyle(car, 'bumper_chrome', HE);
    syncBumperStyle(car, 'bumper_guard', HE);
    expect(car.children.filter((c) => c.name === COSMETIC_PART_NAMES.bumper)).toHaveLength(1);
  });
});

describe('L6 cosmetic door trim', () => {
  it('stock adds no trim primitives - the body itself is the door', () => {
    const car = new Group();
    syncDoorStyle(car, 'door_stock', HE);
    const doors = car.getObjectByName(COSMETIC_PART_NAMES.doors)!;
    expect(doors).toBeDefined();
    expect(doors.children).toHaveLength(0);
  });

  it('paneled trim mirrors a panel on both sides of the body', () => {
    const car = new Group();
    syncDoorStyle(car, 'door_paneled', HE);
    const doors = car.getObjectByName(COSMETIC_PART_NAMES.doors)!;
    expect(doors.children).toHaveLength(2);
    const [left, right] = doors.children as Mesh[];
    expect(left.position.x).toBeCloseTo(-right.position.x);
  });

  it('chrome trim uses a distinct metallic material from paneled trim', () => {
    const car = new Group();
    syncDoorStyle(car, 'door_chrome_trim', HE);
    const mesh = car.getObjectByName(COSMETIC_PART_NAMES.doors)!.children[0] as Mesh;
    expect((mesh.material as MeshStandardMaterial).metalness).toBe(1);
  });

  it('re-syncing never duplicates the door trim part', () => {
    const car = new Group();
    syncDoorStyle(car, 'door_stock', HE);
    syncDoorStyle(car, 'door_paneled', HE);
    syncDoorStyle(car, 'door_chrome_trim', HE);
    expect(car.children.filter((c) => c.name === COSMETIC_PART_NAMES.doors)).toHaveLength(1);
  });
});
