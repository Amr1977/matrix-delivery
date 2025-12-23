import { AfterAll, BeforeAll, After } from '@cucumber/cucumber';
// @ts-ignore
import pool from '../../backend/config/db';
import '../step_definitions/backend/landing_reviews_steps'; // Force load steps

// Sanity check before tests
BeforeAll(async function () {
    console.log('🚀 Starting Backend BDD Tests...');
});

// Close DB pool after all tests to prevent hangs
AfterAll(async function () {
    console.log('🛑 Closing Database Pool...');
    await pool.end();
    console.log('✅ Database Pool Closed');
});

// Optional: clean up data after each scenario if needed
// (Already handled in step definitions, but could be globalized here)
