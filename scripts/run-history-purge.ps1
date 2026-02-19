param(
  [string]$RepoPath = "C:\Users\User\Documents\AppLectura",
  [string]$RemoteName = "origin",
  [switch]$SkipBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[1/8] Verificando herramientas..." -ForegroundColor Cyan
Push-Location $RepoPath
try {
  git --version | Out-Null
  try {
    git filter-repo --version | Out-Null
  } catch {
    throw "git-filter-repo no está instalado. Instálalo primero y vuelve a ejecutar este script."
  }

  Write-Host "[2/8] Verificando estado del repo..." -ForegroundColor Cyan
  $staged = (git diff --cached --name-only | Measure-Object -Line).Lines
  $unstaged = (git diff --name-only | Measure-Object -Line).Lines
  Write-Host "Staged: $staged | Unstaged: $unstaged"

  if ($unstaged -gt 0) {
    Write-Host "Hay cambios unstaged. Se recomienda guardarlos antes del rewrite." -ForegroundColor Yellow
    throw "Aborta para evitar mezclar cambios de trabajo con reescritura de historial. Haz stash/commit y reintenta."
  }

  Write-Host "[3/8] Creando backup mirror (recomendado)..." -ForegroundColor Cyan
  if (-not $SkipBackup) {
    $parent = Split-Path -Parent $RepoPath
    $backup = Join-Path $parent "AppLectura-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').git"
    Push-Location $parent
    try {
      git clone --mirror $RepoPath $backup | Out-Null
      Write-Host "Backup creado: $backup" -ForegroundColor Green
    } finally {
      Pop-Location
    }
  }

  Write-Host "[4/8] Ejecutando purge de historial..." -ForegroundColor Cyan
  git filter-repo --paths-from-file scripts/history-purge.paths.txt --invert-paths --force

  Write-Host "[5/8] Expirando reflogs y GC agresivo..." -ForegroundColor Cyan
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive

  Write-Host "[6/8] Verificaciones rápidas..." -ForegroundColor Cyan
  $checkEnv = git log --all -- .env
  $checkScript = git log --all -- scripts/provision-expert-users.ps1
  if ($checkEnv) { Write-Host "Advertencia: aún hay trazas de .env en historial" -ForegroundColor Yellow }
  if ($checkScript) { Write-Host "Advertencia: aún hay trazas del script en historial" -ForegroundColor Yellow }

  Write-Host "[7/8] Instrucción manual requerida..." -ForegroundColor Cyan
  Write-Host "Revisa localmente y luego ejecuta:" -ForegroundColor Yellow
  Write-Host "  git push --force --all $RemoteName"
  Write-Host "  git push --force --tags $RemoteName"

  Write-Host "[8/8] Post-push" -ForegroundColor Cyan
  Write-Host "Pide al equipo reclonar o hacer reset duro a la rama remota." -ForegroundColor Yellow
}
finally {
  Pop-Location
}
