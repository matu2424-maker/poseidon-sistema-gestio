$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$runtime = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$runtimePaths = @(
  (Join-Path $runtime "node\bin"),
  (Join-Path $runtime "bin\override"),
  (Join-Path $runtime "bin\fallback")
) | Where-Object { Test-Path -LiteralPath $_ }
if ($runtimePaths.Count -gt 0) {
  $env:PATH = (($runtimePaths + $env:PATH) -join [IO.Path]::PathSeparator)
}

$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pnpm) {
  $fallback = Join-Path $runtime "bin\fallback\pnpm.cmd"
  if (Test-Path -LiteralPath $fallback) {
    $pnpm = $fallback
  }
}

if (-not $pnpm) {
  Write-Error "No se encontro pnpm. Ejecuta el commit desde el entorno Codex o instala pnpm en PATH."
}

& $pnpm run check:commit
exit $LASTEXITCODE
