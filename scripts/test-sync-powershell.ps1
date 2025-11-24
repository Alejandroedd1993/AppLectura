# TEST DE SINCRONIZACION - PowerShell Version
# Valida que el script de testing este disponible

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICACION DE SCRIPT DE TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$scriptPath = ".\scripts\test-cross-device-sync.js"

if (Test-Path $scriptPath) {
    Write-Host "[OK] Script de testing encontrado" -ForegroundColor Green
    Write-Host "Ubicacion: $scriptPath`n" -ForegroundColor White
    
    # Mostrar tamaño del archivo
    $fileInfo = Get-Item $scriptPath
    Write-Host "📊 Tamaño: $($fileInfo.Length) bytes" -ForegroundColor White
    Write-Host "📅 Última modificación: $($fileInfo.LastWriteTime)`n" -ForegroundColor White
    
    Write-Host "📋 INSTRUCCIONES PARA EJECUTAR EL TEST:" -ForegroundColor Yellow
    Write-Host "======================================`n" -ForegroundColor Yellow
    
    Write-Host "1. Abre tu navegador (Chrome, Edge, Firefox)" -ForegroundColor White
    Write-Host "2. Ve a: http://localhost:3000" -ForegroundColor White
    Write-Host "3. Presiona F12 para abrir DevTools" -ForegroundColor White
    Write-Host "4. Ve a la pestaña 'Console'" -ForegroundColor White
    Write-Host "5. Pega este comando:`n" -ForegroundColor White
    
    Write-Host "   fetch('/scripts/test-cross-device-sync.js').then(r => r.text()).then(eval);" -ForegroundColor Cyan
    
    Write-Host "`n6. Presiona Enter`n" -ForegroundColor White
    
    Write-Host "✅ El script validará:" -ForegroundColor Green
    Write-Host "   - Sesión activa" -ForegroundColor White
    Write-Host "   - Estructura completa de datos" -ForegroundColor White
    Write-Host "   - Texto guardado" -ForegroundColor White
    Write-Host "   - Análisis presente" -ForegroundColor White
    Write-Host "   - Progreso de actividades" -ForegroundColor White
    Write-Host "   - Borradores de artefactos" -ForegroundColor White
    Write-Host "   - Puntos y gamificación" -ForegroundColor White
    Write-Host "   - Sincronización Firebase`n" -ForegroundColor White
    
} else {
    Write-Host "❌ Script de testing NO encontrado en:" -ForegroundColor Red
    Write-Host "   $scriptPath`n" -ForegroundColor White
    
    Write-Host "🔧 Solución:" -ForegroundColor Yellow
    Write-Host "   El script ya fue creado. Verifica que estás en el directorio correcto:" -ForegroundColor White
    Write-Host "   cd C:\Users\User\Documents\AppLectura`n" -ForegroundColor Cyan
}

Write-Host "🌐 ESTADO DEL SERVIDOR:" -ForegroundColor Cyan
Write-Host "======================`n" -ForegroundColor Cyan

# Verificar si los servidores están corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend corriendo en http://localhost:3001" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend NO está corriendo en http://localhost:3001" -ForegroundColor Red
    Write-Host "   Inicia con: npm run dev" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend corriendo en http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend NO está corriendo en http://localhost:3000" -ForegroundColor Red
    Write-Host "   Inicia con: npm run dev" -ForegroundColor Yellow
}

Write-Host "`n🎯 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "===============`n" -ForegroundColor Cyan
Write-Host "1. Asegúrate de que los servidores estén corriendo" -ForegroundColor White
Write-Host "2. Abre http://localhost:3000 en tu navegador" -ForegroundColor White
Write-Host "3. Ejecuta el test en la consola del navegador (F12)" -ForegroundColor White
Write-Host "4. Revisa los resultados`n" -ForegroundColor White

Write-Host "📚 DOCUMENTACIÓN:" -ForegroundColor Cyan
Write-Host "================`n" -ForegroundColor Cyan
Write-Host "- CHECKLIST_VALIDACION_SYNC.md - Guía paso a paso" -ForegroundColor White
Write-Host "- AUDITORIA_SINCRONIZACION_COMPLETA.md - Documentación técnica" -ForegroundColor White
Write-Host "- REPORTE_FINAL_SYNC_FIX.md - Bugs corregidos`n" -ForegroundColor White
