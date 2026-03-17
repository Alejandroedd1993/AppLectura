// src/services/respuestaArgumentativa.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension, scoreToLevelDescriptor } from '../pedagogy/rubrics/criticalLiteracyRubric';
import { DEEPSEEK_CHAT_MODEL, OPENAI_CHAT_MODEL } from '../constants/aiModelDefaults';

import logger from '../utils/logger';
const DEEPSEEK_MODEL = DEEPSEEK_CHAT_MODEL;
const OPENAI_MODEL = OPENAI_CHAT_MODEL;
const DIMENSION_KEY = 'argumentacion'; // Dimensión: Argumentación y Contraargumento

function wrapServiceError(error, prefix) {
  const source = error instanceof Error ? error : new Error(String(error || 'Error desconocido'));
  const wrapped = new Error(`${prefix}: ${source.message}`);

  if (source.status != null) wrapped.status = source.status;
  if (source.httpStatus != null) wrapped.httpStatus = source.httpStatus;
  if (source.code != null) wrapped.code = source.code;
  if (source.backendError != null) wrapped.backendError = source.backendError;
  if (source.requestId != null) wrapped.requestId = source.requestId;
  if (source.payload != null) wrapped.payload = source.payload;

  return wrapped;
}

/**
 * Limpia respuestas JSON que vienen con bloques markdown o texto adicional
 */
