import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    viteStaticCopy({ targets: [{ src: 'data/**', dest: 'data' }] }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core UI components - loaded immediately for critical functionality
          'ui-core': [
            'src/ui/HUD.ts',
            'src/ui/Log.ts',
            'src/ui/ErrorBoundary.ts'
          ],
          // Interactive UI components - loaded when user interaction begins
          'ui-interactive': [
            'src/ui/Hand.ts',
            'src/ui/Controls.ts',
            'src/ui/field/chrome.ts'
          ],
          // Accessibility features - loaded on demand for better performance
          'ui-accessibility': [
            'src/ui/a11y/FocusTrap.ts',
            'src/ui/a11y/Hotkeys.ts',
            'src/ui/a11y/LiveRegion.ts',
            'src/ui/a11y/ReducedMotion.ts'
          ],
          // Game rules and logic - loaded when game starts
          'game-rules': [
            'src/rules/ResolvePlayCore.ts',
            'src/rules/Charts.ts',
            'src/rules/Penalties.ts',
            'src/rules/Timekeeping.ts'
          ],
          // Game flow orchestration - loaded when game flow begins
          'game-flow': [
            'src/flow/GameFlow.ts',
            'src/flow/core/GameFlowCore.ts',
            'src/flow/drive/DriveTracker.ts'
          ],
          // AI logic - loaded when AI makes decisions
          'ai-logic': [
            'src/ai/PlayCaller.ts',
            'src/ai/CoachProfiles.ts'
          ],
          // Vendor libraries - separate chunk for third-party dependencies
          'vendor': ['zod']
        }
      }
    },
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


