export type ZombieRank = 'walker' | 'runner' | 'spitter' | 'brute' | 'tank' | 'iceZombie' | 'boss';

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
  /** N1: engine tuning (a slider between top speed and acceleration, free once the engine
   *  upgrade is owned). */
  engineTuning: {
    /** Fraction of the owned engine tier's own topSpeed/acceleration bonus that a full slider
     *  swing (tuning = ±1) shifts from one stat to the other, e.g. 0.5 = up to a 50% swing. */
    swingFactor: number;
  };
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

/** F4: a boss's area-of-effect slam, on top of its normal melee/ranged attack. */
export interface SlamAttackConfig {
  /** Radius of the damage pulse around the boss (m). */
  radius: number;
  damage: number;
  /** Seconds between slams. */
  cooldown: number;
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
  /** F4: bosses only — a periodic AOE pulse independent of the normal attack. */
  slam?: SlamAttackConfig;
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

/** G1: HUD readout thresholds; the panels themselves live in src/ui/Hud.ts. */
export interface HudConfig {
  /** HP fraction at/below which the health bar flashes a warning. */
  lowHpFraction: number;
  /** Fuel fraction at/below which the fuel gauge flashes a warning. */
  lowFuelFraction: number;
  /** Seconds a stat pulses (scales up, fades back) after it changes. */
  counterPulseSeconds: number;
}

/** G2: camera jitter that reads big hits and kills as impact. */
export interface ScreenShakeConfig {
  /** Shake magnitude added per point of damage the car takes. */
  perDamage: number;
  /** Flat shake magnitude added for every kill, on top of any damage-based shake. */
  perKill: number;
  /** A single impulse can never push the magnitude past this. */
  max: number;
  /** How fast the magnitude decays back to zero, per second. */
  decayPerSecond: number;
}

/** G2: a brief slow-motion beat when the car plows through several zombies at once. */
export interface SlowMoConfig {
  /** Kills landed in the same physics step needed to trigger it. */
  multiKillThreshold: number;
  /** Game-speed multiplier while it's in full effect (1 = normal speed). */
  timeScale: number;
  /** Seconds (real time) it holds at full effect. */
  holdSeconds: number;
  /** Seconds (real time) it takes to ramp back to normal speed after that. */
  rampSeconds: number;
}

/** G2: blood decals added to the car on a run-over kill; skipped entirely when settings.lowGore. */
export interface BloodConfig {
  splattersPerKill: number;
  /** Oldest splatters are dropped past this count so the car stays readable. */
  maxSplatters: number;
}

/** I9: a brief flash at the weapon mount on each shot fired. */
export interface MuzzleFlashConfig {
  /** Seconds the flash stays visible before fading out. */
  durationSeconds: number;
  /** Flash size in world units. */
  size: number;
}

/** I9: tyre-skid decals dropped behind the rear wheels while actively sliding. */
export interface SkidMarkConfig {
  /** Seconds between dropping a new mark segment while skidding. */
  intervalSeconds: number;
  /** Marks fade out and are recycled after this many seconds. */
  lifetimeSeconds: number;
  /** Oldest marks are dropped past this count so the trail stays cheap. */
  maxMarks: number;
}

/** I9: dust/snow puffs kicked up behind the car while driving fast; colour is per-map (see
 * `driveTrailColor`). */
export interface DriveTrailConfig {
  /** Minimum forward speed (world units/sec) before puffs start appearing. */
  minSpeed: number;
  /** Seconds between spawning a new puff while above minSpeed. */
  intervalSeconds: number;
  /** Seconds a puff takes to expand and fade out. */
  lifetimeSeconds: number;
  /** Oldest puffs are dropped past this count. */
  maxPuffs: number;
}

export interface VfxConfig {
  screenShake: ScreenShakeConfig;
  slowMo: SlowMoConfig;
  blood: BloodConfig;
  muzzleFlash: MuzzleFlashConfig;
  skidMarks: SkidMarkConfig;
  driveTrail: DriveTrailConfig;
}

/** G3: engine note driven by the car's own speed, not a fixed loop. */
export interface EngineAudioConfig {
  idleHz: number;
  maxHz: number;
  /** Extra pitch multiplier while nitro is boosting. */
  nitroPitchBoost: number;
}

/** G3: zombie groans fall off with distance and are capped so a horde doesn't drown itself out. */
export interface ZombieGroanAudioConfig {
  maxDistance: number;
  /** Average seconds between one zombie's groans. */
  intervalSeconds: number;
  /** At most this many groan voices play at once; the closest zombies win. */
  maxVoices: number;
}

export interface AudioConfig {
  engine: EngineAudioConfig;
  /** Car speed (m/s) the handbrake must exceed to play a tire-skid sound. */
  skidMinSpeed: number;
  zombieGroan: ZombieGroanAudioConfig;
}

/** H1: the performance budget the game is tuned to hit. */
export interface PerformanceConfig {
  /** Frame rate the game is tuned to sustain on a mid-range laptop. */
  targetFps: number;
  /** Max zombies alive at once (the zombie pool's capacity). */
  zombieBudget: number;
}

/** I2: the poly/texture budget for one asset category, per docs/ART_PROMPT.md §2. */
export interface AssetBudget {
  maxTriangles: number;
  /** Texture edge length in pixels (square), or 0 when the asset shares another kit's atlas. */
  textureSize: number;
}

/** I2: asset pipeline budgets - kept in config, not hard-coded, so a future budget-checker
 * tool (or a stricter/looser pass) only has to change numbers here. */
export interface AssetBudgetConfig {
  car: AssetBudget;
  upgradePart: AssetBudget;
  /** LOD0 - the zombie's normal up-close mesh. */
  zombie: AssetBudget;
  zombieLod1: AssetBudget;
  zombieLod2: AssetBudget;
  boss: AssetBudget;
  smallProp: AssetBudget;
  largeProp: AssetBudget;
}

/** I3: HP-fraction thresholds for the car's placeholder damage states, until the real
 * clean/dented/wrecked models (I3) land. */
export interface CarDamageConfig {
  /** HP fraction at/below which the car switches from clean to dented. */
  dentedBelowFraction: number;
  /** HP fraction at/below which the car switches from dented to wrecked. */
  wreckedBelowFraction: number;
}

/** I5: per-instance colour variance and simple procedural motion for the zombie horde,
 * until real rigged/animated models (I5) land. */
export interface ZombieMotionConfig {
  /** Random hue/lightness jitter applied per-instance around its rank's base colour, 0-1. */
  colorVariance: number;
  /** Vertical bob amplitude while moving, in world units. */
  bobAmplitude: number;
  /** Bob cycles per second at full stride. */
  bobFrequency: number;
  /** Forward lunge distance during an attack swing, in world units. */
  attackLungeDistance: number;
  /** Seconds for the attack lunge to reach full extension and settle back. */
  attackLungeSeconds: number;
}

/** G3: per-map ambient drone; also doubles as the map's mood for other art/lighting hooks. */
export interface MapMusicConfig {
  /** Base drone frequency in Hz; sets the map's musical "key". */
  baseHz: number;
  mood: 'calm' | 'tense' | 'dread';
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

export interface SpawnZone {
  x: number;
  z: number;
  radius: number;
  /** Relative chance of picking this zone; 0 disables it. */
  weight: number;
}

export type PickupKind = 'gas' | 'repair' | 'coins' | 'ammo';

export interface PickupSpot {
  kind: PickupKind;
  x: number;
  z: number;
}

export interface MapObjective {
  kind: 'kills' | 'killRank' | 'reachExit';
  /** Kill count for 'kills', rank for 'killRank'. */
  count?: number;
  rank?: ZombieRank;
  /** Exit position for 'reachExit'. */
  x?: number;
  z?: number;
  label: string;
}

export interface MapConfig {
  id: string;
  name: string;
  /** Side length in metres. */
  size: number;
  fogDistance: number;
  zombieRanks: ZombieRank[];
  /** Which layout generator builds the map and how it is streamed. */
  generator:
    | 'greybox'
    | 'openfield'
    | 'suburbs'
    | 'desertHighway'
    | 'industrialCity'
    | 'frozenForest'
    | 'quarantineLab';
  seed: number;
  chunkSize: number;
  /** Optional spawn zones; without them the horde spawner uses the whole map. */
  spawnZones?: SpawnZone[];
  pickups?: PickupSpot[];
  objectives?: MapObjective[];
  /** Story order (1-5); sandbox-only maps omit it. */
  storyIndex?: number;
  night?: boolean;
  /** Story mode's fixed horde density (0-1); sandbox uses its own slider instead. Defaults to 1. */
  spawnDensity?: number;
  /** E7: multiplies tire grip for the whole map (snow/ice); omit for normal grip (1). */
  groundGrip?: number;
  /** F4: this map's boss encounter, on top of the base `boss` rank config. */
  boss?: MapBossConfig;
  /** G3: this map's ambient drone; defaults to a calm, mid-range one when omitted. */
  music?: MapMusicConfig;
}

/** F4: overrides layered onto the shared `boss` rank config for this map's own fight. */
export interface MapBossConfig {
  position: { x: number; z: number };
  hp?: number;
  speed?: number;
  attackDamage?: number;
  rangedAttack?: RangedAttackConfig;
  slam?: SlamAttackConfig;
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

/** M1: a melee weapon's per-tier stats - flat contact damage plus a knockback push,
 * both independent of the run-over speed-based damage the Front Ram (D12) scales. */
export interface MeleeTierStats {
  /** Flat bonus damage dealt to a zombie on any car-to-zombie contact, regardless of speed. */
  damage: number;
  /** Horizontal speed (m/s) imparted to the zombie, away from the car, on contact. */
  knockback: number;
}

/** M3: the circular saw's per-tier stats - continuous damage dealt every second the blade
 * stays in contact with a zombie, unlike the spike cluster's one-shot-per-contact damage. */
export interface SawTierStats {
  damagePerSecond: number;
}

/** M4: the hammer/flail's per-tier stats - a periodic AOE burst on its own cooldown, unlike
 * the spike cluster (every contact) or the saw (continuous while touching). Doesn't require
 * physical contact at all: anything within `radius` of the car when the cooldown expires
 * takes `damage` and a knockback push. */
export interface HammerTierStats {
  damage: number;
  knockback: number;
  radius: number;
  cooldownSeconds: number;
}

export interface CombatConfig {
  /** Per-tier stats for the machine gun (index 0 = tier 1). */
  machineGun: GunTierStats[];
  flamethrower: FlamethrowerTierStats[];
  shotgun: ShotgunTierStats[];
  rockets: RocketTierStats[];
  /** M2: the first melee weapon, front-mounted like the ram/flamethrower. */
  spikes: MeleeTierStats[];
  /** M3: the second melee weapon, also front-mounted. */
  saw: SawTierStats[];
  /** M4: the third melee weapon, also front-mounted. */
  hammer: HammerTierStats[];
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
  | 'melee'
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

/** L1/L2: one purchasable/selectable look within a cosmetic category (e.g. one paint colour). */
export interface CosmeticOption {
  id: string;
  label: string;
  /** A price of 0 means always owned (the stock look). */
  price: number;
  /** Hex colour; every cosmetic category today (paint) is colour-based. */
  color: number;
  /** L5: window tint opacity (0-1); omitted for categories that aren't glass-based. */
  opacity?: number;
}

/** L1: a car customization category (paint, and more added by L3-L8) - exactly one option
 * per category is selected at a time, independent of the tiered stat upgrades above. */
export interface CosmeticCategoryConfig {
  id: string;
  label: string;
  options: CosmeticOption[];
}

export interface GameConfig {
  physics: PhysicsConfig;
  vehicle: VehicleConfig;
  camera: CameraConfig;
  zombies: Record<ZombieRank, ZombieConfig>;
  rewards: RewardsConfig;
  combat: CombatConfig;
  upgrades: UpgradeDef[];
  cosmetics: CosmeticCategoryConfig[];
  maps: MapConfig[];
  hud: HudConfig;
  vfx: VfxConfig;
  audio: AudioConfig;
  performance: PerformanceConfig;
  assetBudget: AssetBudgetConfig;
  carDamage: CarDamageConfig;
  zombieMotion: ZombieMotionConfig;
}

export type DeepPartial<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};
