# PowerShell Script to Rotate Secrets for Matrix Delivery
# Windows equivalent of rotate-secrets.sh
# Usage: .\rotate-secrets.ps1 [environment]
# Example: .\rotate-secrets.ps1 production

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "! $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

$EnvFile = "backend\.env.$Environment"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Matrix Delivery Secret Rotation                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required but not installed"
    exit 1
}

# Generate new secrets
Write-Success "Generating new cryptographically secure secrets..."
Write-Host ""

$JWT_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$JWT_REFRESH_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$ENCRYPTION_KEY = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate strong database password
$DB_PASSWORD = node -e @"
const crypto = require('crypto');
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let password = '';
for(let i=0; i<24; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
}
console.log(password);
"@

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  NEW SECRETS - SAVE THESE SECURELY                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_SECRET=$JWT_SECRET" -ForegroundColor Yellow
Write-Host "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" -ForegroundColor Yellow
Write-Host "ENCRYPTION_KEY=$ENCRYPTION_KEY" -ForegroundColor Yellow
Write-Host "DB_PASSWORD=$DB_PASSWORD" -ForegroundColor Yellow
Write-Host ""

# Save to file
$SecretsFile = "secrets_${Environment}_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$SecretsContent = @"
# Matrix Delivery Secrets - $Environment
# Generated: $(Get-Date)
# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
DB_PASSWORD=$DB_PASSWORD

# Instructions:
# 1. Update $EnvFile with these values
# 2. Update database password: ALTER USER matrix_delivery_prod PASSWORD '$DB_PASSWORD';
# 3. Restart backend service: pm2 restart ecosystem.config.js --env $Environment
# 4. Store this file in a secure password manager
# 5. Delete this file after updating: Remove-Item $SecretsFile
"@

$SecretsContent | Out-File -FilePath $SecretsFile -Encoding UTF8
Write-Success "Secrets saved to: $SecretsFile"
Write-Host ""

# Offer to update .env file
$Response = Read-Host "Do you want to update $EnvFile automatically? (y/N)"
if ($Response -eq 'y' -or $Response -eq 'Y') {
    if (Test-Path $EnvFile) {
        # Backup existing file
        $BackupFile = "${EnvFile}.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $EnvFile $BackupFile
        Write-Success "Backed up $EnvFile to $BackupFile"
        
        # Read current content
        $Content = Get-Content $EnvFile -Raw
        
        # Update secrets
        $Content = $Content -replace '^JWT_SECRET=.*', "JWT_SECRET=$JWT_SECRET"
        $Content = $Content -replace '^JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
        $Content = $Content -replace '^ENCRYPTION_KEY=.*', "ENCRYPTION_KEY=$ENCRYPTION_KEY"
        $Content = $Content -replace '^DB_PASSWORD=.*', "DB_PASSWORD=$DB_PASSWORD"
        
        # Save updated content
        $Content | Out-File -FilePath $EnvFile -Encoding UTF8 -NoNewline
        
        Write-Success "$EnvFile updated with new secrets"
    } else {
        Write-Error "$EnvFile not found"
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  NEXT STEPS                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update database password:" -ForegroundColor White
Write-Host "   psql -d matrix_delivery_prod -c `"ALTER USER matrix_delivery_prod PASSWORD '$DB_PASSWORD';`"" -ForegroundColor Gray
Write-Host ""
Write-Host "2. If on VPS, sync .env file:" -ForegroundColor White
Write-Host "   scp $EnvFile root@matrix-api.oldantique50.com:/var/www/matrix-delivery/backend/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart backend service:" -ForegroundColor White
Write-Host "   ssh root@matrix-api.oldantique50.com 'pm2 restart ecosystem.config.js --env $Environment'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify health endpoint:" -ForegroundColor White
Write-Host "   curl https://matrix-api.oldantique50.com/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Securely store $SecretsFile then delete it:" -ForegroundColor White
Write-Host "   Remove-Item $SecretsFile" -ForegroundColor Gray
Write-Host ""

Write-Warning "IMPORTANT: All existing JWT tokens will be invalidated. Users will need to log in again."
