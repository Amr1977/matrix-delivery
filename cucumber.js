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
      'tests/features/order_creation.feature',
      'tests/features/ui_verification.feature'
    ],
    tags: undefined
  }
};
