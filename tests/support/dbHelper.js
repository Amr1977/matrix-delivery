const pool = require('../../backend/config/db');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, '../../reports/db_snapshots');

/**
 * Add balance to a test user by email
 * @param {string} email 
 * @param {number} amount 
 */
async function addTestUserBalance(email, amount) {
    try {
        // 1. Get user ID
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            throw new Error(`User ${email} not found for balance addition`);
        }
        const userId = userRes.rows[0].id;

        // 2. Insert or Update balance
        await pool.query(`
            INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance, total_transactions)
            VALUES ($1, 'EGP', $2, 0, 0, 1)
            ON CONFLICT (user_id)
            DO UPDATE SET available_balance = user_balances.available_balance + $2
        `, [userId, amount]);

        console.log(`Added ${amount} EGP to ${email}`);
    } catch (e) {
        console.error('Error adding balance:', e);
    }
}

/**
 * Create a database snapshot at a milestone
 * @param {string} milestoneName - Name for the snapshot (e.g., 'after_order_created')
 */
async function createSnapshot(milestoneName) {
    try {
        if (!fs.existsSync(SNAPSHOT_DIR)) {
            fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
        }

        const dbName = process.env.DB_NAME_TEST || 'matrix_delivery_test';
        const snapshotFile = path.join(SNAPSHOT_DIR, `${milestoneName}.sql`);

        console.log(`[SNAPSHOT] Creating snapshot: ${milestoneName}`);
        execSync(`pg_dump -U postgres -h localhost -d ${dbName} -f "${snapshotFile}"`, {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'Ranoosh123!' }
        });
        console.log(`[SNAPSHOT] Created: ${snapshotFile}`);
        return snapshotFile;
    } catch (e) {
        console.error(`[SNAPSHOT] Error creating snapshot ${milestoneName}:`, e.message);
        return null;
    }
}

/**
 * Restore database from a snapshot
 * @param {string} milestoneName - Name of the snapshot to restore
 */
async function restoreSnapshot(milestoneName) {
    try {
        const dbName = process.env.DB_NAME_TEST || 'matrix_delivery_test';
        const snapshotFile = path.join(SNAPSHOT_DIR, `${milestoneName}.sql`);

        if (!fs.existsSync(snapshotFile)) {
            console.error(`[SNAPSHOT] Snapshot file not found: ${snapshotFile}`);
            return false;
        }

        console.log(`[SNAPSHOT] Restoring from: ${milestoneName}`);

        // Drop and recreate database
        execSync(`psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS ${dbName};"`, {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'Ranoosh123!' }
        });
        execSync(`psql -U postgres -h localhost -c "CREATE DATABASE ${dbName};"`, {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'Ranoosh123!' }
        });
        execSync(`psql -U postgres -h localhost -d ${dbName} -f "${snapshotFile}"`, {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'Ranoosh123!' }
        });

        console.log(`[SNAPSHOT] Restored: ${milestoneName}`);
        return true;
    } catch (e) {
        console.error(`[SNAPSHOT] Error restoring snapshot ${milestoneName}:`, e.message);
        return false;
    }
}

/**
 * List available snapshots
 */
function listSnapshots() {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
        return [];
    }
    return fs.readdirSync(SNAPSHOT_DIR)
        .filter(f => f.endsWith('.sql'))
        .map(f => f.replace('.sql', ''));
}

module.exports = { addTestUserBalance, createSnapshot, restoreSnapshot, listSnapshots };
