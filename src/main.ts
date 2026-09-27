import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import './style.css';
import { GameLoop } from './core/GameLoop';
import { GameState } from './core/GameState';
import { InputManager } from './core/input';
import { getConfig, getMapConfig } from './data/config';
import type { VehicleConfig } from './data/types';
import {
  buildPlaceholderCar,
  ProjectileViews,
  ShotTracers,
  syncUpgradeParts,
  TurretView,
  ZombieInstances,
} from './game/art';
import { ChaseCamera } from './game/camera';
import { MachineGun, ROOF_MOUNT, RunOverSystem, WeaponMount } from './game/combat';
import { RunStats, Wallet } from './game/economy';
import { initPhysics, PhysicsWorld, RAPIER } from './game/physics/PhysicsWorld';
import { Garage, repairInGarage, repairPrice } from './game/shop';
import {
  FuelTank,
  NEUTRAL_INPUT,
  readVehicleInput,
  Vehicle,
  type VehicleInput,
} from './game/vehicle';
import {
  buildGreyboxColliders,
  buildGreyboxMeshes,
  createGreyboxLayout,
  greyboxSpawn,
} from './game/world';
import {
  HordeSpawner,
  ProjectileSystem,
  updateZombieAI,
  ZombiePool,
  type Zombie,
} from './game/zombies';
import { showBuildTag } from './ui/BuildTag';
import { CheatConsole } from './ui/CheatConsole';
import { CoinPopups, DebugHud, showGameOver } from './ui/DebugHud';
import { GarageMenu } from './ui/GarageMenu';
import { bind, TuningPanel } from './ui/TuningPanel';

const ZOMBIE_CAPACITY = 250;
/** `#autoplay` drives toward the nearest zombie by itself: handy for smoke tests and profiling. */
const AUTOPLAY = location.hash.includes('autoplay');
/** K4: the cheat console only exists in dev builds or when the page is opened with #debug. */
const DEBUG_CONSOLE = import.meta.env.DEV || location.hash.includes('debug');
/** `#drive` skips the garage on load (used by smoke tests). */
const SKIP_GARAGE = location.hash.includes('drive') || AUTOPLAY;
/** After a wreck the car is towed back with this much HP; the rest costs coins to repair. */
const TOW_HP_FRACTION = 0.25;

