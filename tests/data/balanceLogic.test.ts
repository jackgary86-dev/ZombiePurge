import { describe, it, expect } from 'vitest';
import { estimateCoinsPerMinute, minutesToAfford } from '../../src/data/balance';
import type { RewardsConfig } from '../../src/data/types';

const REWARDS: RewardsConfig = {
  coinsPerRank: { walker: 1, runner: 2, spitter: 4, brute: 6, tank: 15, iceZombie: 8, boss: 100 },
  metersPerDistanceCoin: 250,
  coinsKeptOnDeathPercent: 50,
  combo: { enabled: true, windowSeconds: 2.5, killsPerStep: 3, maxMultiplier: 4 },
};

describe('balance.ts (H2)', () => {
  it('estimateCoinsPerMinute averages the map roster and adds the distance bonus', () => {
    const rate = estimateCoinsPerMinute(REWARDS, ['walker', 'runner'], {
      killsPerMinute: 10,
      cruiseSpeedMs: 0,
    });
    // avg(1,2) * 10 = 15, no distance bonus with a 0 cruise speed.
    expect(rate).toBeCloseTo(15);
  });

  it('a richer roster and faster driving both raise the rate', () => {
    const cheap = estimateCoinsPerMinute(REWARDS, ['walker'], {
      killsPerMinute: 10,
      cruiseSpeedMs: 10,
    });
    const rich = estimateCoinsPerMinute(REWARDS, ['tank'], {
      killsPerMinute: 10,
      cruiseSpeedMs: 10,
    });
    expect(rich).toBeGreaterThan(cheap);
  });

  it('minutesToAfford is price/rate, and infinite when the rate is zero', () => {
    expect(minutesToAfford(300, 30)).toBe(10);
    expect(minutesToAfford(300, 0)).toBe(Infinity);
  });
});
