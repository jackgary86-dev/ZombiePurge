import { Vector3 } from 'three';
import type { RewardsConfig, ZombieRank } from '../../data/types';
import { ZOMBIE_RANKS } from '../../data/validate';

export interface KillEvent {
  rank: ZombieRank;
  position: { x: number; y: number; z: number };
  /** Coins awarded for this kill (after any multiplier). */
  coins: number;
}

export interface RunSummary {
  killsByRank: Record<ZombieRank, number>;
  totalKills: number;
  distanceMeters: number;
  coinsFromKills: number;
  coinsFromDistance: number;
  coinsTotal: number;
  durationSeconds: number;
}

const MIN_SPEED_FOR_DISTANCE = 0.5; // m/s — crawling/spinning in place earns nothing
const MAX_STEP_DISTANCE = 100; // m — a teleport or respawn never counts as driving

/**
 * Tracks one run: kills by rank with coin rewards (C1), distance driven with the
 * distance bonus (C2), and the summary the Results screen shows (C4).
 */
export class RunStats {
  readonly killsByRank = Object.fromEntries(ZOMBIE_RANKS.map((r) => [r, 0])) as Record<
    ZombieRank,
    number
  >;
  distanceMeters = 0;
  coinsFromKills = 0;
  coinsFromDistance = 0;
  /** Coins granted outside kills/distance (debug console, future pickups). */
  coinsBonus = 0;
  durationSeconds = 0;
  private distanceCredited = 0;
  private readonly lastPosition = new Vector3();
  private hasLastPosition = false;

  constructor(private readonly rewards: RewardsConfig) {}

  get totalKills(): number {
    return ZOMBIE_RANKS.reduce((n, r) => n + this.killsByRank[r], 0);
  }

  get coinsTotal(): number {
    return this.coinsFromKills + this.coinsFromDistance + this.coinsBonus;
  }

  addBonus(coins: number): void {
    this.coinsBonus += Math.floor(coins);
  }

  coinsForRank(rank: ZombieRank): number {
    return this.rewards.coinsPerRank[rank];
  }

  /** Records a kill and returns the event (with the coins awarded) for popups/audio. */
  recordKill(rank: ZombieRank, position: { x: number; y: number; z: number }): KillEvent {
    const coins = this.coinsForRank(rank);
    this.killsByRank[rank]++;
    this.coinsFromKills += coins;
    return { rank, position, coins };
  }

  /**
   * Feed the car position every fixed step. Returns the number of distance coins
   * awarded this step (usually 0, occasionally 1) so the HUD can tick.
   */
  trackPosition(position: Vector3, dt: number): number {
    this.durationSeconds += dt;
    if (!this.hasLastPosition) {
      this.lastPosition.copy(position);
      this.hasLastPosition = true;
      return 0;
    }
    const step = position.distanceTo(this.lastPosition);
    this.lastPosition.copy(position);
    if (step > MAX_STEP_DISTANCE) return 0;
    if (dt > 0 && step / dt < MIN_SPEED_FOR_DISTANCE) return 0;
    this.distanceMeters += step;
    const earned = Math.floor(this.distanceMeters / this.rewards.metersPerDistanceCoin);
    const award = earned - this.distanceCredited;
    if (award > 0) {
      this.distanceCredited = earned;
      this.coinsFromDistance += award;
    }
    return Math.max(0, award);
  }

  /** Call after a respawn/teleport so the jump isn't counted as driving. */
  resetPosition(): void {
    this.hasLastPosition = false;
  }

  summary(): RunSummary {
    return {
      killsByRank: { ...this.killsByRank },
      totalKills: this.totalKills,
      distanceMeters: this.distanceMeters,
      coinsFromKills: this.coinsFromKills,
      coinsFromDistance: this.coinsFromDistance,
      coinsTotal: this.coinsTotal,
      durationSeconds: this.durationSeconds,
    };
  }
}
