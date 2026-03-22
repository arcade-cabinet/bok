import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({ typescript: true }),
    glsl(),
    wasm(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: "Bok: The Builder's Tome",
        short_name: 'Bok',
        description: 'Roguelike island-hopping voxel adventure',
        theme_color: '#2c1e16',
        background_color: '#fdf6e3',
        display: 'fullscreen',
        orientation: 'landscape',
        categories: ['games'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,woff,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.glb$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'glb-models',
              expiration: { maxEntries: 100 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@bok': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  base: process.env.GITHUB_ACTIONS ? '/bok/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/three/') || id.includes('three@')) {
            return 'vendor-three';
          }
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react@') || id.includes('framer-motion') || id.includes('scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('@jolly-pixel') || id.includes('jolly-pixel')) {
            return 'vendor-engine';
          }
          if (id.includes('koota') || id.includes('yuka') || id.includes('rapier3d')) {
            return 'vendor-game';
          }
          if (id.includes('/tone/') || id.includes('tone@') || id.includes('standardized-audio-context') || id.includes('tslib')) {
            return 'vendor-audio';
          }
          if (id.includes('src/content/')) {
            return 'content';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'],
  },
});
