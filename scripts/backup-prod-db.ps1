#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Backs up the production database from the VPS to the local machine.

.DESCRIPTION
    Connects to the VPS via SSH and streams a pg_dump of the production database
    to a local SQL file with a timestamp.

.EXAMPLE
    .\scripts\backup-prod-db.ps1
#>

$ErrorActionPreference = 'Stop'

# Configuration (mirrored from deploy.ps1)
$VPS_HOST = "oldantique50.com"
$VPS_PORT = "2222"
$VPS_USER = "root"
$DB_USER = "postgres"
$DB_NAME = "matrix_delivery"

# Generate filename with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path (Get-Location) "backups"
$backupFile = Join-Path $backupDir "prod_backup_$timestamp.sql"

# Create backups directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backups directory: $backupDir" -ForegroundColor Gray
}

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    📦 Matrix Delivery - Production Database Backup   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "▶ Connecting to VPS ($VPS_HOST) and dumping database..." -ForegroundColor Yellow
Write-Host "  Target Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  Output File:     $backupFile" -ForegroundColor Gray

try {
    # SSH command to run pg_dump remotely and pipe output to local file
    # We use -C (create DB) and -c (clean/drop objects) for a full restore-able backup
    $sshCommand = "ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'pg_dump -U $DB_USER -h localhost -C -c $DB_NAME'"
    
    # Execute (using cmd /c to handle the pipe correctly in PowerShell if needed, but direct usually works)
    # Using specific syntax to capture binary output correctly in PowerShell 7+ is usually fine, 
    # but for text SQL dump, simple redirection works.
    
    # Using Invoke-Expression or direct execution
    # Note: This relies on the user having SSH key access or typing password
    
    # We will use cmd.exe for the piping to avoid PowerShell encoding issues with mixed binary/text
    cmd /c "ssh -p $VPS_PORT $VPS_USER@$VPS_HOST ""pg_dump -U $DB_USER -h localhost -C -c $DB_NAME"" > ""$backupFile"""

    if ($LASTEXITCODE -eq 0) {
        $fileStats = Get-Item $backupFile
        $sizeMb = [math]::Round($fileStats.Length / 1MB, 2)
        
        Write-Host "`n✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "  Size: $sizeMb MB" -ForegroundColor Gray
        Write-Host "  Path: $backupFile" -ForegroundColor Gray
    }
    else {
        throw "SSH/pg_dump command failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Host "`n❌ Backup failed: $_" -ForegroundColor Red
    if (Test-Path $backupFile) {
        Remove-Item $backupFile
        Write-Host "  (Deleted partial backup file)" -ForegroundColor Gray
    }
    exit 1
}
