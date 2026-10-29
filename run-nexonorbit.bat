@echo off
title NexusOrbit — College Management Portal
echo ===================================================
echo   NEXUSORBIT — Ultimate College Management Portal
echo   Hackathon Demonstration Runner
echo ===================================================
echo.
echo Launching NexusOrbit Server...
call "%~dp0node.bat" "%~dp0server.js"
pause
