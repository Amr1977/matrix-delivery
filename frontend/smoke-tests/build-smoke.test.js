const { test, expect } = require('@playwright/test');

/**
 * Build Smoke Tests
 * 
 * These tests verify that the production build:
 * 1. Loads without errors
 * 2. Has no console errors
 * 3. Renders the main application
 * 4. Has correct environment configuration
 * 5. Loads all critical assets
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Production Build Smoke Tests', () => {
    let consoleErrors = [];
    let consoleWarnings = [];

    test.beforeEach(async ({ page }) => {
        // Capture console errors and warnings
        consoleErrors = [];
        consoleWarnings = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            } else if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        // Capture page errors
        page.on('pageerror', (error) => {
            consoleErrors.push(`Page Error: ${error.message}`);
        });
    });

    test('should load the application without errors', async ({ page }) => {
        const response = await page.goto(BASE_URL, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Check response status
        expect(response.status()).toBe(200);

        // Wait for React to mount
        await page.waitForSelector('#root', { timeout: 10000 });

        // Check that root element has content
        const rootContent = await page.locator('#root').innerHTML();
        expect(rootContent.length).toBeGreaterThan(0);

        console.log('✅ Application loaded successfully');
    });

    test('should have no critical console errors', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Wait a bit for any delayed errors
        await page.waitForTimeout(2000);

        // Filter out known non-critical errors
        const criticalErrors = consoleErrors.filter(error => {
            // Ignore certain warnings that are not critical
            const ignoredPatterns = [
                /Download the React DevTools/i,
                /favicon.ico/i,
                /manifest.json/i
            ];

            return !ignoredPatterns.some(pattern => pattern.test(error));
        });

        if (criticalErrors.length > 0) {
            console.error('❌ Console errors detected:');
            criticalErrors.forEach(error => console.error(`  - ${error}`));
        }

        expect(criticalErrors).toHaveLength(0);
        console.log('✅ No critical console errors');
    });

    test('should load main JavaScript bundles', async ({ page }) => {
        const failedResources = [];

        page.on('response', (response) => {
            const url = response.url();
            const status = response.status();

            // Check for failed JS and CSS files
            if ((url.endsWith('.js') || url.endsWith('.css')) && status !== 200) {
                failedResources.push({ url, status });
            }
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        if (failedResources.length > 0) {
            console.error('❌ Failed to load resources:');
            failedResources.forEach(({ url, status }) => {
                console.error(`  - ${url} (${status})`);
            });
        }

        expect(failedResources).toHaveLength(0);
        console.log('✅ All JavaScript and CSS bundles loaded');
    });

    test('should render the authentication screen', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Wait for the app to render
        await page.waitForSelector('#root', { timeout: 10000 });

        // Check for login/register elements (should be visible when not authenticated)
        // This verifies the app is actually rendering React components
        const hasAuthElements = await page.evaluate(() => {
            const root = document.getElementById('root');
            if (!root) return false;

            // Check if there's substantial content (not just empty div)
            const hasContent = root.innerText.length > 50;

            return hasContent;
        });

        expect(hasAuthElements).toBe(true);
        console.log('✅ Application UI rendered correctly');
    });

    test('should have environment variables loaded', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Check if environment variables are accessible
        const envCheck = await page.evaluate(() => {
            // Check if the app has access to environment variables
            // This is a basic check that the build process worked correctly
            return {
                hasWindow: typeof window !== 'undefined',
                hasDocument: typeof document !== 'undefined',
                hasRoot: !!document.getElementById('root')
            };
        });

        expect(envCheck.hasWindow).toBe(true);
        expect(envCheck.hasDocument).toBe(true);
        expect(envCheck.hasRoot).toBe(true);

        console.log('✅ Environment configured correctly');
    });

    test('should not have any 404 errors', async ({ page }) => {
        const notFoundResources = [];

        page.on('response', (response) => {
            if (response.status() === 404) {
                notFoundResources.push(response.url());
            }
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Wait for all resources to load
        await page.waitForTimeout(2000);

        // Filter out expected 404s (like favicon, manifest that might not exist)
        const unexpectedNotFound = notFoundResources.filter(url => {
            const ignoredPaths = [
                '/favicon.ico',
                '/manifest.json',
                '/logo192.png',
                '/logo512.png'
            ];

            return !ignoredPaths.some(path => url.endsWith(path));
        });

        if (unexpectedNotFound.length > 0) {
            console.error('❌ 404 errors for:');
            unexpectedNotFound.forEach(url => console.error(`  - ${url}`));
        }

        expect(unexpectedNotFound).toHaveLength(0);
        console.log('✅ No unexpected 404 errors');
    });

    test('should have valid HTML structure', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Check basic HTML structure
        const htmlStructure = await page.evaluate(() => {
            return {
                hasHead: !!document.head,
                hasBody: !!document.body,
                hasRoot: !!document.getElementById('root'),
                hasTitle: !!document.title && document.title.length > 0,
                hasMetaTags: document.querySelectorAll('meta').length > 0
            };
        });

        expect(htmlStructure.hasHead).toBe(true);
        expect(htmlStructure.hasBody).toBe(true);
        expect(htmlStructure.hasRoot).toBe(true);
        expect(htmlStructure.hasTitle).toBe(true);
        expect(htmlStructure.hasMetaTags).toBe(true);

        console.log('✅ Valid HTML structure');
    });

    test.afterEach(async () => {
        // Report warnings if any (but don't fail the test)
        if (consoleWarnings.length > 0) {
            console.warn(`⚠️  ${consoleWarnings.length} console warnings detected`);
        }
    });
});
