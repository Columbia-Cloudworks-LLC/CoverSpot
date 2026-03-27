param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRootPath = [System.IO.Path]::GetFullPath($RepoRoot)
$sessionFilePath = Join-Path $repoRootPath '.dev-session.json'
$stoppedLabels = New-Object System.Collections.Generic.List[string]

function Get-RepoNextProcesses {
  $repoPattern = [regex]::Escape($repoRootPath)
  $nextPattern = '(?i)(next(\.cmd)?\s+dev|npm(\.cmd)?\s+run\s+dev|node(\.exe)?.*next\\dist\\bin\\next)'
  $processes = Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $PID -and
      $_.CommandLine -and
      $_.CommandLine -match $repoPattern -and
      $_.CommandLine -match $nextPattern
    } |
    Select-Object ProcessId, Name, CommandLine

  return @($processes | ForEach-Object {
      @{
        pid = $_.ProcessId
        name = $_.Name
        commandLine = if ($_.CommandLine.Length -gt 220) { $_.CommandLine.Substring(0, 220) } else { $_.CommandLine }
      }
    })
}

function Stop-ProcessIfRunning {
  param(
    [int]$ProcessId,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if ($ProcessId -le 0) { return $false }

  $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $proc) { return $false }

  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Write-Host "[OK] Stopped $Label (PID $ProcessId)."
    return $true
  } catch {
    Write-Host "[WARN] Could not stop $Label (PID $ProcessId): $($_.Exception.Message)"
    return $false
  }
}

function Stop-ProcessesByCommandPattern {
  param(
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $repoPattern = [regex]::Escape($repoRootPath)
  $matched = Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $PID -and
      $_.CommandLine -and
      $_.CommandLine -match $repoPattern -and
      $_.CommandLine -match $Pattern
    }

  foreach ($proc in $matched) {
    if (Stop-ProcessIfRunning -ProcessId $proc.ProcessId -Label $Label) {
      $stoppedLabels.Add("$Label (PID $($proc.ProcessId))")
    }
  }
}

function Stop-RepoNextDevProcesses {
  $repoNextProcesses = Get-RepoNextProcesses
  foreach ($proc in $repoNextProcesses) {
    if (Stop-ProcessIfRunning -ProcessId $proc.pid -Label 'Next.js child process') {
      $stoppedLabels.Add("Next.js child process (PID $($proc.pid))")
    }
  }
}

Write-Host ''
Write-Host '=========================================='
Write-Host '  CoverSpot Dev Stop'
Write-Host '=========================================='
Write-Host ''

if (Test-Path $sessionFilePath) {
  try {
    $sessionRaw = Get-Content -Path $sessionFilePath -Raw -ErrorAction Stop
    $session = $sessionRaw | ConvertFrom-Json

    if (Stop-ProcessIfRunning -ProcessId $session.edgeFunctionsPid -Label 'Edge Functions terminal') {
      $stoppedLabels.Add("Edge Functions terminal (PID $($session.edgeFunctionsPid))")
    }
    if (Stop-ProcessIfRunning -ProcessId $session.nextJsPid -Label 'Next.js terminal') {
      $stoppedLabels.Add("Next.js terminal (PID $($session.nextJsPid))")
    }
  } catch {
    Write-Host "[WARN] Could not read session metadata from ${sessionFilePath}: $($_.Exception.Message)"
  }
} else {
  Write-Host '[INFO] No session metadata file found. Falling back to command-line matching.'
}

Stop-ProcessesByCommandPattern -Pattern 'supabase\s+functions\s+serve' -Label 'Edge Functions terminal'
Stop-ProcessesByCommandPattern -Pattern 'npm(\.cmd)?\s+run\s+dev' -Label 'Next.js terminal'
Stop-RepoNextDevProcesses

Write-Host '[INFO] Stopping Supabase containers for this project...'
$previousErrorActionPreference = $ErrorActionPreference
try {
  $script:ErrorActionPreference = 'Continue'
  $stopRaw = & supabase stop 2>&1
  $stopCode = $LASTEXITCODE
} finally {
  $script:ErrorActionPreference = $previousErrorActionPreference
}

if ($stopCode -eq 0) {
  Write-Host '[OK] Supabase stopped.'
} else {
  Write-Host '[INFO] Supabase stop returned non-zero (often means nothing was running).'
  $stopText = $stopRaw | Out-String
  if (-not [string]::IsNullOrWhiteSpace($stopText)) {
    Write-Host $stopText
  }
}

if ($Force) {
  Write-Host '[INFO] -Force specified. Stopping Docker Desktop processes...'
  $dockerProcesses = Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $PID -and
      (
        ($_.Name -and $_.Name -match '(?i)docker') -or
        ($_.ExecutablePath -and $_.ExecutablePath -match '(?i)\\Docker\\')
      )
    }

  $dockerStopped = $false
  foreach ($proc in $dockerProcesses) {
    if (Stop-ProcessIfRunning -ProcessId $proc.ProcessId -Label "Docker process $($proc.Name)") {
      $dockerStopped = $true
    }
  }

  if (-not $dockerStopped) {
    Write-Host '[INFO] No Docker Desktop processes were running.'
  }
}

if (Test-Path $sessionFilePath) {
  Remove-Item -Path $sessionFilePath -Force -ErrorAction SilentlyContinue
  Write-Host "[OK] Removed session metadata file: $sessionFilePath"
}

if ($stoppedLabels.Count -eq 0) {
  Write-Host '[INFO] No dev server terminals were running.'
} else {
  Write-Host '[OK] Stopped dev server terminals:'
  foreach ($label in $stoppedLabels) {
    Write-Host "     - $label"
  }
}

Write-Host '[OK] Dev stop completed.'
