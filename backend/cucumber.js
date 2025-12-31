module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['../tests/step_definitions/**/*.{ts,js}', '../tests/support/**/*.{ts,js}'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true
  }
};
