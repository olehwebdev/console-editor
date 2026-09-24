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
    build: { chunkSizeWarningLimit: 8000 },
    worker: { format: 'es' },
  },
});
