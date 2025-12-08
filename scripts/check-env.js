#!/usr/bin/env node
/**
 * Environment Diagnostics Tool
 * Shows which environment files are loaded and their database configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Matrix Delivery Environment Diagnostics\n');
console.log(`${'='.repeat(80)}\n`);

// Check NODE_ENV
console.log(`📌 Current NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);

// List all .env files
const backendDir = path.join(__dirname, '../backend');
const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.testing',
    '.env.production'
];

console.log('📄 Environment Files:\n');
envFiles.forEach(file => {
    const filePath = path.join(backendDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file}`);
        console.log(`   Path: ${filePath}`);
        console.log(`   Size: ${stats.size} bytes`);
        console.log(`   Modified: ${stats.mtime.toISOString()}\n`);

        // Show DB-related env vars
        const content = fs.readFileSync(filePath, 'utf8');
        const dbVars = content.split('\n')
            .filter(line => line.startsWith('DB_') || line.startsWith('DATABASE_'))
            .filter(line => !line.includes('PASSWORD')); // Don't show passwords

        if (dbVars.length > 0) {
            console.log('   Database Config:');
            dbVars.forEach(line => console.log(`     ${line}`));
            console.log('');
        }
    } else {
        console.log(`❌ ${file} (not found)\n`);
    }
});

// Test loading each environment
console.log(`\n${'='.repeat(80)}\n`);
console.log('🧪 Testing Environment Loading:\n');

['development', 'test', 'production'].forEach(env => {
    console.log(`\n${env.toUpperCase()} Environment:`);
    console.log(`${'-'.repeat(40)}`);

    // Simulate loading
    const testEnv = { ...process.env, NODE_ENV: env };
    const IS_TEST = env === 'test' || env === 'testing';
    const envFile = IS_TEST ? '.env.testing' : '.env';
    const dbName = IS_TEST ? (testEnv.DB_NAME_TEST || 'matrix_delivery_test') : (testEnv.DB_NAME || 'matrix_delivery');

    console.log(`  Would load: ${envFile}`);
    console.log(`  Database: ${dbName}`);
    console.log(`  IS_TEST: ${IS_TEST}`);
});

console.log(`\n${'='.repeat(80)}\n`);
console.log('✅ Diagnostics complete\n');
