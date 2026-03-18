@echo off
setlocal

set "PROJECT_ENV_ID=spupsrfjptvmmsyeksx2xsmkwq"
set "FUNCTIONS_ENV_ID=wp453kqify5bvt46uvzdjex234"
set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set "SCRIPT_PATH=%REPO_ROOT%\scripts\dev-start.ps1"

where op >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 1Password CLI ^('op'^) was not found on PATH.
  echo [HINT] Install it from https://developer.1password.com/docs/cli/get-started
  exit /b 1
)

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" -RepoRoot "%REPO_ROOT%" -ProjectEnvId "%PROJECT_ENV_ID%" -FunctionsEnvId "%FUNCTIONS_ENV_ID%"
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%