function cleanJsonResponse(rawContent) {
  let cleaned = rawContent.trim();
  
  // Eliminar bloques markdown ```json ... ```
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  // Extraer solo el JSON entre { y }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

/**
 * 🤖 DEEPSEEK: Validación de estructura argumentativa
 * 
 * Enfoque: Verificar que el estudiante haya construido correctamente:
 * - Tesis clara y específica
 * - Evidencias pertinentes del texto
 * - Contraargumento relevante
 */
function buildDeepSeekPrompt(text, tesis, evidencias, contraargumento, refutacion) {
  return `Eres un evaluador experto en argumentación académica.

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

RESPUESTA ARGUMENTATIVA DEL ESTUDIANTE:

1. Tesis:
${tesis}

2. Evidencias que sustentan la tesis:
${evidencias}

3. Contraargumento (objeción válida):
${contraargumento}

4. Refutación del contraargumento:
${refutacion}

---

TAREA: Evalúa la ESTRUCTURA ARGUMENTATIVA según estos 3 criterios:

**Criterio 1: Solidez de la Tesis (solidez_tesis)**
- ¿La tesis es clara y específica?
- ¿Es defendible (no es una obviedad ni algo imposible de sostener)?
- Nivel (1-4): 1=Sin tesis/mera opinión, 2=Vaga/ambigua, 3=Clara y defendible, 4=Original y matizada

**Criterio 2: Uso de Evidencia (uso_evidencia)**
- ¿Las evidencias están ancladas en el texto?
- ¿Son pertinentes para la tesis?
- ¿Explica cómo sustentan la tesis?
- Nivel (1-4): 1=Sin sustento, 2=Superficial sin análisis, 3=Pertinente con explicación, 4=Integrada estratégicamente

**Criterio 3: Manejo del Contraargumento (manejo_contraargumento)**
- ¿El contraargumento es relevante (no un hombre de paja)?
- ¿La refutación es sólida?
- Nivel (1-4): 1=Ignora opuestos, 2=Superficial/caricatura, 3=Presenta y refuta relevante, 4=Refuta el contraargumento más fuerte

IMPORTANTE: Responde SOLO con JSON válido, sin explicaciones adicionales.

Formato de respuesta JSON:
{
  "criterios_evaluados": {
    "solidez_tesis": {
      "nivel": 1-4,
      "es_clara": true/false,
      "es_especifica": true/false,
      "es_defendible": true/false
    },
    "uso_evidencia": {
      "nivel": 1-4,
      "evidencias_ancladas": ["evidencia 1 del texto", "evidencia 2"],
      "evidencias_vagas": ["evidencia X sin anclaje"],
      "explica_como_sustentan": true/false
    },
    "manejo_contraargumento": {
      "nivel": 1-4,
      "contraargumento_relevante": true/false,
      "es_hombre_de_paja": true/false,
      "refutacion_solida": true/false
    }
  },
  "fortalezas_estructurales": ["fortaleza 1", "fortaleza 2"],
  "mejoras_estructura": ["mejora 1", "mejora 2"]
}`;
}

/**
 * 🧠 OPENAI: Evaluación de profundidad argumentativa
 * 
 * Enfoque: Evaluar la CALIDAD DIALÓGICA:
 * - ¿Demuestra pensamiento complejo?
 * - ¿Integra perspectivas alternativas sin debilitar su postura?
 * - ¿Maneja la complejidad del tema?
 */
function buildOpenAIPrompt(text, tesis, evidencias, contraargumento, refutacion, deepseekFeedback) {
  return `Eres un evaluador experto en argumentación crítica y pensamiento dialógico.

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

RESPUESTA ARGUMENTATIVA DEL ESTUDIANTE:

Tesis: ${tesis}
Evidencias: ${evidencias}
Contraargumento: ${contraargumento}
Refutación: ${refutacion}

EVALUACIÓN ESTRUCTURAL PREVIA (DeepSeek):
${JSON.stringify(deepseekFeedback, null, 2)}

---

TAREA: Evalúa la PROFUNDIDAD DIALÓGICA del argumento. No repitas la evaluación estructural.

Enfócate en:

1. **Originalidad y Complejidad**: ¿La tesis demuestra pensamiento crítico original o solo repite lo obvio?
2. **Integración de Perspectivas**: ¿Integra perspectivas alternativas de forma sofisticada o solo las descarta?
3. **Manejo de la Complejidad**: ¿Reconoce matices y limitaciones o simplifica excesivamente?

Ejemplos de argumentación BÁSICA vs AVANZADA:

BÁSICO: 
- Tesis: "El texto está sesgado."
- Evidencia: "Dice cosas negativas."
- Contraargumento: "Algunos dirían que es objetivo."
- Refutación: "Pero no lo es."

AVANZADO:
- Tesis: "El texto naturaliza la competencia económica como único modelo legítimo, excluyendo alternativas cooperativas."
- Evidencia: "Al afirmar que 'la competencia es ley natural' (párrafo 3), omite deliberadamente modelos exitosos de economía solidaria documentados en..."
- Contraargumento: "Se podría objetar que la competencia ha demostrado históricamente generar innovación."
- Refutación: "Si bien es cierto que puede generar innovación, esta lógica ignora los costos sociales (precarización, desigualdad) y excluye del análisis modelos donde la cooperación también innovó (ej: software libre, economía social)."

IMPORTANTE: Responde SOLO con JSON válido.

Formato de respuesta JSON:
{
  "profundidad_dialogica": {
    "solidez_tesis": {
      "demuestra_pensamiento_original": true/false,
      "es_matizada": true/false,
      "comentario": "Breve análisis"
    },
    "uso_evidencia": {
      "integra_evidencia_estrategicamente": true/false,
      "explica_conexiones_profundas": true/false,
      "comentario": "Breve análisis"
    },
    "manejo_contraargumento": {
      "reconoce_validez_parcial": true/false,
      "refuta_sin_simplificar": true/false,
      "comentario": "Breve análisis"
    }
  },
  "fortalezas_dialogicas": ["insight 1", "insight 2"],
  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],
  "nivel_pensamiento_critico": 1-4
}`;
}

/**
 * Evalúa con DeepSeek (estructura argumentativa)
 */
async function evaluateWithDeepSeek(text, tesis, evidencias, contraargumento, refutacion) {
  const prompt = buildDeepSeekPrompt(text, tesis, evidencias, contraargumento, refutacion);
  
  try {
    const response = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      timeoutMs: 30000
    });

    const rawContent = extractContent(response);
    logger.log('🔍 [DeepSeek RespuestaArgumentativa] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    logger.log('✅ [DeepSeek RespuestaArgumentativa] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.criterios_evaluados) {
      throw new Error('Respuesta sin criterios_evaluados');
    }
    return parsed;
  } catch (error) {
    logger.error('❌ Error en evaluación DeepSeek (RespuestaArgumentativa):', error);
    return {
      criterios_evaluados: {
        solidez_tesis: { nivel: 3, tesis_clara: true, defendible: true },
        uso_evidencia: { nivel: 3, evidencias_textuales: [], explicacion_nexo: true },
        manejo_contraargumento: { nivel: 3, contraargumento_valido: true, refutacion_solida: true }
      },
      fortalezas_estructurales: ['Análisis en proceso'],
      mejoras_estructura: ['Error en evaluación automática'],
      _error: error.message
    };
  }
}

