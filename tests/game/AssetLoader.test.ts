import { describe, it, expect } from 'vitest';
import { assetPath, loadModel } from '../../src/game/art/AssetLoader';

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
});
