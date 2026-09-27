import { DEFAULT_CONFIG } from './defaults';
import type { DeepPartial, GameConfig } from './types';
import { assertValidConfig } from './validate';

export type {
  GameConfig,
  VehicleConfig,
  ZombieConfig,
  ZombieRank,
  RewardsConfig,
  CameraConfig,
  MapConfig,
  PhysicsConfig,
  UpgradeDef,
  UpgradeTier,
  UpgradeCategory,
  StatModifiers,
  WeaponSlot,
} from './types';
export { ConfigError, collectConfigProblems, ZOMBIE_RANKS } from './validate';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = deepMerge((base as Record<string, unknown>)[key], value as never);
  }
  return out as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let current: GameConfig = clone(DEFAULT_CONFIG);

export function getConfig(): GameConfig {
  return current;
}

/** Overlay a partial config on the defaults; throws ConfigError listing every problem. */
export function loadConfig(overrides: DeepPartial<GameConfig> = {}): GameConfig {
  const merged = deepMerge(clone(DEFAULT_CONFIG), overrides);
  assertValidConfig(merged);
  current = merged;
  return current;
}

export function resetConfig(): GameConfig {
  current = clone(DEFAULT_CONFIG);
  return current;
}

export function getMapConfig(id: string) {
  const map = current.maps.find((m) => m.id === id);
  if (!map)
    throw new Error(`Unknown map "${id}". Known maps: ${current.maps.map((m) => m.id).join(', ')}`);
  return map;
}
