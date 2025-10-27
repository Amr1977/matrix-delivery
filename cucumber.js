/**
 * Cucumber.js Configuration
 * Defines test execution profiles and reporting
 */

const common = {
  require: [
    'features/support/**/*.js',
    'features/step_definitions/**/*.js'
  ],
  format: [
    'progress-bar',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    '@cucumber/pretty-formatter'
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    colorsEnabled: true
  },
  publishQuiet: true,
  dryRun: false,
  failFast: false
};

module.exports = {
  // Default profile - runs all tests
  default: {
    ...common,
    parallel: 2
  },

  // Smoke tests - critical features only (~2 minutes)
  smoke: {
    ...common,
    tags: '@smoke',
    parallel: 4
  },

  // Critical path tests (~10 minutes)
  critical: {
    ...common,
    tags: '@critical_path',
    parallel: 3
  },

  // API tests only
  api: {
    ...common,
    tags: '@api and not @ui',
    parallel: 4
  },

  // UI tests only
  ui: {
    ...common,
    tags: '@ui and not @api',
    parallel: 2
  },

  // Integration tests
  integration: {
    ...common,
    tags: '@integration or @end_to_end',
    parallel: 1
  },

  // Implemented features only
  implemented: {
    ...common,
    tags: '@implemented',
    parallel: 3
  },

  // Feature-specific profiles
  auth: {
    ...common,
    tags: '@user_authentication'
  },

  orders: {
    ...common,
    tags: '@order_management'
  },

  bidding: {
    ...common,
    tags: '@driver_bidding'
  },

  delivery: {
    ...common,
    tags: '@delivery_workflow'
  },

  payments: {
    ...common,
    tags: '@payment_system'
  },

  reviews: {
    ...common,
    tags: '@review_system'
  },

  notifications: {
    ...common,
    tags: '@notifications'
  },

  // Debug profile - single scenario
  debug: {
    ...common,
    parallel: 1,
    failFast: true,
    retry: 0
  },

  // CI/CD profile
  ci: {
    ...common,
    tags: '@smoke or @critical_path',
    parallel: 4,
    retry: 1,
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'junit:reports/cucumber-junit.xml'
    ]
  }
};