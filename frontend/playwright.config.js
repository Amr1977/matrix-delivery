const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for build smoke tests
 * See https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: './smoke-tests',

    // Maximum time one test can run
    timeout: 30 * 1000,

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Reporter to use
    reporter: [
        ['list'],
        ['html', { outputFolder: 'smoke-tests/report', open: 'never' }]
    ],

    // Shared settings for all the projects below
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: process.env.BASE_URL || 'http://localhost:3001',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure',
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Don't start a web server (test-build.js handles this)
    webServer: undefined,
});
