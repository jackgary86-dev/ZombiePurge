import type { StatModifiers, UpgradeCategory, UpgradeDef, VehicleConfig } from '../data/types';
import {
  Garage,
  type CosmeticPurchaseResult,
  type EffectiveStats,
  type PurchaseResult,
} from '../game/shop/Garage';
import { icon, iconForCategory, iconForUpgrade } from './icons';

export interface StatDelta {
  key: keyof EffectiveStats;
  label: string;
  before: number;
  after: number;
  /** Upper bound used for the bar width. */
  max: number;
  unit?: string;
}

export interface TierCard {
  upgradeId: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  ownedTier: number;
  maxTier: number;
  /** Next tier to buy, or null when maxed. */
  nextTier: number | null;
  nextLabel: string | null;
  price: number | null;
  status: 'buy' | 'coins' | 'locked' | 'maxed';
  statusText: string;
  deltas: StatDelta[];
  mountable: boolean;
  equipped: boolean;
  canEquip: boolean;
}

export const CATEGORY_TABS: { id: UpgradeCategory | 'all' | 'customize'; label: string }[] = [
  { id: 'weapon', label: 'Weapons' },
  { id: 'health', label: 'Health' },
  { id: 'armor', label: 'Armor' },
  { id: 'engine', label: 'Engine' },
  { id: 'tires', label: 'Tires' },
  { id: 'fuel', label: 'Gas' },
  { id: 'ram', label: 'Ram' },
  { id: 'melee', label: 'Melee' },
  { id: 'nitro', label: 'Utility' },
  { id: 'customize', label: 'Customize' },
];

const UTILITY: UpgradeCategory[] = ['nitro', 'radar', 'headlights'];

const STAT_LABELS: Partial<
  Record<keyof EffectiveStats, { label: string; max: number; unit?: string }>
> = {
  topSpeed: { label: 'Top speed', max: 90, unit: 'm/s' },
  acceleration: { label: 'Acceleration', max: 20, unit: 'm/s²' },
  grip: { label: 'Grip', max: 2 },
  maxHp: { label: 'Max HP', max: 400 },
  armor: { label: 'Armor', max: 90, unit: '%' },
  fuelCapacity: { label: 'Fuel tank', max: 200, unit: 'L' },
  ramDamageMultiplier: { label: 'Ram damage', max: 2.5, unit: 'x' },
  selfDamageMultiplier: { label: 'Impact self-damage', max: 1, unit: 'x' },
  nitroSeconds: { label: 'Nitro', max: 8, unit: 's' },
  radarRange: { label: 'Radar range', max: 300, unit: 'm' },
  headlightRange: { label: 'Headlights', max: 100, unit: 'm' },
};

const MODIFIER_TO_STAT: Record<keyof StatModifiers, keyof EffectiveStats | null> = {
  topSpeed: 'topSpeed',
  acceleration: 'acceleration',
  grip: 'grip',
  offRoadGrip: null,
  maxHp: 'maxHp',
  armor: 'armor',
  fuelCapacity: 'fuelCapacity',
  ramDamageMultiplier: 'ramDamageMultiplier',
  selfDamageMultiplier: 'selfDamageMultiplier',
  nitroSeconds: 'nitroSeconds',
  radarRange: 'radarRange',
  headlightRange: 'headlightRange',
};

function statusOf(
  check: PurchaseResult,
  def: UpgradeDef
): { status: TierCard['status']; text: string } {
  if (check.ok) return { status: 'buy', text: `Buy for ${check.tier!.price}` };
  switch (check.reason) {
    case 'maxed':
      return { status: 'maxed', text: 'Fully upgraded' };
    case 'locked':
      return { status: 'locked', text: `Unlocks on map ${check.unlockMap}` };
    case 'coins':
      return { status: 'coins', text: `Need ${check.shortBy} more coins` };
    default:
      return { status: 'locked', text: `Unavailable (${def.id})` };
  }
}

