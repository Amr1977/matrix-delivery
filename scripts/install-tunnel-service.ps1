<#
.SYNOPSIS
  Install the Cloudflare tunnel as a Windows service so it auto-starts on boot.

.DESCRIPTION
  After running this, the tunnel runs in the background managed by the
  "Cloudflare Tunnel" Windows service.

  Requires administrator PowerShell.
#>

$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "🛠  Installing cloudflared as a Windows service…" -ForegroundColor Cyan
& cloudflared service install
Write-Host "✅ Service installed. Start it with:" -ForegroundColor Green
Write-Host "   Start-Service cloudflared" -ForegroundColor Gray