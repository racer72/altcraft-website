@echo off
setlocal
set "VASO_PYTHON="
cd /d "%~dp0"
title Studio Vaso - keep this window open
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
  if not errorlevel 1 (
    if /I "%~1"=="--check" (
      echo Python runtime ready.
      exit /b 0
    )
    py -3 server.py --open
    goto finished
  )
)
where python >nul 2>nul
if not errorlevel 1 (
  python -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
  if not errorlevel 1 (
    if /I "%~1"=="--check" (
      echo Python runtime ready.
      exit /b 0
    )
    python server.py --open
    goto finished
  )
)
rem Check installed runtimes that may not be on PATH.
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*" "%ProgramFiles%\Python3*") do call :probe_python "%%~D\python.exe"
rem Blender includes a compatible standalone Python on standard Windows installs.
for /d %%B in ("%ProgramFiles%\Blender Foundation\Blender *") do for /d %%V in ("%%~B\*") do call :probe_python "%%~V\python\bin\python.exe"
rem Optional local fallback; this is not required on testers' computers.
call :probe_python "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if defined VASO_PYTHON (
  if /I "%~1"=="--check" (
    echo Python runtime ready: %VASO_PYTHON%
    exit /b 0
  )
  "%VASO_PYTHON%" server.py --open
  goto finished
)

echo Python 3.11 or newer was not found.
echo Install Python 3 from https://www.python.org/downloads/windows/
echo Then close this window and double-click Start Studio Vaso.bat again.
pause
exit /b 1
:finished
echo.
echo Studio Vaso has stopped. Any error details are shown above.
pause

exit /b 0
:probe_python
if defined VASO_PYTHON exit /b 0
if not exist "%~1" exit /b 1
"%~1" -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
if errorlevel 1 exit /b 1
set "VASO_PYTHON=%~1"
exit /b 0
