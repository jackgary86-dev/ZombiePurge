import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../../src/core/GameLoop';
import { GameState } from '../../src/core/GameState';

// Power-of-two step sizes are exact in floating point, so step counts are deterministic.
const STEP = 1 / 16; // 62.5 ms
const STEP_MS = STEP * 1000;

describe('GameLoop', () => {
  it('starts in Boot state and transitions', () => {
    const loop = new GameLoop();
    expect(loop.getState()).toBe(GameState.Boot);
    loop.setState(GameState.Playing);
    expect(loop.getState()).toBe(GameState.Playing);
  });

  it('runs fixed-step updates for the active state only', () => {
    const loop = new GameLoop({ fixedTimeStep: STEP, maxFrameTime: 1 });
    const playing = vi.fn();
    const paused = vi.fn();
    loop.registerStateHandler(GameState.Playing, playing);
    loop.registerStateHandler(GameState.Paused, paused);
    loop.setState(GameState.Playing);

    loop.tick(0);
    loop.tick(STEP_MS * 3.5); // 3 full steps, half a step carried over
    expect(playing).toHaveBeenCalledTimes(3);
    expect(paused).not.toHaveBeenCalled();
    expect(playing.mock.calls[0][0].deltaTime).toBeCloseTo(STEP);

    loop.tick(STEP_MS * 4); // carried half + new half => one more step
    expect(playing).toHaveBeenCalledTimes(4);
  });

  it('caps frame time to avoid a spiral of death', () => {
    const loop = new GameLoop({ fixedTimeStep: STEP, maxFrameTime: STEP * 5 });
    const handler = vi.fn();
    loop.registerStateHandler(GameState.Playing, handler);
    loop.setState(GameState.Playing);
    loop.tick(0);
    loop.tick(5000);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('calls the render handler once per frame and tracks time', () => {
    const loop = new GameLoop({ fixedTimeStep: STEP, maxFrameTime: 1 });
    const render = vi.fn();
    loop.onRender(render);
    loop.tick(0);
    loop.tick(STEP_MS);
    loop.tick(STEP_MS * 2);
    expect(render).toHaveBeenCalledTimes(3);
    expect(loop.getFrameCount()).toBe(3);
    expect(loop.getElapsedTime()).toBeCloseTo(STEP * 2);
  });
});
