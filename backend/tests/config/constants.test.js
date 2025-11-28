/**
 * Unit tests for constants configuration module
 */

const {
    LOCATION_CACHE_KEYS,
    LOCATION_CACHE_TTLS,
    COMMON_COUNTRIES,
    ORDER_STATUS,
    BID_STATUS,
    PAYMENT_STATUS,
    USER_ROLES
} = require('../../config/constants');

describe('Constants Configuration', () => {
    describe('LOCATION_CACHE_KEYS', () => {
        test('should have COUNTRIES key', () => {
            expect(LOCATION_CACHE_KEYS).toHaveProperty('COUNTRIES');
            expect(LOCATION_CACHE_KEYS.COUNTRIES).toBe('countries');
        });

        test('should be an object', () => {
            expect(typeof LOCATION_CACHE_KEYS).toBe('object');
        });
    });

    describe('LOCATION_CACHE_TTLS', () => {
        test('should have all required TTL values', () => {
            expect(LOCATION_CACHE_TTLS).toHaveProperty('COUNTRIES');
            expect(LOCATION_CACHE_TTLS).toHaveProperty('CITIES');
            expect(LOCATION_CACHE_TTLS).toHaveProperty('AREAS');
            expect(LOCATION_CACHE_TTLS).toHaveProperty('STREETS');
        });

        test('should have COUNTRIES TTL of 7 days', () => {
            const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;
            expect(LOCATION_CACHE_TTLS.COUNTRIES).toBe(sevenDaysInMs);
        });

        test('should have CITIES TTL of 6 hours', () => {
            const sixHoursInMs = 1000 * 60 * 60 * 6;
            expect(LOCATION_CACHE_TTLS.CITIES).toBe(sixHoursInMs);
        });

        test('should have AREAS TTL of 6 hours', () => {
            const sixHoursInMs = 1000 * 60 * 60 * 6;
            expect(LOCATION_CACHE_TTLS.AREAS).toBe(sixHoursInMs);
        });

        test('should have STREETS TTL of 6 hours', () => {
            const sixHoursInMs = 1000 * 60 * 60 * 6;
            expect(LOCATION_CACHE_TTLS.STREETS).toBe(sixHoursInMs);
        });

        test('all TTL values should be positive numbers', () => {
            Object.values(LOCATION_CACHE_TTLS).forEach(ttl => {
                expect(typeof ttl).toBe('number');
                expect(ttl).toBeGreaterThan(0);
            });
        });
    });

    describe('COMMON_COUNTRIES', () => {
        test('should be an array', () => {
            expect(Array.isArray(COMMON_COUNTRIES)).toBe(true);
        });

        test('should contain 193 countries', () => {
            expect(COMMON_COUNTRIES.length).toBe(193);
        });

        test('should contain major countries', () => {
            expect(COMMON_COUNTRIES).toContain('United States');
            expect(COMMON_COUNTRIES).toContain('United Kingdom');
            expect(COMMON_COUNTRIES).toContain('Canada');
            expect(COMMON_COUNTRIES).toContain('Australia');
            expect(COMMON_COUNTRIES).toContain('Germany');
            expect(COMMON_COUNTRIES).toContain('France');
            expect(COMMON_COUNTRIES).toContain('Japan');
            expect(COMMON_COUNTRIES).toContain('China');
            expect(COMMON_COUNTRIES).toContain('India');
        });

        test('should not contain duplicates', () => {
            const uniqueCountries = new Set(COMMON_COUNTRIES);
            expect(uniqueCountries.size).toBe(COMMON_COUNTRIES.length);
        });

        test('all country names should be strings', () => {
            COMMON_COUNTRIES.forEach(country => {
                expect(typeof country).toBe('string');
                expect(country.length).toBeGreaterThan(0);
            });
        });
    });

    describe('ORDER_STATUS', () => {
        test('should have all required status values', () => {
            expect(ORDER_STATUS).toHaveProperty('PENDING_BIDS');
            expect(ORDER_STATUS).toHaveProperty('ACCEPTED');
            expect(ORDER_STATUS).toHaveProperty('PICKED_UP');
            expect(ORDER_STATUS).toHaveProperty('IN_TRANSIT');
            expect(ORDER_STATUS).toHaveProperty('DELIVERED');
            expect(ORDER_STATUS).toHaveProperty('CANCELLED');
        });

        test('should have correct status values', () => {
            expect(ORDER_STATUS.PENDING_BIDS).toBe('pending_bids');
            expect(ORDER_STATUS.ACCEPTED).toBe('accepted');
            expect(ORDER_STATUS.PICKED_UP).toBe('picked_up');
            expect(ORDER_STATUS.IN_TRANSIT).toBe('in_transit');
            expect(ORDER_STATUS.DELIVERED).toBe('delivered');
            expect(ORDER_STATUS.CANCELLED).toBe('cancelled');
        });

        test('should have 6 status values', () => {
            expect(Object.keys(ORDER_STATUS).length).toBe(6);
        });
    });

    describe('BID_STATUS', () => {
        test('should have all required status values', () => {
            expect(BID_STATUS).toHaveProperty('PENDING');
            expect(BID_STATUS).toHaveProperty('ACCEPTED');
            expect(BID_STATUS).toHaveProperty('REJECTED');
        });

        test('should have correct status values', () => {
            expect(BID_STATUS.PENDING).toBe('pending');
            expect(BID_STATUS.ACCEPTED).toBe('accepted');
            expect(BID_STATUS.REJECTED).toBe('rejected');
        });

        test('should have 3 status values', () => {
            expect(Object.keys(BID_STATUS).length).toBe(3);
        });
    });

    describe('PAYMENT_STATUS', () => {
        test('should have all required status values', () => {
            expect(PAYMENT_STATUS).toHaveProperty('PENDING');
            expect(PAYMENT_STATUS).toHaveProperty('PROCESSING');
            expect(PAYMENT_STATUS).toHaveProperty('COMPLETED');
            expect(PAYMENT_STATUS).toHaveProperty('FAILED');
            expect(PAYMENT_STATUS).toHaveProperty('REFUNDED');
            expect(PAYMENT_STATUS).toHaveProperty('CANCELLED');
        });

        test('should have correct status values', () => {
            expect(PAYMENT_STATUS.PENDING).toBe('pending');
            expect(PAYMENT_STATUS.PROCESSING).toBe('processing');
            expect(PAYMENT_STATUS.COMPLETED).toBe('completed');
            expect(PAYMENT_STATUS.FAILED).toBe('failed');
            expect(PAYMENT_STATUS.REFUNDED).toBe('refunded');
            expect(PAYMENT_STATUS.CANCELLED).toBe('cancelled');
        });

        test('should have 6 status values', () => {
            expect(Object.keys(PAYMENT_STATUS).length).toBe(6);
        });
    });

    describe('USER_ROLES', () => {
        test('should have all required role values', () => {
            expect(USER_ROLES).toHaveProperty('CUSTOMER');
            expect(USER_ROLES).toHaveProperty('DRIVER');
            expect(USER_ROLES).toHaveProperty('ADMIN');
            expect(USER_ROLES).toHaveProperty('VENDOR');
        });

        test('should have correct role values', () => {
            expect(USER_ROLES.CUSTOMER).toBe('customer');
            expect(USER_ROLES.DRIVER).toBe('driver');
            expect(USER_ROLES.ADMIN).toBe('admin');
            expect(USER_ROLES.VENDOR).toBe('vendor');
        });

        test('should have 4 role values', () => {
            expect(Object.keys(USER_ROLES).length).toBe(4);
        });
    });
});
