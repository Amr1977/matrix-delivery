#!/usr/bin/env pwsh
# Fetch logs from VPS to local workspace for debugging

param(
    [string]$VpsHost = "vps283058.vps.ovh.ca",
    [string]$VpsUser = "root",
    [int]$Lines = 200,
    [string]$Filter = ""
)

$LocalLogDir = "d:\matrix-delivery\vps-logs"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Create local log directory
if (-not (Test-Path $LocalLogDir)) {
    New-Item -ItemType Directory -Path $LocalLogDir | Out-Null
}

Write-Host "📥 Fetching logs from VPS..." -ForegroundColor Cyan
Write-Host "   Host: $VpsHost" -ForegroundColor Gray
Write-Host "   Lines: $Lines" -ForegroundColor Gray

# Fetch PM2 logs
Write-Host "`n📋 Fetching PM2 backend logs..." -ForegroundColor Yellow
$BackendLogFile = "$LocalLogDir\backend-$Timestamp.log"

if ($Filter) {
    ssh "${VpsUser}@${VpsHost}" "pm2 logs matrix-delivery-backend --lines $Lines --nostream | grep -i '$Filter'" > $BackendLogFile
    Write-Host "   Filtered by: $Filter" -ForegroundColor Gray
}
else {
    ssh "${VpsUser}@${VpsHost}" "pm2 logs matrix-delivery-backend --lines $Lines --nostream" > $BackendLogFile
}

Write-Host "   ✅ Saved to: $BackendLogFile" -ForegroundColor Green

# Fetch PM2 frontend logs
Write-Host "`n📋 Fetching PM2 frontend logs..." -ForegroundColor Yellow
$FrontendLogFile = "$LocalLogDir\frontend-$Timestamp.log"

if ($Filter) {
    ssh "${VpsUser}@${VpsHost}" "pm2 logs matrix-delivery-frontend --lines $Lines --nostream | grep -i '$Filter'" > $FrontendLogFile
}
else {
    ssh "${VpsUser}@${VpsHost}" "pm2 logs matrix-delivery-frontend --lines $Lines --nostream" > $FrontendLogFile
}

Write-Host "   ✅ Saved to: $FrontendLogFile" -ForegroundColor Green

# Fetch system logs (journalctl)
Write-Host "`n📋 Fetching system logs..." -ForegroundColor Yellow
$SystemLogFile = "$LocalLogDir\system-$Timestamp.log"

ssh "${VpsUser}@${VpsHost}" "journalctl -u postgresql@14-main -n $Lines --no-pager" > $SystemLogFile

Write-Host "   ✅ Saved to: $SystemLogFile" -ForegroundColor Green

# Fetch disk usage
Write-Host "`n💾 Fetching disk usage..." -ForegroundColor Yellow
$DiskUsageFile = "$LocalLogDir\disk-usage-$Timestamp.txt"

ssh "${VpsUser}@${VpsHost}" "df -h && echo && du -sh /var/log /root/.pm2 /var/lib/postgresql" > $DiskUsageFile

Write-Host "   ✅ Saved to: $DiskUsageFile" -ForegroundColor Green

# Summary
Write-Host "`n✅ All logs fetched successfully!" -ForegroundColor Green
Write-Host "`n📁 Log files saved to: $LocalLogDir" -ForegroundColor Cyan

# Open in VS Code
Write-Host "`n🔍 Opening logs in VS Code..." -ForegroundColor Cyan
code $BackendLogFile

Write-Host "`n💡 Usage examples:" -ForegroundColor Yellow
Write-Host "   .\scripts\fetch-vps-logs.ps1" -ForegroundColor Gray
Write-Host "   .\scripts\fetch-vps-logs.ps1 -Lines 500" -ForegroundColor Gray
Write-Host "   .\scripts\fetch-vps-logs.ps1 -Filter 'profile picture'" -ForegroundColor Gray
Write-Host "   .\scripts\fetch-vps-logs.ps1 -Filter '📸'" -ForegroundColor Gray