async function boot(): Promise<void> {
  const cfg = getConfig();
  const map = getMapConfig('greybox');
  // Upgrades rewrite cfg.vehicle each run; keep the stock numbers to compute from.
  const stockVehicle: VehicleConfig = JSON.parse(JSON.stringify(cfg.vehicle));
  await initPhysics();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new Scene();
  scene.background = new Color(0x8fa3b8);
  scene.fog = new Fog(0x8fa3b8, map.fogDistance * 0.6, map.fogDistance);
  scene.add(new HemisphereLight(0xbfd4ff, 0x3a2f28, 0.9));
  scene.add(new AmbientLight(0xffffff, 0.15));
  const sun = new DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
  sun.shadow.camera.right = sun.shadow.camera.top = 80;
  sun.shadow.camera.far = 400;
  scene.add(sun);

  const physics = new PhysicsWorld(cfg.physics.gravity, cfg.physics.fixedTimeStep);
  const layout = createGreyboxLayout(map.size);
  buildGreyboxColliders(physics, layout);
  scene.add(buildGreyboxMeshes(layout));

  const spawn = greyboxSpawn(layout);
  const car = new Vehicle(physics, cfg.vehicle, spawn);
  const carView = buildPlaceholderCar(cfg.vehicle);
  const turret = new TurretView(ROOF_MOUNT.localOffset);
  carView.group.add(turret.group);
  scene.add(carView.group);
  sun.target = carView.group;

  const pool = new ZombiePool(physics, ZOMBIE_CAPACITY, cfg.zombies);
  const zombieInstances = new ZombieInstances(ZOMBIE_CAPACITY);
  scene.add(zombieInstances.bodies, zombieInstances.heads);
  const spawner = new HordeSpawner(pool, map);
  const projectiles = new ProjectileSystem(64);
  const projectileViews = new ProjectileViews(64);
  scene.add(...projectileViews.meshes);
  const tracers = new ShotTracers();
  scene.add(...tracers.lines);
  const combat = new RunOverSystem(physics, car, pool, cfg.combat, cfg.vehicle.mass);
  const wallet = new Wallet(cfg.rewards);
  const garage = new Garage(cfg.upgrades, wallet, 1);
  const tank = new FuelTank(garage.effectiveStats(stockVehicle).fuelCapacity);
  const mount = new WeaponMount(car, ROOF_MOUNT);
  let gun: MachineGun | null = null;
  let stats = new RunStats(cfg.rewards);

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

  const hud = new DebugHud();
  const popups = new CoinPopups();
  showBuildTag();
  const loop = new GameLoop({ fixedTimeStep: cfg.physics.fixedTimeStep });
  const target = { position: new Vector3(), quaternion: new Quaternion(), forwardSpeed: 0 };
  const senses = { carPosition: new Vector3(), carSpeed: 0, noise: 0 };
  const view = { carPosition: senses.carPosition, viewForward: new Vector3(0, 0, 1) };
  const camForward = new Vector3();
  let gameOverEl: HTMLDivElement | null = null;

  const menu = new GarageMenu(garage, stockVehicle, wallet, {
    onChange: applyGarage,
    onClose: startRun,
    repair: (doIt) => {
      const maxHp = garage.effectiveStats(stockVehicle).maxHp;
      if (!doIt)
        return { price: repairPrice(car, maxHp), ok: wallet.balance >= repairPrice(car, maxHp) };
      const r = repairInGarage(car, maxHp, wallet);
      return { price: r.price, ok: r.ok };
    },
  });

  /** D2/D3-D7: push the garage's effective stats into the live systems. */
  function applyGarage(): void {
    const s = garage.applyTo(stockVehicle, cfg.vehicle);
    car.hp = Math.min(car.hp, s.maxHp);
    tank.setCapacity(s.fuelCapacity);
    combat.damageMultiplier = s.ramDamageMultiplier;
    combat.selfDamageMultiplier = s.selfDamageMultiplier;
    const roof = garage.equippedIn('roof');
    if (roof?.id === 'machinegun') {
      const tier =
        cfg.combat.machineGun[
          Math.min(garage.ownedTier('machinegun'), cfg.combat.machineGun.length) - 1
        ];
      if (gun) gun.stats = tier;
      else gun = new MachineGun(physics, car, pool, tier);
    } else {
      gun = null;
    }
    turret.visible = gun !== null;
    syncUpgradeParts(carView.group, garage, cfg.vehicle);
  }

  function resetCar(): void {
    car.body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
    car.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    car.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    car.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  function enterGarage(): void {
    document.exitPointerLock?.();
    gameOverEl?.remove();
    gameOverEl = null;
    pool.despawnAll();
    resetCar();
    tank.fill();
    applyGarage();
    loop.setState(GameState.Garage);
    hud.setVisible(false);
    menu.open();
  }

  function startRun(): void {
    menu.close();
    hud.setVisible(true);
    applyGarage();
    stats = new RunStats(cfg.rewards);
    if (gun) gun.heat = 0;
    car.getPosition(senses.carPosition);
    spawner.prefill(view);
    car.getPosition(target.position);
    car.getQuaternion(target.quaternion);
    chase.snap(target);
    stats.resetPosition();
    loop.setState(GameState.Playing);
  }

  function endRun(title: string): void {
    const summary = stats.summary();
    const kept = wallet.bankRun(summary.coinsTotal, true);
    gameOverEl = showGameOver({ ...summary, kept }, title);
    document.exitPointerLock?.();
    // Towed home: some HP comes back for free, the rest is a repair bill.
    car.hp = Math.max(car.hp, garage.effectiveStats(stockVehicle).maxHp * TOW_HP_FRACTION);
    loop.setState(GameState.GameOver);
  }

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
        menu.render();
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
        menu.render();
        return 'every upgrade owned and the machine gun mounted';
      },
    });
  }

  // K3: every binding targets a value the systems re-read each step, so edits apply instantly.
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

  loop.registerStateHandler(GameState.Playing, ({ deltaTime }) => {
    input.update();
    if (input.justPressed('pause')) {
      loop.setState(GameState.Paused);
      document.exitPointerLock?.();
      return;
    }

    car.getPosition(senses.carPosition);
    senses.carSpeed = Math.abs(car.getForwardSpeed());
    camera.getWorldDirection(camForward);
    view.viewForward.set(camForward.x, 0, camForward.z).normalize();
    spawner.update(deltaTime, view);

    const driverInput = AUTOPLAY ? autoplayInput(car, pool) : readVehicleInput(input);
    let firing = false;
    if (gun) {
      mount.update(pool, camForward, gun.stats.autoAimCone, gun.stats.range);
      const trigger = AUTOPLAY ? mount.target !== null : input.isDown('fire');
      for (const shot of gun.update(deltaTime, trigger, mount)) {
        firing = true;
        tracers.add(shot.origin, shot.end);
        if (shot.killed && shot.hit) {
          const p = shot.hit.getPosition();
          const kill = stats.recordKill(shot.hit.rank, { x: p.x, y: p.y, z: p.z });
          popups.add(kill.coins, kill.position, kill.multiplier);
        }
      }
      turret.aim(mount.yawRelativeToCar());
    }
    senses.noise = firing ? 0.5 : 0;

    let attackDamage = 0;
    for (const z of pool.active()) {
      const result = updateZombieAI(z, deltaTime, senses);
      attackDamage += result.damage;
      if (result.shot) projectiles.fire(result.shot);
    }
    for (const hit of projectiles.update(
      deltaTime,
      senses.carPosition,
      cfg.vehicle.chassisHalfExtents.z
    )) {
      attackDamage += hit.damage;
    }
    if (attackDamage > 0) car.applyDamage(attackDamage);

    car.update(driverInput, deltaTime);
    tank.update(deltaTime, driverInput.throttle, senses.carSpeed / cfg.vehicle.topSpeed);
    combat.beforeStep();
    physics.step();
    for (const impact of combat.collectImpacts()) {
      if (impact.killed) {
        const kill = stats.recordKill(impact.rank, impact.position);
        popups.add(kill.coins, kill.position, kill.multiplier);
      }
    }
    stats.trackPosition(senses.carPosition, deltaTime);

    if (car.isDestroyed()) endRun('WRECKED');
    else if (tank.isEmpty() && senses.carSpeed < 0.5) endRun('OUT OF GAS');
  });

  loop.registerStateHandler(GameState.Paused, () => {
    input.update();
    if (input.justPressed('pause')) loop.setState(GameState.Playing);
  });

  loop.registerStateHandler(GameState.GameOver, () => {
    input.update();
  });

  loop.registerStateHandler(GameState.Garage, () => {
    input.update();
    physics.step(); // let the car settle on its suspension while the shop is open
  });

  window.addEventListener('keydown', (e) => {
    if (loop.getState() === GameState.GameOver && e.code === 'Enter') enterGarage();
  });

  const projected = new Vector3();
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
  let turntable = 0;
  loop.onRender(({ deltaTime, elapsedTime }) => {
    car.getPosition(target.position);
    car.getQuaternion(target.quaternion);
    target.forwardSpeed = car.getForwardSpeed();
    carView.sync(car);
    zombieInstances.sync(pool.zombies, camera.position);
    projectileViews.sync(projectiles.projectiles);
    tracers.update(deltaTime);

    if (loop.getState() === GameState.Garage) {
      // J4: slow turntable around the car while shopping.
      turntable = elapsedTime * 0.35;
      camera.position.set(
        target.position.x + Math.sin(turntable) * 7,
        target.position.y + 2.2,
        target.position.z + Math.cos(turntable) * 7
      );
      camera.lookAt(target.position.x, target.position.y + 0.6, target.position.z);
    } else {
      const mouse = input.consumeMouseDelta();
      if (document.pointerLockElement === canvas) chase.orbit(mouse.x, mouse.y);
      chase.update(deltaTime, target);
    }
    renderer.render(scene, camera);
    popups.update(deltaTime, project);

    fpsAccum += deltaTime;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      fps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }
    hud.update({
      kmh: Math.round(Math.abs(target.forwardSpeed) * 3.6),
      fps,
      hp: car.hp,
      maxHp: cfg.vehicle.hp,
      coins: stats.coinsTotal,
      kills: stats.totalKills,
      distanceMeters: stats.distanceMeters,
      alive: pool.aliveCount,
      paused: loop.getState() === GameState.Paused,
      comboMultiplier: stats.comboMultiplier,
      comboChain: stats.comboChain,
      fuelFraction: tank.fraction,
      fuelLitres: tank.level,
      heat: gun ? gun.heat : null,
      overheated: gun?.overheated ?? false,
    });
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  applyGarage();
  car.hp = garage.effectiveStats(stockVehicle).maxHp;
  loop.start();
  if (SKIP_GARAGE) startRun();
  else enterGarage();
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
