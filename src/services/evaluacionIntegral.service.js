// src/services/evaluacionIntegral.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension } from '../pedagogy/rubrics/criticalLiteracyRubric';

import logger from '../utils/logger';
const OPENAI_MODEL = 'gpt-4o-mini';

function isAiAuthOrConfigError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('401') ||
    msg.includes('incorrect api key') ||
    msg.includes('falta api key') ||
    msg.includes('unauthorized');
}

function buildFallbackPregunta({ rubricDimension, nivelDificultad, dimension }) {
  const guia = rubricDimension?.preguntasGuia?.[0];
  if (guia) return guia;

  const nombre = rubricDimension?.nombre || dimension;
  const porNivel = {
    basico: `¿Qué evidencia del texto te ayuda a analizar la dimensión ${nombre}?`,
    intermedio: `¿Qué relación puedes establecer entre una evidencia del texto y la dimensión ${nombre}?`,
    avanzado: `¿Qué tensión o contradicción detectas en el texto al evaluar la dimensión ${nombre}?`
  };
  return porNivel[nivelDificultad] || porNivel.intermedio;
}

function buildFallbackDesafioCruzado({ dimA, dimB }) {
  return `¿Cómo se relacionan ${dimA?.nombre || 'la primera dimensión'} y ${dimB?.nombre || 'la segunda dimensión'} para sostener (o cuestionar) el sentido principal del texto?`;
}

function getClientOpenAIApiKey() {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;

  try {
    const direct = window.localStorage.getItem('openai_api_key');
    if (direct && direct.trim()) return direct.trim();

    // Compatibilidad con keys scopeadas por usuario: openai_api_key:<uid>
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('openai_api_key:')) {
        const scoped = window.localStorage.getItem(key);
        if (scoped && scoped.trim()) return scoped.trim();
      }
    }
  } catch (err) {
    logger.warn('⚠️ No se pudo leer openai_api_key desde localStorage', err);
  }

  return undefined;
}

const BIAS_SAFETY_RULES = `
EQUIDAD Y NO DISCRIMINACIÓN (OBLIGATORIO):
- No uses estereotipos, lenguaje racista/sexista ni generalizaciones sobre grupos.
- No hagas suposiciones sobre identidad (raza/etnia, género, nacionalidad, religión, orientación sexual, discapacidad, clase social).
- Evita eurocentrismo: reconoce pluralidad cultural y contextual; no asumas una perspectiva única como norma.
- Si el texto o la respuesta contienen discriminación, analízala críticamente y con cuidado, sin validarla ni amplificarla.
- No repitas insultos o slurs textualmente en la salida; usa referencias indirectas ("insulto racista", "insulto homofóbico") o redacción suavizada.
- Evalúa el razonamiento y el anclaje textual; no penalices dialectos o variedades del español.
`;

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
 */
