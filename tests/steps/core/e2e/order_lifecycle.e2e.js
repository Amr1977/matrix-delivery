const OrderLifecycleAdapter = require('../base_adapter');
const { expect } = require('@playwright/test');

class E2eAdapter extends OrderLifecycleAdapter {
    constructor(page) {
        super();
        this.page = page;
        this.currentUser = null;
        this.userRoles = {};
        this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    }

    async init() {
        if (!this.page) throw new Error('Playwright Page not initialized');

        // Debug: Capture frontend console messages
        this.page.on('console', msg => {
            const type = msg.type();
            if (type === 'error' || type === 'warning') {
                console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
            }
        });

        // Debug: Log Set-Cookie headers from API responses
        this.page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/auth/')) {
                const headers = response.headers();
                console.log(`[DEBUG] Response from ${url}:`);
                console.log(`[DEBUG]   Status: ${response.status()}`);
                if (headers['set-cookie']) {
                    console.log(`[DEBUG]   Set-Cookie: ${headers['set-cookie']}`);
                } else {
                    console.log(`[DEBUG]   No Set-Cookie header found`);
                }
            }
        });

        await this.page.goto(this.FRONTEND_URL);
    }

    async cleanup() {
        // E2E cleanup might involve DB reset or just logging out
        // For now, we rely on the global hook cleanup
    }

    async logout() {
        console.log('[DEBUG] Logging out via Side Menu...');

        try {
            // Ensure we are in the app context
            await this.page.goto(`${this.FRONTEND_URL}/app`);
            await this.page.waitForTimeout(1000);

            // 1. Click Hamburger Button to open Side Menu
            const hamburgerBtn = this.page.locator('[data-testid="hamburger-btn"]');

            if (await hamburgerBtn.isVisible({ timeout: 5000 })) {
                console.log('[DEBUG] Clicking Hamburger button...');
                await hamburgerBtn.click();

                // 2. Wait for Side Menu and Logout Button
                const logoutBtn = this.page.locator('[data-testid="logout-menu-btn"]');
                try {
                    await logoutBtn.waitFor({ state: 'visible', timeout: 3000 });
                    console.log('[DEBUG] Logout button visible, clicking...');
                    await logoutBtn.click();
                    await this.page.waitForTimeout(1000);
                } catch (e) {
                    console.log('[DEBUG] Logout button NOT found in menu (maybe already logged out?)');
                }
            } else {
                console.log('[DEBUG] Hamburger button not visible, checking if already on login/landing page...');
            }

            // Force clear as backup to ensure clean state for next test step
            await this.page.context().clearCookies();
            await this.page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

        } catch (e) {
            console.log('[DEBUG] Error during logout flow:', e.message);
        }

        // Final verification: Go to landing page and check for Login button
        await this.page.goto(this.FRONTEND_URL);
        try {
            await this.page.waitForSelector('a[href="/login"], button:has-text("Login"), a:has-text("Login")', { timeout: 5000 });
            console.log('[DEBUG] Verified on landing page with Login button available');
        } catch (e) {
            console.log('[DEBUG] Warning: Login button not found after logout attempt');
        }

        this.currentUser = null;
    }

    async _login(role, name) {
        if (this.currentUser === name) return;

        await this.logout();

        await this.page.goto(`${this.FRONTEND_URL}/login`);
        await this.page.fill('[data-testid="email-input"]', `${name.toLowerCase()}@test.com`);
        await this.page.fill('[data-testid="password-input"]', 'password123');
        await this.page.click('[data-testid="login-submit-btn"]');

        // Wait for redirection to dashboard or home
        try {
            await this.page.waitForNavigation({ url: '**/app', timeout: 5000 });
        } catch (e) {
            // If timeout, maybe we are already there or redirected elsewhere
        }
        await this.page.waitForTimeout(1000);

        const cookies = await this.page.context().cookies();
        console.log(`[DEBUG] Cookies after _login for ${name}:`, cookies.map(c => `${c.name}: ${c.value} (Domain: ${c.domain})`));

        this.currentUser = name;
    }

    async ensureLoggedIn(name) {
        if (!name) return;
        if (this.currentUser !== name) {
            const role = this.userRoles[name] || 'customer'; // Default to customer
            await this._login(role, name);
        }
    }

    async createCustomer(name) {
        await this.logout();

        // Navigate using natural user flow: Landing → Login → Sign Up
        console.log('[DEBUG] Starting registration flow from landing page...');
        await this.page.goto(this.FRONTEND_URL);

        // Wait for landing page and click Login button
        await this.page.waitForSelector('a[href="/login"], button:has-text("Login"), a:has-text("Login")', { timeout: 10000 });
        console.log('[DEBUG] Clicking Login button on landing page...');
        await this.page.click('a[href="/login"], button:has-text("Login"), a:has-text("Login")');

        // Wait for login form to appear
        await this.page.waitForSelector('[data-testid="email-input"]', { state: 'visible', timeout: 10000 });
        console.log('[DEBUG] Login form visible, clicking Sign Up link...');

        // Click "Sign Up" link to switch to registration form
        await this.page.click('button:has-text("Sign Up"), a:has-text("Sign Up"), button:has-text("sign up")');

        // Wait for name-input which only appears on registration form
        await this.page.waitForSelector('[data-testid="name-input"]', { state: 'visible', timeout: 10000 });
        console.log('[DEBUG] Registration form is visible, filling fields...');

        await this.page.fill('[data-testid="name-input"]', name);
        await this.page.fill('[data-testid="email-input"]', `${name.toLowerCase()}@test.com`);
        await this.page.fill('[data-testid="phone-input"]', '1234567890');
        await this.page.fill('[data-testid="password-input"]', 'password123');
        await this.page.selectOption('[data-testid="role-select"]', 'customer');
        await this.page.fill('[data-testid="country-input"]', 'Egypt');
        await this.page.fill('[data-testid="city-input"]', 'Cairo');
        await this.page.fill('[data-testid="area-input"]', 'Maadi');

        console.log('[DEBUG] Form filled, clicking register button...');
        await this.page.click('[data-testid="register-submit-btn"]');

        // Wait for navigation to dashboard to confirm registration success
        try {
            await this.page.waitForURL('**/app', { timeout: 15000 });
            console.log('[DEBUG] Successfully navigated to /app after registration');
        } catch (e) {
            console.error('[DEBUG] Registration might have failed');
            console.log('[DEBUG] Current URL:', this.page.url());
        }

        const cookies = await this.page.context().cookies();
        console.log(`[DEBUG] Cookies after createCustomer for ${name}:`, cookies.map(c => `${c.name}: ${c.value} (Domain: ${c.domain})`));

        this.currentUser = name;
        this.userRoles[name] = 'customer';

        // Add 1000 EGP balance for testing upfront payments
        try {
            const { addTestUserBalance } = require('../../../support/dbHelper');
            let success = false;
            for (let i = 0; i < 10; i++) {
                await this.page.waitForTimeout(2000);
                try {
                    console.log(`Attempting to add balance for ${name.toLowerCase()}@test.com (Try ${i + 1}/10)`);
                    await addTestUserBalance(`${name.toLowerCase()}@test.com`, 1000);
                    success = true;
                    console.log('Balance added successfully');
                    break;
                } catch (e) {
                    console.log(`Balance addition failed (Try ${i + 1}/10): ${e.message}`);
                }
            }
            if (!success) console.error('Failed to add balance after 10 retries');
        } catch (e) {
            console.error('Failed to init balance helper:', e);
        }
    }

    async createDriver(name) {
        await this.logout();

        // Navigate using natural user flow: Landing → Login → Sign Up
        console.log('[DEBUG] Starting driver registration from landing page...');
        await this.page.goto(this.FRONTEND_URL);

        // Wait for landing page and click Login button
        await this.page.waitForSelector('a[href="/login"], button:has-text("Login"), a:has-text("Login")', { timeout: 10000 });
        await this.page.click('a[href="/login"], button:has-text("Login"), a:has-text("Login")');

        // Wait for login form to appear
        await this.page.waitForSelector('[data-testid="email-input"]', { state: 'visible', timeout: 10000 });

        // Click "Sign Up" link to switch to registration form
        await this.page.click('button:has-text("Sign Up"), a:has-text("Sign Up"), button:has-text("sign up")');

        // Wait for name-input which only appears on registration form
        await this.page.waitForSelector('[data-testid="name-input"]', { state: 'visible', timeout: 10000 });
        console.log('[DEBUG] Driver registration form visible, filling fields...');

        await this.page.fill('[data-testid="name-input"]', name);
        await this.page.fill('[data-testid="email-input"]', `${name.toLowerCase()}@test.com`);
        await this.page.fill('[data-testid="phone-input"]', '0987654321');
        await this.page.fill('[data-testid="password-input"]', 'password123');
        await this.page.selectOption('[data-testid="role-select"]', 'driver');
        await this.page.selectOption('[data-testid="vehicle-type-select"]', 'car');
        await this.page.fill('[data-testid="country-input"]', 'Egypt');
        await this.page.fill('[data-testid="city-input"]', 'Cairo');
        await this.page.fill('[data-testid="area-input"]', 'Nasr City');

        console.log('[DEBUG] Driver form filled, clicking register button...');
        await this.page.click('[data-testid="register-submit-btn"]');

        try {
            await this.page.waitForURL('**/app', { timeout: 15000 });
            console.log('[DEBUG] Successfully navigated to /app after driver registration');
        } catch (e) {
            console.error('[DEBUG] Driver registration might have failed');
            console.log('[DEBUG] Current URL:', this.page.url());
        }

        this.currentUser = name;
        this.userRoles[name] = 'driver';
    }

    async publishOrder(orderData) {
        if (orderData.user) {
            await this.ensureLoggedIn(orderData.user);
        }

        // Navigate using natural flow: Dashboard -> Create Order Button
        if (this.page.url() !== `${this.FRONTEND_URL}/create-order`) {
            console.log('[DEBUG] Navigating to Create Order page via UI...');
            // Ensure we are on the dashboard
            if (!this.page.url().includes('/app')) {
                await this.page.goto(`${this.FRONTEND_URL}/app`);
            }

            // Wait for and click the "Create New Order" button
            const createOrderBtn = this.page.locator('button', { hasText: 'Create New Order' }).or(this.page.locator('button:has-text("Create Order")'));
            await createOrderBtn.waitFor({ state: 'visible', timeout: 10000 });
            await createOrderBtn.click();

            await this.page.waitForURL('**/create-order', { timeout: 10000 });
            console.log('[DEBUG] Successfully navigated to /create-order');
        }

        // Fill basic order info
        await this.page.fill('[data-testid="order-title"]', orderData.title || 'Test Order');
        await this.page.fill('[data-testid="order-description"]', orderData.description || 'Test Description');
        await this.page.fill('[data-testid="order-price"]', orderData.price?.toString() || '100');

        // Fill pickup address fields
        await this.page.fill('[data-testid="pickup-country"]', 'Egypt');
        await this.page.fill('[data-testid="pickup-city"]', 'Cairo');
        await this.page.fill('[data-testid="pickup-area"]', 'Maadi');
        await this.page.fill('[data-testid="pickup-street"]', 'Road 9');
        await this.page.fill('[data-testid="pickup-building"]', '10');
        await this.page.fill('[data-testid="pickup-contact-name"]', 'Pickup Person');
        await this.page.fill('[data-testid="pickup-contact-phone"]', '+201000000001');

        // Fill delivery address fields  
        await this.page.fill('[data-testid="delivery-country"]', 'Egypt');
        await this.page.fill('[data-testid="delivery-city"]', 'Alexandria');
        await this.page.fill('[data-testid="delivery-area"]', 'Gleem');
        await this.page.fill('[data-testid="delivery-street"]', 'Corniche');
        await this.page.fill('[data-testid="delivery-building"]', '5');
        await this.page.fill('[data-testid="delivery-contact-name"]', 'Delivery Person');
        await this.page.fill('[data-testid="delivery-contact-phone"]', '+201000000002');

        console.log('Address fields filled. Setting coordinates via test hook...');

        // Use the test hook exposed by OrderCreationForm
        await this.page.evaluate(() => {
            if (typeof window.setOrderCoordinates === 'function') {
                window.setOrderCoordinates(
                    { coordinates: { lat: 30.0444, lng: 31.2357 } },
                    { coordinates: { lat: 31.2001, lng: 29.9187 } }
                );
                console.log('✅ Coordinates set via window.setOrderCoordinates');
            } else {
                console.error('❌ window.setOrderCoordinates not available!');
            }
        });

        // Wait for state update
        await this.page.waitForTimeout(1000);

        // DEBUG: Check cookie state before submission
        const cookies = await this.page.context().cookies();
        console.log('🍪 Cookies before submission:', cookies.map(c => `${c.name}=${c.httpOnly ? '[httpOnly]' : c.value}`));

        console.log('Waiting for submit button to be enabled...');

        // Wait for submit button to be enabled
        try {
            await this.page.waitForFunction(
                () => !document.querySelector('button[type="submit"]')?.disabled,
                { timeout: 10000 }
            );
            console.log('Submit button is now enabled!');
        } catch (e) {
            console.error('Submit button still disabled after map clicks. Checking form state...');
            const debugInfo = await this.page.evaluate(() => {
                const btn = document.querySelector('button[type="submit"]');
                return {
                    disabled: btn?.disabled,
                    innerHTML: btn?.innerHTML
                };
            });
            console.log('Button state:', debugInfo);
        }

        await this.page.click('button[type="submit"]');

        // Wait for redirection to dashboard which confirms order creation
        try {
            await this.page.waitForURL('**/app', { timeout: 10000 });
        } catch (e) {
            console.log('Order creation redirection timeout - check if still on create page');
        }

        return { title: orderData.title, id: 'unknown' };
    }

    async checkOrderAvailable(orderTitle) {
        // Go to home/marketplace where orders are listed
        if (this.page.url() !== this.FRONTEND_URL && this.page.url() !== `${this.FRONTEND_URL}/` && this.page.url() !== `${this.FRONTEND_URL}/app`) {
            await this.page.goto(`${this.FRONTEND_URL}/app`);
        }

        const locator = this.page.locator('.order-card', { hasText: orderTitle }).first();
        await expect(locator).toBeVisible();
    }

    async driverBidsOnOrder(orderTitle, amount, driverName) {
        await this.ensureLoggedIn(driverName);

        // Ensure we are viewing orders
        if (this.page.url() !== `${this.FRONTEND_URL}/`) {
            await this.page.goto(`${this.FRONTEND_URL}/`);
        }

        const card = this.page.locator('.order-card', { hasText: orderTitle }).first();
        await expect(card).toBeVisible({ timeout: 5000 });

        await card.locator('[data-testid^="bid-amount-input-"]').fill(amount.toString());
        await card.locator('[data-testid^="place-bid-btn-"]').click();
        await this.page.waitForTimeout(1000);
    }

    async getOrderStatus(orderId) {
        // Return status text from the first card (simplification)
        const statusEl = this.page.locator('.status-badge').first();
        return await statusEl.innerText();
    }

    async customerAcceptsBid(orderId, driverName, customerName) {
        await this.ensureLoggedIn(customerName);

        // Go to My Orders or Dashboard where user sees their own orders
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Ideally find the specific order card
        const card = this.page.locator('.order-card').first();
        await expect(card).toBeVisible();

        // Find the accept button. 
        // We'll just click the first accept button found on the card for MVP
        const acceptBtn = card.locator('[data-testid^="accept-bid-btn-"]').first();
        if (await acceptBtn.isVisible()) {
            await acceptBtn.click();
        } else {
            // Maybe already accepted?
        }
        await this.page.waitForTimeout(1000);
    }

    async markOrderPickedUp(orderId, driverName) {
        await this.ensureLoggedIn(driverName);

        // Driver views their active orders
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        const card = this.page.locator('.order-card').first();
        await card.locator('[data-testid^="pickup-order-btn-"]').click();
        await this.page.waitForTimeout(1000);
    }

    async markOrderDelivered(orderId, driverName) {
        await this.ensureLoggedIn(driverName);

        await this.page.goto(`${this.FRONTEND_URL}/app`);

        const card = this.page.locator('.order-card').first();
        // In-transit first
        const transitBtn = card.locator('[data-testid^="in-transit-order-btn-"]');
        if (await transitBtn.isVisible()) {
            await transitBtn.click();
            await this.page.waitForTimeout(1000);
        }

        // Then Delivered
        await card.locator('[data-testid^="complete-order-btn-"]').click();
        await this.page.waitForTimeout(1000);
    }
}

module.exports = E2eAdapter;
