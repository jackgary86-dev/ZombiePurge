export const GAME_ACTIONS = [
  'throttle',
  'brake',
  'steerLeft',
  'steerRight',
  'handbrake',
  'flipReset',
  'nitro',
  'fire',
  'pause',
] as const;

export type GameAction = (typeof GAME_ACTIONS)[number];

/** Continuous inputs in the range [-1, 1] (steer) or [0, 1] (throttle/brake). */
export type GameAxis = 'steer' | 'throttle' | 'brake';

export interface GamepadButtonBinding {
  kind: 'button';
  index: number;
}

export interface GamepadAxisBinding {
  kind: 'axis';
  index: number;
  /** +1 reads the positive half of the axis, -1 the negative half. */
  direction: 1 | -1;
}

export type GamepadBinding = GamepadButtonBinding | GamepadAxisBinding;

export interface Bindings {
  version: number;
  keyboard: Record<GameAction, string[]>;
  gamepad: Record<GameAction, GamepadBinding[]>;
}
