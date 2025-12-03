# Quick Fix: Add Missing Secrets to .env
# This script adds JWT_REFRESH_SECRET and ENCRYPTION_KEY to your local .env file

$envFile = "backend\.env"
$secretsFile = "secrets_production_20251203_052154.txt"

Write-Host "🔧 Adding missing secrets to $envFile..." -ForegroundColor Cyan

# Read secrets from file
$secrets = Get-Content $secretsFile
$jwtRefreshSecret = ($secrets | Select-String "JWT_REFRESH_SECRET=(.+)").Matches.Groups[1].Value.Trim()
$encryptionKey = ($secrets | Select-String "ENCRYPTION_KEY=(.+)").Matches.Groups[1].Value.Trim()

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "❌ $envFile not found!" -ForegroundColor Red
    exit 1
}

# Read current .env content
$envContent = Get-Content $envFile -Raw

# Add missing variables if they don't exist
if ($envContent -notmatch "JWT_REFRESH_SECRET=") {
    Add-Content -Path $envFile -Value "`nJWT_REFRESH_SECRET=$jwtRefreshSecret"
    Write-Host "✅ Added JWT_REFRESH_SECRET" -ForegroundColor Green
}
else {
    Write-Host "ℹ️  JWT_REFRESH_SECRET already exists" -ForegroundColor Yellow
}

if ($envContent -notmatch "ENCRYPTION_KEY=") {
    Add-Content -Path $envFile -Value "ENCRYPTION_KEY=$encryptionKey"
    Write-Host "✅ Added ENCRYPTION_KEY" -ForegroundColor Green
}
else {
    Write-Host "ℹ️  ENCRYPTION_KEY already exists" -ForegroundColor Yellow
}

Write-Host "`n✅ Done! Your .env file is now updated." -ForegroundColor Green
Write-Host "`nNext step: Restart your server with 'npm run dev'" -ForegroundColor Cyan
