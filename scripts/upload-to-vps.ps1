# Upload Security Files to VPS
# Run this from Windows PowerShell in d:\matrix-delivery

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Uploading Security Files to VPS                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$VPS_HOST = "root@matrix-api.oldantique50.com"
$VPS_PORT = "2222"
$VPS_PATH = "/root/matrix-delivery/backend"

# Files to upload
$files = @(
    @{Local = "backend\utils\tokenManager.ts"; Remote = "utils/tokenManager.ts" },
    @{Local = "backend\utils\encryption.ts"; Remote = "utils/encryption.ts" },
    @{Local = "backend\middleware\security.ts"; Remote = "middleware/security.ts" },
    @{Local = "backend\middleware\auditLogger.ts"; Remote = "middleware/auditLogger.ts" },
    @{Local = "backend\types\security.d.ts"; Remote = "types/security.d.ts" },
    @{Local = "backend\.env.production"; Remote = ".env" },
    @{Local = "backend\server.js"; Remote = "server.js" }
)

Write-Host "Uploading files to VPS..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $localPath = $file.Local
    $remotePath = "${VPS_PATH}/$($file.Remote)"
    
    if (Test-Path $localPath) {
        Write-Host "📤 Uploading: $localPath" -ForegroundColor Gray
        scp -P $VPS_PORT $localPath "${VPS_HOST}:${remotePath}"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Uploaded successfully" -ForegroundColor Green
        }
        else {
            Write-Host "   ❌ Upload failed" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  File not found: $localPath" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Upload Complete                                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps on VPS:" -ForegroundColor Yellow
Write-Host "1. ssh root@matrix-api.oldantique50.com -p 2222" -ForegroundColor White
Write-Host "2. cd /root/matrix-delivery/backend" -ForegroundColor White
Write-Host "3. chmod 600 .env" -ForegroundColor White
Write-Host "4. npm install helmet cookie-parser csurf typescript @types/node @types/express" -ForegroundColor White
Write-Host "5. npx tsc utils/tokenManager.ts utils/encryption.ts middleware/security.ts middleware/auditLogger.ts --outDir . --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule" -ForegroundColor White
Write-Host "6. pm2 restart ecosystem.config.js --env production" -ForegroundColor White
