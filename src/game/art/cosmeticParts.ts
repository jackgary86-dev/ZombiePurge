import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';

/**
 * L3: the cosmetic front bumper, keyed the same way D14's upgrade parts are - a single named
 * child of the car group, rebuilt whenever the selected style changes. Kept close against the
 * body (unlike the D12 ram bar/spikes/blade, which sit further out) so an owned ram upgrade
 * never visually collides with it.
 */
export const COSMETIC_PART_NAMES = {
  bumper: 'cosmetic_bumper',
  doors: 'cosmetic_doors',
  decal: 'cosmetic_decal',
} as const;

const rubber = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
const chrome = new MeshStandardMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.1 });
const guardSteel = new MeshStandardMaterial({ color: 0x4a4a50, metalness: 0.7, roughness: 0.4 });
const panelTrim = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
const doorChrome = new MeshStandardMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.15 });
const flameMat = new MeshStandardMaterial({
  color: 0xff6a1a,
  emissive: 0xaa2a00,
  emissiveIntensity: 0.5,
  roughness: 0.4,
});
const stripeMat = new MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.4 });
const skullMat = new MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.5 });
const skullSocketMat = new MeshStandardMaterial({ color: 0x101010, roughness: 0.8 });
const numberDiscMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
const numberBarMat = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });

function buildBumper(optionId: string, he: { x: number; y: number; z: number }): Group {
  const g = new Group();
  g.name = COSMETIC_PART_NAMES.bumper;
  switch (optionId) {
    case 'bumper_chrome': {
      const bar = new Mesh(new CylinderGeometry(0.08, 0.08, he.x * 1.9, 12), chrome);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, -he.y * 0.55, he.z + 0.1);
      bar.castShadow = true;
      g.add(bar);
      break;
    }
    case 'bumper_guard': {
      const rail = new Mesh(new CylinderGeometry(0.05, 0.05, he.x * 1.7, 8), guardSteel);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, -he.y * 0.2, he.z + 0.15);
      rail.castShadow = true;
      g.add(rail);
      const postCount = 3;
      for (let i = 0; i < postCount; i++) {
        const post = new Mesh(new CylinderGeometry(0.04, 0.04, he.y * 0.7, 8), guardSteel);
        post.position.set(
          -he.x * 0.7 + (i * he.x * 1.4) / (postCount - 1),
          -he.y * 0.55,
          he.z + 0.15
        );
        post.castShadow = true;
        g.add(post);
      }
      break;
    }
    default: {
      const bar = new Mesh(new BoxGeometry(he.x * 1.9, 0.16, 0.14), rubber);
      bar.position.set(0, -he.y * 0.55, he.z + 0.08);
      bar.castShadow = true;
      g.add(bar);
    }
  }
  return g;
}

/** Rebuilds the bumper part to match the selected style; safe to call every time it changes. */
export function syncBumperStyle(
  carGroup: Group,
  optionId: string,
  he: { x: number; y: number; z: number }
): void {
  const old = carGroup.getObjectByName(COSMETIC_PART_NAMES.bumper);
  if (old) carGroup.remove(old);
  carGroup.add(buildBumper(optionId, he));
}

/**
 * L6: cosmetic door trim, mirrored on both sides of the body. Stock adds nothing (the body's
 * own surface is the door); the other styles add a thin trim primitive flush against each side.
 */
function buildDoors(optionId: string, he: { x: number; y: number; z: number }): Group {
  const g = new Group();
  g.name = COSMETIC_PART_NAMES.doors;
  let trim: { geometry: BoxGeometry; material: MeshStandardMaterial; y: number } | null = null;
  switch (optionId) {
    case 'door_paneled':
      trim = { geometry: new BoxGeometry(0.03, he.y * 0.9, he.z * 1.1), material: panelTrim, y: 0 };
      break;
    case 'door_chrome_trim':
      trim = {
        geometry: new BoxGeometry(0.04, 0.1, he.z * 1.3),
        material: doorChrome,
        y: -he.y * 0.75,
      };
      break;
    default:
      return g; // stock: no add-on trim, just the body's own paint
  }
  for (const sign of [-1, 1]) {
    const panel = new Mesh(trim.geometry, trim.material);
    panel.position.set(sign * (he.x + trim.geometry.parameters.width / 2), trim.y, -he.z * 0.05);
    panel.castShadow = true;
    g.add(panel);
  }
  return g;
}

