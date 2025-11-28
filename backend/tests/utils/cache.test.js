/**
 * Unit tests for cache utility module
 */

const {
    locationMemoryCache,
    getCountriesFromCache,
    setCountriesCache,
    getListFromMemory,
    setListInMemory,
    getPersistedCache,
    persistCache
} = require('../../utils/cache');

describe('Cache Utility', () => {
    beforeEach(() => {
        // Reset cache before each test
        locationMemoryCache.countries = { data: null, expiresAt: 0 };
        locationMemoryCache.cities.clear();
        locationMemoryCache.areas.clear();
        locationMemoryCache.streets.clear();
    });

    describe('locationMemoryCache', () => {
        test('should have correct structure', () => {
            expect(locationMemoryCache).toHaveProperty('countries');
            expect(locationMemoryCache).toHaveProperty('cities');
            expect(locationMemoryCache).toHaveProperty('areas');
            expect(locationMemoryCache).toHaveProperty('streets');
        });

        test('cities should be a Map', () => {
            expect(locationMemoryCache.cities instanceof Map).toBe(true);
        });

        test('areas should be a Map', () => {
            expect(locationMemoryCache.areas instanceof Map).toBe(true);
        });

        test('streets should be a Map', () => {
            expect(locationMemoryCache.streets instanceof Map).toBe(true);
        });
    });

    describe('getCountriesFromCache', () => {
        test('should return null when cache is empty', () => {
            const result = getCountriesFromCache();
            expect(result).toBeNull();
        });

        test('should return null when cache is expired', () => {
            locationMemoryCache.countries = {
                data: ['USA', 'UK'],
                expiresAt: Date.now() - 1000 // Expired 1 second ago
            };
            const result = getCountriesFromCache();
            expect(result).toBeNull();
        });

        test('should return cached data when not expired', () => {
            const testData = ['USA', 'UK', 'Canada'];
            locationMemoryCache.countries = {
                data: testData,
                expiresAt: Date.now() + 10000 // Expires in 10 seconds
            };
            const result = getCountriesFromCache();
            expect(result).toEqual(testData);
        });
    });

    describe('setCountriesCache', () => {
        test('should set cache data', () => {
            const testData = ['USA', 'UK', 'Canada'];
            setCountriesCache(testData);

            expect(locationMemoryCache.countries.data).toEqual(testData);
            expect(locationMemoryCache.countries.expiresAt).toBeGreaterThan(Date.now());
        });

        test('should set expiration time correctly', () => {
            const testData = ['USA'];
            const beforeSet = Date.now();
            setCountriesCache(testData);
            const afterSet = Date.now();

            const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;
            expect(locationMemoryCache.countries.expiresAt).toBeGreaterThanOrEqual(beforeSet + sevenDaysInMs);
            expect(locationMemoryCache.countries.expiresAt).toBeLessThanOrEqual(afterSet + sevenDaysInMs + 100);
        });

        test('should overwrite existing cache', () => {
            setCountriesCache(['Old']);
            setCountriesCache(['New']);

            expect(locationMemoryCache.countries.data).toEqual(['New']);
        });
    });

    describe('getListFromMemory', () => {
        test('should return null for non-existent key', () => {
            const result = getListFromMemory(locationMemoryCache.cities, 'nonexistent');
            expect(result).toBeNull();
        });

        test('should return null for expired entry', () => {
            const bucket = locationMemoryCache.cities;
            bucket.set('testKey', {
                data: ['data'],
                expiresAt: Date.now() - 1000
            });

            const result = getListFromMemory(bucket, 'testKey');
            expect(result).toBeNull();
        });

        test('should delete expired entry', () => {
            const bucket = locationMemoryCache.cities;
            bucket.set('testKey', {
                data: ['data'],
                expiresAt: Date.now() - 1000
            });

            getListFromMemory(bucket, 'testKey');
            expect(bucket.has('testKey')).toBe(false);
        });

        test('should return cached data when not expired', () => {
            const bucket = locationMemoryCache.cities;
            const testData = ['City1', 'City2'];
            bucket.set('testKey', {
                data: testData,
                expiresAt: Date.now() + 10000
            });

            const result = getListFromMemory(bucket, 'testKey');
            expect(result).toEqual(testData);
        });
    });

    describe('setListInMemory', () => {
        test('should set data in cache bucket', () => {
            const bucket = locationMemoryCache.cities;
            const testData = ['City1', 'City2'];
            const ttl = 5000;

            setListInMemory(bucket, 'testKey', testData, ttl);

            expect(bucket.has('testKey')).toBe(true);
            const entry = bucket.get('testKey');
            expect(entry.data).toEqual(testData);
            expect(entry.expiresAt).toBeGreaterThan(Date.now());
        });

        test('should set correct expiration time', () => {
            const bucket = locationMemoryCache.cities;
            const testData = ['City1'];
            const ttl = 5000;
            const beforeSet = Date.now();

            setListInMemory(bucket, 'testKey', testData, ttl);
            const afterSet = Date.now();

            const entry = bucket.get('testKey');
            expect(entry.expiresAt).toBeGreaterThanOrEqual(beforeSet + ttl);
            expect(entry.expiresAt).toBeLessThanOrEqual(afterSet + ttl + 100);
        });

        test('should overwrite existing entry', () => {
            const bucket = locationMemoryCache.cities;
            setListInMemory(bucket, 'testKey', ['Old'], 5000);
            setListInMemory(bucket, 'testKey', ['New'], 5000);

            const entry = bucket.get('testKey');
            expect(entry.data).toEqual(['New']);
        });
    });

    describe('getPersistedCache', () => {
        let mockPool;

        beforeEach(() => {
            mockPool = {
                query: jest.fn()
            };
        });

        test('should return null when no cache entry exists', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });

            const result = await getPersistedCache(mockPool, 'testKey');

            expect(result).toBeNull();
            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT payload, expires_at FROM location_cache WHERE cache_key = $1',
                ['testKey']
            );
        });

        test('should return null and delete expired entry', async () => {
            const expiredDate = new Date(Date.now() - 1000);
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{ payload: { data: 'test' }, expires_at: expiredDate }]
                })
                .mockResolvedValueOnce({ rows: [] });

            const result = await getPersistedCache(mockPool, 'testKey');

            expect(result).toBeNull();
            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(mockPool.query).toHaveBeenNthCalledWith(2,
                'DELETE FROM location_cache WHERE cache_key = $1',
                ['testKey']
            );
        });

        test('should return cached payload when not expired', async () => {
            const futureDate = new Date(Date.now() + 10000);
            const testPayload = { data: 'test data' };
            mockPool.query.mockResolvedValue({
                rows: [{ payload: testPayload, expires_at: futureDate }]
            });

            const result = await getPersistedCache(mockPool, 'testKey');

            expect(result).toEqual(testPayload);
        });

        test('should return null on database error', async () => {
            mockPool.query.mockRejectedValue(new Error('Database error'));

            const result = await getPersistedCache(mockPool, 'testKey');

            expect(result).toBeNull();
        });
    });

    describe('persistCache', () => {
        let mockPool;

        beforeEach(() => {
            mockPool = {
                query: jest.fn()
            };
        });

        test('should insert cache entry with correct expiration', async () => {
            mockPool.query.mockResolvedValue({});

            const testPayload = { data: 'test' };
            const ttl = 5000;

            await persistCache(mockPool, 'testKey', testPayload, ttl);

            expect(mockPool.query).toHaveBeenCalled();
            const call = mockPool.query.mock.calls[0];
            expect(call[0]).toContain('INSERT INTO location_cache');
            expect(call[1][0]).toBe('testKey');
            expect(call[1][1]).toEqual(testPayload);

            const expiresAt = call[1][2];
            expect(expiresAt instanceof Date).toBe(true);
            expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        test('should use ON CONFLICT to update existing entries', async () => {
            mockPool.query.mockResolvedValue({});

            await persistCache(mockPool, 'testKey', { data: 'test' }, 5000);

            const query = mockPool.query.mock.calls[0][0];
            expect(query).toContain('ON CONFLICT');
            expect(query).toContain('DO UPDATE');
        });

        test('should not throw on database error', async () => {
            mockPool.query.mockRejectedValue(new Error('Database error'));

            // Should not throw
            await expect(persistCache(mockPool, 'testKey', {}, 5000)).resolves.not.toThrow();
        });
    });
});
