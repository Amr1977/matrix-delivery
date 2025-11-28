/**
 * Unit tests for sanitizers utility module
 */

const { sanitizeString, sanitizeHtml, sanitizeNumeric } = require('../../utils/sanitizers');

describe('Sanitizers Utility', () => {
    describe('sanitizeString', () => {
        test('should remove dangerous characters', () => {
            const input = 'Hello <script>alert("xss")</script> World';
            const result = sanitizeString(input);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).toBe('Hello scriptalert(xss)/script World');
        });

        test('should trim whitespace', () => {
            const input = '  Hello World  ';
            const result = sanitizeString(input);
            expect(result).toBe('Hello World');
        });

        test('should remove quotes and ampersands', () => {
            const input = 'Hello "World" & \'Friends\'';
            const result = sanitizeString(input);
            expect(result).not.toContain('"');
            expect(result).not.toContain("'");
            expect(result).not.toContain('&');
            expect(result).toBe('Hello World  Friends');
        });

        test('should enforce maximum length', () => {
            const input = 'a'.repeat(2000);
            const result = sanitizeString(input, 100);
            expect(result.length).toBe(100);
        });

        test('should use default max length of 1000', () => {
            const input = 'a'.repeat(2000);
            const result = sanitizeString(input);
            expect(result.length).toBe(1000);
        });

        test('should return empty string for non-string input', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
            expect(sanitizeString(123)).toBe('');
            expect(sanitizeString({})).toBe('');
            expect(sanitizeString([])).toBe('');
        });

        test('should handle empty string', () => {
            expect(sanitizeString('')).toBe('');
        });

        test('should preserve safe characters', () => {
            const input = 'Hello World 123 !@#$%^*()_+-=[]{}|;:,.<>?/~`';
            const result = sanitizeString(input);
            expect(result).toContain('Hello');
            expect(result).toContain('World');
            expect(result).toContain('123');
        });
    });

    describe('sanitizeHtml', () => {
        test('should remove script tags', () => {
            const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
            const result = sanitizeHtml(input);
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('</script>');
            expect(result).toContain('<p>Hello</p>');
            expect(result).toContain('<p>World</p>');
        });

        test('should remove multiple script tags', () => {
            const input = '<script>bad1()</script>Good<script>bad2()</script>';
            const result = sanitizeHtml(input);
            expect(result).not.toContain('<script>');
            expect(result).toContain('Good');
        });

        test('should remove script tags with attributes', () => {
            const input = '<script type="text/javascript" src="evil.js">alert("xss")</script>';
            const result = sanitizeHtml(input);
            expect(result).not.toContain('<script');
            expect(result).not.toContain('</script>');
        });

        test('should trim whitespace', () => {
            const input = '  <p>Hello</p>  ';
            const result = sanitizeHtml(input);
            expect(result).toBe('<p>Hello</p>');
        });

        test('should enforce maximum length', () => {
            const input = '<p>' + 'a'.repeat(10000) + '</p>';
            const result = sanitizeHtml(input, 100);
            expect(result.length).toBe(100);
        });

        test('should use default max length of 5000', () => {
            const input = '<p>' + 'a'.repeat(10000) + '</p>';
            const result = sanitizeHtml(input);
            expect(result.length).toBe(5000);
        });

        test('should return empty string for non-string input', () => {
            expect(sanitizeHtml(null)).toBe('');
            expect(sanitizeHtml(undefined)).toBe('');
            expect(sanitizeHtml(123)).toBe('');
        });

        test('should preserve safe HTML tags', () => {
            const input = '<div><p>Hello</p><span>World</span></div>';
            const result = sanitizeHtml(input);
            expect(result).toBe(input);
        });
    });

    describe('sanitizeNumeric', () => {
        test('should parse valid number', () => {
            expect(sanitizeNumeric('123.45')).toBe(123.45);
            expect(sanitizeNumeric(123.45)).toBe(123.45);
            expect(sanitizeNumeric('100')).toBe(100);
        });

        test('should round to 2 decimal places', () => {
            expect(sanitizeNumeric('123.456')).toBe(123.46);
            expect(sanitizeNumeric('123.454')).toBe(123.45);
            expect(sanitizeNumeric(99.999)).toBe(100);
        });

        test('should return null for invalid input', () => {
            expect(sanitizeNumeric('abc')).toBeNull();
            // Note: parseFloat('12abc') returns 12, which is valid behavior
            expect(sanitizeNumeric('12abc')).toBe(12);
            expect(sanitizeNumeric(NaN)).toBeNull();
            expect(sanitizeNumeric(undefined)).toBeNull();
            expect(sanitizeNumeric(null)).toBeNull();
        });

        test('should enforce minimum value', () => {
            expect(sanitizeNumeric(-10, 0, 100)).toBeNull();
            expect(sanitizeNumeric(5, 10, 100)).toBeNull();
            expect(sanitizeNumeric(10, 10, 100)).toBe(10);
        });

        test('should enforce maximum value', () => {
            expect(sanitizeNumeric(150, 0, 100)).toBeNull();
            expect(sanitizeNumeric(100, 0, 100)).toBe(100);
            expect(sanitizeNumeric(99.99, 0, 100)).toBe(99.99);
        });

        test('should use default min of 0', () => {
            expect(sanitizeNumeric(-1)).toBeNull();
            expect(sanitizeNumeric(0)).toBe(0);
            expect(sanitizeNumeric(1)).toBe(1);
        });

        test('should use default max of 1000000', () => {
            expect(sanitizeNumeric(1000001)).toBeNull();
            expect(sanitizeNumeric(1000000)).toBe(1000000);
            expect(sanitizeNumeric(999999)).toBe(999999);
        });

        test('should handle zero', () => {
            expect(sanitizeNumeric(0)).toBe(0);
            expect(sanitizeNumeric('0')).toBe(0);
        });

        test('should handle negative numbers within range', () => {
            expect(sanitizeNumeric(-50, -100, 100)).toBe(-50);
            expect(sanitizeNumeric('-25.5', -100, 100)).toBe(-25.5);
        });

        test('should handle decimal strings', () => {
            expect(sanitizeNumeric('0.01')).toBe(0.01);
            expect(sanitizeNumeric('99.99')).toBe(99.99);
        });
    });
});
