/**
 * Caching utilities for location and other data
 */

const { LOCATION_CACHE_TTLS } = require('../config/constants');

// Cache configuration - prevent unbounded memory growth
const MAX_CACHE_ENTRIES_PER_BUCKET = 500;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let cleanupIntervalId = null;

// In-memory cache structure
const locationMemoryCache = {
    countries: { data: null, expiresAt: 0 },
    cities: new Map(),
    areas: new Map(),
    streets: new Map()
};

/**
 * Get countries from memory cache
 * @returns {Array|null} Cached countries or null if expired
 */
const getCountriesFromCache = () => {
    const entry = locationMemoryCache.countries;
    if (entry?.data && entry.expiresAt > Date.now()) {
        return entry.data;
    }
    return null;
};

/**
 * Set countries in memory cache
 * @param {Array} data - Countries data to cache
 */
const setCountriesCache = (data) => {
    locationMemoryCache.countries = {
        data,
        expiresAt: Date.now() + LOCATION_CACHE_TTLS.COUNTRIES
    };
};

/**
 * Get data from memory cache bucket
 * @param {Map} bucket - Cache bucket (cities, areas, or streets)
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired
 */
const getListFromMemory = (bucket, key) => {
    const entry = bucket.get(key);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.data;
    }
    if (entry) {
        bucket.delete(key);
    }
    return null;
};

/**
 * Set data in memory cache bucket
 * @param {Map} bucket - Cache bucket
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
const setListInMemory = (bucket, key, data, ttl) => {
    bucket.set(key, {
        data,
        expiresAt: Date.now() + ttl
    });
};

/**
 * Get data from persistent database cache
 * @param {Object} pool - PostgreSQL pool
 * @param {string} cacheKey - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
const getPersistedCache = async (pool, cacheKey) => {
    try {
        const result = await pool.query(
            'SELECT payload, expires_at FROM location_cache WHERE cache_key = $1',
            [cacheKey]
        );
        if (result.rows.length === 0) {
            return null;
        }
        const record = result.rows[0];
        if (new Date(record.expires_at) < new Date()) {
            await pool.query('DELETE FROM location_cache WHERE cache_key = $1', [cacheKey]);
            return null;
        }
        return record.payload;
    } catch (error) {
        console.warn('Location cache read error (non-critical):', error.message);
        return null;
    }
};

/**
 * Persist data to database cache
 * @param {Object} pool - PostgreSQL pool
 * @param {string} cacheKey - Cache key
 * @param {any} payload - Data to cache
 * @param {number} ttlMs - Time to live in milliseconds
 */
const persistCache = async (pool, cacheKey, payload, ttlMs) => {
    try {
        const expiresAt = new Date(Date.now() + ttlMs);
        await pool.query(
            `INSERT INTO location_cache (cache_key, payload, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (cache_key) DO UPDATE
       SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
            [cacheKey, payload, expiresAt]
        );
    } catch (error) {
        console.warn('Location cache write error (non-critical):', error.message);
    }
};

/**
 * Cleanup expired entries and enforce size limits
 * Prevents unbounded memory growth in location caches
 * @returns {number} Number of entries cleaned
 */
const cleanupCache = () => {
    const now = Date.now();
    let cleaned = 0;

    const buckets = [
        locationMemoryCache.cities,
        locationMemoryCache.areas,
        locationMemoryCache.streets
    ];

    for (const bucket of buckets) {
        // Remove expired entries
        for (const [key, entry] of bucket) {
            if (entry.expiresAt <= now) {
                bucket.delete(key);
                cleaned++;
            }
        }

        // Enforce max size (evict oldest entries if over limit)
        while (bucket.size > MAX_CACHE_ENTRIES_PER_BUCKET) {
            const firstKey = bucket.keys().next().value;
            bucket.delete(firstKey);
            cleaned++;
        }
    }

    return cleaned;
};

/**
 * Start periodic cache cleanup
 * Should be called on server startup
 */
const startCacheCleanup = () => {
    if (cleanupIntervalId) return;
    cleanupIntervalId = setInterval(cleanupCache, CLEANUP_INTERVAL_MS);
    // Prevent interval from keeping process alive during shutdown
    if (cleanupIntervalId.unref) {
        cleanupIntervalId.unref();
    }
};

/**
 * Stop cache cleanup (for graceful shutdown)
 */
const stopCacheCleanup = () => {
    if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
    }
};

module.exports = {
    locationMemoryCache,
    getCountriesFromCache,
    setCountriesCache,
    getListFromMemory,
    setListInMemory,
    getPersistedCache,
    persistCache,
    cleanupCache,
    startCacheCleanup,
    stopCacheCleanup
};
