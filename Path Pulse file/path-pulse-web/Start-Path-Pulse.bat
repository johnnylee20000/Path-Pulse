@echo off
title Path-Pulse Server
cd /d "%~dp0"

:: Open browser first, then start server (server runs in this window)
start "" "http://localhost:8080/index.html"
python -m http.server 8080
