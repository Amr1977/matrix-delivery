#!/usr/bin/env node
/**
 * Test Runner Script for Statistics Tests
 * Runs the statistics test suite with proper configuration
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const testFile = args[0] || 'tests/statistics.test.js';

console.log('🧪 Matrix Delivery Statistics Test Runner\n');
console.log(`Running: ${testFile}\n`);
console.log(`${'='.repeat(80)}\n`);

const jest = spawn('npx', ['jest', testFile, '--verbose', '--detectOpenHandles', '--forceExit'], {
    cwd: path.join(__dirname, '../backend'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: true
});

jest.on('close', (code) => {
    console.log(`\n${'='.repeat(80)}`);
    if (code === 0) {
        console.log('✅ All statistics tests passed!');
    } else {
        console.log(`❌ Tests failed with exit code ${code}`);
    }
    console.log(`${'='.repeat(80)}\n`);
    process.exit(code);
});

jest.on('error', (error) => {
    console.error('❌ Failed to run tests:', error.message);
    process.exit(1);
});
