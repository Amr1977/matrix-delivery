# Start All Servers Script for Matrix Delivery Platform
# Run this script from PowerShell to start both backend and frontend servers

Write-Host "Starting Matrix Delivery Platform Servers..." -ForegroundColor Green

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

# Clean up existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 5000
Stop-ProcessOnPort -Port 3000
Start-Sleep -Seconds 2

# Start Backend Server
Write-Host "Starting Backend Server (Port 5000)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "backend"
    npm start
}

# Wait for backend to start
Write-Host "   Waiting for backend to start..." -ForegroundColor Gray
$timeout = 30
$elapsed = 0
while ($elapsed -lt $timeout) {
    if (Test-Port -Port 5000) {
        Write-Host "   ✅ Backend server started on port 5000" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if ($elapsed -ge $timeout) {
    Write-Host "   Backend server failed to start within $timeout seconds" -ForegroundColor Red
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

# Start Frontend Server
Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "frontend"
    npm start
}

# Wait for frontend to start
Write-Host "   Waiting for frontend to start..." -ForegroundColor Gray
$timeout = 60
$elapsed = 0
while ($elapsed -lt $timeout) {
    if (Test-Port -Port 3000) {
        Write-Host "   ✅ Frontend server started on port 3000" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if ($elapsed -ge $timeout) {
    Write-Host "   Frontend server failed to start within $timeout seconds" -ForegroundColor Red
    Stop-Job $frontendJob
    Remove-Job $frontendJob
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

Write-Host ""
Write-Host "All servers started successfully!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow

# Keep script running and show job status
try {
    while ($true) {
        $backendStatus = $backendJob.State
        $frontendStatus = $frontendJob.State

        if ($backendStatus -eq "Failed" -or $frontendStatus -eq "Failed") {
            Write-Host "One or more servers failed!" -ForegroundColor Red
            break
        }

        Start-Sleep -Seconds 5
    }
}
finally {
    Write-Host "Stopping all servers..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "All servers stopped" -ForegroundColor Green
}
