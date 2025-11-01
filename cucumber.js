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
      'tests/features/address_input_validation.feature'
    ],
    tags: '@address_input' // Focus on address input tests for now
  }
};
