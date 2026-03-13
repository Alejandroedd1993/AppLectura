param(
  [string]$BackendUrl = "http://localhost:3001",
  [string]$IdToken,
  [string]$ExpectedCode,
  [int]$ExpectedStatus,
  [string]$Route = "/api/chat/completion"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Require-Param($name, $value) {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
    throw "Falta parametro requerido: $name"
  }
}

function Read-JsonBody($responseText) {
  if ([string]::IsNullOrWhiteSpace($responseText)) {
    return $null
  }

  try {
    return $responseText | ConvertFrom-Json
  }
  catch {
    return $null
  }
}

function Get-ErrorCode($json) {
  if (-not $json) {
    return ""
  }

  if ($json.codigo) {
    return [string]$json.codigo
  }

  if ($json.error -and $json.error.code) {
    return [string]$json.error.code
  }

  return ""
}

try {
  Write-Step "Validando parametros"
  Require-Param "IdToken" $IdToken
  Require-Param "ExpectedCode" $ExpectedCode
  if ($ExpectedStatus -le 0) {
    throw "Falta parametro requerido: ExpectedStatus"
  }

  $base = $BackendUrl.TrimEnd('/')
  $url = "$base$Route"

  Write-Step "Enviando request de verificacion de estado auth"
  Write-Host "Backend:         $base" -ForegroundColor Gray
  Write-Host "Ruta:            $Route" -ForegroundColor Gray
  Write-Host "Estado esperado: HTTP $ExpectedStatus" -ForegroundColor Gray
  Write-Host "Codigo esperado: $ExpectedCode" -ForegroundColor Gray

  $headers = @{
    Authorization = "Bearer $IdToken"
    "Content-Type" = "application/json"
  }

  $body = @{ } | ConvertTo-Json

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $url -Headers $headers -Body $body -ContentType "application/json" -TimeoutSec 30
    $statusCode = [int]$response.StatusCode
    $rawBody = $response.Content
  }
  catch {
    $webResponse = $_.Exception.Response
    if (-not $webResponse) {
      throw
    }

    $statusCode = [int]$webResponse.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
    $rawBody = $reader.ReadToEnd()
    $reader.Dispose()
  }

  $json = Read-JsonBody $rawBody
  $actualCode = Get-ErrorCode $json

  Write-Step "Resultado"
  Write-Host "HTTP $statusCode" -ForegroundColor Yellow
  if ($json) {
    $json | ConvertTo-Json -Depth 8
  }
  elseif (-not [string]::IsNullOrWhiteSpace($rawBody)) {
    Write-Host $rawBody
  }

  if ($statusCode -ne $ExpectedStatus) {
    throw "HTTP inesperado: esperado $ExpectedStatus y se recibio $statusCode."
  }

  if ($actualCode -ne $ExpectedCode) {
    throw "Codigo inesperado: esperado $ExpectedCode y se recibio '$actualCode'."
  }

  Write-Host "`n✅ Verificacion auth completada: el backend devolvio el estado semantico esperado." -ForegroundColor Green
}
catch {
  Write-Host "`n❌ Verificacion auth fallida: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}