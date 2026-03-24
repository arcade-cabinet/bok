import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';
import { VitePWA } from 'vite-plugin-pwa';
import staticAssetsPlugin from 'vite-static-assets-plugin';
import { resolve } from 'node:path';

const base = process.env.GITHUB_ACTIONS ? '/bok/' : '/';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({ typescript: true }),
    glsl(),
    wasm(),
    staticAssetsPlugin({
      directory: 'public',
      outputFile: 'src/static-assets.ts',
      ignore: ['.DS_Store'],
      enableDirectoryTypes: true,
      addLeadingSlash: true,
    }),
    // Patch the generated static-assets.ts to use Vite's BASE_URL instead of
    // the hardcoded BASE_PATH, so paths resolve correctly on GitHub Pages.
    {
      name: 'patch-static-assets-base',
      configResolved() {},
      writeBundle() {},
      transform(code, id) {
        if (id.endsWith('static-assets.ts') && code.includes('const BASE_PATH')) {
          return code.replace(
            /const BASE_PATH = "[^"]*";/,
            'const BASE_PATH = import.meta.env.BASE_URL;',
          );
        }
      },
    },
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
  base,
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
