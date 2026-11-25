
@echo off
title AIRVISION ONE CLICK LAUNCHER
cd /d "%~dp0"

echo =====================================
echo       AIRVISION ONE CLICK LAUNCHER
echo =====================================

echo Checking Backend API...

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/health' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"

if errorlevel 1 (
    echo Backend not responding. Checking old process...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
    timeout /t 2 /nobreak >nul
    echo Starting Backend...
    start "AIRVISION Backend" cmd /k "cd /d ""%~dp0"" && node backend\api.js"
) else (
    echo Backend is already running.
)

echo Waiting for Backend API...
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){exit 1}"
if errorlevel 1 (
    echo Backend did not become ready. Check the AIRVISION Backend window.
    pause
    exit /b 1
)

echo Checking Frontend...

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5500/' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }"

if errorlevel 1 (
    echo Frontend not responding. Checking old process...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5500 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
    timeout /t 2 /nobreak >nul
    echo Starting Frontend...
    start "AIRVISION Frontend" cmd /k "cd /d ""%~dp0"" && python -m http.server 5500 --bind 127.0.0.1 --directory frontend"
) else (
    echo Frontend is already running.
)

echo Waiting for Frontend...
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:5500/' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){exit 1}"
if errorlevel 1 (
    echo Frontend did not become ready. Check the AIRVISION Frontend window.
    pause
    exit /b 1
)

echo Opening AIRVISION Dashboard...
start "" "http://127.0.0.1:5500/"

echo =====================================
echo       AIRVISION LAUNCH COMPLETE
echo =====================================
exit
