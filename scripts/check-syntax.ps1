$file = Join-Path $PSScriptRoot 'dev-start.ps1'
$errors = $null
$tokens = [System.Management.Automation.PSParser]::Tokenize(
  (Get-Content $file -Raw),
  [ref]$errors
)
if ($errors.Count -eq 0) {
  Write-Host "[OK] No parse errors in $file"
} else {
  Write-Host "[FAIL] $($errors.Count) parse error(s):"
  foreach ($e in $errors) {
    Write-Host "  Line $($e.Token.StartLine): $($e.Message)"
  }
}
