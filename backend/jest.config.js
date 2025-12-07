/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).[tj]s'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverageFrom: [
        'routes/**/*.{js,ts}',
        'services/**/*.{js,ts}',
        'middleware/**/*.{js,ts}',
        'utils/**/*.{js,ts}',
        '!**/__tests__/**',
        '!**/node_modules/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 10000,
    globals: {
        'ts-jest': {
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        },
    },
};
