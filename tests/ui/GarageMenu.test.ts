import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/data/config';
import { Wallet } from '../../src/game/economy';
import { Garage } from '../../src/game/shop';
import { buildShopCards, GarageMenu } from '../../src/ui/GarageMenu';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('J4 shop view-model', () => {
  let wallet: Wallet;
  let garage: Garage;

  beforeEach(() => {
    resetConfig();
    wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    garage = new Garage(getConfig().upgrades, wallet, 1, new MemoryStorage());
  });

  it('shows price, lock reasons and before/after stats', () => {
    const cards = buildShopCards(garage, getConfig().vehicle);
    const engine = cards.find((c) => c.upgradeId === 'engine')!;
    expect(engine.status).toBe('coins');
    expect(engine.statusText).toBe('Need 150 more coins');
    expect(engine.price).toBe(150);
    expect(engine.deltas.map((d) => [d.label, d.before, d.after])).toEqual([
      ['Top speed', 50, 56],
      ['Acceleration', 8, 9.5],
    ]);
    const flame = cards.find((c) => c.upgradeId === 'flamethrower')!;
    expect(flame.status).toBe('locked');
    expect(flame.statusText).toBe('Unlocks on map 3');

    wallet.add(1000);
    const affordable = buildShopCards(garage, getConfig().vehicle, 'engine')[0];
    expect(affordable.status).toBe('buy');
    expect(affordable.statusText).toBe('Buy for 150');
  });

  it('previews the step between tiers, not the whole tier', () => {
    wallet.add(5000);
    garage.buy('engine'); // tier 1: +6 top speed
    const engine = buildShopCards(garage, getConfig().vehicle, 'engine')[0];
    expect(engine.ownedTier).toBe(1);
    expect(engine.nextTier).toBe(2);
    const top = engine.deltas.find((d) => d.key === 'topSpeed')!;
    expect(top.before).toBe(56);
    expect(top.after).toBe(62);
  });

  it('filters by tab and groups utility upgrades', () => {
    const weapons = buildShopCards(garage, getConfig().vehicle, 'weapon');
    expect(weapons.every((c) => c.category === 'weapon')).toBe(true);
    expect(weapons.map((c) => c.upgradeId)).toContain('machinegun');
    const utility = buildShopCards(garage, getConfig().vehicle, 'nitro').map((c) => c.upgradeId);
    expect(utility).toEqual(['nitro', 'radar', 'headlights']);
  });
});

describe('J4 GarageMenu DOM', () => {
  let menu: GarageMenu | null = null;
  afterEach(() => menu?.el.remove());

  it('buys from a card, shows the balance and equip state, and calls onChange', () => {
    resetConfig();
    const wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    wallet.add(1000);
    const garage = new Garage(getConfig().upgrades, wallet, 1, new MemoryStorage());
    let changes = 0;
    menu = new GarageMenu(garage, getConfig().vehicle, wallet, { onChange: () => changes++ });
    menu.open();
    expect(menu.el.querySelector('.garage-balance')!.textContent).toBe('1000 coins');

    const mgCard = menu.el.querySelector<HTMLElement>('[data-upgrade="machinegun"]')!;
    expect(mgCard).not.toBeNull();
    mgCard.querySelector<HTMLButtonElement>('button.buy')!.click();
    expect(garage.ownedTier('machinegun')).toBe(1);
    expect(changes).toBe(1);
    expect(menu.el.querySelector('.garage-balance')!.textContent).toBe('700 coins');
    const after = menu.el.querySelector<HTMLElement>('[data-upgrade="machinegun"]')!;
    expect(after.classList.contains('equipped')).toBe(true);
    expect(after.querySelector<HTMLButtonElement>('button.equip')!.textContent).toBe('Equipped');

    const locked = menu.el.querySelector<HTMLButtonElement>('[data-upgrade="rockets"] button.buy')!;
    expect(locked.disabled).toBe(true);
    expect(locked.textContent).toBe('Unlocks on map 5');
  });

  it('switches tabs and wires repair and drive buttons', () => {
    resetConfig();
    const wallet = new Wallet(getConfig().rewards, new MemoryStorage());
    const garage = new Garage(getConfig().upgrades, wallet, 1, new MemoryStorage());
    let closed = false;
    let repaired = false;
    menu = new GarageMenu(garage, getConfig().vehicle, wallet, {
      onClose: () => (closed = true),
      repair: (doIt) => {
        if (doIt) repaired = true;
        return { price: repaired ? 0 : 30, ok: true };
      },
    });
    menu.open();
    menu.el.querySelector<HTMLButtonElement>('[data-category="engine"]')!.click();
    const ids = [...menu.el.querySelectorAll<HTMLElement>('.tier-card')].map(
      (c) => c.dataset.upgrade
    );
    expect(ids).toEqual(['engine']);
    const repair = menu.el.querySelector<HTMLButtonElement>('.garage-repair')!;
    expect(repair.textContent).toBe('Repair (30)');
    repair.click();
    expect(repaired).toBe(true);
    expect(repair.textContent).toBe('Repaired');
    menu.el.querySelector<HTMLButtonElement>('.garage-play')!.click();
    expect(closed).toBe(true);
  });
});
