import type { ZombieConfig, ZombieRank } from '../../data/types';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { Zombie } from './Zombie';

/**
 * Pre-allocates every zombie the game will ever have alive at once. Spawning and
 * despawning only toggle bodies on and off, so hordes don't churn the allocator.
 */
export class ZombiePool {
  readonly zombies: Zombie[] = [];
  private readonly free: Zombie[] = [];
  private readonly byColliderHandle = new Map<number, Zombie>();

  constructor(
    physics: PhysicsWorld,
    readonly capacity: number,
    private readonly configs: Record<ZombieRank, ZombieConfig>
  ) {
    for (let i = 0; i < capacity; i++) {
      const zombie = new Zombie(physics, i);
      this.zombies.push(zombie);
      this.free.push(zombie);
      this.byColliderHandle.set(zombie.collider.handle, zombie);
    }
  }

  /** Returns the spawned zombie, or null when the max-alive cap is reached. */
  spawn(rank: ZombieRank, position: { x: number; y: number; z: number }): Zombie | null {
    const zombie = this.free.pop();
    if (!zombie) return null;
    zombie.spawn(rank, this.configs[rank], position);
    return zombie;
  }

  despawn(zombie: Zombie): void {
    if (!zombie.active) return;
    zombie.despawn();
    this.free.push(zombie);
  }

  despawnAll(): void {
    for (const z of this.zombies) this.despawn(z);
  }

  get aliveCount(): number {
    return this.capacity - this.free.length;
  }

  /** Active zombies only. Iterates the whole pool, which is fine at the sizes we run. */
  *active(): IterableIterator<Zombie> {
    for (const z of this.zombies) if (z.active) yield z;
  }

  fromColliderHandle(handle: number): Zombie | undefined {
    const z = this.byColliderHandle.get(handle);
    return z?.active ? z : undefined;
  }

  dispose(): void {
    for (const z of this.zombies) z.dispose();
    this.zombies.length = 0;
    this.free.length = 0;
    this.byColliderHandle.clear();
  }
}
