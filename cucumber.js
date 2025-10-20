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
    publishQuiet: true,
    parallel: 1
  }
};
