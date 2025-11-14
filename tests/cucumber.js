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
};
