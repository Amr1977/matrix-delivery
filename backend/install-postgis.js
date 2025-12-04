#!/usr/bin/env node

/**
 * Install PostGIS Extension on Production Database
 * Enables spatial queries for distance-based filtering
 * 
 * Usage: node install-postgis.js
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

const printStatus = (msg) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`);
const printError = (msg) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`);
const printWarning = (msg) => console.log(`${colors.yellow}[!]${colors.reset} ${msg}`);

// PostgreSQL Connection Pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

async function installPostGIS() {
    console.log('=========================================');
    console.log('  Install PostGIS Extension');
    console.log('=========================================');
    console.log('');

    try {
        // Step 1: Check if PostGIS is already installed
        printStatus('Checking if PostGIS is already installed...');
        try {
            const versionResult = await pool.query('SELECT PostGIS_version()');
            if (versionResult.rows.length > 0) {
                printWarning('PostGIS is already installed!');
                console.log(`Version: ${versionResult.rows[0].postgis_version}`);
                console.log('');
                printStatus('Installation check completed');
                await pool.end();
                return;
            }
        } catch (err) {
            // PostGIS not installed, continue with installation
            printStatus('PostGIS not found, proceeding with installation...');
        }

        // Step 2: Install PostGIS package (requires sudo)
        printStatus('Installing PostGIS package...');
        printWarning('This requires sudo privileges. You may be prompted for password.');

        try {
            // Detect PostgreSQL version
            const pgVersionResult = await pool.query('SHOW server_version');
            const pgVersion = pgVersionResult.rows[0].server_version;
            const majorVersion = pgVersion.split('.')[0];

            console.log(`PostgreSQL version: ${pgVersion}`);
            console.log(`Installing PostGIS for PostgreSQL ${majorVersion}...`);

            const packageName = `postgresql-${majorVersion}-postgis-3`;

            await execPromise('sudo apt-get update');
            await execPromise(`sudo apt-get install -y postgresql-contrib postgis ${packageName}`);

            printStatus('PostGIS package installed successfully');
        } catch (installError) {
            printError('Failed to install PostGIS package');
            console.error('Error:', installError.message);
            printWarning('You may need to run this script with sudo or install manually:');
            console.log('  sudo apt-get install -y postgresql-contrib postgis postgresql-15-postgis-3');
            throw installError;
        }

        // Step 3: Enable PostGIS extension in the database
        printStatus('Enabling PostGIS extension in database...');
        await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
        printStatus('PostGIS extension enabled successfully');

        // Step 4: Verify PostGIS installation
        printStatus('Verifying PostGIS installation...');
        const versionResult = await pool.query('SELECT PostGIS_version()');

        if (versionResult.rows.length === 0) {
            throw new Error('PostGIS verification failed');
        }

        printStatus('PostGIS installed and verified');
        console.log('');
        console.log(`PostGIS Version: ${versionResult.rows[0].postgis_version}`);
        console.log('');

        // Step 5: Test spatial query
        printStatus('Testing spatial query...');
        const testQuery = `
      SELECT ST_Distance(
        ST_Point(0, 0)::geography,
        ST_Point(1, 1)::geography
      ) / 1000 as distance_km
    `;

        const distanceResult = await pool.query(testQuery);

        if (distanceResult.rows.length === 0) {
            throw new Error('Spatial query test failed');
        }

        printStatus('Spatial query test successful');
        console.log(`Test distance: ${distanceResult.rows[0].distance_km.toFixed(2)}km`);
        console.log('');

        printStatus('PostGIS installation completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Restart the backend: pm2 restart matrix-backend');
        console.log('  2. Check logs: pm2 logs matrix-backend | grep PostGIS');
        console.log('  3. Test driver order fetching');
        console.log('');
        console.log('The backend will now use PostGIS for faster distance calculations!');

    } catch (error) {
        printError('Installation failed');
        console.error('Error:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('  1. Make sure you have sudo privileges');
        console.log('  2. Check PostgreSQL is running: sudo systemctl status postgresql');
        console.log('  3. Verify database credentials in .env file');
        console.log('  4. Try manual installation:');
        console.log('     sudo apt-get install -y postgresql-contrib postgis');
        console.log('     sudo -u postgres psql -d ' + process.env.DB_NAME + ' -c "CREATE EXTENSION postgis;"');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the installation
installPostGIS().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
