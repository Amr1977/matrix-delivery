const { test, expect } = require('@playwright/test');

/**
 * Login-Logout-Login Flow Test
 * 
 * This test reproduces the issue where users cannot log in after logging out.
 * Checks for "Token has been revoked" error.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

test.describe('Authentication Flow Tests', () => {
    // Increase timeout for this suite
    test.setTimeout(60000);

    const testUser = {
        email: 'testuser123@example.com',
        password: 'Test123456',
        name: 'Test User'
    };

    test.beforeAll(async ({ request }) => {
        // Test user already exists in production DB
        console.log(`Using test user: ${testUser.email}`);
    });

    test('should allow login, logout, and login again immediately', async ({ page }) => {
        // 1. Go to Login Page
        console.log('Navigating to login page...');
        await page.goto(`${BASE_URL}/login`);

        // Wait for login form
        await page.waitForSelector('[data-testid="email-input"]', { timeout: 15000 });

        // 2. Perform First Login
        console.log('Performing first login...');
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit-btn"]');

        // 3. Verify Login Success
        console.log('Verifying first login...');
        // Wait for redirection to dashboard (hamburger button in header)
        await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible({ timeout: 20000 });

        // 4. Perform Logout
        console.log('Opening side menu to logout...');
        await page.click('[data-testid="hamburger-btn"]');

        // Wait for logout button in side menu
        const logoutBtn = page.locator('[data-testid="logout-menu-btn"]');
        await expect(logoutBtn).toBeVisible({ timeout: 5000 });

        console.log('Clicking logout...');
        await logoutBtn.click();

        // 5. Verify Logout Success - back to login page
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 15000 });

        // 6. Perform Second Login (Immediate)
        console.log('Performing second login...');
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit-btn"]');

        // 7. Verify Second Login Success
        console.log('Verifying second login...');

        // Check for specific error toast/message "Token has been revoked"
        // We use a shorter timeout to check for the error, but longer to confirm success
        const errorLocator = page.locator('text=Token has been revoked');

        try {
            await expect(errorLocator).toBeVisible({ timeout: 2000 });
            console.error('❌ BUG REPRODUCED: "Token has been revoked" error appeared.');
            throw new Error('Bug reproduced: Token has been revoked error appeared');
        } catch (e) {
            if (e.message.includes('Bug reproduced')) throw e;
            console.log('✅ No revocation error observed immediately.');
        }

        // Should successfully show dashboard again
        await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible({ timeout: 20000 });

        console.log('✅ Test Passed: User successfully logged in after logout.');
    });
});
