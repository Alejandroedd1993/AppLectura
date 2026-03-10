param(
  [string]$BackendUrl = "http://localhost:3001",
  [string]$IdToken
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

function Invoke-JsonPost($url, $headers, $bodyObject) {
  $body = $bodyObject | ConvertTo-Json -Depth 10

  try {
    $response = Invoke-WebRequest -Method Post -Uri $url -Headers $headers -Body $body -ContentType "application/json" -TimeoutSec 45
    return @{
      StatusCode = [int]$response.StatusCode
      Body = $response.Content
    }
  }
  catch {
    $webResponse = $_.Exception.Response
    if (-not $webResponse) {
      throw
    }

    $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
    $rawBody = $reader.ReadToEnd()
    $reader.Dispose()

    return @{
      StatusCode = [int]$webResponse.StatusCode.value__
      Body = $rawBody
    }
  }
}

try {
  Write-Step "Validando parametros"
  Require-Param "IdToken" $IdToken

  $base = $BackendUrl.TrimEnd('/')
  $headers = @{
    Authorization = "Bearer $IdToken"
    "Content-Type" = "application/json"
  }

  $checks = @(
    @{ Name = "chat"; Path = "/api/chat/completion"; Body = @{}; ExpectedStatus = 400 },
    @{ Name = "analysis"; Path = "/api/analysis/text"; Body = @{}; ExpectedStatus = 400 },
    @{ Name = "notes"; Path = "/api/notes/generate"; Body = @{}; ExpectedStatus = 400 },
    @{ Name = "assessment"; Path = "/api/assessment/evaluate"; Body = @{}; ExpectedStatus = 400 }
  )

  $failures = @()

  foreach ($check in $checks) {
    Write-Step "Probando $($check.Name)"
    $result = Invoke-JsonPost "$base$($check.Path)" $headers $check.Body
    Write-Host "HTTP $($result.StatusCode)" -ForegroundColor Yellow
    if ($result.Body) {
      Write-Host $result.Body
    }

    if ($result.StatusCode -ne $check.ExpectedStatus) {
      $failures += "$($check.Name): esperado $($check.ExpectedStatus), obtenido $($result.StatusCode)"
    }
  }

  if ($failures.Count -gt 0) {
    throw ($failures -join '; ')
  }

  Write-Host "`n✅ Smoke auth completado: todas las rutas protegidas aceptaron el token y respondieron con validacion de payload." -ForegroundColor Green
}
catch {
  Write-Host "`n❌ Smoke auth fallido: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}