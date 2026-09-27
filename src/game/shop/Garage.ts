import type {
  StatModifiers,
  UpgradeDef,
  UpgradeTier,
  VehicleConfig,
  WeaponSlot,
} from '../../data/types';

export const GARAGE_STORAGE_KEY = 'zombiepurge.garage';
export const GARAGE_VERSION = 1;

export interface GarageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CoinSource {
  readonly balance: number;
  spend(amount: number): boolean;
}

export type PurchaseFailure = 'unknown' | 'maxed' | 'locked' | 'coins';

export interface PurchaseResult {
  ok: boolean;
  reason?: PurchaseFailure;
  /** For 'locked': the story map that unlocks the next tier. */
  unlockMap?: number;
  /** For 'coins': how many more coins are needed. */
  shortBy?: number;
  tier?: UpgradeTier;
}

interface GarageSave {
  version: number;
  owned: Record<string, number>;
  equipped: Partial<Record<WeaponSlot, string>>;
}

/** Combined effect of every owned upgrade (highest owned tier of each counts). */
export interface EffectiveStats {
  topSpeed: number;
  acceleration: number;
  grip: number;
  maxHp: number;
  armor: number;
  fuelCapacity: number;
  ramDamageMultiplier: number;
  selfDamageMultiplier: number;
  nitroSeconds: number;
  radarRange: number;
  headlightRange: number;
}

export const BASE_FUEL_CAPACITY = 60;
export const BASE_RADAR_RANGE = 80;

function defaultStorage(): GarageStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * D2: owns the player's upgrades. Buying always takes the next tier of an upgrade;
 * tiers are cumulative (owning tier 2 means tier 1's benefits are superseded by tier 2's).
 * Weapons must also be equipped into their mount slot.
 */
export class Garage {
  private owned = new Map<string, number>();
  private equipped = new Map<WeaponSlot, string>();
  private readonly byId = new Map<string, UpgradeDef>();

  constructor(
    readonly upgrades: UpgradeDef[],
    private readonly coins: CoinSource,
    /** Highest story map reached (1-5); gates unlocks. */
    public currentMap = 1,
    private readonly storage: GarageStorage | null = defaultStorage()
  ) {
    for (const u of upgrades) this.byId.set(u.id, u);
    this.load();
  }

  get(id: string): UpgradeDef | undefined {
    return this.byId.get(id);
  }

  ownedTier(id: string): number {
    return this.owned.get(id) ?? 0;
  }

  /** The tier a purchase would buy, or null when fully upgraded / unknown. */
  nextTier(id: string): UpgradeTier | null {
    const def = this.byId.get(id);
    if (!def) return null;
    return def.tiers[this.ownedTier(id)] ?? null;
  }

  canBuy(id: string): PurchaseResult {
    const def = this.byId.get(id);
    if (!def) return { ok: false, reason: 'unknown' };
    const tier = this.nextTier(id);
    if (!tier) return { ok: false, reason: 'maxed' };
    if (tier.unlockMap > this.currentMap)
      return { ok: false, reason: 'locked', unlockMap: tier.unlockMap, tier };
    if (this.coins.balance < tier.price) {
      return { ok: false, reason: 'coins', shortBy: tier.price - this.coins.balance, tier };
    }
    return { ok: true, tier };
  }

  buy(id: string): PurchaseResult {
    const check = this.canBuy(id);
    if (!check.ok || !check.tier) return check;
    if (!this.coins.spend(check.tier.price))
      return { ok: false, reason: 'coins', shortBy: 0, tier: check.tier };
    this.owned.set(id, check.tier.tier);
    const def = this.byId.get(id)!;
    // First purchase of a weapon goes straight onto its mount if the slot is free.
    if (def.slot && check.tier.tier === 1 && !this.equipped.has(def.slot))
      this.equipped.set(def.slot, id);
    this.save();
    return check;
  }

  equip(id: string): boolean {
    const def = this.byId.get(id);
    if (!def || !def.slot || this.ownedTier(id) === 0) return false;
    this.equipped.set(def.slot, id);
    this.save();
    return true;
  }

