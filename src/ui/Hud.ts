import type { HudConfig } from '../data/types';
import { icon } from './icons';
import { barColor, fuelBarState, hpBarState, weaponReadout, type WeaponKind } from './hudLogic';

export interface HudState {
  kmh: number;
  fps: number;
  hp: number;
  maxHp: number;
  coins: number;
  kills: number;
  distanceMeters: number;
  alive: number;
  paused: boolean;
  comboMultiplier: number;
  comboChain: number;
  fuelFraction: number;
  fuelLitres: number;
  fuelCapacityLitres: number;
  /** Which roof/front weapon (if any) is mounted, so the ammo/heat readout knows what to show. */
  weaponKind: WeaponKind;
  /** Weapon heat 0..1, or null when no weapon is mounted. */
  heat: number | null;
  overheated: boolean;
  /** Nitro charge 0..1, or null without the upgrade. */
  nitroFraction: number | null;
  nitroBoosting: boolean;
  /** Magazine readout for shotgun/rockets ("5/6" or "reloading 1.2s"), null for other weapons. */
  magazine: string | null;
  flameOn: boolean;
  /** F2: this map's story objectives, or null outside story mode / maps with none. */
  objectives: { label: string; current: number; target: number; done: boolean }[] | null;
}

function row(
  iconName: Parameters<typeof icon>[0],
  className: string
): {
  el: HTMLDivElement;
  bar: HTMLDivElement;
  fill: HTMLDivElement;
} {
  const el = document.createElement('div');
  el.className = `hud-row ${className}`;
  const ic = document.createElement('span');
  ic.className = 'hud-icon';
  ic.innerHTML = icon(iconName, 18);
  const bar = document.createElement('div');
  bar.className = 'hud-bar';
  const fill = document.createElement('div');
  fill.className = 'hud-bar-fill';
  bar.appendChild(fill);
  el.append(ic, bar);
  return { el, bar, fill };
}

function stat(
  iconName: Parameters<typeof icon>[0],
  className: string
): {
  el: HTMLDivElement;
  value: HTMLSpanElement;
} {
  const el = document.createElement('div');
  el.className = `hud-stat ${className}`;
  const ic = document.createElement('span');
  ic.className = 'hud-icon';
  ic.innerHTML = icon(iconName, 18);
  const value = document.createElement('span');
  value.className = 'hud-value';
  el.append(ic, value);
  return { el, value };
}

/** G1: the real graphical HUD (speed, HP/fuel/nitro bars, weapon readout, coins/kills/combo, minimap
 * lives separately in src/ui/Minimap.ts). Replaces the old text-only DebugHud. */
export class Hud {
  private readonly el: HTMLDivElement;
  private readonly speedValue: HTMLSpanElement;
  private readonly hp: ReturnType<typeof row>;
  private readonly fuel: ReturnType<typeof row>;
  private readonly weaponRow: HTMLDivElement;
  private readonly weaponIcon: HTMLSpanElement;
  private readonly weaponText: HTMLSpanElement;
  private readonly nitro: ReturnType<typeof row>;
  private readonly coins: ReturnType<typeof stat>;
  private readonly kills: ReturnType<typeof stat>;
  private readonly distance: ReturnType<typeof stat>;
  private readonly combo: HTMLDivElement;
  private readonly fps: HTMLDivElement;
  private readonly paused: HTMLDivElement;
  private readonly objectivesEl: HTMLDivElement;

  private lastCoins = -1;
  private lastKills = -1;

