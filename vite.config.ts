import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    viteStaticCopy({ targets: [{ src: 'data/**', dest: 'data' }] }),
  ],
  build: {
    // Rely on Vite/Rollup automatic code splitting for simplicity and maintainability
    // Set reasonable chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: true,
    // Optimize chunk splitting for better caching
    target: 'esnext',
    minify: 'esbuild'
  },
  publicDir: false,
  // Enable experimental features for better code splitting
  esbuild: {
    // Enable tree shaking for better bundle optimization
    treeShaking: true
  }
});


