@echo off
setlocal
cd /d "%~dp0"
title Automata Simulator (Normal NFA to DFA)

echo =================================================================
echo   AUTOMATA THEORY SIMULATOR (Normal NFA to DFA)
echo   Rabin-Scott Powerset Subset Construction Engine
echo =================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Python detected. Launching backend server...
    start "" python server.py
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
) else (
    echo [INFO] Python not found in PATH. Opening standalone web UI directly...
    start "" index.html
)

echo.
echo Simulator is now running!
echo URL: http://localhost:8000 (or index.html)
echo.
pause
