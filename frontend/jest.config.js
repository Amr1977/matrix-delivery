module.exports = {
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Setup files after env is configured
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Module name mapping for CSS, images, and other assets
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ico|webp)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(woff|woff2|eot|ttf|otf)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Transform files with babel-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['react-app', { runtime: 'automatic' }]
      ]
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // Collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/setupTests.js',
    '!src/reportWebVitals.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Module paths mapping
  modulePaths: ['<rootDir>/src'],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime|react-leaflet|leaflet|@testing-library|jest-dom|@testing-library/react|@testing-library/jest-dom|@testing-library/user-event|identity-obj-proxy)/)'
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Colors in output
  colors: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit
  forceExit: true
};