  unequip(slot: WeaponSlot): void {
    this.equipped.delete(slot);
    this.save();
  }

  equippedIn(slot: WeaponSlot): UpgradeDef | null {
    const id = this.equipped.get(slot);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  isEquipped(id: string): boolean {
    return [...this.equipped.values()].includes(id);
  }

  /** Highest owned tier of each upgrade, folded into one set of stat modifiers. */
  totalModifiers(): Required<StatModifiers> {
    const total: Required<StatModifiers> = {
      topSpeed: 0,
      acceleration: 0,
      grip: 0,
      offRoadGrip: 0,
      maxHp: 0,
      armor: 0,
      fuelCapacity: 0,
      ramDamageMultiplier: 0,
      selfDamageMultiplier: 0,
      nitroSeconds: 0,
      radarRange: 0,
      headlightRange: 0,
    };
    for (const [id, tierNo] of this.owned) {
      const def = this.byId.get(id);
      const tier = def?.tiers[tierNo - 1];
      if (!tier) continue;
      // Weapons contribute stats only while mounted; passive upgrades always do.
      if (def!.slot && def!.category === 'weapon' && !this.isEquipped(id)) continue;
      for (const [k, v] of Object.entries(tier.modifiers) as [keyof StatModifiers, number][]) {
        total[k] += v;
      }
    }
    return total;
  }

  effectiveStats(base: VehicleConfig): EffectiveStats {
    const m = this.totalModifiers();
    return {
      topSpeed: base.topSpeed + m.topSpeed,
      acceleration: base.acceleration + m.acceleration,
      grip: base.tires.grip + m.grip,
      maxHp: base.hp + m.maxHp,
      armor: Math.min(90, base.armor + m.armor),
      fuelCapacity: BASE_FUEL_CAPACITY + m.fuelCapacity,
      ramDamageMultiplier: 1 + m.ramDamageMultiplier,
      selfDamageMultiplier: Math.max(0, 1 + m.selfDamageMultiplier),
      nitroSeconds: m.nitroSeconds,
      radarRange: BASE_RADAR_RANGE + m.radarRange,
      headlightRange: m.headlightRange,
    };
  }

  /** Writes the effective stats into a vehicle config so the physics picks them up. */
  applyTo(base: VehicleConfig, target: VehicleConfig): EffectiveStats {
    const s = this.effectiveStats(base);
    target.topSpeed = s.topSpeed;
    target.acceleration = s.acceleration;
    target.tires.grip = s.grip;
    target.hp = s.maxHp;
    target.armor = s.armor;
    return s;
  }

  /** Debug helper (K4): owns every tier of everything and mounts the best weapons. */
  unlockAll(): void {
    for (const u of this.upgrades) this.owned.set(u.id, u.tiers.length);
    this.equipped.set('roof', 'machinegun');
    this.equipped.set('front', 'ram');
    this.save();
  }

  reset(): void {
    this.owned.clear();
    this.equipped.clear();
    this.save();
  }

  private load(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(GARAGE_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<GarageSave>;
      if (saved.version !== GARAGE_VERSION) return;
      for (const [id, tier] of Object.entries(saved.owned ?? {})) {
        const def = this.byId.get(id);
        if (def && Number.isInteger(tier) && tier > 0)
          this.owned.set(id, Math.min(tier, def.tiers.length));
      }
      for (const [slot, id] of Object.entries(saved.equipped ?? {})) {
        const def = id ? this.byId.get(id) : undefined;
        if (def && def.slot === slot && this.owned.has(id!))
          this.equipped.set(slot as WeaponSlot, id!);
      }
    } catch {
      // Corrupt save: start with a stock car rather than crash.
    }
  }

  private save(): void {
    const save: GarageSave = {
      version: GARAGE_VERSION,
      owned: Object.fromEntries(this.owned),
      equipped: Object.fromEntries(this.equipped),
    };
    this.storage?.setItem(GARAGE_STORAGE_KEY, JSON.stringify(save));
  }
}
