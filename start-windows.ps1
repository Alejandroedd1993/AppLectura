# Script de inicio para Windows con PowerShell
Write-Host "🚀 Iniciando AppLectura..." -ForegroundColor Green
Write-Host ""

# Verificar si Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar si npm está disponible
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npm no está disponible" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js y npm detectados" -ForegroundColor Green

# Función para iniciar el frontend
function Start-Frontend {
    Write-Host "🌐 Iniciando Frontend en puerto 3000..." -ForegroundColor Blue
    $env:PORT = "3000"
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "npm run start:windows"
}

# Función para iniciar el backend
function Start-Backend {
    Write-Host "🔧 Iniciando Backend en puerto 3001..." -ForegroundColor Blue
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "npm run server:windows"
}

# Iniciar ambos servicios
try {
    Start-Frontend
    Start-Sleep -Seconds 3
    Start-Backend
    
    Write-Host ""
    Write-Host "✅ Aplicación iniciada exitosamente:" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Consejo: Usa Ctrl+C en cada ventana para detener los servicios" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error al iniciar la aplicación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
