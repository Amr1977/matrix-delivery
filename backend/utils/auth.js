/**
 * Auth utilities for testing
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for testing
 */
const generateToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'test-secret-key-for-testing',
        {
            expiresIn: '1h',
            audience: 'matrix-delivery-api',
            issuer: 'matrix-delivery'
        }
    );
};

/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_SECRET || 'test-secret-key-for-testing'
    );
};

module.exports = {
    generateToken,
    verifyToken
};
