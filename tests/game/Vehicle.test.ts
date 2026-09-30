import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { NEUTRAL_INPUT, Vehicle, type VehicleInput } from '../../src/game/vehicle';

const DT = 1 / 60;

function makeWorld() {
  const cfg = getConfig();
  const physics = new PhysicsWorld(cfg.physics.gravity, DT);
  // Big enough that a 40 s top-speed run never reaches the edge.
  physics.addGround(3000);
  const car = new Vehicle(physics, cfg.vehicle, { x: 0, y: 1.2, z: 0 });
  return { cfg, physics, car };
}

function run(
  physics: PhysicsWorld,
  car: Vehicle,
  seconds: number,
  input: Partial<VehicleInput> = {}
) {
  const full: VehicleInput = { ...NEUTRAL_INPUT, ...input };
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    car.update(full, DT);
    physics.step();
  }
}

describe('Vehicle', () => {
  let physics: PhysicsWorld;
  let car: Vehicle;

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    ({ physics, car } = makeWorld());
  });

  afterEach(() => physics.dispose());

  it('settles on its suspension with all four wheels grounded', () => {
    run(physics, car, 3);
    const p = car.getPosition();
    const cfg = getConfig().vehicle;
    const restHeight = cfg.suspension.restLength + cfg.wheels.radius - cfg.wheels.attachHeight;
    expect(p.y).toBeGreaterThan(restHeight - 0.3);
    expect(p.y).toBeLessThan(restHeight + 0.05);
    expect(car.isGrounded()).toBe(true);
    expect(car.wheels.every((w) => w.grounded)).toBe(true);
    expect(Math.abs(car.getForwardSpeed())).toBeLessThan(0.05);
    expect(car.isUpsideDown()).toBe(false);
  });

  it('accelerates forward under throttle and never exceeds top speed', () => {
    run(physics, car, 1);
    run(physics, car, 4, { throttle: 1 });
    const speed = car.getForwardSpeed();
    expect(speed).toBeGreaterThan(10);
    expect(car.getPosition().z).toBeGreaterThan(20);

    run(physics, car, 40, { throttle: 1 });
    expect(car.getForwardSpeed()).toBeLessThanOrEqual(getConfig().vehicle.topSpeed * 1.02);
    expect(car.getForwardSpeed()).toBeGreaterThan(getConfig().vehicle.topSpeed * 0.8);
  });

  it('brakes to a stop, then reverses when brake is held', () => {
    run(physics, car, 1);
    run(physics, car, 4, { throttle: 1 });
    const before = car.getForwardSpeed();
    run(physics, car, 4, { brake: 1 });
    expect(car.getForwardSpeed()).toBeLessThan(before * 0.1);
    run(physics, car, 4, { brake: 1 });
    const reverse = car.getForwardSpeed();
    expect(reverse).toBeLessThan(-2);
    expect(reverse).toBeGreaterThanOrEqual(-getConfig().vehicle.reverseSpeed * 1.02);
  });

  it('turns right when steering right', () => {
    run(physics, car, 1);
    run(physics, car, 2, { throttle: 1 });
    const yawBefore = car.getYaw();
    run(physics, car, 2, { throttle: 0.6, steer: 1 });
    const yawAfter = car.getYaw();
    expect(yawAfter).toBeLessThan(yawBefore - 0.3); // right turn = clockwise from above
    expect(car.getPosition().x).toBeLessThan(-1); // facing +Z, right is -X
    expect(car.isUpsideDown()).toBe(false);
  });

  it('steering input is smoothed and returns to centre', () => {
    car.update({ ...NEUTRAL_INPUT, steer: 1 }, DT);
    const first = car.getSteerAngle();
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(getConfig().vehicle.steering.maxAngle);
    run(physics, car, 1, { steer: 1 });
    expect(car.getSteerAngle()).toBeCloseTo(getConfig().vehicle.steering.maxAngle, 2);
    run(physics, car, 1);
    expect(car.getSteerAngle()).toBe(0);
  });

  it('P1: rights itself from a moderate roll disturbance (a hard turn, a curb clip) without flipping', () => {
    run(physics, car, 1); // settle grounded first
    // A curb clip or hard lateral hit: a real angular kick, not a teleported rotation, so the
    // suspension/ground contact stays exactly as it would mid-drive.
    car.body.setAngvel({ x: 0, y: 0, z: 4 }, true);
    let sawUpsideDown = false;
    let maxTilt = 0;
    for (let i = 0; i < 180; i++) {
      // 3 s
      car.update(NEUTRAL_INPUT, DT);
      physics.step();
      if (car.isUpsideDown()) sawUpsideDown = true;
      const up = new Vector3(0, 1, 0).applyQuaternion(car.getQuaternion());
      maxTilt = Math.max(
        maxTilt,
        Math.acos(Math.min(1, Math.max(-1, up.dot(new Vector3(0, 1, 0)))))
      );
    }
    expect(sawUpsideDown).toBe(false);
    expect(maxTilt).toBeLessThan(getConfig().vehicle.stability.maxCorrectedAngle);
    const finalUp = new Vector3(0, 1, 0).applyQuaternion(car.getQuaternion());
    expect(finalUp.dot(new Vector3(0, 1, 0))).toBeGreaterThan(0.98); // settled back near upright
  });

  it('P1: a hard enough hit still flips the car despite the stability assist', () => {
    run(physics, car, 1);
    // Far beyond an ordinary driving disturbance - a real T-bone/ram-style hit.
    car.body.setAngvel({ x: 0, y: 0, z: 20 }, true);
    let sawUpsideDown = false;
    for (let i = 0; i < 90; i++) {
      // 1.5 s
      car.update(NEUTRAL_INPUT, DT);
      physics.step();
      if (car.isUpsideDown()) sawUpsideDown = true;
    }
    expect(sawUpsideDown).toBe(true);
  });

  it('detects upside down and rights itself on flip reset', () => {
    const flipped = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
    car.body.setRotation({ x: flipped.x, y: flipped.y, z: flipped.z, w: flipped.w }, true);
    car.body.setTranslation({ x: 0, y: 1.5, z: 0 }, true);
    run(physics, car, 1);
    expect(car.isUpsideDown()).toBe(true);

    car.update({ ...NEUTRAL_INPUT, flipReset: true }, DT);
    physics.step();
    expect(car.isUpsideDown()).toBe(false);
    run(physics, car, 2);
    expect(car.isUpsideDown()).toBe(false);
    expect(car.wheels.every((w) => w.grounded)).toBe(true);
  });

  it('ignores flip reset while upright', () => {
    run(physics, car, 1);
    const before = car.getPosition();
    car.update({ ...NEUTRAL_INPUT, flipReset: true }, DT);
    physics.step();
    expect(car.getPosition().y).toBeCloseTo(before.y, 1);
  });

  it("N2: setMass updates the physics body's real simulated mass, not just cfg.mass", () => {
    const startMass = getConfig().vehicle.mass;
    physics.step(); // Rapier only totals the body's mass once a step has run
    expect(car.body.mass()).toBeCloseTo(startMass, 1);
    car.setMass(startMass + 200); // e.g. equipping the V8 engine type
    physics.step();
    expect(car.body.mass()).toBeCloseTo(startMass + 200, 1);
    car.setMass(startMass - 150); // e.g. equipping the Electric motor instead
    physics.step();
    expect(car.body.mass()).toBeCloseTo(startMass - 150, 1);
  });

  it('handbrake sheds speed faster than coasting, without reversing past a standstill', () => {
    run(physics, car, 1);
    run(physics, car, 3, { throttle: 1 });
    const before = car.getForwardSpeed();
    expect(before).toBeGreaterThan(5);
    run(physics, car, 1, { handbrake: true });
    const withHandbrake = car.getForwardSpeed();

    const { physics: physics2, car: coastCar } = makeWorld();
    run(physics2, coastCar, 1);
    run(physics2, coastCar, 3, { throttle: 1 });
    run(physics2, coastCar, 1); // coast, no input at all
    const coasting = coastCar.getForwardSpeed();
    physics2.dispose();

    expect(withHandbrake).toBeLessThan(coasting); // handbrake sheds more speed than rolling resistance alone
    expect(withHandbrake).toBeGreaterThanOrEqual(0); // never yanks it into reverse
  });

  it("N2: a heavier or lighter mass doesn't change the achieved acceleration - drive force scales with mass to compensate", () => {
    run(physics, car, 1);
    run(physics, car, 3, { throttle: 1 });
    const stockSpeed = car.getForwardSpeed();

    const { physics: physics2, car: heavyCar } = makeWorld();
    heavyCar.setMass(getConfig().vehicle.mass + 200); // V8: +200 kg, same acceleration stat
    run(physics2, heavyCar, 1);
    run(physics2, heavyCar, 3, { throttle: 1 });
    expect(heavyCar.getForwardSpeed()).toBeCloseTo(stockSpeed, 0);
    physics2.dispose();
  });
});
