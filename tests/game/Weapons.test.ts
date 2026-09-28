import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import { getConfig, resetConfig } from '../../src/data/config';
import { MachineGun, ROOF_MOUNT, WeaponMount } from '../../src/game/combat';
import { initPhysics, PhysicsWorld } from '../../src/game/physics/PhysicsWorld';
import { NEUTRAL_INPUT, Vehicle } from '../../src/game/vehicle';
import { ZombiePool } from '../../src/game/zombies';

const DT = 1 / 60;

describe('D8 weapon mount + D9 machine gun', () => {
  let physics: PhysicsWorld;
  let car: Vehicle;
  let pool: ZombiePool;
  let mount: WeaponMount;
  let gun: MachineGun;
  const cameraDir = new Vector3(0, 0, 1);

  beforeAll(async () => {
    await initPhysics();
  });

  beforeEach(() => {
    resetConfig();
    const cfg = getConfig();
    physics = new PhysicsWorld(cfg.physics.gravity, DT);
    physics.addGround(500);
    car = new Vehicle(physics, cfg.vehicle, { x: 0, y: 1, z: 0 });
    pool = new ZombiePool(physics, 8, cfg.zombies);
    mount = new WeaponMount(car, ROOF_MOUNT);
    gun = new MachineGun(physics, car, pool, cfg.combat.machineGun[0]);
    for (let i = 0; i < 60; i++) {
      car.update(NEUTRAL_INPUT, DT);
      physics.step();
    }
  });

  afterEach(() => {
    pool.dispose();
    physics.dispose();
  });

  function step(trigger: boolean) {
    const g = gun.stats;
    mount.update(pool, cameraDir, g.autoAimCone, g.range);
    const shots = gun.update(DT, trigger, mount);
    physics.step();
    return shots;
  }

  it('auto-aims the nearest zombie in the cone and shoots it dead', () => {
    const far = pool.spawn('walker', { x: 0, y: 0, z: 40 })!;
    const near = pool.spawn('walker', { x: 6, y: 0, z: 20 })!;
    pool.spawn('walker', { x: 0, y: 0, z: -15 }); // behind: outside the cone
    for (let i = 0; i < 5; i++) step(false);
    step(false);
    expect(mount.target).toBe(near);
    expect(mount.direction.z).toBeGreaterThan(0.9);

    let killed = false;
    let damage = 0;
    for (let i = 0; i < 60 && !killed; i++) {
      for (const s of step(true)) {
        damage += s.damage;
        killed ||= s.killed;
      }
    }
    expect(killed).toBe(true);
    expect(near.isAlive()).toBe(false);
    expect(damage).toBeGreaterThanOrEqual(getConfig().zombies.walker.hp);
    for (let i = 0; i < 5; i++) step(false);
    expect(mount.target).toBe(far); // moves on to the next one
  });

  it('aims along the camera in camera mode and hits what is there', () => {
    mount.aimMode = 'camera';
    const z = pool.spawn('walker', { x: 0, y: 0, z: 15 })!;
    for (let i = 0; i < 5; i++) step(false);
    cameraDir.set(0, 0, 1);
    const shots = step(true);
    expect(mount.target).toBeNull();
    expect(shots.length).toBeGreaterThan(0);
    expect(shots[0].hit).toBe(z);
    expect(z.hp).toBe(getConfig().zombies.walker.hp - gun.stats.damage);
  });

  it('fires at the configured rate, overheats when held, and cools down', () => {
    const g = gun.stats;
    let shots = 0;
    for (let i = 0; i < 60; i++) shots += step(true).length;
    expect(shots).toBeGreaterThanOrEqual(Math.floor(g.fireRate) - 1);
    expect(shots).toBeLessThanOrEqual(Math.ceil(g.fireRate) + 1);

    let total = 0;
    for (let i = 0; i < 60 * 10; i++) total += step(true).length;
    expect(gun.overheated).toBe(true);
    expect(total).toBeLessThan(g.fireRate * 10); // lockout stopped it
    expect(step(true).length).toBe(0);

    for (let i = 0; i < 60 * 3; i++) step(false);
    expect(gun.overheated).toBe(false);
    expect(gun.heat).toBeLessThan(g.unlockHeat);
    expect(step(true).length).toBeGreaterThan(0);
  });

  it('shots stop at the first solid thing', () => {
    physics.addStaticBox({ x: 0, y: 2, z: 8 }, { x: 3, y: 2, z: 0.5 });
    physics.step();
    pool.spawn('walker', { x: 0, y: 0, z: 20 });
    mount.aimMode = 'camera';
    for (let i = 0; i < 3; i++) step(false);
    const shots = step(true);
    expect(shots[0].hit).toBeNull();
    expect(shots[0].end.z).toBeLessThan(8);
  });
});
