param(
  [string]$BackendUrl = "http://localhost:3001",
  [string]$IdToken,
  [string]$Route = "/api/chat/completion"
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

try {
  Write-Step "Validando parametros"
  Require-Param "IdToken" $IdToken

  $base = $BackendUrl.TrimEnd('/')
  $url = "$base$Route"

  Write-Step "Enviando request de verificacion auth"
  Write-Host "Backend: $base" -ForegroundColor Gray
  Write-Host "Ruta:    $Route" -ForegroundColor Gray
  Write-Host "Criterio de exito: auth valida y respuesta 400 de validacion" -ForegroundColor Gray

  $headers = @{
    Authorization = "Bearer $IdToken"
    "Content-Type" = "application/json"
  }

  $body = @{ } | ConvertTo-Json

  try {
    $response = Invoke-WebRequest -Method Post -Uri $url -Headers $headers -Body $body -ContentType "application/json" -TimeoutSec 30
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

  Write-Step "Resultado"
  Write-Host "HTTP $statusCode" -ForegroundColor Yellow
  if ($json) {
    $json | ConvertTo-Json -Depth 8
  }
  elseif (-not [string]::IsNullOrWhiteSpace($rawBody)) {
    Write-Host $rawBody
  }

  switch ($statusCode) {
    400 {
      Write-Host "`n✅ Auth verificada: el token fue aceptado y la ruta protegida respondio con error de validacion esperado." -ForegroundColor Green
      exit 0
    }
    401 {
      throw "Token rechazado por backend (401). Revisa el usuario autenticado o genera un ID token nuevo."
    }
    503 {
      $codigo = if ($json) { [string]$json.codigo } else { "" }
      if ($codigo -eq "FIREBASE_ADMIN_NOT_CONFIGURED") {
        throw "Firebase Admin no esta configurado en el backend objetivo. Falta credencial o esta mal cargada."
      }
      throw "Backend devolvio 503. Revisa configuracion de staging/Render."
    }
    default {
      throw "Resultado inesperado: HTTP $statusCode. Revisa la respuesta anterior."
    }
  }
}
catch {
  Write-Host "`n❌ Verificacion auth fallida: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}