import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PickupKind } from '../../data/types';

const materials = new Map<string, MeshStandardMaterial>();
function material(key: string, color: number, roughness = 0.6): MeshStandardMaterial {
  let m = materials.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness });
    materials.set(key, m);
  }
  return m;
}

function box(w: number, h: number, d: number, mat: MeshStandardMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  return mesh;
}

function buildGasCan(): Group {
  const g = new Group();
  const body = box(0.5, 0.7, 0.35, material('gas-body', 0xd9482f));
  body.position.y = 0.35;
  const cap = new Mesh(new CylinderGeometry(0.08, 0.08, 0.15, 8), material('gas-cap', 0xffd84a));
  cap.position.set(0.15, 0.78, 0);
  cap.castShadow = true;
  g.add(body, cap);
  return g;
}

function buildRepairKit(): Group {
  const g = new Group();
  const body = box(0.6, 0.4, 0.4, material('repair-body', 0xf4e9d8));
  body.position.y = 0.2;
  const crossA = box(0.36, 0.08, 0.08, material('repair-cross', 0xc8402e));
  crossA.position.y = 0.42;
  const crossB = box(0.08, 0.08, 0.36, material('repair-cross', 0xc8402e));
  crossB.position.y = 0.42;
  g.add(body, crossA, crossB);
  return g;
}

function buildCoinStack(): Group {
  const g = new Group();
  const radii = [0.32, 0.27, 0.22];
  let y = 0.04;
  for (const r of radii) {
    const coin = new Mesh(new CylinderGeometry(r, r, 0.08, 14), material('coin', 0xffd84a, 0.35));
    coin.position.y = y;
    coin.castShadow = true;
    g.add(coin);
    y += 0.09;
  }
  return g;
}

function buildAmmoCrate(): Group {
  const g = new Group();
  const body = box(0.6, 0.4, 0.5, material('ammo-body', 0x5a6a3a));
  body.position.y = 0.2;
  const lid = box(0.62, 0.06, 0.52, material('ammo-lid', 0x3a4626));
  lid.position.y = 0.43;
  g.add(body, lid);
  return g;
}

const BUILDERS: Record<PickupKind, () => Group> = {
  gas: buildGasCan,
  repair: buildRepairKit,
  coins: buildCoinStack,
  ammo: buildAmmoCrate,
};

interface PropEntry {
  root: Group;
  baseY: number;
}

/**
 * E9: one small placeholder prop per pickup spot (there are only ever a handful per
 * map, so instancing isn't worth the complexity). Bobs and spins while available,
 * and hides the instant `taken` flips true.
 */
export class PickupViews {
  readonly group = new Group();
  private readonly props: PropEntry[] = [];

  constructor(spots: { kind: PickupKind; x: number; z: number }[]) {
    this.group.name = 'pickups';
    for (const spot of spots) {
      const root = BUILDERS[spot.kind]();
      root.position.x = spot.x;
      root.position.z = spot.z;
      this.group.add(root);
      this.props.push({ root, baseY: root.position.y });
    }
  }

  /** `elapsed` is the run clock in seconds; `spots` must be the same array `sync` was built from. */
  sync(spots: { taken: boolean }[], elapsed: number): void {
    for (let i = 0; i < this.props.length; i++) {
      const state = spots[i];
      const prop = this.props[i];
      const visible = !state?.taken;
      prop.root.visible = visible;
      if (!visible) continue;
      prop.root.position.y = prop.baseY + Math.sin(elapsed * 2 + i) * 0.12;
      prop.root.rotation.y = elapsed * 1.2 + i;
    }
  }
}
