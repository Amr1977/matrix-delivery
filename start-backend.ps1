# Start Backend Server Only
# Run this script from PowerShell to start just the backend server

Write-Host "Starting Backend Server..." -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            $pid = $process.OwningProcess
            if ($pid) {
                Write-Host "   Killing process $pid on port $Port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        Write-Host "   No process found on port $Port" -ForegroundColor Gray
    }
}

# Clean up existing backend process
Write-Host "Cleaning up existing backend process..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 5000
Start-Sleep -Seconds 2

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "Backend directory not found!" -ForegroundColor Red
    Write-Host "   Make sure you're running this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Check if package.json exists in backend
if (-not (Test-Path "backend/package.json")) {
    Write-Host "Backend package.json not found!" -ForegroundColor Red
    Write-Host "   Make sure the backend directory contains a valid Node.js project" -ForegroundColor Yellow
    exit 1
}

# Start Backend Server
Write-Host "Starting backend server on port 5000..." -ForegroundColor Green
Set-Location "backend"

try {
    # Start the server and capture output
    npm start
}
catch {
    Write-Host "Failed to start backend server: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
finally {
    Set-Location ".."
}
