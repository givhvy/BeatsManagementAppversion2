@echo off
echo ====================================
echo Kill All Node.js Processes
echo ====================================
echo.

REM Kill all node.exe processes
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo [OK] Killed all Node.js processes
) else (
    echo [INFO] No Node.js processes found
)

echo.
echo ====================================
echo Checking Specific Ports
echo ====================================
echo.

REM Function to kill process on specific port
for %%P in (3000 8000 9000) do (
    echo Checking port %%P...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P') do (
        taskkill /F /PID %%a 2>nul
        if !errorlevel!==0 (
            echo [OK] Killed process on port %%P (PID: %%a^)
        )
    )
)

echo.
echo ====================================
echo Done! All ports are now free.
echo ====================================
echo.
pause
