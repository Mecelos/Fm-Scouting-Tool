@echo off
rem Builds Scout Lab Link and installs it into BepInEx\plugins\ScoutLabLink. Close FM27 first.
cd /d "%~dp0"
echo Building Scout Lab Link...
dotnet build -c Release -nologo > build.log 2>&1
if errorlevel 1 (
  echo.
  echo BUILD FAILED. Tell Claude - the details are in build.log
  pause
  exit /b 1
)
if not exist "..\plugins\ScoutLabLink" mkdir "..\plugins\ScoutLabLink"
copy /y "bin\Release\ScoutLabLink.dll" "..\plugins\ScoutLabLink\" >nul
if errorlevel 1 (
  echo Could not copy the plugin. Is FM27 still running? Close it and run this again.
  pause
  exit /b 1
)
echo.
echo Done. Scout Lab Link is installed. Start FM27.
pause
