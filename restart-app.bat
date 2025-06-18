@echo off
echo Restarting AbyssalSecurity Application...

REM Kill any existing Node.js processes
taskkill /F /IM node.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start backend in new window
start "Backend Server" cmd /k "cd server && npm run dev"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend...
npm run dev

pause