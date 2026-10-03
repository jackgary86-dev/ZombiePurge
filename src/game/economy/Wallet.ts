import type { RewardsConfig } from '../../data/types';

export const WALLET_STORAGE_KEY = 'zombiepurge.wallet';
export const WALLET_VERSION = 1;

export interface WalletStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface WalletSave {
  version: number;
  coins: number;
  lifetimeCoins: number;
}

function defaultStorage(): WalletStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Coin balance that survives between sessions (C5). */
export class Wallet {
  private coins = 0;
  private lifetimeCoins = 0;

  constructor(
    private readonly rewards: RewardsConfig,
    private readonly storage: WalletStorage | null = defaultStorage()
  ) {
    this.load();
  }

  get balance(): number {
    return this.coins;
  }

  get lifetime(): number {
    return this.lifetimeCoins;
  }

  add(amount: number): void {
    // T3: NaN/Infinity fail every `<=`/`>` comparison, so without this guard they'd sail past
    // the checks below - a NaN add corrupts `coins` to NaN forever, after which every future
    // spend()'s own `amount > this.coins` check is also always false, bypassing every price
    // check from then on.
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.coins += Math.floor(amount);
    this.lifetimeCoins += Math.floor(amount);
    this.save();
  }

  /** Returns false (and changes nothing) when the balance can't cover the price. */
  spend(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0 || amount > this.coins) return false;
    this.coins -= amount;
    this.save();
    return true;
  }

  /** Banks a finished run's coins. On death only a configured share is kept. */
  bankRun(runCoins: number, died: boolean): number {
    const kept = died
      ? Math.floor((runCoins * this.rewards.coinsKeptOnDeathPercent) / 100)
      : runCoins;
    this.add(kept);
    return kept;
  }

  reset(): void {
    this.coins = 0;
    this.lifetimeCoins = 0;
    this.save();
  }

  private load(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(WALLET_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<WalletSave>;
      if (saved.version !== WALLET_VERSION) return;
      if (typeof saved.coins === 'number' && saved.coins >= 0) this.coins = Math.floor(saved.coins);
      if (typeof saved.lifetimeCoins === 'number' && saved.lifetimeCoins >= 0) {
        this.lifetimeCoins = Math.floor(saved.lifetimeCoins);
      }
    } catch {
      // Corrupt save: start from zero rather than crash.
    }
  }

  private save(): void {
    const save: WalletSave = {
      version: WALLET_VERSION,
      coins: this.coins,
      lifetimeCoins: this.lifetimeCoins,
    };
    // T3: setItem can throw (quota exceeded, or Safari private browsing rejects every write) -
    // the in-memory balance this call already updated must survive even if persisting it fails.
    try {
      this.storage?.setItem(WALLET_STORAGE_KEY, JSON.stringify(save));
    } catch {
      // Not persisted this time; the in-memory balance is still correct for the rest of the session.
    }
  }
}
