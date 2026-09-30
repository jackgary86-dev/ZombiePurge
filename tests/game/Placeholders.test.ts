import { describe, it, expect } from 'vitest';
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { buildPlaceholderCar, HammerView, SawView, TurretView } from '../../src/game/art';
import { DEFAULT_CONFIG } from '../../src/data/defaults';

describe('L3/L4 car cosmetics on the placeholder car', () => {
  it('ships with a stock bumper and a driver figure already in place', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    expect(car.group.getObjectByName('cosmetic_bumper')).toBeDefined();
    expect(car.driver.children.length).toBeGreaterThan(0);
  });

  it('S2: the body and every wheel are one merged Mesh each, more detailed than a plain box/cylinder', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    // a plain BoxGeometry has 24 vertices (4 unique per face x 6 faces); the merged hood/trunk/
    // spoiler body should have meaningfully more, while still being exactly one Mesh (so
    // CarDamageView's single-material tint and the cosmetics' single-body lookup keep working).
    expect(car.body.geometry.attributes.position.count).toBeGreaterThan(24);
    expect(car.wheels).toHaveLength(4);
    for (const wheel of car.wheels) {
      // a plain 18-segment cylinder has (18+1)*2 + 18*2 = 74 vertices; the merged tire+hub
      // should have more, from the extra hub-cap geometry.
      expect(wheel.geometry.attributes.position.count).toBeGreaterThan(74);
    }
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

  it('N2: ships with a single stock exhaust pipe, and setEngineType swaps it without duplicating it', () => {
    const car = buildPlaceholderCar(DEFAULT_CONFIG.vehicle);
    expect(car.group.getObjectByName('cosmetic_exhaust')!.children.length).toBe(1); // stock pipe

    car.setEngineType('engine_v8');
    expect(car.group.children.filter((c) => c.name === 'cosmetic_exhaust')).toHaveLength(1);
    expect(car.group.getObjectByName('cosmetic_exhaust')!.children.length).toBe(2); // dual pipes

    car.setEngineType('engine_turbo');
    expect(car.group.getObjectByName('cosmetic_exhaust')!.children.length).toBe(1);

    car.setEngineType('engine_electric');
    expect(car.group.getObjectByName('cosmetic_exhaust')!.children.length).toBe(0); // no exhaust
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

describe('M4 HammerView', () => {
  it('is hidden until activated and rests without swinging', () => {
    const hammer = new HammerView(DEFAULT_CONFIG.vehicle.chassisHalfExtents);
    expect(hammer.group.visible).toBe(false);
    const arm = hammer.group.children[0];
    const restRotation = arm.rotation.x;
    hammer.update(1 / 60, true);
    expect(hammer.group.visible).toBe(true);
    expect(arm.rotation.x).toBeCloseTo(restRotation); // no swing triggered yet
  });

  it('plays a one-shot swing arc that returns to rest, not a continuous loop', () => {
    const hammer = new HammerView(DEFAULT_CONFIG.vehicle.chassisHalfExtents);
    const arm = hammer.group.children[0];
    const restRotation = arm.rotation.x;
    hammer.triggerSwing();
    hammer.update(0.1, true); // partway through the swing
    expect(arm.rotation.x).not.toBeCloseTo(restRotation);
    hammer.update(1, true); // long past the swing's duration
    expect(arm.rotation.x).toBeCloseTo(restRotation); // settled back to rest
  });
});

describe('M5 TurretView', () => {
  it('starts hidden with a machine-gun barrel and rebuilds only when the kind changes', () => {
    const turret = new TurretView(new Vector3(0, 0.8, 0.2));
    expect(turret.group.visible).toBe(false);
    const barrels = turret.group.children[1];
    expect(barrels.children).toHaveLength(1); // machine gun: one long barrel

    const sameMesh = barrels.children[0];
    turret.setKind('machinegun'); // no-op: already this kind
    expect(barrels.children[0]).toBe(sameMesh);
  });

  it('gives shotgun a stubby double barrel and rockets a 2x2 tube cluster', () => {
    const turret = new TurretView(new Vector3(0, 0.8, 0.2));
    const barrels = turret.group.children[1];

    turret.setKind('shotgun');
    expect(barrels.children).toHaveLength(2);

    turret.setKind('rockets');
    expect(barrels.children).toHaveLength(4);

    turret.setKind('machinegun');
    expect(barrels.children).toHaveLength(1);
  });
});
