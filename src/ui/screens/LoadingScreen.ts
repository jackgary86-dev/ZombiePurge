import { renderLogo } from '../logo';

const TIPS = [
  'Zombies notice you at 40–80 m; you can see them from 300 m. Plan the line.',
  'Slow bumps just shove zombies. Speed kills.',
  'Chained kills within 2.5 s build a combo multiplier.',
  'The flamethrower drinks car fuel. So does nitro.',
  'A wreck tows you home with 25% HP — repairs cost coins.',
  'Press F2 for the detection overlay, F1 for live tuning.',
];

/** J12: progress bar and a tip while a map builds. */
export class LoadingScreen {
  readonly el: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly label: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.id = 'loading-screen';
    this.el.hidden = true;
    const title = document.createElement('h1');
    title.innerHTML = renderLogo();
    title.classList.add('logo-heading');
    this.label = document.createElement('div');
    this.label.className = 'loading-label';
    const track = document.createElement('div');
    track.className = 'loading-track';
    this.bar = document.createElement('div');
    this.bar.className = 'loading-bar';
    track.appendChild(this.bar);
    const tip = document.createElement('p');
    tip.className = 'menu-subtitle';
    tip.textContent = `Tip: ${TIPS[Math.floor(Math.random() * TIPS.length)]}`;
    this.el.append(title, this.label, track, tip);
    parent.appendChild(this.el);
  }

  show(label = 'Loading…'): void {
    this.label.textContent = label;
    this.bar.style.width = '0%';
    this.el.hidden = false;
  }

  progress(fraction: number, label?: string): void {
    this.bar.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    if (label) this.label.textContent = label;
  }

  hide(): void {
    this.el.hidden = true;
  }

  /** Yields to the browser so the bar can paint between build steps. */
  static frame(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => r()));
  }
}
