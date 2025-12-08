#!/usr/bin/env node
/**
 * Restart Development Servers
 * Stops and starts both backend and frontend servers
 */

const { spawn } = require('child_process');
const path = require('path');

async function runScript(scriptPath, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n${description}...`);

        const child = spawn('node', [scriptPath], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${description} completed`);
                resolve();
            } else {
                console.error(`❌ ${description} failed with code ${code}`);
                reject(new Error(`${description} failed`));
            }
        });

        child.on('error', (error) => {
            console.error(`❌ Error running ${description}:`, error.message);
            reject(error);
        });
    });
}

async function restart() {
    console.log('🔄 Matrix Delivery Server Restart\n');
    console.log(`${'='.repeat(80)}\n`);

    try {
        // Stop servers
        await runScript(
            path.join(__dirname, 'stop-dev.js'),
            'Stopping servers'
        );

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start servers
        await runScript(
            path.join(__dirname, 'start-dev.js'),
            'Starting servers'
        );

        console.log(`\n${'='.repeat(80)}`);
        console.log('✅ Servers restarted successfully!');
        console.log(`${'='.repeat(80)}\n`);
    } catch (error) {
        console.error('\n❌ Restart failed:', error.message);
        process.exit(1);
    }
}

restart();
