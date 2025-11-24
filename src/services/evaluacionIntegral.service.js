// src/services/evaluacionIntegral.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension } from '../pedagogy/rubrics/criticalLiteracyRubric';

const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_MODEL = 'gpt-4o-mini';

/**
 * Mapa de dimensiones a rúbricas
 */
const DIMENSION_MAP = {
  comprension_analitica: 'comprensionAnalitica',
  acd: 'acd',
  contextualizacion: 'contextualizacion',
  argumentacion: 'argumentacion',
  metacognicion_etica_ia: 'comprensionAnalitica' // Fallback temporal hasta implementar esta dimensión
};

/**
 * Valida prerequisitos pedagógicos antes de evaluar
 * @returns {object} { valido: boolean, faltantes: string[], dimension: string }
 */
function validarPrerequisitos(dimension, completeAnalysis) {
  const prerequisitos = {
    comprension_analitica: {
      requiere: ['prelecture']
    },
    acd: {
      requiere: ['prelecture', 'critical_analysis']
    },
    contextualizacion: {
      requiere: ['prelecture']
    },
    argumentacion: {
      requiere: ['prelecture']
    },
    metacognicion_etica_ia: {
      requiere: []
    }
  };

  const reqs = prerequisitos[dimension];
  if (!reqs || !reqs.requiere.length) {
    return { valido: true, faltantes: [], dimension };
  }

  const faltantes = [];
  for (const req of reqs.requiere) {
    if (!completeAnalysis?.[req]) {
      faltantes.push(req);
    }
  }

  return { 
    valido: faltantes.length === 0, 
    faltantes,
    dimension 
  };
}

/**
 * Genera pregunta contextualizada basada en el análisis del texto
 * usando DeepSeek (rápido y económico)
 */
async function generarPregunta({ texto, completeAnalysis, dimension, nivelDificultad = 'intermedio', onProgress }) {
  console.log(`📝 [EvaluacionIntegral] Generando pregunta para dimensión: ${dimension}`);

  // Emitir progreso: inicio
  if (onProgress) {
    onProgress({ step: 'generating', progress: 0 });
  }

  // ✅ Validar prerequisitos pedagógicos
  const validacion = validarPrerequisitos(dimension, completeAnalysis);
  if (!validacion.valido) {
    // Retornar objeto con info de prerequisitos en lugar de throw error
    return {
      needsPrerequisites: true,
      ...validacion
    };
  }

  // Convertir ID de dimensión al formato de rúbrica
  const rubricaId = DIMENSION_MAP[dimension];
  if (!rubricaId) {
    throw new Error(`Dimensión no mapeada: ${dimension}`);
  }

  const rubricDimension = getDimension(rubricaId);
  
  if (!rubricDimension) {
    throw new Error(`Dimensión no encontrada en rúbrica: ${rubricaId} (desde ${dimension})`);
  }

  // Construir contexto del análisis
  const contextoAnalisis = construirContextoAnalisis(completeAnalysis, dimension);
  
  const prompt = `Eres un evaluador experto en literacidad crítica.

DIMENSIÓN A EVALUAR: ${rubricDimension.nombre}
DESCRIPCIÓN: ${rubricDimension.descripcion}

TEXTO ORIGINAL (extracto):
"""
${texto.substring(0, 1500)}...
"""

${contextoAnalisis}

TAREA: Genera UNA pregunta de nivel ${nivelDificultad} que evalúe la dimensión "${rubricDimension.nombre}".

CRITERIOS DE LA PREGUNTA:
${rubricDimension.criterios?.map((c, idx) => `${idx + 1}. ${c.nombre}: ${c.descripcion}`).join('\n') || ''}

PREGUNTAS GUÍA DE LA RÚBRICA:
${rubricDimension.preguntasGuia?.map((p, idx) => `${idx + 1}. ${p}`).join('\n') || ''}

IMPORTANTE:
- La pregunta debe ser específica al texto (usar ejemplos concretos del análisis)
- Debe requerir pensamiento crítico, no solo recordar información
- Debe permitir evaluar uno o más criterios de la rúbrica
- Nivel ${nivelDificultad}: ${{
  basico: 'Identificar elementos básicos',
  intermedio: 'Analizar relaciones y patrones',
  avanzado: 'Evaluar críticamente y sintetizar'
}[nivelDificultad]}

Responde SOLO con la pregunta (sin numeración, sin "Pregunta:", solo el texto de la pregunta).`;

  try {
    const response = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300, // ⬆️ Aumentado para preguntas complejas
      timeoutMs: 30000 // ⬆️ Aumentado para evitar timeouts (30s)
    });

    const pregunta = extractContent(response).trim();
    
    console.log(`✅ Pregunta generada: ${pregunta.substring(0, 80)}...`);
    
    if (onProgress) {
      onProgress({ step: 'completed', progress: 100 });
    }
    
    return {
      pregunta,
      dimension,
      dimensionLabel: rubricDimension.nombre,
      nivelDificultad,
      contextoUsado: contextoAnalisis.substring(0, 200)
    };
    
  } catch (error) {
    console.error('❌ Error generando pregunta:', error);
    throw new Error(`Error generando pregunta: ${error.message}`);
  }
}

