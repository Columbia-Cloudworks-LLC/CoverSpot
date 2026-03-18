param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$ProjectEnvId,
  [Parameter(Mandatory = $true)][string]$FunctionsEnvId
)

$ErrorActionPreference = 'Stop'

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

try {
  $repoRootPath = [System.IO.Path]::GetFullPath($RepoRoot)
  Write-Host '[INFO] Loading 1Password environments...'

  $projectMap = Read-OnePasswordEnvironment -EnvironmentId $ProjectEnvId -Label 'project'
  $functionsMap = Read-OnePasswordEnvironment -EnvironmentId $FunctionsEnvId -Label 'functions'

  $spotifyScopes = 'playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private user-read-private user-read-email streaming'

  $projectEnvLines = @(
    '# Supabase (client-safe key can be exposed in frontend)',
    ('SUPABASE_URL=' + (Get-EnvValue -Key 'SUPABASE_URL' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SUPABASE_URL'))),
    ('SUPABASE_ANON_KEY=' + (Get-EnvValue -Key 'SUPABASE_ANON_KEY' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SUPABASE_ANON_KEY'))),
    '',
    '# Spotify OAuth',
    ('SPOTIFY_CLIENT_ID=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_ID' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SPOTIFY_CLIENT_ID'))),
    ('SPOTIFY_CLIENT_SECRET=' + (Get-EnvValue -Key 'SPOTIFY_CLIENT_SECRET' -Primary $projectMap -Secondary $functionsMap)),
    ('SPOTIFY_REDIRECT_URI=' + (Get-EnvValue -Key 'SPOTIFY_REDIRECT_URI' -Primary $projectMap -Secondary $functionsMap -Aliases @('NEXT_PUBLIC_SPOTIFY_REDIRECT_URI'))),
    ('SPOTIFY_SCOPES=' + $spotifyScopes),
    '',
    '# YouTube Data API',
    ('YOUTUBE_API_KEY=' + (Get-EnvValue -Key 'YOUTUBE_API_KEY' -Primary $projectMap -Secondary $functionsMap)),
    '',
    '# Optional AI validation',
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
  $functionsEnvPath = Join-Path $repoRootPath 'supabase\functions\.env'

  Write-DotEnv -Path $projectEnvPath -Lines $projectEnvLines
  Write-DotEnv -Path $functionsEnvPath -Lines $functionsEnvLines

  Write-Host '[OK] Generated env files:'
  Write-Host " - $projectEnvPath"
  Write-Host " - $functionsEnvPath"
  exit 0
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)"
  Write-Host '[HINT] Ensure 1Password CLI access is configured and both environment IDs are correct.'
  Write-Host '[HINT] If using account sign-in, run: op signin'
  exit 1
}
