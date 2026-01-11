const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const spawn = require('cross-spawn');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for local tool
        methods: ['GET', 'POST']
    }
});

const PORT = 4002;
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SUITES_CONFIG_PATH = path.join(PROJECT_ROOT, 'test-suites.json');

app.use(cors());
app.use(express.json());

// Load Test Suites
function getSuites() {
    try {
        const data = fs.readFileSync(SUITES_CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Failed to load suites:', err);
        return [];
    }
}

// Active Test Process
let activeProcess = null;

// Socket Connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
app.get('/api/suites', (req, res) => {
    res.json(getSuites());
});

app.get('/api/status', (req, res) => {
    res.json({
        isRunning: !!activeProcess,
        pid: activeProcess ? activeProcess.pid : null
    });
});

app.post('/api/run', (req, res) => {
    const { suiteId } = req.body;

    if (activeProcess) {
        return res.status(409).json({ error: 'A test is already running.' });
    }

    const suites = getSuites();
    const targetSuite = suites.find(s => s.id === suiteId);

    if (!targetSuite && suiteId !== 'all') {
        return res.status(404).json({ error: 'Suite not found.' });
    }

    let featurePaths = [];
    if (suiteId === 'all') {
        // Collect all features from all suites
        featurePaths = suites.flatMap(s => s.features);
    } else {
        featurePaths = targetSuite.features;
    }

    // Deduplicate paths
    featurePaths = [...new Set(featurePaths)];

    console.log(`Starting test run for suite: ${suiteId}`);
    console.log(`Features:`, featurePaths);

    // Notify clients
    io.emit('test:start', { suiteId, features: featurePaths });

    // Spawn Cucumber Process
    // We use npx and cross-env to ensure environment variables are set
    // Running in PROJECT_ROOT
    const args = [
        'cross-env',
        'NODE_ENV=testing',
        'npx',
        'cucumber-js',
        ...featurePaths,
        '-c', 'tests/cucumber.config.js',
        '--format', 'progress' // Simple format for streaming, or we can use generic to capture stdout better
    ];

    // Windows needs npx.cmd
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    // But wait, the args above start with cross-env if we use that tool.
    // Let's rely on package.json script context or just run it directly.
    // Best approach: construct the full command string for npx

    const suiteEnv = targetSuite?.env || {};
    const envArgs = Object.entries(suiteEnv).map(([key, val]) => `${key}=${val}`);

    const child = spawn(command, [
        'cross-env',
        'NODE_ENV=testing',
        ...envArgs,
        'npx',
        'cucumber-js',
        ...featurePaths,
        '-c', 'tests/cucumber.config.js'
    ], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
    });

    activeProcess = child;

    // Stream Output
    child.stdout.on('data', (data) => {
        const line = data.toString();
        // process.stdout.write(line); // Log to server console
        io.emit('test:log', { type: 'stdout', data: line });
    });

    child.stderr.on('data', (data) => {
        const line = data.toString();
        // process.stderr.write(line);
        io.emit('test:log', { type: 'stderr', data: line });
    });

    child.on('close', (code) => {
        console.log(`Test finished with code ${code}`);
        io.emit('test:end', { code, success: code === 0 });
        activeProcess = null;
    });

    child.on('error', (err) => {
        console.error('Failed to start subprocess:', err);
        io.emit('test:error', { message: err.message });
        activeProcess = null;
    });

    res.json({ message: 'Test execution started', pid: child.pid });
});

app.post('/api/stop', (req, res) => {
    if (activeProcess) {
        activeProcess.kill();
        activeProcess = null;
        io.emit('test:end', { code: -1, success: false, message: 'Aborted by user' });
        return res.json({ message: 'Process terminated' });
    }
    res.status(400).json({ error: 'No process running' });
});

server.listen(PORT, () => {
    console.log(`Test Audit Dashboard Server running on http://localhost:${PORT}`);
});
