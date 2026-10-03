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

  it('gamepad B backs out, and stick axes navigate the same as the D-pad', () => {
    let pad: Gamepad | null = null;
    stack = new MenuStack({ target: new EventTarget(), getGamepads: () => [pad] });
    const main = screen('main', ['One', 'Two']);
    const settings = screen('settings', ['Back']);
    stack.push(main);
    stack.push(settings);
    const make = (buttons: number[], axes: number[] = [0, 0]) =>
      ({
        axes,
        buttons: Array.from({ length: 16 }, (_, i) => ({
          pressed: buttons.includes(i),
          value: 0,
          touched: false,
        })),
      }) as unknown as Gamepad;

    pad = make([1]); // B
    stack.pollGamepad();
    expect(stack.top?.id).toBe('main'); // backed out of settings
    expect(document.activeElement?.textContent).toBe('One');

    pad = make([], [0, 0.9]); // stick pushed down, no button
    stack.pollGamepad();
    expect(document.activeElement?.textContent).toBe('Two');
    pad = make([], [0, 0]);
    stack.pollGamepad(); // release so the next push edge-triggers again
    pad = make([], [0, -0.9]); // stick pushed up
    stack.pollGamepad();
    expect(document.activeElement?.textContent).toBe('One');
  });

  it('arrow keys nudge a focused range input but not while typing in a text field', () => {
    // Listen on `window` (MenuStack's real default) so a real DOM-bubbled event's `e.target`
    // is the actual focused element, matching how a browser really dispatches a keydown -
    // the "typing" guard reads e.target, not just document.activeElement.
    stack = new MenuStack({ getGamepads: () => [] });
    stack.attach();
    const s = screen('sandbox', []);
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '10';
    range.step = '2';
    range.value = '4';
    s.el.querySelector('.menu-body')!.appendChild(range);
    const text = document.createElement('input');
    text.type = 'text';
    s.el.querySelector('.menu-body')!.appendChild(text);
    stack.push(s);

    range.focus();
    range.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
    expect(range.value).toBe('6');
    range.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    expect(range.value).toBe('4');

    text.focus();
    text.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(text); // typing suppresses the nudge/focus-move entirely
  });

  it("T5: arrow keys/gamepad left-right step a focused <select> - it wasn't reachable before", () => {
    stack = new MenuStack({ getGamepads: () => [] });
    stack.attach();
    const s = screen('settings', []);
    const sel = document.createElement('select');
    for (const v of ['low', 'medium', 'high']) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    }
    sel.value = 'medium';
    let changedTo: string | null = null;
    sel.addEventListener('change', () => (changedTo = sel.value));
    s.el.querySelector('.menu-body')!.appendChild(sel);
    stack.push(s);

    sel.focus();
    sel.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
    expect(sel.value).toBe('high');
    expect(changedTo).toBe('high');
    sel.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    sel.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    expect(sel.value).toBe('low'); // clamps rather than wrapping
    sel.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    expect(sel.value).toBe('low');
    expect(document.activeElement).toBe(sel); // never lost focus to moveFocus()
  });

  it('Enter/Space on an already-focused button does not double-activate it', () => {
    // Listen on `window` (MenuStack's real default) so a real DOM-bubbled event's `e.target`
    // is the actual focused button, matching how a browser really dispatches a keydown.
    stack = new MenuStack({ getGamepads: () => [] });
    stack.attach();
    const s = screen('main', ['Go']);
    stack.push(s);
    // A real 'Enter' on a focused <button> already fires a native click on its own; the
    // handler must skip calling activate() here or the click would be double-counted.
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Enter', bubbles: true })
    );
    expect(s.clicks).toEqual([]);
  });

  it('Shift+Tab moves focus backward, and isOpen finds a screen anywhere in the stack', () => {
    const target = new EventTarget();
    stack = new MenuStack({ target, getGamepads: () => [] });
    stack.attach();
    const main = screen('main', ['One', 'Two', 'Three']);
    stack.push(main);
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }));
    expect(document.activeElement?.textContent).toBe('Two');
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', shiftKey: true }));
    expect(document.activeElement?.textContent).toBe('One'); // back the way it came

    expect(stack.isOpen('main')).toBe(true);
    expect(stack.isOpen('settings')).toBe(false);
    const settings = screen('settings', ['Back']);
    stack.push(settings);
    expect(stack.isOpen('main')).toBe(true); // still in the stack, just covered
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
