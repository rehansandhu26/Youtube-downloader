@echo off
title TubeLoad - Global Public Launcher
cd /d "%~dp0"

echo ========================================================
echo     TubeLoad - Launching Server + Global Cloudflare Tunnel
echo ========================================================
echo.

:: Check if server is already running, if not start it
tasklist /fi "imagename eq python.exe" 2>NUL | find /i /n "python.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Python server is already running.
) else (
    echo Starting TubeLoad backend server...
    start "TubeLoad Server" .venv\Scripts\python.exe run.py
    timeout /t 4 /nobreak >nul
)

echo.
echo ========================================================
echo  Starting Cloudflare Tunnel (Reliable TCP/HTTP2 Mode)...
echo  Your public link will appear below:
echo ========================================================
echo.

:tunnel_loop
cloudflared tunnel --protocol http2 --url http://localhost:8000
echo.
echo [!] Connection reset or Wi-Fi dropped. Auto-reconnecting in 5 seconds...
timeout /t 5 >nul
goto tunnel_loop
