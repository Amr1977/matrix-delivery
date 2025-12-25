#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Starting Matrix Delivery LAN Development Environment...');
console.log('🏠 Working directory:', process.cwd());

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

// Get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIpAddress();
log(colors.blue, `📍 Detected Local IP: ${LOCAL_IP}`);

// Check if Node.js and npm are available
function checkPrerequisites() {
    log(colors.blue, '🔍 Checking prerequisites...');

    try {
        const nodeVersion = require('child_process').execSync('node --version', { encoding: 'utf8' }).trim();
        log(colors.green, `✅ Node.js version: ${nodeVersion}`);
    } catch (error) {
        log(colors.red, '❌ Node.js not found. Please install Node.js first.');
        process.exit(1);
    }

    try {
        const npmVersion = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
        log(colors.green, `✅ npm version: ${npmVersion}`);
    } catch (error) {
        log(colors.red, '❌ npm not found. Please install npm/Node.js first.');
        process.exit(1);
    }
}

// Install dependencies if needed
function installDependencies(dir, name) {
    return new Promise((resolve, reject) => {
        const nodeModulesPath = path.join(dir, 'node_modules');

        if (!fs.existsSync(nodeModulesPath)) {
            log(colors.yellow, `📦 Installing ${name} dependencies...`);

            const npmInstall = spawn('npm', ['install'], {
                cwd: dir,
                stdio: 'inherit',
                shell: true
            });

            npmInstall.on('close', (code) => {
                if (code === 0) {
                    log(colors.green, `✅ ${name} dependencies installed`);
                    resolve();
                } else {
                    log(colors.red, `❌ Failed to install ${name} dependencies`);
                    reject(new Error(`npm install failed for ${name}`));
                }
            });
        } else {
            log(colors.green, `✅ ${name} dependencies already installed`);
            resolve();
        }
    });
}

// Start backend server
function startBackend() {
    return new Promise((resolve, reject) => {
        log(colors.magenta, '🔧 Starting Backend Server...');

        const backendProcess = spawn('node', ['server.js'], {
            cwd: path.join(process.cwd(), 'backend'),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                // Inject CORS_ORIGIN to allow mobile access
                CORS_ORIGIN: `http://localhost:3000,http://${LOCAL_IP}:3000`
            }
        });

        let backendReady = false;

        backendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[BACKEND] ${output.trim()}`);

            // Check if backend is ready
            if (output.includes('Server running on:') && !backendReady) {
                backendReady = true;
                log(colors.green, `✅ Backend server started (PID: ${backendProcess.pid})`);
                resolve(backendProcess);
            }
        });

        backendProcess.stderr.on('data', (data) => {
            console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
        });

        backendProcess.on('close', (code) => {
            if (!backendReady) {
                log(colors.red, `❌ Backend server failed to start (exit code: ${code})`);
                reject(new Error('Backend failed to start'));
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!backendReady) {
                log(colors.red, '❌ Backend server startup timeout');
                backendProcess.kill();
                reject(new Error('Backend startup timeout'));
            }
        }, 30000);
    });
}

// Start frontend server
function startFrontend() {
    return new Promise((resolve, reject) => {
        log(colors.cyan, '🎨 Starting Frontend Server...');

        // Copy LAN environment file if it exists, otherwise create it
        const envLanSrc = path.join(process.cwd(), 'frontend', '.env.lan');
        const envDest = path.join(process.cwd(), 'frontend', '.env');

        // Create temporary .env content with dynamic IP
        const envContent = `
REACT_APP_API_URL=http://${LOCAL_IP}:5000/api
REACT_APP_ENV=development
REACT_APP_WHATSAPP_ADMIN_NUMBER=201094450141
OSRM_SERVER_URL=http://router.project-osrm.org
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51SXmth2VCfT9QpsyhhVfertRAI06V2DtFjnfFz0RNxlf4fJsa4Ai22dcEAbP7ZjmQuBBTHGrGvCL94F15l5uB6Ud00BdHTdmnX
REACT_APP_SENTRY_DSN=https://bb28a488442f28baab191c0fd51c2ca7@o108586.ingest.us.sentry.io/4510462640586752
`;

        try {
            fs.writeFileSync(envDest, envContent);
            log(colors.blue, `📋 Configured frontend environment for IP: ${LOCAL_IP}`);
        } catch (error) {
            log(colors.yellow, '⚠️  Could not write environment file:', error.message);
        }

        const frontendProcess = spawn('npm', ['start'], {
            cwd: path.join(process.cwd(), 'frontend'),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            env: {
                ...process.env,
                CI: 'false',
                PORT: '3000',
                HOST: '0.0.0.0',
                REACT_APP_API_URL: `http://${LOCAL_IP}:5000/api`
            }
        });

        let frontendReady = false;

        frontendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[FRONTEND] ${output.trim()}`);

            // Check if frontend is ready
            if ((output.includes('Local:') || output.includes('On Your Network:')) && !frontendReady) {
                frontendReady = true;
                log(colors.green, `✅ Frontend server started (PID: ${frontendProcess.pid})`);
                resolve(frontendProcess);
            }
        });

        frontendProcess.stderr.on('data', (data) => {
            console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
        });

        frontendProcess.on('close', (code) => {
            if (!frontendReady && code !== 0) {
                log(colors.red, `❌ Frontend server failed to start (exit code: ${code})`);
                reject(new Error('Frontend failed to start'));
            }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            if (!frontendReady) {
                log(colors.yellow, '⚠️  Frontend server may still be starting...');
                resolve(frontendProcess);
            }
        }, 60000);
    });
}

// Health check for backend
function checkBackendHealth() {
    return new Promise((resolve) => {
        log(colors.blue, '🔍 Checking backend health...');

        exec(`curl -f http://${LOCAL_IP}:5000/api/health`, (error, stdout, stderr) => {
            if (error) {
                log(colors.yellow, '⚠️  Backend health check failed (might be firewall or startup delay)');
                resolve(false);
            } else {
                log(colors.green, '✅ Backend health check passed');
                resolve(true);
            }
        });
    });
}

