# Script de prueba usando curl (sin Node.js)
# Este script NO debe cerrar el servidor

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Prueba de Evaluación Criterial - Backend Real     " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

function Resolve-SuccessPayload {
    param($Object)

    if ($null -eq $Object) { return $null }

    $okProp = $Object.PSObject.Properties['ok']
    $dataProp = $Object.PSObject.Properties['data']
    if ($null -ne $okProp -and $okProp.Value -eq $true -and $null -ne $dataProp) {
        return $dataProp.Value
    }

    return $Object
}

# Verificar que el servidor esté corriendo
Write-Host "1. Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Servidor respondiendo en puerto 3001" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ERROR: Servidor no responde" -ForegroundColor Red
    Write-Host "   Por favor ejecuta: cd server; node index.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Enviando solicitud de evaluación..." -ForegroundColor Yellow

# Datos de prueba
$texto = "La inteligencia artificial en la educación está transformando radicalmente la forma en que los estudiantes aprenden y los profesores enseñan. Esta tecnología no solo automatiza tareas administrativas, sino que también personaliza la experiencia de aprendizaje para cada estudiante, adaptándose a su ritmo y estilo individual. Sin embargo, es crucial considerar las implicaciones éticas y la necesidad de mantener el contacto humano en el proceso educativo, asegurando que la IA sea una herramienta complementaria y no un reemplazo de la interacción profesor-alumno. El desafío está en encontrar el equilibrio correcto entre innovación tecnológica y pedagogía humanista."

$respuesta = "El texto presenta la IA en educación de forma muy optimista, pero creo que hay aspectos problemáticos que no se mencionan. Primero, cuando dice 'personaliza la experiencia de aprendizaje', no explica quién decide qué es 'personalización' ni qué datos se usan. Como menciona Noble (2018) en 'Algorithms of Oppression', los algoritmos pueden perpetuar sesgos sistémicos. Segundo, la frase 'automatiza tareas administrativas' asume que esto es neutral, pero según Couldry y Mejías (2019) en 'The Costs of Connection', la dataficación de la educación convierte a estudiantes en 'datos' antes que personas. El texto dice 'mantener el contacto humano', pero esto parece una concesión retórica cuando todo el enfoque está en la tecnología como solución. ¿Por qué no se discute el modelo económico detrás? ¿Quién gana con esta transformación? El lenguaje usado ('transformando radicalmente', 'crucial') construye urgencia sin evidencia empírica sobre los beneficios reales en el aprendizaje."

# Crear JSON
$body = @{
    texto = $texto
    respuesta = $respuesta
    dimension = "comprensionAnalitica"
    provider = "deepseek"
} | ConvertTo-Json -Depth 10

# Hacer la solicitud
Write-Host "   📤 Enviando a: http://localhost:3001/api/assessment/evaluate" -ForegroundColor Cyan
Write-Host "   📝 Dimensión: Comprensión Analítica" -ForegroundColor Cyan
Write-Host "   🤖 Provider: DeepSeek" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:3001/api/assessment/evaluate" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 60
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "   ✅ Respuesta recibida en $([math]::Round($duration, 2)) segundos" -ForegroundColor Green
    Write-Host ""
    
    # Parsear respuesta
    $data = Resolve-SuccessPayload ($response.Content | ConvertFrom-Json)
    
    # Mostrar resultado
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  RESULTADO DE LA EVALUACIÓN                         " -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📊 PUNTUACIÓN GENERAL" -ForegroundColor Yellow
    Write-Host "   Puntaje: $($data.scoreGlobal)/10" -ForegroundColor White
    Write-Host "   Nivel: $($data.nivel)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📋 CRITERIOS EVALUADOS (5 criterios)" -ForegroundColor Yellow
    $criterioNum = 1
    foreach ($criterio in $data.criteriosEvaluados) {
        $nivelTexto = switch ($criterio.nivel) {
            1 { "[NIVEL 1]" }
            2 { "[NIVEL 2]" }
            3 { "[NIVEL 3]" }
            4 { "[NIVEL 4]" }
            default { "[NIVEL ?]" }
        }
        
        Write-Host "   $criterioNum. $($criterio.criterio) $nivelTexto" -ForegroundColor Cyan
        
        if ($criterio.evidencia -and $criterio.evidencia.Count -gt 0) {
            Write-Host "      Evidencias:" -ForegroundColor Gray
            foreach ($evidencia in $criterio.evidencia) {
                $textoCorto = if ($evidencia.Length -gt 60) { $evidencia.Substring(0, 60) + "..." } else { $evidencia }
                Write-Host "        • `"$textoCorto`"" -ForegroundColor DarkGray
            }
        }
        
        Write-Host ""
        $criterioNum++
    }
    
    Write-Host "FORTALEZAS ($($data.fortalezas.Count) detectadas)" -ForegroundColor Green
    foreach ($fortaleza in $data.fortalezas) {
        Write-Host "   + $fortaleza" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "AREAS DE MEJORA ($($data.mejoras.Count) identificadas)" -ForegroundColor Yellow
    foreach ($mejora in $data.mejoras) {
        Write-Host "   - $mejora" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "RESUMEN" -ForegroundColor Cyan
    Write-Host "   $($data.resumenDimension)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "SIGUIENTES PASOS ($($data.siguientesPasos.Count) recomendaciones)" -ForegroundColor Magenta
    $pasoNum = 1
    foreach ($paso in $data.siguientesPasos) {
        Write-Host "   $pasoNum. $paso" -ForegroundColor Magenta
        $pasoNum++
    }
    
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  ✅ VALIDACIÓN ESTRUCTURAL                          " -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Validaciones estructurales
    $validaciones = @(
        @{ nombre = "valid presente"; condicion = $null -ne $data.valid }
        @{ nombre = "scoreGlobal presente"; condicion = $null -ne $data.scoreGlobal }
        @{ nombre = "nivel presente"; condicion = $null -ne $data.nivel }
        @{ nombre = "criteriosEvaluados es array"; condicion = $data.criteriosEvaluados -is [Array] }
        @{ nombre = "al menos 1 criterio"; condicion = $data.criteriosEvaluados.Count -gt 0 }
        @{ nombre = "resumenDimension presente"; condicion = ![string]::IsNullOrWhiteSpace($data.resumenDimension) }
        @{ nombre = "siguientesPasos es array"; condicion = $data.siguientesPasos -is [Array] }
    )
    
    $pasadas = 0
    $fallidas = 0
    
    foreach ($val in $validaciones) {
        if ($val.condicion) {
            Write-Host "   [OK] $($val.nombre)" -ForegroundColor Green
            $pasadas++
        } else {
            Write-Host "   [FAIL] $($val.nombre)" -ForegroundColor Red
            $fallidas++
        }
    }
    
    Write-Host ""
    Write-Host "Resultado: $pasadas pasadas, $fallidas fallidas" -ForegroundColor $(if ($fallidas -eq 0) { "Green" } else { "Yellow" })
    
    if ($fallidas -eq 0) {
        Write-Host ""
        Write-Host "EXITO TOTAL! La evaluacion criterial funciona correctamente" -ForegroundColor Green
        Write-Host "   Todas las estructuras de datos estan presentes" -ForegroundColor Green
        Write-Host "   El backend esta listo para integracion frontend" -ForegroundColor Green
    }
    
} catch {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "   ❌ ERROR después de $([math]::Round($duration, 2)) segundos" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "Código de respuesta: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Script completado exitosamente                     " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
