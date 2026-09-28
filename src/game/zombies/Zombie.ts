import { Vector3 } from 'three';
import type { ZombieConfig, ZombieRank } from '../../data/types';
import { PhysicsWorld, RAPIER } from '../physics/PhysicsWorld';

export type ZombieState = 'idle' | 'wander' | 'alerted' | 'chase' | 'attack' | 'dead';

export const ZOMBIE_CAPSULE = { radius: 0.35, halfHeight: 0.55 };

/**
 * One zombie: a Rapier dynamic capsule with locked rotation so it stays upright,
 * plus gameplay stats copied from its rank's config. Instances are pooled, so a
 * zombie is reset on spawn rather than constructed.
 */
export class Zombie {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  rank: ZombieRank = 'walker';
  cfg!: ZombieConfig;
  hp = 0;
  maxHp = 0;
  state: ZombieState = 'dead';
  active = false;
  /** Seconds spent in the current state. */
  stateTime = 0;
  /** Wander heading in radians, picked by the AI. */
  wanderHeading = 0;
  /** Time left before the zombie can attack again. */
  attackCooldown = 0;
  /** Seconds of burning left (flamethrower); damage per second while burning. */
  burnTimeLeft = 0;
  burnDamagePerSecond = 0;
  /** F4: time left before a boss can slam again (see BossSlam.ts); unused without cfg.slam. */
  slamCooldown = 0;
  /** Set by the AI each update; read by the renderer for facing. */
  readonly facing = new Vector3(0, 0, 1);
  /** Velocity captured just before the last physics step (see RunOverSystem.beforeStep). */
  readonly velocityBeforeStep = new Vector3();
  private readonly position = new Vector3();

  constructor(
    private readonly physics: PhysicsWorld,
    readonly poolIndex: number
  ) {
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, -100, 0)
        .lockRotations()
        .setLinearDamping(2)
        .setCanSleep(false)
        .setEnabled(false)
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(ZOMBIE_CAPSULE.halfHeight, ZOMBIE_CAPSULE.radius)
        .setDensity(0)
        .setFriction(0.8)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body
    );
    this.body.setAdditionalMass(80, false);
  }

  spawn(rank: ZombieRank, cfg: ZombieConfig, position: { x: number; y: number; z: number }): void {
    this.rank = rank;
    this.cfg = cfg;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.state = 'idle';
    this.stateTime = 0;
    this.attackCooldown = 0;
    this.burnTimeLeft = 0;
    this.burnDamagePerSecond = 0;
    this.slamCooldown = cfg.slam ? cfg.slam.cooldown * 0.5 : 0;
    this.wanderHeading = Math.random() * Math.PI * 2;
    this.active = true;
    this.body.setEnabled(true);
    this.body.setTranslation(
      {
        x: position.x,
        y: position.y + ZOMBIE_CAPSULE.halfHeight + ZOMBIE_CAPSULE.radius,
        z: position.z,
      },
      true
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
  }

  despawn(): void {
    this.active = false;
    this.state = 'dead';
    this.body.setEnabled(false);
    this.body.setTranslation({ x: 0, y: -100, z: 0 }, false);
  }

  /** Applies damage; returns true when this hit killed the zombie. */
  takeDamage(amount: number): boolean {
    if (!this.active || this.state === 'dead') return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.state = 'dead';
      this.stateTime = 0;
      return true;
    }
    return false;
  }

  isAlive(): boolean {
    return this.active && this.state !== 'dead';
  }

  setState(state: ZombieState): void {
    if (state === this.state) return;
    this.state = state;
    this.stateTime = 0;
  }

  getPosition(target = this.position): Vector3 {
    const t = this.body.translation();
    return target.set(t.x, t.y, t.z);
  }

  /** Feet position (bottom of the capsule), handy for spawning and rendering. */
  getFeetY(): number {
    return this.body.translation().y - ZOMBIE_CAPSULE.halfHeight - ZOMBIE_CAPSULE.radius;
  }

  /** Drive the body horizontally at the given velocity while gravity keeps handling Y. */
  setHorizontalVelocity(vx: number, vz: number): void {
    const v = this.body.linvel();
    this.body.setLinvel({ x: vx, y: v.y, z: vz }, true);
    if (vx !== 0 || vz !== 0) this.facing.set(vx, 0, vz).normalize();
  }

  getSpeed(): number {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.z);
  }

  dispose(): void {
    this.physics.world.removeRigidBody(this.body);
  }
}
