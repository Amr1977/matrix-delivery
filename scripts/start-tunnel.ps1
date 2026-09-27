<#
.SYNOPSIS
  Start the Cloudflare tunnel that exposes the local backend at https://api.matrix-delivery.com.

.DESCRIPTION
  Uses the named tunnel `my-server` (see C:\Users\amr\.cloudflared\config.yml).
  Run with:  powershell -ExecutionPolicy Bypass -File scripts\start-tunnel.ps1
  Stop with: Ctrl+C  (or:  cloudflared tunnel stop my-server)

.NOTES
  Make sure the backend is already running on http://localhost:5000
  before starting the tunnel.
#>

$ErrorActionPreference = 'Stop'

$cfg = 'C:\Users\amr\.cloudflared\config.yml'
if (-not (Test-Path $cfg)) {
    Write-Host "❌ Cloudflare config not found at $cfg" -ForegroundColor Red
    exit 1
}

Write-Host "🚇 Starting Cloudflare tunnel (named: windows-pc-tunnel)…" -ForegroundColor Cyan
Write-Host "   Backend target: http://localhost:5000" -ForegroundColor Gray
Write-Host "   Public URL:     https://api.matrix-delivery.com" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray

& cloudflared tunnel --config $cfg run windows-pc-tunnel