import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildPanel, menuButton, MenuStack, type MenuScreen } from '../../src/ui/MenuStack';

function screen(
  id: string,
  buttons: string[],
  hooks: Partial<MenuScreen> = {}
): MenuScreen & { clicks: string[] } {
  const { el, body } = buildPanel(id, id.toUpperCase());
  const clicks: string[] = [];
  for (const b of buttons) body.appendChild(menuButton(b, () => clicks.push(b)));
  document.body.appendChild(el);
  return { id, el, clicks, ...hooks };
}

describe('J1 MenuStack', () => {
  let stack: MenuStack | null = null;
  afterEach(() => {
    stack?.detach();
    document.body.innerHTML = '';
  });

  it('shows only the top screen and pops with Esc down to the root', () => {
    const target = new EventTarget();
    stack = new MenuStack({ target, getGamepads: () => [] });
    stack.attach();
    const main = screen('main', ['Play', 'Settings']);
    const settings = screen('settings', ['Back'], { onEnter: vi.fn(), onLeave: vi.fn() });
    stack.push(main);
    expect(main.el.hidden).toBe(false);
    stack.push(settings);
    expect(main.el.hidden).toBe(true);
    expect(settings.el.hidden).toBe(false);
    expect(settings.onEnter).toHaveBeenCalled();
    expect(document.activeElement?.textContent).toBe('Back');

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(settings.el.hidden).toBe(true);
    expect(settings.onLeave).toHaveBeenCalled();
    expect(main.el.hidden).toBe(false);
    expect(stack.back()).toBe(false); // root stays
    expect(stack.depth).toBe(1);
  });

  it('moves focus with arrows/Tab, wraps, and activates with Enter', () => {
    const target = new EventTarget();
    stack = new MenuStack({ target, getGamepads: () => [] });
    stack.attach();
    const main = screen('main', ['One', 'Two', 'Three']);
    stack.push(main);
    expect(document.activeElement?.textContent).toBe('One');
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    expect(document.activeElement?.textContent).toBe('Two');
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    expect(document.activeElement?.textContent).toBe('Three'); // wrapped
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }));
    expect(document.activeElement?.textContent).toBe('One');
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(main.clicks).toEqual(['One']);
  });

  it('navigates with a gamepad (edge-triggered) and nudges range inputs', () => {
    let pad: Gamepad | null = null;
    stack = new MenuStack({ target: new EventTarget(), getGamepads: () => [pad] });
    const s = screen('sandbox', ['Go']);
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '10';
    range.step = '1';
    range.value = '5';
    s.el.querySelector('.menu-body')!.prepend(range);
    stack.push(s);
    expect(document.activeElement).toBe(range);
    const make = (buttons: number[], axes: number[] = [0, 0]) =>
      ({
        axes,
        buttons: Array.from({ length: 16 }, (_, i) => ({
          pressed: buttons.includes(i),
          value: 0,
          touched: false,
        })),
      }) as unknown as Gamepad;
    pad = make([15]); // dpad right
    stack.pollGamepad();
    expect(range.value).toBe('6');
    stack.pollGamepad(); // still held: no repeat
    expect(range.value).toBe('6');
    pad = make([]);
    stack.pollGamepad();
    pad = make([13]); // dpad down -> next control
    stack.pollGamepad();
    expect(document.activeElement?.textContent).toBe('Go');
    pad = make([]);
    stack.pollGamepad();
    pad = make([0]); // A
    stack.pollGamepad();
    expect(s.clicks).toEqual(['Go']);
  });

  it('onBack can veto and reset() replaces the stack', () => {
    stack = new MenuStack({ target: new EventTarget(), getGamepads: () => [] });
    const a = screen('a', ['x']);
    const b = screen('b', ['y'], { onBack: () => false });
    stack.push(a);
    stack.push(b);
    expect(stack.back()).toBe(false);
    expect(stack.top?.id).toBe('b');
    const c = screen('c', ['z']);
    stack.reset(c);
    expect(stack.depth).toBe(1);
    expect(stack.top?.id).toBe('c');
    expect(a.el.hidden).toBe(true);
    expect(b.el.hidden).toBe(true);
    expect(c.el.hidden).toBe(false);
  });
});
