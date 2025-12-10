#!/usr/bin/env node

/**
 * Automated Build Testing Script
 * 
 * This script:
 * 1. Builds the production bundle
 * 2. Serves it locally on port 3001
 * 3. Runs automated smoke tests
 * 4. Reports results and exits with appropriate code
 * 
 * Usage: node test-build.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUILD_DIR = path.join(__dirname, 'build');
const PORT = 3001;
const TEST_TIMEOUT = 60000; // 60 seconds

let serverProcess = null;
let testsPassed = false;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, colors.bright + colors.cyan);
    console.log('='.repeat(60) + '\n');
}

function cleanup() {
    if (serverProcess) {
        log('🧹 Cleaning up server process...', colors.yellow);
        serverProcess.kill();
        serverProcess = null;
    }
}

function exitWithCode(code) {
    cleanup();
    process.exit(code);
}

// Handle process termination
process.on('SIGINT', () => {
    log('\n⚠️  Process interrupted', colors.yellow);
    exitWithCode(1);
});

process.on('SIGTERM', () => {
    log('\n⚠️  Process terminated', colors.yellow);
    exitWithCode(1);
});

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: options.silent ? 'pipe' : 'inherit',
            shell: true,
            ...options
        });

        let stdout = '';
        let stderr = '';

        if (options.silent) {
            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
        }

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with code ${code}\n${stderr}`));
            }
        });

        proc.on('error', (error) => {
            reject(error);
        });
    });
}

async function buildProduction() {
    logSection('📦 Building Production Bundle');

    try {
        log('Building with: npm run build:prod', colors.blue);
        await runCommand('npm', ['run', 'build:prod'], { cwd: __dirname });

        // Verify build directory exists
        if (!fs.existsSync(BUILD_DIR)) {
            throw new Error('Build directory not found after build');
        }

        // Check for index.html
        const indexPath = path.join(BUILD_DIR, 'index.html');
        if (!fs.existsSync(indexPath)) {
            throw new Error('index.html not found in build directory');
        }

        log('✅ Build completed successfully', colors.green);
        return true;
    } catch (error) {
        log(`❌ Build failed: ${error.message}`, colors.red);
        return false;
    }
}

async function startServer() {
    logSection('🚀 Starting Local Server');

    return new Promise((resolve, reject) => {
        log(`Starting server on port ${PORT}...`, colors.blue);

        // Use npx serve to serve the build directory
        serverProcess = spawn('npx', ['serve', '-s', 'build', '-p', PORT.toString()], {
            cwd: __dirname,
            shell: true,
            stdio: 'pipe'
        });

        let output = '';

        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            // Check if server is ready
            if (output.includes('Accepting connections')) {
                log(`✅ Server running at http://localhost:${PORT}`, colors.green);
                // Give it a moment to fully initialize
                setTimeout(() => resolve(true), 2000);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const message = data.toString();
            // serve outputs to stderr even for normal messages
            if (message.includes('Accepting connections')) {
                log(`✅ Server running at http://localhost:${PORT}`, colors.green);
                setTimeout(() => resolve(true), 2000);
            }
        });

        serverProcess.on('error', (error) => {
            log(`❌ Failed to start server: ${error.message}`, colors.red);
            reject(error);
        });

        serverProcess.on('close', (code) => {
            if (code !== 0 && code !== null) {
                reject(new Error(`Server exited with code ${code}`));
            }
        });

        // Timeout if server doesn't start
        setTimeout(() => {
            if (!serverProcess.killed) {
                reject(new Error('Server startup timeout'));
            }
        }, 15000);
    });
}

async function runSmokeTests() {
    logSection('🧪 Running Smoke Tests');

    try {
        log('Executing Playwright smoke tests...', colors.blue);

        // Check if smoke tests exist
        const smokeTestPath = path.join(__dirname, 'smoke-tests', 'build-smoke.test.js');
        if (!fs.existsSync(smokeTestPath)) {
            log('⚠️  Smoke test file not found, running basic checks only', colors.yellow);
            return await runBasicChecks();
        }

        // Run Playwright tests
        await runCommand('npx', ['playwright', 'test', 'smoke-tests/build-smoke.test.js'], {
            cwd: __dirname,
            env: { ...process.env, BASE_URL: `http://localhost:${PORT}` }
        });

        log('✅ All smoke tests passed', colors.green);
        return true;
    } catch (error) {
        log(`❌ Smoke tests failed: ${error.message}`, colors.red);
        return false;
    }
}

async function runBasicChecks() {
    log('Running basic connectivity check...', colors.blue);

    try {
        const http = require('http');

        return new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${PORT}`, (res) => {
                if (res.statusCode === 200) {
                    log('✅ Server is responding with 200 OK', colors.green);
                    resolve(true);
                } else {
                    log(`❌ Server responded with status ${res.statusCode}`, colors.red);
                    resolve(false);
                }
            });

            req.on('error', (error) => {
                log(`❌ Connection failed: ${error.message}`, colors.red);
                resolve(false);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                log('❌ Connection timeout', colors.red);
                resolve(false);
            });
        });
    } catch (error) {
        log(`❌ Basic check failed: ${error.message}`, colors.red);
        return false;
    }
}

async function main() {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
    log('║        Automated Build Testing Script                     ║', colors.bright + colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);
    console.log('\n');

    try {
        // Step 1: Build
        const buildSuccess = await buildProduction();
        if (!buildSuccess) {
            log('\n❌ Build failed - cannot proceed with testing', colors.red);
            exitWithCode(1);
        }

        // Step 2: Start server
        const serverStarted = await startServer();
        if (!serverStarted) {
            log('\n❌ Server failed to start - cannot run tests', colors.red);
            exitWithCode(1);
        }

        // Step 3: Run tests
        testsPassed = await runSmokeTests();

        // Final report
        logSection('📊 Test Results');
        if (testsPassed) {
            log('✅ All checks passed! Build is ready for deployment.', colors.bright + colors.green);
            log(`\n💡 You can manually verify at: http://localhost:${PORT}`, colors.cyan);
            log('   Press Ctrl+C to stop the server when done.\n', colors.cyan);

            // Keep server running for manual verification
            await new Promise(() => { }); // Wait indefinitely
        } else {
            log('❌ Some checks failed. Please review the errors above.', colors.bright + colors.red);
            exitWithCode(1);
        }

    } catch (error) {
        log(`\n❌ Unexpected error: ${error.message}`, colors.red);
        console.error(error);
        exitWithCode(1);
    }
}

// Run the script
main();
