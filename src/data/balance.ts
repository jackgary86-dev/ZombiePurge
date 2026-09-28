import type { MapConfig, RewardsConfig } from './types';

/**
 * H2: a rough, documented play-pace model used to sanity-check upgrade pricing against how
 * fast a mid-skill player actually earns coins on each map. Not a precision economy sim -
 * just enough to catch a tier priced wildly out of step with the rest of the game.
 */
export interface BalanceAssumptions {
  /** Kills landed per minute of active driving-and-smashing combat. */
  killsPerMinute: number;
  /** Steady cruising speed (m/s) counted toward the distance bonus between fights. */
  cruiseSpeedMs: number;
}

export const DEFAULT_BALANCE_ASSUMPTIONS: BalanceAssumptions = {
  killsPerMinute: 20,
  cruiseSpeedMs: 10,
};

/**
 * Coins/minute a map's own zombie roster (its ranks weighted equally - an early map only ever
 * spawns its cheaper ranks) plus steady driving would earn a player working through it.
 */
export function estimateCoinsPerMinute(
  rewards: RewardsConfig,
  zombieRanks: MapConfig['zombieRanks'],
  assumptions: BalanceAssumptions = DEFAULT_BALANCE_ASSUMPTIONS
): number {
  const avgCoinValue =
    zombieRanks.reduce((sum, rank) => sum + rewards.coinsPerRank[rank], 0) /
    Math.max(1, zombieRanks.length);
  const killIncome = avgCoinValue * assumptions.killsPerMinute;
  const distanceIncome = (assumptions.cruiseSpeedMs * 60) / rewards.metersPerDistanceCoin;
  return killIncome + distanceIncome;
}

/** Minutes of a map's own earn rate needed to afford one price tag, outright. */
export function minutesToAfford(price: number, coinsPerMinute: number): number {
  return coinsPerMinute > 0 ? price / coinsPerMinute : Infinity;
}
