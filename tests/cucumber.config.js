module.exports = {
  default: {
    requireModule: ["ts-node/register/transpile-only"],
    require: [
      "tests/step_definitions/**/*.{ts,js}",
      "tests/support/**/*.{ts,js}",
    ],
    paths: ["tests/features/**/*.feature"],
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html",
      "json:reports/cucumber-report.json",
    ],
    formatOptions: {
      snippetInterface: "async-await",
    },
    publishQuiet: true,
  },
  // Core order lifecycle tests (API standalone)
  core: {
    requireModule: ["ts-node/register/transpile-only"],
    require: [
      "tests/support/cucumber_setup.js",
      "tests/step_definitions/api/core_order_lifecycle_steps.js",
      "tests/support/hooks.js",
    ],
    paths: ["tests/features/core/**/*.feature"],
    format: ["progress"],
  },
  // Backend API tests
  "backend-api": {
    requireModule: ["ts-node/register/transpile-only"],
    require: [
      "tests/step_definitions/api/**/*.{ts,js}",
      "tests/support/**/*.{ts,js}",
    ],
    paths: [
      "tests/features/backend/**/*.feature",
      "tests/features/shared/**/*.feature",
    ],
    format: ["progress-bar", "html:tests/reports/backend-api-report.html"],
    tags: "@api",
  },
  // Frontend UI tests
  "frontend-ui": {
    requireModule: ["ts-node/register/transpile-only"],
    require: [
      "tests/step_definitions/ui/**/*.{ts,js}",
      "tests/step_definitions/e2e/**/*.{ts,js}",
      "tests/support/**/*.{ts,js}",
    ],
    paths: [
      "tests/features/frontend/**/*.feature",
      "tests/features/shared/**/*.feature",
    ],
    format: ["progress-bar", "html:tests/reports/frontend-ui-report.html"],
    tags: "@ui",
  },
  // Security tests
  security: {
    requireModule: ["ts-node/register"],
    require: [
      "tests/step_definitions/api/**/*.{ts,js}",
      "tests/step_definitions/ui/**/*.{ts,js}",
      "tests/support/**/*.{ts,js}",
    ],
    paths: ["tests/features/backend/authorization-security.feature"],
    format: ["progress-bar", "html:tests/reports/security-report.html"],
    tags: "@api and @security",
  },
};
