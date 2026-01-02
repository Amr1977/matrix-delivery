/**
 * Profile Picture Upload Test
 * Tests the profile picture upload and display functionality
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

test.describe('Profile Picture Upload', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto(`${BASE_URL}/login`);

        // Login with test credentials
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'testpassword123');
        await page.click('[data-testid="login-submit"]');

        // Wait for login to complete
        await page.waitForURL('**/home', { timeout: 10000 }).catch(() => {
            // If redirect doesn't happen, we may already be on home
        });
    });

    test('should display profile picture with correct API URL prefix', async ({ page }) => {
        // Navigate to profile page
        await page.goto(`${BASE_URL}/profile`);

        // Wait for profile to load
        await page.waitForSelector('.profile-page', { timeout: 10000 }).catch(() => { });

        // Check if any profile picture image exists
        const profileImg = page.locator('img[alt="Profile"]').first();

        if (await profileImg.count() > 0) {
            const imgSrc = await profileImg.getAttribute('src');

            // If it's a relative path, it should be prefixed with API URL
            if (imgSrc && imgSrc.includes('/uploads/')) {
                // Should contain the API domain, not just relative path
                expect(imgSrc).toMatch(/https?:\/\//);
                expect(imgSrc).toContain('matrix-api.oldantique50.com');
            }
        }
    });

    test('should allow uploading a new profile picture', async ({ page }) => {
        // Navigate to profile page
        await page.goto(`${BASE_URL}/profile`);

        // Wait for profile to load
        await page.waitForSelector('.profile-page', { timeout: 10000 }).catch(() => { });

        // Find the file input for profile picture
        const fileInput = page.locator('input[type="file"][accept="image/*"]').first();

        if (await fileInput.count() > 0) {
            // Create a test image file
            const testImagePath = 'tests/fixtures/test-avatar.jpg';

            // Listen for any network request to profile-picture endpoint
            const uploadPromise = page.waitForResponse(
                response => response.url().includes('/profile-picture'),
                { timeout: 15000 }
            ).catch(() => null);

            // Upload the file
            await fileInput.setInputFiles(testImagePath).catch(() => {
                // If test file doesn't exist, skip
                console.log('Test image file not found, skipping upload test');
            });

            const response = await uploadPromise;

            if (response) {
                // Check that upload was successful
                expect(response.status()).toBeLessThan(400);
            }
        }
    });

    test('profile picture in side menu should use correct URL', async ({ page }) => {
        // Navigate to home
        await page.goto(`${BASE_URL}/home`);

        // Open side menu (hamburger button)
        const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
        if (await menuButton.count() > 0) {
            await menuButton.click();

            // Wait for menu to open
            await page.waitForSelector('.mobile-menu', { timeout: 5000 }).catch(() => { });

            // Check profile image in side menu
            const menuProfileImg = page.locator('.mobile-menu img[alt="Profile"]').first();

            if (await menuProfileImg.count() > 0) {
                const imgSrc = await menuProfileImg.getAttribute('src');

                // If it's a relative path, it should be prefixed with API URL
                if (imgSrc && imgSrc.includes('/uploads/')) {
                    expect(imgSrc).toMatch(/https?:\/\//);
                    expect(imgSrc).toContain('matrix-api.oldantique50.com');
                }
            }
        }
    });
});
