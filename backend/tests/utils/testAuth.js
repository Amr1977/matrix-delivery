const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Create a test JWT token for testing purposes
 * @param {string} userId - User ID
 * @param {string} role - Primary role (customer, driver, admin, vendor)
 * @param {object} options - Additional token claims
 * @returns {string} JWT token
 */
const createTestToken = (userId, role = 'customer', options = {}) => {
    const payload = {
        userId,
        role, // Legacy support
        primary_role: role,
        granted_roles: options.granted_roles || [role],
        name: options.name || `Test User ${userId}`,
        email: options.email || `test-${userId}@example.com`,
        ...options
    };

    return jwt.sign(
        payload,
        JWT_SECRET,
        {
            expiresIn: options.expiresIn || '1h',
            audience: 'matrix-delivery-api',
            issuer: 'matrix-delivery'
        }
    );
};

/**
 * Create an admin test token
 * @param {string} userId - Admin user ID (defaults to 'test-admin-id')
 * @param {object} options - Additional options
 * @returns {string} Admin JWT token
 */
const createAdminToken = (userId = 'test-admin-id', options = {}) => {
    return createTestToken(userId, 'admin', {
        name: 'Test Admin',
        email: 'admin@example.com',
        granted_roles: ['admin'],
        ...options
    });
};

/**
 * Create a driver test token
 * @param {string} userId - Driver user ID
 * @param {object} options - Additional options
 * @returns {string} Driver JWT token
 */
const createDriverToken = (userId = 'test-driver-id', options = {}) => {
    return createTestToken(userId, 'driver', {
        name: 'Test Driver',
        email: 'driver@example.com',
        vehicle_type: options.vehicle_type || 'car',
        ...options
    });
};

/**
 * Create a customer test token
 * @param {string} userId - Customer user ID
 * @param {object} options - Additional options
 * @returns {string} Customer JWT token
 */
const createCustomerToken = (userId = 'test-customer-id', options = {}) => {
    return createTestToken(userId, 'customer', {
        name: 'Test Customer',
        email: 'customer@example.com',
        ...options
    });
};

/**
 * Create a vendor test token
 * @param {string} userId - Vendor user ID
 * @param {object} options - Additional options
 * @returns {string} Vendor JWT token
 */
const createVendorToken = (userId = 'test-vendor-id', options = {}) => {
    return createTestToken(userId, 'vendor', {
        name: 'Test Vendor',
        email: 'vendor@example.com',
        granted_roles: ['vendor'],
        ...options
    });
};

/**
 * Create an expired test token
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} Expired JWT token
 */
const createExpiredToken = (userId = 'test-user-id', role = 'customer') => {
    return createTestToken(userId, role, { expiresIn: '-1h' });
};

module.exports = {
    createTestToken,
    createAdminToken,
    createDriverToken,
    createCustomerToken,
    createVendorToken,
    createExpiredToken
};
