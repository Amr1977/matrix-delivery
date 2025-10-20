# Development Setup Script for Matrix Delivery Platform
# Run this script to set up the development environment

Write-Host "Setting up Matrix Delivery Platform Development Environment..." -ForegroundColor Green

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
if (-not (Test-Command "node")) {
    Write-Host "Node.js not found! Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
} else {
    $nodeVersion = node --version
    Write-Host "   Node.js $nodeVersion found" -ForegroundColor Green
}

# Check npm
if (-not (Test-Command "npm")) {
    Write-Host "npm not found! Please install npm" -ForegroundColor Red
    exit 1
} else {
    $npmVersion = npm --version
    Write-Host "   npm $npmVersion found" -ForegroundColor Green
}

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "Not in the correct project directory!" -ForegroundColor Red
    Write-Host "   Make sure you're in the matrix-delivery project root directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "   Project structure looks good" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan

# Install root dependencies
Write-Host "   Installing root dependencies..." -ForegroundColor Gray
try {
    npm install
    Write-Host "   Root dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "   Failed to install root dependencies: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "   Installing backend dependencies..." -ForegroundColor Gray
try {
    Set-Location "backend"
    npm install
    Set-Location ".."
    Write-Host "   Backend dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "   Failed to install backend dependencies: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

# Install frontend dependencies
Write-Host "   Installing frontend dependencies..." -ForegroundColor Gray
try {
    Set-Location "frontend"
    npm install
    Set-Location ".."
    Write-Host "   Frontend dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "   Failed to install frontend dependencies: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

# Install Playwright browsers for testing
Write-Host ""
Write-Host "Installing Playwright browsers for testing..." -ForegroundColor Cyan
try {
    npx playwright install
    Write-Host "   Playwright browsers installed" -ForegroundColor Green
}
catch {
    Write-Host "   Playwright installation failed, but you can install it later with: npx playwright install" -ForegroundColor Yellow
}

# Create necessary directories
Write-Host ""
Write-Host "Creating necessary directories..." -ForegroundColor Cyan
$directories = @("backend/database", "reports", "reports/screenshots", "tests", "tests/features", "tests/step_definitions", "tests/support", "tests/utils")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "   Directory already exists: $dir" -ForegroundColor Gray
    }
}

# Set up environment files if they don't exist
Write-Host ""
Write-Host "Setting up environment files..." -ForegroundColor Cyan

if (-not (Test-Path "backend/.env")) {
    $envContent = @"
# Backend Environment Variables
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
"@
    Set-Content -Path "backend/.env" -Value $envContent
    Write-Host "   Created backend/.env file" -ForegroundColor Green
} else {
    Write-Host "   backend/.env already exists" -ForegroundColor Gray
}

if (-not (Test-Path "frontend/.env")) {
    $envContent = @"
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5000
"@
    Set-Content -Path "frontend/.env" -Value $envContent
    Write-Host "   Created frontend/.env file" -ForegroundColor Green
} else {
    Write-Host "   frontend/.env already exists" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "   1. Run '.\start-servers.ps1' to start both servers" -ForegroundColor Gray
Write-Host "   2. Or run '.\start-backend.ps1' and '.\start-frontend.ps1' separately" -ForegroundColor Gray
Write-Host "   3. Run 'npm run test' to run the BDD test suite" -ForegroundColor Gray
Write-Host "   4. Run '.\stop-servers.ps1' to stop all servers" -ForegroundColor Gray
Write-Host ""
Write-Host "URLs:" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Gray
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
