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

export interface RangedAttackConfig {
  /** Fires when the car is within this distance (m). */
  range: number;
  /** Projectile launch speed (m/s). */
  projectileSpeed: number;
  /** Seconds between shots. */
  cooldown: number;
  /** Damage on a direct hit. */
  damage: number;
  /** Hit radius around the projectile (m). */
  hitRadius: number;
}

export interface ZombieConfig {
  rank: ZombieRank;
  hp: number;
  speed: number;
  detectionRadius: number;
  attackDamage: number;
  coinValue: number;
  /** Spitter-style ranged attack; melee only when absent. */
  rangedAttack?: RangedAttackConfig;
}

export interface ComboConfig {
  enabled: boolean;
  /** Kills within this many seconds of the previous kill extend the chain. */
  windowSeconds: number;
  /** Kills needed per extra multiplier step (e.g. 3 => x2 at 3 kills, x3 at 6). */
  killsPerStep: number;
  maxMultiplier: number;
}

export interface RewardsConfig {
  coinsPerRank: Record<ZombieRank, number>;
  metersPerDistanceCoin: number;
  coinsKeptOnDeathPercent: number;
  combo: ComboConfig;
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

export interface GunTierStats {
  damage: number;
  /** Shots per second. */
  fireRate: number;
  range: number;
  /** Heat added per shot; the gun locks out at 1.0 until it cools below unlockHeat. */
  heatPerShot: number;
  /** Heat removed per second while not firing. */
  coolPerSecond: number;
  unlockHeat: number;
  /** Half-angle (radians) of the auto-aim cone. */
  autoAimCone: number;
}

export interface FlamethrowerTierStats {
  /** Direct damage per second to everything in the cone. */
  damagePerSecond: number;
  range: number;
  /** Half-angle (radians) of the flame cone. */
  cone: number;
  /** Seconds a zombie keeps burning after leaving the flame. */
  burnSeconds: number;
  burnDamagePerSecond: number;
  /** Car fuel (litres) consumed per second of flame. */
  fuelPerSecond: number;
}

export interface ShotgunTierStats {
  pellets: number;
  damagePerPellet: number;
  /** Half-angle (radians) of the pellet spread. */
  spread: number;
  range: number;
  /** Minimum seconds between shots (pump). */
  pumpSeconds: number;
  magazine: number;
  reloadSeconds: number;
}

export interface RocketTierStats {
  damage: number;
  splashRadius: number;
  speed: number;
  magazine: number;
  reloadSeconds: number;
  /** Minimum seconds between rockets. */
  fireInterval: number;
}

export interface CombatConfig {
  /** Per-tier stats for the machine gun (index 0 = tier 1). */
  machineGun: GunTierStats[];
  flamethrower: FlamethrowerTierStats[];
  shotgun: ShotgunTierStats[];
  rockets: RocketTierStats[];
  /** Below this relative speed (m/s) a collision only pushes the zombie. */
  runOverMinSpeed: number;
  /** Zombie damage = relativeSpeed * carMass * this factor. */
  runOverDamageFactor: number;
  /** Raw damage the car takes when it hits each rank at full impact speed. */
  impactDamageToCar: Record<ZombieRank, number>;
  /** Relative speed at which impact damage to the car reaches its full value. */
  impactFullSpeed: number;
}

export interface PhysicsConfig {
  gravity: number;
  fixedTimeStep: number;
}

export type UpgradeCategory =
  | 'engine'
  | 'tires'
  | 'health'
  | 'armor'
  | 'fuel'
  | 'weapon'
  | 'ram'
  | 'nitro'
  | 'radar'
  | 'headlights';

export type WeaponSlot = 'roof' | 'front';

/** Additive changes to base stats. Multipliers are expressed as fractions (0.1 = +10%). */
export interface StatModifiers {
  topSpeed?: number;
  acceleration?: number;
  grip?: number;
  offRoadGrip?: number;
  maxHp?: number;
  armor?: number;
  fuelCapacity?: number;
  ramDamageMultiplier?: number;
  selfDamageMultiplier?: number;
  nitroSeconds?: number;
  radarRange?: number;
  headlightRange?: number;
}

export interface UpgradeTier {
  /** 1-based tier number. */
  tier: number;
  price: number;
  /** Story map (1-5) that must be reached before this tier can be bought. */
  unlockMap: number;
  modifiers: StatModifiers;
  label?: string;
}

export interface UpgradeDef {
  id: string;
  category: UpgradeCategory;
  name: string;
  description: string;
  /** Weapons occupy a mount slot; only one weapon per slot can be equipped. */
  slot?: WeaponSlot;
  tiers: UpgradeTier[];
}

export interface GameConfig {
  physics: PhysicsConfig;
  vehicle: VehicleConfig;
  camera: CameraConfig;
  zombies: Record<ZombieRank, ZombieConfig>;
  rewards: RewardsConfig;
  combat: CombatConfig;
  upgrades: UpgradeDef[];
  maps: MapConfig[];
}

export type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};