// Main function
async function main() {
    try {
        checkPrerequisites();

        // Create logs directory
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        // Install dependencies
        await installDependencies(path.join(process.cwd(), 'backend'), 'Backend');
        await installDependencies(path.join(process.cwd(), 'frontend'), 'Frontend');

        // Start servers
        const backendProcess = await startBackend();

        // Wait a bit for backend to initialize
        log(colors.blue, '⏳ Waiting for backend to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check backend health
        await checkBackendHealth();

        // Start frontend
        const frontendProcess = await startFrontend();

        // Display success message
        console.log('');
        log(colors.green, '════════════════════════════════════════');
        log(colors.green, '✨ Matrix Delivery LAN Environment Started!');
        log(colors.green, '════════════════════════════════════════');
        console.log('');
        log(colors.cyan, '📱 Access from your mobile device:');
        log(colors.cyan, `   URL: http://${LOCAL_IP}:3000`);
        console.log('');
        log(colors.yellow, '⚠️  IMPORTANT:');
        log(colors.yellow, '   1. Ensure your mobile is on the same WiFi network');
        log(colors.yellow, '   2. If it doesn\'t connect, check your Windows Firewall');
        log(colors.yellow, '   3. You may need to allow Node.js through the firewall');
        console.log('');
        log(colors.blue, '🔍 Check logs in the console above');
        console.log('');
        log(colors.yellow, '🛑 To stop: Press Ctrl+C');
        console.log('');

        // Handle process termination
        process.on('SIGINT', () => {
            log(colors.yellow, '🛑 Shutting down servers...');

            if (backendProcess && !backendProcess.killed) {
                backendProcess.kill();
                log(colors.blue, '✅ Backend server stopped');
            }

            if (frontendProcess && !frontendProcess.killed) {
                frontendProcess.kill();
                log(colors.blue, '✅ Frontend server stopped');
            }

            process.exit(0);
        });

        // Keep the script running
        process.stdin.resume();

    } catch (error) {
        log(colors.red, `❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the main function
main();
