#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');

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

console.log('🛑 Stopping Matrix Delivery Development Environment...');

// Function to find and kill processes on specific ports
function killProcessOnPort(port, name) {
  return new Promise((resolve) => {
    log(colors.blue, `🔍 Looking for ${name} processes on port ${port}...`);

    // Use different commands for Windows vs Unix-like systems
    const isWindows = process.platform === 'win32';
    let command, args;

    if (isWindows) {
      // Windows: use netstat and taskkill
      command = 'cmd';
      args = ['/c', `netstat -ano | findstr :${port} | findstr LISTENING`];
    } else {
      // Unix-like: use lsof and kill
      command = 'sh';
      args = ['-c', `lsof -ti:${port} 2>/dev/null`];
    }

    const checkPort = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let pids = [];

    checkPort.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        if (isWindows) {
          // Parse Windows netstat output to get PID
          const lines = output.split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                pids.push(pid);
              }
            }
          });
        } else {
          // Unix output is just PIDs
          const lines = output.split('\n');
          lines.forEach(line => {
            const pid = line.trim();
            if (pid && !isNaN(pid)) {
              pids.push(pid);
            }
          });
        }
      }
    });

    checkPort.on('close', (code) => {
      if (pids.length === 0) {
        log(colors.yellow, `⚠️  No ${name} processes found on port ${port}`);
        resolve();
        return;
      }

      log(colors.blue, `📋 Found ${pids.length} ${name} process(es): ${pids.join(', ')}`);

      // Kill the processes
      pids.forEach(pid => {
        try {
          if (isWindows) {
            spawn('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' });
          } else {
            process.kill(pid, 'SIGTERM');
          }
          log(colors.green, `✅ Killed ${name} process ${pid}`);
        } catch (error) {
          log(colors.red, `❌ Failed to kill ${name} process ${pid}: ${error.message}`);
        }
      });

      // Give processes time to shut down gracefully
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    checkPort.on('error', (error) => {
      log(colors.yellow, `⚠️  Could not check for ${name} processes: ${error.message}`);
      resolve();
    });
  });
}

// Function to kill Node.js processes by name pattern
function killNodeProcesses() {
  return new Promise((resolve) => {
    log(colors.blue, '🔍 Looking for Node.js development processes...');

    const isWindows = process.platform === 'win32';
    let command, args;

    if (isWindows) {
      // Windows: use tasklist and taskkill
      command = 'cmd';
      args = ['/c', 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV'];
    } else {
      // Unix-like: use pgrep and kill
      command = 'sh';
      args = ['-c', 'pgrep -f "node.*server.js\\|npm.*start"'];
    }

    const findProcesses = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let processes = [];

    findProcesses.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        if (isWindows) {
          // Parse Windows tasklist CSV output
          const lines = output.split('\n');
          lines.forEach(line => {
            if (line.includes('node.exe')) {
              const parts = line.split(',');
              if (parts.length >= 2) {
                const pid = parts[1].replace(/"/g, '');
                if (pid && !isNaN(pid)) {
                  processes.push(pid);
                }
              }
            }
          });
        } else {
          // Unix output is just PIDs
          const lines = output.split('\n');
          lines.forEach(line => {
            const pid = line.trim();
            if (pid && !isNaN(pid)) {
              processes.push(pid);
            }
          });
        }
      }
    });

    findProcesses.on('close', (code) => {
      if (processes.length === 0) {
        log(colors.yellow, '⚠️  No Node.js development processes found');
        resolve();
        return;
      }

      log(colors.blue, `📋 Found ${processes.length} Node.js process(es): ${processes.join(', ')}`);

      // Kill the processes
      processes.forEach(pid => {
        try {
          if (isWindows) {
            spawn('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' });
          } else {
            process.kill(pid, 'SIGTERM');
          }
          log(colors.green, `✅ Killed Node.js process ${pid}`);
        } catch (error) {
          log(colors.red, `❌ Failed to kill Node.js process ${pid}: ${error.message}`);
        }
      });

      // Give processes time to shut down gracefully
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    findProcesses.on('error', (error) => {
      log(colors.yellow, `⚠️  Could not find Node.js processes: ${error.message}`);
      resolve();
    });
  });
}

// Function to clean up log files
function cleanupLogs() {
  const fs = require('fs');
  const path = require('path');

  const logsDir = path.join(process.cwd(), 'logs');

  if (fs.existsSync(logsDir)) {
    log(colors.blue, '🧹 Cleaning up old log files...');

    try {
      const files = fs.readdirSync(logsDir);
      let cleaned = 0;

      files.forEach(file => {
        if (file.endsWith('.log') || file.endsWith('.out') || file.endsWith('.err')) {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);

          // Remove files older than 1 hour
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        }
      });

      if (cleaned > 0) {
        log(colors.green, `✅ Cleaned up ${cleaned} old log file(s)`);
      } else {
        log(colors.blue, 'ℹ️  No old log files to clean');
      }
    } catch (error) {
      log(colors.yellow, `⚠️  Could not clean log files: ${error.message}`);
    }
  }
}

// Main function
async function main() {
  try {
    log(colors.yellow, '🛑 Stopping Matrix Delivery Development Environment...');

    // Kill processes on specific ports
    await killProcessOnPort(3000, 'Frontend');
    await killProcessOnPort(5000, 'Backend');

    // Kill any remaining Node.js development processes
    await killNodeProcesses();

    // Clean up logs
    cleanupLogs();

    // Final check - try to see if ports are still in use
    setTimeout(() => {
      log(colors.blue, '🔍 Final port check...');

      const checkPorts = ['3000', '5000'];
      let checksCompleted = 0;

      checkPorts.forEach(port => {
        exec(`curl -f http://localhost:${port} >nul 2>&1`, (error) => {
          checksCompleted++;
          if (error) {
            log(colors.green, `✅ Port ${port} is free`);
          } else {
            log(colors.yellow, `⚠️  Port ${port} may still be in use`);
          }

          if (checksCompleted === checkPorts.length) {
            console.log('');
            log(colors.green, '════════════════════════════════════════');
            log(colors.green, '✨ Matrix Delivery Development Environment Stopped!');
            log(colors.green, '════════════════════════════════════════');
            console.log('');
            log(colors.cyan, '💡 To start again, run: node start-dev.js');
            console.log('');
          }
        });
      });
    }, 3000);

  } catch (error) {
    log(colors.red, `❌ Error during shutdown: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
