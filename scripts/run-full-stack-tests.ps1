$ErrorActionPreference = "Stop"

Write-Host "Starting Full Stack Smoke Tests..." -ForegroundColor Cyan

# 1. Start Backend in Background
Write-Host "Starting Backend Server (Test Mode)..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "set NODE_ENV=testing&& set PORT=5000&& npm run start" -WorkingDirectory "backend" -PassThru -NoNewWindow

# Wait for Backend to be ready (poll port 5000)
Write-Host "Waiting for Backend to be ready on port 5000..."
$maxRetries = 30
$retryCount = 0
$backendReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient("localhost", 5000)
        $conn.Close()
        $backendReady = $true
        break
    }
    catch {
        Start-Sleep -Seconds 1
        $retryCount++
    }
}

if (-not $backendReady) {
    Write-Error "Backend failed to start on port 5000"
    Stop-Process -Id $backendProcess.Id -Force
    exit 1
}

Write-Host "Backend is UP!" -ForegroundColor Green

# 2. Build Frontend for Test
Write-Host "Building Frontend (Test Mode)..." -ForegroundColor Yellow
Set-Location -Path "frontend"
try {
    # Use the build:test script which copies .env.testing
    npm run build:test
}
catch {
    Write-Error "Frontend Build Failed"
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# 3. Serve Frontend
Write-Host "Serving Frontend on port 3001..." -ForegroundColor Yellow
# Using npx serve in background. 
# We use Start-Process again so we can kill it later.
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx serve -s build -l 3001" -PassThru -NoNewWindow

# Wait for Frontend to be ready
Write-Host "Waiting for Frontend to be ready on port 3001..."
$retryCount = 0
$frontendReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient("localhost", 3001)
        $conn.Close()
        $frontendReady = $true
        break
    }
    catch {
        Start-Sleep -Seconds 1
        $retryCount++
    }
}

if (-not $frontendReady) {
    Write-Error "Frontend failed to start on port 3001"
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Frontend is UP!" -ForegroundColor Green

# 4. Run Playwright Tests
Write-Host "Running Playwright Tests..." -ForegroundColor Cyan
try {
    $env:BASE_URL = "http://localhost:3001"
    npx playwright test
    Write-Host "All Tests Passed!" -ForegroundColor Green
}
catch {
    Write-Error "Tests Failed"
}
finally {
    # Cleanup
    Write-Host "Cleaning up processes..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Done."
}
