# Test script - Simple version without emojis

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Test de Evaluacion Criterial - Backend Real        " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Check server
Write-Host "1. Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
    Write-Host "   [OK] Servidor respondiendo en puerto 3001" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Servidor no responde" -ForegroundColor Red
    Write-Host "   Ejecuta: cd server; node index.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Enviando evaluacion..." -ForegroundColor Yellow

$texto = "La inteligencia artificial en la educacion esta transformando radicalmente la forma en que los estudiantes aprenden y los profesores ensenan. Esta tecnologia no solo automatiza tareas administrativas, sino que tambien personaliza la experiencia de aprendizaje para cada estudiante, adaptandose a su ritmo y estilo individual. Sin embargo, es crucial considerar las implicaciones eticas y la necesidad de mantener el contacto humano en el proceso educativo, asegurando que la IA sea una herramienta complementaria y no un reemplazo de la interaccion profesor-alumno. El desafio esta en encontrar el equilibrio correcto entre innovacion tecnologica y pedagogia humanista."

$respuesta = "El texto presenta la IA en educacion de forma muy optimista, pero creo que hay aspectos problematicos que no se mencionan. Primero, cuando dice 'personaliza la experiencia de aprendizaje', no explica quien decide que es 'personalizacion' ni que datos se usan. Como menciona Noble (2018) en 'Algorithms of Oppression', los algoritmos pueden perpetuar sesgos sistemicos. Segundo, la frase 'automatiza tareas administrativas' asume que esto es neutral, pero segun Couldry y Mejias (2019) en 'The Costs of Connection', la dataficacion de la educacion convierte a estudiantes en 'datos' antes que personas. El texto dice 'mantener el contacto humano', pero esto parece una concesion retorica cuando todo el enfoque esta en la tecnologia como solucion. Por que no se discute el modelo economico detras? Quien gana con esta transformacion? El lenguaje usado ('transformando radicalmente', 'crucial') construye urgencia sin evidencia empirica sobre los beneficios reales en el aprendizaje."

$body = @{
    texto = $texto
    respuesta = $respuesta
    dimension = "comprensionAnalitica"
    provider = "deepseek"
} | ConvertTo-Json -Depth 10

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
    
    Write-Host "   [OK] Respuesta en $([math]::Round($duration, 2)) seg" -ForegroundColor Green
    Write-Host ""
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  RESULTADO DE LA EVALUACION                          " -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "PUNTUACION GENERAL" -ForegroundColor Yellow
    Write-Host "   Puntaje: $($data.evaluacion.puntajeGeneral)/10" -ForegroundColor White
    Write-Host "   Nivel: $($data.evaluacion.nivelLogrado)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "CRITERIOS EVALUADOS (5 criterios)" -ForegroundColor Yellow
    $criterioNum = 1
    foreach ($criterio in $data.evaluacion.criterios) {
        $nivelTexto = switch ($criterio.nivelAlcanzado) {
            1 { "[NIVEL 1]" }
            2 { "[NIVEL 2]" }
            3 { "[NIVEL 3]" }
            4 { "[NIVEL 4]" }
            default { "[NIVEL ?]" }
        }
        
        Write-Host "   $criterioNum. $($criterio.criterio) $nivelTexto" -ForegroundColor Cyan
        Write-Host "      Puntaje: $($criterio.puntaje)/10" -ForegroundColor Gray
        
        if ($criterio.evidencias -and $criterio.evidencias.Count -gt 0) {
            Write-Host "      Evidencias:" -ForegroundColor Gray
            foreach ($evidencia in $criterio.evidencias) {
                $textoCorto = if ($evidencia.Length -gt 60) { $evidencia.Substring(0, 60) + "..." } else { $evidencia }
                Write-Host "        - `"$textoCorto`"" -ForegroundColor DarkGray
            }
        }
        
        Write-Host ""
        $criterioNum++
    }
    
    Write-Host "FORTALEZAS ($($data.evaluacion.fortalezas.Count))" -ForegroundColor Green
    foreach ($fortaleza in $data.evaluacion.fortalezas) {
        Write-Host "   + $fortaleza" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "AREAS DE MEJORA ($($data.evaluacion.areasMejora.Count))" -ForegroundColor Yellow
    foreach ($mejora in $data.evaluacion.areasMejora) {
        Write-Host "   - $mejora" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "RESUMEN" -ForegroundColor Cyan
    Write-Host "   $($data.evaluacion.resumenGeneral)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "SIGUIENTES PASOS ($($data.evaluacion.siguientesPasos.Count))" -ForegroundColor Magenta
    $pasoNum = 1
    foreach ($paso in $data.evaluacion.siguientesPasos) {
        Write-Host "   $pasoNum. $paso" -ForegroundColor Magenta
        $pasoNum++
    }
    
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  VALIDACION ESTRUCTURAL                              " -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $validaciones = @(
        @{ nombre = "Estructura 'evaluacion' existe"; condicion = $null -ne $data.evaluacion }
        @{ nombre = "puntajeGeneral presente"; condicion = $null -ne $data.evaluacion.puntajeGeneral }
        @{ nombre = "nivelLogrado presente"; condicion = $null -ne $data.evaluacion.nivelLogrado }
        @{ nombre = "criterios es array"; condicion = $data.evaluacion.criterios -is [Array] }
        @{ nombre = "5 criterios evaluados"; condicion = $data.evaluacion.criterios.Count -eq 5 }
        @{ nombre = "fortalezas es array"; condicion = $data.evaluacion.fortalezas -is [Array] }
        @{ nombre = "areasMejora es array"; condicion = $data.evaluacion.areasMejora -is [Array] }
        @{ nombre = "resumenGeneral presente"; condicion = ![string]::IsNullOrWhiteSpace($data.evaluacion.resumenGeneral) }
        @{ nombre = "siguientesPasos es array"; condicion = $data.evaluacion.siguientesPasos -is [Array] }
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
    
    Write-Host "   [ERROR] despues de $([math]::Round($duration, 2)) seg" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "Codigo de respuesta: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Script completado exitosamente                      " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