/**
 * Construye contexto del análisis según la dimensión
 */
function construirContextoAnalisis(completeAnalysis, dimension) {
  if (!completeAnalysis) return '';

  const contextos = {
    comprension_analitica: () => {
      const prelecture = completeAnalysis?.prelecture; // ✅ Encadenamiento opcional
      if (!prelecture) return '';
      
      return `
ANÁLISIS DISPONIBLE DEL TEXTO:
- Género: ${prelecture.metadata?.genero_textual || 'No identificado'}
- Propósito: ${prelecture.metadata?.proposito_comunicativo || 'No identificado'}
- Tesis central: ${prelecture.argumentation?.tesis_central || 'No identificada'}
- Tipo de argumentación: ${prelecture.argumentation?.tipo_argumentacion || 'No identificado'}
`;
    },
    
    acd: () => {
      const critical = completeAnalysis?.critical_analysis; // ✅ Encadenamiento opcional
      if (!critical) return '';
      
      return `
ANÁLISIS IDEOLÓGICO-DISCURSIVO DISPONIBLE:
- Marcos ideológicos detectados: ${critical.marcos_ideologicos?.map(m => m.nombre).join(', ') || 'Ninguno'}
- Estrategias retóricas identificadas: ${critical.estrategias_retoricas?.map(e => e.tipo).join(', ') || 'Ninguna'}
- Voces presentes: ${critical.voces?.presentes?.join(', ') || 'No identificadas'}
- Voces silenciadas: ${critical.voces?.ausentes?.join(', ') || 'No identificadas'}
`;
    },
    
    contextualizacion: () => {
      const prelecture = completeAnalysis?.prelecture; // ✅ Encadenamiento opcional
      if (!prelecture) return '';
      
      return `
CONTEXTUALIZACIÓN DISPONIBLE:
- Autor: ${prelecture.metadata?.autor || 'No identificado'}
- Fecha: ${prelecture.metadata?.fecha_texto || 'No identificada'}
- Género textual: ${prelecture.metadata?.genero_textual || 'No identificado'}
- Fuentes web consultadas: ${prelecture.web_sources?.length || 0}
`;
    },
    
    argumentacion: () => {
      const prelecture = completeAnalysis?.prelecture; // ✅ Encadenamiento opcional
      if (!prelecture?.argumentation) return '';
      
      return `
ESTRUCTURA ARGUMENTATIVA DEL TEXTO:
- Tesis: ${prelecture.argumentation.tesis_central || 'No identificada'}
- Argumentos principales: ${prelecture.argumentation.argumentos_principales?.length || 0}
- Tipo de razonamiento: ${prelecture.argumentation.tipo_razonamiento || 'No identificado'}
`;
    },
    
    metacognicion_etica_ia: () => {
      return `
DIMENSIÓN METACOGNITIVA:
Esta pregunta evaluará tu reflexión sobre el uso ético de IA en tu proceso de aprendizaje.
`;
    }
  };

  const construirContexto = contextos[dimension];
  return construirContexto ? construirContexto() : '';
}

/**
 * Evalúa respuesta del estudiante con dual AI
 */
