# Start Frontend Server Only
# Run this script from PowerShell to start just the frontend server

Write-Host "Starting Frontend Server..." -ForegroundColor Cyan

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

# Clean up existing frontend process
Write-Host "Cleaning up existing frontend process..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 3000
Start-Sleep -Seconds 2

# Check if frontend directory exists
if (-not (Test-Path "frontend")) {
    Write-Host "Frontend directory not found!" -ForegroundColor Red
    Write-Host "   Make sure you're running this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Check if package.json exists in frontend
if (-not (Test-Path "frontend/package.json")) {
    Write-Host "Frontend package.json not found!" -ForegroundColor Red
    Write-Host "   Make sure the frontend directory contains a valid Node.js project" -ForegroundColor Yellow
    exit 1
}

# Start Frontend Server
Write-Host "Starting frontend server on port 3000..." -ForegroundColor Green
Set-Location "frontend"

try {
    # Start the server and capture output
    npm start
}
catch {
    Write-Host "Failed to start frontend server: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
finally {
    Set-Location ".."
}
