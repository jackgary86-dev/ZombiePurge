import { Vector3 } from 'three';
import type { CombatConfig, ZombieRank } from '../../data/types';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { Vehicle } from '../vehicle/Vehicle';
import type { Zombie } from '../zombies/Zombie';
import type { ZombiePool } from '../zombies/ZombiePool';

export interface ImpactEvent {
  zombie: Zombie;
  rank: ZombieRank;
  relativeSpeed: number;
  damageToZombie: number;
  damageToCar: number;
  killed: boolean;
  position: { x: number; y: number; z: number };
}

const relative = new Vector3();

/**
 * B4/B5: turns car-zombie contacts into damage. Impact damage to the zombie is
 * relative speed x car mass x factor; slow bumps just shove. Heavy ranks hurt the
 * car back, scaled by speed and reduced by armor inside Vehicle.applyDamage.
 */
export class RunOverSystem {
  constructor(
    private readonly physics: PhysicsWorld,
    private readonly car: Vehicle,
    private readonly pool: ZombiePool,
    private readonly cfg: CombatConfig,
    private readonly carMass: number
  ) {}

  private readonly carVelocityBeforeStep = new Vector3();

  /**
   * Call right before physics.step(). Contact resolution flings a light zombie to the
   * car's speed within the step, so impact speed must come from the pre-step velocities.
   */
  beforeStep(): void {
    this.car.getLinearVelocity(this.carVelocityBeforeStep);
    for (const z of this.pool.active()) {
      const v = z.body.linvel();
      z.velocityBeforeStep.set(v.x, v.y, v.z);
    }
  }

  /** Call right after physics.step(). Returns one event per zombie the car started touching. */
  collectImpacts(): ImpactEvent[] {
    const events: ImpactEvent[] = [];
    const carHandle = this.car.collider.handle;
    this.physics.drainCollisions((h1, h2, started) => {
      if (!started) return;
      const other = h1 === carHandle ? h2 : h2 === carHandle ? h1 : -1;
      if (other < 0) return;
      const zombie = this.pool.fromColliderHandle(other);
      if (!zombie || !zombie.isAlive()) return;
      events.push(this.resolve(zombie));
    });
    return events;
  }

  resolve(zombie: Zombie): ImpactEvent {
    const relativeSpeed = relative
      .copy(this.carVelocityBeforeStep)
      .sub(zombie.velocityBeforeStep)
      .length();

    let damageToZombie = 0;
    if (relativeSpeed >= this.cfg.runOverMinSpeed) {
      damageToZombie = relativeSpeed * this.carMass * this.cfg.runOverDamageFactor;
    }
    const killed = damageToZombie > 0 ? zombie.takeDamage(damageToZombie) : false;

    const rawCarDamage =
      this.cfg.impactDamageToCar[zombie.rank] *
      Math.min(1, relativeSpeed / this.cfg.impactFullSpeed);
    const damageToCar = this.car.applyDamage(rawCarDamage);

    const p = zombie.getPosition();
    return {
      zombie,
      rank: zombie.rank,
      relativeSpeed,
      damageToZombie,
      damageToCar,
      killed,
      position: { x: p.x, y: p.y, z: p.z },
    };
  }
}
