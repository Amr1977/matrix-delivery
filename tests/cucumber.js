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
  },
  'cod-commission': {
    requireModule: ['ts-node/register'],
    require: [
      'step_definitions/backend/cod_commission_steps.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cod-commission-report.html',
      'json:reports/cod-commission-report.json'
    ],
    parallel: 1,
    paths: [
      'features/cod-commission.feature'
    ]
  },
  'cod-backend': {
    requireModule: ['ts-node/register'],
    require: [
      'step_definitions/backend/cod_commission_steps.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cod-backend-report.html',
      'json:reports/cod-backend-report.json'
    ],
    parallel: 1,
    paths: [
      'features/cod-commission.feature'
    ]
  },
  'cod-frontend': {
    requireModule: ['ts-node/register'],
    require: [
      'step_definitions/frontend/cod_commission_steps.js',
      'support/browser_hooks.js'
    ],
    format: [
      'progress-bar',
      'html:reports/cod-frontend-report.html',
      'json:reports/cod-frontend-report.json'
    ],
    parallel: 1,
    paths: [
      'features/cod-commission.feature'
    ]
  }
};
