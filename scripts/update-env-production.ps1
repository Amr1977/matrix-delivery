# Update .env.production with rotated secrets
# This script reads from the secrets file and updates .env.production

param(
    [string]$SecretsFile = "secrets_production_20251203_052154.txt"
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "! $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Updating .env.production with Rotated Secrets             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if secrets file exists
if (-not (Test-Path $SecretsFile)) {
    Write-Error "Secrets file not found: $SecretsFile"
    exit 1
}

# Read secrets from file
$SecretsContent = Get-Content $SecretsFile -Raw
$JWT_SECRET = ($SecretsContent | Select-String -Pattern 'JWT_SECRET=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
$JWT_REFRESH_SECRET = ($SecretsContent | Select-String -Pattern 'JWT_REFRESH_SECRET=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
$ENCRYPTION_KEY = ($SecretsContent | Select-String -Pattern 'ENCRYPTION_KEY=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()
$DB_PASSWORD = ($SecretsContent | Select-String -Pattern 'DB_PASSWORD=(.+)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()

Write-Success "Loaded secrets from $SecretsFile"
Write-Host "  JWT_SECRET: $($JWT_SECRET.Substring(0,16))..." -ForegroundColor Gray
Write-Host "  JWT_REFRESH_SECRET: $($JWT_REFRESH_SECRET.Substring(0,16))..." -ForegroundColor Gray
Write-Host "  ENCRYPTION_KEY: $($ENCRYPTION_KEY.Substring(0,16))..." -ForegroundColor Gray
Write-Host "  DB_PASSWORD: $($DB_PASSWORD.Substring(0,8))..." -ForegroundColor Gray
Write-Host ""

# Check if .env.production exists
$EnvFile = "backend\.env.production"
if (-not (Test-Path $EnvFile)) {
    Write-Warning "$EnvFile not found. Creating from .env.example..."
    
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" $EnvFile
        Write-Success "Created $EnvFile from template"
    }
    else {
        Write-Error "backend\.env.example not found. Cannot create $EnvFile"
        exit 1
    }
}

# Backup existing file
$BackupFile = "${EnvFile}.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $EnvFile $BackupFile
Write-Success "Backed up $EnvFile to $BackupFile"

# Read current content
$Content = Get-Content $EnvFile -Raw

# Update secrets (handle both existing and placeholder values)
$Content = $Content -replace 'JWT_SECRET=.*', "JWT_SECRET=$JWT_SECRET"
$Content = $Content -replace 'JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
$Content = $Content -replace 'ENCRYPTION_KEY=.*', "ENCRYPTION_KEY=$ENCRYPTION_KEY"
$Content = $Content -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$DB_PASSWORD"

# Ensure NODE_ENV is production
$Content = $Content -replace 'NODE_ENV=.*', "NODE_ENV=production"

# Update CORS_ORIGIN to production domains only (remove localhost)
$ProductionCORS = "https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com"
$Content = $Content -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=$ProductionCORS"
$Content = $Content -replace 'SOCKET_IO_CORS_ORIGIN=.*', "SOCKET_IO_CORS_ORIGIN=$ProductionCORS"

# Enable security features
$Content = $Content -replace 'RECAPTCHA_ENABLED=.*', "RECAPTCHA_ENABLED=true"
$Content = $Content -replace 'ENABLE_CSRF=.*', "ENABLE_CSRF=true"
$Content = $Content -replace 'ENABLE_HELMET=.*', "ENABLE_HELMET=true"
$Content = $Content -replace 'ENABLE_RATE_LIMITING=.*', "ENABLE_RATE_LIMITING=true"
$Content = $Content -replace 'ENABLE_AUDIT_LOGGING=.*', "ENABLE_AUDIT_LOGGING=true"

# Database SSL
$Content = $Content -replace 'DB_SSL=.*', "DB_SSL=true"

# Save updated content
$Content | Out-File -FilePath $EnvFile -Encoding UTF8 -NoNewline

Write-Success "$EnvFile updated with new secrets and production settings"
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Configuration Updated Successfully                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Updated settings:" -ForegroundColor White
Write-Host "  ✓ JWT_SECRET (64 chars)" -ForegroundColor Green
Write-Host "  ✓ JWT_REFRESH_SECRET (64 chars)" -ForegroundColor Green
Write-Host "  ✓ ENCRYPTION_KEY (64 chars)" -ForegroundColor Green
Write-Host "  ✓ DB_PASSWORD (strong password)" -ForegroundColor Green
Write-Host "  ✓ CORS_ORIGIN (production domains only)" -ForegroundColor Green
Write-Host "  ✓ Security features enabled" -ForegroundColor Green
Write-Host "  ✓ Database SSL enabled" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update database password on your PostgreSQL server:" -ForegroundColor White
Write-Host "   psql -U postgres -d matrix_delivery_prod" -ForegroundColor Gray
Write-Host "   ALTER USER matrix_delivery_prod PASSWORD '$DB_PASSWORD';" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install required npm packages:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm install helmet cookie-parser csurf typescript" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Compile TypeScript security utilities:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npx tsc" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test locally:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Verify security headers:" -ForegroundColor White
Write-Host "   curl -I http://localhost:5000/api/health" -ForegroundColor Gray
Write-Host ""

Write-Warning "Backup saved at: $BackupFile"
Write-Warning "After confirming everything works, securely delete: $SecretsFile"
