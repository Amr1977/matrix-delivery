/**
 * Utility functions for generating IDs and order numbers
 */

/**
 * Generate a unique ID using timestamp and random string
 * @returns {string} Unique identifier
 */
const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Generate a unique order number
 * @returns {string} Order number in format ORD-{timestamp}-{random}
 */
const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
};

module.exports = {
    generateId,
    generateOrderNumber
};
