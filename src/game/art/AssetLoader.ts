import type { Group, WebGLRenderer } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

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
let sharedKTX2Loader: KTX2Loader | null = null;

/**
 * I2: builds the shared GLTFLoader with Draco geometry compression and meshopt decoding always
 * wired in - neither needs a renderer, and both use decoder libraries that resolve to their own
 * bundled URLs by default (three's DRACOLoader/KTX2Loader constructors set these from their own
 * module location via `import.meta.url`, which Vite turns into fingerprinted build assets
 * automatically - no manual copy into public/ needed). KTX2 (Basis Universal) texture decoding
 * is the exception: it needs to query a live WebGLRenderer for which compressed texture formats
 * the GPU supports, so it's only attached once configureKTX2() has run (see below).
 */
function getLoader(): GLTFLoader {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setDRACOLoader(new DRACOLoader());
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
    if (sharedKTX2Loader) sharedLoader.setKTX2Loader(sharedKTX2Loader);
  }
  return sharedLoader;
}

/**
 * I2: call once at boot, after the renderer exists, to enable KTX2 (Basis Universal) texture
 * decoding. Safe to call before or after the first loadModel() - either wires the KTX2 loader
 * into the shared GLTFLoader. Called once from main.ts's boot(), right after the renderer is
 * created; a no-op in terms of visible behaviour today since nothing under assets/ uses KTX2
 * textures yet, but it means any future KTX2-textured asset just works without another code
 * change. A glTF that references a KTX2 texture before this has been called simply fails to
 * load - caught by loadModel()'s try/catch below, same as any other missing/malformed asset.
 */
export function configureKTX2(renderer: WebGLRenderer): void {
  sharedKTX2Loader ??= new KTX2Loader();
  sharedKTX2Loader.detectSupport(renderer);
  sharedLoader?.setKTX2Loader(sharedKTX2Loader);
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

/** Test-only accessor: the shared GLTFLoader instance, to verify Draco/meshopt/KTX2 wiring
 *  without a real asset to load one through. */
export function _sharedLoaderForTests(): GLTFLoader {
  return getLoader();
}
