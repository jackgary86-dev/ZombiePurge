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

  it('T2(I2): the Draco/meshopt-wired shared loader actually parses a real glTF binary end-to-end, not just a loader with the right properties attached', () => {
    // A genuinely valid, minimal .glb - not a real game asset, just enough structure (header +
    // one JSON chunk, no BIN chunk needed for an empty scene) to prove the parse pipeline this
    // loader instance actually runs works on real bytes. Draco/meshopt compression need a real
    // encoded mesh to exercise the decode branch itself, which no synthetic fixture can honestly
    // stand in for - this closes the "never actually parses anything" gap in loader coverage,
    // while that part stays blocked on a real delivered asset, same as `loadModel()` itself.
    const json = JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [] }],
    });
    const jsonBytes = new TextEncoder().encode(json);
    const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
    const jsonChunk = new Uint8Array(paddedLength).fill(0x20); // glTF pads JSON with spaces
    jsonChunk.set(jsonBytes);

    const totalLength = 12 + 8 + jsonChunk.length; // header + chunk header + chunk data
    const glb = new DataView(new ArrayBuffer(totalLength));
    glb.setUint32(0, 0x46546c67, true); // magic "glTF"
    glb.setUint32(4, 2, true); // version
    glb.setUint32(8, totalLength, true);
    glb.setUint32(12, jsonChunk.length, true); // chunk length
    glb.setUint32(16, 0x4e4f534a, true); // chunk type "JSON"
    new Uint8Array(glb.buffer).set(jsonChunk, 20);

    return _sharedLoaderForTests()
      .parseAsync(glb.buffer, '')
      .then((gltf) => {
        expect(gltf.scene).toBeDefined();
        expect(gltf.scene.children).toHaveLength(0);
      });
  });
});
