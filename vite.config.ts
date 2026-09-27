import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    sourcemap: true,
    outDir: 'dist',
  },
  preview: {
    port: 4173,
  },
})
