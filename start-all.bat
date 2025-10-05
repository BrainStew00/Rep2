@echo off
title Avvio Queue-Talk
echo Avvio Backend...
start cmd /k "cd backend && npm run dev"
echo Avvio Frontend...
start cmd /k "cd frontend && npm run dev"
echo Tutto avviato!
pause
