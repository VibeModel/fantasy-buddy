@echo off
rem One-click launcher: delegates to start.ps1 (Chinese UI)
rem Pass -Server to run in server mode, e.g.  start.bat -Server
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
