import { describe, it, expect } from 'vitest';
import { Mesh, MeshStandardMaterial } from 'three';
import { buildPlaceholderCar } from '../../src/game/art';
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
});
