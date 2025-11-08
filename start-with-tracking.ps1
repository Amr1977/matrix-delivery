Write-Host "Starting Matrix Delivery..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"
Write-Host "Servers starting..." -ForegroundColor Green
