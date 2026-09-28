import { GameState, type StateContext } from './GameState';

export type StateHandler = (context: StateContext) => void;
export type RenderHandler = (context: StateContext) => void;

export interface GameLoopConfig {
  fixedTimeStep?: number;
  maxFrameTime?: number;
}

export class GameLoop {
  private currentState: GameState = GameState.Boot;
  private stateHandlers = new Map<GameState, StateHandler>();
  private renderHandler: RenderHandler | null = null;
  private running = false;
  private lastFrameTime = 0;
  private accumulator = 0;
  private elapsedTime = 0;
  private frameCount = 0;
  private readonly fixedTimeStep: number;
  private readonly maxFrameTime: number;

  constructor(config: GameLoopConfig = {}) {
    this.fixedTimeStep = config.fixedTimeStep ?? 1 / 60;
    // Cap frame time so a stalled tab doesn't trigger a spiral of catch-up updates.
    this.maxFrameTime = config.maxFrameTime ?? 0.05;
  }

  registerStateHandler(state: GameState, handler: StateHandler): void {
    this.stateHandlers.set(state, handler);
  }

  onRender(handler: RenderHandler): void {
    this.renderHandler = handler;
  }

  setState(state: GameState): void {
    this.currentState = state;
  }

  getState(): GameState {
    return this.currentState;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  tick(nowMs: number): void {
    const frameTime = Math.min((nowMs - this.lastFrameTime) / 1000, this.maxFrameTime);
    this.lastFrameTime = nowMs;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedTimeStep) {
      this.elapsedTime += this.fixedTimeStep;
      this.stateHandlers.get(this.currentState)?.({
        deltaTime: this.fixedTimeStep,
        elapsedTime: this.elapsedTime,
      });
      this.accumulator -= this.fixedTimeStep;
    }

    this.renderHandler?.({ deltaTime: frameTime, elapsedTime: this.elapsedTime });
    this.frameCount++;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  private frame = (nowMs: number): void => {
    if (!this.running) return;
    this.tick(nowMs);
    requestAnimationFrame(this.frame);
  };
}