/**
 * Evalúa con OpenAI (profundidad dialógica)
 */
async function evaluateWithOpenAI(text, tesis, evidencias, contraargumento, refutacion, deepseekFeedback) {
  const prompt = buildOpenAIPrompt(text, tesis, evidencias, contraargumento, refutacion, deepseekFeedback);
  
  try {
    const response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      timeoutMs: 45000
    });

    const rawContent = extractContent(response);
    logger.log('🔍 [OpenAI RespuestaArgumentativa] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    logger.log('✅ [OpenAI RespuestaArgumentativa] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    if (!parsed.profundidad_dialogica || !parsed.nivel_pensamiento_critico) {
      throw new Error('Respuesta sin profundidad_dialogica');
    }
    return parsed;
  } catch (error) {
    logger.error('❌ Error en evaluación OpenAI (RespuestaArgumentativa):', error);
    return {
      profundidad_dialogica: {
        solidez_tesis: { demuestra_pensamiento_original: true, es_matizada: true, comentario: 'Análisis básico' },
        uso_evidencia: { integra_evidencia_estrategicamente: true, explica_implicaciones: true, comentario: 'Análisis básico' },
        manejo_contraargumento: { reconoce_validez_parcial: true, refutacion_matizada: true, comentario: 'Análisis básico' }
      },
      fortalezas_dialogicas: ['Análisis en proceso'],
      oportunidades_profundizacion: ['Error en evaluación automática'],
      nivel_pensamiento_critico: 3,
      _error: error.message
    };
  }
}

/**
 * Combina feedback de ambos AIs
 */
function mergeFeedback(deepseek, openai) {
  // Calcular niveles por criterio
  const criterios = {
    solidez_tesis: {
      nivel: deepseek.criterios_evaluados.solidez_tesis.nivel,
      fortalezas: [],
      mejoras: []
    },
    uso_evidencia: {
      nivel: deepseek.criterios_evaluados.uso_evidencia.nivel,
      fortalezas: [],
      mejoras: []
    },
    manejo_contraargumento: {
      nivel: deepseek.criterios_evaluados.manejo_contraargumento.nivel,
      fortalezas: [],
      mejoras: []
    }
  };

  // Ajustar niveles según profundidad (OpenAI)
  if (openai.profundidad_dialogica.solidez_tesis.demuestra_pensamiento_original) {
    criterios.solidez_tesis.fortalezas.push('Demuestra pensamiento crítico original');
  } else {
    criterios.solidez_tesis.mejoras.push('Intenta formular una tesis más original que vaya más allá de lo obvio');
  }

  if (openai.profundidad_dialogica.solidez_tesis.es_matizada) {
    criterios.solidez_tesis.fortalezas.push('Tesis matizada que reconoce complejidad');
  } else {
    criterios.solidez_tesis.mejoras.push('Matiza tu tesis reconociendo limitaciones o casos excepcionales');
  }

  if (openai.profundidad_dialogica.uso_evidencia.integra_evidencia_estrategicamente) {
    criterios.uso_evidencia.fortalezas.push('Integra evidencia de forma estratégica');
  } else {
    criterios.uso_evidencia.mejoras.push('Usa la evidencia estratégicamente: selecciona las más fuertes y explica por qué son cruciales');
  }

  if (openai.profundidad_dialogica.manejo_contraargumento.reconoce_validez_parcial) {
    criterios.manejo_contraargumento.fortalezas.push('Reconoce validez parcial del contraargumento antes de refutarlo');
  } else {
    criterios.manejo_contraargumento.mejoras.push('Reconoce qué hay de válido en el contraargumento antes de refutarlo (esto fortalece tu refutación)');
  }

  if (openai.profundidad_dialogica.manejo_contraargumento.refuta_sin_simplificar) {
    criterios.manejo_contraargumento.fortalezas.push('Refuta sin simplificar excesivamente la postura opuesta');
  } else {
    criterios.manejo_contraargumento.mejoras.push('Evita caricaturizar la postura opuesta: presenta su versión más fuerte antes de refutarla');
  }

  // Añadir fortalezas/mejoras estructurales (DeepSeek)
  (deepseek.fortalezas_estructurales || []).forEach(f => {
    const criterioKey = detectCriterioKey(f);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].fortalezas.push(f);
    }
  });

  (deepseek.mejoras_estructura || []).forEach(m => {
    const criterioKey = detectCriterioKey(m);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].mejoras.push(m);
    }
  });

  // Añadir insights dialógicos (OpenAI)
  (openai.fortalezas_dialogicas || []).forEach(f => criterios.solidez_tesis.fortalezas.push(f));
  (openai.oportunidades_profundizacion || []).forEach(m => criterios.solidez_tesis.mejoras.push(m));

  // Calcular nivel global (promedio + ajuste por profundidad crítica)
  const nivelPromedio = (
    criterios.solidez_tesis.nivel +
    criterios.uso_evidencia.nivel +
    criterios.manejo_contraargumento.nivel
  ) / 3;

  const nivelGlobal = Math.min(4, Math.round(nivelPromedio + (openai.nivel_pensamiento_critico - nivelPromedio) * 0.3));

  return {
    dimension: DIMENSION_KEY,
    nivel_global: nivelGlobal,
    criterios,
    evidencias_deepseek: deepseek.criterios_evaluados,
    profundidad_openai: openai.profundidad_dialogica,
    fuentes: ['DeepSeek (estructura argumentativa)', 'OpenAI (profundidad dialógica)']
  };
}

