/**
 * Unit tests for generators utility module
 */

const { generateId, generateOrderNumber } = require('../../utils/generators');

describe('Generators Utility', () => {
    describe('generateId', () => {
        test('should generate a unique ID', () => {
            const id = generateId();
            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        test('should generate different IDs on consecutive calls', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });

        test('should generate IDs with timestamp prefix', () => {
            const id = generateId();
            const timestampPart = id.substring(0, 13);
            const timestamp = parseInt(timestampPart);

            // Should be a valid timestamp (within last minute)
            const now = Date.now();
            expect(timestamp).toBeGreaterThan(now - 60000);
            expect(timestamp).toBeLessThanOrEqual(now);
        });

        test('should generate IDs with alphanumeric suffix', () => {
            const id = generateId();
            // Should match pattern: timestamp + alphanumeric
            expect(id).toMatch(/^\d+[a-z0-9]+$/);
        });

        test('should generate 100 unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('generateOrderNumber', () => {
        test('should generate a valid order number', () => {
            const orderNum = generateOrderNumber();
            expect(orderNum).toBeDefined();
            expect(typeof orderNum).toBe('string');
        });

        test('should match the expected format ORD-{timestamp}-{random}', () => {
            const orderNum = generateOrderNumber();
            expect(orderNum).toMatch(/^ORD-\d+-\d{3}$/);
        });

        test('should generate different order numbers on consecutive calls', () => {
            const orderNum1 = generateOrderNumber();
            const orderNum2 = generateOrderNumber();
            expect(orderNum1).not.toBe(orderNum2);
        });

        test('should have 3-digit random suffix', () => {
            const orderNum = generateOrderNumber();
            const parts = orderNum.split('-');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe('ORD');
            expect(parts[2]).toMatch(/^\d{3}$/);
        });

        test('should generate order numbers with valid timestamp', () => {
            const orderNum = generateOrderNumber();
            const parts = orderNum.split('-');
            const timestamp = parseInt(parts[1]);

            const now = Date.now();
            expect(timestamp).toBeGreaterThan(now - 1000);
            expect(timestamp).toBeLessThanOrEqual(now);
        });
    });
});
