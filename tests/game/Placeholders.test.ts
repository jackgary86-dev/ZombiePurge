import { describe, it, expect } from 'vitest';
import { Mesh, MeshStandardMaterial } from 'three';
import { buildPlaceholderCar, SawView } from '../../src/game/art';
import { DEFAULT_CONFIG } from '../../src/data/defaults';

describe('L3/L4 car cosmetics on the placeholder car', () => {
  it('ships with a stock bumper and a driver figure already in place', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    expect(car.group.getObjectByName('cosmetic_bumper')).toBeDefined();
    expect(car.driver.children.length).toBeGreaterThan(0);
  });

  it('setBumperStyle swaps the bumper without duplicating it', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    car.setBumperStyle('bumper_chrome');
    car.setBumperStyle('bumper_guard');
    expect(car.group.children.filter((c) => c.name === 'cosmetic_bumper')).toHaveLength(1);
  });

  it('setDriverColor recolours every part of the driver figure', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    car.setDriverColor(0xff0000);
    for (const child of car.driver.children) {
      expect((child as Mesh<never, MeshStandardMaterial>).material.color.getHex()).toBe(0xff0000);
    }
  });

  it('setWindowTint recolours and re-opacifies the cabin glass', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    const cabin = car.group.children.find((c) => c instanceof Mesh && c !== car.body) as Mesh<
      never,
      MeshStandardMaterial
    >;
    car.setWindowTint('window_dark', 0x0d0d10, 0.85);
    expect(cabin.material.color.getHex()).toBe(0x0d0d10);
    expect(cabin.material.opacity).toBeCloseTo(0.85);
  });

  it('the mirrored window style bumps metalness above the other styles', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    const cabin = car.group.children.find((c) => c instanceof Mesh && c !== car.body) as Mesh<
      never,
      MeshStandardMaterial
    >;
    car.setWindowTint('window_clear', 0x9fc4d8, 0.25);
    const clearMetalness = cabin.material.metalness;
    car.setWindowTint('window_mirror', 0xc8d0d8, 0.65);
    expect(cabin.material.metalness).toBeGreaterThan(clearMetalness);
  });

  it('setDoorStyle swaps the door trim without duplicating it', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    car.setDoorStyle('door_paneled');
    car.setDoorStyle('door_chrome_trim');
    expect(car.group.children.filter((c) => c.name === 'cosmetic_doors')).toHaveLength(1);
  });

  it('setDecalStyle swaps the decal without duplicating it', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    car.setDecalStyle('decal_flames');
    car.setDecalStyle('decal_skull');
    expect(car.group.children.filter((c) => c.name === 'cosmetic_decal')).toHaveLength(1);
    expect(car.group.getObjectByName('cosmetic_decal')!.children.length).toBeGreaterThan(0);
  });

  it('setTireStyle applies rim/tread trim to every wheel without duplicating it', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    car.setTireStyle('tire_chrome_rim');
    car.setTireStyle('tire_whitewall');
    for (const wheel of car.wheels) {
      expect(wheel.children.filter((c) => c.name === 'tire_trim')).toHaveLength(1);
      expect(wheel.getObjectByName('tire_trim')!.children.length).toBeGreaterThan(0);
    }
  });
});

describe('M3 SawView', () => {
  it('is hidden until activated', () => {
    const saw = new SawView(DEFAULT_CONFIG.vehicle.chassisHalfExtents);
    expect(saw.group.visible).toBe(false);
    saw.update(1 / 60, true);
    expect(saw.group.visible).toBe(true);
    saw.update(1 / 60, false);
    expect(saw.group.visible).toBe(false);
  });

  it('spins continuously while active and stops accumulating spin while inactive', () => {
    const saw = new SawView(DEFAULT_CONFIG.vehicle.chassisHalfExtents);
    const blade = saw.group.children[0];
    const startRotation = blade.rotation.y;
    saw.update(0.5, true);
    const spunRotation = blade.rotation.y;
    expect(spunRotation).not.toBeCloseTo(startRotation);
    saw.update(0.5, false);
    expect(blade.rotation.y).toBeCloseTo(spunRotation); // no further spin once inactive
  });
});