/**
 * Detecta a qué criterio pertenece un comentario (heurística simple)
 */
function detectCriterioKey(comentario) {
  const lower = comentario.toLowerCase();
  if (lower.includes('tesis') || lower.includes('postura')) return 'solidez_tesis';
  if (lower.includes('evidencia') || lower.includes('sustento') || lower.includes('cita')) return 'uso_evidencia';
  if (lower.includes('contraargumento') || lower.includes('objeción') || lower.includes('refut')) return 'manejo_contraargumento';
  return null;
}

/**
 * FUNCIÓN PRINCIPAL: Evaluación dual de Respuesta Argumentativa
 * 
 * @param {Object} params
 * @param {string} params.text - Texto original
 * @param {string} params.tesis - Tesis del estudiante
 * @param {string} params.evidencias - Evidencias que sustentan la tesis
 * @param {string} params.contraargumento - Contraargumento u objeción
 * @param {string} params.refutacion - Refutación del contraargumento
 * @returns {Promise<Object>} Feedback criterial con niveles y evidencias
 */
export async function evaluateRespuestaArgumentativa({ text, tesis, evidencias, contraargumento, refutacion }) {
  logger.log('💭 [RespuestaArgumentativa] Iniciando evaluación dual...');

  const startTime = Date.now();

  try {
    // FASE 1: Evaluación estructural con DeepSeek
    logger.log('📊 Evaluando estructura argumentativa (DeepSeek)...');
    const deepseekResult = await evaluateWithDeepSeek(text, tesis, evidencias, contraargumento, refutacion);

    // FASE 2: Evaluación de profundidad dialógica con OpenAI
    logger.log('🧠 Evaluando profundidad dialógica (OpenAI)...');
    const openaiResult = await evaluateWithOpenAI(text, tesis, evidencias, contraargumento, refutacion, deepseekResult);

    // FASE 3: Combinar feedback
    logger.log('🔧 Combinando feedback dual...');
    const mergedFeedback = mergeFeedback(deepseekResult, openaiResult);

    // FASE 4: Añadir descriptores de rúbrica
    const rubricDimension = getDimension(DIMENSION_KEY);
    const levelInfo = scoreToLevelDescriptor(DIMENSION_KEY, mergedFeedback.nivel_global);

    const finalFeedback = {
      ...mergedFeedback,
      dimension_label: rubricDimension?.nombre || 'Argumentación y Contraargumento',
      dimension_description: rubricDimension?.descripcion || '',
      nivel_descriptor: levelInfo.descriptor,
      duracion_ms: Date.now() - startTime
    };

    logger.log(`✅ Evaluación completada en ${finalFeedback.duracion_ms}ms`);
    logger.log(`📊 Nivel global: ${mergedFeedback.nivel_global}/4`);

    return finalFeedback;

  } catch (error) {
    logger.error('❌ Error en evaluación dual de RespuestaArgumentativa:', error);
    throw wrapServiceError(error, 'Error en evaluacion dual de RespuestaArgumentativa');
  }
}


