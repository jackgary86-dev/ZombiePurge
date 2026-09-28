import {
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import type { Zombie } from '../zombies/Zombie';

const FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const STATE_COLORS: Record<string, number> = {
  idle: 0x9ecbff,
  wander: 0x9ecbff,
  alerted: 0xffd84a,
  chase: 0xff5a4a,
  attack: 0xff2a1a,
};

/**
 * E2 debug overlay: one flat ring per live zombie at its detection radius (scaled up
 * while the car is loud), coloured by AI state, plus the fog/view-distance ring around
 * the car. Everything hides when disabled so it costs nothing in normal play.
 */
export class DetectionRings {
  readonly zombieRings: InstancedMesh;
  readonly viewRing: InstancedMesh;
  enabled = false;
  private readonly matrix = new Matrix4();
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private readonly color = new Color();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();

  constructor(readonly capacity: number) {
    const ring = new RingGeometry(0.97, 1, 48);
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false });
    this.zombieRings = new InstancedMesh(ring, material, capacity);
    this.zombieRings.instanceMatrix.setUsage(DynamicDrawUsage);
    this.zombieRings.frustumCulled = false;
    this.viewRing = new InstancedMesh(
      new RingGeometry(0.995, 1, 96),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
      1
    );
    this.viewRing.frustumCulled = false;
    this.setAllHidden();
  }

  sync(
    zombies: readonly Zombie[],
    carPosition: Vector3,
    viewDistance: number,
    loudMultiplier: number
  ): void {
    if (!this.enabled) {
      if (this.zombieRings.visible) this.setAllHidden();
      return;
    }
    this.zombieRings.visible = true;
    this.viewRing.visible = true;
    for (let i = 0; i < this.capacity; i++) {
      const z = zombies[i];
      if (!z || !z.isAlive()) {
        this.zombieRings.setMatrixAt(i, this.hidden);
        continue;
      }
      const radius = z.cfg.detectionRadius * loudMultiplier;
      z.getPosition(this.position);
      this.position.y = 0.1;
      this.scale.set(radius, radius, 1);
      this.matrix.compose(this.position, FLAT, this.scale);
      this.zombieRings.setMatrixAt(i, this.matrix);
      this.zombieRings.setColorAt(i, this.color.set(STATE_COLORS[z.state] ?? 0xffffff));
    }
    this.zombieRings.instanceMatrix.needsUpdate = true;
    if (this.zombieRings.instanceColor) this.zombieRings.instanceColor.needsUpdate = true;

    this.position.copy(carPosition);
    this.position.y = 0.15;
    this.scale.set(viewDistance, viewDistance, 1);
    this.matrix.compose(this.position, FLAT, this.scale);
    this.viewRing.setMatrixAt(0, this.matrix);
    this.viewRing.instanceMatrix.needsUpdate = true;
  }

  private setAllHidden(): void {
    this.zombieRings.visible = false;
    this.viewRing.visible = false;
  }
}
