import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/data/defaults';
import { estimateCoinsPerMinute, minutesToAfford } from '../../src/data/balance';

/**
 * H2 balance pass: simulates coins/minute from a documented, mid-skill play-pace assumption
 * (src/data/balance.ts) on the map each upgrade tier actually unlocks on, and checks the result
 * against the "~10-15 minutes per major upgrade" target. Not a precision economy sim - a
 * regression net that would catch a mispriced tier (a typo'd extra zero, say) and a record of
 * where the real numbers landed when this was last checked.
 */
describe('H2 balance pass: coins/minute vs upgrade prices', () => {
  const storyMaps = DEFAULT_CONFIG.maps.filter((m) => m.storyIndex !== undefined);

  function minutesFor(unlockMap: number, price: number): number {
    const map = storyMaps.find((m) => m.storyIndex === unlockMap)!;
    const rate = estimateCoinsPerMinute(DEFAULT_CONFIG.rewards, map.zombieRanks);
    return minutesToAfford(price, rate);
  }

  it('every tier costs a plausible amount of play (0.5-25 min) on the map it unlocks on', () => {
    for (const u of DEFAULT_CONFIG.upgrades) {
      for (const t of u.tiers) {
        const minutes = minutesFor(t.unlockMap, t.price);
        expect(minutes, `${u.id} tier ${t.tier} (${minutes.toFixed(1)} min)`).toBeGreaterThan(0.5);
        expect(minutes, `${u.id} tier ${t.tier} (${minutes.toFixed(1)} min)`).toBeLessThan(25);
      }
    }
  });

  it('the whole upgrade tree clusters around the 10-15 minute target on average', () => {
    const allMinutes = DEFAULT_CONFIG.upgrades.flatMap((u) =>
      u.tiers.map((t) => minutesFor(t.unlockMap, t.price))
    );
    const average = allMinutes.reduce((a, b) => a + b, 0) / allMinutes.length;
    expect(average).toBeGreaterThan(8);
    expect(average).toBeLessThan(16);
  });

  it('documents the two tiers that sit furthest below the target, and why', () => {
    // Both are one-shot QoL items (not a power spike) that unlock late, where the map's own
    // earn rate is already high - deliberately affordable fast so the player isn't stuck
    // driving the newly-unlocked map's conditions (night, a longer tank) without them for long.
    expect(
      minutesFor(4, DEFAULT_CONFIG.upgrades.find((u) => u.id === 'headlights')!.tiers[0].price)
    ).toBeLessThan(2);
    expect(
      minutesFor(2, DEFAULT_CONFIG.upgrades.find((u) => u.id === 'fuel')!.tiers[0].price)
    ).toBeLessThan(3);
  });
});
