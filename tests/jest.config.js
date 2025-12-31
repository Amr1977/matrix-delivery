module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory for tests
    rootDir: '../',

    // Test match patterns
    testMatch: [
        '**/tests/unit/**/*.test.{js,ts}',
        '**/tests/integration/**/*.test.{js,ts}'
    ],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Coverage
    collectCoverageFrom: [
        'backend/**/*.{js,ts}',
        '!backend/node_modules/**',
        '!backend/tests/**',
        '!backend/features/**'
    ],

    // Module paths
    modulePaths: ['<rootDir>'],

    // Transform
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest'
    },

    // Test timeout
    testTimeout: 30000,

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/backend/features/',
        '/tests/features/'
    ],

    // Verbose output
    verbose: true
};
