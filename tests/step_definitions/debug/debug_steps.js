const { Given } = require('@cucumber/cucumber');
const { execSync } = require('child_process');
const path = require('path');

Given('the order {string} is delivered', async function (orderTitle) {
    console.log('[DEBUG] Restoring DB snapshot inside step to bypass Before hook cleanup...');
    try {
        const snapshotPath = path.resolve('reports/db_snapshots/milestone_3_delivery_confirmed.sql');
        const env = { ...process.env, PGPASSWORD: 'be_the_one' };

        // 1. Restore snapshot
        execSync(`psql -U postgres -d matrix_delivery_test -f "${snapshotPath}"`, { stdio: 'inherit', env });
        console.log('[DEBUG] Snapshot restored.');

        // 2. Re-apply schema migration
        const migrationPath = path.resolve('backend/migrations/20260107_add_review_type_column.sql');
        execSync(`psql -U postgres -d matrix_delivery_test -f "${migrationPath}"`, { stdio: 'inherit', env });
        console.log('[DEBUG] Migration applied.');

        // 3. Force-reset Bob's password
        console.log('[DEBUG] Resetting Bob password...');
        // Correct column is password_hash
        execSync(`psql -U postgres -d matrix_delivery_test -c "UPDATE users SET password_hash = '$2b$10$gppWr8dwbxXiNu9TIN7y5OHFILz0tV32XyxdxSlPdKaVwrIN5thZK' WHERE email = 'bob@test.com';"`, { stdio: 'inherit', env });
        console.log('[DEBUG] Password reset done.');

    } catch (error) {
        console.error('[ERROR] DB Setup failed:', error);
        throw error;
    }

    // 4. Login
    console.log('[DEBUG] Logging in as bob@test.com...');
    await this.adapter.page.goto(`${this.adapter.FRONTEND_URL}/login`);
    await this.adapter.page.fill('[data-testid="email-input"]', 'bob@test.com');
    await this.adapter.page.fill('[data-testid="password-input"]', 'password123');
    await this.adapter.page.click('[data-testid="login-submit-btn"]');

    // Wait for redirect to /app
    await this.adapter.page.waitForURL('**/app', { timeout: 30000 });
    console.log('[DEBUG] Login success. On /app');

    // 5. Ensure we are in a clean state (Active Orders)
    this.adapter.currentUser = { name: 'Bob', email: 'bob@test.com', role: 'driver' };
});
