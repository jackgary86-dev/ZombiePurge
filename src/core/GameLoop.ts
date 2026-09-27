import { GameState, StateContext } from './GameState'

export type StateHandler = (context: StateContext) => void

export interface GameLoopConfig {
  fixedTimeStep?: number
}

export class GameLoop {
  private currentState: GameState = GameState.Boot
  private stateHandlers: Map<GameState, StateHandler> = new Map()
  private isRunning = false
  private lastFrameTime = 0
  private accumulator = 0
  private fixedTimeStep: number

  private elapsedTime = 0
  private frameCount = 0

  constructor(config: GameLoopConfig = {}) {
    this.fixedTimeStep = config.fixedTimeStep || 1 / 60 // 60 Hz fixed update
  }

  registerStateHandler(state: GameState, handler: StateHandler): void {
    this.stateHandlers.set(state, handler)
  }

  setState(newState: GameState): void {
    if (newState !== this.currentState) {
      this.currentState = newState
    }
  }

  getState(): GameState {
    return this.currentState
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.loop()
  }

  stop(): void {
    this.isRunning = false
  }

  private loop = (): void => {
    if (!this.isRunning) return

    const now = performance.now()
    const deltaTimeMs = Math.min(now - this.lastFrameTime, 50) // Cap at 50ms to prevent spiral
    const deltaTime = deltaTimeMs / 1000
    this.lastFrameTime = now
    this.elapsedTime += deltaTime

    this.accumulator += deltaTime

    // Fixed-step physics updates
    while (this.accumulator >= this.fixedTimeStep) {
      this.updateFixed()
      this.accumulator -= this.fixedTimeStep
    }

    // Variable-rate rendering
    this.updateVariable()

    this.frameCount++
    requestAnimationFrame(this.loop)
  }

  private updateFixed(): void {
    const handler = this.stateHandlers.get(this.currentState)
    if (handler) {
      handler({
        deltaTime: this.fixedTimeStep,
        elapsedTime: this.elapsedTime,
      })
    }
  }

  private updateVariable(): void {
    // Render frame (called every frame, not fixed-step)
    // Physics state is already up-to-date from updateFixed()
  }

  getElapsedTime(): number {
    return this.elapsedTime
  }

  getFrameCount(): number {
    return this.frameCount
  }

  getFPS(): number {
    return this.frameCount > 0 ? 1 / (this.elapsedTime / this.frameCount) : 0
  }
}
