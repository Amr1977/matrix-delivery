$redisPath = 'C:\redis\Redis-8.10.1-Windows-x64-cygwin-with-Service'

# Add to user PATH (persistent for future shells)
$current = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($current -notlike "*$redisPath*") {
    [Environment]::SetEnvironmentVariable('Path', $current + ';' + $redisPath, 'User')
}
$env:Path = $env:Path + ';' + $redisPath

Write-Host "Installing Redis as Windows service..." -ForegroundColor Cyan
& "$redisPath\RedisService.exe" --install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Install returned $LASTEXITCODE" -ForegroundColor Yellow
}

Write-Host "Starting Redis service..." -ForegroundColor Cyan
Start-Service -Name "Redis" -ErrorAction SilentlyContinue
Get-Service -Name "Redis" -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType | Format-Table | Out-String | Write-Host

Write-Host "Smoke test:" -ForegroundColor Cyan
& "$redisPath\redis-cli.exe" ping