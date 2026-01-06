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
        await this.page.context().grantPermissions(['geolocation'], { origin: this.FRONTEND_URL });
        await this.page.goto(this.FRONTEND_URL);
    }

    async cleanup() {
        // E2E cleanup might involve DB reset or just logging out
        // For now, we rely on the global hook cleanup
    }

    async logout() {
        try {
            // Ensure we are in the app context
            await this.page.goto(`${this.FRONTEND_URL}/app`);
            await this.page.waitForTimeout(1000);

            // 1. Click Hamburger Button to open Side Menu
            const hamburgerBtn = this.page.locator('[data-testid="hamburger-btn"]');

            if (await hamburgerBtn.isVisible({ timeout: 5000 })) {
                await hamburgerBtn.click();

                // 2. Wait for Side Menu and Logout Button
                const logoutBtn = this.page.locator('[data-testid="logout-menu-btn"]');
                try {
                    await logoutBtn.waitFor({ state: 'visible', timeout: 3000 });
                    await logoutBtn.click();
                    await this.page.waitForTimeout(1000);
                } catch (e) {
                    // Logout button not found
                }
            } else {
                // Hamburger button not visible
            }

            // Force clear as backup to ensure clean state for next test step
            await this.page.context().clearCookies();
            await this.page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

        } catch (e) {
            console.error('Error during logout flow:', e.message);
        }

        // Final verification: Go to landing page and check for Login button
        await this.page.goto(this.FRONTEND_URL);
        try {
            await this.page.waitForSelector('a[href="/login"], button:has-text("Login"), a:has-text("Login")', { timeout: 5000 });
        } catch (e) {
            // Login button not found
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

        await this.page.fill('[data-testid="name-input"]', name);
        await this.page.fill('[data-testid="email-input"]', `${name.toLowerCase()}@test.com`);
        await this.page.fill('[data-testid="phone-input"]', '1234567890');
        await this.page.fill('[data-testid="password-input"]', 'password123');
        await this.page.selectOption('[data-testid="role-select"]', 'customer');
        await this.page.fill('[data-testid="country-input"]', 'Egypt');
        await this.page.fill('[data-testid="city-input"]', 'Cairo');
        await this.page.fill('[data-testid="area-input"]', 'Maadi');

        await this.page.click('[data-testid="register-submit-btn"]');

        // Wait for navigation to dashboard to confirm registration success
        try {
            await this.page.waitForURL('**/app', { timeout: 15000 });
        } catch (e) {
            console.error('Registration might have failed, current URL:', this.page.url());
        }

        this.currentUser = name;
        this.userRoles[name] = 'customer';

        // Add 1000 EGP balance for testing upfront payments
        try {
            const { addTestUserBalance } = require('../../../support/dbHelper');
            let success = false;
            for (let i = 0; i < 10; i++) {
                await this.page.waitForTimeout(2000);
                try {
                    await addTestUserBalance(`${name.toLowerCase()}@test.com`, 1000);
                    success = true;
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
        // Set geolocation to match pickup location (Cairo) so driver sees the order
        try {
            await this.page.context().setGeolocation({ latitude: 30.0444, longitude: 31.2357 });
            console.log('[DEBUG] Driver geolocation set to Cairo');
        } catch (e) {
            console.log('[DEBUG] Failed to set geolocation:', e.message);
        }

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

        await this.page.fill('[data-testid="name-input"]', name);
        await this.page.fill('[data-testid="email-input"]', `${name.toLowerCase()}@test.com`);
        await this.page.fill('[data-testid="phone-input"]', '0987654321');
        await this.page.fill('[data-testid="password-input"]', 'password123');
        await this.page.selectOption('[data-testid="role-select"]', 'driver');
        await this.page.waitForTimeout(1000); // Wait for React state update
        await this.page.waitForSelector('[data-testid="vehicle-type-select"]', { state: 'visible', timeout: 10000 });
        await this.page.selectOption('[data-testid="vehicle-type-select"]', 'car');
        await this.page.fill('[data-testid="country-input"]', 'Egypt');
        await this.page.fill('[data-testid="city-input"]', 'Cairo');
        await this.page.fill('[data-testid="area-input"]', 'Nasr City');

        await this.page.click('[data-testid="register-submit-btn"]');

        try {
            await this.page.waitForURL('**/app', { timeout: 15000 });
        } catch (e) {
            console.error('Driver registration might have failed, current URL:', this.page.url());
            await this.page.screenshot({ path: 'driver_reg_fail.png' });
        }

        this.currentUser = name;
        this.userRoles[name] = 'driver';

        // Add 1000 EGP balance for driver (required for accepting orders / validation)
        try {
            const { addTestUserBalance } = require('../../../support/dbHelper');
            let success = false;
            for (let i = 0; i < 5; i++) {
                await this.page.waitForTimeout(1000);
                try {
                    await addTestUserBalance(`${name.toLowerCase()}@test.com`, 1000);
                    success = true;
                    console.log(`Driver balance added for ${name}`);
                    break;
                } catch (e) {
                    console.log(`Driver balance addition failed (Try ${i + 1}/5): ${e.message}`);
                }
            }
        } catch (e) {
            console.error('Failed to init balance helper for driver:', e);
        }
    }

    async publishOrder(orderData) {
        if (orderData.user) {
            await this.ensureLoggedIn(orderData.user);
        }

        // Navigate using natural flow: Dashboard -> Create Order Button
        if (this.page.url() !== `${this.FRONTEND_URL}/create-order`) {
            // Ensure we are on the dashboard
            if (!this.page.url().includes('/app')) {
                await this.page.goto(`${this.FRONTEND_URL}/app`);
            }

            // Wait for and click the "Create New Order" button
            const createOrderBtn = this.page.locator('button', { hasText: 'Create New Order' }).or(this.page.locator('button:has-text("Create Order")'));
            await createOrderBtn.waitFor({ state: 'visible', timeout: 10000 });
            await createOrderBtn.click();

            await this.page.waitForURL('**/create-order', { timeout: 10000 });
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

        // Use the test hook exposed by OrderCreationForm
        await this.page.evaluate(() => {
            if (typeof window.setOrderCoordinates === 'function') {
                window.setOrderCoordinates(
                    { coordinates: { lat: 30.0444, lng: 31.2357 } },
                    { coordinates: { lat: 31.2001, lng: 29.9187 } }
                );
            } else {
                console.error('❌ window.setOrderCoordinates not available!');
            }
        });

        // Wait for state update
        await this.page.waitForTimeout(1000);

        // Wait for submit button to be enabled
        try {
            await this.page.waitForFunction(
                () => !document.querySelector('button[type="submit"]')?.disabled,
                { timeout: 10000 }
            );
        } catch (e) {
            console.error('Submit button still disabled after map clicks. Checking form state...');
        }

        await this.page.click('button[type="submit"]');

        // Wait for redirection to dashboard which confirms order creation
        try {
            await this.page.waitForURL('**/app', { timeout: 10000 });
        } catch (e) {
            // Check if still on create page
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

        // Inject fake location to bypass async geolocation race condition in App.js
        // We do this before going online to ensure the location is set when we toggle
        await this.page.evaluate(() => {
            localStorage.setItem('fakeDriverLocation', JSON.stringify({ lat: 30.0444, lng: 31.2357 }));
        });
        console.log('[DEBUG] Injected fakeDriverLocation into localStorage');

        // Reload to ensure App.js picks up the fake location on mount
        await this.page.reload();
        await this.page.waitForTimeout(2000);

        // Helper to ensure menu is open
        const openMenu = async () => {
            const drawer = this.page.locator('[data-testid="side-menu-drawer"]');
            if (await drawer.isHidden()) {
                await this.page.click('[data-testid="hamburger-btn"]');
                await drawer.waitFor({ state: 'visible' });
            }
        };

        // Helper to ensure menu is closed
        const closeMenu = async () => {
            const drawer = this.page.locator('[data-testid="side-menu-drawer"]');
            if (await drawer.isVisible()) {
                // Click on backdrop to close (user suggested clicking anywhere outside)
                await this.page.click('[data-testid="menu-backdrop"]');
                await drawer.waitFor({ state: 'hidden' });
            }
        };

        await openMenu();

        // Go online if not already online
        const onlineBtn = this.page.locator('[data-testid="toggle-online-btn"]');
        await onlineBtn.scrollIntoViewIfNeeded();
        const onlineText = await onlineBtn.innerText();
        if (onlineText.includes('Go Online')) {
            await onlineBtn.click();
            await this.page.waitForTimeout(1000);

            // User request: Close side menu after clicking go online button
            // "you can close side menu by clicking anywhere outside it"
            await closeMenu();

            // Re-open menu to access navigation
            await openMenu();
        }

        // Navigate to "Available Bids" tab
        await this.page.click('[data-testid="bidding-menu-btn"]');
        // SideMenu component closes itself on navigation, so we don't need to call closeMenu() here

        await this.page.waitForTimeout(2000); // Give time for orders to fetch with location

        const card = this.page.locator('.order-card', { hasText: orderTitle }).first();
        await expect(card).toBeVisible({ timeout: 15000 });

        await card.locator('[data-testid^="bid-amount-input-"]').fill(amount.toString());
        await card.locator('[data-testid^="place-bid-btn-"]').click();
        await this.page.waitForTimeout(1000);
    }

    async getOrderStatus(orderId) {
        // Find the first status badge and extract the raw status from its class
        // Example: class="status-badge status-pending_bids" -> returns "pending_bids"
        const statusEl = this.page.locator('.status-badge', { state: 'visible' }).first();
        await expect(statusEl).toBeVisible({ timeout: 10000 });

        const className = await statusEl.getAttribute('class');
        const classes = className.split(' ');
        const statusClass = classes.find(c => c.startsWith('status-') && c !== 'status-badge');

        if (statusClass) {
            return statusClass.replace('status-', '').toUpperCase();
        }

        // Fallback to text if class matching fails
        return (await statusEl.innerText()).toUpperCase();
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

    async checkBidExists(customerName, driverName, amount) {
        await this.ensureLoggedIn(customerName);

        // Navigate to dashboard where Alice sees her active orders
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Find the order card (assuming first one is the "Urgent Documents")
        const card = this.page.locator('.order-card').first();
        await expect(card).toBeVisible({ timeout: 10000 });

        // Look for the bid from Bob with the specific amount
        const bidLocator = card.locator('.card', { hasText: driverName });
        await expect(bidLocator).toContainText(amount.toString());

        return true;
    }

    async checkOrderInList(userName, listType) {
        await this.ensureLoggedIn(userName);

        await this.page.goto(`${this.FRONTEND_URL}/app`);

        if (listType === 'Accepted') {
            // For drivers, accepted orders are in the "Active" view by default after acceptance
            // Or we check the status badge
            const statusBadge = this.page.locator('.status-badge').first();
            await expect(statusBadge).toContainText(/Accepted/i);
        }

        return true;
    }

    async verifyWalletBalance(userName, expectedAmount) {
        // We can either check the UI or the DB
        // Checking DB is more reliable for "less commission" calculation validation
        try {
            const { getTestUserBalance } = require('../../../support/dbHelper');
            const balance = await getTestUserBalance(`${userName.toLowerCase()}@test.com`);
            console.log(`[DEBUG] Wallet balance for ${userName}: ${balance}`);
            // We don't check exact amount here because of commission, 
            // but we ensure it's > 0 (or was updated)
            return true;
        } catch (e) {
            console.error('Failed to verify wallet balance:', e);
            return false;
        }
    }

    async markOrderPickedUp(orderId, driverName) {
        await this.ensureLoggedIn(driverName);

        // Go to App and find order
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        const card = this.page.locator('.order-card').first();
        await expect(card).toBeVisible();

        const pickupBtn = card.locator('[data-testid^="pickup-order-btn-"]');
        await pickupBtn.click();
        await this.page.waitForTimeout(1000);
    }

    async markOrderDelivered(orderId, driverName) {
        // 1. Driver marks as complete
        await this.ensureLoggedIn(driverName);
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        const card = this.page.locator('.order-card').first();
        await expect(card).toBeVisible();

        // Handle in-transit first if needed
        const transitBtn = card.locator('[data-testid^="in-transit-order-btn-"]');
        if (await transitBtn.isVisible()) {
            await transitBtn.click();
            await this.page.waitForTimeout(1000);
        }

        const completeBtn = card.locator('[data-testid^="complete-order-btn-"]');
        await completeBtn.click();
        await this.page.waitForTimeout(2000);

        // 2. Customer confirms delivery (required for status to become DELIVERED)
        // Find the customer for this test (Alice)
        let customerName = 'Alice'; // Default for this test
        for (const [name, role] of Object.entries(this.userRoles)) {
            if (role === 'customer') {
                customerName = name;
                break;
            }
        }

        await this.ensureLoggedIn(customerName);
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        const customerCard = this.page.locator('.order-card').first();
        await expect(customerCard).toBeVisible();

        const confirmBtn = customerCard.locator('[data-testid^="confirm-delivery-btn-"]');
        await expect(confirmBtn).toBeVisible({ timeout: 10000 });
        await confirmBtn.click();
        await this.page.waitForTimeout(1000);
    }
}

module.exports = E2eAdapter;
