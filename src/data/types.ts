export type ZombieRank = 'walker' | 'runner' | 'spitter' | 'brute' | 'tank' | 'boss';

export interface VehicleConfig {
  mass: number;
  topSpeed: number;
  acceleration: number;
  brakingDeceleration: number;
  reverseSpeed: number;
  steering: {
    maxAngle: number;
    sensitivity: number;
    returnSpeed: number;
  };
  friction: {
    rollingResistance: number;
    airResistance: number;
  };
  handbrake: {
    brakingMultiplier: number;
  };
  hp: number;
  armor: number;
}

export interface ZombieConfig {
  rank: ZombieRank;
  hp: number;
  speed: number;
  detectionRadius: number;
  attackDamage: number;
  coinValue: number;
}

export interface RewardsConfig {
  coinsPerRank: Record<ZombieRank, number>;
  metersPerDistanceCoin: number;
  coinsKeptOnDeathPercent: number;
}

export interface CameraConfig {
  distance: number;
  height: number;
  baseFov: number;
  speedFovBoost: number;
  followLerp: number;
  orbitSensitivity: number;
  recenterSpeed: number;
}

export interface MapConfig {
  id: string;
  name: string;
  size: number;
  fogDistance: number;
  zombieRanks: ZombieRank[];
}

export interface PhysicsConfig {
  gravity: number;
  fixedTimeStep: number;
}

export interface GameConfig {
  physics: PhysicsConfig;
  vehicle: VehicleConfig;
  camera: CameraConfig;
  zombies: Record<ZombieRank, ZombieConfig>;
  rewards: RewardsConfig;
  maps: MapConfig[];
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