  constructor(
    private readonly cfg: HudConfig,
    parent: HTMLElement = document.body
  ) {
    this.el = document.createElement('div');
    this.el.id = 'hud';

    const left = document.createElement('div');
    left.className = 'hud-left';
    this.speedValue = document.createElement('div');
    this.speedValue.className = 'hud-speed';
    this.hp = row('health', 'hud-hp');
    this.fuel = row('fuel', 'hud-fuel');
    this.weaponRow = document.createElement('div');
    this.weaponRow.className = 'hud-row hud-weapon';
    this.weaponIcon = document.createElement('span');
    this.weaponIcon.className = 'hud-icon';
    this.weaponText = document.createElement('span');
    this.weaponText.className = 'hud-weapon-text';
    this.weaponRow.append(this.weaponIcon, this.weaponText);
    this.nitro = row('nitro', 'hud-nitro');
    left.append(this.speedValue, this.hp.el, this.fuel.el, this.weaponRow, this.nitro.el);

    const right = document.createElement('div');
    right.className = 'hud-right';
    this.coins = stat('coin', 'hud-coins');
    this.kills = stat('kill', 'hud-kills');
    this.distance = stat('distance', 'hud-distance');
    this.combo = document.createElement('div');
    this.combo.className = 'hud-combo';
    this.combo.innerHTML = `${icon('combo', 16)}<span></span>`;
    this.fps = document.createElement('div');
    this.fps.className = 'hud-fps';
    right.append(this.coins.el, this.kills.el, this.distance.el, this.combo, this.fps);

    this.objectivesEl = document.createElement('div');
    this.objectivesEl.className = 'hud-objectives';

    this.paused = document.createElement('div');
    this.paused.className = 'hud-paused';
    this.paused.textContent = 'PAUSED';

    this.el.append(left, right, this.objectivesEl, this.paused);
    parent.appendChild(this.el);
  }

  setVisible(visible: boolean): void {
    this.el.hidden = !visible;
  }

  update(s: HudState): void {
    this.speedValue.innerHTML = `${s.kmh}<small>km/h</small>`;

    const hp = hpBarState(s.hp, s.maxHp, this.cfg);
    this.hp.fill.style.width = `${hp.fraction * 100}%`;
    this.hp.fill.style.background = barColor(hp.fraction);
    this.hp.el.classList.toggle('hud-low', hp.low);

    const fuel = fuelBarState(s.fuelLitres, s.fuelCapacityLitres, this.cfg);
    this.fuel.fill.style.width = `${fuel.fraction * 100}%`;
    this.fuel.fill.style.background = barColor(fuel.fraction);
    this.fuel.el.classList.toggle('hud-low', fuel.low);

    const readout = weaponReadout(s.weaponKind, s.heat, s.overheated, s.magazine, s.flameOn);
    this.weaponRow.hidden = readout === null;
    if (readout) {
      this.weaponIcon.innerHTML = icon(
        s.weaponKind === 'machinegun'
          ? 'machinegun'
          : s.weaponKind === 'shotgun'
            ? 'shotgun'
            : s.weaponKind === 'rockets'
              ? 'rockets'
              : 'flamethrower',
        18
      );
      this.weaponText.textContent = readout.text;
      this.weaponRow.classList.toggle('hud-low', readout.warn);
    }

    this.nitro.el.hidden = s.nitroFraction === null;
    if (s.nitroFraction !== null) {
      this.nitro.fill.style.width = `${s.nitroFraction * 100}%`;
      this.nitro.fill.style.background = s.nitroBoosting ? '#ffd84a' : '#4a90d9';
    }

    this.coins.value.textContent = String(s.coins);
    this.kills.value.textContent = String(s.kills);
    this.distance.value.textContent = `${(s.distanceMeters / 1000).toFixed(2)} km`;
    if (s.coins !== this.lastCoins) {
      this.pulse(this.coins.el);
      this.lastCoins = s.coins;
    }
    if (s.kills !== this.lastKills) {
      this.pulse(this.kills.el);
      this.lastKills = s.kills;
    }

    this.combo.hidden = s.comboMultiplier <= 1;
    if (s.comboMultiplier > 1) {
      this.combo.querySelector('span')!.textContent = `x${s.comboMultiplier} (${s.comboChain})`;
    }

    this.fps.hidden = s.fps < 0;
    if (s.fps >= 0) this.fps.textContent = `${s.fps} fps`;

    this.paused.hidden = !s.paused;

    this.objectivesEl.innerHTML = '';
    for (const o of s.objectives ?? []) {
      const div = document.createElement('div');
      div.className = o.done ? 'hud-objective done' : 'hud-objective';
      div.textContent = `${o.done ? '✓' : '○'} ${o.label}${o.target > 1 ? ` (${o.current}/${o.target})` : ''}`;
      this.objectivesEl.appendChild(div);
    }
  }

  private pulse(el: HTMLElement): void {
    el.style.animation = 'none';
    void el.offsetWidth; // restart the CSS animation from scratch
    el.style.animation = `hud-pulse ${this.cfg.counterPulseSeconds}s ease-out`;
  }
}
