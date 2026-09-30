import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, loadConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import {
  BASE_FUEL_CAPACITY,
  Garage,
  GARAGE_STORAGE_KEY,
  type GarageStorage,
} from '../../src/game/shop';

class MemoryStorage implements GarageStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('D1 upgrade data model', () => {
  beforeEach(() => resetConfig());

  it('ships every category with ascending tiers and valid unlock maps', () => {
    const cfg = getConfig();
    const categories = new Set(cfg.upgrades.map((u) => u.category));
    for (const c of [
      'engine',
      'tires',
      'health',
      'armor',
      'fuel',
      'weapon',
      'ram',
      'nitro',
      'radar',
      'headlights',
    ]) {
      expect(categories.has(c as never)).toBe(true);
    }
    for (const u of cfg.upgrades) {
      let last = 0;
      u.tiers.forEach((t, i) => {
        expect(t.tier).toBe(i + 1);
        expect(t.price).toBeGreaterThanOrEqual(last);
        last = t.price;
        expect(t.unlockMap).toBeGreaterThanOrEqual(1);
        expect(t.unlockMap).toBeLessThanOrEqual(5);
      });
    }
  });

  it('validation catches duplicate ids, bad tiers and weapons without a slot', () => {
    expect(() =>
      loadConfig({
        upgrades: [
          {
            id: 'x',
            category: 'engine',
            name: 'X',
            description: '',
            tiers: [{ tier: 2, price: 10, unlockMap: 1, modifiers: {} }],
          },
          {
            id: 'x',
            category: 'weapon',
            name: 'Y',
            description: '',
            tiers: [{ tier: 1, price: 10, unlockMap: 9, modifiers: {} }],
          },
        ],
      })
    ).toThrow(
      /tiers\[0\].tier must be 1[\s\S]*is duplicated[\s\S]*needs a slot[\s\S]*unlockMap must be a map number 1-5/
    );
  });
});

