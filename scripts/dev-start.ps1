param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$ProjectEnvId,
  [Parameter(Mandatory = $true)][string]$FunctionsEnvId,
  [switch]$EnvOnly
)

$ErrorActionPreference = 'Stop'
$repoRootPath = [System.IO.Path]::GetFullPath($RepoRoot)
$sessionFilePath = Join-Path $repoRootPath '.dev-session.json'

# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

function Read-OnePasswordEnvironment {
  param(
    [Parameter(Mandatory = $true)][string]$EnvironmentId,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $raw = & op environment read $EnvironmentId 2>&1
  if ($LASTEXITCODE -ne 0) {
    $details = ($raw | Out-String).Trim()
    throw "Failed reading 1Password environment '$Label' ($EnvironmentId). $details"
  }

  $map = @{}
  foreach ($line in $raw) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line.TrimStart().StartsWith('#')) { continue }

    $sep = $line.IndexOf('=')
    if ($sep -lt 1) { continue }

    $key = $line.Substring(0, $sep).Trim()
    $value = $line.Substring($sep + 1)
    $map[$key] = $value
  }

  if ($map.Count -eq 0) {
    throw "Environment '$Label' ($EnvironmentId) returned no KEY=VALUE pairs."
  }

  return $map
}

function Get-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][hashtable]$Primary,
    [Parameter(Mandatory = $true)][hashtable]$Secondary,
    [string[]]$Aliases = @()
  )

  foreach ($candidate in @($Key) + $Aliases) {
    if ($Primary.ContainsKey($candidate) -and -not [string]::IsNullOrWhiteSpace($Primary[$candidate])) {
      return $Primary[$candidate]
    }

    if ($Secondary.ContainsKey($candidate) -and -not [string]::IsNullOrWhiteSpace($Secondary[$candidate])) {
      return $Secondary[$candidate]
    }
  }

  $aliasText = if ($Aliases.Count -gt 0) { " Aliases: $($Aliases -join ', ')." } else { '' }
  throw "Missing required variable '$Key'.$aliasText"
}

function Write-DotEnv {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string[]]$Lines
  )

  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($Path)) | Out-Null
  $content = ($Lines -join [Environment]::NewLine) + [Environment]::NewLine
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}

function Test-CommandOnPath {
  param([Parameter(Mandatory = $true)][string]$Command)
  $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-PortListening {
  param([Parameter(Mandatory = $true)][int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
          Select-Object -First 1
  if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { 'unknown' }
    return @{ InUse = $true; ProcessName = $name; PID = $conn.OwningProcess }
  }
  return @{ InUse = $false }
}

function Test-DockerDaemonReady {
  # docker info writes to stderr while daemon is down; avoid terminating on that.
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $script:ErrorActionPreference = 'Continue'
    & docker info *> $null
    return ($LASTEXITCODE -eq 0)
  } finally {
    $script:ErrorActionPreference = $previousErrorActionPreference
  }
}

function Start-DockerIfNeeded {
  if (Test-DockerDaemonReady) {
    Write-Host '[OK] Docker daemon is running.'
    return
  }

  Write-Host '[INFO] Docker daemon is not running. Starting Docker Desktop...'
  $dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path $dockerExe)) {
    throw "Docker Desktop not found at '$dockerExe'. Start it manually or install from https://www.docker.com/products/docker-desktop"
  }

  Start-Process -FilePath $dockerExe
  $timeoutSec = 90
  $elapsed = 0
  while ($elapsed -lt $timeoutSec) {
    Start-Sleep -Seconds 3
    $elapsed += 3
    if (Test-DockerDaemonReady) {
      Write-Host "[OK] Docker daemon ready after ${elapsed}s."
      return
    }
    Write-Host "[INFO] Waiting for Docker daemon... (${elapsed}s / ${timeoutSec}s)"
  }
  throw "Docker Desktop did not become ready within ${timeoutSec} seconds."
}

