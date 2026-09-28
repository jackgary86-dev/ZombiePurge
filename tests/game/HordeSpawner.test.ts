import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, getMapConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { DEFAULT_SPAWNER, HordeSpawner, ZombiePool } from '../../src/game/zombies';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('HordeSpawner', () => {
  let physics: PhysicsWorld;
  let pool: ZombiePool;
  const view = { carPosition: new Vector3(0, 0.8, 0), viewForward: new Vector3(0, 0, 1) };

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    physics = new PhysicsWorld(getConfig().physics.gravity, 1 / 60);
    physics.addGround(1000);
    pool = new ZombiePool(physics, 30, getConfig().zombies);
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  it('prefills to the density target with ranks from the map, all around the car inside the ring', () => {
    const map = getMapConfig('greybox');
    const spawner = new HordeSpawner(pool, map, DEFAULT_SPAWNER, undefined, seeded());
    spawner.density = 0.5;
    expect(spawner.prefill(view)).toBe(15);
    expect(pool.aliveCount).toBe(15);
    for (const z of pool.active()) {
      expect(map.zombieRanks).toContain(z.rank);
      const p = z.getPosition();
      const d = Math.hypot(p.x, p.z);
      expect(d).toBeGreaterThanOrEqual(
        DEFAULT_SPAWNER.spawnMinDistance - DEFAULT_SPAWNER.clusterRadius - 1
      );
      expect(d).toBeLessThanOrEqual(
        DEFAULT_SPAWNER.spawnMaxDistance + DEFAULT_SPAWNER.clusterRadius + 1
      );
      expect(Math.abs(p.x)).toBeLessThan(map.size / 2);
      expect(Math.abs(p.z)).toBeLessThan(map.size / 2);
    }
  });

  it('ongoing spawns land out of sight: outside the view cone, or ahead beyond fog', () => {
    const map = getMapConfig('greybox');
    const spawner = new HordeSpawner(pool, map, DEFAULT_SPAWNER, undefined, seeded(21));
    for (let i = 0; i < 60 * 4; i++) spawner.update(1 / 60, view);
    expect(pool.aliveCount).toBe(30);
    for (const z of pool.active()) {
      const p = z.getPosition();
      const d = Math.hypot(p.x, p.z);
      // Cluster members sit up to clusterRadius (plus a little wandering) from a centre that
      // obeyed the rule, so allow them that far inside the cone edge.
      const slackMeters = DEFAULT_SPAWNER.clusterRadius + 3;
      const slack = Math.atan2(slackMeters, d);
      const inCone = p.z / d > Math.cos(DEFAULT_SPAWNER.viewHalfAngle - slack);
      expect(!inCone || d >= map.fogDistance - slackMeters).toBe(true);
    }

    // Straight ahead is rejected inside fog range but accepted beyond it (a big map has room for that).
    const bigMap = { ...map, size: 2000 };
    let rolls: number[] = [];
    const scripted = () => rolls.shift() ?? 0;
    const near = new HordeSpawner(pool, bigMap, DEFAULT_SPAWNER, undefined, scripted);
    rolls = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // angle 0 (ahead), min distance, every attempt
    expect(near.pickSpawnPoint(view)).toBeNull();
    rolls = [0, 1]; // angle 0 (ahead), max distance = 340 m, beyond the 300 m fog
    const spot = near.pickSpawnPoint(view)!;
    expect(spot).not.toBeNull();
    expect(spot.z).toBeCloseTo(DEFAULT_SPAWNER.spawnMaxDistance, 5);
    expect(Math.abs(spot.x)).toBeLessThan(1e-6);
  });

  it('spawns in clusters so the road ahead holds actual hordes', () => {
    const spawner = new HordeSpawner(
      pool,
      getMapConfig('greybox'),
      DEFAULT_SPAWNER,
      undefined,
      seeded(9)
    );
    spawner.prefill(view);
    const positions = Array.from(pool.active()).map((z) => z.getPosition().clone());
    let withNeighbour = 0;
    for (const p of positions) {
      const near = positions.filter(
        (q) => q !== p && q.distanceTo(p) <= DEFAULT_SPAWNER.clusterRadius * 2
      ).length;
      if (near >= DEFAULT_SPAWNER.clusterMin - 1) withNeighbour++;
    }
    expect(withNeighbour / positions.length).toBeGreaterThan(0.8);
  });

  it('rate-limits spawning over time', () => {
    const spawner = new HordeSpawner(
      pool,
      getMapConfig('greybox'),
      DEFAULT_SPAWNER,
      undefined,
      seeded(7)
    );
    spawner.update(1 / 60, view);
    expect(pool.aliveCount).toBe(0);
    for (let i = 0; i < 60; i++) spawner.update(1 / 60, view);
    expect(pool.aliveCount).toBeGreaterThanOrEqual(DEFAULT_SPAWNER.spawnsPerSecond - 1);
    expect(pool.aliveCount).toBeLessThanOrEqual(DEFAULT_SPAWNER.spawnsPerSecond + 1);
    for (let i = 0; i < 60 * 5; i++) spawner.update(1 / 60, view);
    expect(pool.aliveCount).toBe(30);
  });

  it('never exceeds the pool capacity (max-alive cap)', () => {
    const spawner = new HordeSpawner(
      pool,
      getMapConfig('greybox'),
      DEFAULT_SPAWNER,
      undefined,
      seeded(3)
    );
    spawner.density = 5;
    spawner.prefill(view);
    expect(pool.aliveCount).toBe(30);
    expect(spawner.targetAlive).toBe(30);
  });

  it('despawns zombies that end up far from the car, and corpses after they linger', () => {
    const spawner = new HordeSpawner(
      pool,
      getMapConfig('greybox'),
      DEFAULT_SPAWNER,
      undefined,
      seeded(11)
    );
    spawner.prefill(view);
    const first = Array.from(pool.active())[0];
    first.takeDamage(9999);
    first.stateTime = 100;
    view.carPosition.set(5000, 0.8, 5000);
    const result = spawner.update(0, view);
    expect(result.despawned).toBe(30);
    expect(pool.aliveCount).toBe(0);
    view.carPosition.set(0, 0.8, 0);
  });

  it('rejects spawn points inside the view cone but accepts them beyond fog', () => {
    const map = getMapConfig('greybox');
    const spawner = new HordeSpawner(
      pool,
      map,
      { ...DEFAULT_SPAWNER, spawnMaxDistance: 400 },
      undefined,
      seeded(5)
    );
    expect(spawner.isInViewCone(new Vector3(0, 0, 100), view.viewForward, 100)).toBe(true);
    expect(spawner.isInViewCone(new Vector3(0, 0, -100), view.viewForward, 100)).toBe(false);
    expect(spawner.isInViewCone(new Vector3(0, 0, 350), view.viewForward, 350)).toBe(false);
  });

  it('uses weighted spawn zones when the map defines them', () => {
    const map = {
      ...getMapConfig('greybox'),
      size: 2000,
      spawnZones: [
        { x: 0, z: 200, radius: 40, weight: 0 }, // disabled
        { x: 0, z: -200, radius: 40, weight: 1 },
        { x: 200, z: 0, radius: 40, weight: 3 },
      ],
    };
    const spawner = new HordeSpawner(
      pool,
      map,
      { ...DEFAULT_SPAWNER, clusterMin: 1, clusterMax: 1 },
      undefined,
      seeded(4)
    );
    spawner.prefill(view);
    expect(pool.aliveCount).toBe(30);
    let south = 0;
    let east = 0;
    for (const z of pool.active()) {
      const p = z.getPosition();
      if (Math.hypot(p.x, p.z + 200) <= 40 + DEFAULT_SPAWNER.clusterRadius + 1) south++;
      else if (Math.hypot(p.x - 200, p.z) <= 40 + DEFAULT_SPAWNER.clusterRadius + 1) east++;
      else throw new Error(`zombie outside every zone at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
    }
    expect(east).toBeGreaterThan(south); // weight 3 vs 1
    expect(south).toBeGreaterThan(0);
  });
});
