import type { ZombieRank } from '../data/types';
import { ZOMBIE_RANKS } from '../data/validate';

/** What the console can do to the running game. main.ts supplies the real implementation. */
export interface CheatTarget {
  spawnZombie(rank: ZombieRank, count: number): number;
  addCoins(amount: number): number;
  setGodMode(on: boolean): void;
  teleport(x: number, z: number): void;
  heal(): void;
  killAll(): number;
  unlockAllUpgrades(): string;
}

export interface CommandResult {
  ok: boolean;
  message: string;
}

const HELP =
  'commands: spawn <rank> [n] · coins <n> · god [on|off] · tp <x> <z> · heal · killall · unlockall · help';

/** Parses and runs one console line. Pure, so it's unit-tested without the DOM. */
export function runCommand(
  line: string,
  target: CheatTarget,
  godState: { on: boolean }
): CommandResult {
  const [cmd, ...args] = line.trim().split(/\s+/);
  switch ((cmd ?? '').toLowerCase()) {
    case '':
      return { ok: false, message: HELP };
    case 'help':
      return { ok: true, message: HELP };
    case 'spawn': {
      const rank = (args[0] ?? '').toLowerCase() as ZombieRank;
      if (!ZOMBIE_RANKS.includes(rank))
        return { ok: false, message: `unknown rank; use ${ZOMBIE_RANKS.join('/')}` };
      const count = Math.max(1, Math.min(100, Math.floor(Number(args[1] ?? 1)) || 1));
      const spawned = target.spawnZombie(rank, count);
      return { ok: spawned > 0, message: `spawned ${spawned} ${rank}${spawned === 1 ? '' : 's'}` };
    }
    case 'coins': {
      const n = Math.floor(Number(args[0]));
      if (!Number.isFinite(n) || n === 0) return { ok: false, message: 'usage: coins <n>' };
      return { ok: true, message: `coins: ${target.addCoins(n)}` };
    }
    case 'god': {
      const on = args[0] ? ['on', '1', 'true'].includes(args[0].toLowerCase()) : !godState.on;
      godState.on = on;
      target.setGodMode(on);
      return { ok: true, message: `god mode ${on ? 'ON' : 'off'}` };
    }
    case 'tp': {
      const x = Number(args[0]);
      const z = Number(args[1]);
      if (!Number.isFinite(x) || !Number.isFinite(z))
        return { ok: false, message: 'usage: tp <x> <z>' };
      target.teleport(x, z);
      return { ok: true, message: `teleported to ${x}, ${z}` };
    }
    case 'heal':
      target.heal();
      return { ok: true, message: 'repaired' };
    case 'killall': {
      const n = target.killAll();
      return { ok: true, message: `killed ${n}` };
    }
    case 'unlockall':
      return { ok: true, message: target.unlockAllUpgrades() };
    default:
      return { ok: false, message: `unknown command "${cmd}". ${HELP}` };
  }
}

export interface CheatConsoleOptions {
  parent?: HTMLElement;
  target?: EventTarget;
  /** Key that toggles the console (default Backquote, the ` key). */
  toggleCode?: string;
}

/**
 * K4: a one-line command console for testing. Not created in release builds
 * unless the page is opened with #debug (main.ts decides).
 */
export class CheatConsole {
  readonly el: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly log: HTMLDivElement;
  private readonly toggleCode: string;
  private readonly eventTarget: EventTarget;
  private readonly god = { on: false };
  private readonly history: string[] = [];
  private historyIndex = 0;

  constructor(
    private readonly cheats: CheatTarget,
    options: CheatConsoleOptions = {}
  ) {
    this.toggleCode = options.toggleCode ?? 'Backquote';
    this.eventTarget = options.target ?? window;
    this.el = document.createElement('div');
    this.el.id = 'cheat-console';
    this.el.hidden = true;
    this.log = document.createElement('div');
    this.log.className = 'console-log';
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'type help · ` to close';
    this.input.spellcheck = false;
    this.input.addEventListener('keydown', this.onInputKey);
    this.el.append(this.log, this.input);
    (options.parent ?? document.body).appendChild(this.el);
    this.eventTarget.addEventListener('keydown', this.onKeyDown);
    this.print(HELP, true);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(force?: boolean): void {
    const show = force ?? this.el.hidden;
    this.el.hidden = !show;
    if (show) this.input.focus();
    else this.input.blur();
  }

  submit(line: string): CommandResult {
    const result = runCommand(line, this.cheats, this.god);
    if (line.trim()) {
      this.history.push(line);
      this.historyIndex = this.history.length;
    }
    this.print(`> ${line}`, true);
    this.print(result.message, result.ok);
    return result;
  }

  dispose(): void {
    this.eventTarget.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }

  private print(text: string, ok: boolean): void {
    const line = document.createElement('div');
    line.textContent = text;
    line.className = ok ? 'ok' : 'err';
    this.log.appendChild(line);
    while (this.log.childElementCount > 40) this.log.firstElementChild?.remove();
    this.log.scrollTop = this.log.scrollHeight;
  }

  private onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.code !== this.toggleCode) return;
    e.preventDefault();
    this.toggle();
  };

  private onInputKey = (e: KeyboardEvent): void => {
    // Keep game bindings (WASD, Esc...) from firing while typing.
    e.stopPropagation();
    if (e.code === 'Enter') {
      this.submit(this.input.value);
      this.input.value = '';
    } else if (e.code === 'Escape' || e.code === this.toggleCode) {
      e.preventDefault();
      this.toggle(false);
    } else if (e.code === 'ArrowUp' && this.history.length) {
      this.historyIndex = Math.max(0, this.historyIndex - 1);
      this.input.value = this.history[this.historyIndex];
    } else if (e.code === 'ArrowDown' && this.history.length) {
      this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
      this.input.value = this.history[this.historyIndex] ?? '';
    }
  };
}
