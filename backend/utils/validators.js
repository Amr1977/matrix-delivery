/**
 * Input validation utilities
 */

const { sanitizeString } = require('./sanitizers');

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
const validateEmail = (email) => {
    const sanitized = sanitizeString(email, 255);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets minimum requirements
 */
const validatePassword = (password) => {
    const sanitized = sanitizeString(password, 255);
    return sanitized && sanitized.length >= 8;
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
const validatePhone = (phone) => {
    const sanitized = sanitizeString(phone, 50);
    // Basic phone validation - can be enhanced
    return /^[\d\s\-\+\(\)]+$/.test(sanitized) && sanitized.length >= 10;
};

/**
 * Validate primary_role
 * @param {string} primary_role - User primary_role to validate
 * @returns {boolean} True if valid primary_role
 */
const validateRole = (primary_role) => {
    const validRoles = ['customer', 'driver', 'admin', 'vendor'];
    return validRoles.includes(primary_role);
};

module.exports = {
    validateEmail,
    validatePassword,
    validatePhone,
    validateRole
};
