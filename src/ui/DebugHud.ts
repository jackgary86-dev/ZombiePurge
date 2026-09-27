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
}

/** Text-only HUD until G1 lands; enough to see the loop working. */
export class DebugHud {
  private readonly el: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.id = 'debug-hud';
    parent.appendChild(this.el);
  }

  update(s: HudState): void {
    const hpBar = '█'.repeat(Math.round((10 * s.hp) / s.maxHp)).padEnd(10, '░');
    this.el.textContent =
      `${s.paused ? 'PAUSED — ' : ''}${s.kmh} km/h  |  HP ${hpBar} ${Math.ceil(s.hp)}  |  ` +
      `coins ${s.coins}  |  kills ${s.kills}  |  ${(s.distanceMeters / 1000).toFixed(2)} km  |  ` +
      `zombies ${s.alive}  |  ${s.fps} fps` +
      `\nWASD / arrows drive · Space handbrake · R flip · Esc pause · click to orbit`;
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

  add(coins: number, pos: { x: number; y: number; z: number }): void {
    const el = document.createElement('div');
    el.className = 'coin-popup';
    el.textContent = `+${coins}`;
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
  parent: HTMLElement = document.body
): void {
  const el = document.createElement('div');
  el.id = 'game-over';
  el.innerHTML =
    `<h1>WRECKED</h1>` +
    `<p>Kills: <b>${summary.totalKills}</b> · Distance: <b>${(summary.distanceMeters / 1000).toFixed(2)} km</b></p>` +
    `<p>Coins earned: <b>${summary.coinsTotal}</b> · Kept: <b>${summary.kept}</b></p>` +
    `<p class="hint">Press Enter to drive again</p>`;
  parent.appendChild(el);
}