async function evaluarRespuesta({ texto, pregunta, respuesta, dimension, onProgress }) {
  console.log(`📊 [EvaluacionIntegral] Evaluando respuesta para dimensión: ${dimension}`);

  // ✅ Validación server-side de longitud
  if (!respuesta || respuesta.trim().length < 50) {
    throw new Error('La respuesta debe tener al menos 50 caracteres');
  }
  
  if (respuesta.length > 2000) {
    throw new Error('La respuesta no debe exceder 2000 caracteres');
  }

  const startTime = Date.now();
  let tokensUsados = { deepseek: 0, openai: 0 }; // ✅ Tracking de tokens

  try {
    // Emitir progreso: inicio
    if (onProgress) {
      onProgress({ step: 'submitting', progress: 0 });
    }

    // FASE 1: Evaluación estructural con DeepSeek
    if (onProgress) {
      onProgress({ step: 'evaluating_structure', progress: 25 });
    }
    const deepseekResult = await evaluarConDeepSeek({ texto, pregunta, respuesta, dimension });
    tokensUsados.deepseek = deepseekResult.usage?.total_tokens || 0; // ✅ Capturar uso

    // FASE 2: Evaluación de profundidad con OpenAI
    if (onProgress) {
      onProgress({ step: 'evaluating_depth', progress: 50 });
    }
    const openaiResult = await evaluarConOpenAI({ texto, pregunta, respuesta, dimension, deepseekResult });
    tokensUsados.openai = openaiResult.usage?.total_tokens || 0; // ✅ Capturar uso

    // FASE 3: Combinar resultados
    if (onProgress) {
      onProgress({ step: 'combining', progress: 90 });
    }
    const evaluacionFinal = combinarEvaluaciones(deepseekResult, openaiResult, dimension);

    console.log(`✅ Evaluación completada en ${Date.now() - startTime}ms`);
    console.log(`📊 Score: ${evaluacionFinal.score}/10, Nivel: ${evaluacionFinal.nivel}/4`);
    console.log(`💰 Tokens usados - DeepSeek: ${tokensUsados.deepseek}, OpenAI: ${tokensUsados.openai}, Total: ${tokensUsados.deepseek + tokensUsados.openai}`);

    if (onProgress) {
      onProgress({ step: 'completed', progress: 100 });
    }

    return evaluacionFinal;

  } catch (error) {
    console.error('❌ Error evaluando respuesta:', error);
    throw error;
  }
}

/**
 * Limpia respuesta JSON de marcadores markdown (MEJORADO)
 */
