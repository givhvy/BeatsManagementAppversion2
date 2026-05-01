import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/renderer',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve('src/renderer'),
      '@shared': path.resolve('src/renderer/shared'),
      '@components': path.resolve('src/renderer/components'),
    },
  },
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
