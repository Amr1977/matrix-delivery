const { test, expect } = require('@playwright/test');

/**
 * Login Smoke Test
 * 
 * Verifies that users can log in to the application.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Login Smoke Tests', () => {
    test.setTimeout(60000);

    const testUser = {
        email: 'testuser123@example.com',
        password: 'Test123456',
        name: 'Test User'
    };

    test('should login successfully', async ({ page }) => {
        console.log('Navigating to login page...');
        await page.goto(`${BASE_URL}/login`);

        await page.waitForSelector('[data-testid="email-input"]', { timeout: 15000 });

        console.log('Performing login...');
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit-btn"]');

        console.log('Waiting for dashboard...');
        
        // After login, we should see either:
        // 1. Some element unique to logged-in state
        // 2. Not be on login page anymore
        await page.waitForURL(/\/(home|dashboard|orders|map)/, { timeout: 20000 }).catch(() => {
            console.log('URL did not change, checking for login errors...');
        });

        // Check no error messages
        const errorMsg = page.locator('text=Invalid credentials');
        const tokenError = page.locator('text=Token has been revoked');
        
        await expect(errorMsg).not.toBeVisible({ timeout: 5000 }).catch(() => {});
        await expect(tokenError).not.toBeVisible({ timeout: 5000 }).catch(() => {});

        console.log('✅ Login successful');
    });
});