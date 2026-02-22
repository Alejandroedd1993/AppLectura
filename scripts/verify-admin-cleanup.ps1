param(
  [string]$BackendUrl = "http://localhost:3001",
  [string]$IdToken,
  [string]$CourseId,
  [string]$StudentUid,
  [string]$CleanupSecret,
  [int]$MaxJobs = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Require-Param($name, $value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Falta parámetro requerido: $name"
  }
}

try {
  Write-Step "Validando parámetros"
  Require-Param "IdToken" $IdToken
  Require-Param "CourseId" $CourseId
  Require-Param "StudentUid" $StudentUid

  $base = $BackendUrl.TrimEnd('/')

  Write-Step "1) Enqueue + processNow"
  $enqueueHeaders = @{
    Authorization = "Bearer $IdToken"
    "Content-Type" = "application/json"
  }

  $enqueueBody = @{
    courseId  = $CourseId
    studentUid = $StudentUid
    reason = "manual_verify"
    processNow = $true
  } | ConvertTo-Json

  $enqueueResp = Invoke-RestMethod -Method Post -Uri "$base/api/admin-cleanup/enqueue" -Headers $enqueueHeaders -Body $enqueueBody
  $enqueueResp | ConvertTo-Json -Depth 8

  if (-not $enqueueResp.ok) {
    throw "Enqueue devolvió ok=false"
  }

  if (-not [string]::IsNullOrWhiteSpace($CleanupSecret)) {
    Write-Step "2) Run pending worker"
    $workerHeaders = @{
      "x-cleanup-secret" = $CleanupSecret
      "Content-Type" = "application/json"
    }

    $runResp = Invoke-RestMethod -Method Post -Uri "$base/api/admin-cleanup/run-pending?maxJobs=$MaxJobs" -Headers $workerHeaders -Body "{}"
    $runResp | ConvertTo-Json -Depth 8
  }
  else {
    Write-Host "Se omitió run-pending (CleanupSecret vacío)." -ForegroundColor Yellow
  }

  Write-Host "`n✅ Verificación admin-cleanup completada." -ForegroundColor Green
}
catch {
  Write-Host "`n❌ Error en verificación admin-cleanup: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
