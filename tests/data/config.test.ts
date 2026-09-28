import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/data/defaults';
import {
  ConfigError,
  getConfig,
  getMapConfig,
  loadConfig,
  resetConfig,
  ZOMBIE_RANKS,
} from '../../src/data/config';

describe('config layer', () => {
  beforeEach(() => resetConfig());

  it('defaults are valid and match the design rewards table', () => {
    const cfg = loadConfig();
    expect(cfg.rewards.coinsPerRank).toEqual({
      walker: 1,
      runner: 2,
      spitter: 4,
      brute: 6,
      tank: 15,
      boss: 100,
    });
    expect(cfg.rewards.metersPerDistanceCoin).toBe(250);
    for (const rank of ZOMBIE_RANKS) expect(cfg.zombies[rank].rank).toBe(rank);
  });

  it('keeps zombie detection below the player view distance on every map', () => {
    const cfg = getConfig();
    for (const map of cfg.maps) {
      for (const rank of map.zombieRanks) {
        expect(cfg.zombies[rank].detectionRadius).toBeLessThan(map.fogDistance);
      }
    }
  });

  it('deep-merges overrides without dropping sibling values', () => {
    const cfg = loadConfig({ vehicle: { topSpeed: 80, steering: { sensitivity: 4 } } });
    expect(cfg.vehicle.topSpeed).toBe(80);
    expect(cfg.vehicle.steering.sensitivity).toBe(4);
    expect(cfg.vehicle.steering.maxAngle).toBe(DEFAULT_CONFIG.vehicle.steering.maxAngle);
    expect(cfg.vehicle.mass).toBe(1500);
  });

  it('does not mutate defaults after overrides', () => {
    loadConfig({ vehicle: { mass: 1 } });
    resetConfig();
    expect(getConfig().vehicle.mass).toBe(1500);
  });

  it('reports every problem with a readable path', () => {
    expect(() => loadConfig({ vehicle: { mass: -5, hp: 0 }, physics: { gravity: 9.81 } })).toThrow(
      ConfigError
    );
    try {
      loadConfig({ vehicle: { mass: -5, hp: 0 }, physics: { gravity: 9.81 } });
    } catch (err) {
      const e = err as ConfigError;
      expect(e.problems).toContain('vehicle.mass must be a positive number (got -5)');
      expect(e.problems).toContain('vehicle.hp must be a positive number (got 0)');
      expect(e.problems).toContain('physics.gravity must be negative (pulls down)');
      expect(e.message).toContain('vehicle.mass');
    }
  });

  it('rejects a map where zombies would see the player before the player sees them', () => {
    expect(() => loadConfig({ zombies: { runner: { detectionRadius: 400 } } })).toThrow(
      /detectionRadius \(400\) must be less than fogDistance \(300\)/
    );
  });

  it('rejects an invalid load without replacing the current config', () => {
    loadConfig({ vehicle: { topSpeed: 60 } });
    expect(() => loadConfig({ vehicle: { topSpeed: -1 } })).toThrow(ConfigError);
    expect(getConfig().vehicle.topSpeed).toBe(60);
  });

  it('looks up maps by id with a helpful error', () => {
    expect(getMapConfig('greybox').size).toBe(500);
    expect(() => getMapConfig('nope')).toThrow(/Unknown map "nope". Known maps: greybox/);
  });
});
