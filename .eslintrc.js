module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Relaxed rules for development - can tighten later
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console logs in tests/backend
    'no-undef': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    'coverage/',
    '*.test.js',
    '*.spec.js',
    'tests/',
    '*.config.js',
  ],
};
