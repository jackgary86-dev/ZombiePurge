import { describe, it, expect, beforeAll } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, getMapConfig, loadConfig, resetConfig } from '../../src/data/config';
import { initPhysics, PhysicsWorld, RAPIER } from '../../src/game/physics/PhysicsWorld';
import { chunkCoord, ChunkStreamer, generateOpenField } from '../../src/game/world';

describe('E1 large map framework', () => {
  beforeAll(async () => {
    await initPhysics();
    resetConfig();
  });

  it('config carries the 2 km map with spawn zones, pickups and streaming settings', () => {
    const map = getMapConfig('openfield');
    expect(map.size).toBe(2000);
    expect(map.chunkSize).toBe(250);
    expect(map.spawnZones!.length).toBeGreaterThan(0);
    expect(map.pickups!.some((p) => p.kind === 'gas')).toBe(true);
    expect(() => loadConfig({ maps: [{ ...getConfig().maps[1], chunkSize: 5000 }] })).toThrow(
      /chunkSize must not exceed size/
    );
    expect(() =>
      loadConfig({
        maps: [{ ...getConfig().maps[1], spawnZones: [{ x: 5000, z: 0, radius: 10, weight: 1 }] }],
      })
    ).toThrow(/centre is outside the map/);
  });

  it('generates deterministically and buckets every piece into its own chunk', () => {
    const a = generateOpenField(7, 2000, 250);
    const b = generateOpenField(7, 2000, 250);
    expect([...a.chunks.keys()]).toEqual([...b.chunks.keys()]);
    expect(a.chunks.get('0,0')!.pieces).toEqual(b.chunks.get('0,0')!.pieces);
    expect(generateOpenField(8, 2000, 250).chunks.get('0,0')!.pieces).not.toEqual(
      a.chunks.get('0,0')!.pieces
    );

    let pieces = 0;
    let trees = 0;
    for (const chunk of a.chunks.values()) {
      for (const p of chunk.pieces) {
        pieces++;
        if (p.kind === 'wall') continue; // walls straddle the boundary by design
        expect(chunkCoord(p.position.x, 250)).toBe(chunk.cx);
        expect(chunkCoord(p.position.z, 250)).toBe(chunk.cz);
      }
      for (const t of chunk.trees) {
        trees++;
        expect(chunkCoord(t.x, 250)).toBe(chunk.cx);
        expect(chunkCoord(t.z, 250)).toBe(chunk.cz);
      }
    }
    expect(pieces).toBeGreaterThan(150);
    expect(trees).toBeGreaterThan(150);
    expect(a.roads.length).toBe(18); // 9 vertical + 9 horizontal at 250 m spacing
  });

  it('streams chunks around the car and drops them when it moves away', () => {
    const layout = generateOpenField(7, 2000, 250);
    const physics = new PhysicsWorld(-9.81, 1 / 60);
    const streamer = new ChunkStreamer(layout, physics, 400);
    const before = physics.world.colliders.len();

    streamer.update(new Vector3(0, 1, 0), true);
    const nearCount = streamer.loadedCount;
    expect(nearCount).toBeGreaterThan(4);
    expect(nearCount).toBeLessThan(layout.chunks.size);
    expect(streamer.isLoaded(0, 0)).toBe(true);
    expect(streamer.isLoaded(-1, -1)).toBe(true);
    expect(streamer.isLoaded(3, 3)).toBe(false);
    const collidersNear = physics.world.colliders.len();
    expect(collidersNear).toBeGreaterThan(before);
    expect(streamer.root.children.length).toBe(nearCount + 1); // + ground

    // A building near the origin is solid.
    physics.step();
    const chunk = layout.chunks.get('0,0')!;
    const box = chunk.pieces.find((p) => p.kind === 'box')!;
    const hit = physics.world.castRay(
      new RAPIER.Ray({ x: box.position.x, y: 50, z: box.position.z }, { x: 0, y: -1, z: 0 }),
      100,
      true
    );
    expect(50 - hit!.timeOfImpact).toBeGreaterThan(1);

    streamer.update(new Vector3(900, 1, 900), true);
    expect(streamer.isLoaded(0, 0)).toBe(false);
    expect(streamer.isLoaded(3, 3)).toBe(true);
    expect(physics.world.colliders.len()).toBeLessThan(collidersNear + 400);

    // Moving within the same chunk is a no-op.
    const count = streamer.loadedCount;
    streamer.update(new Vector3(905, 1, 905));
    expect(streamer.loadedCount).toBe(count);

    streamer.dispose();
    expect(streamer.loadedCount).toBe(0);
    physics.dispose();
  });
});
