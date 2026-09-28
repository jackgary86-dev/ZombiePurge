import {
  GAME_ACTIONS,
  type Bindings,
  type GameAction,
  type GameAxis,
  type GamepadBinding,
} from './actions';
import { loadBindings, saveBindings, type BindingsStorage } from './bindings';

export interface InputManagerOptions {
  target?: EventTarget;
  storage?: BindingsStorage | null;
  getGamepads?: () => (Gamepad | null)[];
  deadzone?: number;
}

export class InputManager {
  private bindings: Bindings;
  private readonly target: EventTarget;
  private readonly storage: BindingsStorage | null | undefined;
  private readonly getGamepads: () => (Gamepad | null)[];
  private readonly deadzone: number;

  private readonly keysDown = new Set<string>();
  /** Keys tapped since the last update(); a press shorter than a frame still counts once. */
  private readonly tapped = new Set<string>();
  private readonly actionsDown = new Set<GameAction>();
  private readonly actionsDownLastFrame = new Set<GameAction>();
  private readonly analog = new Map<GameAction, number>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private attached = false;

  constructor(options: InputManagerOptions = {}) {
    this.target = options.target ?? window;
    this.storage = options.storage;
    this.bindings = loadBindings(options.storage);
    this.getGamepads =
      options.getGamepads ??
      (() =>
        typeof navigator !== 'undefined' && navigator.getGamepads
          ? Array.from(navigator.getGamepads())
          : []);
    this.deadzone = options.deadzone ?? 0.15;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('mousedown', this.onMouseDown);
    this.target.addEventListener('mouseup', this.onMouseUp);
    this.target.addEventListener('mousemove', this.onMouseMove);
    this.target.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    this.target.removeEventListener('mouseup', this.onMouseUp);
    this.target.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('blur', this.onBlur);
    this.keysDown.clear();
  }

  /** Call once per fixed update, before reading input. Polls gamepads and resolves actions. */
  update(): void {
    this.actionsDownLastFrame.clear();
    for (const a of this.actionsDown) this.actionsDownLastFrame.add(a);
    this.actionsDown.clear();
    this.analog.clear();

    for (const action of GAME_ACTIONS) {
      if (
        this.bindings.keyboard[action].some(
          (code) => this.keysDown.has(code) || this.tapped.has(code)
        )
      ) {
        this.actionsDown.add(action);
        this.analog.set(action, 1);
      }
    }
    this.tapped.clear();

    for (const pad of this.getGamepads()) {
      if (!pad) continue;
      for (const action of GAME_ACTIONS) {
        for (const binding of this.bindings.gamepad[action]) {
          const value = this.readGamepadBinding(pad, binding);
          if (value > 0) {
            this.actionsDown.add(action);
            this.analog.set(action, Math.max(this.analog.get(action) ?? 0, value));
          }
        }
      }
    }
  }

  isDown(action: GameAction): boolean {
    return this.actionsDown.has(action);
  }

  /** True only on the first update() where the action became active. */
  justPressed(action: GameAction): boolean {
    return this.actionsDown.has(action) && !this.actionsDownLastFrame.has(action);
  }

  /** Analog value for an action: 0..1 (keyboard gives 0 or 1, triggers/sticks give the analog amount). */
  value(action: GameAction): number {
    return this.analog.get(action) ?? 0;
  }

  axis(axis: GameAxis): number {
    switch (axis) {
      case 'steer':
        return this.value('steerRight') - this.value('steerLeft');
      case 'throttle':
        return this.value('throttle');
      case 'brake':
        return this.value('brake');
    }
  }

  /** Mouse movement since the last call, then resets. Used for camera orbit. */
  consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  getBindings(): Bindings {
    return this.bindings;
  }

  setBindings(bindings: Bindings): void {
    this.bindings = bindings;
    saveBindings(bindings, this.storage);
  }

  private readGamepadBinding(pad: Gamepad, binding: GamepadBinding): number {
    if (binding.kind === 'button') {
      const button = pad.buttons[binding.index];
      if (!button) return 0;
      return button.value > this.deadzone ? button.value : button.pressed ? 1 : 0;
    }
    const raw = pad.axes[binding.index] ?? 0;
    const signed = raw * binding.direction;
    if (signed <= this.deadzone) return 0;
    // Rescale so the range just past the deadzone maps smoothly onto 0..1.
    return Math.min(1, (signed - this.deadzone) / (1 - this.deadzone));
  }

  private onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.repeat) return;
    this.keysDown.add(e.code);
    this.tapped.add(e.code);
  };

  private onKeyUp = (event: Event): void => {
    this.keysDown.delete((event as KeyboardEvent).code);
  };

  private onMouseDown = (event: Event): void => {
    const code = `Mouse${(event as MouseEvent).button}`;
    this.keysDown.add(code);
    this.tapped.add(code);
  };

  private onMouseUp = (event: Event): void => {
    this.keysDown.delete(`Mouse${(event as MouseEvent).button}`);
  };

  private onMouseMove = (event: Event): void => {
    const e = event as MouseEvent;
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  };

  // Losing focus never fires keyup, so release everything to avoid a stuck throttle.
  private onBlur = (): void => {
    this.keysDown.clear();
  };
}
