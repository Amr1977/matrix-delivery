/**
 * Jest Setup File
 * Loads test environment and configures test globals
 */

const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.testing') });

// Set NODE_ENV to testing
process.env.NODE_ENV = 'testing';

// Increase test timeout for database operations
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
