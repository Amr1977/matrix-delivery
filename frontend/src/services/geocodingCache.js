// Geocoding Cache Service
// Caches address <-> coordinates mappings using IndexedDB

const DB_NAME = 'matrix-delivery-cache';
const DB_VERSION = 1;
const GEOCODE_STORE = 'geocodes';
const REVERSE_GEOCODE_STORE = 'reverse-geocodes';
const ROUTE_STORE = 'routes';

// Cache expiration times
const GEOCODE_EXPIRY = 90 * 24 * 60 * 60 * 1000; // 90 days
const ROUTE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Maximum entries before cleanup
const MAX_GEOCODE_ENTRIES = 1000;
const MAX_ROUTE_ENTRIES = 100;

class GeocodingCache {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    // Initialize IndexedDB
    async init() {
        if (!('indexedDB' in window)) {
            console.warn('[GeocodingCache] IndexedDB not supported');
            return null;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[GeocodingCache] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[GeocodingCache] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create geocodes store
                if (!db.objectStoreNames.contains(GEOCODE_STORE)) {
                    const geocodeStore = db.createObjectStore(GEOCODE_STORE, { keyPath: 'address' });
                    geocodeStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[GeocodingCache] Created geocodes store');
                }

                // Create reverse geocodes store
                if (!db.objectStoreNames.contains(REVERSE_GEOCODE_STORE)) {
                    const reverseStore = db.createObjectStore(REVERSE_GEOCODE_STORE, { keyPath: 'key' });
                    reverseStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[GeocodingCache] Created reverse-geocodes store');
                }

                // Create routes store
                if (!db.objectStoreNames.contains(ROUTE_STORE)) {
                    const routeStore = db.createObjectStore(ROUTE_STORE, { keyPath: 'key' });
                    routeStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[GeocodingCache] Created routes store');
                }
            };
        });
    }

    // Get cached geocode result
    async getCachedGeocode(address) {
        try {
            await this.initPromise;
            if (!this.db) return null;

            const normalizedAddress = this.normalizeAddress(address);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([GEOCODE_STORE], 'readonly');
                const store = transaction.objectStore(GEOCODE_STORE);
                const request = store.get(normalizedAddress);

                request.onsuccess = () => {
                    const result = request.result;

                    if (!result) {
                        resolve(null);
                        return;
                    }

                    // Check if expired
                    const now = Date.now();
                    if (now > result.expiresAt) {
                        console.log('[GeocodingCache] Geocode expired:', normalizedAddress);
                        this.deleteGeocode(normalizedAddress); // Cleanup expired entry
                        resolve(null);
                        return;
                    }

                    console.log('[GeocodingCache] Cache hit:', normalizedAddress);
                    resolve(result.coordinates);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to get geocode:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] getCachedGeocode error:', error);
            return null;
        }
    }

    // Cache geocode result
    async cacheGeocode(address, coordinates) {
        try {
            await this.initPromise;
            if (!this.db) return false;

            const normalizedAddress = this.normalizeAddress(address);
            const now = Date.now();

            const entry = {
                address: normalizedAddress,
                coordinates: {
                    lat: coordinates.lat,
                    lng: coordinates.lng
                },
                timestamp: now,
                expiresAt: now + GEOCODE_EXPIRY
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([GEOCODE_STORE], 'readwrite');
                const store = transaction.objectStore(GEOCODE_STORE);
                const request = store.put(entry);

                request.onsuccess = () => {
                    console.log('[GeocodingCache] Cached geocode:', normalizedAddress);
                    this.cleanupGeocodes(); // Async cleanup
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to cache geocode:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] cacheGeocode error:', error);
            return false;
        }
    }

    // Get cached reverse geocode (coordinates -> address)
    async getCachedAddress(lat, lng) {
        try {
            await this.initPromise;
            if (!this.db) return null;

            const key = this.makeLatLngKey(lat, lng);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([REVERSE_GEOCODE_STORE], 'readonly');
                const store = transaction.objectStore(REVERSE_GEOCODE_STORE);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;

                    if (!result) {
                        resolve(null);
                        return;
                    }

                    // Check if expired
                    const now = Date.now();
                    if (now > result.expiresAt) {
                        console.log('[GeocodingCache] Reverse geocode expired:', key);
                        this.deleteReverseGeocode(key);
                        resolve(null);
                        return;
                    }

                    console.log('[GeocodingCache] Reverse cache hit:', key);
                    resolve(result.address);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to get reverse geocode:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] getCachedAddress error:', error);
            return null;
        }
    }

    // Cache reverse geocode result
    async cacheAddress(lat, lng, address) {
        try {
            await this.initPromise;
            if (!this.db) return false;

            const key = this.makeLatLngKey(lat, lng);
            const now = Date.now();

            const entry = {
                key,
                address,
                lat,
                lng,
                timestamp: now,
                expiresAt: now + GEOCODE_EXPIRY
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([REVERSE_GEOCODE_STORE], 'readwrite');
                const store = transaction.objectStore(REVERSE_GEOCODE_STORE);
                const request = store.put(entry);

                request.onsuccess = () => {
                    console.log('[GeocodingCache] Cached reverse geocode:', key);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to cache reverse geocode:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] cacheAddress error:', error);
            return false;
        }
    }

    // Get cached route
    async getCachedRoute(from, to) {
        try {
            await this.initPromise;
            if (!this.db) return null;

            const key = this.makeRouteKey(from, to);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([ROUTE_STORE], 'readonly');
                const store = transaction.objectStore(ROUTE_STORE);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;

                    if (!result) {
                        resolve(null);
                        return;
                    }

                    // Check if expired
                    const now = Date.now();
                    if (now > result.expiresAt) {
                        console.log('[GeocodingCache] Route expired:', key);
                        this.deleteRoute(key);
                        resolve(null);
                        return;
                    }

                    console.log('[GeocodingCache] Route cache hit:', key);
                    resolve(result.route);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to get route:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] getCachedRoute error:', error);
            return null;
        }
    }

    // Cache route
    async cacheRoute(from, to, route) {
        try {
            await this.initPromise;
            if (!this.db) return false;

            const key = this.makeRouteKey(from, to);
            const now = Date.now();

            const entry = {
                key,
                from,
                to,
                route,
                timestamp: now,
                expiresAt: now + ROUTE_EXPIRY
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([ROUTE_STORE], 'readwrite');
                const store = transaction.objectStore(ROUTE_STORE);
                const request = store.put(entry);

                request.onsuccess = () => {
                    console.log('[GeocodingCache] Cached route:', key);
                    this.cleanupRoutes(); // Async cleanup
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[GeocodingCache] Failed to cache route:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('[GeocodingCache] cacheRoute error:', error);
            return false;
        }
    }

    // Cleanup old geocodes (LRU eviction)
    async cleanupGeocodes() {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([GEOCODE_STORE], 'readwrite');
            const store = transaction.objectStore(GEOCODE_STORE);
            const index = store.index('timestamp');

            const countRequest = store.count();
            countRequest.onsuccess = () => {
                const count = countRequest.result;

                if (count > MAX_GEOCODE_ENTRIES) {
                    const toDelete = count - MAX_GEOCODE_ENTRIES;
                    console.log(`[GeocodingCache] Cleaning up ${toDelete} old geocodes`);

                    // Get oldest entries
                    const cursorRequest = index.openCursor();
                    let deleted = 0;

                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && deleted < toDelete) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        }
                    };
                }
            };
        } catch (error) {
            console.error('[GeocodingCache] Cleanup error:', error);
        }
    }

    // Cleanup old routes
    async cleanupRoutes() {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([ROUTE_STORE], 'readwrite');
            const store = transaction.objectStore(ROUTE_STORE);
            const index = store.index('timestamp');

            const countRequest = store.count();
            countRequest.onsuccess = () => {
                const count = countRequest.result;

                if (count > MAX_ROUTE_ENTRIES) {
                    const toDelete = count - MAX_ROUTE_ENTRIES;
                    console.log(`[GeocodingCache] Cleaning up ${toDelete} old routes`);

                    const cursorRequest = index.openCursor();
                    let deleted = 0;

                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && deleted < toDelete) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        }
                    };
                }
            };
        } catch (error) {
            console.error('[GeocodingCache] Route cleanup error:', error);
        }
    }

    // Delete specific geocode
    async deleteGeocode(address) {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([GEOCODE_STORE], 'readwrite');
            const store = transaction.objectStore(GEOCODE_STORE);
            store.delete(address);
        } catch (error) {
            console.error('[GeocodingCache] Delete geocode error:', error);
        }
    }

    // Delete specific reverse geocode
    async deleteReverseGeocode(key) {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([REVERSE_GEOCODE_STORE], 'readwrite');
            const store = transaction.objectStore(REVERSE_GEOCODE_STORE);
            store.delete(key);
        } catch (error) {
            console.error('[GeocodingCache] Delete reverse geocode error:', error);
        }
    }

    // Delete specific route
    async deleteRoute(key) {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([ROUTE_STORE], 'readwrite');
            const store = transaction.objectStore(ROUTE_STORE);
            store.delete(key);
        } catch (error) {
            console.error('[GeocodingCache] Delete route error:', error);
        }
    }

    // Clear all caches
    async clearAll() {
        try {
            await this.initPromise;
            if (!this.db) return;

            const transaction = this.db.transaction([GEOCODE_STORE, REVERSE_GEOCODE_STORE, ROUTE_STORE], 'readwrite');

            transaction.objectStore(GEOCODE_STORE).clear();
            transaction.objectStore(REVERSE_GEOCODE_STORE).clear();
            transaction.objectStore(ROUTE_STORE).clear();

            console.log('[GeocodingCache] All caches cleared');
            return true;
        } catch (error) {
            console.error('[GeocodingCache] Clear all error:', error);
            return false;
        }
    }

    // Get cache statistics
    async getStats() {
        try {
            await this.initPromise;
            if (!this.db) return null;

            const transaction = this.db.transaction([GEOCODE_STORE, REVERSE_GEOCODE_STORE, ROUTE_STORE], 'readonly');

            const geocodeCount = await new Promise((resolve) => {
                const request = transaction.objectStore(GEOCODE_STORE).count();
                request.onsuccess = () => resolve(request.result);
            });

            const reverseCount = await new Promise((resolve) => {
                const request = transaction.objectStore(REVERSE_GEOCODE_STORE).count();
                request.onsuccess = () => resolve(request.result);
            });

            const routeCount = await new Promise((resolve) => {
                const request = transaction.objectStore(ROUTE_STORE).count();
                request.onsuccess = () => resolve(request.result);
            });

            return {
                geocodes: geocodeCount,
                reverseGeocodes: reverseCount,
                routes: routeCount,
                total: geocodeCount + reverseCount + routeCount
            };
        } catch (error) {
            console.error('[GeocodingCache] Get stats error:', error);
            return null;
        }
    }

    // Helper: Normalize address for consistent caching
    normalizeAddress(address) {
        return address.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    // Helper: Create lat/lng key
    makeLatLngKey(lat, lng) {
        // Round to 5 decimal places (~1.1m precision)
        const roundedLat = Math.round(lat * 100000) / 100000;
        const roundedLng = Math.round(lng * 100000) / 100000;
        return `${roundedLat},${roundedLng}`;
    }

    // Helper: Create route key
    makeRouteKey(from, to) {
        const fromKey = this.makeLatLngKey(from.lat, from.lng);
        const toKey = this.makeLatLngKey(to.lat, to.lng);
        return `${fromKey}_${toKey}`;
    }
}

// Export singleton instance
const geocodingCache = new GeocodingCache();
export default geocodingCache;
