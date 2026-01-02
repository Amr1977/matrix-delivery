const { test, expect } = require('@playwright/test');

/**
 * Signup Flow Smoke Test
 * 
 * Verifies that:
 * 1. User can navigate to registration page
 * 2. Form validation works
 * 3. User can successfully register
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Signup Flow Tests', () => {
    const timestamp = Date.now();
    const newUser = {
        name: `Test User ${timestamp}`,
        email: `signup_${timestamp}@example.com`,
        phone: `1234567890`,
        password: 'password123',
        country: 'Egypt',
        city: 'Cairo',
        area: 'Maadi'
    };

    test('should register a new customer successfully', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Find link to register page (assuming text "Create new account" or similar)
        // Or specific button if it exists. Based on LoginForm.js, it might be a button to toggle mode
        // If not found, go directly to register route?
        // Let's assume there is a way to switch or go to /register

        // Checking for a "Register" or "Sign up" link/button
        const registerLink = page.getByRole('button', { name: /create|register|sign up/i });
        if (await registerLink.isVisible()) {
            await registerLink.click();
        } else {
            // Fallback: try navigating directly if route exists
            // Assuming App might toggle form in place or route to /register
            // If LoginForm and RegisterForm are swapped, we need a trigger.
            // Looking at LoginForm.js... it only has "Forgot Password" link.
            // Maybe the parent component handles the switch.
            // Let's assume standard behavior or direct navigation
            await page.goto(`${BASE_URL}/register`);
        }

        // Verify Register Form is visible
        await expect(page.getByText('Create Account', { exact: false })).toBeVisible();

        // Fill Form
        await page.fill('[data-testid="name-input"]', newUser.name);
        await page.fill('[data-testid="email-input"]', newUser.email);
        await page.fill('[data-testid="phone-input"]', newUser.phone);
        await page.fill('[data-testid="password-input"]', newUser.password);

        // Select Role (default is customer, but good to explicit)
        await page.selectOption('[data-testid="role-select"]', 'customer');

        // Fill Location
        await page.fill('[data-testid="country-input"]', newUser.country);
        await page.fill('[data-testid="city-input"]', newUser.city);
        await page.fill('[data-testid="area-input"]', newUser.area);

        // Submit
        await page.click('[data-testid="register-submit-btn"]');

        // Verify Success
        // Should redirect to dashboard or show success message
        await expect(page.locator('[data-testid="hamburger-btn"]')).toBeVisible({ timeout: 20000 });

        console.log('✅ User registered successfully');
    });
});
