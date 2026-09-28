import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Matches assets/README.md's folder layout. */
export type AssetCategory =
  | 'car'
  | 'parts'
  | 'zombies'
  | 'vfx'
  | 'ui'
  | 'sky'
  | 'env/suburbs'
  | 'env/desert'
  | 'env/industrial'
  | 'env/frozen'
  | 'env/lab';

/** Where a real asset lives under assets/, per docs/ART_PROMPT.md's delivery checklist. */
export function assetPath(category: AssetCategory, name: string): string {
  return `/assets/models/${category}/${name}.glb`;
}

let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  sharedLoader ??= new GLTFLoader();
  return sharedLoader;
}

/**
 * I2: loads a real `.glb` if one has been delivered under assets/models/. Never throws - a
 * missing or malformed asset resolves to `null` so the caller falls back to the placeholder
 * primitives in placeholders.ts/upgradeParts.ts (I12) instead of breaking boot. Not wired into
 * the live boot path yet since nothing has been delivered under assets/ in this session; it's
 * ready for I3/I4/I5 to call once real models land.
 */
export async function loadModel(category: AssetCategory, name: string): Promise<Group | null> {
  try {
    const gltf = await getLoader().loadAsync(assetPath(category, name));
    return gltf.scene;
  } catch {
    return null;
  }
}
