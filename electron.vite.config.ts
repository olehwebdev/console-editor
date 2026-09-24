import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@common': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [react(), tailwindcss()],
    // Monaco's language workers are large; keep them as separate files.
    // Its plugin-timing report flags Vite's own worker and CSS plugins, not something to act on.
    build: { chunkSizeWarningLimit: 8000, rolldownOptions: { checks: { pluginTimings: false } } },
    worker: { format: 'es' },
  },
});
