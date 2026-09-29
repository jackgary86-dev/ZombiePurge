import { describe, it, expect } from 'vitest';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  _sharedLoaderForTests,
  assetPath,
  configureKTX2,
  loadModel,
} from '../../src/game/art/AssetLoader';

describe('AssetLoader (I2)', () => {
  it('assetPath follows the assets/README.md naming convention', () => {
    expect(assetPath('car', 'wagon_clean')).toBe('/assets/models/car/wagon_clean.glb');
    expect(assetPath('zombies', 'walker_variant2')).toBe(
      '/assets/models/zombies/walker_variant2.glb'
    );
    expect(assetPath('env/frozen', 'pine_01')).toBe('/assets/models/env/frozen/pine_01.glb');
  });

  it('loadModel resolves to null instead of throwing when nothing has been delivered yet', async () => {
    await expect(loadModel('car', 'nope-does-not-exist')).resolves.toBeNull();
  });

  it('wires Draco geometry compression and meshopt decoding into the shared loader unconditionally', () => {
    const gltfLoader = _sharedLoaderForTests();
    expect(gltfLoader.dracoLoader).toBeInstanceOf(DRACOLoader);
    expect(gltfLoader.meshoptDecoder).toBe(MeshoptDecoder);
  });

  it('only wires KTX2 texture decoding in once configureKTX2() has run', () => {
    // A minimal stand-in for the WebGLRenderer branch of KTX2Loader.detectSupport(): it only
    // reads `isWebGPURenderer` (falsy here) and `extensions.has(name)`, never a real canvas/GL
    // context.
    const fakeRenderer = { extensions: { has: () => false } } as never;

    configureKTX2(fakeRenderer);
    const gltfLoader = _sharedLoaderForTests();
    expect(gltfLoader.ktx2Loader).toBeInstanceOf(KTX2Loader);
  });
});
