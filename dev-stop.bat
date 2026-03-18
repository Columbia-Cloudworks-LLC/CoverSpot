@echo off
setlocal

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set "SCRIPT_PATH=%REPO_ROOT%\scripts\dev-stop.ps1"

set "FORCE_FLAG="
for %%A in (%*) do (
  if /i "%%~A"=="-Force" set "FORCE_FLAG=-Force"
  if /i "%%~A"=="--force" set "FORCE_FLAG=-Force"
)

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" -RepoRoot "%REPO_ROOT%" %FORCE_FLAG%
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%
