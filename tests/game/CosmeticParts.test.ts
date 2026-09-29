import { describe, it, expect } from 'vitest';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { COSMETIC_PART_NAMES, syncBumperStyle } from '../../src/game/art';

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
