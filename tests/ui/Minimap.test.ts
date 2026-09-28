import { describe, it, expect } from 'vitest';
import { computeMinimapFrame, toLocal } from '../../src/ui/Minimap';

describe('E3 minimap frame', () => {
  it('rotates the world so the car heading points up', () => {
    // Facing +Z: a point ahead (z+) is up, a point to the right (-x) is +x.
    expect(toLocal(0, 10, 0, 0, 0)).toEqual({ x: -0, y: 10 });
    expect(toLocal(-10, 0, 0, 0, 0).x).toBeCloseTo(10);
    // Facing +X (heading +90 deg): a point at +X is ahead.
    const ahead = toLocal(10, 0, 0, 0, Math.PI / 2);
    expect(ahead.y).toBeCloseTo(10);
    expect(ahead.x).toBeCloseTo(0);
    // Car offset applies.
    const p = toLocal(105, 200, 100, 200, 0);
    expect(p.x).toBeCloseTo(-5);
    expect(p.y).toBeCloseTo(0);
  });

  it('shows only zombies inside the radar range and flags the alerted ones', () => {
    const frame = computeMinimapFrame({
      carX: 0,
      carZ: 0,
      heading: 0,
      radarRange: 100,
      viewRange: 150,
      mapSize: 2000,
      roads: [],
      pickups: [],
      zombies: [
        { x: 0, z: 50, alive: true, state: 'idle' },
        { x: 30, z: 40, alive: true, state: 'chase' },
        { x: 0, z: 120, alive: true, state: 'chase' },
        { x: 0, z: 10, alive: false, state: 'dead' },
      ],
    });
    expect(frame.blips).toHaveLength(2);
    expect(frame.blips[0]).toMatchObject({ y: 50, alerted: false });
    expect(frame.blips[1].alerted).toBe(true);
    expect(frame.radarRange).toBe(100);
  });

  it('keeps nearby roads and pickups, drops far ones, and rotates the map bounds', () => {
    const frame = computeMinimapFrame({
      carX: 500,
      carZ: 500,
      heading: Math.PI / 2,
      radarRange: 80,
      viewRange: 150,
      mapSize: 2000,
      roads: [
        { x1: 500, z1: -1000, x2: 500, z2: 1000 },
        { x1: -1000, z1: -900, x2: 1000, z2: -900 },
      ],
      pickups: [
        { kind: 'gas', x: 520, z: 500 },
        { kind: 'repair', x: 900, z: 900 },
        { kind: 'coins', x: 505, z: 505, taken: true },
      ],
      zombies: [],
      objective: { x: 600, z: 500 },
    });
    expect(frame.roads).toHaveLength(1);
    expect(frame.pickups).toHaveLength(1);
    expect(frame.pickups[0].kind).toBe('gas');
    expect(frame.objective!.y).toBeCloseTo(100); // +X is ahead when facing +X
    expect(frame.bounds).toHaveLength(4);
    const corner = frame.bounds[0];
    expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(Math.hypot(1500, 1500));
  });
});
