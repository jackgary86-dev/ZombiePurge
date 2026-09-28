import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function localGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const buildHash = (process.env.BUILD_HASH ?? localGitHash()).slice(0, 7);
const buildNumber = process.env.BUILD_NUMBER ?? 'local';
const appVersion = (JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string })
  .version;

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    // Rapier's compat build inlines its wasm binary as base64, so its own chunk is expected
    // to be several MB; splitting it out (below) is the actual win, not shrinking it further.
    chunkSizeWarningLimit: 4600,
    rollupOptions: {
      output: {
        // H4: three and Rapier's wasm-backed compat build rarely change between our own
        // commits, so their own chunk stays cached across releases instead of re-downloading
        // ~5 MB on every build (the single-chunk bundle Vite warned about).
        manualChunks: {
          three: ['three'],
          rapier: ['@dimforge/rapier3d-compat'],
        },
      },
    },
  },
});
