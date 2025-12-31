/**
 * Unit tests for validators utility module
 */

const { validateEmail, validatePassword, validatePhone, validateRole } = require('../../../utils/validators');

describe('Validators Utility', () => {
    describe('validateEmail', () => {
        test('should accept valid email addresses', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('test.user@example.com')).toBe(true);
            expect(validateEmail('user+tag@example.co.uk')).toBe(true);
            expect(validateEmail('user123@test-domain.com')).toBe(true);
        });

        test('should reject invalid email addresses', () => {
            expect(validateEmail('invalid')).toBe(false);
            expect(validateEmail('invalid@')).toBe(false);
            expect(validateEmail('@example.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('user @example.com')).toBe(false);
            expect(validateEmail('user@example')).toBe(false);
        });

        test('should sanitize dangerous characters', () => {
            // Dangerous characters are removed by sanitizeString
            expect(validateEmail('user<script>@example.com')).toBe(true);
            expect(validateEmail('user"@example.com')).toBe(true);
        });

        test('should handle empty string', () => {
            expect(validateEmail('')).toBe(false);
        });

        test('should handle null and undefined', () => {
            expect(validateEmail(null)).toBe(false);
            expect(validateEmail(undefined)).toBe(false);
        });

        test('should trim whitespace before validation', () => {
            expect(validateEmail('  user@example.com  ')).toBe(true);
        });

        test('should enforce maximum length of 255', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(validateEmail(longEmail)).toBe(false);
        });
    });

    describe('validatePassword', () => {
        test('should accept passwords with 8 or more characters', () => {
            expect(validatePassword('12345678')).toBe(true);
            expect(validatePassword('password123')).toBe(true);
            expect(validatePassword('a'.repeat(50))).toBe(true);
        });

        test('should reject passwords with less than 8 characters', () => {
            expect(validatePassword('1234567')).toBe(false);
            expect(validatePassword('short')).toBe(false);
            expect(validatePassword('abc')).toBe(false);
        });

        test('should reject empty password', () => {
            expect(validatePassword('')).toBeFalsy();
        });

        test('should reject null and undefined', () => {
            expect(validatePassword(null)).toBeFalsy();
            expect(validatePassword(undefined)).toBeFalsy();
        });

        test('should trim whitespace', () => {
            expect(validatePassword('  12345678  ')).toBe(true);
            expect(validatePassword('  short  ')).toBe(false);
        });

        test('should accept passwords with special characters', () => {
            expect(validatePassword('Pass@123!')).toBe(true);
            expect(validatePassword('P@ssw0rd#2023')).toBe(true);
        });

        test('should enforce maximum length of 255', () => {
            const longPassword = 'a'.repeat(300);
            expect(validatePassword(longPassword)).toBe(true);
        });
    });

    describe('validatePhone', () => {
        test('should accept valid phone numbers', () => {
            expect(validatePhone('1234567890')).toBe(true);
            expect(validatePhone('+1 (555) 123-4567')).toBe(true);
            expect(validatePhone('555-123-4567')).toBe(true);
            expect(validatePhone('+44 20 7946 0958')).toBe(true);
            expect(validatePhone('(123) 456-7890')).toBe(true);
        });

        test('should reject phone numbers with less than 10 characters', () => {
            expect(validatePhone('123456789')).toBe(false);
            expect(validatePhone('12345')).toBe(false);
        });

        test('should reject phone numbers with invalid characters', () => {
            expect(validatePhone('123-456-ABCD')).toBe(false);
            expect(validatePhone('phone number')).toBe(false);
            expect(validatePhone('123@456#7890')).toBe(false);
        });

        test('should accept phone numbers with valid separators', () => {
            expect(validatePhone('123 456 7890')).toBe(true);
            expect(validatePhone('123-456-7890')).toBe(true);
            expect(validatePhone('+1-555-123-4567')).toBe(true);
        });

        test('should reject empty string', () => {
            expect(validatePhone('')).toBe(false);
        });

        test('should reject null and undefined', () => {
            expect(validatePhone(null)).toBe(false);
            expect(validatePhone(undefined)).toBe(false);
        });

        test('should trim whitespace', () => {
            expect(validatePhone('  1234567890  ')).toBe(true);
        });

        test('should enforce maximum length of 50', () => {
            const longPhone = '1'.repeat(60);
            expect(validatePhone(longPhone)).toBe(true);
        });
    });

    describe('validateRole', () => {
        test('should accept valid granted_roles', () => {
            expect(validateRole('customer')).toBe(true);
            expect(validateRole('driver')).toBe(true);
            expect(validateRole('admin')).toBe(true);
            expect(validateRole('vendor')).toBe(true);
        });

        test('should reject invalid granted_roles', () => {
            expect(validateRole('superuser')).toBe(false);
            expect(validateRole('moderator')).toBe(false);
            expect(validateRole('user')).toBe(false);
            expect(validateRole('ADMIN')).toBe(false);
        });

        test('should reject empty string', () => {
            expect(validateRole('')).toBe(false);
        });

        test('should reject null and undefined', () => {
            expect(validateRole(null)).toBe(false);
            expect(validateRole(undefined)).toBe(false);
        });

        test('should be case sensitive', () => {
            expect(validateRole('Customer')).toBe(false);
            expect(validateRole('DRIVER')).toBe(false);
            expect(validateRole('Admin')).toBe(false);
        });

        test('should reject granted_roles with extra characters', () => {
            expect(validateRole('customer ')).toBe(false);
            expect(validateRole(' driver')).toBe(false);
            expect(validateRole('admin123')).toBe(false);
        });
    });
});
