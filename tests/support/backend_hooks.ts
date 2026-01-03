import { AfterAll, BeforeAll, Before, setDefaultTimeout } from '@cucumber/cucumber';
// @ts-ignore
import pool from '../../backend/config/db';
// @ts-ignore
import serverManager from '../utils/serverManager';
import '../step_definitions/api/landing_reviews_steps'; // Force load steps

// Set default timeout to 180 seconds (server startup can take time)
setDefaultTimeout(180 * 1000);

// Check if port is already in use
const checkServerHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
            const health = await response.json();
            return health.status === 'healthy';
        }
        return false;
    } catch {
        return false;
    }
};

// Track if we started the server ourselves
let serverStartedByUs = false;

// Start server before all tests
BeforeAll(async function () {
    console.log('🚀 Starting Backend BDD Tests...');

    // Check if server is already running
    const serverAlreadyRunning = await checkServerHealth();

    if (serverAlreadyRunning) {
        console.log('   ✅ Backend server already running (using existing instance)');
        serverStartedByUs = false;
    } else {
        console.log('   🔄 Starting backend server...');
        try {
            await serverManager.startBackend();
            // Wait for server to fully initialize
            await new Promise(resolve => setTimeout(resolve, 3000));
            serverStartedByUs = true;
            console.log('   ✅ Backend server started successfully');
        } catch (error) {
            console.error('   ❌ Failed to start backend server:', error);
            throw error;
        }
    }
});

// Setup before each scenario - ensure apiUrl is set
Before(async function () {
    this.apiUrl = 'http://localhost:5000/api';
    this.testData = this.testData || {};
    this.testData.users = this.testData.users || {};
    this.testData.orders = this.testData.orders || {};
});

// Close DB pool and stop server after all tests
AfterAll(async function () {
    console.log('🛑 Cleaning up after tests...');

    // Stop server if we started it
    if (serverStartedByUs) {
        console.log('   Stopping backend server...');
        try {
            await serverManager.stop();
        } catch (error) {
            console.error('   Warning: Error stopping server:', error);
        }
    }

    // Close database pool
    try {
        console.log('   Closing Database Pool...');
        await pool.end();
        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('   Warning: Error closing pool:', error);
    }
});
