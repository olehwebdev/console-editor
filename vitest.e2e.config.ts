import { defineConfig } from 'vitest/config';

// End-to-end tests drive the built Electron app. Run with `npm run test:e2e`
// (needs a display; on a headless Linux box use `xvfb-run npm run test:e2e`).
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
