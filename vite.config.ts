import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({ typescript: true }),
    glsl(),
    wasm(),
  ],
  resolve: {
    alias: {
      '@bok': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'],
  },
});
