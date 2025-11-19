module.exports = {
  default: {
    require: [
      'tests/step_definitions/**/*.js',
      'tests/support/hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    parallel: 1,
    paths: [
      // Core implementable features (Priority 1)
      'tests/features/user_management.feature',
      'tests/features/driver_operations.feature',
      'tests/features/driver_bidding.feature',
      'tests/features/driver_location.feature',
      'tests/features/driver_location_filtering.feature',
      'tests/features/driver_status.feature',      // NEW: Driver online/offline management
      'tests/features/reviews_system.feature',

      // Core order management features (Priority 2)
      'tests/features/detailed_order_management.feature',
      'tests/features/order_management.feature',
      'tests/features/order_creation.feature',

      // UI and translation features (Priority 3)
      'tests/features/ui_verification.feature',
      'tests/features/translation.feature',

      // Map location features (Priority 4)
      'tests/features/map_location_picker.feature',
      'tests/features/enhanced-map-location-picker.feature',
      'tests/features/advanced_map_location_picker.feature',

      // Payment system (Priority 5)
      'tests/features/payment_system.feature',

      // Keep as reference/documentation
      'tests/features/matrix_delivery.feature'
    ],
    tags: undefined
  },

  // Separate config for quick unit tests (high-priority features)
  'unit-tests': {
    require: [
      'tests/step_definitions/**/*.js',
      'tests/support/hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/unit-test-report.html'
    ],
    parallel: 1,
    paths: [
      'tests/features/user_management.feature',
      'tests/features/driver_operations.feature',
      'tests/features/driver_bidding.feature',
      'tests/features/driver_status.feature',
      'tests/features/reviews_system.feature'
    ],
    tags: undefined
  },

  // E2E tests with browser integration
  'e2e-tests': {
    require: [
      'tests/step_definitions/**/*.js',
      'tests/support/hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/e2e-test-report.html',
      'json:reports/e2e-test-report.json'
    ],
    parallel: 1,
    paths: [
      'tests/features/ui_verification.feature',
      'tests/features/translation.feature',
      'tests/features/map_location_picker.feature'
    ],
    tags: undefined
  },

  // Original minimal config for quick testing
  'minimal': {
    require: [
      'tests/step_definitions/**/*.js',
      'tests/support/hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/minimal-test-report.html'
    ],
    parallel: 1,
    paths: [
      'tests/features/ui_verification.feature',
      'tests/features/driver_bidding.feature',
      'tests/features/translation.feature'
    ],
    tags: undefined
  }
};
