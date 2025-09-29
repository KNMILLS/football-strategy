import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    viteStaticCopy({ targets: [{ src: 'data/**', dest: 'data' }] }),
  ],
  publicDir: false,
});


