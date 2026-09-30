import { Quaternion, Vector3 } from 'three';
import type { VehicleConfig } from '../../data/types';
import { PhysicsWorld, RAPIER } from '../physics/PhysicsWorld';

/** Driver intent for one fixed step. Values are already clamped by the caller. */
export interface VehicleInput {
  /** 0..1 */
  throttle: number;
  /** 0..1 — brakes when moving forward, reverses when stopped. */
  brake: number;
  /** -1 (left) .. 1 (right) */
  steer: number;
  handbrake: boolean;
  flipReset: boolean;
}

export const NEUTRAL_INPUT: VehicleInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  flipReset: false,
};

export interface WheelState {
  /** Local attach point on the chassis. */
  readonly local: Vector3;
  readonly isFront: boolean;
  readonly isLeft: boolean;
  grounded: boolean;
  /** 0 = fully extended, 1 = fully compressed. */
  compression: number;
  steerAngle: number;
  /** World position of the wheel centre, for rendering. */
  readonly worldPosition: Vector3;
}

const UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, 1);
const LOCAL_RIGHT = new Vector3(1, 0, 0);
const AIR_DENSITY = 1.225;
const FRONTAL_AREA = 2.2;

/**
 * Arcade-leaning raycast car: one dynamic rigid body for the chassis and four
 * suspension rays. Each grounded wheel pushes the chassis up with a spring-damper
 * and applies drive, brake and lateral grip forces at the contact point.
 */
export class Vehicle {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly wheels: WheelState[];
  hp: number;
  /** Debug god mode: damage is ignored while set. */
  invulnerable = false;
  private steerAngle = 0;
  private readonly physics: PhysicsWorld;
  private readonly cfg: VehicleConfig;

