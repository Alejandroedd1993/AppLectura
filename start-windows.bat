@echo off
echo Iniciando aplicación AppLectura para Windows...
echo.

REM Establecer puerto para frontend
set PORT=3000

REM Iniciar la aplicación React
echo Iniciando frontend en puerto 3000...
start "Frontend" cmd /k "npm run start:windows"

REM Esperar un momento
timeout /t 3 /nobreak >nul

REM Iniciar el backend en otra ventana
echo Iniciando backend en puerto 3001...
start "Backend" cmd /k "npm run server:windows"

echo.
echo ✅ Aplicación iniciada:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo.
pause
