// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),

    // ── PWA Plugin ────────────────────────────────────────────────────────────
    VitePWA({
      // Usa o sw.js manual que criamos em public/ (mais controle sobre estratégias)
      strategies:    'injectManifest',
      srcDir:        'public',
      filename:      'sw.js',
      outDir:        'dist',

      // Injeta o manifest no HTML automaticamente
      includeAssets: [
        'logo-sistema.png',
        'icons/*.png',
        'icons/*.svg',
        'favicon.svg',
      ],

      // Web App Manifest completo
      manifest: {
        name:             '3T Engenharia — Sistema de Gestão',
        short_name:       '3T Gestão',
        description:      'Sistema Integrado de Gestão Operacional da 3T Engenharia.',
        theme_color:      '#00475B',
        background_color: '#00475B',
        display:          'standalone',
        orientation:      'any',
        start_url:        '/',
        scope:            '/',
        lang:             'pt-BR',
        icons: [
          {
            src:     '/icons/icon-192.png',
            sizes:   '192x192',
            type:    'image/png',
            purpose: 'any',
          },
          {
            src:     '/icons/icon-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'any',
          },
          {
            src:     '/icons/icon-maskable-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name:      'Registrar Viagem',
            short_name:'Nova Viagem',
            url:       '/vehicles/trips/new',
            icons:     [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name:      'Auditoria 5S',
            short_name:'5S',
            url:       '/5s/audit/new',
            icons:     [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name:      'Lançar Horas',
            short_name:'Horas',
            url:       '/time-logs/daily',
            icons:     [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },

      // Opções de desenvolvimento (ativa o SW em modo dev para testes)
      devOptions: {
        enabled:   true,
        type:      'module',
        navigateFallback: 'index.html',
      },

      // Opções do Workbox (injectManifest mode)
      injectManifest: {
        // Arquivos que o Workbox injeta no precache do sw.js
        globPatterns:       ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores:        ['**/node_modules/**', '**/sw.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target:       'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Otimizações de bundle para PWA
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':     ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