  // Scratch objects reused every step to avoid allocation in the hot loop.
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly linvel = new Vector3();
  private readonly angvel = new Vector3();
  private readonly down = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly attach = new Vector3();
  private readonly contact = new Vector3();
  private readonly velAtPoint = new Vector3();
  private readonly wheelForward = new Vector3();
  private readonly wheelRight = new Vector3();
  private readonly force = new Vector3();
  private readonly tmp = new Vector3();
  private readonly chassisUp = new Vector3();
  private readonly tiltAxis = new Vector3();
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });

  constructor(
    physics: PhysicsWorld,
    cfg: VehicleConfig,
    spawn: { x: number; y: number; z: number }
  ) {
    this.physics = physics;
    this.cfg = cfg;
    const he = cfg.chassisHalfExtents;
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setCanSleep(false)
        .setAngularDamping(0.5)
    );
    // Density 0 so the configured mass is the whole story; a low centre of mass resists rolling.
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
        .setDensity(0)
        .setFriction(0.3)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body
    );
    this.hp = cfg.hp;
    this.applyMassProperties(cfg.mass);

    const w = cfg.wheels;
    this.wheels = [
      {
        isFront: true,
        isLeft: true,
        local: new Vector3(-w.halfTrack, w.attachHeight, w.halfWheelbase),
      },
      {
        isFront: true,
        isLeft: false,
        local: new Vector3(w.halfTrack, w.attachHeight, w.halfWheelbase),
      },
      {
        isFront: false,
        isLeft: true,
        local: new Vector3(-w.halfTrack, w.attachHeight, -w.halfWheelbase),
      },
      {
        isFront: false,
        isLeft: false,
        local: new Vector3(w.halfTrack, w.attachHeight, -w.halfWheelbase),
      },
    ].map((p) => ({
      ...p,
      grounded: false,
      compression: 0,
      steerAngle: 0,
      worldPosition: new Vector3(),
    }));
  }

  /** N2: re-applies mass and matching inertia to the physics body. Rapier only reads these at
   *  the point this is called, not on every step, so a garage-driven mass change (an engine
   *  type swap) needs an explicit call via `setMass()` - the constructor's own call only covers
   *  the car's starting mass. */
  private applyMassProperties(mass: number): void {
    const he = this.cfg.chassisHalfExtents;
    this.body.setAdditionalMassProperties(
      mass,
      { x: 0, y: -he.y * 0.5, z: 0 },
      // Box inertia, scaled down a little so the car feels responsive.
      {
        x: (mass / 12) * (4 * he.y * he.y + 4 * he.z * he.z) * 0.8,
        y: (mass / 12) * (4 * he.x * he.x + 4 * he.z * he.z) * 0.8,
        z: (mass / 12) * (4 * he.x * he.x + 4 * he.y * he.y) * 0.8,
      },
      { x: 0, y: 0, z: 0, w: 1 },
      true
    );
  }

  /** N2: changes the car's simulated mass (e.g. after an engine type swap). `cfg.mass` (and so
   *  `perWheelMass` in `update()`) and the physics body's actual simulated mass are kept in
   *  sync, so the configured `acceleration` stat keeps meaning the same thing regardless of
   *  mass - only momentum-driven physics (collisions, ram impacts) actually feel the weight. */
  setMass(mass: number): void {
    this.cfg.mass = mass;
    this.applyMassProperties(mass);
  }

  /** Apply one fixed step of driver input. Call before physics.step(). */
  update(input: VehicleInput, dt: number): void {
    if (input.flipReset && this.isUpsideDown()) this.flipReset();

    // Rapier keeps added forces until told otherwise, so clear last step's before applying this step's.
    this.body.resetForces(true);
    this.body.resetTorques(true);

    this.readBodyState();
    this.updateSteering(input.steer, dt);

    const forwardSpeed = this.linvel.dot(this.forward);
    const numDriveWheels = 4;
    let groundedWheels = 0;
    const maxRayLength = this.cfg.suspension.restLength + this.cfg.wheels.radius;

    for (const wheel of this.wheels) {
      this.attach.copy(wheel.local).applyQuaternion(this.q).add(this.pos);
      this.ray.origin = { x: this.attach.x, y: this.attach.y, z: this.attach.z };
      this.ray.dir = { x: this.down.x, y: this.down.y, z: this.down.z };
      const hit = this.physics.world.castRayAndGetNormal(
        this.ray,
        maxRayLength,
        true,
        undefined,
        undefined,
        undefined,
        this.body
      );
      wheel.steerAngle = wheel.isFront ? this.steerAngle : 0;

      if (!hit) {
        wheel.grounded = false;
        wheel.compression = 0;
        wheel.worldPosition
          .copy(this.attach)
          .addScaledVector(this.down, this.cfg.suspension.restLength);
        continue;
      }
      groundedWheels++;
      wheel.grounded = true;
      const dist = hit.timeOfImpact;
      // Beyond full compression the chassis collider takes the hit, so the spring saturates.
      const compressionMeters = Math.min(this.cfg.suspension.restLength, maxRayLength - dist);
      wheel.compression = Math.min(1, compressionMeters / this.cfg.suspension.restLength);
      this.contact.copy(this.attach).addScaledVector(this.down, dist);
      wheel.worldPosition.copy(this.contact).addScaledVector(this.down, -this.cfg.wheels.radius);

      // Velocity of the chassis at the wheel: v + ω × r
      this.tmp.copy(this.attach).sub(this.pos);
      this.velAtPoint.copy(this.angvel).cross(this.tmp).add(this.linvel);

      // Spring-damper suspension along the ray: springVel > 0 while compressing, so the
      // damper adds to the upward force on the way down and reduces it on the rebound.
      const springVel = this.velAtPoint.dot(this.down);
      const suspensionForce = Math.max(
        0,
        this.cfg.suspension.stiffness * compressionMeters + this.cfg.suspension.damping * springVel
      );
      this.force.copy(this.down).multiplyScalar(-suspensionForce);
      this.body.addForceAtPoint(this.force, this.attach, true);

      // Tire axes projected onto the ground plane.
      const normal = this.tmp.set(hit.normal.x, hit.normal.y, hit.normal.z);
      this.wheelForward
        .copy(LOCAL_FORWARD)
        .applyAxisAngle(UP, -wheel.steerAngle)
        .applyQuaternion(this.q)
        .projectOnPlane(normal)
        .normalize();
      this.wheelRight.copy(this.wheelForward).cross(normal).negate().normalize();

      const vLong = this.velAtPoint.dot(this.wheelForward);
      const vLat = this.velAtPoint.dot(this.wheelRight);
      const load = suspensionForce;
      const perWheelMass = this.cfg.mass / numDriveWheels;

      let longForce = 0;
      if (input.throttle > 0 && forwardSpeed < this.cfg.topSpeed) {
        longForce += input.throttle * perWheelMass * this.cfg.acceleration;
      }
      if (input.brake > 0) {
        if (vLong > 0.5) {
          longForce -= input.brake * perWheelMass * this.cfg.brakingDeceleration;
        } else if (forwardSpeed > -this.cfg.reverseSpeed) {
          longForce -= input.brake * perWheelMass * this.cfg.acceleration;
        }
      }
      if (input.handbrake && !wheel.isFront) {
        longForce -=
          Math.sign(vLong) *
          Math.min(
            (Math.abs(vLong) * perWheelMass) / dt,
            perWheelMass * this.cfg.brakingDeceleration * this.cfg.handbrake.brakingMultiplier
          );
      }
      longForce -= vLong * this.cfg.friction.rollingResistance * load;

      let grip = this.cfg.tires.grip;
      if (input.handbrake && !wheel.isFront) grip *= this.cfg.tires.handbrakeGripMultiplier;
      // Lateral force opposes slip; the friction limit stops it exceeding what the tire can hold.
      let latForce = -vLat * grip * load;
      const maxLat = load * this.cfg.tires.maxFriction;
      latForce = Math.max(-maxLat, Math.min(maxLat, latForce));
      // Never let the correction reverse the slip within a single step.
      const stopLat = (-vLat * perWheelMass) / dt;
      if (Math.abs(latForce) > Math.abs(stopLat)) latForce = stopLat;

      this.force
        .copy(this.wheelForward)
        .multiplyScalar(longForce)
        .addScaledVector(this.wheelRight, latForce);
      this.body.addForceAtPoint(this.force, this.contact, true);
    }

    // P1: a corrective torque that resists tipping onto the car's side/roof from ordinary
    // driving (hard turns, curb clips, glancing hits). It only acts while at least one wheel
    // has grip (so it never fights an intentional jump), fades to nothing as the tilt grows,
    // and is capped, so a hit hard enough to push past maxCorrectedAngle still completes a
    // real flip instead of being silently held upright.
    if (groundedWheels > 0) {
      const stab = this.cfg.stability;
      this.chassisUp.copy(UP).applyQuaternion(this.q);
      const tiltAngle = Math.acos(Math.min(1, Math.max(-1, this.chassisUp.dot(UP))));
      if (tiltAngle > 1e-4 && tiltAngle < stab.maxCorrectedAngle) {
        this.tiltAxis.copy(this.chassisUp).cross(UP);
        const axisLength = this.tiltAxis.length();
        if (axisLength > 1e-6) {
          this.tiltAxis.divideScalar(axisLength);
          const tipRate = this.angvel.dot(this.tiltAxis);
          const torqueMag = Math.max(
            0,
            Math.min(
              stab.maxUprightTorque,
              stab.uprightSpringTorque * tiltAngle - stab.uprightDamping * tipRate
            )
          );
          this.force.copy(this.tiltAxis).multiplyScalar(torqueMag);
          this.body.addTorque(this.force, true);
        }
      }
    }

    // Aerodynamic drag on the chassis.
    const speed = this.linvel.length();
    if (speed > 0.01) {
      const drag =
        0.5 * AIR_DENSITY * FRONTAL_AREA * this.cfg.friction.airResistance * speed * speed;
      this.force.copy(this.linvel).multiplyScalar(-drag / speed);
      this.body.addForce(this.force, true);
    }

    if (groundedWheels === 0) {
      const pitch = (input.brake - input.throttle) * this.cfg.airControl.pitchTorque;
      const yaw = -input.steer * this.cfg.airControl.yawTorque;
      this.tmp.copy(this.right).multiplyScalar(pitch).addScaledVector(UP, yaw);
      this.body.addTorque(this.tmp, true);
    }
  }

  /** Applies damage reduced by armor percent; returns the damage actually taken. */
  applyDamage(raw: number): number {
    if (raw <= 0 || this.hp <= 0 || this.invulnerable) return 0;
    const taken = Math.min(this.hp, raw * (1 - Math.min(100, this.cfg.armor) / 100));
    this.hp -= taken;
    return taken;
  }

  isDestroyed(): boolean {
    return this.hp <= 0;
  }

  getLinearVelocity(target = new Vector3()): Vector3 {
    const v = this.body.linvel();
    return target.set(v.x, v.y, v.z);
  }

  /** Forward speed in m/s (negative when reversing). */
  getForwardSpeed(): number {
    this.readBodyState();
    return this.linvel.dot(this.forward);
  }

  getPosition(target = new Vector3()): Vector3 {
    const t = this.body.translation();
    return target.set(t.x, t.y, t.z);
  }

  getQuaternion(target = new Quaternion()): Quaternion {
    const r = this.body.rotation();
    return target.set(r.x, r.y, r.z, r.w);
  }

  getForward(target = new Vector3()): Vector3 {
    return target.copy(LOCAL_FORWARD).applyQuaternion(this.getQuaternion(this.q));
  }

  getSteerAngle(): number {
    return this.steerAngle;
  }

  isGrounded(): boolean {
    return this.wheels.some((w) => w.grounded);
  }

  isUpsideDown(): boolean {
    return this.tmp.copy(UP).applyQuaternion(this.getQuaternion(this.q)).dot(UP) < 0;
  }

  /** Rights the car in place, lifted slightly so it doesn't spawn inside the ground. */
  flipReset(): void {
    const t = this.body.translation();
    const yaw = this.getYaw();
    const q = new Quaternion().setFromAxisAngle(UP, yaw);
    this.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    this.body.setTranslation({ x: t.x, y: t.y + 1.5, z: t.z }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /**
   * Heading as a rotation about world +Y that maps +Z onto the car's forward vector.
   * Facing +Z is 0; turning right (clockwise from above, toward -X) makes it negative.
   */
  getYaw(): number {
    const f = this.getForward(this.tmp);
    return Math.atan2(f.x, f.z);
  }

  private readBodyState(): void {
    const t = this.body.translation();
    const r = this.body.rotation();
    const lv = this.body.linvel();
    const av = this.body.angvel();
    this.pos.set(t.x, t.y, t.z);
    this.q.set(r.x, r.y, r.z, r.w);
    this.linvel.set(lv.x, lv.y, lv.z);
    this.angvel.set(av.x, av.y, av.z);
    this.down.copy(UP).applyQuaternion(this.q).negate();
    this.forward.copy(LOCAL_FORWARD).applyQuaternion(this.q);
    this.right.copy(LOCAL_RIGHT).applyQuaternion(this.q);
  }

  private updateSteering(steerInput: number, dt: number): void {
    const s = this.cfg.steering;
    const speedRatio = Math.min(1, Math.abs(this.linvel.dot(this.forward)) / this.cfg.topSpeed);
    const maxAngle = s.maxAngle * (1 - (1 - s.highSpeedFactor) * speedRatio);
    const target = steerInput * maxAngle;
    const rate = steerInput === 0 ? s.returnSpeed : s.sensitivity;
    const delta = target - this.steerAngle;
    const step = rate * maxAngle * dt;
    this.steerAngle += Math.abs(delta) <= step ? delta : Math.sign(delta) * step;
  }
}
