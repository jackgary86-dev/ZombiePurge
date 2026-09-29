import { describe, it, expect } from 'vitest';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import {
  COSMETIC_PART_NAMES,
  syncBumperStyle,
  syncDecalStyle,
  syncDoorStyle,
  syncTireStyle,
} from '../../src/game/art';

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

describe('L7 cosmetic decals', () => {
  it('"none" adds nothing - the free stock option', () => {
    const car = new Group();
    syncDecalStyle(car, 'decal_none', HE);
    const decal = car.getObjectByName(COSMETIC_PART_NAMES.decal)!;
    expect(decal).toBeDefined();
    expect(decal.children).toHaveLength(0);
  });

  it('flames mirror a cluster of licks onto both sides', () => {
    const car = new Group();
    syncDecalStyle(car, 'decal_flames', HE);
    const decal = car.getObjectByName(COSMETIC_PART_NAMES.decal)!;
    expect(decal.children).toHaveLength(4); // 2 licks per side
    const xs = (decal.children as Mesh[]).map((c) => Math.sign(c.position.x));
    expect(xs.filter((x) => x < 0)).toHaveLength(2);
    expect(xs.filter((x) => x > 0)).toHaveLength(2);
  });

  it('stripes mirror two long panels either side of the centreline', () => {
    const car = new Group();
    syncDecalStyle(car, 'decal_stripes', HE);
    const decal = car.getObjectByName(COSMETIC_PART_NAMES.decal)!;
    expect(decal.children).toHaveLength(2);
    const [left, right] = decal.children as Mesh[];
    expect(left.position.x).toBeCloseTo(-right.position.x);
  });

  it('skull adds a head plus two eye sockets per side', () => {
    const car = new Group();
    syncDecalStyle(car, 'decal_skull', HE);
    const decal = car.getObjectByName(COSMETIC_PART_NAMES.decal)!;
    expect(decal.children).toHaveLength(6); // (1 head + 2 sockets) x 2 sides
  });

  it('an unknown decal id falls back to none rather than crashing', () => {
    const car = new Group();
    syncDecalStyle(car, 'nonsense', HE);
    expect(car.getObjectByName(COSMETIC_PART_NAMES.decal)!.children).toHaveLength(0);
  });

  it('re-syncing never duplicates the decal part', () => {
    const car = new Group();
    syncDecalStyle(car, 'decal_none', HE);
    syncDecalStyle(car, 'decal_flames', HE);
    syncDecalStyle(car, 'decal_number', HE);
    expect(car.children.filter((c) => c.name === COSMETIC_PART_NAMES.decal)).toHaveLength(1);
  });
});

describe('L8 cosmetic tire trim', () => {
  const RADIUS = 0.35;

  it('stock adds no trim - the plain tire is the stock look', () => {
    const wheels = [new Group(), new Group()];
    syncTireStyle(wheels, 'tire_stock', RADIUS);
    for (const w of wheels) expect(w.children[0].children).toHaveLength(0);
  });

  it('applies the same trim to every wheel passed in', () => {
    const wheels = [new Group(), new Group(), new Group(), new Group()];
    syncTireStyle(wheels, 'tire_chrome_rim', RADIUS);
    for (const w of wheels) expect(w.children[0].children).toHaveLength(1);
  });

  it('whitewall adds both a whitewall ring and a rim disc', () => {
    const wheels = [new Group()];
    syncTireStyle(wheels, 'tire_whitewall', RADIUS);
    expect(wheels[0].children[0].children).toHaveLength(2);
  });

  it('off-road tread adds several lugs around the circumference', () => {
    const wheels = [new Group()];
    syncTireStyle(wheels, 'tire_offroad_tread', RADIUS);
    expect(wheels[0].children[0].children.length).toBeGreaterThan(4);
  });

  it('re-syncing a wheel never duplicates its trim part', () => {
    const wheels = [new Group()];
    syncTireStyle(wheels, 'tire_stock', RADIUS);
    syncTireStyle(wheels, 'tire_chrome_rim', RADIUS);
    syncTireStyle(wheels, 'tire_whitewall', RADIUS);
    expect(wheels[0].children).toHaveLength(1);
  });
});
