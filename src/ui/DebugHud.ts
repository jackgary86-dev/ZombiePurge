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
  /** Weapon heat 0..1, or null when no weapon is mounted. */
  heat: number | null;
  overheated: boolean;
  /** Nitro charge 0..1, or null without the upgrade. */
  nitroFraction: number | null;
  nitroBoosting: boolean;
  /** Magazine readout for shotgun/rockets ("5/6" or "reloading"), null for other weapons. */
  magazine: string | null;
  flameOn: boolean;
  /** F2: this map's story objectives, or null outside story mode / maps with none. */
  objectives: { label: string; current: number; target: number; done: boolean }[] | null;
}

/** Text-only HUD until G1 lands; enough to see the loop working. */
export class DebugHud {
  private readonly el: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.id = 'debug-hud';
    parent.appendChild(this.el);
  }

  setVisible(visible: boolean): void {
    this.el.hidden = !visible;
  }

  update(s: HudState): void {
    const hpBar = '█'.repeat(Math.round((10 * s.hp) / s.maxHp)).padEnd(10, '░');
    const fuelBar = '█'.repeat(Math.round(10 * s.fuelFraction)).padEnd(10, '░');
    const combo = s.comboMultiplier > 1 ? `  x${s.comboMultiplier} combo (${s.comboChain})` : '';
    const heat =
      s.heat !== null
        ? `  |  gun ${s.overheated ? 'OVERHEATED' : '▮'.repeat(Math.round(s.heat * 8)).padEnd(8, '▯')}`
        : s.magazine !== null
          ? `  |  ammo ${s.magazine}`
          : '';
    const flame = s.flameOn ? '  |  FLAME' : '';
    const nitro =
      s.nitroFraction === null
        ? ''
        : `  |  nitro ${'▮'.repeat(Math.round(s.nitroFraction * 6)).padEnd(6, '▯')}${s.nitroBoosting ? ' BOOST' : ''}`;
    const objectives = s.objectives?.length
      ? `\n${s.objectives.map((o) => `${o.done ? '✓' : '○'} ${o.label}${o.target > 1 ? ` (${o.current}/${o.target})` : ''}`).join('  |  ')}`
      : '';
    this.el.textContent =
      `${s.paused ? 'PAUSED — ' : ''}${s.kmh} km/h  |  HP ${hpBar} ${Math.ceil(s.hp)}  |  ` +
      `fuel ${fuelBar} ${Math.ceil(s.fuelLitres)}L${heat}${flame}${nitro}  |  coins ${s.coins}  |  kills ${s.kills}${combo}  |  ` +
      `${(s.distanceMeters / 1000).toFixed(2)} km  |  zombies ${s.alive}${s.fps >= 0 ? `  |  ${s.fps} fps` : ''}` +
      `${objectives}` +
      `\nWASD / arrows drive · Space handbrake · R flip · F or click fire · Shift nitro · Esc pause · F1 tuning · F2 debug`;
  }
}

/** Floating "+N" coin popups at world positions (C1). */
export class CoinPopups {
  private readonly layer: HTMLDivElement;
  private readonly live: {
    el: HTMLDivElement;
    pos: { x: number; y: number; z: number };
    age: number;
  }[] = [];

  constructor(parent: HTMLElement = document.body) {
    this.layer = document.createElement('div');
    this.layer.id = 'popup-layer';
    parent.appendChild(this.layer);
  }

  add(coins: number, pos: { x: number; y: number; z: number }, multiplier = 1): void {
    const el = document.createElement('div');
    el.className = 'coin-popup';
    el.textContent = multiplier > 1 ? `+${coins} x${multiplier}` : `+${coins}`;
    this.layer.appendChild(el);
    this.live.push({ el, pos: { ...pos }, age: 0 });
  }

  /** `project` maps a world point to screen pixels, or null when off-screen/behind the camera. */
  update(
    dt: number,
    project: (p: { x: number; y: number; z: number }) => { x: number; y: number } | null
  ): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age > 1.2) {
        p.el.remove();
        this.live.splice(i, 1);
        continue;
      }
      const s = project(p.pos);
      if (!s) {
        p.el.style.display = 'none';
        continue;
      }
      p.el.style.display = 'block';
      p.el.style.transform = `translate(${s.x}px, ${s.y - p.age * 60}px)`;
      p.el.style.opacity = String(1 - p.age / 1.2);
    }
  }
}

export function showGameOver(
  summary: { totalKills: number; distanceMeters: number; coinsTotal: number; kept: number },
  title = 'WRECKED',
  parent: HTMLElement = document.body
): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'game-over';
  el.innerHTML =
    `<h1>${title}</h1>` +
    `<p>Kills: <b>${summary.totalKills}</b> · Distance: <b>${(summary.distanceMeters / 1000).toFixed(2)} km</b></p>` +
    `<p>Coins earned: <b>${summary.coinsTotal}</b> · Kept: <b>${summary.kept}</b></p>` +
    `<p class="hint">Press Enter to head back to the garage</p>`;
  parent.appendChild(el);
  return el;
}
