/**
 * Map Tile Cache Utility
 * Provides efficient caching for map tiles without using service workers
 */

const CACHE_NAME = 'map-tiles-v1';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Cache a map tile
 * @param url - The tile URL to cache
 * @returns The cached or fetched response
 */
export const cacheMapTile = async (url: string): Promise<Response> => {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url);

        // Return cached tile if available and not expired
        if (cached) {
            const cachedDate = new Date(cached.headers.get('date') || '');
            const age = Date.now() - cachedDate.getTime();

            if (age < MAX_CACHE_AGE) {
                return cached;
            }
        }

        // Fetch new tile and cache it
        const response = await fetch(url);
        if (response.ok) {
            cache.put(url, response.clone());
        }
        return response;
    } catch (error) {
        console.error('Map tile cache error:', error);
        // Fallback to direct fetch
        return fetch(url);
    }
};

/**
 * Clear old map tile cache
 */
export const clearMapTileCache = async (): Promise<void> => {
    try {
        await caches.delete(CACHE_NAME);
        console.log('Map tile cache cleared');
    } catch (error) {
        console.error('Failed to clear map tile cache:', error);
    }
};

/**
 * Get cache size (approximate)
 */
export const getMapTileCacheSize = async (): Promise<number> => {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        return keys.length;
    } catch (error) {
        console.error('Failed to get cache size:', error);
        return 0;
    }
};
