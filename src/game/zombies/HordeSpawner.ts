import { Vector3 } from 'three';
import type { MapConfig, SpawnZone, ZombieRank } from '../../data/types';
import { canDespawnCorpse, DEFAULT_ZOMBIE_AI, type ZombieAIConfig } from './ZombieAI';
import type { ZombiePool } from './ZombiePool';

export interface SpawnerConfig {
  /** Zombies are spawned no closer than this to the car. */
  spawnMinDistance: number;
  /** ...and no further than this, so they can still find the car. */
  spawnMaxDistance: number;
  /** Zombies further than this from the car are recycled. */
  despawnDistance: number;
  /** Half-angle (radians) of the camera's view cone; spawns inside it are rejected unless beyond fog. */
  viewHalfAngle: number;
  /** Max spawns per second so a fresh map fills over a few seconds rather than in one frame. */
  spawnsPerSecond: number;
  /** Attempts to find a valid spot before giving up this update. */
  attemptsPerSpawn: number;
  /** Zombies spawn in groups of clusterMin..clusterMax around one point. */
  clusterMin: number;
  clusterMax: number;
  /** Radius (m) of a cluster around its centre. */
  clusterRadius: number;
}

export const DEFAULT_SPAWNER: SpawnerConfig = {
  spawnMinDistance: 120,
  spawnMaxDistance: 340,
  despawnDistance: 420,
  viewHalfAngle: Math.PI / 3,
  spawnsPerSecond: 12,
  attemptsPerSpawn: 6,
  clusterMin: 4,
  clusterMax: 10,
  clusterRadius: 9,
};

export interface SpawnerView {
  carPosition: Vector3;
  /** Horizontal camera forward direction (unit vector). */
  viewForward: Vector3;
}

const offset = new Vector3();

/**
 * Keeps the map populated: spawns zombies from the pool at random spots in a
 * ring around the car (outside the camera's view cone, or beyond fog distance),
 * and recycles zombies that wander too far or have been dead long enough.
 */
export class HordeSpawner {
  /** 0..1 fraction of the pool that should be alive. Sandbox exposes this as a slider. */
  density = 1;
  private spawnBudget = 0;

  constructor(
    private readonly pool: ZombiePool,
    private readonly map: MapConfig,
    private readonly cfg: SpawnerConfig = DEFAULT_SPAWNER,
    private readonly ai: ZombieAIConfig = DEFAULT_ZOMBIE_AI,
    private readonly rng: () => number = Math.random
  ) {}

  get targetAlive(): number {
    return Math.round(this.pool.capacity * Math.min(1, Math.max(0, this.density)));
  }

  update(
    dt: number,
    view: SpawnerView,
    ignoreView = false
  ): { spawned: number; despawned: number } {
    let despawned = 0;
    for (const z of this.pool.active()) {
      const far = z.getPosition().distanceTo(view.carPosition) > this.cfg.despawnDistance;
      if (far || canDespawnCorpse(z, this.ai)) {
        this.pool.despawn(z);
        despawned++;
      }
    }

    // Accrue budget at the spawn rate; never shrink a larger budget granted by prefill().
    this.spawnBudget = Math.min(
      this.spawnBudget + dt * this.cfg.spawnsPerSecond,
      Math.max(this.spawnBudget, this.cfg.spawnsPerSecond)
    );
    let spawned = 0;
    while (this.spawnBudget >= 1 && this.pool.aliveCount < this.targetAlive) {
      const centre = this.pickSpawnPoint(view, ignoreView);
      if (!centre) break;
      const size =
        this.cfg.clusterMin +
        Math.floor(this.rng() * (this.cfg.clusterMax - this.cfg.clusterMin + 1));
      for (
        let i = 0;
        i < size && this.spawnBudget >= 1 && this.pool.aliveCount < this.targetAlive;
        i++
      ) {
        const a = this.rng() * Math.PI * 2;
        const r = Math.sqrt(this.rng()) * this.cfg.clusterRadius;
        const spot = { x: centre.x + Math.sin(a) * r, y: 0, z: centre.z + Math.cos(a) * r };
        if (!this.pool.spawn(this.pickRank(), spot)) return { spawned, despawned };
        this.spawnBudget -= 1;
        spawned++;
      }
    }
    return { spawned, despawned };
  }

  /**
   * Fill immediately on map start, all around the car: nobody has been watching yet,
   * so the "spawn out of sight" rule doesn't apply and the road ahead gets a horde.
   */
  prefill(view: SpawnerView): number {
    this.spawnBudget = this.pool.capacity;
    return this.update(0, view, true).spawned;
  }

  pickRank(): ZombieRank {
    const ranks = this.map.zombieRanks;
    return ranks[Math.min(ranks.length - 1, Math.floor(this.rng() * ranks.length))];
  }

  pickSpawnPoint(
    view: SpawnerView,
    ignoreView = false
  ): { x: number; y: number; z: number } | null {
    const half = this.map.size / 2 - 5;
    const zones = (this.map.spawnZones ?? []).filter((z) => z.weight > 0);
    for (let i = 0; i < this.cfg.attemptsPerSpawn; i++) {
      let x: number;
      let z: number;
      if (zones.length > 0) {
        // Weighted zone, then a random point inside it (uniform over the disc).
        const zone = this.pickZone(zones);
        const a = this.rng() * Math.PI * 2;
        const r = Math.sqrt(this.rng()) * zone.radius;
        x = zone.x + Math.sin(a) * r;
        z = zone.z + Math.cos(a) * r;
      } else {
        const angle = this.rng() * Math.PI * 2;
        const dist =
          this.cfg.spawnMinDistance +
          this.rng() * (this.cfg.spawnMaxDistance - this.cfg.spawnMinDistance);
        x = view.carPosition.x + Math.sin(angle) * dist;
        z = view.carPosition.z + Math.cos(angle) * dist;
      }
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      offset.set(x - view.carPosition.x, 0, z - view.carPosition.z);
      const dist = offset.length();
      if (dist < this.cfg.spawnMinDistance || dist > this.cfg.spawnMaxDistance) continue;
      if (!ignoreView && this.isInViewCone(offset, view.viewForward, dist)) continue;
      return { x, y: 0, z };
    }
    return null;
  }

  private pickZone(zones: SpawnZone[]): SpawnZone {
    const total = zones.reduce((n, z) => n + z.weight, 0);
    let roll = this.rng() * total;
    for (const zone of zones) {
      roll -= zone.weight;
      if (roll <= 0) return zone;
    }
    return zones[zones.length - 1];
  }

  isInViewCone(toPoint: Vector3, viewForward: Vector3, dist: number): boolean {
    if (dist >= this.map.fogDistance) return false;
    const cos = (toPoint.x * viewForward.x + toPoint.z * viewForward.z) / Math.max(dist, 1e-6);
    return cos > Math.cos(this.cfg.viewHalfAngle);
  }
}