function cleanJsonResponse(text) {
  if (!text) return text;
  
  // 1. Eliminar bloques de código markdown (```json ... ```)
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // 2. Buscar el JSON válido dentro del texto (entre { y })
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // 3. Eliminar texto antes del primer {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }
  
  // 4. Eliminar texto después del último }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }
  
  // 5. Eliminar espacios en blanco al inicio y final
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Evaluación con DeepSeek (validación estructural)
 */
async function evaluarConDeepSeek({ texto, pregunta, respuesta, dimension }) {
  const rubricaId = DIMENSION_MAP[dimension] || dimension;
  const rubricDimension = getDimension(rubricaId);

  const prompt = `Eres un evaluador experto en literacidad crítica.

DIMENSIÓN: ${rubricDimension.nombre}

PREGUNTA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
${respuesta}

TEXTO ORIGINAL (extracto):
${texto.substring(0, 1000)}...

TAREA: Evalúa la ESTRUCTURA Y CLARIDAD de la respuesta según estos criterios:

1. **Claridad**: ¿La respuesta es clara y coherente?
2. **Anclaje textual**: ¿Usa evidencias del texto?
3. **Completitud**: ¿Responde directamente a la pregunta?
4. **Extensión**: ¿Es suficientemente desarrollada?

Responde SOLO con JSON:
{
  "claridad": 1-4,
  "anclaje_textual": 1-4,
  "completitud": 1-4,
  "extension_adecuada": true/false,
  "evidencias_encontradas": ["evidencia 1", "evidencia 2"],
  "fortalezas_estructurales": ["fortaleza 1"],
  "mejoras_estructurales": ["mejora 1"]
}`;

  const response = await chatCompletion({
    provider: 'deepseek',
    model: DEEPSEEK_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: 'json_object' },
    timeoutMs: 30000
  });

  try {
    const rawContent = extractContent(response);
    console.log('🔍 [DeepSeek] Respuesta cruda:', rawContent.substring(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [DeepSeek] Respuesta limpia:', cleanedContent.substring(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar que tiene los campos esperados
    if (!parsed.claridad || !parsed.anclaje_textual || !parsed.completitud) {
      throw new Error('Respuesta JSON incompleta de DeepSeek');
    }
    
    return parsed;
  } catch (parseError) {
    console.error('❌ [DeepSeek] Error parseando JSON:', parseError.message);
    console.error('📄 [DeepSeek] Contenido recibido:', extractContent(response));
    
    // Fallback: retornar estructura básica válida
    return {
      claridad: 3,
      anclaje_textual: 3,
      completitud: 3,
      extension_adecuada: true,
      evidencias_encontradas: ['Respuesta analizada manualmente'],
      fortalezas_estructurales: ['Estructura básica presente'],
      mejoras_estructurales: ['Error en evaluación automática, revisar manualmente'],
      _error: parseError.message
    };
  }
}

/**
 * Evaluación con OpenAI (profundidad crítica)
 */
async function evaluarConOpenAI({ texto, pregunta, respuesta, dimension, deepseekResult }) {
  const rubricaId = DIMENSION_MAP[dimension] || dimension;
  const rubricDimension = getDimension(rubricaId);

  const prompt = `Eres un evaluador experto en pensamiento crítico y literacidad crítica.

DIMENSIÓN: ${rubricDimension.nombre}

PREGUNTA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
${respuesta}

EVALUACIÓN ESTRUCTURAL PREVIA:
${JSON.stringify(deepseekResult, null, 2)}

TAREA: Evalúa la PROFUNDIDAD CRÍTICA de la respuesta. No repitas la evaluación estructural.

Enfócate en:
1. **Pensamiento crítico**: ¿Demuestra análisis profundo?
2. **Comprensión de la dimensión**: ¿Entiende los conceptos clave de "${rubricDimension.nombre}"?
3. **Originalidad**: ¿Va más allá de lo obvio?
4. **Conexiones**: ¿Conecta ideas de forma sofisticada?

NIVELES DE PROFUNDIDAD:
- Nivel 1: Respuesta superficial, sin análisis
- Nivel 2: Análisis básico pero limitado
- Nivel 3: Análisis sólido con conexiones claras
- Nivel 4: Análisis profundo, original, perspicaz

Responde SOLO con JSON:
{
  "profundidad_critica": 1-4,
  "comprension_dimension": 1-4,
  "originalidad": 1-4,
  "comentario_critico": "Análisis breve",
  "fortalezas_criticas": ["fortaleza 1"],
  "oportunidades_profundizacion": ["sugerencia 1"]
}`;

  const response = await chatCompletion({
    provider: 'openai',
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    timeoutMs: 45000
  });

  try {
    const rawContent = extractContent(response);
    console.log('🔍 [OpenAI] Respuesta cruda:', rawContent.substring(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [OpenAI] Respuesta limpia:', cleanedContent.substring(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar que tiene los campos esperados
    if (!parsed.profundidad_critica || !parsed.comprension_dimension) {
      throw new Error('Respuesta JSON incompleta de OpenAI');
    }
    
    return parsed;
  } catch (parseError) {
    console.error('❌ [OpenAI] Error parseando JSON:', parseError.message);
    console.error('📄 [OpenAI] Contenido recibido:', extractContent(response));
    
    // Fallback: retornar estructura básica válida
    return {
      profundidad_critica: 3,
      comprension_dimension: 3,
      originalidad: 3,
      comentario_critico: 'Análisis automático no disponible. Revisar respuesta manualmente.',
      fortalezas_criticas: ['Respuesta proporcionada'],
      oportunidades_profundizacion: ['Error en evaluación automática'],
      _error: parseError.message
    };
  }
}

/**
 * Combina evaluaciones de ambas IAs
 */
function combinarEvaluaciones(deepseek, openai, dimension) {
  const rubricaId = DIMENSION_MAP[dimension] || dimension;
  const rubricDimension = getDimension(rubricaId);

  // Calcular score estructural (DeepSeek)
  const scoreEstructural = (
    (deepseek.claridad || 0) +
    (deepseek.anclaje_textual || 0) +
    (deepseek.completitud || 0)
  ) / 3;

  // Calcular score de profundidad (OpenAI)
  const scoreProfundidad = (
    (openai.profundidad_critica || 0) +
    (openai.comprension_dimension || 0) +
    (openai.originalidad || 0)
  ) / 3;

  // Score final ponderado (60% estructura, 40% profundidad)
  const nivelFinal = Math.round(scoreEstructural * 0.6 + scoreProfundidad * 0.4);
  const scoreFinal = Math.round(nivelFinal * 2.5); // Convertir 1-4 a 2.5-10 (redondeado para consistencia)

  // Combinar fortalezas y mejoras
  const fortalezas = [
    ...(deepseek.fortalezas_estructurales || []),
    ...(openai.fortalezas_criticas || [])
  ];

  const mejoras = [
    ...(deepseek.mejoras_estructurales || []),
    ...(openai.oportunidades_profundizacion || [])
  ];

  return {
    dimension,
    dimensionLabel: rubricDimension?.nombre || dimension,
    score: Math.round(scoreFinal * 10) / 10,
    nivel: nivelFinal,
    scoreEstructural: Math.round(scoreEstructural * 10) / 10,
    scoreProfundidad: Math.round(scoreProfundidad * 10) / 10,
    fortalezas,
    mejoras,
    evidencias: deepseek.evidencias_encontradas || [],
    comentarioCritico: openai.comentario_critico || '',
    detalles: {
      claridad: deepseek.claridad,
      anclaje: deepseek.anclaje_textual,
      completitud: deepseek.completitud,
      profundidad: openai.profundidad_critica,
      comprension: openai.comprension_dimension,
      originalidad: openai.originalidad
    }
  };
}

/**
 * Sugiere artefactos a revisitar basándose en debilidades
 */
function sugerirArtefactos(evaluacion, rubricProgress) {
  const sugerencias = [];

  const ARTEFACTOS = {
    comprension_analitica: {
      icono: '📚',
      nombre: 'Resumen Académico',
      seccion: 'resumen',
      descripcion: 'Practica identificar las ideas centrales y citar evidencias textuales'
    },
    acd: {
      icono: '🔍',
      nombre: 'Tabla de Análisis Crítico del Discurso',
      seccion: 'tabla-acd',
      descripcion: 'Profundiza en marcos ideológicos y estrategias retóricas'
    },
    contextualizacion: {
      icono: '🗺️',
      nombre: 'Mapa de Actores y Consecuencias',
      seccion: 'mapa-actores',
      descripcion: 'Sitúa el texto en su contexto socio-histórico'
    },
    argumentacion: {
      icono: '💭',
      nombre: 'Respuesta Argumentativa',
      seccion: 'respuesta-argumentativa',
      descripcion: 'Construye argumentos sólidos con evidencias y contraargumentos'
    },
    metacognicion_etica_ia: {
      icono: '🤖',
      nombre: 'Bitácora Ética de IA',
      seccion: 'bitacora-etica',
      descripcion: 'Reflexiona sobre tu uso ético de herramientas de IA'
    }
  };

  // Si score bajo en esta dimensión, sugerir su artefacto
  if (evaluacion.score < 6 && ARTEFACTOS[evaluacion.dimension]) {
    sugerencias.push({
      ...ARTEFACTOS[evaluacion.dimension],
      razon: `Tu puntuación en ${evaluacion.dimensionLabel} fue ${evaluacion.score}/10. Este artefacto te ayudará a fortalecerla.`
    });
  }

  // Sugerir artefactos de dimensiones con bajo promedio en rubricProgress
  if (rubricProgress) {
    Object.entries(rubricProgress).forEach(([rubricId, data]) => {
      // Validar que data existe y tiene la estructura correcta
      if (data && typeof data === 'object' && data.average > 0 && data.average < 6) {
        const dimensionKey = Object.keys(DIMENSION_MAP).find(k => DIMENSION_MAP[k] === rubricId);
        if (dimensionKey && ARTEFACTOS[dimensionKey] && dimensionKey !== evaluacion.dimension) {
          sugerencias.push({
            ...ARTEFACTOS[dimensionKey],
            razon: `Tu promedio en ${ARTEFACTOS[dimensionKey].nombre} es ${data.average}/10.`
          });
        }
      }
    });
  }

  return sugerencias.slice(0, 2); // Máximo 2 sugerencias
}

export { generarPregunta, evaluarRespuesta, sugerirArtefactos, validarPrerequisitos, DIMENSION_MAP };