describe('D2 Garage purchase & equip logic', () => {
  let wallet: Wallet;
  let garage: Garage;
  let storage: MemoryStorage;

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    storage = new MemoryStorage();
    garage = new Garage(getConfig().upgrades, wallet, 1, storage);
  });

  it('buys the next tier, spends coins, and reports why it cannot', () => {
    expect(garage.buy('engine')).toMatchObject({ ok: false, reason: 'coins', shortBy: 150 });
    wallet.add(500);
    expect(garage.buy('engine').ok).toBe(true);
    expect(garage.ownedTier('engine')).toBe(1);
    expect(wallet.balance).toBe(350);
    expect(garage.buy('engine')).toMatchObject({ ok: false, reason: 'coins', shortBy: 50 });
    wallet.add(50);
    expect(garage.buy('engine').ok).toBe(true);
    expect(garage.ownedTier('engine')).toBe(2);
    expect(garage.buy('nope')).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('locked tiers report which map unlocks them', () => {
    wallet.add(10000);
    expect(garage.buy('engine').ok).toBe(true);
    expect(garage.buy('engine').ok).toBe(true);
    expect(garage.buy('engine')).toMatchObject({ ok: false, reason: 'locked', unlockMap: 3 });
    expect(garage.canBuy('flamethrower')).toMatchObject({
      ok: false,
      reason: 'locked',
      unlockMap: 3,
    });
    garage.currentMap = 3;
    expect(garage.buy('engine').ok).toBe(true);
    expect(garage.buy('engine')).toMatchObject({ ok: false, reason: 'maxed' });
    expect(wallet.balance).toBe(10000 - 150 - 400 - 900);
  });

  it('mounts the first weapon bought and enforces one weapon per slot', () => {
    wallet.add(5000);
    garage.currentMap = 3;
    expect(garage.buy('machinegun').ok).toBe(true);
    expect(garage.equippedIn('roof')?.id).toBe('machinegun');
    expect(garage.buy('shotgun').ok).toBe(true);
    expect(garage.equippedIn('roof')?.id).toBe('machinegun'); // slot was taken, not swapped silently
    expect(garage.equip('shotgun')).toBe(true);
    expect(garage.equippedIn('roof')?.id).toBe('shotgun');
    expect(garage.isEquipped('machinegun')).toBe(false);
    expect(garage.equip('rockets')).toBe(false); // not owned
    expect(garage.equip('engine')).toBe(false); // not a mountable item
    garage.unequip('roof');
    expect(garage.equippedIn('roof')).toBeNull();
  });

  it('R4: equip() takes an explicit slot for the one multi-mount part, and rejects an invalid one', () => {
    wallet.add(5000);
    expect(garage.buy('machinegun').ok).toBe(true); // auto-equips to its default, 'roof'
    expect(garage.equip('machinegun', 'rear')).toBe(true);
    expect(garage.equippedIn('rear')?.id).toBe('machinegun');
    expect(garage.equip('machinegun', 'front')).toBe(true);
    expect(garage.equippedIn('front')?.id).toBe('machinegun');
    // A part with no validSlots entry for 'engine' can never go there, owned or not.
    expect(garage.equip('machinegun', 'engine')).toBe(false);
    expect(garage.equip('shotgun', 'rear')).toBe(false); // not owned, and not multi-mount anyway
  });

  it('folds owned tiers into effective vehicle stats', () => {
    const base = getConfig().vehicle;
    const stock = garage.effectiveStats(base);
    expect(stock.topSpeed).toBe(base.topSpeed);
    expect(stock.fuelCapacity).toBe(BASE_FUEL_CAPACITY);
    expect(stock.ramDamageMultiplier).toBe(1);

    wallet.add(10000);
    garage.currentMap = 3;
    garage.buy('engine');
    garage.buy('engine'); // tier 2: +12 top speed (tiers supersede, not stack)
    garage.buy('armor');
    garage.buy('ram');
    garage.buy('health');
    const s = garage.effectiveStats(base);
    expect(s.topSpeed).toBe(base.topSpeed + 12);
    expect(s.acceleration).toBe(base.acceleration + 3);
    expect(s.armor).toBe(base.armor + 15);
    expect(s.maxHp).toBe(base.hp + 50);
    expect(s.ramDamageMultiplier).toBeCloseTo(1.25);
    expect(s.selfDamageMultiplier).toBeCloseTo(0.85);

    const live = JSON.parse(JSON.stringify(base));
    garage.applyTo(base, live);
    expect(live.topSpeed).toBe(base.topSpeed + 12);
    expect(live.armor).toBe(15);
    expect(base.topSpeed).toBe(50); // base untouched
  });

  it("N1: engine tuning redistributes the owned engine tier's own top speed/acceleration bonus", () => {
    const base = getConfig().vehicle;
    expect(garage.engineTuning).toBe(0); // balanced by default

    wallet.add(10000);
    garage.currentMap = 3;
    garage.buy('engine'); // tier 1: +6 top speed, +1.5 acceleration
    const balanced = garage.effectiveStats(base);
    expect(balanced.topSpeed).toBe(base.topSpeed + 6);
    expect(balanced.acceleration).toBe(base.acceleration + 1.5);

    const swing = base.engineTuning.swingFactor; // 0.5 by default
    garage.setEngineTuning(1); // full top speed
    const maxSpeed = garage.effectiveStats(base);
    expect(maxSpeed.topSpeed).toBeCloseTo(base.topSpeed + 6 * (1 + swing));
    expect(maxSpeed.acceleration).toBeCloseTo(base.acceleration + 1.5 * (1 - swing));

    garage.setEngineTuning(-1); // full acceleration
    const maxAccel = garage.effectiveStats(base);
    expect(maxAccel.topSpeed).toBeCloseTo(base.topSpeed + 6 * (1 - swing));
    expect(maxAccel.acceleration).toBeCloseTo(base.acceleration + 1.5 * (1 + swing));

    // Out-of-range values clamp rather than distort the swing further.
    garage.setEngineTuning(5);
    expect(garage.engineTuning).toBe(1);
    garage.setEngineTuning(-5);
    expect(garage.engineTuning).toBe(-1);

    // Other stats are untouched by tuning.
    garage.buy('armor');
    expect(garage.effectiveStats(base).armor).toBe(base.armor + 15);
  });

  it('N1: tuning has no effect before the engine is owned, and persists across reload', () => {
    const base = getConfig().vehicle;
    garage.setEngineTuning(1);
    expect(garage.effectiveStats(base).topSpeed).toBe(base.topSpeed); // no engine owned yet

    const reloaded = new Garage(getConfig().upgrades, wallet, 1, storage);
    expect(reloaded.engineTuning).toBe(1);
  });

  it('N2: engine types are a separate slot from the tier ladder, one equipped at a time, stacking with it', () => {
    const base = getConfig().vehicle;
    wallet.add(10000);
    garage.currentMap = 4;

    // Buying the first engine type auto-equips it, like a weapon's first purchase.
    expect(garage.buy('engine_v8').ok).toBe(true);
    expect(garage.equippedIn('engine')?.id).toBe('engine_v8');
    const withV8 = garage.effectiveStats(base);
    expect(withV8.topSpeed).toBe(base.topSpeed + 10);
    expect(withV8.acceleration).toBe(base.acceleration + 4);
    expect(withV8.mass).toBe(base.mass + 200);

    // A second type is owned but not auto-equipped: the slot was already taken.
    expect(garage.buy('engine_electric').ok).toBe(true);
    expect(garage.equippedIn('engine')?.id).toBe('engine_v8');
    expect(garage.effectiveStats(base).mass).toBe(base.mass + 200); // still V8's weight

    // Equipping the owned Electric motor swaps the slot; V8's stats stop applying.
    expect(garage.equip('engine_electric')).toBe(true);
    expect(garage.equippedIn('engine')?.id).toBe('engine_electric');
    const withElectric = garage.effectiveStats(base);
    expect(withElectric.topSpeed).toBe(base.topSpeed + 4);
    expect(withElectric.acceleration).toBe(base.acceleration + 9);
    expect(withElectric.mass).toBe(base.mass - 150); // lighter than stock

    // The tier ladder (D3/N1) stacks on top of whichever type is equipped, unaffected by it.
    garage.buy('engine'); // tier 1: +6 top speed, +1.5 acceleration
    const withBoth = garage.effectiveStats(base);
    expect(withBoth.topSpeed).toBe(base.topSpeed + 4 + 6);
    expect(withBoth.acceleration).toBe(base.acceleration + 9 + 1.5);
  });

  it('N2: no engine type owned means stock mass and no type bonus', () => {
    const base = getConfig().vehicle;
    const stock = garage.effectiveStats(base);
    expect(stock.mass).toBe(base.mass);
    expect(stock.topSpeed).toBe(base.topSpeed);
    expect(garage.equippedIn('engine')).toBeNull();
  });

  it('persists ownership and loadout, and ignores corrupt saves', () => {
    wallet.add(5000);
    garage.buy('tires');
    garage.buy('machinegun');
    const again = new Garage(getConfig().upgrades, wallet, 1, storage);
    expect(again.ownedTier('tires')).toBe(1);
    expect(again.equippedIn('roof')?.id).toBe('machinegun');

    storage.setItem(GARAGE_STORAGE_KEY, '{broken');
    expect(new Garage(getConfig().upgrades, wallet, 1, storage).ownedTier('tires')).toBe(0);
    storage.setItem(
      GARAGE_STORAGE_KEY,
      JSON.stringify({ version: 1, owned: { tires: 99, ghost: 1 }, equipped: { roof: 'tires' } })
    );
    const clamped = new Garage(getConfig().upgrades, wallet, 1, storage);
    expect(clamped.ownedTier('tires')).toBe(3); // clamped to the top tier
    expect(clamped.ownedTier('ghost')).toBe(0);
    expect(clamped.equippedIn('roof')).toBeNull(); // tires can't be mounted
  });

  it('unlockAll owns everything for the debug console', () => {
    garage.unlockAll();
    expect(garage.ownedTier('rockets')).toBe(2);
    expect(garage.equippedIn('roof')?.id).toBe('machinegun');
    expect(garage.equippedIn('front')?.id).toBe('ram');
  });

  it('get() looks up an upgrade def by id, undefined for an unknown one', () => {
    expect(garage.get('engine')?.category).toBe('engine');
    expect(garage.get('nope')).toBeUndefined();
  });

  it('reset() clears every owned tier and equipped slot, and persists that', () => {
    wallet.add(5000);
    garage.buy('tires');
    garage.buy('machinegun');
    garage.reset();
    expect(garage.ownedTier('tires')).toBe(0);
    expect(garage.equippedIn('roof')).toBeNull();
    const reloaded = new Garage(getConfig().upgrades, wallet, 1, storage);
    expect(reloaded.ownedTier('tires')).toBe(0);
    expect(reloaded.equippedIn('roof')).toBeNull();
  });
});

