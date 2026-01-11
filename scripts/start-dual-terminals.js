#!/usr/bin/env node
/**
 * Dual Terminal Launcher
 * Opens two separate terminal windows for Backend and Frontend
 * 
 * Usage: node scripts/start-dual-terminals.js
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

console.log(`${colors.cyan}🚀 Launching Development Servers in Separate Terminals...${colors.reset}\n`);

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

if (isWindows) {
    // Windows: Use Windows Terminal (wt) if available, fallback to cmd

    // Check if Windows Terminal is available
    const useWindowsTerminal = process.env.WT_SESSION !== undefined;

    if (useWindowsTerminal) {
        // Use Windows Terminal with tabs
        console.log(`${colors.magenta}📟 Detected Windows Terminal${colors.reset}`);

        spawn('wt', [
            '-w', '0',
            'new-tab', '-d', BACKEND_DIR, '--title', 'Backend', 'cmd', '/k', 'npm run dev',
            ';',
            'new-tab', '-d', FRONTEND_DIR, '--title', 'Frontend', 'cmd', '/k', 'npm start'
        ], {
            shell: true,
            detached: true,
            stdio: 'ignore'
        });
    } else {
        // Fallback to separate cmd windows
        // Windows 'start' syntax: start "title" /D "workdir" cmd /k "command"
        console.log(`${colors.blue}📦 Starting Backend Server (new window)...${colors.reset}`);
        const backendCmd = `start "Backend - Matrix Delivery" cmd /k "cd /d ${BACKEND_DIR} && npm run dev"`;
        spawn('cmd', ['/c', backendCmd], {
            shell: true,
            detached: true,
            stdio: 'ignore'
        });

        console.log(`${colors.green}🎨 Starting Frontend Server (new window)...${colors.reset}`);
        const frontendCmd = `start "Frontend - Matrix Delivery" cmd /k "cd /d ${FRONTEND_DIR} && npm start"`;
        spawn('cmd', ['/c', frontendCmd], {
            shell: true,
            detached: true,
            stdio: 'ignore'
        });
    }

} else if (isMac) {
    // macOS: Use AppleScript to open Terminal windows
    console.log(`${colors.blue}📦 Starting Backend Server (new Terminal tab)...${colors.reset}`);
    spawn('osascript', ['-e', `
        tell application "Terminal"
            activate
            do script "cd '${BACKEND_DIR}' && npm run dev"
        end tell
    `], { detached: true, stdio: 'ignore' });

    console.log(`${colors.green}🎨 Starting Frontend Server (new Terminal tab)...${colors.reset}`);
    spawn('osascript', ['-e', `
        tell application "Terminal"
            do script "cd '${FRONTEND_DIR}' && npm start"
        end tell
    `], { detached: true, stdio: 'ignore' });

} else {
    // Linux: Try various terminal emulators
    const terminals = [
        { cmd: 'gnome-terminal', args: (dir, cmd) => ['--', 'bash', '-c', `cd "${dir}" && ${cmd}; exec bash`] },
        { cmd: 'konsole', args: (dir, cmd) => ['--workdir', dir, '-e', 'bash', '-c', `${cmd}; exec bash`] },
        { cmd: 'xterm', args: (dir, cmd) => ['-e', `cd "${dir}" && ${cmd}; exec bash`] }
    ];

    let terminalFound = false;
    for (const term of terminals) {
        try {
            // Try to spawn with this terminal
            console.log(`${colors.blue}📦 Starting Backend Server (${term.cmd})...${colors.reset}`);
            spawn(term.cmd, term.args(BACKEND_DIR, 'npm run dev'), { detached: true, stdio: 'ignore' });

            console.log(`${colors.green}🎨 Starting Frontend Server (${term.cmd})...${colors.reset}`);
            spawn(term.cmd, term.args(FRONTEND_DIR, 'npm start'), { detached: true, stdio: 'ignore' });

            terminalFound = true;
            break;
        } catch (e) {
            continue;
        }
    }

    if (!terminalFound) {
        console.log(`${colors.yellow}⚠️  No supported terminal emulator found. Please start manually:${colors.reset}`);
        console.log(`   Backend:  cd ${BACKEND_DIR} && npm run dev`);
        console.log(`   Frontend: cd ${FRONTEND_DIR} && npm start`);
        process.exit(1);
    }
}

console.log(`
${colors.yellow}═══════════════════════════════════════════════════${colors.reset}
${colors.cyan}✅ Terminal windows launched!${colors.reset}

${colors.blue}Backend:${colors.reset}  http://localhost:5000
${colors.green}Frontend:${colors.reset} http://localhost:3000

${colors.magenta}💡 Tip:${colors.reset} Close this terminal - the servers will keep running.
${colors.magenta}   ${colors.reset} To stop them, close the individual server windows.
${colors.yellow}═══════════════════════════════════════════════════${colors.reset}
`);

// Exit this script (terminals are detached)
process.exit(0);
