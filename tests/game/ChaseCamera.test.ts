import { describe, it, expect, beforeEach } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { ChaseCamera, type ChaseTarget } from '../../src/game/camera';

const DT = 1 / 60;
const UP = new Vector3(0, 1, 0);

function target(overrides: Partial<ChaseTarget> = {}): ChaseTarget {
  return {
    position: new Vector3(0, 0.8, 0),
    quaternion: new Quaternion(),
    forwardSpeed: 0,
    ...overrides,
  };
}

function settle(cam: ChaseCamera, t: ChaseTarget, seconds = 3) {
  for (let i = 0; i < seconds / DT; i++) cam.update(DT, t);
}

describe('ChaseCamera', () => {
  let cam: ChaseCamera;
  let three: PerspectiveCamera;

  beforeEach(() => {
    resetConfig();
    three = new PerspectiveCamera(getConfig().camera.baseFov, 16 / 9, 0.1, 1000);
    cam = new ChaseCamera(three, getConfig().camera, { speedForMaxEffect: 50 });
  });

  it('sits behind and above a car facing +Z', () => {
    const t = target();
    settle(cam, t);
    const cfg = getConfig().camera;
    expect(three.position.z).toBeCloseTo(-cfg.distance, 1);
    expect(three.position.x).toBeCloseTo(0, 3);
    expect(three.position.y).toBeCloseTo(t.position.y + 1 + cfg.height, 1);
    // Looking roughly toward the car, i.e. along +Z.
    const dir = new Vector3();
    three.getWorldDirection(dir);
    expect(dir.z).toBeGreaterThan(0.8);
  });

  it('follows the car heading, staying behind after a turn', () => {
    const t = target({ quaternion: new Quaternion().setFromAxisAngle(UP, Math.PI / 2) }); // facing +X
    settle(cam, t);
    expect(three.position.x).toBeLessThan(-5); // behind = -X
    expect(Math.abs(three.position.z)).toBeLessThan(0.5);
  });

  it('smooths movement rather than teleporting', () => {
    const t = target();
    settle(cam, t);
    t.position.z = 10;
    cam.update(DT, t);
    expect(three.position.z).toBeGreaterThan(-8);
    expect(three.position.z).toBeLessThan(2 - 8 + 8); // still well short of the new ideal (z=2)
  });

  it('widens FOV and pulls back with speed', () => {
    const cfg = getConfig().camera;
    settle(cam, target());
    const restDistance = three.position.distanceTo(new Vector3(0, 0.8 + 1, 0));
    settle(cam, target({ forwardSpeed: 50 }));
    expect(three.fov).toBeCloseTo(cfg.baseFov + cfg.speedFovBoost, 1);
    const fastDistance = three.position.distanceTo(new Vector3(0, 0.8 + 1, 0));
    expect(fastDistance).toBeGreaterThan(restDistance * 1.15);
  });

  it('orbits with mouse input and recenters while driving', () => {
    const t = target();
    settle(cam, t);
    cam.orbit(300, 0);
    settle(cam, t, 2);
    expect(Math.abs(three.position.x)).toBeGreaterThan(2); // swung to the side, stays while stopped
    const swung = three.position.x;
    t.forwardSpeed = 20;
    settle(cam, t, 4);
    expect(Math.abs(three.position.x)).toBeLessThan(Math.abs(swung) * 0.1);
    expect(cam.yawOffset).toBe(0);
  });

  it('never leaves the pitch range', () => {
    cam.orbit(0, 100000);
    expect(cam.pitchOffset).toBeLessThanOrEqual(1.2);
    cam.orbit(0, -100000);
    expect(cam.pitchOffset).toBeGreaterThanOrEqual(-0.35);
  });

  it('moves in front of obstacles reported by the probe', () => {
    const blocked = new ChaseCamera(three, getConfig().camera, {
      speedForMaxEffect: 50,
      probe: () => 0.5,
    });
    const t = target();
    settle(blocked, t);
    const dist = three.position.distanceTo(new Vector3(0, 1.8, 0));
    const fullDist = Math.hypot(getConfig().camera.distance, getConfig().camera.height);
    expect(dist).toBeLessThan(fullDist * 0.5);
    expect(dist).toBeGreaterThan(fullDist * 0.3);
  });

  it('snap() places the camera instantly', () => {
    const t = target({ position: new Vector3(100, 0.8, 100) });
    cam.snap(t);
    expect(three.position.z).toBeCloseTo(100 - getConfig().camera.distance, 1);
  });
});