describe('L1 cosmetic customization', () => {
  let wallet: Wallet;
  let storage: MemoryStorage;
  let garage: Garage;

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    storage = new MemoryStorage();
    garage = new Garage(getConfig().upgrades, wallet, 1, storage, getConfig().cosmetics);
  });

  it('the stock (price 0) option is always owned and selected by default', () => {
    expect(garage.ownsCosmetic('paint_stock')).toBe(true);
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_stock');
  });

  it('a priced option is not owned until bought, and buying also selects it', () => {
    expect(garage.ownsCosmetic('paint_black')).toBe(false);
    expect(garage.canBuyCosmetic('paint_black').ok).toBe(false);
    expect(garage.canBuyCosmetic('paint_black').reason).toBe('coins');

    wallet.add(1000);
    expect(garage.canBuyCosmetic('paint_black').ok).toBe(true);
    expect(garage.buyCosmetic('paint_black').ok).toBe(true);
    expect(garage.ownsCosmetic('paint_black')).toBe(true);
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_black');
  });

  it('buying an already-owned option fails with reason "owned"', () => {
    const result = garage.buyCosmetic('paint_stock'); // price 0, always owned
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('owned');
  });

  it('an unknown cosmetic id fails with reason "unknown"', () => {
    expect(garage.canBuyCosmetic('nope').reason).toBe('unknown');
    expect(garage.buyCosmetic('nope').reason).toBe('unknown');
  });

  it('selectCosmetic switches between owned options, refusing an unowned one', () => {
    wallet.add(1000);
    garage.buyCosmetic('paint_black');
    garage.buyCosmetic('paint_blue');
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_blue');

    expect(garage.selectCosmetic('paint_black')).toBe(true);
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_black');

    expect(garage.selectCosmetic('paint_green')).toBe(false); // never bought
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_black');
  });

  it('persists ownership and selection across reloads', () => {
    wallet.add(1000);
    garage.buyCosmetic('paint_black');
    const reloaded = new Garage(getConfig().upgrades, wallet, 1, storage, getConfig().cosmetics);
    expect(reloaded.ownsCosmetic('paint_black')).toBe(true);
    expect(reloaded.selectedCosmetic('paint')?.id).toBe('paint_black');
  });

  it('reset() also clears owned/selected cosmetics back to stock', () => {
    wallet.add(1000);
    garage.buyCosmetic('paint_black');
    garage.reset();
    expect(garage.ownsCosmetic('paint_black')).toBe(false);
    expect(garage.selectedCosmetic('paint')?.id).toBe('paint_stock');
  });
});
