/**
 * J1: a stack of full-screen menu panels. Only the top panel is visible and
 * focusable; Esc/back pops it (unless it's the root); arrow keys, Tab and the
 * gamepad move focus between the panel's focusable controls; Enter/A activates.
 */
export interface MenuScreen {
  id: string;
  el: HTMLElement;
  /** Called when the screen becomes the top of the stack. */
  onEnter?: () => void;
  /** Called when the screen is popped or covered. */
  onLeave?: () => void;
  /** Return false to block Esc/back on this screen. */
  onBack?: () => boolean | void;
}

export interface MenuStackOptions {
  target?: EventTarget;
  /** Polls gamepads for navigation; injectable for tests. */
  getGamepads?: () => (Gamepad | null)[];
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class MenuStack {
  private readonly stack: MenuScreen[] = [];
  private readonly target: EventTarget;
  private readonly getGamepads: () => (Gamepad | null)[];
  private padWasPressed = { up: false, down: false, left: false, right: false, a: false, b: false };
  private attached = false;
  onChange: ((top: MenuScreen | null) => void) | null = null;

  constructor(options: MenuStackOptions = {}) {
    this.target = options.target ?? window;
    this.getGamepads =
      options.getGamepads ??
      (() =>
        typeof navigator !== 'undefined' && navigator.getGamepads
          ? Array.from(navigator.getGamepads())
          : []);
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.target.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.target.removeEventListener('keydown', this.onKeyDown);
  }

  get top(): MenuScreen | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  get depth(): number {
    return this.stack.length;
  }

  isOpen(id: string): boolean {
    return this.stack.some((s) => s.id === id);
  }

  push(screen: MenuScreen): void {
    const prev = this.top;
    if (prev) {
      prev.onLeave?.();
      prev.el.hidden = true;
    }
    this.stack.push(screen);
    this.show(screen);
  }

  /** Pops the top screen; returns false when at the root (nothing to go back to). */
  pop(): boolean {
    if (this.stack.length <= 1) return false;
    const leaving = this.stack.pop()!;
    leaving.onLeave?.();
    leaving.el.hidden = true;
    leaving.el.classList.remove('menu-enter');
    const next = this.top!;
    this.show(next);
    return true;
  }

  /** Replaces the whole stack with one screen (e.g. jump to the main menu). */
  reset(screen: MenuScreen | null): void {
    for (const s of this.stack) {
      s.onLeave?.();
      s.el.hidden = true;
      s.el.classList.remove('menu-enter');
    }
    this.stack.length = 0;
    if (screen) this.push(screen);
    else this.onChange?.(null);
  }

  /** Esc / B: ask the top screen, then pop. */
  back(): boolean {
    const top = this.top;
    if (!top) return false;
    if (top.onBack?.() === false) return false;
    return this.pop();
  }

  focusables(): HTMLElement[] {
    const top = this.top;
    if (!top) return [];
    return [...top.el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hidden && el.offsetParent !== undefined
    );
  }

  moveFocus(delta: number): void {
    const items = this.focusables();
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const index = items.indexOf(active!);
    const next =
      index < 0
        ? delta > 0
          ? 0
          : items.length - 1
        : (index + delta + items.length) % items.length;
    items[next].focus();
  }

  activate(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && this.top?.el.contains(active)) active.click();
  }

  /** Call once per frame to turn gamepad input into navigation (edge-triggered). */
  pollGamepad(): void {
    if (!this.top) return;
    const pad = this.getGamepads().find((p) => p);
    if (!pad) return;
    const axisY = pad.axes[1] ?? 0;
    const axisX = pad.axes[0] ?? 0;
    const now = {
      up: (pad.buttons[12]?.pressed ?? false) || axisY < -0.5,
      down: (pad.buttons[13]?.pressed ?? false) || axisY > 0.5,
      left: (pad.buttons[14]?.pressed ?? false) || axisX < -0.5,
      right: (pad.buttons[15]?.pressed ?? false) || axisX > 0.5,
      a: pad.buttons[0]?.pressed ?? false,
      b: pad.buttons[1]?.pressed ?? false,
    };
    if (now.up && !this.padWasPressed.up) this.moveFocus(-1);
    if (now.down && !this.padWasPressed.down) this.moveFocus(1);
    if (now.left && !this.padWasPressed.left) this.nudgeRange(-1);
    if (now.right && !this.padWasPressed.right) this.nudgeRange(1);
    if (now.a && !this.padWasPressed.a) this.activate();
    if (now.b && !this.padWasPressed.b) this.back();
    this.padWasPressed = now;
  }

