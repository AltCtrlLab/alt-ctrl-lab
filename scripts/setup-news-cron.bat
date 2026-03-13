@echo off
:: Setup Windows Task Scheduler to fetch news at 8:00 AM daily
:: Run this script as Administrator once to configure the task

schtasks /create ^
  /tn "AltCtrlLab-NewsRefresh" ^
  /tr "curl http://localhost:3000/api/cron/news" ^
  /sc daily ^
  /st 08:00 ^
  /f

echo.
echo [OK] Task "AltCtrlLab-NewsRefresh" created.
echo      News will be fetched automatically at 08:00 every morning.
echo      Make sure the Next.js server is running when the task triggers.
pause
