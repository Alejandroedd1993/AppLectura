param(
  [string]$BaseUrl = 'http://localhost:3001'
)

$ErrorActionPreference = 'Continue'

try {
  # Evita problemas de acentos/UTF-8 en PowerShell 5.1
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

function PostJson {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][object]$BodyObject,
    [int]$TimeoutSec = 45
  )

  $json = $BodyObject | ConvertTo-Json -Depth 40

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $data = Invoke-RestMethod -Method Post -Uri $Uri -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec
    $sw.Stop()
    return [pscustomobject]@{ ok = $true; status = 200; ms = [int]$sw.ElapsedMilliseconds; data = $data }
  } catch {
    $sw.Stop()
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}

    $raw = $null
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
      }
    } catch {}

    return [pscustomobject]@{ ok = $false; status = $status; ms = [int]$sw.ElapsedMilliseconds; error = $_.Exception.Message; raw = $raw }
  }
}

function PostJsonBody {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][object]$BodyObject,
    [int]$TimeoutSec = 45
  )

  $json = $BodyObject | ConvertTo-Json -Depth 40

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Method Post -Uri $Uri -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec -UseBasicParsing
    $sw.Stop()
    return [pscustomobject]@{ ok = $true; status = [int]$resp.StatusCode; ms = [int]$sw.ElapsedMilliseconds; content = $resp.Content }
  } catch {
    $sw.Stop()

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

    return [pscustomobject]@{ ok = $false; status = $status; ms = [int]$sw.ElapsedMilliseconds; error = $_.Exception.Message; content = $raw }
  }
}

function SafeLen {
  param([object]$Value)
  try {
    if ($null -eq $Value) { return 0 }
    return ($Value.ToString() | Measure-Object -Character).Characters
  } catch { return 0 }
}

function PrintAnalysisSummary {
  param(
    [string]$Label,
    [pscustomobject]$Resp
  )

  ("{0} ok={1} status={2} ms={3}" -f $Label, $Resp.ok, $Resp.status, $Resp.ms)

  if ($Resp.ok) {
    $r = $Resp.data
    $resLen = SafeLen $r.resumen
    $ideas = 0
    try { $ideas = @($r.ideasPrincipales).Count } catch {}
    $pregs = 0
    try { $pregs = @($r.preguntasReflexion).Count } catch {}
    $temas = 0
    try { $temas = @($r.temas).Count } catch {}

    "  resumen.len=$resLen ideas=$ideas preguntas=$pregs temas=$temas"
    $keys = @()
    try { $keys = $r.PSObject.Properties.Name } catch {}
    if ($keys.Count -gt 0) {
      "  keys=$((($keys | Select-Object -First 10) -join ','))"
    }
  } else {
    "  err=$($Resp.error)"
    if ($Resp.raw) {
      $snippet = $Resp.raw
      if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '...' }
      "  body.snippet=$snippet"
    }
  }
}

"=== Sección 5 - Análisis de Texto (pruebas reales) ==="
"base=$BaseUrl"

# Texto de prueba (>= 100 chars para reusar en prelecture)
$textoBase = ("La lectura crítica implica identificar ideas principales, reconocer el tono y evaluar evidencias. " * 3)

# 0) Smoke: /api/analysis/text con smart
$rSmart = PostJson -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 45 -BodyObject @{ texto = $textoBase; api = 'smart' }
PrintAnalysisSummary -Label 'analysis.text smart' -Resp $rSmart

# 1) Proveedores/estrategias soportadas
foreach ($api in @('openai','deepseek','gemini','alternate','debate')) {
  $r = PostJson -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 45 -BodyObject @{ texto = $textoBase; api = $api }
  PrintAnalysisSummary -Label ("analysis.text " + $api) -Resp $r

  if (-not $r.ok) {
    $rb = PostJsonBody -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 45 -BodyObject @{ texto = $textoBase; api = $api }
    "  http=$($rb.status) ms=$($rb.ms)"
    $snippet = $rb.content
    if ($null -eq $snippet) { $snippet = '' }
    if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '...' }
    if ($snippet) { "  body.snippet=$snippet" }
  }
}