async function generarPregunta({ texto, completeAnalysis, dimension, nivelDificultad = 'intermedio', onProgress, skipPrerequisitos = false }) {
  logger.log(`📝 [EvaluacionIntegral] Generando pregunta para dimensión: ${dimension}`);

  // Emitir progreso: inicio
  if (onProgress) {
    onProgress({ step: 'generating', progress: 0 });
  }

  // ✅ Validar prerequisitos pedagógicos
  const validacion = validarPrerequisitos(dimension, completeAnalysis);
  if (!skipPrerequisitos && !validacion.valido) {
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

${BIAS_SAFETY_RULES}

TAREA: Genera UNA pregunta REFLEXIVA de nivel ${nivelDificultad} que evalúe la dimensión "${rubricDimension.nombre}".

CRITERIOS DE LA PREGUNTA:
${rubricDimension.criterios?.map((c, idx) => `${idx + 1}. ${c.nombre}: ${c.descripcion}`).join('\n') || ''}

PREGUNTAS GUÍA DE LA RÚBRICA:
${rubricDimension.preguntasGuia?.map((p, idx) => `${idx + 1}. ${p}`).join('\n') || ''}

IMPORTANTE - ESTILO DE PREGUNTA:
- Debe ser BREVE y promover reflexión, no requerir ensayos largos
- El estudiante debe poder responder en 1-3 oraciones (30-150 palabras)
- Tipos válidos de pregunta según nivel:
  · Literal: "¿Qué dice el texto sobre X?" / "¿Cuál es la postura del autor?"
  · Inferencial: "¿Qué implica que el autor use X estrategia?" / "¿Qué voz está ausente?"
  · Crítica: "¿Cuál sería un contraargumento válido?" / "¿Qué sesgo detectas?"
  · Metacognitiva: "¿Cómo cambió tu perspectiva al leer esto?"
- La pregunta debe ser específica al texto (usar ejemplos concretos del análisis)
- NO pidas "explica detalladamente" ni "desarrolla un análisis completo"
- Nivel ${nivelDificultad}: ${{
  basico: 'Identificar elementos básicos',
  intermedio: 'Analizar relaciones y patrones',
  avanzado: 'Evaluar críticamente y sintetizar'
}[nivelDificultad]}

Responde SOLO con la pregunta (sin numeración, sin "Pregunta:", solo el texto de la pregunta).`;

  try {
    const apiKey = getClientOpenAIApiKey();
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300, // ⬆️ Aumentado para preguntas complejas
      timeoutMs: 30000 // ⬆️ Aumentado para evitar timeouts (30s)
    });

    const pregunta = extractContent(response).trim();
    
    logger.log(`✅ Pregunta generada: ${pregunta.substring(0, 80)}...`);
    
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
    // ✅ Fallback local: no bloquear práctica por credenciales de proveedor
    if (isAiAuthOrConfigError(error)) {
      logger.warn('⚠️ Error de autenticación/configuración IA al generar pregunta. Aplicando fallback local.');
      const preguntaFallback = buildFallbackPregunta({ rubricDimension, nivelDificultad, dimension });

      if (onProgress) {
        onProgress({ step: 'completed', progress: 100 });
      }

      return {
        pregunta: preguntaFallback,
        dimension,
        dimensionLabel: rubricDimension.nombre,
        nivelDificultad,
        contextoUsado: contextoAnalisis.substring(0, 200),
        isFallback: true
      };
    }

    logger.error('❌ Error generando pregunta:', error);
    throw new Error(`Error generando pregunta: ${error.message}`);
  }
}

function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function normalizeHintsArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * Genera hints progresivos relacionados con una pregunta concreta.
 * Objetivo: apoyo no evaluativo, sin revelar respuesta.
 */
async function generarHintsParaPregunta({
  texto,
  completeAnalysis,
  dimension,
  pregunta,
  nivelDificultad = 'intermedio',
  count = 5,
  onProgress,
  skipPrerequisitos = false
}) {
  if (!texto || !pregunta || !dimension) {
    return { hints: [], dimension };
  }

  if (onProgress) {
    onProgress({ step: 'generating-hints', progress: 0 });
  }

  const validacion = validarPrerequisitos(dimension, completeAnalysis);
  if (!skipPrerequisitos && !validacion.valido) {
    return { hints: [], dimension, needsPrerequisites: true, ...validacion };
  }

  const rubricaId = DIMENSION_MAP[dimension];
  const rubricDimension = rubricaId ? getDimension(rubricaId) : null;
  const contextoAnalisis = construirContextoAnalisis(completeAnalysis, dimension);

  const safeCount = Math.max(3, Math.min(8, Number(count) || 5));
  const prompt = `Eres un tutor claro y amable. Tu trabajo es dar pistas (hints) para ayudar a responder una pregunta, sin evaluar ni dar la respuesta.

DIMENSIÓN: ${rubricDimension?.nombre || dimension}
NIVEL: ${nivelDificultad}

PREGUNTA:
"""
${pregunta}
"""

TEXTO (extracto):
"""
${texto.substring(0, 1200)}...
"""

${contextoAnalisis ? `CONTEXTO DE ANÁLISIS DISPONIBLE:\n${contextoAnalisis}` : ''}

${BIAS_SAFETY_RULES}

INSTRUCCIONES:
- Genera ${safeCount} hints PROGRESIVOS (de más general a más específico).
- Cada hint debe estar directamente relacionado con la pregunta: incluye al menos una palabra o frase corta tomada de la pregunta.
- No reveles una respuesta completa ni redactes un párrafo final; solo pistas.
- Si sugieres usar evidencia textual, indica qué tipo de fragmento buscar, sin inventar citas.

Responde SOLO con un JSON válido: un array de strings.
Ejemplo: ["hint 1", "hint 2", "hint 3"]`;

  try {
    const apiKey = getClientOpenAIApiKey();
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 450,
      timeoutMs: 30000
    });

    const content = extractContent(response).trim();
    const jsonCandidate = extractJsonArray(content) || content;

    let parsed;
    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      parsed = null;
    }

    const hints = normalizeHintsArray(parsed);

    if (onProgress) {
      onProgress({ step: 'completed', progress: 100 });
    }

    return { hints, dimension, dimensionLabel: rubricDimension?.nombre || dimension };
  } catch (error) {
    if (isAiAuthOrConfigError(error)) {
      logger.warn('⚠️ Error de autenticación/configuración IA al generar hints. Aplicando fallback local.');
      const hintsFallback = [
        'Identifica una frase del texto que se relacione directamente con la pregunta.',
        'Distingue qué afirma explícitamente el autor y qué estás infiriendo tú.',
        'Conecta tu respuesta con una evidencia breve del texto (palabra, idea o cita corta).'
      ];
      return { hints: hintsFallback, dimension, dimensionLabel: rubricDimension?.nombre || dimension, isFallback: true };
    }

    logger.error('❌ Error generando hints:', error);
    return { hints: [], dimension, error: error?.message || String(error) };
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
  logger.log(`📊 [EvaluacionIntegral] Evaluando respuesta para dimensión: ${dimension}`);

  // ✅ Validación server-side de longitud
  if (!respuesta || respuesta.trim().length < 30) {
    throw new Error('La respuesta debe tener al menos 30 caracteres');
  }
  
  if (respuesta.length > 2000) {
    throw new Error('La respuesta no debe exceder 2000 caracteres');
  }

  const startTime = Date.now();
  let tokensUsados = { estructural: 0, profundidad: 0 }; // ✅ Tracking de tokens

  try {
    // Emitir progreso: inicio
    if (onProgress) {
      onProgress({ step: 'submitting', progress: 0 });
    }

    // FASE 1: Evaluación estructural
    if (onProgress) {
      onProgress({ step: 'evaluating_structure', progress: 25 });
    }
    const estructuralResult = await evaluarEstructural({ texto, pregunta, respuesta, dimension });
    tokensUsados.estructural = estructuralResult.usage?.total_tokens || 0; // ✅ Capturar uso

    // FASE 2: Evaluación de profundidad crítica
    if (onProgress) {
      onProgress({ step: 'evaluating_depth', progress: 50 });
    }
    const profundidadResult = await evaluarProfundidad({ texto, pregunta, respuesta, dimension, estructuralResult });
    tokensUsados.profundidad = profundidadResult.usage?.total_tokens || 0; // ✅ Capturar uso

    // FASE 3: Combinar resultados
    if (onProgress) {
      onProgress({ step: 'combining', progress: 90 });
    }
    const evaluacionFinal = combinarEvaluaciones(estructuralResult, profundidadResult, dimension);

    logger.log(`✅ Evaluación completada en ${Date.now() - startTime}ms`);
    logger.log(`📊 Score: ${evaluacionFinal.score}/10, Nivel: ${evaluacionFinal.nivel}/4`);
    logger.log(`💰 Tokens usados - Estructural: ${tokensUsados.estructural}, Profundidad: ${tokensUsados.profundidad}, Total: ${tokensUsados.estructural + tokensUsados.profundidad}`);

    if (onProgress) {
      onProgress({ step: 'completed', progress: 100 });
    }

    return evaluacionFinal;

  } catch (error) {
    // ✅ Fallback: si falla por autenticación/configuración, devolver evaluación básica
    if (isAiAuthOrConfigError(error)) {
      logger.warn('⚠️ Error de autenticación/configuración IA al evaluar respuesta. Aplicando fallback local.');

      if (onProgress) {
        onProgress({ step: 'completed', progress: 100 });
      }

      const rubricaId = DIMENSION_MAP[dimension] || dimension;
      const rubricDimension = getDimension(rubricaId);

      return {
        dimension,
        dimensionLabel: rubricDimension?.nombre || dimension,
        score: 5,
        nivel: 2,
        scoreEstructural: 2.5,
        scoreProfundidad: 2.5,
        fortalezas: ['Respuesta proporcionada — no fue posible evaluarla con IA'],
        mejoras: ['Revisa tu API key de OpenAI para obtener evaluaciones detalladas'],
        evidencias: [],
        comentarioCritico: 'La evaluación automática no está disponible en este momento. Tu respuesta ha sido registrada con una puntuación provisional.',
        detalles: {
          claridad: 2, anclaje: 2, completitud: 2,
          profundidad: 2, comprension: 2, originalidad: 2
        },
        isFallback: true
      };
    }

    logger.error('❌ Error evaluando respuesta:', error);
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
 * Evaluación estructural (claridad, anclaje textual, completitud)
 */
async function evaluarEstructural({ texto, pregunta, respuesta, dimension }) {
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

${BIAS_SAFETY_RULES}

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

  const apiKey = getClientOpenAIApiKey();
  const response = await chatCompletion({
    provider: 'openai',
    model: OPENAI_MODEL,
    apiKey,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: 'json_object' },
    timeoutMs: 30000
  });

  try {
    const rawContent = extractContent(response);
    logger.log('🔍 [Estructural] Respuesta cruda:', rawContent.substring(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    logger.log('✅ [Estructural] Respuesta limpia:', cleanedContent.substring(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar que tiene los campos esperados
    if (!parsed.claridad || !parsed.anclaje_textual || !parsed.completitud) {
      throw new Error('Respuesta JSON incompleta de evaluación estructural');
    }
    
    return parsed;
  } catch (parseError) {
    logger.error('❌ [Estructural] Error parseando JSON:', parseError.message);
    logger.error('📄 [Estructural] Contenido recibido:', extractContent(response));
    
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
 * Evaluación de profundidad crítica
 */
async function evaluarProfundidad({ texto: _texto, pregunta, respuesta, dimension, estructuralResult }) {
  const rubricaId = DIMENSION_MAP[dimension] || dimension;
  const rubricDimension = getDimension(rubricaId);

  const prompt = `Eres un evaluador experto en pensamiento crítico y literacidad crítica.

DIMENSIÓN: ${rubricDimension.nombre}

PREGUNTA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
${respuesta}

EVALUACIÓN ESTRUCTURAL PREVIA:
${JSON.stringify(estructuralResult, null, 2)}

${BIAS_SAFETY_RULES}

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

  const apiKey = getClientOpenAIApiKey();
  const response = await chatCompletion({
    provider: 'openai',
    model: OPENAI_MODEL,
    apiKey,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    timeoutMs: 45000
  });

  try {
    const rawContent = extractContent(response);
    logger.log('🔍 [Profundidad] Respuesta cruda:', rawContent.substring(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    logger.log('✅ [Profundidad] Respuesta limpia:', cleanedContent.substring(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar que tiene los campos esperados
    if (!parsed.profundidad_critica || !parsed.comprension_dimension) {
      throw new Error('Respuesta JSON incompleta de evaluación de profundidad');
    }
    
    return parsed;
  } catch (parseError) {
    logger.error('❌ [Profundidad] Error parseando JSON:', parseError.message);
    logger.error('📄 [Profundidad] Contenido recibido:', extractContent(response));
    
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
 * Combina evaluaciones de ambas fases
 */
function combinarEvaluaciones(estructural, profundidad, dimension) {
  const rubricaId = DIMENSION_MAP[dimension] || dimension;
  const rubricDimension = getDimension(rubricaId);

  // Calcular score estructural
  const scoreEstructural = (
    (estructural.claridad || 0) +
    (estructural.anclaje_textual || 0) +
    (estructural.completitud || 0)
  ) / 3;

  // Calcular score de profundidad
  const scoreProfundidad = (
    (profundidad.profundidad_critica || 0) +
    (profundidad.comprension_dimension || 0) +
    (profundidad.originalidad || 0)
  ) / 3;

  // Score final ponderado (60% estructura, 40% profundidad)
  const nivelFinal = Math.round(scoreEstructural * 0.6 + scoreProfundidad * 0.4);
  const scoreFinal = Math.round(nivelFinal * 2.5); // Convertir 1-4 a 2.5-10 (redondeado para consistencia)

  // Combinar fortalezas y mejoras
  const fortalezas = [
    ...(estructural.fortalezas_estructurales || []),
    ...(profundidad.fortalezas_criticas || [])
  ];

  const mejoras = [
    ...(estructural.mejoras_estructurales || []),
    ...(profundidad.oportunidades_profundizacion || [])
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
    evidencias: estructural.evidencias_encontradas || [],
    comentarioCritico: profundidad.comentario_critico || '',
    detalles: {
      claridad: estructural.claridad,
      anclaje: estructural.anclaje_textual,
      completitud: estructural.completitud,
      profundidad: profundidad.profundidad_critica,
      comprension: profundidad.comprension_dimension,
      originalidad: profundidad.originalidad
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

/**
 * Genera un desafío cruzado que combina dos dimensiones en una pregunta reflexiva.
 * Promueve transferencia lateral y pensamiento integrador.
 */
async function generarDesafioCruzado({ texto, completeAnalysis, dimensionA, dimensionB, nivelDificultad = 'intermedio', onProgress }) {
  logger.log(`⚡ [EvaluacionIntegral] Generando desafío cruzado: ${dimensionA} × ${dimensionB}`);

  if (onProgress) onProgress({ step: 'generating', progress: 0 });

  const rubricaIdA = DIMENSION_MAP[dimensionA];
  const rubricaIdB = DIMENSION_MAP[dimensionB];
  const dimA = rubricaIdA ? getDimension(rubricaIdA) : null;
  const dimB = rubricaIdB ? getDimension(rubricaIdB) : null;

  if (!dimA || !dimB) {
    throw new Error(`Dimensiones no encontradas: ${dimensionA}, ${dimensionB}`);
  }

  const contextoA = construirContextoAnalisis(completeAnalysis, dimensionA);
  const contextoB = construirContextoAnalisis(completeAnalysis, dimensionB);

  const prompt = `Eres un evaluador experto en literacidad crítica.

DESAFÍO CRUZADO: Combina DOS dimensiones en UNA pregunta reflexiva.

DIMENSIÓN A: ${dimA.nombre}
DIMENSIÓN B: ${dimB.nombre}

TEXTO (extracto):
"""
${texto.substring(0, 1200)}...
"""

${contextoA}
${contextoB}

${BIAS_SAFETY_RULES}

TAREA: Genera UNA pregunta reflexiva de nivel ${nivelDificultad} que INTEGRE ambas dimensiones.

EJEMPLOS del tipo de pregunta esperada:
- "${dimA.nombre} + ${dimB.nombre}": "¿Cómo influye [elemento de dim A] en [aspecto de dim B] dentro de este texto?"
- Pregunta que requiera conectar conceptos de ambas dimensiones.

REGLAS:
- La respuesta esperada debe ser BREVE (1-3 oraciones, 30-150 palabras).
- No pidas "desarrolla" ni "explica detalladamente".
- La pregunta debe ser específica al texto analizado.
- Debe ser más desafiante que una pregunta de dimensión única.

Responde SOLO con la pregunta (sin numeración, sin "Pregunta:", solo el texto).`;

  try {
    const apiKey = getClientOpenAIApiKey();
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      apiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 300,
      timeoutMs: 30000
    });

    const pregunta = extractContent(response).trim();
    logger.log(`✅ Desafío cruzado generado: ${pregunta.substring(0, 80)}...`);

    if (onProgress) onProgress({ step: 'completed', progress: 100 });

    return {
      pregunta,
      isCrossChallenge: true,
      dimensions: [dimensionA, dimensionB],
      dimensionLabels: [dimA.nombre, dimB.nombre],
      nivelDificultad
    };
  } catch (error) {
    // ✅ Fallback local: mantener funcionalidad aun sin API key válida
    if (isAiAuthOrConfigError(error)) {
      logger.warn('⚠️ Error de autenticación/configuración IA al generar desafío cruzado. Aplicando fallback local.');
      const preguntaFallback = buildFallbackDesafioCruzado({ dimA, dimB });

      if (onProgress) onProgress({ step: 'completed', progress: 100 });

      return {
        pregunta: preguntaFallback,
        isCrossChallenge: true,
        dimensions: [dimensionA, dimensionB],
        dimensionLabels: [dimA.nombre, dimB.nombre],
        nivelDificultad,
        isFallback: true
      };
    }

    logger.error('❌ Error generando desafío cruzado:', error);
    throw new Error(`Error generando desafío cruzado: ${error.message}`);
  }
}

export { generarPregunta, generarHintsParaPregunta, evaluarRespuesta, sugerirArtefactos, validarPrerequisitos, generarDesafioCruzado, DIMENSION_MAP };


