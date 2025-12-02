@echo off
title YouTube Auto Uploader
color 0A

echo ========================================
echo   YOUTUBE AUTO UPLOADER
echo ========================================
echo.

REM Change to project directory
cd /d "F:\PlaygroundTest\automation"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [!] node_modules not found. Installing dependencies...
    echo.
    call npm install
    echo.
)

REM Start the application
echo [*] Starting YouTube Multi-Channel Uploader...
echo [*] Server will run at: http://localhost:9000
echo [*] Opening browser...
echo.
echo ========================================
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

REM Open browser after a short delay
start "" http://localhost:9000

REM Start the Node.js application
node main-multi.js

pause
