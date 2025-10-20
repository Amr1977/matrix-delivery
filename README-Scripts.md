# PowerShell Scripts for Matrix Delivery Platform

This directory contains PowerShell scripts to easily manage the Matrix Delivery Platform servers on Windows 10.

## 📋 Available Scripts

### 🚀 `start-servers.ps1`
**Starts both backend and frontend servers simultaneously**
- Automatically cleans up existing processes on ports 5000 and 3000
- Starts backend server on port 5000
- Starts frontend server on port 3000
- Shows real-time status of both servers
- Press Ctrl+C to stop all servers

**Usage:**
```powershell
.\start-servers.ps1
```

### 🔧 `start-backend.ps1`
**Starts only the backend server**
- Cleans up existing backend process on port 5000
- Starts backend server on port 5000
- Shows backend server output

**Usage:**
```powershell
.\start-backend.ps1
```

### 🎨 `start-frontend.ps1`
**Starts only the frontend server**
- Cleans up existing frontend process on port 3000
- Starts frontend server on port 3000
- Shows frontend server output

**Usage:**
```powershell
.\start-frontend.ps1
```

### 🛑 `stop-servers.ps1`
**Stops all running servers**
- Stops backend server on port 5000
- Stops frontend server on port 3000
- Cleans up any remaining Node.js processes related to the project

**Usage:**
```powershell
.\stop-servers.ps1
```

### 🛠️ `dev-setup.ps1`
**Sets up the development environment**
- Checks prerequisites (Node.js, npm)
- Installs all dependencies (root, backend, frontend)
- Installs Playwright browsers for testing
- Creates necessary directories
- Sets up environment files
- Provides next steps and URLs

**Usage:**
```powershell
.\dev-setup.ps1
```

## 🚀 Quick Start

1. **First time setup:**
   ```powershell
   .\dev-setup.ps1
   ```

2. **Start all servers:**
   ```powershell
   .\start-servers.ps1
   ```

3. **Stop all servers:**
   ```powershell
   .\stop-servers.ps1
   ```

## 🌐 URLs

- **Backend API:** http://localhost:5000
- **Frontend App:** http://localhost:3000

## 🔧 Prerequisites

- Windows 10 with PowerShell 5.1 or later
- Node.js (version 14 or later)
- npm (comes with Node.js)

## 📝 Notes

- All scripts include error handling and cleanup
- Scripts automatically detect and kill existing processes on the required ports
- The `start-servers.ps1` script runs both servers in background jobs for better control
- Use `stop-servers.ps1` to cleanly shut down all servers before starting them again

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```powershell
.\stop-servers.ps1
# Wait a few seconds, then:
.\start-servers.ps1
```

### Permission Issues
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Node.js Not Found
Make sure Node.js is installed and in your PATH:
```powershell
node --version
npm --version
```

## 🧪 Running Tests

After starting the servers, you can run the BDD test suite:
```powershell
npm run test
```

Or run specific test phases:
```powershell
npm run test -- tests\features\user_management.feature
```
