import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@common': resolve(import.meta.dirname, 'src/shared'),
      '@': resolve(import.meta.dirname, 'src/renderer/src'),
    },
  },
  plugins: [
    {
      // Vite's `?worker` imports only exist in the renderer build; unit tests get an inert stub.
      name: 'stub-web-workers',
      enforce: 'pre',
      resolveId: (id) => (id.endsWith('?worker') ? '\0stub-worker' : undefined),
      load: (id) => (id === '\0stub-worker' ? 'export default class StubWorker { postMessage() {} terminate() {} }' : undefined),
    },
  ],
  test: {
    include: ['test/unit/**/*.test.ts', 'test/renderer/**/*.test.ts', 'test/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
