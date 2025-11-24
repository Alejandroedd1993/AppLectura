Write-Host "🔄 Reiniciando AppLectura..." -ForegroundColor Cyan

# Detener procesos en puertos 3000/3001
Write-Host "📴 Liberando puertos..." -ForegroundColor Yellow
try {
    Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {
    Write-Host "Puertos ya libres" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Cambiar al directorio del proyecto
Set-Location $PSScriptRoot\..

Write-Host "🚀 Iniciando servidores..." -ForegroundColor Green

# Iniciar backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run server:windows" -WindowStyle Normal

Start-Sleep -Seconds 3

# Iniciar frontend  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run start:windows" -WindowStyle Normal

Write-Host "✅ AppLectura iniciada" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Magenta