# 2) Casos de validación (400)
$rEmpty = PostJsonBody -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 15 -BodyObject @{ texto = ''; api = 'smart' }
("analysis.text empty ok={0} status={1} ms={2}" -f $rEmpty.ok, $rEmpty.status, $rEmpty.ms)
if (-not $rEmpty.ok) {
  $snippet = $rEmpty.content
  if ($null -eq $snippet) { $snippet = '' }
  if ($snippet.Length -gt 260) { $snippet = $snippet.Substring(0, 260) + '...' }
  "  body.snippet=$snippet"
}

$rBadApi = PostJsonBody -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 15 -BodyObject @{ texto = $textoBase; api = 'nope' }
("analysis.text badApi ok={0} status={1} ms={2}" -f $rBadApi.ok, $rBadApi.status, $rBadApi.ms)
if (-not $rBadApi.ok) {
  $snippet = $rBadApi.content
  if ($null -eq $snippet) { $snippet = '' }
  if ($snippet.Length -gt 260) { $snippet = $snippet.Substring(0, 260) + '...' }
  "  body.snippet=$snippet"
}

# 3) Texto largo (ver truncamiento server-side a 4000 chars)
$textoLargo = ("Este es un bloque largo para probar truncamiento y timeouts. " * 400) + "FIN"
("textoLargo.len={0}" -f $textoLargo.Length)
$rLong = PostJson -Uri "$BaseUrl/api/analysis/text" -TimeoutSec 60 -BodyObject @{ texto = $textoLargo; api = 'smart' }
PrintAnalysisSummary -Label 'analysis.text long smart' -Resp $rLong

# 4) /api/analysis/prelecture (400 para corto, y luego largo con posible fallback)
$preShort = PostJsonBody -Uri "$BaseUrl/api/analysis/prelecture" -TimeoutSec 20 -BodyObject @{ text = 'Demasiado corto para prelectura.'; metadata = @{ genero_textual = 'articulo' } }
("analysis.prelecture short ok={0} status={1} ms={2}" -f $preShort.ok, $preShort.status, $preShort.ms)
if (-not $preShort.ok) {
  $snippet = $preShort.content
  if ($null -eq $snippet) { $snippet = '' }
  if ($snippet.Length -gt 260) { $snippet = $snippet.Substring(0, 260) + '...' }
  "  body.snippet=$snippet"
}

$preLongText = ($textoBase + ("Contexto adicional para superar umbral de caracteres y permitir análisis prelectura. " * 2))
$pre = PostJson -Uri "$BaseUrl/api/analysis/prelecture" -TimeoutSec 120 -BodyObject @{ text = $preLongText; metadata = @{ genero_textual = 'articulo' } }
("analysis.prelecture long ok={0} status={1} ms={2}" -f $pre.ok, $pre.status, $pre.ms)
if ($pre.ok) {
  "  keys=$((($pre.data.PSObject.Properties.Name | Select-Object -First 10) -join ','))"
} else {
  "  err=$($pre.error)"
  # Capturar body completo incluso con 500 (para fallback)
  $preBody = PostJsonBody -Uri "$BaseUrl/api/analysis/prelecture" -TimeoutSec 120 -BodyObject @{ text = $preLongText; metadata = @{ genero_textual = 'articulo' } }
  "  http=$($preBody.status)"
  $parsed = $null
  try { $parsed = $preBody.content | ConvertFrom-Json } catch {}

  if ($parsed -and $parsed.fallback) {
    '  500 pero trae fallback ✅'
    "  fallback.keys=$((($parsed.fallback.PSObject.Properties.Name | Select-Object -First 10) -join ','))"
  } else {
    $snippet = $preBody.content
    if ($null -eq $snippet) { $snippet = '' }
    if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '...' }
    "  body.snippet=$snippet"
  }
}

"=== DONE ==="
