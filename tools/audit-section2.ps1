$ErrorActionPreference = 'Continue'

function PostJson {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][object]$BodyObject,
    [int]$TimeoutSec = 30
  )

  $json = $BodyObject | ConvertTo-Json -Depth 30

  try {
    $data = Invoke-RestMethod -Method Post -Uri $Uri -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec
    return [pscustomobject]@{ ok = $true; status = 200; data = $data }
  } catch {
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}

    $raw = $null
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
      }
    } catch {}

    return [pscustomobject]@{ ok = $false; status = $status; error = $_.Exception.Message; raw = $raw }
  }
}

function PostJsonBody {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][object]$BodyObject,
    [int]$TimeoutSec = 30
  )

  $json = $BodyObject | ConvertTo-Json -Depth 30

  try {
    $resp = Invoke-WebRequest -Method Post -Uri $Uri -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec -UseBasicParsing
    return [pscustomobject]@{ ok = $true; status = [int]$resp.StatusCode; content = $resp.Content }
  } catch {
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}

    $raw = $null
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
      }
    } catch {}

    if (($null -eq $raw -or $raw -eq '') -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
      $raw = $_.ErrorDetails.Message
    }

    return [pscustomobject]@{ ok = $false; status = $status; error = $_.Exception.Message; content = $raw }
  }
}

$base = 'http://localhost:3001'

'=== Sección 2 - Backend APIs (pruebas reales) ==='

# 0) Health
try {
  $health = Invoke-RestMethod -Method Get -Uri "$base/health" -TimeoutSec 5
  "health ok=true status=200 service=$($health.service)"
} catch {
  "health ok=false err=$($_.Exception.Message)"
}

# 1) /api/chat/completion (OpenAI)
$chat = PostJson -Uri "$base/api/chat/completion" -TimeoutSec 30 -BodyObject @{
  provider = 'openai'
  max_tokens = 16
  temperature = 0
  messages = @(
    @{ role = 'user'; content = 'Responde solo con la palabra OK.' }
  )
}
("chat.completion ok={0} status={1}" -f $chat.ok, $chat.status)
if ($chat.ok) {
  "  content=$($chat.data.content -replace "\r?\n", ' ')"
} else {
  "  err=$($chat.error)"
  if ($chat.raw) { "  raw=$($chat.raw)" }
}

# 2) /api/analysis/text (OpenAI)
$texto = 'Texto de prueba suficientemente claro para extraer resumen e ideas principales.'
$an = PostJson -Uri "$base/api/analysis/text" -TimeoutSec 30 -BodyObject @{ texto = $texto; api = 'openai' }
("analysis.text ok={0} status={1}" -f $an.ok, $an.status)
if ($an.ok) {
  $resLen = ($an.data.resumen | Measure-Object -Character).Characters
  "  resumen.len=$resLen ideas=$($an.data.ideasPrincipales.Count)"
} else {
  "  err=$($an.error)"
  if ($an.raw) { "  raw=$($an.raw)" }
}

# 3) /api/analysis/prelecture (puede devolver fallback con 500)
$longText = ('Texto de prueba para prelectura. ' * 10) + 'Incluye suficientes caracteres para superar el mínimo de 100.'
$pre = PostJson -Uri "$base/api/analysis/prelecture" -TimeoutSec 45 -BodyObject @{ text = $longText; metadata = @{ genero_textual = 'articulo' } }
("analysis.prelecture ok={0} status={1}" -f $pre.ok, $pre.status)
if ($pre.ok) {
  "  keys=$((($pre.data.PSObject.Properties.Name | Select-Object -First 8) -join ','))"
} else {
  "  err=$($pre.error)"

  # Capturar body completo incluso con 500
  try {
    $preResp = PostJsonBody -Uri "$base/api/analysis/prelecture" -TimeoutSec 45 -BodyObject @{ text = $longText; metadata = @{ genero_textual = 'articulo' } }
    "  http=$($preResp.status)"
    $parsed = $null
    try { $parsed = $preResp.content | ConvertFrom-Json } catch {}

    if ($parsed -and $parsed.fallback) {
      '  500 pero trae fallback ✅'
      "  fallback.keys=$((($parsed.fallback.PSObject.Properties.Name | Select-Object -First 8) -join ','))"
    } else {
      $snippet = $preResp.content
      if ($null -eq $snippet) { $snippet = '' }
      if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '...' }
      "  body.snippet=$snippet"
    }
  } catch {
    "  body.capture.err=$($_.Exception.Message)"
  }
}

# 4) /api/web-search/test + /api/web-search
try {
  $wsTest = Invoke-RestMethod -Method Get -Uri "$base/api/web-search/test" -TimeoutSec 10
  "web-search.test modo=$($wsTest.configuracion.modo_funcionamiento)"
} catch {
  "web-search.test ok=false err=$($_.Exception.Message)"
}

$ws = PostJson -Uri "$base/api/web-search" -TimeoutSec 20 -BodyObject @{ query = 'pobreza ecuador estadisticas 2024'; type = 'estadisticas_locales'; maxResults = 3 }
("web-search ok={0} status={1}" -f $ws.ok, $ws.status)
if ($ws.ok) {
  "  api_utilizada=$($ws.data.api_utilizada) resultados=$($ws.data.resultados.Count)"
} else {
  "  err=$($ws.error)"
  if ($ws.raw) { "  raw=$($ws.raw)" }
}

# 5) /api/notes/generate (OpenAI)
$notes = PostJson -Uri "$base/api/notes/generate" -TimeoutSec 30 -BodyObject @{ texto = $texto; api = 'openai'; nivelAcademico = 'pregrado' }
("notes.generate ok={0} status={1}" -f $notes.ok, $notes.status)
if ($notes.ok) {
  "  keys=$((($notes.data.PSObject.Properties.Name | Select-Object -First 8) -join ','))"
} else {
  "  err=$($notes.error)"
  if ($notes.raw) { "  raw=$($notes.raw)" }
}

# 6) /api/assessment/evaluate (OpenAI)
$assText = ('Texto base para evaluación. ' * 8) + 'Debe superar 50 caracteres para pasar validación.'
$assResp = ('Respuesta del estudiante. ' * 4) + 'Incluye una idea central y un ejemplo.'
$ass = PostJson -Uri "$base/api/assessment/evaluate" -TimeoutSec 30 -BodyObject @{ texto = $assText; respuesta = $assResp; dimension = 'argumentacion'; provider = 'openai' }
("assessment.evaluate ok={0} status={1}" -f $ass.ok, $ass.status)
if ($ass.ok) {
  "  scoreGlobal=$($ass.data.scoreGlobal) nivel=$($ass.data.nivel)"
} else {
  "  err=$($ass.error)"

  # Capturar body (muy útil si fue JSON inválido o evaluación incompleta)
  try {
    $assResp2 = PostJsonBody -Uri "$base/api/assessment/evaluate" -TimeoutSec 30 -BodyObject @{ texto = $assText; respuesta = $assResp; dimension = 'argumentacion'; provider = 'openai' }
    "  http=$($assResp2.status)"
    $snippet = $assResp2.content
    if ($null -eq $snippet) { $snippet = '' }
    if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '...' }
    "  body.snippet=$snippet"
  } catch {
    "  body.capture.err=$($_.Exception.Message)"
  }
}

'=== DONE ==='