/** Pure view-model for the shop: what each card shows, given the garage state. Unit-tested without DOM. */
export function buildShopCards(
  garage: Garage,
  base: VehicleConfig,
  category: UpgradeCategory | 'all' = 'all'
): TierCard[] {
  const current = garage.effectiveStats(base);
  return garage.upgrades
    .filter(
      (u) =>
        category === 'all' ||
        u.category === category ||
        (category === 'nitro' && UTILITY.includes(u.category))
    )
    .map((def) => {
      const owned = garage.ownedTier(def.id);
      const next = garage.nextTier(def.id);
      const check = garage.canBuy(def.id);
      const { status, text } = statusOf(check, def);

      // Preview: stats if the next tier were owned (tiers supersede, so diff next vs current tier).
      const deltas: StatDelta[] = [];
      if (next) {
        const prev = owned > 0 ? def.tiers[owned - 1].modifiers : {};
        for (const [mk, statKey] of Object.entries(MODIFIER_TO_STAT) as [
          keyof StatModifiers,
          keyof EffectiveStats | null,
        ][]) {
          if (!statKey) continue;
          const nextVal = next.modifiers[mk] ?? 0;
          const prevVal = prev[mk] ?? 0;
          if (nextVal === prevVal) continue;
          const meta = STAT_LABELS[statKey]!;
          const before = current[statKey];
          let after = before + (nextVal - prevVal);
          if (statKey === 'armor') after = Math.min(90, after);
          if (statKey === 'selfDamageMultiplier') after = Math.max(0, after);
          deltas.push({
            key: statKey,
            label: meta.label,
            before,
            after,
            max: meta.max,
            unit: meta.unit,
          });
        }
      }

      return {
        upgradeId: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        ownedTier: owned,
        maxTier: def.tiers.length,
        nextTier: next?.tier ?? null,
        nextLabel: next?.label ?? null,
        price: next?.price ?? null,
        status,
        statusText: text,
        deltas,
        mountable: Boolean(def.slot),
        equipped: garage.isEquipped(def.id),
        canEquip: Boolean(def.slot) && owned > 0 && !garage.isEquipped(def.id),
      };
    });
}

export interface CosmeticCard {
  optionId: string;
  categoryId: string;
  categoryLabel: string;
  label: string;
  price: number;
  color: number;
  owned: boolean;
  selected: boolean;
  status: 'select' | 'buy' | 'coins';
  statusText: string;
}

function cosmeticStatusOf(
  check: CosmeticPurchaseResult,
  price: number
): { status: CosmeticCard['status']; text: string } {
  if (check.ok) return { status: 'buy', text: `Buy for ${price}` };
  if (check.reason === 'coins')
    return { status: 'coins', text: `Need ${check.shortBy} more coins` };
  return { status: 'select', text: 'Select' };
}

/** L1: pure view-model for the Customize tab, one card per option across every category. */
export function buildCosmeticCards(garage: Garage): CosmeticCard[] {
  const cards: CosmeticCard[] = [];
  for (const category of garage.cosmetics) {
    const selected = garage.selectedCosmetic(category.id);
    for (const option of category.options) {
      const owned = garage.ownsCosmetic(option.id);
      const isSelected = selected?.id === option.id;
      const { status, text } = isSelected
        ? { status: 'select' as const, text: 'Equipped' }
        : owned
          ? { status: 'select' as const, text: 'Select' }
          : cosmeticStatusOf(garage.canBuyCosmetic(option.id), option.price);
      cards.push({
        optionId: option.id,
        categoryId: category.id,
        categoryLabel: category.label,
        label: option.label,
        price: option.price,
        color: option.color,
        owned,
        selected: isSelected,
        status,
        statusText: text,
      });
    }
  }
  return cards;
}

export interface GarageMenuOptions {
  parent?: HTMLElement;
  onChange?: () => void;
  onClose?: () => void;
  /** Repair hook: returns the price, and performs the repair when `doIt` is true. */
  repair?: (doIt: boolean) => { price: number; ok: boolean };
}

/** J4: the Garage / Shop screen. Rebuilds its cards from the view-model after every action. */
export class GarageMenu {
  readonly el: HTMLDivElement;
  private category: UpgradeCategory | 'all' | 'customize' = 'weapon';
  private readonly cards: HTMLDivElement;
  private readonly balance: HTMLSpanElement;
  private readonly tabs: HTMLDivElement;
  private readonly repairButton: HTMLButtonElement;

