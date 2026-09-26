import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// The inspector's performance checks on large apps, in real Chromium and in the built app. Run with
// `npm run test:perf` (`xvfb-run -a` on headless Linux):
// they print their medians, and fail only past budgets well above what a laptop measures.
export default defineConfig({
  resolve: {
    alias: {
      '@common': resolve(import.meta.dirname, 'src/shared'),
      '@': resolve(import.meta.dirname, 'src/renderer/src'),
    },
  },
  test: {
    include: ['test/perf/**/*.perf.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
