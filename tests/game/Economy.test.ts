import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, loadConfig, resetConfig, ZOMBIE_RANKS } from '../../src/data/config';
import { RunStats, Wallet, WALLET_STORAGE_KEY, type WalletStorage } from '../../src/game/economy';

class MemoryStorage implements WalletStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('RunStats (C1 coins per kill, C2 distance bonus, C4 summary)', () => {
  let stats: RunStats;

  beforeEach(() => {
    resetConfig();
    stats = new RunStats(getConfig().rewards);
  });

  it('pays the configured coins for every rank', () => {
    const expected = { walker: 1, runner: 2, spitter: 4, brute: 6, tank: 15, boss: 100 };
    const pos = new Vector3();
    for (const rank of ZOMBIE_RANKS) {
      stats.trackPosition(pos, 10); // let any combo chain lapse so each kill pays base value
      const event = stats.recordKill(rank, { x: 0, y: 0, z: 0 });
      expect(event.coins).toBe(expected[rank]);
      expect(event.multiplier).toBe(1);
      expect(stats.killsByRank[rank]).toBe(1);
    }
    expect(stats.totalKills).toBe(6);
    expect(stats.coinsFromKills).toBe(128);
  });

  it('awards one coin per 250 m driven', () => {
    const dt = 1 / 60;
    const pos = new Vector3();
    let awards = 0;
    // 20 m/s for 30 s = 600 m => 2 coins
    for (let i = 0; i <= 60 * 30; i++) {
      pos.z = (20 * i) / 60;
      awards += stats.trackPosition(pos, dt);
    }
    expect(stats.distanceMeters).toBeCloseTo(600, 0);
    expect(stats.coinsFromDistance).toBe(2);
    expect(awards).toBe(2);
  });

  it('gives nothing for crawling or spinning in place, or for teleports', () => {
    const dt = 1 / 60;
    const pos = new Vector3();
    stats.trackPosition(pos, dt);
    for (let i = 0; i < 600; i++) {
      pos.x = Math.sin(i) * 0.002; // jitter far below the 0.5 m/s threshold
      stats.trackPosition(pos, dt);
    }
    expect(stats.distanceMeters).toBe(0);
    pos.set(500, 0, 500);
    stats.trackPosition(pos, dt);
    expect(stats.distanceMeters).toBe(0);
    stats.resetPosition();
    pos.set(510, 0, 500);
    stats.trackPosition(pos, dt);
    expect(stats.distanceMeters).toBe(0); // first sample after a reset only anchors
  });

  it('C3: chained kills raise the multiplier, the chain lapses after the window', () => {
    const pos = new Vector3();
    const at = { x: 0, y: 0, z: 0 };
    const events = [];
    for (let i = 0; i < 7; i++) {
      events.push(stats.recordKill('walker', at));
      for (let f = 0; f < 6; f++) stats.trackPosition(pos, 0.1); // 0.6 s between kills
    }
    // killsPerStep 3: kills 1-3 => x1, 4-6 => x2, 7 => x3
    expect(events.map((e) => e.multiplier)).toEqual([1, 1, 1, 2, 2, 2, 3]);
    expect(events[6].chain).toBe(7);
    expect(stats.coinsFromKills).toBe(1 + 1 + 1 + 2 + 2 + 2 + 3);

    for (let f = 0; f < 30; f++) stats.trackPosition(pos, 0.1); // 3 s > 2.5 s window
    expect(stats.comboChain).toBe(0);
    expect(stats.comboMultiplier).toBe(1);
    expect(stats.recordKill('tank', at)).toMatchObject({ coins: 15, multiplier: 1, chain: 1 });
  });

  it('C3: multiplier is capped and can be disabled in config', () => {
    const at = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 40; i++) stats.recordKill('walker', at);
    expect(stats.comboMultiplier).toBe(getConfig().rewards.combo.maxMultiplier);

    loadConfig({ rewards: { combo: { enabled: false } } });
    const off = new RunStats(getConfig().rewards);
    for (let i = 0; i < 10; i++) expect(off.recordKill('walker', at).multiplier).toBe(1);
    expect(off.coinsFromKills).toBe(10);
  });

  it('summarises kills, distance and coin sources', () => {
    stats.recordKill('walker', { x: 0, y: 0, z: 0 });
    stats.recordKill('tank', { x: 0, y: 0, z: 0 });
    const pos = new Vector3();
    for (let i = 0; i <= 60 * 15; i++) {
      pos.z = (20 * i) / 60;
      stats.trackPosition(pos, 1 / 60);
    }
    const s = stats.summary();
    expect(s.totalKills).toBe(2);
    expect(s.killsByRank.tank).toBe(1);
    expect(s.coinsFromKills).toBe(16);
    expect(s.coinsFromDistance).toBe(1);
    expect(s.coinsTotal).toBe(17);
    expect(s.distanceMeters).toBeCloseTo(300, 0);
    expect(s.durationSeconds).toBeCloseTo(15, 1);
  });
});

describe('Wallet (C5 persistence)', () => {
  beforeEach(() => resetConfig());

  it('persists across instances and refuses overspending', () => {
    const storage = new MemoryStorage();
    const w = new Wallet(getConfig().rewards, storage);
    w.add(120);
    expect(w.spend(50)).toBe(true);
    expect(w.spend(100)).toBe(false);
    expect(w.balance).toBe(70);
    expect(new Wallet(getConfig().rewards, storage).balance).toBe(70);
    expect(new Wallet(getConfig().rewards, storage).lifetime).toBe(120);
  });

  it('keeps only the configured share of a run on death', () => {
    const w = new Wallet(getConfig().rewards, new MemoryStorage());
    expect(w.bankRun(101, true)).toBe(50); // 50% kept, floored
    expect(w.bankRun(101, false)).toBe(101);
    expect(w.balance).toBe(151);
  });

  it('ignores corrupt or outdated saves', () => {
    const storage = new MemoryStorage();
    storage.setItem(WALLET_STORAGE_KEY, 'nope');
    expect(new Wallet(getConfig().rewards, storage).balance).toBe(0);
    storage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ version: 99, coins: 500 }));
    expect(new Wallet(getConfig().rewards, storage).balance).toBe(0);
    storage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ version: 1, coins: -5 }));
    expect(new Wallet(getConfig().rewards, storage).balance).toBe(0);
  });
});
