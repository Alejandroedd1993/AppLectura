@echo off
echo 🔄 Reiniciando servidores AppLectura...

echo 📴 Deteniendo procesos en puertos 3000 y 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul

echo ⏳ Esperando 2 segundos...
timeout /t 2 /nobreak >nul

echo 🚀 Iniciando servidores...
cd /d "%~dp0.."
start "Backend AppLectura" cmd /k "npm run server:windows"
timeout /t 3 /nobreak >nul
start "Frontend AppLectura" cmd /k "npm run start:windows"

echo ✅ Servidores iniciados
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
pause
