import { PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three';
import './style.css';
import { GameLoop } from './core/GameLoop';
import { GameState } from './core/GameState';
import { InputManager } from './core/input';
import { getConfig, getMapConfig } from './data/config';
import {
  loadSandboxOptions,
  saveSandboxOptions,
  SettingsStore,
  type GameSettings,
  type SandboxOptions,
} from './data/settings';
import {
  addPlayTime,
  createSaveSlot,
  deleteSaveSlot,
  listSaveSlots,
  loadPlayTime,
  loadStoryProgress,
  saveStoryProgress,
  setActiveSaveSlotId,
  slotStorage,
  touchSaveSlot,
} from './data/save';
import type { MapConfig, VehicleConfig } from './data/types';
import {
  BloodSplatterView,
  buildPlaceholderCar,
  CarDamageView,
  DetectionRings,
  DriveTrailView,
  driveTrailColor,
  FlameView,
  MuzzleFlashView,
  PickupViews,
  ProjectileViews,
  RocketViews,
  ShotTracers,
  SkidMarkView,
  syncMeleeWeapon,
  syncUpgradeParts,
  TurretView,
  ZombieInstances,
} from './game/art';
import { AudioSystem, skidActive } from './game/audio';
import { ChaseCamera } from './game/camera';
import {
  Flamethrower,
  FRONT_MOUNT,
  MachineGun,
  RocketLauncher,
  ROOF_MOUNT,
  RunOverSystem,
  Shotgun,
  updateBurning,
  WeaponMount,
} from './game/combat';
import { RunStats, Wallet } from './game/economy';
import { initPhysics, PhysicsWorld, RAPIER } from './game/physics/PhysicsWorld';
import { Garage, repairInGarage, repairPrice, type CoinSource } from './game/shop';
import {
  completeMap,
  initialStoryProgress,
  ObjectiveTracker,
  type StoryProgressData,
} from './game/story';
import {
  FuelTank,
  NEUTRAL_INPUT,
  Nitro,
  readVehicleInput,
  Vehicle,
  type VehicleInput,
} from './game/vehicle';
import {
  applyLighting,
  buildDesertHighwayColliders,
  buildDesertHighwayMeshes,
  buildFrozenForestColliders,
  buildFrozenForestMeshes,
  buildGreyboxColliders,
  buildGreyboxMeshes,
  buildIndustrialCityColliders,
  buildIndustrialCityMeshes,
  buildQuarantineLabColliders,
  buildQuarantineLabMeshes,
  buildSuburbsColliders,
  buildSuburbsMeshes,
  ChunkStreamer,
  createGreyboxLayout,
  createHeadlights,
  createLights,
  generateDesertHighway,
  generateFrozenForest,
  generateIndustrialCity,
  generateOpenField,
  generateQuarantineLab,
  generateSuburbs,
  greyboxSpawn,
  presetFor,
  suburbsSpawn,
  type RoadStrip,
} from './game/world';
import { collectPickups, resetPickups, type PickupState } from './game/world/Pickups';
import {
  DEFAULT_ZOMBIE_AI,
  HordeSpawner,
  ProjectileSystem,
  updateBossSlam,
  updateZombieAI,
  ZombiePool,
  type Zombie,
} from './game/zombies';
import { ScreenShake, SlowMo } from './game/vfx';
import { showBuildTag } from './ui/BuildTag';
import { CheatConsole } from './ui/CheatConsole';
import { CoinPopups } from './ui/CoinPopups';
import { GarageMenu } from './ui/GarageMenu';
import { Hud } from './ui/Hud';
import { MenuStack, type MenuScreen } from './ui/MenuStack';
import { computeMinimapFrame, Minimap } from './ui/Minimap';
import {
  createControlsScreen,
  createCreditsScreen,
  createMainMenu,
  createMapCompleteScreen,
  createPauseMenu,
  createResultsScreen,
  createSandboxSetup,
  createSaveSlotsScreen,
  createSettingsMenu,
  createStoryMapSelect,
  LoadingScreen,
  type SaveSlotSummary,
  type StoryMapEntry,
} from './ui/screens';
import { bind, TuningPanel } from './ui/TuningPanel';

const hashParams = new URLSearchParams(location.hash.replace(/^#/, '').replace(/,/g, '&'));
/** `#autoplay` drives toward the nearest zombie by itself: handy for smoke tests and profiling. */
const AUTOPLAY = hashParams.has('autoplay');
/** K4: the cheat console only exists in dev builds or when the page is opened with #debug. */
const DEBUG_CONSOLE = import.meta.env.DEV || hashParams.has('debug');
/** `#drive` skips the menus and starts a sandbox run (used by smoke tests). */
const SKIP_MENUS = hashParams.has('drive') || AUTOPLAY;
/** `#map=<id>` overrides the map for this page load. */
const MAP_OVERRIDE = hashParams.get('map');
/** Set across a map-switch reload so boot() can land back on the story flow (F2/J3/J5). */
const STORY_SLOT = hashParams.get('story');
/** After a wreck the car is towed back with this much HP; the rest costs coins to repair. */
const TOW_HP_FRACTION = 0.25;
const LAST_MODE_KEY = 'zombiepurge.lastMode';

async function boot(): Promise<void> {
  const loading = new LoadingScreen();
  loading.show('Warming up the engine…');
  await LoadingScreen.frame();

  const cfg = getConfig();
  // H1: the zombie pool's capacity is the game's own performance budget, not a magic number.
  const ZOMBIE_CAPACITY = cfg.performance.zombieBudget;
  const settings = new SettingsStore();
  const mapIds = cfg.maps.map((m) => m.id);
  const sandbox = loadSandboxOptions(mapIds);
  const map = getMapConfig(
    MAP_OVERRIDE && mapIds.includes(MAP_OVERRIDE) ? MAP_OVERRIDE : sandbox.mapId
  );
  sandbox.mapId = map.id;
  // Upgrades rewrite cfg.vehicle each run; keep the stock numbers to compute from.
  const stockVehicle: VehicleConfig = JSON.parse(JSON.stringify(cfg.vehicle));
  await initPhysics();
  loading.progress(0.2, 'Building the world…');
  await LoadingScreen.frame();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new Scene();
  const lights = createLights(scene);
  let viewDistance = map.fogDistance;

  const physics = new PhysicsWorld(cfg.physics.gravity, cfg.physics.fixedTimeStep);
  // E1: the greybox arena is small enough to build whole; big maps stream chunks around the car.
  let streamer: ChunkStreamer | null = null;
  let roads: RoadStrip[] = [];
  let spawn: Vector3;
  if (map.generator === 'openfield') {
    const layout = generateOpenField(map.seed, map.size, map.chunkSize);
    streamer = new ChunkStreamer(layout, physics, map.fogDistance + map.chunkSize);
    scene.add(streamer.root);
    roads = layout.roads;
    spawn = new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
    streamer.update(spawn, true);
  } else if (map.generator === 'suburbs') {
    // E4/I6: small enough (a few hundred metres) to build whole, like the greybox arena.
    const layout = generateSuburbs(map.seed, map.size);
    buildSuburbsColliders(physics, layout);
    scene.add(buildSuburbsMeshes(layout));
    roads = layout.roads;
    spawn = suburbsSpawn(layout);
  } else if (map.generator === 'desertHighway') {
    const layout = generateDesertHighway(map.seed, map.size);
    buildDesertHighwayColliders(physics, layout);
    scene.add(buildDesertHighwayMeshes(layout));
    roads = layout.roads;
    spawn = new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
  } else if (map.generator === 'industrialCity') {
    const layout = generateIndustrialCity(map.seed, map.size);
    buildIndustrialCityColliders(physics, layout);
    scene.add(buildIndustrialCityMeshes(layout));
    roads = layout.roads;
    spawn = new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
  } else if (map.generator === 'frozenForest') {
    const layout = generateFrozenForest(map.seed, map.size);
    buildFrozenForestColliders(physics, layout);
    scene.add(buildFrozenForestMeshes(layout));
    roads = layout.roads;
    spawn = new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
  } else if (map.generator === 'quarantineLab') {
    const layout = generateQuarantineLab(map.seed, map.size);
    buildQuarantineLabColliders(physics, layout);
    scene.add(buildQuarantineLabMeshes(layout));
    roads = layout.roads;
    spawn = new Vector3(layout.spawn.x, layout.spawn.y, layout.spawn.z);
  } else {
    const layout = createGreyboxLayout(map.size);
    buildGreyboxColliders(physics, layout);
    scene.add(buildGreyboxMeshes(layout));
    spawn = greyboxSpawn(layout);
  }
  loading.progress(0.6, 'Raising the dead…');
  await LoadingScreen.frame();

  const car = new Vehicle(physics, cfg.vehicle, spawn);
  const carView = buildPlaceholderCar(cfg.vehicle);
  const turret = new TurretView(ROOF_MOUNT.localOffset);
  carView.group.add(turret.group);
  const headlights = createHeadlights(30);
  for (const l of headlights.lights) carView.group.add(l, l.target);
  scene.add(carView.group);
  lights.sun.target = carView.group;

  const pool = new ZombiePool(physics, ZOMBIE_CAPACITY, cfg.zombies);
  const zombieInstances = new ZombieInstances(ZOMBIE_CAPACITY, cfg.zombieMotion);
  scene.add(zombieInstances.bodies, zombieInstances.heads);
  const spawner = new HordeSpawner(pool, map);
  const projectiles = new ProjectileSystem(64);
  const projectileViews = new ProjectileViews(64);
  scene.add(...projectileViews.meshes);
  const tracers = new ShotTracers();
  scene.add(...tracers.lines);
  const combat = new RunOverSystem(physics, car, pool, cfg.combat, cfg.vehicle.mass);
  const wallet = new Wallet(cfg.rewards);
  const realGarage = new Garage(cfg.upgrades, wallet, 1, undefined, cfg.cosmetics);
  let garage = realGarage;
  let coins: CoinSource = wallet;
  /** F3: whichever wallet actually owns this run's coins — `wallet` in sandbox, a save
   *  slot's own wallet in story mode. Kept separate from `coins` because the infinite-money
   *  sandbox `coins` object isn't a real `Wallet` and has no `bankRun`. */
  let activeWallet: Wallet = wallet;
  const tank = new FuelTank(garage.effectiveStats(stockVehicle).fuelCapacity);
  const nitro = new Nitro(0);
  let effectiveTopSpeed = stockVehicle.topSpeed;
  let effectiveAcceleration = stockVehicle.acceleration;
  let radarRange = garage.effectiveStats(stockVehicle).radarRange;
  const mount = new WeaponMount(car, ROOF_MOUNT);
  const frontMount = new WeaponMount(car, FRONT_MOUNT);
  frontMount.aimMode = 'camera';
  let gun: MachineGun | null = null;
  let shotgun: Shotgun | null = null;
  let rockets: RocketLauncher | null = null;
  let flamethrower: Flamethrower | null = null;
  const rocketViews = new RocketViews();
  scene.add(...rocketViews.rockets, ...rocketViews.blasts);
  let flameView: FlameView | null = null;
  let stats = new RunStats(cfg.rewards);
  const pickupSpots: PickupState[] = (map.pickups ?? []).map((p) => ({ ...p, taken: false }));
  const pickupViews = new PickupViews(pickupSpots);
  scene.add(pickupViews.group);

  // ---------- story mode (F2/F3/J3/J5/J9) ----------
  const storyMaps = cfg.maps
    .filter((m): m is MapConfig & { storyIndex: number } => m.storyIndex !== undefined)
    .sort((a, b) => a.storyIndex - b.storyIndex);
  const storyMapIds = storyMaps.map((m) => m.id);
  let inStoryMode = false;
  let activeSlotId: string | null = null;
  let storyWallet: Wallet | null = null;
  let storyGarage: Garage | null = null;
  let storyProgress: StoryProgressData | null = null;
  let currentStoryMapId: string | null = null;
  let objectiveTracker: ObjectiveTracker | null = null;

  const input = new InputManager();
  input.attach();
  canvas.addEventListener('click', () => {
    if (loop.getState() === GameState.Playing) canvas.requestPointerLock?.();
  });

  const camera = new PerspectiveCamera(
    cfg.camera.baseFov,
    window.innerWidth / window.innerHeight,
    0.1,
    map.fogDistance * 1.5
  );
  const chase = new ChaseCamera(camera, cfg.camera, {
    speedForMaxEffect: cfg.vehicle.topSpeed,
    probe: (from, to) => {
      const dir = to.clone().sub(from);
      const length = dir.length();
      if (length < 1e-3) return null;
      dir.divideScalar(length);
      const hit = physics.world.castRay(
        new RAPIER.Ray(from, dir),
        length,
        true,
        undefined,
        undefined,
        undefined,
        car.body
      );
      return hit ? hit.timeOfImpact / length : null;
    },
  });

  const hud = new Hud(cfg.hud);
  const popups = new CoinPopups();
  const minimap = new Minimap();
  const rings = new DetectionRings(ZOMBIE_CAPACITY);
  scene.add(rings.zombieRings, rings.viewRing);
  showBuildTag();

  // ---------- hit feedback (G2) ----------
  const screenShake = new ScreenShake(cfg.vfx.screenShake);
  const slowMo = new SlowMo(cfg.vfx.slowMo);
  const blood = new BloodSplatterView(cfg.vfx.blood, cfg.vehicle);
  carView.group.add(blood.group);
  const carDamage = new CarDamageView(carView.body, cfg.carDamage, cfg.vehicle);
  carView.group.add(carDamage.group);
  const muzzleFlash = new MuzzleFlashView(cfg.vfx.muzzleFlash);
  scene.add(muzzleFlash.mesh);
  const skidMarks = new SkidMarkView(cfg.vfx.skidMarks);
  scene.add(skidMarks.group);
  const driveTrail = new DriveTrailView(cfg.vfx.driveTrail);
  scene.add(driveTrail.group);

  // ---------- audio (G3) ----------
  const audio = new AudioSystem(cfg.audio, settings);
  window.addEventListener('pointerdown', () => audio.resume(), { once: true });
  audio.playMapMusic(map.music ?? { baseHz: 90, mood: 'calm' });

  const loop = new GameLoop({ fixedTimeStep: cfg.physics.fixedTimeStep });
  const target = { position: new Vector3(), quaternion: new Quaternion(), forwardSpeed: 0 };
  const senses = { carPosition: new Vector3(), carSpeed: 0, noise: 0 };
  const view = { carPosition: senses.carPosition, viewForward: new Vector3(0, 0, 1) };
  const camForward = new Vector3();
  const baseOrbitSensitivity = cfg.camera.orbitSensitivity;
  let invertY = false;
  let showFps = true;
  let noFail = false;
  let nightMode = false;

  // ---------- settings (J10) ----------
  function applySettings(s: GameSettings): void {
    const quality = s.graphicsQuality;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1)
    );
    renderer.shadowMap.enabled = quality !== 'low';
    lights.sun.castShadow = quality !== 'low';
    viewDistance = map.fogDistance * s.drawDistanceScale;
    camera.far = viewDistance * 1.5;
    camera.updateProjectionMatrix();
    applyLighting(scene, lights, presetFor(map.id, nightMode), viewDistance);
    cfg.camera.orbitSensitivity = baseOrbitSensitivity * s.cameraSensitivity;
    invertY = s.invertCameraY;
    showFps = s.showFps;
  }
  applySettings(settings.get());
  settings.onChange(applySettings);

  // ---------- menus (J1/J2/J6/J7/J8/J10/J11) ----------
  const menus = new MenuStack();
  menus.attach();
  // G3: a click/hover blip on every button, wherever it lives (menus, garage, settings).
  let lastHoveredButton: Element | null = null;
  document.body.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) audio.menuClick();
  });
  document.body.addEventListener('mouseover', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn && btn !== lastHoveredButton) audio.menuHover();
    lastHoveredButton = btn;
  });
  const garageMenu = new GarageMenu(garage, stockVehicle, coins, {
    onChange: applyGarage,
    onClose: () => startRun(),
    repair: (doIt) => {
      const maxHp = garage.effectiveStats(stockVehicle).maxHp;
      if (!doIt)
        return { price: repairPrice(car, maxHp), ok: coins.balance >= repairPrice(car, maxHp) };
      const r = repairInGarage(car, maxHp, coins);
      return { price: r.price, ok: r.ok };
    },
  });
  const garageScreen: MenuScreen = {
    id: 'garage',
    el: garageMenu.el,
    onEnter: () => {
      loop.setState(GameState.Garage);
      pool.despawnAll();
      resetCar();
      tank.fill();
      applyGarage();
      garageMenu.open();
    },
    onLeave: () => garageMenu.close(),
  };
  const mainMenu = createMainMenu({
    canContinue: () => localStorage.getItem(LAST_MODE_KEY) === 'sandbox',
    onContinue: () => beginSandbox(sandbox),
    onStory: () => menus.push(saveSlotsScreen),
    onSandbox: () => menus.push(sandboxScreen),
    onGarage: () => menus.push(garageScreen),
    onSettings: () => menus.push(settingsScreen),
    onControls: () => menus.push(controlsScreen),
    onCredits: () => menus.push(credits),
    onQuit: () => menus.reset(mainMenu),
  });
  const sandboxScreen = createSandboxSetup({
    maps: cfg.maps,
    isUnlocked: () => true, // sandbox is always free play, independent of story progress
    options: sandbox,
    onChange: (o) => {
      Object.assign(sandbox, o);
      saveSandboxOptions(sandbox);
    },
    onStart: (o) => beginSandbox(o),
    onBack: () => menus.pop(),
  });
  const settingsScreen = createSettingsMenu({
    store: settings,
    getBindings: () => input.getBindings(),
    setBindings: (b) => input.setBindings(b),
    onBack: () => menus.pop(),
  });
  const controlsScreen = createControlsScreen(() => menus.pop());
  const pauseScreen = createPauseMenu({
    onResume: resumeRun,
    onRestart: () => {
      menus.reset(null);
      startRun();
    },
    onSettings: () => menus.push(settingsScreen),
    onControls: () => menus.push(controlsScreen),
    onGarage: () => menus.reset(garageScreen),
    onMainMenu: () => enterMainMenu(),
  });
  const results = createResultsScreen({
    onRetry: () => {
      menus.reset(null);
      startRun();
    },
    onGarage: () => menus.reset(garageScreen),
    onMainMenu: () => enterMainMenu(),
  });
  const saveSlotsScreen = createSaveSlotsScreen({
    getSlots: () => listSaveSlots().map(slotSummary),
    onNewGame: () => {
      const meta = createSaveSlot('New Game');
      enterStorySlot(meta.id);
      menus.push(storyMapSelectScreen);
    },
    onSelect: (id) => {
      enterStorySlot(id);
      menus.push(storyMapSelectScreen);
    },
    onDelete: (id) => deleteSaveSlot(id),
    onBack: () => menus.pop(),
  });
  const storyMapSelectScreen = createStoryMapSelect({
    getEntries: () => storyEntries(),
    onPlay: (mapId) => beginStoryRun(mapId),
    onBack: () => menus.pop(),
  });
  const mapComplete = createMapCompleteScreen({
    onContinue: () => {
      pool.despawnAll();
      resetCar();
      menus.reset(storyMapSelectScreen);
    },
  });
  const credits = createCreditsScreen(() => menus.pop());

  // ---------- story mode (F2/F3/J3/J5/J9) ----------
  /** Reads a save slot's wallet/story progress without disturbing the live game state. */
  function slotSummary(meta: { id: string; name: string }): SaveSlotSummary {
    const storage = slotStorage(meta.id);
    const peekWallet = new Wallet(cfg.rewards, storage);
    const progress = loadStoryProgress(meta.id, initialStoryProgress(storyMapIds), storage);
    const furthestId = progress.unlocked[progress.unlocked.length - 1];
    const furthestMap = storyMaps.find((m) => m.id === furthestId);
    return {
      id: meta.id,
      name: meta.name,
      mapName: furthestMap?.name ?? 'Unknown map',
      coins: peekWallet.balance,
      playTimeSeconds: loadPlayTime(meta.id, storage),
    };
  }

  function storyEntries(): StoryMapEntry[] {
    if (!storyProgress) return [];
    return storyMaps.map((m) => ({
      map: m,
      unlocked: storyProgress!.unlocked.includes(m.id),
      completed: storyProgress!.completed.includes(m.id),
    }));
  }

  /** Loads (or starts) one save slot's wallet, garage and story progress as the active save. */
  function enterStorySlot(id: string): void {
    activeSlotId = id;
    setActiveSaveSlotId(id);
    touchSaveSlot(id);
    const storage = slotStorage(id);
    storyWallet = new Wallet(cfg.rewards, storage);
    storyProgress = loadStoryProgress(id, initialStoryProgress(storyMapIds), storage);
    const furthestId = storyProgress.unlocked[storyProgress.unlocked.length - 1];
    const currentMap = storyMaps.find((m) => m.id === furthestId)?.storyIndex ?? 1;
    storyGarage = new Garage(cfg.upgrades, storyWallet, currentMap, storage, cfg.cosmetics);
  }

  /** J5: play one story map — switches maps (via reload) when it isn't the one already loaded. */
  function beginStoryRun(mapId: string): void {
    inStoryMode = true;
    currentStoryMapId = mapId;
    if (mapId !== map.id) {
      location.hash = `#map=${mapId}&story=${activeSlotId}`;
      location.reload();
      return;
    }
    garage = storyGarage!;
    coins = storyWallet!;
    activeWallet = storyWallet!;
    noFail = false;
    spawner.density = map.spawnDensity ?? 1;
    nightMode = map.night ?? false;
    applySettings(settings.get());
    headlights.setOn(nightMode);
    garageMenu.setGarage(garage, coins);
    menus.reset(garageScreen);
  }

  /** F2: every objective for the current map is done — bank the run, unlock the next map. */
  function completeStoryMap(): void {
    if (!inStoryMode || !currentStoryMapId || !storyProgress || !activeSlotId) return;
    const summary = stats.summary();
    activeWallet.add(summary.coinsTotal);
    addPlayTime(activeSlotId, summary.durationSeconds);
    const before = storyProgress;
    storyProgress = completeMap(storyProgress, currentStoryMapId, storyMapIds);
    saveStoryProgress(activeSlotId, storyProgress);
    const nextMapId = storyProgress.unlocked.find((id) => !before.unlocked.includes(id)) ?? null;
    const nextMap = nextMapId ? (storyMaps.find((m) => m.id === nextMapId) ?? null) : null;
    const completedMap = storyMaps.find((m) => m.id === currentStoryMapId)!;
    const newlyUnlocked = nextMap
      ? cfg.upgrades.flatMap((u) =>
          u.tiers.filter((t) => t.unlockMap === nextMap.storyIndex).map((t) => t.label ?? u.name)
        )
      : [];
    document.exitPointerLock?.();
    loop.setState(GameState.MapComplete);
    hud.setVisible(false);
    minimap.setVisible(false);
    mapComplete.show({ completedMap, nextMap, newlyUnlocked, summary });
    menus.reset(mapComplete.screen);
  }

  // ---------- run lifecycle ----------
  /** Draws litres from the tank for the flamethrower; returns what was actually drawn. */
  function drain(litres: number): number {
    const before = tank.level;
    tank.update(litres / 0.6, 1, 1); // 0.6 L/s at full burn, so this many "seconds" of it
    return before - tank.level;
  }

  /** D2/D3-D7: push the garage's effective stats into the live systems. */
  function applyGarage(): void {
    const s = garage.applyTo(stockVehicle, cfg.vehicle);
    carDamage.setPaintColor(garage.selectedCosmetic('paint')?.color ?? 0xc8402e);
    carView.setBumperStyle(garage.selectedCosmetic('bumper')?.id ?? 'bumper_stock');
    carView.setDriverColor(garage.selectedCosmetic('driver')?.color ?? 0x555a60);
    const glass = garage.selectedCosmetic('window');
    carView.setWindowTint(
      glass?.id ?? 'window_stock',
      glass?.color ?? 0x2b2b30,
      glass?.opacity ?? 0.55
    );
    carView.setDoorStyle(garage.selectedCosmetic('door')?.id ?? 'door_stock');
    carView.setDecalStyle(garage.selectedCosmetic('decal')?.id ?? 'decal_none');
    carView.setTireStyle(garage.selectedCosmetic('tire')?.id ?? 'tire_stock');
    cfg.vehicle.tires.grip *= map.groundGrip ?? 1; // E7: snow/ice maps corner looser
    effectiveTopSpeed = s.topSpeed;
    effectiveAcceleration = s.acceleration;
    radarRange = s.radarRange;
    car.hp = Math.min(car.hp, s.maxHp);
    tank.setCapacity(s.fuelCapacity);
    nitro.setCapacity(s.nitroSeconds);
    headlights.setRange(30 + s.headlightRange);
    combat.damageMultiplier = s.ramDamageMultiplier;
    combat.selfDamageMultiplier = s.selfDamageMultiplier;
    const roof = garage.equippedIn('roof')?.id;
    const tierOf = <T>(id: string, tiers: T[]) =>
      tiers[Math.min(garage.ownedTier(id), tiers.length) - 1];
    gun =
      roof === 'machinegun'
        ? (gun ?? new MachineGun(physics, car, pool, tierOf(roof, cfg.combat.machineGun)))
        : null;
    if (gun) gun.stats = tierOf('machinegun', cfg.combat.machineGun);
    shotgun =
      roof === 'shotgun'
        ? (shotgun ?? new Shotgun(physics, car, pool, tierOf(roof, cfg.combat.shotgun)))
        : null;
    if (shotgun) shotgun.stats = tierOf('shotgun', cfg.combat.shotgun);
    rockets =
      roof === 'rockets'
        ? (rockets ?? new RocketLauncher(physics, car, pool, tierOf(roof, cfg.combat.rockets)))
        : null;
    if (rockets) rockets.stats = tierOf('rockets', cfg.combat.rockets);
    turret.visible = roof !== undefined;

    const front = garage.equippedIn('front')?.id;
    if (front === 'flamethrower') {
      const tier = tierOf(front, cfg.combat.flamethrower);
      flamethrower = flamethrower ?? new Flamethrower(pool, tier, drain);
      flamethrower.stats = tier;
      if (flameView) scene.remove(flameView.mesh);
      flameView = new FlameView(tier.range, tier.cone);
      scene.add(flameView.mesh);
    } else {
      flamethrower = null;
      if (flameView) scene.remove(flameView.mesh);
      flameView = null;
    }
    if (front === 'spikes') {
      const tier = tierOf(front, cfg.combat.spikes);
      combat.meleeDamage = tier.damage;
      combat.meleeKnockback = tier.knockback;
    } else {
      combat.meleeDamage = 0;
      combat.meleeKnockback = 0;
    }
    syncMeleeWeapon(carView.group, front, garage.ownedTier('spikes'), cfg.vehicle);
    syncUpgradeParts(carView.group, garage, cfg.vehicle);
  }

  function resetCar(): void {
    car.body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
    car.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    car.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    car.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    car.invulnerable = noFail;
  }

  /** F1: apply the sandbox options, switching maps (via reload) when needed. */
  function beginSandbox(options: SandboxOptions): void {
    inStoryMode = false;
    objectiveTracker = null;
    Object.assign(sandbox, options);
    saveSandboxOptions(sandbox);
    localStorage.setItem(LAST_MODE_KEY, 'sandbox');
    if (sandbox.mapId !== map.id) {
      location.hash = `#map=${sandbox.mapId}`;
      location.reload();
      return;
    }
    spawner.density = sandbox.zombieDensity;
    nightMode = sandbox.night;
    noFail = sandbox.noFail;
    applySettings(settings.get());
    headlights.setOn(nightMode);
    activeWallet = wallet;
    if (sandbox.infiniteMoney) {
      // A throwaway garage with everything unlocked and bottomless coins; nothing persists.
      coins = { balance: 1e9, spend: () => true };
      garage = new Garage(cfg.upgrades, coins, 5, null, cfg.cosmetics);
    } else {
      coins = wallet;
      garage = realGarage;
    }
    garageMenu.setGarage(garage, coins);
    menus.reset(garageScreen);
  }

  function startRun(): void {
    menus.reset(null);
    hud.setVisible(true);
    minimap.setVisible(true);
    pool.despawnAll();
    resetCar();
    tank.fill();
    applyGarage();
    blood.reset();
    carDamage.reset();
    car.hp = Math.max(car.hp, garage.effectiveStats(stockVehicle).maxHp * TOW_HP_FRACTION);
    stats = new RunStats(cfg.rewards);
    resetPickups(pickupSpots);
    objectiveTracker =
      inStoryMode && map.objectives?.length ? new ObjectiveTracker(map.objectives) : null;
    if (gun) gun.heat = 0;
    nitro.refill();
    rocketViews.syncRockets([]);
    car.getPosition(senses.carPosition);
    streamer?.update(senses.carPosition, true);
    spawner.prefill(view);
    // F4: story maps 3+ get their own boss, spawned once and never respawned by the horde
    // spawner (bosses are deliberately left out of every map's zombieRanks list).
    if (inStoryMode && map.boss) {
      pool.spawn(
        'boss',
        { x: map.boss.position.x, y: 0, z: map.boss.position.z },
        {
          hp: map.boss.hp,
          speed: map.boss.speed,
          attackDamage: map.boss.attackDamage,
          rangedAttack: map.boss.rangedAttack,
          slam: map.boss.slam,
        }
      );
    }
    car.getPosition(target.position);
    car.getQuaternion(target.quaternion);
    chase.snap(target);
    stats.resetPosition();
    loop.setState(GameState.Playing);
  }

  function pauseRun(): void {
    if (loop.getState() !== GameState.Playing) return;
    loop.setState(GameState.Paused);
    document.exitPointerLock?.();
    menus.push(pauseScreen);
  }

  function resumeRun(): void {
    menus.reset(null);
    loop.setState(GameState.Playing);
  }

  function endRun(title: string): void {
    const summary = stats.summary();
    // Sandbox's "infinite money" free-roam banks nothing; story mode always banks for real,
    // regardless of whatever the (unrelated) sandbox infinite-money flag last happened to be.
    const noBank = !inStoryMode && sandbox.infiniteMoney;
    const kept = noBank ? 0 : activeWallet.bankRun(summary.coinsTotal, true);
    if (inStoryMode && activeSlotId) addPlayTime(activeSlotId, summary.durationSeconds);
    document.exitPointerLock?.();
    // Towed home: some HP comes back for free, the rest is a repair bill.
    car.hp = Math.max(car.hp, garage.effectiveStats(stockVehicle).maxHp * TOW_HP_FRACTION);
    loop.setState(GameState.GameOver);
    hud.setVisible(false);
    minimap.setVisible(false);
    results.show({ title, summary, coinsKept: kept });
    menus.reset(results.screen);
  }

  function enterMainMenu(): void {
    inStoryMode = false;
    document.exitPointerLock?.();
    loop.setState(GameState.MainMenu);
    hud.setVisible(false);
    minimap.setVisible(false);
    pool.despawnAll();
    resetCar();
    menus.reset(mainMenu);
  }

  // ---------- debug tools (K3/K4/E2) ----------
  if (DEBUG_CONSOLE) {
    const ahead = new Vector3();
    new CheatConsole({
      spawnZombie(rank, count) {
        car.getForward(ahead).multiplyScalar(25).add(car.getPosition());
        let n = 0;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * 8;
          if (
            pool.spawn(rank, { x: ahead.x + Math.sin(a) * r, y: 0, z: ahead.z + Math.cos(a) * r })
          )
            n++;
        }
        return n;
      },
      addCoins(amount) {
        wallet.add(amount);
        garageMenu.render();
        return wallet.balance;
      },
      setGodMode(on) {
        car.invulnerable = on;
      },
      teleport(x, z) {
        car.body.setTranslation({ x, y: 2, z }, true);
        car.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        car.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        stats.resetPosition();
      },
      heal() {
        car.hp = garage.effectiveStats(stockVehicle).maxHp;
        tank.fill();
      },
      killAll() {
        let n = 0;
        for (const z of pool.active()) if (z.isAlive() && z.takeDamage(Infinity)) n++;
        return n;
      },
      unlockAllUpgrades() {
        garage.unlockAll();
        applyGarage();
        garageMenu.render();
        return 'every upgrade owned and the machine gun mounted';
      },
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') {
      e.preventDefault();
      rings.enabled = !rings.enabled;
    }
  });
  new TuningPanel([
    bind('vehicle.topSpeed', cfg.vehicle, 'topSpeed', 10, 90, 1),
    bind('vehicle.acceleration', cfg.vehicle, 'acceleration', 2, 25, 0.5),
    bind('vehicle.brakingDeceleration', cfg.vehicle, 'brakingDeceleration', 4, 30, 0.5),
    bind('vehicle.tires.grip', cfg.vehicle.tires, 'grip', 0.2, 2.5, 0.05),
    bind('vehicle.steering.maxAngle', cfg.vehicle.steering, 'maxAngle', 0.2, 0.9, 0.01),
    bind('vehicle.suspension.stiffness', cfg.vehicle.suspension, 'stiffness', 8000, 60000, 500),
    bind('vehicle.suspension.damping', cfg.vehicle.suspension, 'damping', 500, 8000, 100),
    bind('vehicle.friction.airResistance', cfg.vehicle.friction, 'airResistance', 0, 1.5, 0.01),
    bind('zombies.walker.speed', cfg.zombies.walker, 'speed', 0.5, 8, 0.1),
    bind('zombies.runner.speed', cfg.zombies.runner, 'speed', 1, 14, 0.1),
    bind('zombies.walker.detectionRadius', cfg.zombies.walker, 'detectionRadius', 10, 150, 5),
    bind('zombies.runner.detectionRadius', cfg.zombies.runner, 'detectionRadius', 10, 150, 5),
    bind('combat.runOverDamageFactor', cfg.combat, 'runOverDamageFactor', 0.001, 0.05, 0.001),
    bind('combat.runOverMinSpeed', cfg.combat, 'runOverMinSpeed', 0, 10, 0.5),
    bind('rewards.metersPerDistanceCoin', cfg.rewards, 'metersPerDistanceCoin', 50, 1000, 10),
    bind('spawner.density', spawner, 'density', 0, 1, 0.05),
  ]);

  // ---------- fixed-step game states ----------
  loop.registerStateHandler(GameState.Playing, ({ deltaTime }) => {
    input.update();
    if (input.justPressed('pause')) {
      pauseRun();
      return;
    }

    car.getPosition(senses.carPosition);
    senses.carSpeed = Math.abs(car.getForwardSpeed());
    streamer?.update(senses.carPosition);
    camera.getWorldDirection(camForward);
    view.viewForward.set(camForward.x, 0, camForward.z).normalize();
    spawner.update(deltaTime, view);

    // E9: gas/repair/coins/ammo pickups along the way.
    for (const p of collectPickups(pickupSpots, senses.carPosition.x, senses.carPosition.z)) {
      if (p.kind === 'gas') tank.refill(30);
      else if (p.kind === 'repair') {
        car.hp = Math.min(car.hp + 40, garage.effectiveStats(stockVehicle).maxHp);
      } else if (p.kind === 'coins') {
        // Sandbox's infinite-money free roam doesn't need (or want) real coins trickling in.
        if (inStoryMode || !sandbox.infiniteMoney) activeWallet.add(20);
        popups.add(20, { x: p.x, y: 1.5, z: p.z });
      } else if (p.kind === 'ammo') {
        if (gun) gun.heat = 0;
        if (shotgun) {
          shotgun.rounds = shotgun.stats.magazine;
          shotgun.reloadLeft = 0;
        }
        if (rockets) {
          rockets.rounds = rockets.stats.magazine;
          rockets.reloadLeft = 0;
        }
      }
    }
    objectiveTracker?.updatePosition(senses.carPosition.x, senses.carPosition.z);

    const driverInput = AUTOPLAY ? autoplayInput(car, pool) : readVehicleInput(input);
    let firing = false;
    let killsThisTick = 0;
    const rewardKill = (zombie: Zombie, position: { x: number; y: number; z: number }) => {
      const kill = stats.recordKill(zombie.rank, position);
      popups.add(kill.coins, kill.position, kill.multiplier);
      objectiveTracker?.recordKill(zombie.rank);
      killsThisTick++;
      screenShake.addKill();
    };
    const roofWeapon = gun ?? shotgun ?? rockets;
    if (roofWeapon) {
      const cone = gun ? gun.stats.autoAimCone : Math.PI / 5;
      const range = gun ? gun.stats.range : shotgun ? shotgun.stats.range : 120;
      mount.update(pool, camForward, cone, range);
      // O1: roof guns autoshoot the moment the mount's auto-aim locks a target - no fire button needed.
      const trigger = mount.target !== null;
      if (gun) {
        for (const shot of gun.update(deltaTime, trigger, mount)) {
          firing = true;
          tracers.add(shot.origin, shot.end);
          muzzleFlash.trigger(shot.origin);
          audio.weaponFire('machinegun');
          if (shot.killed && shot.hit) rewardKill(shot.hit, shot.hit.getPosition());
        }
      } else if (shotgun) {
        for (const shot of shotgun.update(deltaTime, trigger, mount)) {
          firing = true;
          tracers.add(shot.origin, shot.end);
          muzzleFlash.trigger(shot.origin);
          audio.weaponFire('shotgun');
          if (shot.killed && shot.hit) rewardKill(shot.hit, shot.hit.getPosition());
        }
      } else if (rockets) {
        for (const blast of rockets.update(deltaTime, trigger, mount)) {
          firing = true;
          rocketViews.explode(blast.position, blast.radius);
          muzzleFlash.trigger(mount.origin);
          audio.weaponFire('rockets');
          for (const k of blast.kills) rewardKill(k.zombie, k.position);
        }
      }
      turret.aim(mount.yawRelativeToCar());
    }
    if (flamethrower) {
      frontMount.update(pool, camForward, 0, flamethrower.stats.range);
      const trigger = AUTOPLAY ? mount.target !== null : input.isDown('fire');
      for (const k of flamethrower.update(deltaTime, trigger, frontMount))
        rewardKill(k.zombie, k.position);
      firing ||= flamethrower.firing;
      audio.setFlame(flamethrower.firing);
    }
    for (const k of updateBurning(pool, deltaTime)) rewardKill(k.zombie, k.position);
    senses.noise = firing ? 0.5 : 0;

    let attackDamage = 0;
    for (const z of pool.active()) {
      const result = updateZombieAI(z, deltaTime, senses);
      attackDamage += result.damage;
      if (result.shot) projectiles.fire(result.shot);
      if (z.cfg.slam) attackDamage += updateBossSlam(z, deltaTime, senses.carPosition);
    }
    for (const hit of projectiles.update(
      deltaTime,
      senses.carPosition,
      cfg.vehicle.chassisHalfExtents.z
    )) {
      attackDamage += hit.damage;
    }
    if (attackDamage > 0) {
      car.applyDamage(attackDamage);
      screenShake.addDamage(attackDamage);
      audio.impact(attackDamage / 30);
    }

    // D13: nitro temporarily lifts the numbers the car physics reads each step.
    nitro.update(deltaTime, AUTOPLAY ? driverInput.throttle === 1 : input.isDown('nitro'));
    cfg.vehicle.topSpeed = effectiveTopSpeed + nitro.topSpeedBonus;
    cfg.vehicle.acceleration = effectiveAcceleration * nitro.accelerationMultiplier;
    car.update(driverInput, deltaTime);
    tank.update(
      deltaTime,
      driverInput.throttle * (nitro.boosting ? 1.5 : 1),
      senses.carSpeed / cfg.vehicle.topSpeed
    );
    if (noFail) tank.fill();

    // G3: engine pitch, tire skid and zombie groans, all driven by this tick's own state.
    audio.setEngine(senses.carSpeed / cfg.vehicle.topSpeed, nitro.boosting);
    audio.setSkid(skidActive(senses.carSpeed, input.isDown('handbrake'), cfg.audio.skidMinSpeed));
    audio.updateZombieGroans(groanCandidates(), senses.carPosition.x, senses.carPosition.z);

    combat.beforeStep();
    physics.step();
    for (const impact of combat.collectImpacts()) {
      if (impact.damageToCar > 0) {
        screenShake.addDamage(impact.damageToCar);
        audio.impact(impact.damageToCar / 30);
      }
      if (impact.killed) {
        rewardKill(impact.zombie, impact.position);
        blood.addKill(settings.get().lowGore);
      }
    }
    stats.trackPosition(senses.carPosition, deltaTime);
    slowMo.trigger(killsThisTick);

    if (objectiveTracker?.isComplete()) completeStoryMap();
    else if (car.isDestroyed()) endRun('WRECKED');
    else if (tank.isEmpty() && senses.carSpeed < 0.5) endRun('OUT OF GAS');
  });

  const menuState = () => {
    input.update();
    menus.pollGamepad();
    physics.step(); // let the car settle on its suspension behind the menus
    audio.stopEngine();
  };
  loop.registerStateHandler(GameState.Paused, () => {
    input.update();
    menus.pollGamepad();
    audio.stopEngine();
  });
  loop.registerStateHandler(GameState.GameOver, menuState);
  loop.registerStateHandler(GameState.Garage, menuState);
  loop.registerStateHandler(GameState.MainMenu, menuState);
  loop.registerStateHandler(GameState.MapComplete, menuState);

  // ---------- render ----------
  const projected = new Vector3();
  const rearTrailOrigin = new Vector3();
  const project = (p: { x: number; y: number; z: number }) => {
    projected.set(p.x, p.y + 1.5, p.z).project(camera);
    if (projected.z > 1) return null;
    return {
      x: ((projected.x + 1) / 2) * window.innerWidth,
      y: ((1 - projected.y) / 2) * window.innerHeight,
    };
  };

  let fpsAccum = 0;
  let fpsFrames = 0;
  let fps = 0;
  loop.onRender(({ deltaTime, elapsedTime }) => {
    car.getPosition(target.position);
    car.getQuaternion(target.quaternion);
    target.forwardSpeed = car.getForwardSpeed();
    carView.sync(car);
    carDamage.setHpFraction(car.hp / garage.effectiveStats(stockVehicle).maxHp);
    zombieInstances.sync(pool.zombies, camera.position);
    projectileViews.sync(projectiles.projectiles);
    tracers.update(deltaTime);
    rocketViews.syncRockets(rockets ? rockets.rockets : []);
    rocketViews.update(deltaTime);
    flameView?.sync(flamethrower?.firing ?? false, frontMount.origin, frontMount.direction);
    pickupViews.sync(pickupSpots, elapsedTime);
    muzzleFlash.update(deltaTime);
    const rearWheels = car.wheels.filter((w) => !w.isFront).map((w) => w.worldPosition);
    skidMarks.update(
      deltaTime,
      skidActive(senses.carSpeed, input.isDown('handbrake'), cfg.audio.skidMinSpeed),
      rearWheels
    );
    rearTrailOrigin.set(0, 0, 0);
    for (const w of rearWheels) rearTrailOrigin.add(w);
    if (rearWheels.length > 0) rearTrailOrigin.divideScalar(rearWheels.length);
    driveTrail.update(deltaTime, senses.carSpeed, rearTrailOrigin, driveTrailColor(map.generator));

    const state = loop.getState();
    if (state === GameState.Garage || state === GameState.MainMenu) {
      // Slow turntable around the car behind the garage and the title screen.
      const t = elapsedTime * 0.35;
      camera.position.set(
        target.position.x + Math.sin(t) * 7,
        target.position.y + 2.2,
        target.position.z + Math.cos(t) * 7
      );
      camera.lookAt(target.position.x, target.position.y + 0.6, target.position.z);
    } else {
      const mouse = input.consumeMouseDelta();
      if (document.pointerLockElement === canvas)
        chase.orbit(mouse.x, invertY ? -mouse.y : mouse.y);
      chase.update(deltaTime, target);
      // G2: camera jitter from recent damage/kills, on top of the normal chase framing.
      const shakeMagnitude = screenShake.update(deltaTime);
      if (shakeMagnitude > 0) {
        camera.position.x += (Math.random() * 2 - 1) * shakeMagnitude;
        camera.position.y += (Math.random() * 2 - 1) * shakeMagnitude * 0.6;
        camera.position.z += (Math.random() * 2 - 1) * shakeMagnitude;
      }
    }
    // G2: slow-mo on a multi-kill - fewer fixed-step ticks land per real second while it's active.
    loop.setTimeScale(slowMo.update(deltaTime));
    rings.sync(
      pool.zombies,
      target.position,
      viewDistance,
      Math.abs(target.forwardSpeed) > DEFAULT_ZOMBIE_AI.loudSpeed
        ? DEFAULT_ZOMBIE_AI.loudMultiplier
        : 1
    );
    renderer.render(scene, camera);
    popups.update(deltaTime, project);
    if (state === GameState.Playing || state === GameState.Paused) {
      minimap.draw(
        computeMinimapFrame({
          carX: target.position.x,
          carZ: target.position.z,
          heading: car.getYaw(),
          radarRange,
          viewRange: Math.max(120, radarRange * 1.1),
          mapSize: map.size,
          roads,
          pickups: pickupSpots,
          objective: objectiveTracker?.exitTarget() ?? null,
          zombies: zombieBlips(),
        })
      );
    }

    fpsAccum += deltaTime;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      fps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }
    hud.update({
      kmh: Math.round(Math.abs(target.forwardSpeed) * 3.6),
      fps: showFps ? fps : -1,
      hp: car.hp,
      maxHp: cfg.vehicle.hp,
      coins: stats.coinsTotal,
      kills: stats.totalKills,
      distanceMeters: stats.distanceMeters,
      alive: pool.aliveCount,
      paused: state === GameState.Paused,
      comboMultiplier: stats.comboMultiplier,
      comboChain: stats.comboChain,
      fuelFraction: tank.fraction,
      fuelLitres: tank.level,
      fuelCapacityLitres: tank.capacity,
      weaponKind: gun
        ? 'machinegun'
        : shotgun
          ? 'shotgun'
          : rockets
            ? 'rockets'
            : flamethrower
              ? 'flamethrower'
              : null,
      heat: gun ? gun.heat : null,
      overheated: gun?.overheated ?? false,
      nitroFraction: nitro.available ? nitro.fraction : null,
      nitroBoosting: nitro.boosting,
      magazine: magazineText(),
      flameOn: flamethrower?.firing ?? false,
      objectives:
        objectiveTracker?.statuses().map((s) => ({
          label: s.objective.label,
          current: s.current,
          target: s.target,
          done: s.done,
        })) ?? null,
    });
  });

  function* zombieBlips() {
    for (const z of pool.active()) {
      const p = z.getPosition();
      yield { x: p.x, z: p.z, alive: z.isAlive(), state: z.state };
    }
  }

  /** G3 groan gather (H1: no whole-pool array here - AudioSystem filters by distance itself). */
  function* groanCandidates() {
    for (const z of pool.active()) {
      const p = z.getPosition();
      yield { x: p.x, z: p.z, alive: z.isAlive() };
    }
  }

  function magazineText(): string | null {
    const w = shotgun ?? rockets;
    if (!w) return null;
    const st = w.state;
    return st.reloading ? `reloading ${st.reloadLeft.toFixed(1)}s` : `${st.rounds}/${st.magazine}`;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  applyGarage();
  car.hp = garage.effectiveStats(stockVehicle).maxHp;
  loading.progress(1, 'Ready');
  await LoadingScreen.frame();
  loading.hide();
  loop.start();
  if (SKIP_MENUS) {
    beginSandbox(sandbox);
    startRun();
  } else if (STORY_SLOT) {
    // Landed back here after beginStoryRun()'s map-switch reload.
    enterMainMenu();
    enterStorySlot(STORY_SLOT);
    menus.push(storyMapSelectScreen);
    beginStoryRun(MAP_OVERRIDE ?? map.id);
  } else {
    enterMainMenu();
  }
}

