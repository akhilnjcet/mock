@echo off
echo Starting backend server in a new window...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo Starting frontend dev server in a new window...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both servers are starting up!
pause
