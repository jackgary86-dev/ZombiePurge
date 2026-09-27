import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig, ZOMBIE_RANKS } from '../../src/data/config';
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
    for (const rank of ZOMBIE_RANKS) {
      const event = stats.recordKill(rank, { x: 0, y: 0, z: 0 });
      expect(event.coins).toBe(expected[rank]);
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