function Get-SupabaseKeysFromOutput {
  param([Parameter(Mandatory = $true)][string]$RawOutput)
  $clean = $RawOutput -replace '\x1b\[[0-9;]*m', ''
  $keys = @{}

  $m = [regex]::Match($clean, '(?mi)API\s+URL:\s*(\S+)')
  if ($m.Success) { $keys['ApiUrl'] = $m.Groups[1].Value }

  $m = [regex]::Match($clean, '(?mi)anon\s+key:\s*(\S+)')
  if ($m.Success) { $keys['AnonKey'] = $m.Groups[1].Value }

  $m = [regex]::Match($clean, '(?mi)service_role\s+key:\s*(\S+)')
  if ($m.Success) { $keys['ServiceRoleKey'] = $m.Groups[1].Value }

  return $keys
}

# =====================================================================
# PHASE 1: ENVIRONMENT SETUP (1Password -> .env files)
# =====================================================================

$functionsEnvPath = Join-Path $repoRootPath 'supabase\functions\.env'

try {
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 1: Loading secrets from 1Password'
  Write-Host '=========================================='
  Write-Host ''

  $projectMap = Read-OnePasswordEnvironment -EnvironmentId $ProjectEnvId -Label 'project'
  $functionsMap = Read-OnePasswordEnvironment -EnvironmentId $FunctionsEnvId -Label 'functions'

  $spotifyScopes = 'playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private user-read-private user-read-email streaming'

  $projectEnvLines = @(
    '# Browser-safe variables (exposed to client bundle via NEXT_PUBLIC_ prefix)',
    ('NEXT_PUBLIC_SUPABASE_URL=' + (Get-EnvValue -Key 'SUPABASE_URL' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SUPABASE_URL'))),
    ('NEXT_PUBLIC_SUPABASE_ANON_KEY=' + (Get-EnvValue -Key 'SUPABASE_ANON_KEY' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SUPABASE_ANON_KEY'))),
    ('NEXT_PUBLIC_SPOTIFY_SCOPES=' + $spotifyScopes),
    '',
    '# Server-only variables (no NEXT_PUBLIC_ prefix, never in browser bundle)',
    ('SUPABASE_SERVICE_ROLE_KEY=' + (Get-EnvValue -Key 'SUPABASE_SERVICE_ROLE_KEY' -Primary $projectMap -Secondary $functionsMap)),
    ('SPOTIFY_CLIENT_ID=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_ID' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SPOTIFY_CLIENT_ID'))),
    ('SPOTIFY_CLIENT_SECRET=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_SECRET' -Primary $projectMap -Secondary $functionsMap)),
    ('YOUTUBE_API_KEY=' + (Get-EnvValue -Key 'YOUTUBE_API_KEY' -Primary $projectMap -Secondary $functionsMap)),
    ('GEMINI_API_KEY=' + (Get-EnvValue -Key 'GEMINI_API_KEY' -Primary $projectMap -Secondary $functionsMap))
  )

  $functionsEnvLines = @(
    '# Core Supabase',
    ('SUPABASE_URL=' + (Get-EnvValue -Key 'SUPABASE_URL' -Primary $functionsMap -Secondary $projectMap -Aliases @('NEXT_PUBLIC_SUPABASE_URL'))),
    ('SUPABASE_ANON_KEY=' + (Get-EnvValue -Key 'SUPABASE_ANON_KEY' -Primary $functionsMap -Secondary $projectMap -Aliases @('NEXT_PUBLIC_SUPABASE_ANON_KEY'))),
    ('SUPABASE_SERVICE_ROLE_KEY=' + (Get-EnvValue -Key 'SUPABASE_SERVICE_ROLE_KEY' -Primary $functionsMap -Secondary $projectMap)),
    '',
    '# Third-party provider keys for server-side calls',
    ('SPOTIFY_CLIENT_ID=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_ID' -Primary $functionsMap -Secondary $projectMap -Aliases @('NEXT_PUBLIC_SPOTIFY_CLIENT_ID'))),
    ('SPOTIFY_CLIENT_SECRET=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_SECRET' -Primary $functionsMap -Secondary $projectMap)),
    ('YOUTUBE_API_KEY=' + (Get-EnvValue -Key 'YOUTUBE_API_KEY' -Primary $functionsMap -Secondary $projectMap)),
    ('GEMINI_API_KEY=' + (Get-EnvValue -Key 'GEMINI_API_KEY' -Primary $functionsMap -Secondary $projectMap))
  )

  $projectEnvPath = Join-Path $repoRootPath '.env'

  Write-DotEnv -Path $projectEnvPath -Lines $projectEnvLines
  Write-DotEnv -Path $functionsEnvPath -Lines $functionsEnvLines

  Write-Host "[OK] .env             -> $projectEnvPath"
  Write-Host "[OK] functions/.env   -> $functionsEnvPath"
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)"
  Write-Host '[HINT] Ensure 1Password CLI access is configured and both environment IDs are correct.'
  Write-Host '[HINT] If using account sign-in, run: op signin'
  exit 1
}

# =====================================================================
# EARLY EXIT: --env-only
# =====================================================================

if ($EnvOnly) {
  Write-Host ''
  Write-Host '[INFO] --env-only flag set. Stopping after env file generation.'
  exit 0
}

# =====================================================================
# PHASES 2-7: LOCAL DEV LIFECYCLE
# =====================================================================

$supabaseStartedByUs = $false
$exitCode = 0

try {
  Set-Location $repoRootPath
  if (Test-Path $sessionFilePath) {
    Remove-Item -Path $sessionFilePath -Force -ErrorAction SilentlyContinue
  }

  # =================================================================
  # PHASE 2: PREREQUISITES
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 2: Checking prerequisites'
  Write-Host '=========================================='
  Write-Host ''

  if (-not (Test-CommandOnPath 'docker')) {
    throw 'Docker is required but not found on PATH. Install from https://www.docker.com/products/docker-desktop'
  }
  Write-Host '[OK] docker'

  if (-not (Test-CommandOnPath 'supabase')) {
    throw 'Supabase CLI is required but not found on PATH. Install with: npm i -g supabase'
  }
  Write-Host '[OK] supabase'

  if (-not (Test-CommandOnPath 'node')) {
    throw 'Node.js is required but not found on PATH. Install from https://nodejs.org'
  }
  Write-Host '[OK] node'

  if (-not (Test-CommandOnPath 'npm')) {
    throw 'npm is required but not found on PATH. It ships with Node.js.'
  }
  Write-Host '[OK] npm'

  $nodeModulesPath = Join-Path $repoRootPath 'node_modules'
  if ((Test-Path (Join-Path $repoRootPath 'package.json')) -and -not (Test-Path $nodeModulesPath)) {
    Write-Host ''
    Write-Host '[INFO] node_modules not found. Running npm install...'
    & npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
    Write-Host '[OK] npm install complete.'
  } else {
    Write-Host '[OK] node_modules'
  }

  # =================================================================
  # PHASE 3: PORT CHECK
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 3: Checking ports'
  Write-Host '=========================================='
  Write-Host ''

  $supabasePorts = @(54320, 54321, 54322, 54323, 54324, 54327)
  $supabaseAlreadyRunning = $false
  $portConflicts = @()

  foreach ($port in $supabasePorts) {
    $check = Test-PortListening -Port $port
    if ($check.InUse) {
      $portConflicts += "Port $port in use by $($check.ProcessName) (PID $($check.PID))"
    }
  }

  if ($portConflicts.Count -gt 0) {
    $statusRaw = & supabase status 2>&1
    $statusText = $statusRaw | Out-String
    if ($statusText -match 'API URL') {
      $supabaseAlreadyRunning = $true
      Write-Host '[OK] Supabase is already running.'
    } else {
      Write-Host '[WARN] The following ports are occupied:'
      $portConflicts | ForEach-Object { Write-Host "       $_" }
      throw 'Required Supabase ports are in use by non-Supabase processes. Free them and retry.'
    }
  } else {
    Write-Host '[OK] All Supabase ports available.'
  }

  $nextCheck = Test-PortListening -Port 3000
  if ($nextCheck.InUse) {
    Write-Host "[WARN] Port 3000 in use by $($nextCheck.ProcessName) (PID $($nextCheck.PID)). Next.js may pick another port."
  } else {
    Write-Host '[OK] Port 3000 available.'
  }

  # =================================================================
  # PHASE 4: DOCKER + SUPABASE START
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 4: Starting Docker and Supabase'
  Write-Host '=========================================='
  Write-Host ''

  Start-DockerIfNeeded

  $localKeys = @{}

  if ($supabaseAlreadyRunning) {
    Write-Host '[INFO] Capturing keys from running Supabase...'
    $statusRaw = & supabase status 2>&1
    $statusText = $statusRaw | Out-String
    $localKeys = Get-SupabaseKeysFromOutput -RawOutput $statusText
  } else {
    Write-Host '[INFO] Ensuring previous local Supabase state is cleaned up...'
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      $script:ErrorActionPreference = 'Continue'
      $null = & supabase stop 2>&1
      $stopCode = $LASTEXITCODE
    } finally {
      $script:ErrorActionPreference = $previousErrorActionPreference
    }

    if ($stopCode -eq 0) {
      Write-Host '[OK] Previous Supabase state cleaned.'
    } else {
      Write-Host '[INFO] No running Supabase services found (continuing).'
    }

    Write-Host '[INFO] Starting Supabase (may take a minute on first run)...'
    Write-Host ''
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      $script:ErrorActionPreference = 'Continue'
      $startRaw = & supabase start 2>&1
      $startCode = $LASTEXITCODE
    } finally {
      $script:ErrorActionPreference = $previousErrorActionPreference
    }
    $startText = $startRaw | Out-String

    if ($startCode -ne 0) {
      Write-Host $startText
      Write-Host '[INFO] Cleaning up partially started Supabase services...'
      $previousErrorActionPreference = $ErrorActionPreference
      try {
        $script:ErrorActionPreference = 'Continue'
        & supabase stop 2>&1 | Out-Null
      } finally {
        $script:ErrorActionPreference = $previousErrorActionPreference
      }
      throw 'supabase start failed. See output above.'
    }

    $supabaseStartedByUs = $true
    $localKeys = Get-SupabaseKeysFromOutput -RawOutput $startText
    Write-Host ''
    Write-Host '[OK] Supabase started.'
  }

  if (-not $localKeys['AnonKey'] -or -not $localKeys['ServiceRoleKey']) {
    throw 'Could not capture local Supabase keys. Run "supabase status" manually to debug.'
  }

  $localApiUrl = if ($localKeys['ApiUrl']) { $localKeys['ApiUrl'] } else { 'http://127.0.0.1:54321' }
  $localAnonKey = $localKeys['AnonKey']
  $localServiceRoleKey = $localKeys['ServiceRoleKey']

  # =================================================================
  # PHASE 5: GENERATE .env.local AND REWRITE functions/.env
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 5: Writing local env overrides'
  Write-Host '=========================================='
  Write-Host ''

  $envLocalPath = Join-Path $repoRootPath '.env.local'
  Write-DotEnv -Path $envLocalPath -Lines @(
    '# Auto-generated by dev-start. Overrides .env with local Supabase values.',
    '# Do not commit this file.',
    "NEXT_PUBLIC_SUPABASE_URL=$localApiUrl",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$localAnonKey",
    "SUPABASE_SERVICE_ROLE_KEY=$localServiceRoleKey"
  )
  Write-Host "[OK] .env.local       -> $envLocalPath"

  Write-DotEnv -Path $functionsEnvPath -Lines @(
    '# Auto-generated by dev-start. Local Supabase + real API keys from 1Password.',
    "SUPABASE_URL=$localApiUrl",
    "SUPABASE_ANON_KEY=$localAnonKey",
    "SUPABASE_SERVICE_ROLE_KEY=$localServiceRoleKey",
    '',
    '# Third-party provider keys for server-side calls',
    ('SPOTIFY_CLIENT_ID=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_ID' -Primary $functionsMap -Secondary $projectMap -Aliases @('NEXT_PUBLIC_SPOTIFY_CLIENT_ID'))),
    ('SPOTIFY_CLIENT_SECRET=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_SECRET' -Primary $functionsMap -Secondary $projectMap)),
    ('YOUTUBE_API_KEY=' + (Get-EnvValue -Key 'YOUTUBE_API_KEY' -Primary $functionsMap -Secondary $projectMap)),
    ('GEMINI_API_KEY=' + (Get-EnvValue -Key 'GEMINI_API_KEY' -Primary $functionsMap -Secondary $projectMap))
  )
  Write-Host "[OK] functions/.env   -> $functionsEnvPath  (rewritten with local Supabase)"

  # =================================================================
  # PHASE 6: LAUNCH BACKGROUND PROCESSES
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  Phase 6: Launching dev servers'
  Write-Host '=========================================='
  Write-Host ''

  Write-Host '[INFO] Opening Edge Functions window...'
  $edgeProcess = Start-Process powershell -WorkingDirectory $repoRootPath -PassThru -ArgumentList @(
    '-NoExit', '-NoLogo', '-Command',
    "`$host.UI.RawUI.WindowTitle = 'CoverSpot - Edge Functions'; supabase functions serve --env-file supabase\functions\.env"
  )

  Write-Host '[INFO] Opening Next.js dev server window...'
  $nextProcess = Start-Process powershell -WorkingDirectory $repoRootPath -PassThru -ArgumentList @(
    '-NoExit', '-NoLogo', '-Command',
    "`$host.UI.RawUI.WindowTitle = 'CoverSpot - Next.js'; npm run dev"
  )

  $sessionRecord = [ordered]@{
    version = 1
    createdAt = (Get-Date).ToString('o')
    repoRoot = $repoRootPath
    launcherPid = $PID
    edgeFunctionsPid = $edgeProcess.Id
    nextJsPid = $nextProcess.Id
  }
  $sessionJson = $sessionRecord | ConvertTo-Json -Depth 4
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($sessionFilePath, $sessionJson, $utf8NoBom)
  Write-Host "[OK] Session metadata   -> $sessionFilePath"

  Start-Sleep -Seconds 3
  Write-Host '[OK] Dev server windows launched.'

  # =================================================================
  # PHASE 7: SUMMARY BANNER + WAIT FOR EXIT
  # =================================================================
  Write-Host ''
  Write-Host '=========================================='
  Write-Host '  CoverSpot Local Dev Environment'
  Write-Host '=========================================='
  Write-Host "  Next.js:           http://127.0.0.1:3000"
  Write-Host "  Supabase API:      $localApiUrl"
  Write-Host "  Supabase Studio:   http://127.0.0.1:54323"
  Write-Host "  Inbucket (email):  http://127.0.0.1:54324"
  Write-Host '=========================================='
  Write-Host ''
  Write-Host '  Press Ctrl+C to stop Supabase.'
  Write-Host '  Close the other terminal windows manually.'
  Write-Host ''

  while ($true) { Start-Sleep -Seconds 1 }

} catch {
  Write-Host ''
  Write-Host "[ERROR] $($_.Exception.Message)"
  $exitCode = 1
} finally {
  if ($supabaseStartedByUs) {
    Write-Host ''
    Write-Host '[INFO] Stopping Supabase containers...'
    Set-Location $repoRootPath
    & supabase stop 2>&1 | Out-Null
    Write-Host '[OK] Supabase stopped.'
  }
  if (Test-Path $sessionFilePath) {
    Remove-Item -Path $sessionFilePath -Force -ErrorAction SilentlyContinue
  }
  Write-Host '[OK] Dev session ended.'
}

exit $exitCode
