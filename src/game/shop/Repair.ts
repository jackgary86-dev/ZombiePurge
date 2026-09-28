import type { CoinSource } from './Garage';

export interface RepairConfig {
  /** Coins per HP repaired in the garage. */
  coinsPerHp: number;
  /** HP restored by a field repair kit pickup. */
  kitHp: number;
}

export const DEFAULT_REPAIR: RepairConfig = { coinsPerHp: 1, kitHp: 40 };

export interface Repairable {
  hp: number;
}

export function repairPrice(
  car: Repairable,
  maxHp: number,
  cfg: RepairConfig = DEFAULT_REPAIR
): number {
  return Math.ceil(Math.max(0, maxHp - car.hp) * cfg.coinsPerHp);
}

export interface RepairResult {
  ok: boolean;
  price: number;
  restored: number;
  reason?: 'nothing' | 'coins';
}

/** D7: pay to repair in the garage. Charges only for the HP actually missing. */
export function repairInGarage(
  car: Repairable,
  maxHp: number,
  coins: CoinSource,
  cfg: RepairConfig = DEFAULT_REPAIR
): RepairResult {
  const missing = Math.max(0, maxHp - car.hp);
  const price = repairPrice(car, maxHp, cfg);
  if (missing <= 0) return { ok: false, price: 0, restored: 0, reason: 'nothing' };
  if (!coins.spend(price)) return { ok: false, price, restored: 0, reason: 'coins' };
  car.hp = maxHp;
  return { ok: true, price, restored: missing };
}

/** D7: a repair-kit pickup in the field. Returns HP actually restored. */
export function applyRepairKit(
  car: Repairable,
  maxHp: number,
  cfg: RepairConfig = DEFAULT_REPAIR
): number {
  const before = car.hp;
  car.hp = Math.min(maxHp, car.hp + cfg.kitHp);
  return car.hp - before;
}
