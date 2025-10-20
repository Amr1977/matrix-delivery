# Stop All Servers Script for Matrix Delivery Platform
# Run this script from PowerShell to stop all running servers

Write-Host "Stopping Matrix Delivery Platform Servers..." -ForegroundColor Yellow

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServerName)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($processes) {
            foreach ($process in $processes) {
                $pid = $process.OwningProcess
                if ($pid) {
                    Write-Host "   Stopping $ServerName (PID: $pid) on port $Port" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "   $ServerName stopped" -ForegroundColor Green
        } else {
            Write-Host "   No $ServerName process found on port $Port" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   Error stopping $ServerName: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Stop Backend Server (Port 5000)
Write-Host "Stopping Backend Server..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 5000 -ServerName "Backend"

# Stop Frontend Server (Port 3000)
Write-Host "Stopping Frontend Server..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 3000 -ServerName "Frontend"

# Additional cleanup - kill any remaining Node.js processes that might be related
Write-Host "Cleaning up remaining Node.js processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -and ($commandLine -like "*matrix-delivery*" -or $commandLine -like "*deliverhub*")) {
                Write-Host "   Stopping Node.js process (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Write-Host "   Cleanup complete" -ForegroundColor Green
}
catch {
    Write-Host "   No additional Node.js processes to clean up" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All servers stopped successfully!" -ForegroundColor Green
Write-Host "   You can now safely start servers again using start-servers.ps1" -ForegroundColor White
