import { describe, it, expect, beforeEach } from 'vitest'
import { GameLoop } from '../../src/core/GameLoop'
import { GameState } from '../../src/core/GameState'

describe('GameLoop', () => {
  let gameLoop: GameLoop

  beforeEach(() => {
    gameLoop = new GameLoop({ fixedTimeStep: 1 / 60 })
  })

  it('should initialize with Boot state', () => {
    expect(gameLoop.getState()).toBe(GameState.Boot)
  })

  it('should transition between states', () => {
    gameLoop.setState(GameState.MainMenu)
    expect(gameLoop.getState()).toBe(GameState.MainMenu)

    gameLoop.setState(GameState.Playing)
    expect(gameLoop.getState()).toBe(GameState.Playing)

    gameLoop.setState(GameState.Paused)
    expect(gameLoop.getState()).toBe(GameState.Paused)
  })

  it('should call state handler on update', (done) => {
    let handlerCalled = false
    const handler = () => {
      handlerCalled = true
    }

    gameLoop.registerStateHandler(GameState.MainMenu, handler)
    gameLoop.setState(GameState.MainMenu)
    gameLoop.start()

    setTimeout(() => {
      gameLoop.stop()
      expect(handlerCalled).toBe(true)
      done()
    }, 50)
  })

  it('should track elapsed time and frame count', (done) => {
    gameLoop.start()

    setTimeout(() => {
      gameLoop.stop()
      expect(gameLoop.getElapsedTime()).toBeGreaterThan(0)
      expect(gameLoop.getFrameCount()).toBeGreaterThan(0)
      done()
    }, 50)
  })

  it('should calculate FPS', (done) => {
    gameLoop.start()

    setTimeout(() => {
      gameLoop.stop()
      const fps = gameLoop.getFPS()
      expect(fps).toBeGreaterThan(0)
      expect(fps).toBeLessThanOrEqual(240) // Reasonable upper bound
      done()
    }, 50)
  })
})
