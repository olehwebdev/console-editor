import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // Monaco's language workers are large; keep them as separate files.
    build: { chunkSizeWarningLimit: 8000 },
    worker: { format: 'es' },
  },
});
