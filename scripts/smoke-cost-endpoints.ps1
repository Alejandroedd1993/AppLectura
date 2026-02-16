param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [int]$TimeoutSec = 120,

    [string]$ReportPath = "",

    [switch]$AuthGateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    Add-Type -AssemblyName System.Net.Http -ErrorAction Stop | Out-Null
}
catch {
    # En algunos entornos PowerShell clásicos ya viene cargado.
}

function Invoke-RawHttpRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Method,
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [Parameter(Mandatory = $true)]
        [hashtable]$Headers,
        [string]$BodyJson = $null,
        [Parameter(Mandatory = $true)]
        [int]$RequestTimeoutSec
    )

    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.AllowAutoRedirect = $false
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [System.TimeSpan]::FromSeconds($RequestTimeoutSec)

    $httpMethod = [System.Net.Http.HttpMethod]::new($Method.ToUpperInvariant())
    $request = New-Object System.Net.Http.HttpRequestMessage($httpMethod, $Url)

    try {
        foreach ($k in $Headers.Keys) {
            if ($k -ieq 'Content-Type') { continue }
            [void]$request.Headers.TryAddWithoutValidation($k, [string]$Headers[$k])
        }

        if (-not [string]::IsNullOrEmpty($BodyJson)) {
            $contentType = if ($Headers.ContainsKey('Content-Type')) { [string]$Headers['Content-Type'] } else { 'application/json' }
            $request.Content = New-Object System.Net.Http.StringContent($BodyJson, [System.Text.Encoding]::UTF8, $contentType)
        }

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $status = [int]$response.StatusCode
        $content = ''
        if ($null -ne $response.Content) {
            $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }

        return [pscustomobject]@{
            status = $status
            content = $content
            error = $null
        }
    }
    catch {
        return [pscustomobject]@{
            status = -1
            content = [string]$_.Exception.Message
            error = [string]$_.Exception.Message
        }
    }
    finally {
        if ($null -ne $request) { $request.Dispose() }
        if ($null -ne $client) { $client.Dispose() }
        if ($null -ne $handler) { $handler.Dispose() }
    }
}

function Has-JsonKey {
    param(
        $Object,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if ($null -eq $Object) { return $false }

    if ($Object -is [hashtable]) {
        return $Object.ContainsKey($Key) -and $null -ne $Object[$Key]
    }

    $prop = $Object.PSObject.Properties[$Key]
    return ($null -ne $prop) -and ($null -ne $prop.Value)
}

function Invoke-SmokeTest {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Test,
        [Parameter(Mandatory = $true)]
        [string]$ResolvedBaseUrl,
        [Parameter(Mandatory = $true)]
        [string]$AuthToken,
        [Parameter(Mandatory = $true)]
        [int]$RequestTimeoutSec
    )

    $headers = @{ 'Content-Type' = 'application/json' }
    if ($Test.auth) {
        $headers['Authorization'] = "Bearer $AuthToken"
    }

    $url = "$ResolvedBaseUrl$($Test.path)"
    $bodyJson = $null
    if ($null -ne $Test.body) {
        $bodyJson = $Test.body | ConvertTo-Json -Depth 30 -Compress
    }

    $status = -1
    $content = ''

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $raw = Invoke-RawHttpRequest -Method $Test.method -Url $url -Headers $headers -BodyJson $bodyJson -RequestTimeoutSec $RequestTimeoutSec
        $status = [int]$raw.status
        $content = [string]$raw.content
    }
    finally {
        $sw.Stop()
    }

    $hasExpected = $Test.ContainsKey('expectedStatus') -and $null -ne $Test.expectedStatus -and @($Test.expectedStatus).Count -gt 0
    $hasForbidden = $Test.ContainsKey('forbiddenStatus') -and $null -ne $Test.forbiddenStatus -and @($Test.forbiddenStatus).Count -gt 0

    $statusOk = $true
    if ($hasExpected) {
        $statusOk = $Test.expectedStatus -contains $status
    } elseif ($hasForbidden) {
        $statusOk = -not ($Test.forbiddenStatus -contains $status)
    }

    $missingKeys = @()
    if ($statusOk -and $null -ne $Test.requiredKeys -and $Test.requiredKeys.Count -gt 0) {
        $jsonObj = $null
        try {
            try {
                $jsonObj = $content | ConvertFrom-Json -Depth 40
            }
            catch {
                # Compatibilidad con Windows PowerShell (sin parámetro -Depth)
                $jsonObj = $content | ConvertFrom-Json
            }
        }
        catch {
            $jsonObj = $null
        }

        foreach ($k in $Test.requiredKeys) {
            if (-not (Has-JsonKey -Object $jsonObj -Key $k)) {
                $missingKeys += $k
            }
        }
    }

    $keysOk = $missingKeys.Count -eq 0
    $passed = $statusOk -and $keysOk

    $preview = if ([string]::IsNullOrWhiteSpace($content)) {
        ''
    } elseif ($content.Length -gt 240) {
        $content.Substring(0, 240) + '...'
    } else {
        $content
    }

    $expectedLabel = 'any'
    if ($hasExpected) {
        $expectedLabel = ($Test.expectedStatus -join '/')
    } elseif ($hasForbidden) {
        $expectedLabel = 'not ' + ($Test.forbiddenStatus -join '/')
    }

    return [pscustomobject]@{
        id          = $Test.id
        method      = $Test.method
        path        = $Test.path
        auth        = $Test.auth
        expected    = $expectedLabel
        status      = $status
        passed      = $passed
        durationMs  = [int]$sw.ElapsedMilliseconds
        missingKeys = ($missingKeys -join ',')
        note        = $Test.note
        preview     = $preview
    }
}

