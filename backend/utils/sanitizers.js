/**
 * Input sanitization utilities
 */

/**
 * Sanitize string input by trimming and removing dangerous characters
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (str, maxLength = 1000) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength).replace(/[<>"'&]/g, '');
};

/**
 * Sanitize HTML input by removing script tags
 * @param {string} str - Input HTML string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (str, maxLength = 5000) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

/**
 * Sanitize and validate numeric input
 * @param {any} value - Input value to convert to number
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} Sanitized number or null if invalid
 */
const sanitizeNumeric = (value, min = 0, max = 1000000) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) return null;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
};

module.exports = {
    sanitizeString,
    sanitizeHtml,
    sanitizeNumeric
};
