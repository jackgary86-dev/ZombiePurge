import { describe, it, expect } from 'vitest';
import { PickupViews } from '../../src/game/art';

describe('E9 pickup props', () => {
  it('builds one prop per spot, positioned at its world location', () => {
    const spots = [
      { kind: 'gas' as const, x: 10, z: -5 },
      { kind: 'repair' as const, x: -3, z: 3 },
      { kind: 'coins' as const, x: 0, z: 0 },
      { kind: 'ammo' as const, x: 20, z: 20 },
    ];
    const views = new PickupViews(spots);
    expect(views.group.children).toHaveLength(4);
    expect(views.group.children[0].position.x).toBe(10);
    expect(views.group.children[0].position.z).toBe(-5);
  });

  it('hides a prop the instant it is taken, and shows it again when reset', () => {
    const spots = [{ kind: 'gas' as const, x: 0, z: 0 }];
    const state = [{ taken: false }];
    const views = new PickupViews(spots);
    views.sync(state, 0);
    expect(views.group.children[0].visible).toBe(true);
    state[0].taken = true;
    views.sync(state, 1);
    expect(views.group.children[0].visible).toBe(false);
    state[0].taken = false;
    views.sync(state, 2);
    expect(views.group.children[0].visible).toBe(true);
  });

  it('bobs the prop up and down over time without drifting off its spot', () => {
    const spots = [{ kind: 'coins' as const, x: 5, z: 5 }];
    const state = [{ taken: false }];
    const views = new PickupViews(spots);
    views.sync(state, 0);
    const y0 = views.group.children[0].position.y;
    views.sync(state, 0.5);
    const y1 = views.group.children[0].position.y;
    expect(y1).not.toBeCloseTo(y0, 5);
    expect(views.group.children[0].position.x).toBe(5);
    expect(views.group.children[0].position.z).toBe(5);
  });
});
