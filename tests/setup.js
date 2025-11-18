/**
 * Jest setup file for API tests
 * Configures environment and global test utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME_TEST = 'matrix_delivery_test';

// Increase Jest timeout for API tests
jest.setTimeout(30000);

// Suppress console logs during tests (can be enabled for debugging)
// console.log = jest.fn();
// console.warn = jest.fn();
console.error = jest.fn();

// Global test utilities