$resolvedBaseUrl = $BaseUrl.TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($resolvedBaseUrl)) {
    throw "BaseUrl es obligatorio"
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "Token es obligatorio"
}

$prelectureText = ("La lectura critica permite analizar argumentos, sesgos y evidencias en contextos sociales complejos. " * 8).Trim()
$glossaryText = ("Este texto academico discute epistemologia, hermeneutica, argumentacion y practicas de literacidad critica en educacion superior. " * 8).Trim()

$tests = @()
if ($AuthGateOnly) {
    $tests = @(
        @{
            id = 'A1'; method = 'POST'; path = '/api/analysis/text'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/text sin token (gate)'
            body = @{}
        },
        @{
            id = 'A2'; method = 'POST'; path = '/api/analysis/text'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'analysis/text con token (gate)'
            body = @{}
        },
        @{
            id = 'B1'; method = 'POST'; path = '/api/analysis/prelecture'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/prelecture sin token (gate)'
            body = @{}
        },
        @{
            id = 'B2'; method = 'POST'; path = '/api/analysis/prelecture'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'analysis/prelecture con token (gate)'
            body = @{}
        },
        @{
            id = 'C1'; method = 'POST'; path = '/api/analysis/glossary'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/glossary sin token (gate)'
            body = @{}
        },
        @{
            id = 'C2'; method = 'POST'; path = '/api/analysis/glossary'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'analysis/glossary con token (gate)'
            body = @{}
        },
        @{
            id = 'D1'; method = 'POST'; path = '/api/notes/generate'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'notes/generate sin token (gate)'
            body = @{}
        },
        @{
            id = 'D2'; method = 'POST'; path = '/api/notes/generate'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'notes/generate con token (gate)'
            body = @{}
        },
        @{
            id = 'E1'; method = 'POST'; path = '/api/web-search'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'web-search sin token (gate)'
            body = @{}
        },
        @{
            id = 'E2'; method = 'POST'; path = '/api/web-search'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'web-search con token (gate)'
            body = @{}
        },
        @{
            id = 'F1'; method = 'POST'; path = '/api/web-search/answer'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'web-search/answer sin token (gate)'
            body = @{}
        },
        @{
            id = 'F2'; method = 'POST'; path = '/api/web-search/answer'; auth = $true; forbiddenStatus = @(401, 403, -1); requiredKeys = @(); note = 'web-search/answer con token (gate)'
            body = @{}
        },
        @{
            id = 'G1'; method = 'GET'; path = '/api/web-search/test'; auth = $false; expectedStatus = @(200); requiredKeys = @('configuracion'); note = 'web-search/test publico'
            body = $null
        }
    )
} else {
    $tests = @(
        @{
            id = 'A1'; method = 'POST'; path = '/api/analysis/text'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/text sin token'
            body = @{ texto = 'Texto de prueba para analisis'; api = 'deepseek' }
        },
        @{
            id = 'A2'; method = 'POST'; path = '/api/analysis/text'; auth = $true; expectedStatus = @(200); requiredKeys = @('resumen'); note = 'analysis/text con token'
            body = @{ texto = 'Texto de prueba para analisis'; api = 'deepseek' }
        },
        @{
            id = 'B1'; method = 'POST'; path = '/api/analysis/prelecture'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/prelecture sin token'
            body = @{ text = $prelectureText; metadata = @{} }
        },
        @{
            id = 'B2'; method = 'POST'; path = '/api/analysis/prelecture'; auth = $true; expectedStatus = @(200, 502); requiredKeys = @(); note = 'analysis/prelecture con token'
            body = @{ text = $prelectureText; metadata = @{} }
        },
        @{
            id = 'C1'; method = 'POST'; path = '/api/analysis/glossary'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'analysis/glossary sin token'
            body = @{ text = $glossaryText; maxTerms = 6 }
        },
        @{
            id = 'C2'; method = 'POST'; path = '/api/analysis/glossary'; auth = $true; expectedStatus = @(200); requiredKeys = @('terms'); note = 'analysis/glossary con token'
            body = @{ text = $glossaryText; maxTerms = 6 }
        },
        @{
            id = 'D1'; method = 'POST'; path = '/api/notes/generate'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'notes/generate sin token'
            body = @{ texto = 'Texto corto para generar notas de prueba'; api = 'openai'; tipoTexto = 'auto'; numeroTarjetas = 5 }
        },
        @{
            id = 'D2'; method = 'POST'; path = '/api/notes/generate'; auth = $true; expectedStatus = @(200); requiredKeys = @('resumen', 'notas', 'preguntas', 'tarjetas'); note = 'notes/generate con token'
            body = @{ texto = 'Texto corto para generar notas de prueba'; api = 'openai'; tipoTexto = 'auto'; numeroTarjetas = 5 }
        },
        @{
            id = 'E1'; method = 'POST'; path = '/api/web-search'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'web-search sin token'
            body = @{ query = 'pobreza ecuador estadisticas 2025'; type = 'estadisticas_locales'; maxResults = 5 }
        },
        @{
            id = 'E2'; method = 'POST'; path = '/api/web-search'; auth = $true; expectedStatus = @(200); requiredKeys = @('resultados'); note = 'web-search con token'
            body = @{ query = 'pobreza ecuador estadisticas 2025'; type = 'estadisticas_locales'; maxResults = 5 }
        },
        @{
            id = 'F1'; method = 'POST'; path = '/api/web-search/answer'; auth = $false; expectedStatus = @(401, 403); requiredKeys = @(); note = 'web-search/answer sin token'
            body = @{ query = 'impacto social de la lectura critica'; maxResults = 4; provider = 'smart' }
        },
        @{
            id = 'F2'; method = 'POST'; path = '/api/web-search/answer'; auth = $true; expectedStatus = @(200); requiredKeys = @('respuesta', 'citas'); note = 'web-search/answer con token'
            body = @{ query = 'impacto social de la lectura critica'; maxResults = 4; provider = 'smart' }
        },
        @{
            id = 'G1'; method = 'GET'; path = '/api/web-search/test'; auth = $false; expectedStatus = @(200); requiredKeys = @('configuracion'); note = 'web-search/test publico'
            body = $null
        }
    )
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Smoke test de endpoints de costo (staging)       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BaseUrl: $resolvedBaseUrl"
Write-Host "Total tests: $($tests.Count)"
Write-Host ""

$results = @()
foreach ($t in $tests) {
    Write-Host ("[{0}] {1} {2} auth={3}" -f $t.id, $t.method, $t.path, $t.auth) -ForegroundColor Yellow
    $r = Invoke-SmokeTest -Test $t -ResolvedBaseUrl $resolvedBaseUrl -AuthToken $Token -RequestTimeoutSec $TimeoutSec
    $results += $r

    if ($r.passed) {
        Write-Host ("  PASS status={0} expected={1} time={2}ms" -f $r.status, $r.expected, $r.durationMs) -ForegroundColor Green
    } else {
        Write-Host ("  FAIL status={0} expected={1} time={2}ms" -f $r.status, $r.expected, $r.durationMs) -ForegroundColor Red
        if (-not [string]::IsNullOrWhiteSpace($r.missingKeys)) {
            Write-Host ("  Missing keys: {0}" -f $r.missingKeys) -ForegroundColor Red
        }
        if (-not [string]::IsNullOrWhiteSpace($r.preview)) {
            Write-Host ("  Body preview: {0}" -f $r.preview) -ForegroundColor DarkGray
        }
    }
    Write-Host ""
}

$resultsArray = @($results)
$passCount = @($resultsArray | Where-Object { $_.passed }).Count
$failCount = $resultsArray.Count - $passCount

Write-Host "==================== RESUMEN =====================" -ForegroundColor Cyan
$results |
    Select-Object id, passed, status, expected, method, path, auth, durationMs, missingKeys |
    Format-Table -AutoSize

Write-Host ""
if ($failCount -eq 0) {
    Write-Host ("Resultado final: {0} pass, {1} fail" -f $passCount, $failCount) -ForegroundColor Green
} else {
    Write-Host ("Resultado final: {0} pass, {1} fail" -f $passCount, $failCount) -ForegroundColor Red
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $ReportPath = "test-results/smoke-cost-endpoints-$timestamp.json"
}

$reportDir = Split-Path -Parent $ReportPath
if (-not [string]::IsNullOrWhiteSpace($reportDir) -and -not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
}

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToString("o")
    baseUrl     = $resolvedBaseUrl
    timeoutSec  = $TimeoutSec
    total       = $resultsArray.Count
    passed      = $passCount
    failed      = $failCount
    results     = $results
}

$report | ConvertTo-Json -Depth 20 | Set-Content -Path $ReportPath -Encoding UTF8
Write-Host ("Reporte JSON: {0}" -f $ReportPath)

if ($failCount -gt 0) {
    exit 1
}

exit 0