  constructor(
    private garage: Garage,
    private readonly base: VehicleConfig,
    private coins: { readonly balance: number },
    private readonly options: GarageMenuOptions = {}
  ) {
    this.el = document.createElement('div');
    this.el.id = 'garage-menu';
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'garage-header';
    const title = document.createElement('h1');
    title.textContent = 'GARAGE';
    const coin = document.createElement('span');
    coin.className = 'garage-balance-icon';
    coin.innerHTML = icon('coin', 20);
    // The balance span's textContent is asserted verbatim in tests, so the coin icon lives
    // in its own sibling element rather than inside .garage-balance.
    this.balance = document.createElement('span');
    this.balance.className = 'garage-balance';
    this.repairButton = document.createElement('button');
    this.repairButton.type = 'button';
    this.repairButton.className = 'garage-repair';
    this.repairButton.addEventListener('click', () => {
      this.options.repair?.(true);
      this.render();
      this.options.onChange?.();
    });
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'garage-play';
    play.textContent = 'DRIVE ▶';
    play.addEventListener('click', () => this.options.onClose?.());
    header.append(title, coin, this.balance, this.repairButton, play);

    this.tabs = document.createElement('div');
    this.tabs.className = 'garage-tabs';
    for (const tab of CATEGORY_TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML =
        tab.id === 'customize'
          ? `${icon('customize', 15)} ${tab.label}`
          : `${iconForCategory(tab.id === 'all' ? 'weapon' : tab.id, 15)} ${tab.label}`;
      b.dataset.category = tab.id;
      b.addEventListener('click', () => {
        this.category = tab.id;
        this.render();
      });
      this.tabs.appendChild(b);
    }

    this.cards = document.createElement('div');
    this.cards.className = 'garage-cards';
    this.el.append(header, this.tabs, this.cards);
    (options.parent ?? document.body).appendChild(this.el);
    this.render();
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  /** Swap the backing garage (sandbox "infinite money" uses a throwaway one). */
  setGarage(garage: Garage, coins: { readonly balance: number }): void {
    this.garage = garage;
    this.coins = coins;
    this.render();
  }

  open(): void {
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    this.el.hidden = true;
  }

  render(): void {
    this.balance.textContent =
      this.coins.balance >= 1e8 ? '∞ coins' : `${this.coins.balance} coins`;
    const repair = this.options.repair?.(false);
    this.repairButton.hidden = !repair;
    if (repair) {
      this.repairButton.textContent = repair.price > 0 ? `Repair (${repair.price})` : 'Repaired';
      this.repairButton.disabled = repair.price === 0 || !repair.ok;
    }
    for (const b of this.tabs.querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.category === this.category);
    }
    this.cards.replaceChildren();
    if (this.category === 'customize') {
      let lastCategory = '';
      for (const card of buildCosmeticCards(this.garage)) {
        if (card.categoryId !== lastCategory) {
          const heading = document.createElement('h2');
          heading.className = 'cosmetic-category-heading';
          heading.textContent = card.categoryLabel;
          this.cards.appendChild(heading);
          lastCategory = card.categoryId;
        }
        this.cards.appendChild(this.renderCosmeticCard(card));
      }
      return;
    }
    if (this.category === 'engine' && this.garage.ownedTier('engine') > 0) {
      this.cards.appendChild(this.renderEngineTuning());
    }
    for (const card of buildShopCards(this.garage, this.base, this.category)) {
      this.cards.appendChild(this.renderCard(card));
    }
  }

  /** N1: a slider trading the owned engine tier's own top speed bonus against its acceleration
   *  bonus, free to change at any time once the engine upgrade is owned. `input` (fired
   *  continuously while dragging) applies the value live and updates the readout in place, but
   *  deliberately doesn't rebuild the card list - that would tear down this very slider element
   *  mid-drag. `change` (fired once, on release) does the full re-render so the engine card's
   *  own stat preview picks up the new tuning. */
  private renderEngineTuning(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'engine-tuning';

    const label = document.createElement('h3');
    label.textContent = 'Engine Tuning';
    const hint = document.createElement('p');
    hint.textContent = 'Free to adjust at any time. Favor acceleration or top speed.';

    const row = document.createElement('div');
    row.className = 'engine-tuning-row';
    const accelLabel = document.createElement('span');
    accelLabel.textContent = 'Acceleration';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-1';
    slider.max = '1';
    slider.step = '0.1';
    slider.value = String(this.garage.engineTuning);
    slider.className = 'engine-tuning-slider';
    const topSpeedLabel = document.createElement('span');
    topSpeedLabel.textContent = 'Top Speed';
    const readout = document.createElement('span');
    readout.className = 'engine-tuning-readout';
    readout.textContent = tuningReadout(this.garage.engineTuning);
    slider.addEventListener('input', () => {
      this.garage.setEngineTuning(Number(slider.value));
      readout.textContent = tuningReadout(this.garage.engineTuning);
      this.options.onChange?.();
    });
    slider.addEventListener('change', () => this.render());
    row.append(accelLabel, slider, topSpeedLabel);

    el.append(label, hint, row, readout);
    return el;
  }

