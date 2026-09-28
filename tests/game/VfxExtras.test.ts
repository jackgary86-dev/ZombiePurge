import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { driveTrailColor, MuzzleFlashView, SkidMarkView, DriveTrailView } from '../../src/game/art';
import type { DriveTrailConfig, MuzzleFlashConfig, SkidMarkConfig } from '../../src/data/types';

describe('driveTrailColor (I9)', () => {
  it('maps each map generator to its own palette-matched dust/snow colour', () => {
    expect(driveTrailColor('desertHighway')).toBe(0xc98d4b);
    expect(driveTrailColor('frozenForest')).toBe(0xdfe8f0);
    expect(driveTrailColor('suburbs')).toBe(0x6b7b4a);
    expect(driveTrailColor('industrialCity')).toBe(0x4a4f52);
    expect(driveTrailColor('quarantineLab')).toBe(0x3a4a3d);
    expect(driveTrailColor('greybox')).toBe(0x3d3d3d);
  });
});

const FLASH_CFG: MuzzleFlashConfig = { durationSeconds: 0.1, size: 0.4 };

describe('MuzzleFlashView (I9)', () => {
  it('is hidden until triggered, then fades out and hides again', () => {
    const view = new MuzzleFlashView(FLASH_CFG);
    expect(view.mesh.visible).toBe(false);
    view.trigger(new Vector3(1, 2, 3));
    expect(view.mesh.visible).toBe(true);
    expect(view.mesh.position.x).toBe(1);
    view.update(0.05);
    expect(view.mesh.visible).toBe(true);
    view.update(0.1); // past durationSeconds
    expect(view.mesh.visible).toBe(false);
  });

  it('update() before any trigger is a no-op', () => {
    const view = new MuzzleFlashView(FLASH_CFG);
    view.update(0.5);
    expect(view.mesh.visible).toBe(false);
  });
});

const SKID_CFG: SkidMarkConfig = { intervalSeconds: 0.1, lifetimeSeconds: 1, maxMarks: 20 };
const SKID_CAP_CFG: SkidMarkConfig = { ...SKID_CFG, maxMarks: 3 };

describe('SkidMarkView (I9)', () => {
  const rearWheels = [new Vector3(-1, 0, -2), new Vector3(1, 0, -2)];

  it('drops a mark per rear wheel while skidding, at most once per interval', () => {
    const view = new SkidMarkView(SKID_CFG);
    view.update(0, true, rearWheels);
    expect(view.count).toBe(2);
    view.update(0.05, true, rearWheels); // still within interval
    expect(view.count).toBe(2);
    view.update(0.1, true, rearWheels); // interval elapsed
    expect(view.count).toBe(4);
  });

  it('does nothing while not skidding', () => {
    const view = new SkidMarkView(SKID_CFG);
    view.update(1, false, rearWheels);
    expect(view.count).toBe(0);
  });

  it('drops the oldest mark past maxMarks', () => {
    const view = new SkidMarkView(SKID_CAP_CFG);
    for (let i = 0; i < 3; i++) view.update(0.1, true, rearWheels); // 6 dropped, cap is 3
    expect(view.count).toBe(SKID_CAP_CFG.maxMarks);
  });

  it('fades and recycles marks past lifetimeSeconds', () => {
    const view = new SkidMarkView(SKID_CFG);
    view.update(0, true, rearWheels);
    expect(view.count).toBe(2);
    view.update(1.1, false, rearWheels);
    expect(view.count).toBe(0);
    expect(view.group.children).toHaveLength(0);
  });
});

const TRAIL_CFG: DriveTrailConfig = {
  minSpeed: 5,
  intervalSeconds: 0.1,
  lifetimeSeconds: 1,
  maxPuffs: 2,
};

describe('DriveTrailView (I9)', () => {
  it('spawns puffs only above minSpeed, at most once per interval', () => {
    const view = new DriveTrailView(TRAIL_CFG);
    view.update(0, 2, new Vector3(), 0xffffff); // too slow
    expect(view.count).toBe(0);
    view.update(0, 10, new Vector3(), 0xffffff);
    expect(view.count).toBe(1);
    view.update(0.05, 10, new Vector3(), 0xffffff); // still within interval
    expect(view.count).toBe(1);
  });

  it('drops the oldest puff past maxPuffs', () => {
    const view = new DriveTrailView(TRAIL_CFG);
    view.update(0, 10, new Vector3(), 0xffffff);
    view.update(0.1, 10, new Vector3(), 0xffffff);
    view.update(0.1, 10, new Vector3(), 0xffffff);
    expect(view.count).toBe(TRAIL_CFG.maxPuffs);
  });

  it('fades and recycles puffs past lifetimeSeconds', () => {
    const view = new DriveTrailView(TRAIL_CFG);
    view.update(0, 10, new Vector3(), 0xffffff);
    expect(view.count).toBe(1);
    view.update(1.1, 0, new Vector3(), 0xffffff);
    expect(view.count).toBe(0);
    expect(view.group.children).toHaveLength(0);
  });
});
