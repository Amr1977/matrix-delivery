const { spawn } = require('child_process');

const child = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
});

child.on('error', (err) => {
    console.error('Failed to start frontend:', err);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
    child.kill('SIGINT');
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
});
