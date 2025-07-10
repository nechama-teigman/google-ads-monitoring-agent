@echo off
echo Setting up automatic startup for Google Ads Background Agent...

REM Create a startup script
echo @echo off > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-google-ads-agent.bat"
echo cd /d "%~dp0" >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-google-ads-agent.bat"
echo start /min node background-agent.js >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-google-ads-agent.bat"

echo ✅ Auto-startup configured!
echo The agent will now start automatically when you log into Windows.
echo.
echo To disable auto-startup, delete this file:
echo "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-google-ads-agent.bat"
pause 