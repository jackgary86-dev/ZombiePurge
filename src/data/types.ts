export type ZombieRank = 'walker' | 'runner' | 'spitter' | 'brute' | 'tank' | 'boss';

export interface VehicleConfig {
  mass: number;
  /** Forward speed cap in m/s. */
  topSpeed: number;
  /** Target acceleration in m/s^2 (drive force = mass * acceleration). */
  acceleration: number;
  brakingDeceleration: number;
  reverseSpeed: number;
  /** Chassis collider half extents (x, y, z). Forward is +Z. */
  chassisHalfExtents: { x: number; y: number; z: number };
  wheels: {
    radius: number;
    /** Half the distance between left and right wheels. */
    halfTrack: number;
    /** Half the distance between front and rear axles. */
    halfWheelbase: number;
    /** Local Y where the suspension attaches to the chassis. */
    attachHeight: number;
  };
  suspension: {
    restLength: number;
    stiffness: number;
    damping: number;
  };
  tires: {
    /** Lateral grip: force per (m/s of sideways slip) per newton of load. */
    grip: number;
    /** Friction limit as a multiple of wheel load. */
    maxFriction: number;
    /** Rear grip multiplier while the handbrake is held. */
    handbrakeGripMultiplier: number;
  };
  steering: {
    maxAngle: number;
    sensitivity: number;
    returnSpeed: number;
    /** Fraction of maxAngle still available at topSpeed (keeps high-speed steering stable). */
    highSpeedFactor: number;
  };
  friction: {
    rollingResistance: number;
    airResistance: number;
  };
  handbrake: {
    brakingMultiplier: number;
  };
  airControl: {
    pitchTorque: number;
    yawTorque: number;
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
