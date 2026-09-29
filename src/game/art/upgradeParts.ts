import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { VehicleConfig } from '../../data/types';
import type { Garage } from '../../game/shop/Garage';

/**
 * D14: every owned upgrade puts a stand-in part on the car, keyed by the same
 * attachment names the real model will carry (see docs/ART_PROMPT.md). Rebuilt
 * whenever the garage changes; higher tiers are bigger / more numerous.
 */
export const PART_NAMES = {
  armor: 'armor_plates',
  ram: 'mount_front_ram',
  fuel: 'tank_fuel',
  nitro: 'nitro_bottles',
  radar: 'radar_dish',
  headlights: 'headlight_bar',
  melee: 'mount_front_melee',
} as const;

const plate = new MeshStandardMaterial({ color: 0x6b6f75, metalness: 0.6, roughness: 0.5 });
const steel = new MeshStandardMaterial({ color: 0x8d8f94, metalness: 0.8, roughness: 0.35 });
const drum = new MeshStandardMaterial({ color: 0xb0452b, roughness: 0.7 });
const bottle = new MeshStandardMaterial({ color: 0x2f6fb5, metalness: 0.5, roughness: 0.4 });
const lamp = new MeshStandardMaterial({
  color: 0xfff2c0,
  emissive: 0xffe08a,
  emissiveIntensity: 0.6,
});
const spikeSteel = new MeshStandardMaterial({ color: 0x7a7e84, metalness: 0.7, roughness: 0.4 });

