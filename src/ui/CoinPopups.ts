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