  private nudgeRange(direction: number): void {
    const active = document.activeElement as HTMLElement | null;
    if (active instanceof HTMLInputElement && active.type === 'range') {
      const step = Number(active.step) || 1;
      active.value = String(Number(active.value) + direction * step);
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    // T5: a focused <select> (e.g. Settings' graphics quality, Sandbox's map picker) was
    // previously unreachable by keyboard/gamepad - Left/Right fell through to moveFocus() and a
    // synthetic .click() from Enter/A doesn't open a native dropdown in real browsers. Left/Right
    // now steps the selection directly, the same shape sliders already use.
    if (active instanceof HTMLSelectElement) {
      const next = Math.min(
        active.options.length - 1,
        Math.max(0, active.selectedIndex + direction)
      );
      if (next !== active.selectedIndex) {
        active.selectedIndex = next;
        active.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    this.moveFocus(direction);
  }

  private show(screen: MenuScreen): void {
    screen.el.hidden = false;
    screen.el.classList.add('menu-enter');
    screen.onEnter?.();
    const first = this.focusables()[0];
    first?.focus();
    this.onChange?.(screen);
  }

  private onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (!this.top) return;
    const typing =
      (e.target as HTMLElement | null)?.tagName === 'INPUT' &&
      (e.target as HTMLInputElement).type === 'text';
    switch (e.code) {
      case 'Escape':
        e.preventDefault();
        this.back();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(-1);
        break;
      case 'ArrowLeft':
        if (!typing) {
          e.preventDefault();
          this.nudgeRange(-1);
        }
        break;
      case 'ArrowRight':
        if (!typing) {
          e.preventDefault();
          this.nudgeRange(1);
        }
        break;
      case 'Tab':
        e.preventDefault();
        this.moveFocus(e.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'Space':
        if (!typing && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
          e.preventDefault();
          this.activate();
        }
        break;
    }
  };
}

/** Builds a standard full-screen panel: title, optional subtitle, and a column of buttons. */
export function buildPanel(
  id: string,
  title: string,
  subtitle?: string
): { el: HTMLDivElement; body: HTMLDivElement } {
  const el = document.createElement('div');
  el.id = id;
  el.className = 'menu-panel';
  el.hidden = true;
  const h1 = document.createElement('h1');
  h1.textContent = title;
  el.appendChild(h1);
  if (subtitle) {
    const p = document.createElement('p');
    p.className = 'menu-subtitle';
    p.textContent = subtitle;
    el.appendChild(p);
  }
  const body = document.createElement('div');
  body.className = 'menu-body';
  el.appendChild(body);
  return { el, body };
}

export function menuButton(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `menu-button ${className}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** S7: an I10 icon glyph plus its label, on one line - the standard shape for a menu button's
 *  contents wherever the button represents one specific, iconable thing (a screen, an action). */
export function iconLabel(svg: string, label: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'menu-button-label';
  span.innerHTML = svg;
  span.append(document.createTextNode(label));
  return span;
}

/** A `menuButton` whose contents are `iconLabel(svg, label)` - the common case once a screen's
 *  buttons all get icons, so callers don't have to build+replaceChildren by hand each time. */
export function iconMenuButton(
  svg: string,
  label: string,
  onClick: () => void,
  className = ''
): HTMLButtonElement {
  const b = menuButton('', onClick, className);
  b.replaceChildren(iconLabel(svg, label));
  return b;
}
