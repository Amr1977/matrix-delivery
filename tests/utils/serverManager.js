const { spawn } = require('child_process');
const path = require('path');

class ServerManager {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.backendUrl = 'http://localhost:5000';
    this.frontendUrl = 'http://localhost:3000';
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
          PORT: 5000,
          JWT_SECRET: 'test-secret-key-12345'
        }
      });

      let output = '';
      
      this.backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running')) {
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

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('Server running')) {
          reject(new Error('Backend server did not start in time'));
        }
      }, 30000);
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
          PORT: 3000,
          BROWSER: 'none',
          REACT_APP_API_URL: 'http://localhost:5000/api'
        }
      });

      let output = '';
      
      this.frontendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('webpack compiled') || output.includes('Compiled successfully')) {
          console.log('   ✅ Frontend server started');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        // React dev server sends some messages to stderr that aren't errors
        if (!msg.includes('webpack compiled')) {
          output += msg;
          if (output.includes('Compiled successfully')) {
            console.log('   ✅ Frontend server started');
            resolve();
          }
        }
      });

      this.frontendProcess.on('error', (error) => {
        console.error('Failed to start frontend:', error);
        reject(error);
      });

      // Timeout after 120 seconds (React takes much longer to start)
      setTimeout(() => {
        if (!output.includes('webpack compiled') && !output.includes('Compiled successfully')) {
          reject(new Error('Frontend server did not start in time'));
        }
      }, 120000);
    });
  }

  async stop() {
    console.log('\n🛑 Stopping servers...');
    
    const killProcess = (process, name) => {
      return new Promise((resolve) => {
        if (process && !process.killed) {
          console.log(`   Stopping ${name}...`);
          
          // On Windows, use taskkill to ensure process and children are killed
          if (process.pid) {
            spawn('taskkill', ['/pid', process.pid, '/f', '/t'], { shell: true });
          }
          
          process.kill('SIGTERM');
          
          setTimeout(() => {
            if (!process.killed) {
              process.kill('SIGKILL');
            }
            resolve();
          }, 2000);
        } else {
          resolve();
        }
      });
    };
    
    await killProcess(this.frontendProcess, 'frontend');
    await killProcess(this.backendProcess, 'backend');
    
    this.frontendProcess = null;
    this.backendProcess = null;
    
    console.log('   ✅ All servers stopped\n');
  }
}

module.exports = new ServerManager();
