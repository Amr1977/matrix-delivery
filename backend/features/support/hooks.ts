import { BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
const pool = require('../../config/db');

// Set default timeout for steps (30 seconds)
setDefaultTimeout(30 * 1000);

BeforeAll(async function () {
    console.log('🔧 BDD Tests: Starting test suite');
});

AfterAll(async function () {
    console.log('🔧 BDD Tests: Cleaning up and closing database connections');

    try {
        // Close the database connection pool
        await pool.end();
        console.log('✅ Database connections closed successfully');
    } catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
});
