module.exports = {
  // Global Profile: Backend Integration Tests
  'backend': {
    requireModule: ['ts-node/register'],
    require: [
      'tests/step_definitions/backend/**/*.js',
      'tests/step_definitions/backend/**/*.ts',
      'tests/step_definitions/api/**/*.js',
      'tests/step_definitions/api/**/*.ts',
      'tests/support/backend_hooks.ts'
    ],
    format: [
      'progress-bar',
      'html:reports/backend-report.html',
      'json:reports/backend-report.json'
    ],
    parallel: 1,
    paths: [
      'tests/features/**/*.feature'
    ]
  },

  // Global Profile: Frontend UI Tests
  'frontend': {
    requireModule: ['ts-node/register'],
    require: [
      'tests/step_definitions/frontend/**/*.ts',
      'tests/step_definitions/frontend/**/*.js',
      'tests/support/browser_hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/frontend-report.html',
      'json:reports/frontend-report.json'
    ],
    parallel: 1,
    paths: [
      'tests/features/**/*.feature'
    ]
  },

  // Default to backend for now
  default: '--profile backend',

  'smoke': {
    require: [
      'tests/step_definitions/backend/map_location_steps.js',
      'tests/support/hooks.js'
    ],
    format: ['progress-bar'],
    paths: ['tests/features/map_location_picker.feature'],
    tags: '@smoke'
  },

  'core': {
    require: [
      'tests/step_definitions/ui/order_lifecycle_adapter_steps.js',
      'tests/support/world.js',
      'tests/support/hooks.js'
    ],
    format: ['summary', 'json:test-results.json'],
    paths: ['tests/features/core/**/*.feature', 'tests/features/frontend/**/*.feature']
  }
};
