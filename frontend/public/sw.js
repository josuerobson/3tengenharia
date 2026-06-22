// public/sw.js
// Service Worker do Sistema 3T Engenharia
// Estratégia: Network-First para API, Cache-First para assets estáticos.
// Gerado manualmente para controle total — complementa o vite-plugin-pwa.

const CACHE_VERSION = 'v1'
const STATIC_CACHE  = `3t-static-${CACHE_VERSION}`
const API_CACHE     = `3t-api-${CACHE_VERSION}`
const IMAGE_CACHE   = `3t-images-${CACHE_VERSION}`

// ── Assets estáticos para pré-cache (Precache) ───────────────────────────────
// O vite-plugin-pwa injetará automaticamente a lista de assets do build.
// Este fallback garante os recursos mínimos offline.
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/logo-sistema.png',
]

// ── INSTALL: pré-cacheia assets críticos ────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW 3T] Instalando Service Worker...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    }).then(() => {
      console.log('[SW 3T] Assets pré-cacheados com sucesso.')
      return self.skipWaiting()
    })
  )
})

// ── ACTIVATE: limpa caches antigos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW 3T] Ativando Service Worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith('3t-') && ![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(name)
          )
          .map((name) => {
            console.log('[SW 3T] Removendo cache antigo:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      console.log('[SW 3T] Service Worker ativo e controlando clientes.')
      return self.clients.claim()
    })
  )
})

// ── FETCH: estratégias por tipo de recurso ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições não-GET e de outras origens
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.googleapis.com')) return

  // ── 1. API: Network-First (sem cache offline de dados sensíveis) ──────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, 5_000))
    return
  }

  // ── 2. Google Fonts: Cache-First com expiração longa ─────────────────────
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 3. Imagens: Cache-First ───────────────────────────────────────────────
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // ── 4. Navegação SPA: sempre serve index.html (offline-first SPA) ─────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((r) => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // ── 5. Assets estáticos (JS, CSS, fontes): Stale-While-Revalidate ─────────
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

// ── Helpers de estratégia de cache ──────────────────────────────────────────

/**
 * Network-First: tenta a rede, cai no cache se offline.
 * @param {Request} request
 * @param {string}  cacheName
 * @param {number}  timeoutMs — aborta a requisição de rede após este tempo
 */
async function networkFirst(request, cacheName, timeoutMs = 4_000) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const networkResponse = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    clearTimeout(timeoutId)
    const cached = await caches.match(request)
    return cached ?? new Response(
      JSON.stringify({ error: 'Sem conexão. Dado indisponível offline.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Cache-First: serve do cache se existir; busca na rede e cacheia caso contrário.
 * @param {Request} request
 * @param {string}  cacheName
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    return new Response('Recurso indisponível offline.', { status: 503 })
  }
}

/**
 * Stale-While-Revalidate: serve do cache imediatamente e atualiza em background.
 * @param {Request} request
 * @param {string}  cacheName
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? (await networkFetch) ?? new Response('Offline', { status: 503 })
}

// ── Push Notifications (preparação para futuro) ──────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? '3T Gestão', {
      body:    data.body    ?? 'Você tem uma nova notificação.',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url ?? '/'
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
