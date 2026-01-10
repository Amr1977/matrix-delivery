const { Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

// Set default timeout for browser operations
setDefaultTimeout(30 * 1000);

Before(async function () {
    const headless = process.env.HEADLESS !== 'false';
    this.browser = await chromium.launch({
        headless: headless,
        slowMo: parseInt(process.env.SLOWMO || '0'),
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create browser context
    this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        // Grant geolocation permission to prevent browser blocking on location requests
        permissions: ['geolocation'],
        // Provide a default geolocation (Cairo, Egypt - center of service area)
        geolocation: { latitude: 30.0444, longitude: 31.2357 },
        // Add any auth tokens or localStorage here if needed
    });

    // Create new page
    this.page = await this.context.newPage();

    // Navigate to app (adjust URL as needed)
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
});

After(async function () {
    // Close browser after each scenario
    if (this.page) {
        await this.page.close();
    }
    if (this.context) {
        await this.context.close();
    }
    if (this.browser) {
        await this.browser.close();
    }
});
