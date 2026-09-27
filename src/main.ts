import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
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
import { ChaseCamera } from './game/camera';
import { initPhysics, PhysicsWorld, RAPIER } from './game/physics/PhysicsWorld';
import { readVehicleInput, Vehicle } from './game/vehicle';
import {
  buildGreyboxColliders,
  buildGreyboxMeshes,
  createGreyboxLayout,
  greyboxSpawn,
} from './game/world';

async function boot(): Promise<void> {
  const cfg = getConfig();
  const map = getMapConfig('greybox');
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
  const carMesh = buildPlaceholderCar();
  scene.add(carMesh.group);
  sun.target = carMesh.group;

  const input = new InputManager();
  input.attach();
  canvas.addEventListener('click', () => canvas.requestPointerLock?.());

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

  const hud = document.createElement('div');
  hud.id = 'debug-hud';
  document.body.appendChild(hud);

  const loop = new GameLoop({ fixedTimeStep: cfg.physics.fixedTimeStep });
  const target = { position: new Vector3(), quaternion: new Quaternion(), forwardSpeed: 0 };

  loop.registerStateHandler(GameState.Playing, ({ deltaTime }) => {
    input.update();
    if (input.justPressed('pause')) {
      loop.setState(GameState.Paused);
      document.exitPointerLock?.();
      return;
    }
    car.update(readVehicleInput(input), deltaTime);
    physics.step();
  });

  loop.registerStateHandler(GameState.Paused, () => {
    input.update();
    if (input.justPressed('pause')) loop.setState(GameState.Playing);
  });

  let fpsAccum = 0;
  let fpsFrames = 0;
  let fps = 0;
  loop.onRender(({ deltaTime }) => {
    car.getPosition(target.position);
    car.getQuaternion(target.quaternion);
    target.forwardSpeed = car.getForwardSpeed();
    carMesh.sync(car);

    const mouse = input.consumeMouseDelta();
    if (document.pointerLockElement === canvas) chase.orbit(mouse.x, mouse.y);
    chase.update(deltaTime, target);
    renderer.render(scene, camera);

    fpsAccum += deltaTime;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      fps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }
    const kmh = Math.round(Math.abs(target.forwardSpeed) * 3.6);
    hud.textContent =
      `${loop.getState() === GameState.Paused ? 'PAUSED — ' : ''}${kmh} km/h  |  ${fps} fps` +
      `\nWASD / arrows drive · Space handbrake · R flip · Esc pause · click to orbit`;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  chase.snap(target);
  loop.setState(GameState.Playing);
  loop.start();
}

/** Primitive stand-in for the car until I3 lands: a two-box body and four cylinder wheels. */
function buildPlaceholderCar() {
  const cfg = getConfig().vehicle;
  const he = cfg.chassisHalfExtents;
  const group = new Group();
  group.name = 'car';

  const body = new Mesh(
    new BoxGeometry(he.x * 2, he.y * 2, he.z * 2),
    new MeshStandardMaterial({ color: 0xc8402e, roughness: 0.5, metalness: 0.2 })
  );
  body.castShadow = true;
  group.add(body);

  const cabin = new Mesh(
    new BoxGeometry(he.x * 1.6, he.y * 1.2, he.z * 0.9),
    new MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.3, metalness: 0.4 })
  );
  cabin.position.set(0, he.y * 1.4, -he.z * 0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeometry = new CylinderGeometry(cfg.wheels.radius, cfg.wheels.radius, 0.3, 18);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelMaterial = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const wheels = [0, 1, 2, 3].map(() => {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.castShadow = true;
    return wheel;
  });

  const scratchQ = new Quaternion();
  const yawQ = new Quaternion();
  const up = new Vector3(0, 1, 0);
  return {
    group,
    wheels,
    sync(car: Vehicle) {
      car.getPosition(group.position);
      car.getQuaternion(group.quaternion);
      car.wheels.forEach((state, i) => {
        const wheel = wheels[i];
        if (!wheel.parent) group.parent?.add(wheel);
        wheel.position.copy(state.worldPosition);
        yawQ.setFromAxisAngle(up, -state.steerAngle);
        wheel.quaternion.copy(scratchQ.copy(group.quaternion).multiply(yawQ));
      });
    },
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
