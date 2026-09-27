export enum GameState {
  Boot = 'Boot',
  MainMenu = 'MainMenu',
  Garage = 'Garage',
  Playing = 'Playing',
  Paused = 'Paused',
  GameOver = 'GameOver',
  MapComplete = 'MapComplete',
}

export interface StateContext {
  deltaTime: number;
  elapsedTime: number;
}
