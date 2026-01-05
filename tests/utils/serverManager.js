const { spawn } = require('child_process');
const path = require('path');

class ServerManager {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.backendPort = process.env.BACKEND_PORT || '5000';
    this.frontendPort = process.env.FRONTEND_PORT || '3000';
    this.backendUrl = `http://localhost:${this.backendPort}`;
    this.frontendUrl = `http://localhost:${this.frontendPort}`;
  }

  async startBackend() {
    if (this.backendProcess) {
      console.log('Backend already running');
      return;
    }

    console.log('🚀 Starting backend server...');

    return new Promise((resolve, reject) => {
      this.backendProcess = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '../../backend'),
        shell: true,
        env: {
          ...process.env,
          ENV_FILE: '.env.testing',
          INIT_TEST_DB: 'true'
        }
      });

      let output = '';
      let hasResolved = false;

      this.backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (!hasResolved && output.includes('Server running')) {
          hasResolved = true;
          console.log('   ✅ Backend server started');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error('Backend error:', data.toString());
      });

      this.backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error);
        reject(error);
      });

      setTimeout(() => {
        if (!hasResolved && !output.includes('Server running')) {
          reject(new Error('Backend server did not start in time. Output: ' + output.slice(-500)));
        }
      }, 60000);
    });
  }

  async startFrontend() {
    if (this.frontendProcess) {
      console.log('Frontend already running');
      return;
    }

    console.log('🚀 Starting frontend server...');

    return new Promise((resolve, reject) => {
      this.frontendProcess = spawn('npm.cmd', ['start'], {
        cwd: path.join(__dirname, '../../frontend'),
        shell: true,
        env: {
          ...process.env,
          PORT: this.frontendPort,
          HOST: 'localhost',
          BROWSER: 'none',
          REACT_APP_API_URL: `${this.backendUrl}/api`,
          NODE_OPTIONS: '--max-old-space-size=4096'
        }
      });

      let output = '';
      let hasResolved = false;

      this.frontendProcess.stdout.on('data', (data) => {
        output += data.toString();
        // console.log('Frontend stdout:', data.toString().trim()); 
        if (!hasResolved && (output.includes('webpack compiled') || output.includes('Compiled successfully') || output.includes('Local:'))) {
          hasResolved = true;
          console.log('   ✅ Frontend server started');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        // console.log('Frontend stderr:', msg.trim());
        if (!msg.includes('webpack compiled')) {
          output += msg;
          if (!hasResolved && (output.includes('Compiled successfully') || output.includes('Local:'))) {
            hasResolved = true;
            console.log('   ✅ Frontend server started');
            resolve();
          }
        }
      });

      this.frontendProcess.on('error', (error) => {
        console.error('Failed to start frontend:', error);
        reject(error);
      });

      setTimeout(() => {
        if (!hasResolved) {
          reject(new Error('Frontend server did not start in time: ' + output.slice(-200)));
        }
      }, 120000);
    });
  }

  async stop() {
    console.log('\n🛑 Stopping servers...');

    const killProcess = (process, name) => {
      return new Promise((resolve) => {
        if (!process) {
          resolve();
          return;
        }

        console.log(`   Stopping ${name}...`);

        try {
          if (process.pid) {
            // Windows specific kill
            spawn('taskkill', ['/pid', process.pid, '/f', '/t'], {
              shell: true,
              stdio: 'ignore'
            });
          }
        } catch (e) {
          // Ignore error if process already dead
        }
        resolve();
      });
    };

    await Promise.all([
      killProcess(this.frontendProcess, 'frontend'),
      killProcess(this.backendProcess, 'backend')
    ]);

    this.frontendProcess = null;
    this.backendProcess = null;

    // Cleanup ports
    try {
      const killPort = (port) => new Promise(resolve => {
        spawn('npx', ['kill-port', port], { shell: true, stdio: 'ignore' }).on('close', resolve);
      });
      await Promise.all([killPort(3000), killPort(5000)]);
    } catch (e) {
      // ignore
    }

    console.log('   ✅ All servers stopped\n');
  }
}

module.exports = new ServerManager();
