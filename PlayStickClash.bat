@echo off
title Stick Clash: Stat Overload
cd /d "%~dp0"
python desktop_app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred launching Stick Clash.
    pause
)