  private renderCosmeticCard(card: CosmeticCard): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `cosmetic-card${card.selected ? ' equipped' : ''}`;
    el.dataset.cosmetic = card.optionId;

    const swatch = document.createElement('div');
    swatch.className = 'cosmetic-swatch';
    swatch.style.background = `#${card.color.toString(16).padStart(6, '0')}`;
    const name = document.createElement('h3');
    name.textContent = card.label;
    el.append(swatch, name);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = card.status === 'buy' ? 'buy' : 'equip';
    action.textContent = card.statusText;
    action.disabled = card.status === 'coins' || card.selected;
    action.addEventListener('click', () => {
      const ok = card.owned
        ? this.garage.selectCosmetic(card.optionId)
        : this.garage.buyCosmetic(card.optionId).ok;
      if (ok) {
        this.render();
        this.options.onChange?.();
      }
    });
    el.appendChild(action);
    return el;
  }

  private renderCard(card: TierCard): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `tier-card status-${card.status}${card.equipped ? ' equipped' : ''}`;
    el.dataset.upgrade = card.upgradeId;

    const name = document.createElement('h2');
    name.innerHTML = `${iconForUpgrade(card.upgradeId, card.category, 18)} ${card.name}`;
    const tier = document.createElement('div');
    tier.className = 'tier-pips';
    tier.textContent = `${'●'.repeat(card.ownedTier)}${'○'.repeat(card.maxTier - card.ownedTier)}${card.nextLabel ? `  ${card.nextLabel}` : ''}`;
    const desc = document.createElement('p');
    desc.textContent = card.description;
    el.append(name, tier, desc);

    for (const d of card.deltas) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const label = document.createElement('span');
      label.textContent = d.label;
      const bar = document.createElement('div');
      bar.className = 'stat-bar';
      const before = document.createElement('div');
      before.className = 'stat-before';
      before.style.width = `${Math.min(100, (100 * d.before) / d.max)}%`;
      const after = document.createElement('div');
      after.className = d.after >= d.before ? 'stat-after up' : 'stat-after down';
      after.style.width = `${Math.min(100, (100 * d.after) / d.max)}%`;
      bar.append(after, before);
      const values = document.createElement('span');
      values.className = 'stat-values';
      values.textContent = `${fmt(d.before)} → ${fmt(d.after)}${d.unit ? ` ${d.unit}` : ''}`;
      row.append(label, bar, values);
      el.appendChild(row);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'buy';
    buy.textContent = card.statusText;
    buy.disabled = card.status !== 'buy';
    buy.addEventListener('click', () => {
      if (this.garage.buy(card.upgradeId).ok) {
        this.render();
        this.options.onChange?.();
      }
    });
    actions.appendChild(buy);
    if (card.mountable && card.ownedTier > 0) {
      const equip = document.createElement('button');
      equip.type = 'button';
      equip.className = 'equip';
      equip.textContent = card.equipped ? 'Equipped' : 'Equip';
      equip.disabled = !card.canEquip;
      equip.addEventListener('click', () => {
        if (this.garage.equip(card.upgradeId)) {
          this.render();
          this.options.onChange?.();
        }
      });
      actions.appendChild(equip);
    }
    el.appendChild(actions);
    return el;
  }
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** N1: a short label for the current tuning slider position. */
function tuningReadout(tuning: number): string {
  if (Math.abs(tuning) < 0.05) return 'Balanced';
  const pct = Math.round(Math.abs(tuning) * 100);
  return tuning > 0 ? `${pct}% toward Top Speed` : `${pct}% toward Acceleration`;
}
