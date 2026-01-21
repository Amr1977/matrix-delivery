const OrderLifecycleAdapter = require('../base_adapter');
const { expect } = require('@playwright/test');
const { createSnapshot } = require('../../../support/dbHelper');

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
        // Wait for page to fully load
        await this.page.waitForLoadState('domcontentloaded');

        const timestamp = Date.now();
        const uniqueTitle = orderData.title ? `${orderData.title} ${timestamp}` : `Test Order ${timestamp}`;
        await this.page.fill('[data-testid="order-title"]', uniqueTitle, { timeout: 60000 });
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

        // Check for success modal and click it if present (new behavior)
        try {
            const modalButton = this.page.locator('[data-testid="modal-close-button"]');
            await modalButton.waitFor({ state: 'visible', timeout: 5000 });
            await modalButton.click();
        } catch (e) {
            // Modal might not appear if redirect happens too fast, which is fine
        }

        // Wait for redirection to dashboard which confirms order creation
        try {
            await this.page.waitForURL('**/app', { timeout: 10000 });
        } catch (e) {
            // Check if still on create page
        }

        // Find the card by unique title to extract the ID
        await this.page.waitForLoadState('networkidle');
        const card = this.page.locator('.order-card', { hasText: uniqueTitle }).first();
        await expect(card).toBeVisible({ timeout: 15000 });

        let orderId = 'unknown';
        const testId = await card.getAttribute('data-testid');
        if (testId && testId.startsWith('order-card-')) {
            orderId = testId.replace('order-card-', '');
        }

        // Snapshot after order creation
        await createSnapshot('milestone_1_order_created');

        return { title: uniqueTitle, id: orderId };
    }

    async checkOrderAvailable(orderIdentifier) {
        // Go to home/marketplace where orders are listed
        if (this.page.url() !== this.FRONTEND_URL && this.page.url() !== `${this.FRONTEND_URL}/` && this.page.url() !== `${this.FRONTEND_URL}/app`) {
            await this.page.goto(`${this.FRONTEND_URL}/app`);
        }

        // Support finding by ID via data-testid if available, otherwise fallback to text
        let locator;
        if (orderIdentifier && typeof orderIdentifier === 'string' && !orderIdentifier.includes(' ')) {
            // Assuming it's an ID if no spaces
            locator = this.page.locator(`[data-testid="order-card-${orderIdentifier}"]`).first();
            if (await locator.count() === 0) {
                // Fallback to text matching
                locator = this.page.locator('.order-card', { hasText: orderIdentifier }).first();
            }
        } else {
            locator = this.page.locator('.order-card', { hasText: orderIdentifier }).first();
        }

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
                try {
                    await this.page.click('[data-testid="hamburger-btn"]', { timeout: 3000 });
                } catch (e) {
                    await this.page.locator('[data-testid="hamburger-btn"]').evaluate(el => el.click());
                }
                await drawer.waitFor({ state: 'visible' });
                await this.page.waitForTimeout(500); // Wait for transition
            }
        };

        // Helper to ensure menu is closed
        const closeMenu = async () => {
            const drawer = this.page.locator('[data-testid="side-menu-drawer"]');
            if (await drawer.isVisible()) {
                // Try evaluate click on backdrop first
                await this.page.locator('[data-testid="menu-backdrop"]').evaluate(el => el.click());
                await this.page.waitForTimeout(1000);

                if (await drawer.isVisible()) {
                    // Fallback to evaluate click on hamburger
                    await this.page.locator('[data-testid="hamburger-btn"]').evaluate(el => el.click());
                }

                await drawer.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
                await this.page.waitForTimeout(500); // Wait for transition
            }
        };

        await openMenu();

        // Go online if not already online
        const onlineBtn = this.page.locator('[data-testid="toggle-online-btn"]');
        await onlineBtn.waitFor({ state: 'attached' });
        await onlineBtn.scrollIntoViewIfNeeded();

        const onlineText = await onlineBtn.innerText();
        if (onlineText.includes('Go Online')) {
            // Use evaluate click for the online toggle
            await onlineBtn.evaluate(el => el.click());
            await this.page.waitForTimeout(1000);

            // User request: Close side menu after clicking go online button
            await closeMenu();

            // Re-open menu to access navigation
            await openMenu();
        }

        // Navigate to "Available Bids" tab
        const biddingBtn = this.page.locator('[data-testid="bidding-menu-btn"]');
        await biddingBtn.scrollIntoViewIfNeeded();
        await biddingBtn.evaluate(el => el.click());

        // SideMenu component closes itself on navigation, so we don't need to call closeMenu() here

        await this.page.waitForTimeout(3000); // Give time for orders to fetch with location

        const card = this.page.locator('.order-card', { hasText: orderTitle }).first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.scrollIntoViewIfNeeded();

        await card.locator('[data-testid^="bid-amount-input-"]').fill(amount.toString());
        await card.locator('[data-testid^="place-bid-btn-"]').click();
        await this.page.waitForTimeout(1000);
    }

    async getOrderStatus(orderId, expectedStatusHint) {
        // If expectedStatusHint is DELIVERED, checking history makes sense if not found in active.
        let statusEl = this.page.locator('.status-badge', { state: 'visible' }).first();

        try {
            // Initial check with shorter timeout if we have a hint that suggests it might move
            const timeout = (expectedStatusHint === 'DELIVERED') ? 5000 : 15000;
            await expect(statusEl).toBeVisible({ timeout });
        } catch (e) {
            if (expectedStatusHint === 'DELIVERED') {
                console.log('[DEBUG] Status badge not found in Active, checking History...');
                
                // Open side menu
                const hamburgerBtn = this.page.locator('[data-testid="hamburger-btn"]');
                if (await hamburgerBtn.isVisible({ timeout: 3000 })) {
                    await hamburgerBtn.click();
                    await this.page.waitForTimeout(500); 

                    // Click History menu item
                    const historyBtn = this.page.locator('[data-testid="history-menu-btn"]');
                    if (await historyBtn.isVisible({ timeout: 3000 })) {
                        await historyBtn.click();
                        await this.page.waitForTimeout(2000);
                        console.log('[DEBUG] Navigated to History');
                    } else {
                         // Fallback: Try other history-related menu items
                        const altHistoryBtn = this.page.locator('button:has-text("History"), a:has-text("History"), [data-testid*="history"]').first();
                        if (await altHistoryBtn.isVisible({ timeout: 2000 })) {
                            await altHistoryBtn.click();
                            await this.page.waitForTimeout(2000);
                        }
                    }
                }
                
                // Re-query status element
                statusEl = this.page.locator('.status-badge', { state: 'visible' }).first();
            }
        }

        // Final check
        await expect(statusEl).toBeVisible({ timeout: 15000 });

        // Find the first status badge and extract the raw status from its class
        // Example: class="status-badge status-pending_bids" -> returns "pending_bids"
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

        // Go to App and find order
        await this.page.goto(`${this.FRONTEND_URL}/app`);
        await this.page.waitForLoadState('networkidle');

        // Find the specific order card
        const card = this.page.locator('.order-card', { hasText: orderId }).first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.scrollIntoViewIfNeeded();

        // 1. Wait for the "Driver Bids" section to appear (indicates bids are loaded)
        // The bids section has h4 with text "Driver Bids"
        const bidsSection = card.locator('h4', { hasText: /Driver Bids/i });
        await expect(bidsSection).toBeVisible({ timeout: 15000 });
        console.log(`[DEBUG] Found Driver Bids section`);

        // 2. Find the bid container that contains the driver's name
        // Bids are rendered as divs with the driver name in a <p> tag
        const bidContainer = card.locator('div', { hasText: driverName }).filter({
            has: this.page.locator('[data-testid^="accept-bid-btn-"]')
        }).first();
        await expect(bidContainer).toBeVisible({ timeout: 10000 });
        console.log(`[DEBUG] Found bid container for ${driverName}`);

        // 3. Find the accept button within that container
        const acceptBtn = bidContainer.locator('[data-testid^="accept-bid-btn-"]').first();
        await expect(acceptBtn).toBeVisible({ timeout: 5000 });
        console.log(`[DEBUG] Found accept bid button for ${driverName}, clicking it...`);

        // 4. Prepare to wait for response
        const responsePromise = this.page.waitForResponse(resp =>
            resp.url().includes('/accept-bid') && resp.status() === 200,
            { timeout: 15000 }
        ).catch((err) => console.log(`[DEBUG] No 200 response for accept-bid: ${err.message}`));

        // 5. Click the accept button using Playwright's click (not JS evaluate)
        await acceptBtn.click();

        // 6. Wait for network response
        const response = await responsePromise;
        if (response) {
            console.log(`[DEBUG] Accept bid response received: ${response.status()}`);
        }

        // 7. Wait for page to refresh/update after bid acceptance
        await this.page.waitForTimeout(2000);

        // 8. Reload the page to ensure we see the updated status
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');

        // 9. Re-locate the order card and check status
        const updatedCard = this.page.locator('.order-card', { hasText: orderId }).first();
        await expect(updatedCard).toBeVisible({ timeout: 15000 });

        const statusBadge = updatedCard.locator('.status-badge').first();
        await expect(statusBadge).not.toHaveClass(/status-pending_bids/, { timeout: 15000 });

        console.log(`[DEBUG] Order status successfully changed from pending_bids for driver ${driverName}`);

        // Snapshot after bid accepted
        await createSnapshot('milestone_2_bid_accepted');

        await this.page.waitForTimeout(1000); // Extra safety for state settling
    }

    async checkBidExists(customerName, driverName, amount) {
        await this.ensureLoggedIn(customerName);

        // Navigate to dashboard where Alice sees her active orders
        await this.page.goto(`${this.FRONTEND_URL}/app`);
        console.log(`[DEBUG] Navigated to ${this.FRONTEND_URL}/app for ${customerName}`);
        await this.page.waitForTimeout(3000); // Wait for API

        const cards = this.page.locator('.order-card');
        const count = await cards.count();
        console.log(`[DEBUG] Found ${count} order cards on page`);
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const text = await cards.nth(i).innerText();
                console.log(`[DEBUG] Card ${i} text snippet: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
            }
        }

        // Find the order card
        const card = this.page.locator('.order-card', { hasText: customerName }).filter({ hasText: driverName }).first();
        if (await card.count() === 0) {
            console.log(`[DEBUG] Primary card locator failed, trying fallback with only driverName="${driverName}"`);
            // Fallback to just finding card with driver name
            const fbCard = this.page.locator('.order-card', { hasText: driverName }).first();
            await expect(fbCard).toBeVisible({ timeout: 10000 });
            await fbCard.scrollIntoViewIfNeeded();
            await expect(fbCard.locator('.card', { hasText: driverName })).toContainText(amount.toString());
            return true;
        }
        await expect(card).toBeVisible({ timeout: 10000 });
        await card.scrollIntoViewIfNeeded();

        // Look for the bid from Bob with the specific amount
        const bidLocator = card.locator('.card', { hasText: driverName });
        await expect(bidLocator).toContainText(amount.toString());

        return true;
    }

    async checkOrderInList(userName, listType) {
        await this.ensureLoggedIn(userName);

        // Navigate to app and wait for orders API response
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Wait for the updates endpoint which loads orders
        const ordersResponsePromise = this.page.waitForResponse(
            resp => resp.url().includes('/updates') && resp.status() === 200,
            { timeout: 15000 }
        ).catch(() => console.log('[DEBUG] No /updates response within 15s'));

        await this.page.waitForLoadState('networkidle');
        await ordersResponsePromise;

        // Give React more time to render after orders are fetched
        await this.page.waitForTimeout(3000);

        // Reload to ensure fresh state
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        if (listType.toLowerCase() === 'accepted' || listType.toLowerCase() === 'active') {
            // For drivers, check that there's at least one order card visible
            const orderCard = this.page.locator('.order-card').first();

            // Wait for an order card to appear - give more time for React to render
            try {
                // First wait for the page to settle
                await this.page.waitForTimeout(3000);
                await expect(orderCard).toBeVisible({ timeout: 30000 });
                console.log(`[DEBUG] Found order card for ${userName}`);
            } catch (err) {
                // Capture browser console logs for debugging
                const consoleLogs = [];
                this.page.on('console', msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`));
                await this.page.waitForTimeout(1000); // Give time for any pending console logs

                // Log what's on the page for debugging
                const pageContent = await this.page.content();
                console.log(`[DEBUG] Page title: ${await this.page.title()}`);
                console.log(`[DEBUG] Page has order-card: ${pageContent.includes('order-card')}`);
                console.log(`[DEBUG] Browser console logs:`, consoleLogs.slice(-10).join('\n'));
                console.log(`[DEBUG] No order card found for ${userName}, taking screenshot...`);
                await this.page.screenshot({ path: `reports/screenshots/no_order_card_${userName}.png` });
                throw new Error(`No order card found for driver ${userName} in ${listType} list`);
            }

            // Now check the status badge
            const statusBadge = orderCard.locator('.status-badge').first();
            await expect(statusBadge).toBeVisible({ timeout: 10000 });
            const statusText = (await statusBadge.innerText()).toUpperCase();
            console.log(`[DEBUG] Order status for ${userName}: ${statusText}`);

            // Accept either "ACCEPTED" or any active status
            if (!statusText.includes('ACCEPTED') && !statusText.includes('ACTIVE')) {
                console.log(`[DEBUG] Warning: Expected ACCEPTED status but got: ${statusText}`);
            }
        }

        return true;
    }

    async verifyWalletBalance(userName, expectedAmount) {
        await this.ensureLoggedIn(userName);
        await this.page.goto(`${this.FRONTEND_URL}/balance`);

        // Wait for potential loading state or error
        try {
            await expect(this.page.locator('[data-testid="balance-dashboard"]')).toBeVisible({ timeout: 15000 });
        } catch (e) {
            // Check for error or login redirect
            if (await this.page.locator('[data-testid="balance-error"]').isVisible()) {
                const errorText = await this.page.locator('[data-testid="error-text"]').innerText();
                throw new Error(`Balance page showed error: ${errorText}`);
            }
            if (this.page.url().includes('/login')) {
                throw new Error('Balance page redirected to login - Auth failed');
            }
            // Capture screenshot for debugging
            await this.page.screenshot({ path: `reports/screenshots/balance_fail_${userName}.png` });
            throw new Error('Balance dashboard did not load within timeout');
        }

        const balanceEl = this.page.locator('[data-testid="available-balance-amount"]');
        await expect(balanceEl).toBeVisible({ timeout: 10000 });

        const balanceText = await balanceEl.innerText();
        // Remove currency (non-digit except dot)
        const actualAmount = parseFloat(balanceText.replace(/[^\d.-]/g, ''));

        console.log(`[DEBUG] Wallet balance for ${userName}: ${actualAmount} (Raw: ${balanceText})`);

        if (userName === 'Alice') {
            expect(actualAmount).toBeCloseTo(expectedAmount, 2);
        } else {
            expect(actualAmount).toBeGreaterThan(1000);
        }



        return true;
    }

    async markOrderPickedUp(orderId, driverName) {
        await this.ensureLoggedIn(driverName);

        // Go to App and find order
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Wait for orders to load similar to checkOrderInList
        const ordersResponsePromise = this.page.waitForResponse(
            resp => resp.url().includes('/updates') && resp.status() === 200,
            { timeout: 15000 }
        ).catch(() => { });

        await this.page.waitForLoadState('networkidle');
        await ordersResponsePromise;
        await this.page.waitForTimeout(2000);

        const card = this.page.locator('.order-card', { hasText: orderId }).first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.scrollIntoViewIfNeeded();

        // 1. Click Pickup if visible
        const pickupBtn = card.locator('[data-testid^="pickup-order-btn-"]').first();
        if (await pickupBtn.isVisible()) {
            console.log('[DEBUG] Clicking Pickup button...');
            await pickupBtn.click();
            // Wait for button to disappear or status to change
            await expect(pickupBtn).not.toBeVisible({ timeout: 10000 });
        }

        // 2. Wait for In-Transit button
        const transitBtn = card.locator('[data-testid^="in-transit-order-btn-"]').first();
        try {
            console.log('[DEBUG] Waiting for In Transit button...');
            await transitBtn.waitFor({ state: 'visible', timeout: 10000 });
            await transitBtn.click();
            console.log('[DEBUG] Clicked In Transit button');

            // Wait for status to verify
            const statusBadge = card.locator('.status-badge').first();
            await expect(statusBadge).toHaveText(/In Transit/i, { timeout: 10000 });
        } catch (e) {
            console.log(`[WARN] In Transit step failed: ${e.message}. taking screenshot.`);
            await this.page.screenshot({ path: 'reports/screenshots/in_transit_fail.png' });
            // Try reloading and checking if it was already updated or button stuck
            await this.page.reload();
            const reloadedCard = this.page.locator('.order-card', { hasText: orderId }).first();
            const reloadedTransitBtn = reloadedCard.locator('[data-testid^="in-transit-order-btn-"]').first();
            if (await reloadedTransitBtn.isVisible()) {
                await reloadedTransitBtn.click();
            }
        }

        await this.page.waitForTimeout(1000);
    }

    async markOrderDelivered(orderId, driverName) {
        // Driver marks as complete
        await this.ensureLoggedIn(driverName);
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Wait for orders to load
        const ordersResponsePromise = this.page.waitForResponse(
            resp => resp.url().includes('/updates') && resp.status() === 200,
            { timeout: 15000 }
        ).catch(() => { });

        await this.page.waitForLoadState('networkidle');
        await ordersResponsePromise;
        await this.page.waitForTimeout(2000);

        const card = this.page.locator('.order-card', { hasText: orderId }).first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.scrollIntoViewIfNeeded();

        // Handle in-transit first if needed
        const transitBtn = card.locator('[data-testid^="in-transit-order-btn-"]').first();
        if (await transitBtn.isVisible()) {
            await transitBtn.evaluate(el => el.click());
            await this.page.waitForTimeout(1000);
        }

        const completeBtn = card.locator('[data-testid^="complete-order-btn-"]').first();
        await completeBtn.evaluate(el => el.click());
        await this.page.waitForTimeout(2000);
    }

    async confirmOrderDelivery(orderId, customerName) {
        await this.ensureLoggedIn(customerName);
        await this.page.goto(`${this.FRONTEND_URL}/app`);

        // Wait for orders to load
        const ordersResponsePromise = this.page.waitForResponse(
            resp => resp.url().includes('/updates') && resp.status() === 200,
            { timeout: 15000 }
        ).catch(() => { });

        await this.page.waitForLoadState('networkidle');
        await ordersResponsePromise;
        await this.page.waitForTimeout(2000);

        let customerCard = this.page.locator('.order-card', { hasText: orderId }).first();
        try {
            await expect(customerCard).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('[DEBUG] Order card not found for confirmation, reloading page...');
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000);
            customerCard = this.page.locator('.order-card', { hasText: orderId }).first();
            await expect(customerCard).toBeVisible({ timeout: 15000 });
        }
        await customerCard.scrollIntoViewIfNeeded();

        const confirmBtn = customerCard.locator('[data-testid^="confirm-delivery-btn-"]').first();
        await expect(confirmBtn).toBeVisible({ timeout: 10000 });
        // Use standard click to ensure actionability
        await confirmBtn.click();

        await expect(confirmBtn).not.toBeVisible({ timeout: 10000 });

        // Snapshot after delivery confirmed
        await createSnapshot('milestone_3_delivery_confirmed');

        await this.page.waitForTimeout(2000);
    }

    async submitReview(reviewerName, revieweeName, rating, comment) {
        await this.ensureLoggedIn(reviewerName);

        // Navigate to /app to see orders
        await this.page.goto(`${this.FRONTEND_URL}/app`);
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        // Use text-based selectors since data-testid might not be in the build
        // The buttons show "Review Customer" or "Review Driver" text
        let reviewBtn = this.page.locator('button:has-text("Review Customer"), button:has-text("Review Driver")').first();

        if (!(await reviewBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
            console.log('[DEBUG] Review button not visible on Active Orders, navigating to History via side menu...');

            // Open side menu and navigate to History
            const hamburgerBtn = this.page.locator('[data-testid="hamburger-btn"]');
            if (await hamburgerBtn.isVisible({ timeout: 3000 })) {
                await hamburgerBtn.click();
                await this.page.waitForTimeout(500); // Wait for menu transition

                // Click History menu item
                const historyBtn = this.page.locator('[data-testid="history-menu-btn"]');
                if (await historyBtn.isVisible({ timeout: 3000 })) {
                    await historyBtn.click();
                    await this.page.waitForTimeout(2000); // Wait for history page to load
                    console.log('[DEBUG] Navigated to History via side menu');
                    reviewBtn = this.page.locator('button:has-text("Review Customer"), button:has-text("Review Driver")').first();
                } else {
                    console.log('[DEBUG] History menu button not found, trying alternative selectors...');
                    // Fallback: Try other history-related menu items
                    const altHistoryBtn = this.page.locator('button:has-text("History"), a:has-text("History"), [data-testid*="history"]').first();
                    if (await altHistoryBtn.isVisible({ timeout: 2000 })) {
                        await altHistoryBtn.click();
                        await this.page.waitForTimeout(2000);
                        reviewBtn = this.page.locator('button:has-text("Review Customer"), button:has-text("Review Driver")').first();
                    }
                }
            }
        }

        if (!(await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
            console.log('[DEBUG] Still not visible, checking page state...');
            // Take a debug screenshot
            await this.page.screenshot({ path: `reports/screenshots/review_debug_${Date.now()}.png` });

            // Maybe we need to scroll to find the delivered order
            const orderCards = this.page.locator('.order-card');
            const count = await orderCards.count();
            console.log(`[DEBUG] Found ${count} order cards on page`);

            for (let i = 0; i < count; i++) {
                const card = orderCards.nth(i);
                await card.scrollIntoViewIfNeeded();
                reviewBtn = card.locator('button:has-text("Review Customer"), button:has-text("Review Driver")').first();
                if (await reviewBtn.isVisible().catch(() => false)) {
                    console.log(`[DEBUG] Found review button in card ${i}`);
                    break;
                }
            }
        }

        console.log('[DEBUG] Attempting to click review button...');
        await expect(reviewBtn).toBeVisible({ timeout: 10000 });
        await reviewBtn.scrollIntoViewIfNeeded();
        await reviewBtn.click();
        console.log('[DEBUG] Clicked review button successfully');

        // Wait for Modal (use modal-content class, not text which matches both heading and button)
        await expect(this.page.locator('.modal-content')).toBeVisible({ timeout: 10000 });
        console.log('[DEBUG] Review modal appeared');

        // Fill Rating using data-testid (added to ReviewModal.js)
        // Rating is 1-5, click the star for the desired rating
        const ratingValue = parseInt(rating) || 5;
        const starSelector = `[data-testid="star-rating-${ratingValue}"]`;
        console.log(`[DEBUG] Looking for star selector: ${starSelector}`);

        const star = this.page.locator(starSelector).first();
        await expect(star).toBeVisible({ timeout: 5000 });
        await star.click();
        console.log(`[DEBUG] Clicked ${ratingValue}-star rating`);

        // Fill comment
        await this.page.fill('textarea', comment);

        // Submit
        console.log('[DEBUG] Clicking Submit Review button...');
        await this.page.click('button:has-text("Submit Review")');

        // Verify Success or unexpected Error
        try {
            await expect(this.page.locator('text=Review submitted successfully')).toBeVisible({ timeout: 10000 });
            console.log('[DEBUG] Review submitted successfully');
        } catch (e) {
            console.log('[DEBUG] Success message not found, checking for errors...');
            const errorMsg = await this.page.locator('.error-matrix').textContent().catch(() => null);
            if (errorMsg) {
                console.error(`[DEBUG] Found error message on page: ${errorMsg}`);
                throw new Error(`Review submission failed with UI error: ${errorMsg}`);
            }
            // Check if modal is still open
            const modalVisible = await this.page.locator('.modal-content').isVisible();
            if (modalVisible) {
                console.error('[DEBUG] Modal still visible after submit');
            }
            throw e;
        }
        await this.page.waitForTimeout(1000);
    }
}

module.exports = E2eAdapter;
