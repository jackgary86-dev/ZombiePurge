import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { CameraConfig } from '../../data/types';

export interface ChaseTarget {
  position: Vector3;
  quaternion: Quaternion;
  /** Forward speed in m/s; drives FOV widening and pull-back. */
  forwardSpeed: number;
}

export interface ChaseCameraOptions {
  /** Speed at which FOV boost and pull-back reach their maximum (typically vehicle topSpeed). */
  speedForMaxEffect: number;
  /**
   * Optional obstruction probe: returns the fraction (0..1) along from→to where the
   * first solid hit occurs, or null when the path is clear. Used to keep the camera
   * out of walls and buildings.
   */
  probe?: (from: Vector3, to: Vector3) => number | null;
}

const UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, 1);
const RECENTER_DELAY_SECONDS = 1.0;
const MAX_PITCH = 1.2;
const MIN_PITCH = -0.35;
const PULLBACK_AT_MAX_SPEED = 0.35;
const NEAR_CLEARANCE = 0.4;

/** Third-person camera that follows behind and above the target with orbit, recenter, and collision. */
export class ChaseCamera {
  yawOffset = 0;
  pitchOffset = 0;
  private timeSinceOrbit = Infinity;
  private initialized = false;
  private readonly desired = new Vector3();
  private readonly pivot = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly forward = new Vector3();
  private readonly backDir = new Vector3();
  private readonly tmp = new Vector3();

  constructor(
    readonly camera: PerspectiveCamera,
    private readonly cfg: CameraConfig,
    private readonly options: ChaseCameraOptions
  ) {}

  /** Apply orbit input (mouse or right-stick movement in pixels/units for this frame). */
  orbit(deltaX: number, deltaY: number): void {
    if (deltaX === 0 && deltaY === 0) return;
    this.yawOffset -= deltaX * this.cfg.orbitSensitivity;
    this.pitchOffset = MathUtils.clamp(
      this.pitchOffset + deltaY * this.cfg.orbitSensitivity,
      MIN_PITCH,
      MAX_PITCH
    );
    this.timeSinceOrbit = 0;
  }

  update(dt: number, target: ChaseTarget): void {
    this.timeSinceOrbit += dt;
    const speedRatio = MathUtils.clamp(
      Math.abs(target.forwardSpeed) / this.options.speedForMaxEffect,
      0,
      1
    );

    // Auto-recenter behind the car once the player is driving and has stopped orbiting.
    if (this.timeSinceOrbit > RECENTER_DELAY_SECONDS && Math.abs(target.forwardSpeed) > 1) {
      const k = 1 - Math.exp(-this.cfg.recenterSpeed * dt);
      this.yawOffset = MathUtils.lerp(this.yawOffset, 0, k);
      this.pitchOffset = MathUtils.lerp(this.pitchOffset, 0, k);
      if (Math.abs(this.yawOffset) < 1e-3) this.yawOffset = 0;
      if (Math.abs(this.pitchOffset) < 1e-3) this.pitchOffset = 0;
    }

    // Heading only (ignore the car's pitch/roll) so bumps and jumps don't throw the camera around.
    this.forward.copy(LOCAL_FORWARD).applyQuaternion(target.quaternion);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, 1);
    this.forward.normalize();

    const distance = this.cfg.distance * (1 + PULLBACK_AT_MAX_SPEED * speedRatio);
    this.backDir.copy(this.forward).negate().applyAxisAngle(UP, this.yawOffset);
    const pitch = this.pitchOffset;
    const horizontal = Math.cos(pitch);
    this.pivot.copy(target.position).addScaledVector(UP, 1);
    this.desired
      .copy(this.pivot)
      .addScaledVector(this.backDir, distance * horizontal)
      .addScaledVector(UP, this.cfg.height + distance * Math.sin(pitch));

    // Pull the camera in front of anything between the car and its desired spot.
    const hit = this.options.probe?.(this.pivot, this.desired) ?? null;
    if (hit !== null) {
      const fraction = Math.max(
        0,
        hit - NEAR_CLEARANCE / Math.max(this.pivot.distanceTo(this.desired), 1e-3)
      );
      this.tmp.copy(this.desired);
      this.desired.copy(this.pivot).lerp(this.tmp, fraction);
    }

    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.initialized = true;
    } else {
      const k = 1 - Math.exp(-this.cfg.followLerp * dt);
      this.camera.position.lerp(this.desired, k);
    }

    this.lookTarget.copy(target.position).addScaledVector(UP, 1.2).addScaledVector(this.forward, 2);
    this.camera.lookAt(this.lookTarget);

    const targetFov = this.cfg.baseFov + this.cfg.speedFovBoost * speedRatio;
    const fovK = 1 - Math.exp(-this.cfg.followLerp * dt);
    this.camera.fov = MathUtils.lerp(this.camera.fov, targetFov, fovK);
    this.camera.updateProjectionMatrix();
  }

  /** Snap to the ideal position immediately (e.g. after a respawn or flip reset). */
  snap(target: ChaseTarget): void {
    this.initialized = false;
    this.update(1 / 60, target);
  }
}