/** Rebuilds the door trim to match the selected style; safe to call every time it changes. */
export function syncDoorStyle(
  carGroup: Group,
  optionId: string,
  he: { x: number; y: number; z: number }
): void {
  const old = carGroup.getObjectByName(COSMETIC_PART_NAMES.doors);
  if (old) carGroup.remove(old);
  carGroup.add(buildDoors(optionId, he));
}

const skinOffset = 0.011; // sits just proud of the body surface so it never z-fights with paint

/**
 * L7: a purely cosmetic decal on the car's flanks, stacked independently of paint (L2) since
 * it lives on its own named part rather than touching the body material. "None" is the free
 * stock option (an empty group); every other style mirrors a small primitive cluster onto
 * both sides of the body.
 */
function buildDecal(optionId: string, he: { x: number; y: number; z: number }): Group {
  const g = new Group();
  g.name = COSMETIC_PART_NAMES.decal;
  switch (optionId) {
    case 'decal_flames': {
      for (const sign of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const flame = new Mesh(new ConeGeometry(0.12, 0.5 - i * 0.15, 8), flameMat);
          flame.rotation.z = sign * (Math.PI / 2 + 0.3);
          flame.position.set(
            sign * (he.x + skinOffset),
            -he.y * 0.3 + i * 0.05,
            he.z * 0.2 - i * 0.35
          );
          flame.castShadow = true;
          g.add(flame);
        }
      }
      break;
    }
    case 'decal_stripes': {
      for (const sign of [-1, 1]) {
        const stripe = new Mesh(new BoxGeometry(0.12, 0.03, he.z * 1.9), stripeMat);
        stripe.position.set(sign * he.x * 0.35, he.y + skinOffset, 0);
        stripe.castShadow = true;
        g.add(stripe);
      }
      break;
    }
    case 'decal_skull': {
      for (const sign of [-1, 1]) {
        const skull = new Mesh(new SphereGeometry(0.16, 10, 8), skullMat);
        skull.position.set(sign * (he.x + skinOffset), 0, 0);
        skull.scale.set(0.7, 1, 1);
        g.add(skull);
        for (const eyeSign of [-1, 1]) {
          const socket = new Mesh(new SphereGeometry(0.045, 6, 6), skullSocketMat);
          socket.position.set(sign * (he.x + skinOffset * 2), 0.03, eyeSign * 0.07);
          g.add(socket);
        }
      }
      break;
    }
    case 'decal_number': {
      for (const sign of [-1, 1]) {
        const disc = new Mesh(new CylinderGeometry(0.22, 0.22, 0.02, 16), numberDiscMat);
        disc.rotation.z = Math.PI / 2;
        disc.position.set(sign * (he.x + skinOffset), 0, 0);
        g.add(disc);
        const bar = new Mesh(new BoxGeometry(0.015, 0.24, 0.06), numberBarMat);
        bar.position.set(sign * (he.x + skinOffset * 2), 0, 0);
        g.add(bar);
      }
      break;
    }
    default:
      break; // decal_none / unknown: no decal
  }
  return g;
}

/** Rebuilds the decal to match the selected style; safe to call every time it changes. */
export function syncDecalStyle(
  carGroup: Group,
  optionId: string,
  he: { x: number; y: number; z: number }
): void {
  const old = carGroup.getObjectByName(COSMETIC_PART_NAMES.decal);
  if (old) carGroup.remove(old);
  carGroup.add(buildDecal(optionId, he));
}
