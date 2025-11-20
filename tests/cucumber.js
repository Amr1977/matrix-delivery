module.exports = {
  default: {
    require: [
      'step_definitions/**/*.js',
      'support/hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    parallel: 1,
    paths: [
      'features/**/*.feature'
    ],
    tags: undefined
  }
  ,
  smoke: {
    require: [
      'tests/step_definitions/map_location_steps.js',
      'tests/support/hooks.js'
    ],
    format: [
      'progress-bar'
    ],
    parallel: 1,
    paths: [
      'tests/features/map_location_picker.feature'
    ],
    tags: '@smoke'
  }
};
