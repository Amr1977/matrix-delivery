const { spawn } = require('child_process');
const path = require('path');

const runTest = (testFile) => {
    return new Promise((resolve, reject) => {
        console.log(`Running test: ${testFile}`);
        const start = Date.now();

        // Use npx.cmd on Windows, npx on others
        const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        const child = spawn(npx, ['jest', testFile, '--detectOpenHandles'], {
            cwd: path.join(__dirname, '..'), // Run from backend dir
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, NODE_ENV: 'test' }
        });

        // Set a timeout to detect hanging
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`TEST HANGED: Process did not exit within 30 seconds.`));
        }, 30000); // 30s timeout

        child.on('close', (code) => {
            clearTimeout(timeout);
            const duration = Date.now() - start;
            // Exit code 1 just means tests failed, but process terminated. That is SUCCESS for this check.
            console.log(`Test exited with code ${code} in ${duration}ms`);
            resolve(`TERMINATED: Process exited cleanly.`);
        });

        child.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
};

async function check() {
    try {
        // Check the refactored test first
        console.log(await runTest('tests/verification_refactor.test.js'));

        // Check the auth test
        console.log(await runTest('tests/auth.test.js'));

        console.log('\n✅ ALL TESTS TERMINATED CORRECTLY');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TERMINATION CHECK FAILED');
        console.error(error.message);
        process.exit(1);
    }
}

check();