export function syncUpgradeParts(carGroup: Group, garage: Garage, cfg: VehicleConfig): void {
  for (const name of Object.values(PART_NAMES)) {
    const old = carGroup.getObjectByName(name);
    if (old) carGroup.remove(old);
  }
  const he = cfg.chassisHalfExtents;

  const armor = garage.ownedTier('armor');
  if (armor > 0) {
    const g = new Group();
    g.name = PART_NAMES.armor;
    const thickness = 0.05 + armor * 0.04;
    const sides = [-1, 1].map((sign) => {
      const m = new Mesh(new BoxGeometry(thickness, he.y * 1.4, he.z * 1.6), plate);
      m.position.set(sign * (he.x + thickness / 2), -he.y * 0.1, 0);
      return m;
    });
    g.add(...sides);
    if (armor >= 2) {
      const front = new Mesh(new BoxGeometry(he.x * 1.8, he.y * 1.2, thickness), plate);
      front.position.set(0, -he.y * 0.2, he.z + thickness / 2);
      g.add(front);
    }
    if (armor >= 3) {
      const rear = new Mesh(new BoxGeometry(he.x * 1.8, he.y * 1.2, thickness), plate);
      rear.position.set(0, -he.y * 0.2, -he.z - thickness / 2);
      g.add(rear);
    }
    g.children.forEach((c) => (c.castShadow = true));
    carGroup.add(g);
  }

  const ram = garage.ownedTier('ram');
  if (ram > 0) {
    const g = new Group();
    g.name = PART_NAMES.ram;
    const bar = new Mesh(new BoxGeometry(he.x * 2.1, 0.16, 0.16), steel);
    bar.position.set(0, -he.y * 0.4, he.z + 0.2);
    g.add(bar);
    if (ram >= 2) {
      const spikes = ram >= 3 ? 7 : 4;
      for (let i = 0; i < spikes; i++) {
        const spike = new Mesh(new CylinderGeometry(0.01, 0.06, 0.5, 6), steel);
        spike.rotation.x = Math.PI / 2;
        spike.position.set(-he.x + ((i + 0.5) * he.x * 2) / spikes, -he.y * 0.4, he.z + 0.55);
        g.add(spike);
      }
    }
    if (ram >= 3) {
      const blade = new Mesh(new BoxGeometry(he.x * 2.2, he.y * 1.3, 0.1), steel);
      blade.position.set(0, -he.y * 0.2, he.z + 0.32);
      blade.rotation.x = -0.35;
      g.add(blade);
    }
    g.children.forEach((c) => (c.castShadow = true));
    carGroup.add(g);
  }

  const fuel = garage.ownedTier('fuel');
  if (fuel > 0) {
    const g = new Group();
    g.name = PART_NAMES.fuel;
    const count = fuel >= 3 ? 2 : 1;
    const radius = fuel === 1 ? 0.18 : 0.28;
    for (let i = 0; i < count; i++) {
      const d = new Mesh(new CylinderGeometry(radius, radius, 0.6, 12), drum);
      d.position.set(count === 1 ? 0 : (i - 0.5) * 0.7, he.y + radius, -he.z + 0.6);
      d.castShadow = true;
      g.add(d);
    }
    carGroup.add(g);
  }

  const nitro = garage.ownedTier('nitro');
  if (nitro > 0) {
    const g = new Group();
    g.name = PART_NAMES.nitro;
    const bottles = nitro >= 2 ? 2 : 1;
    for (let i = 0; i < bottles; i++) {
      const b = new Mesh(new CylinderGeometry(0.09, 0.09, 0.7, 10), bottle);
      b.rotation.x = Math.PI / 2;
      b.position.set((i === 0 ? -1 : 1) * (he.x - 0.2), he.y + 0.12, -he.z * 0.6);
      b.castShadow = true;
      g.add(b);
    }
    carGroup.add(g);
  }

  const radar = garage.ownedTier('radar');
  if (radar > 0) {
    const g = new Group();
    g.name = PART_NAMES.radar;
    const mast = new Mesh(new CylinderGeometry(0.03, 0.03, 0.5, 6), steel);
    mast.position.set(-he.x + 0.15, he.y + 0.9, -he.z * 0.75);
    const dish = new Mesh(
      new CylinderGeometry(0.12 + radar * 0.06, 0.12 + radar * 0.06, 0.04, 12),
      steel
    );
    dish.position.copy(mast.position).add(new Vector3(0, 0.28, 0));
    dish.rotation.x = Math.PI / 3;
    g.add(mast, dish);
    carGroup.add(g);
  }

  const lights = garage.ownedTier('headlights');
  if (lights > 0) {
    const g = new Group();
    g.name = PART_NAMES.headlights;
    const width = lights >= 2 ? he.x * 1.6 : 0.5;
    const bar = new Mesh(new BoxGeometry(width, 0.12, 0.12), lamp);
    bar.position.set(0, he.y * 1.4 + 0.42, he.z * 0.1);
    g.add(bar);
    carGroup.add(g);
  }
}

/**
 * M1/M2: the melee weapon mounted in the front slot, if any (spikes/saw/hammer all share this
 * slot with the ram and flamethrower - only one front-mounted weapon shows at a time). Unlike
 * `syncUpgradeParts`'s owned-tier gating, this is gated on `weaponId` already being the one
 * equipped in 'front' (the caller looks that up), so it never visually overlaps a ram or
 * flamethrower the player owns but isn't currently using.
 */
export function syncMeleeWeapon(
  carGroup: Group,
  weaponId: string | undefined,
  tier: number,
  cfg: VehicleConfig
): void {
  const old = carGroup.getObjectByName(PART_NAMES.melee);
  if (old) carGroup.remove(old);
  if (weaponId !== 'spikes' || tier <= 0) return;
  const he = cfg.chassisHalfExtents;
  const g = new Group();
  g.name = PART_NAMES.melee;
  const spikeCount = 3 + tier * 2;
  const spikeLength = 0.3 + tier * 0.15;
  for (let i = 0; i < spikeCount; i++) {
    const spike = new Mesh(new CylinderGeometry(0.01, 0.05, spikeLength, 6), spikeSteel);
    spike.rotation.x = Math.PI / 2;
    spike.position.set(
      -he.x + ((i + 0.5) * he.x * 2) / spikeCount,
      -he.y * 0.15,
      he.z + spikeLength / 2
    );
    spike.castShadow = true;
    g.add(spike);
  }
  carGroup.add(g);
}
