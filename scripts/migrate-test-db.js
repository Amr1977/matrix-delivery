#!/usr/bin/env node
/**
 * Run migration on test database
 */

// Force test environment
process.env.NODE_ENV = 'test';

const { up } = require('../backend/migrations/rename_role_columns');

console.log('Running migration on TEST database...\n');

up()
    .then(() => {
        console.log('\n✅ Migration completed on test database');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    });