const toTarget = new Vector3();
const carForward = new Vector3();
const carRight = new Vector3();
const carPos = new Vector3();

/** Steer at the nearest live zombie, easing off the throttle for tight turns. */
function autoplayInput(car: Vehicle, pool: ZombiePool): VehicleInput {
  car.getPosition(carPos);
  let best: Zombie | null = null;
  let bestDist = Infinity;
  for (const z of pool.active()) {
    if (!z.isAlive()) continue;
    const d = z.getPosition().distanceToSquared(carPos);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  if (!best) return { ...NEUTRAL_INPUT, throttle: 0.5 };
  toTarget.copy(best.getPosition()).sub(carPos);
  toTarget.y = 0;
  car.getForward(carForward);
  carForward.y = 0;
  carForward.normalize();
  carRight.set(-carForward.z, 0, carForward.x); // facing +Z, right is -X
  const side = toTarget.dot(carRight) / Math.max(toTarget.length(), 1e-3);
  const ahead = toTarget.dot(carForward);
  const steer = Math.max(-1, Math.min(1, side * 2));
  const sharpTurn = Math.abs(side) > 0.6 || ahead < 0;
  return {
    ...NEUTRAL_INPUT,
    steer,
    throttle: sharpTurn ? 0.35 : 1,
    brake: sharpTurn && car.getForwardSpeed() > 12 ? 0.6 : 0,
  };
}

boot().catch((err) => {
  console.error('ZombiePurge failed to start', err);
  const msg = document.createElement('pre');
  msg.textContent = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
  msg.style.cssText =
    'color:#fff;background:#300;padding:16px;position:fixed;inset:0;margin:0;font:14px monospace';
  document.body.appendChild(msg);
});
