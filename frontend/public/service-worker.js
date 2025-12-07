// Matrix Delivery Service Worker
// Handles caching for map tiles, static assets, and offline support

const CACHE_VERSION = 'v1';
const TILE_CACHE_NAME = `map-tiles-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `static-assets-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `runtime-${CACHE_VERSION}`;

// Cache configuration
const TILE_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const TILE_CACHE_MAX_ENTRIES = 500;
const STATIC_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Tile server patterns to cache
const TILE_PATTERNS = [
    /tile\.openstreetmap\.org/,
    /[a-c]\.tile\.openstreetmap\.org/,
    /tiles\.stadiamaps\.com/,
    /tile\.thunderforest\.com/
];

// Static assets to precache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/static/css/main.css',
    '/static/js/main.js',
    '/manifest.json',
    '/favicon.ico'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Precaching static assets');
                return cache.addAll(STATIC_ASSETS.filter(url => {
                    // Only cache assets that exist
                    return fetch(url, { method: 'HEAD' })
                        .then(response => response.ok)
                        .catch(() => false);
                }));
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[Service Worker] Precache failed:', error);
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // Delete old versions of our caches
                            return cacheName.startsWith('map-tiles-') ||
                                cacheName.startsWith('static-assets-') ||
                                cacheName.startsWith('runtime-');
                        })
                        .filter((cacheName) => {
                            // Keep current version
                            return cacheName !== TILE_CACHE_NAME &&
                                cacheName !== STATIC_CACHE_NAME &&
                                cacheName !== RUNTIME_CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Strategy 1: Cache-first for map tiles
    if (isTileRequest(url)) {
        event.respondWith(handleTileRequest(request));
        return;
    }

    // Strategy 2: Cache-first for static assets
    if (isStaticAsset(url)) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Strategy 3: Network-first for API calls
    if (isApiRequest(url)) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Default: Network-first with cache fallback
    event.respondWith(handleDefaultRequest(request));
});

// Check if request is for a map tile
function isTileRequest(url) {
    return TILE_PATTERNS.some(pattern => pattern.test(url.hostname));
}

// Check if request is for a static asset
function isStaticAsset(url) {
    return url.pathname.startsWith('/static/') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2');
}

// Check if request is an API call
function isApiRequest(url) {
    return url.pathname.startsWith('/api/');
}

// Handle tile requests with cache-first strategy
async function handleTileRequest(request) {
    try {
        const cache = await caches.open(TILE_CACHE_NAME);
        const cached = await cache.match(request);

        // Return cached tile if available and not expired
        if (cached) {
            const cachedDate = new Date(cached.headers.get('date'));
            const now = new Date();
            const age = now - cachedDate;

            if (age < TILE_CACHE_MAX_AGE) {
                console.log('[Service Worker] Tile cache hit:', request.url);
                return cached;
            } else {
                console.log('[Service Worker] Tile cache expired:', request.url);
            }
        }

        // Fetch new tile
        console.log('[Service Worker] Fetching tile:', request.url);
        const response = await fetch(request);

        // Cache successful responses
        if (response && response.status === 200) {
            const responseToCache = response.clone();

            // Add to cache
            cache.put(request, responseToCache);

            // Cleanup old tiles if needed
            cleanupTileCache(cache);
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] Tile fetch failed:', error);

        // Try to return cached tile even if expired
        const cache = await caches.open(TILE_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
            console.log('[Service Worker] Returning expired tile as fallback');
            return cached;
        }

        // Return offline tile placeholder
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="#f0f0f0" width="256" height="256"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cached = await cache.match(request);

        if (cached) {
            console.log('[Service Worker] Static cache hit:', request.url);
            return cached;
        }

        const response = await fetch(request);

        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] Static fetch failed:', error);
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cached = await cache.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        const response = await fetch(request, { timeout: 5000 });

        // Cache successful GET requests
        if (response && response.status === 200 && request.method === 'GET') {
            const cache = await caches.open(RUNTIME_CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] API fetch failed:', error);

        // Try cache fallback for GET requests
        if (request.method === 'GET') {
            const cache = await caches.open(RUNTIME_CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) {
                console.log('[Service Worker] API cache fallback:', request.url);
                return cached;
            }
        }

        return new Response(
            JSON.stringify({ error: 'Network error', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Handle default requests with network-first strategy
async function handleDefaultRequest(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        const cached = await cache.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}

// Cleanup old tiles to stay within max entries limit
async function cleanupTileCache(cache) {
    try {
        const keys = await cache.keys();

        if (keys.length > TILE_CACHE_MAX_ENTRIES) {
            console.log(`[Service Worker] Cleaning up tile cache (${keys.length} entries)`);

            // Get all cached tiles with their dates
            const tilesWithDates = await Promise.all(
                keys.map(async (key) => {
                    const response = await cache.match(key);
                    const date = new Date(response.headers.get('date') || 0);
                    return { key, date };
                })
            );

            // Sort by date (oldest first)
            tilesWithDates.sort((a, b) => a.date - b.date);

            // Delete oldest tiles to get back to max entries
            const tilesToDelete = tilesWithDates.slice(0, keys.length - TILE_CACHE_MAX_ENTRIES);

            await Promise.all(
                tilesToDelete.map(({ key }) => cache.delete(key))
            );

            console.log(`[Service Worker] Deleted ${tilesToDelete.length} old tiles`);
        }
    } catch (error) {
        console.error('[Service Worker] Cache cleanup failed:', error);
    }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }

    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            getCacheSize().then((size) => {
                event.ports[0].postMessage({ size });
            })
        );
    }
});

// Get total cache size
async function getCacheSize() {
    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
        }

        return totalSize;
    } catch (error) {
        console.error('[Service Worker] Failed to calculate cache size:', error);
        return 0;
    }
}

console.log('[Service Worker] Loaded');
