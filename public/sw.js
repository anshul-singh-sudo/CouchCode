// CouchCode Service Worker
// Cache-first for static shell assets, network-first for API responses.
// ROM signed URLs (/api/games/ and /rom-url) are explicitly excluded from caching.

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `couchcode-shell-${CACHE_VERSION}`;
const API_CACHE = `couchcode-api-${CACHE_VERSION}`;

// Static shell assets to pre-cache on install
const SHELL_ASSETS = [
  '/',
  '/games',
  '/auth',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-512-maskable.svg',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true for URLs that must never be cached:
 * - ROM signed URLs (ephemeral, short-lived)
 * - Any /api/games/ route (includes /rom-url)
 */
function isRomOrEphemeral(url) {
  return url.pathname.includes('/api/games/') || url.pathname.includes('/rom-url');
}

/** Returns true for static shell assets (JS, CSS, fonts, images, icons). */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)
  );
}

/** Returns true for Next.js API routes. */
function isApiRoute(url) {
  return url.pathname.startsWith('/api/');
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache ROM files or ephemeral signed URLs
  if (isRomOrEphemeral(url)) return;

  if (isStaticAsset(url)) {
    // Cache-first strategy for static shell assets
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
  } else if (isApiRoute(url)) {
    // Network-first with stale-while-revalidate for API responses
    event.respondWith(networkFirstWithSWR(event.request, API_CACHE));
  } else {
    // Network-first for HTML pages (stale-while-revalidate)
    event.respondWith(networkFirstWithSWR(event.request, SHELL_CACHE));
  }
});

// ─── Strategies ───────────────────────────────────────────────────────────────

/** Cache-first: serve from cache, fall back to network and update cache. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a minimal offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first with stale-while-revalidate:
 * Try network first; on failure serve stale cache; always update cache in background.
 */
async function networkFirstWithSWR(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
