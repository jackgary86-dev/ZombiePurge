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

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
  },
});
