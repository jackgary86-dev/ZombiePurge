import RAPIER from '@dimforge/rapier3d-compat';

let initialized: Promise<void> | null = null;

/** Rapier ships as WASM and must be initialised once before any world is created. */
export function initPhysics(): Promise<void> {
  initialized ??= RAPIER.init();
  return initialized;
}

export type CollisionHandler = (handle1: number, handle2: number, started: boolean) => void;

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly events: RAPIER.EventQueue;

  constructor(gravity: number, fixedTimeStep: number) {
    this.world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
    this.world.timestep = fixedTimeStep;
    this.events = new RAPIER.EventQueue(true);
  }

  /** Advances the simulation. Note: ray casts and other scene queries only see colliders after at least one step. */
  step(): void {
    this.world.step(this.events);
  }

  /** Collision start/stop events from the last step, for colliders that enabled COLLISION_EVENTS. */
  drainCollisions(handler: CollisionHandler): void {
    this.events.drainCollisionEvents(handler);
  }

  /** A large static box whose top face sits at y = 0. */
  addGround(halfSize: number, thickness = 1): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -thickness, 0)
    );
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfSize, thickness, halfSize),
      body
    );
  }

  addStaticBox(
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number; w: number }
  ): RAPIER.Collider {
    const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    if (rotation) desc.setRotation(rotation);
    const body = this.world.createRigidBody(desc);
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z),
      body
    );
  }

  dispose(): void {
    this.events.free();
    this.world.free();
  }
}

export { RAPIER };
