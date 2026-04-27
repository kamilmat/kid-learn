import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Base path: /kid-learn/ na GitHub Pages (https://kamilmat.github.io/kid-learn/),
// '/' lokalnie (pnpm dev). Sterujemy ENV z workflow .github/workflows/deploy.yml.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate — gdy push na main pojawia się nowa wersja, SW pobiera ją
      // w tle i aktywuje przy następnym otwarciu. Dziecko widzi natychmiast
      // świeżą wersję bez akcji rodzica (bez "Reload to update" prompt'u).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Iskierki — nauka liter',
        short_name: 'Iskierki',
        description:
          'Webowa platforma edukacyjna dla dzieci. Rozpoznawanie liter polskiego alfabetu.',
        lang: 'pl',
        theme_color: '#fef9f2',
        background_color: '#fef9f2',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache wszystkich assets włącznie z MP3 — pełen offline.
        // 137 plików audio × ~30 KB = ~4 MB total, mieści się.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,mp3,woff2}'],
        // Limit per file (default 2MB) — sfx-mastery-fanfara największy ~50KB,
        // ale podnosimy na zapas.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Navigation fallback dla SPA — gdy SW nie zna ścieżki, serwuje index.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
