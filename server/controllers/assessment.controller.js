import { buildEvaluatorPrompt, getEvaluationSchema } from '../../src/pedagogy/prompts/templates.js';
import {
  buildCriterialEvaluationPrompt,
  getCriterialEvaluationSchema,
  buildComprehensiveEvaluationPrompt,
  getComprehensiveEvaluationSchema,
  validateCriterialEvaluationInput,
  validateComprehensiveEvaluationInput
} from '../prompts/evaluationPrompts.js';
import { normalizeDimensionInput } from '../../src/pedagogy/rubrics/criticalLiteracyRubric.js';

const safeJsonParse = (value) => {
  if (typeof value !== 'string') return { ok: true, data: value };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error };
  }
};

const normalizeScore = (value) => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCriterialEvaluationResponse = (raw, fallbackDimension) => {
  const data = raw && typeof raw === 'object' ? raw : {};
  const normalized = {
    dimension: data.dimension || data.dimensión || data.category || fallbackDimension,
    scoreGlobal: normalizeScore(data.scoreGlobal ?? data.score ?? data.puntuacion ?? data.puntaje),
    nivel: normalizeScore(data.nivel ?? data.level),
    criteriosEvaluados: data.criteriosEvaluados || data.criterios || data.criteria || [],
    resumenDimension: data.resumenDimension || data.resumen || data.feedbackResumen || '',
    siguientesPasos: data.siguientesPasos || data.nextSteps || [],
    ...data
  };

  if (!Array.isArray(normalized.criteriosEvaluados)) {
    normalized.criteriosEvaluados = [];
  }
  if (!Array.isArray(normalized.siguientesPasos)) {
    normalized.siguientesPasos = [];
  }

  return normalized;
};

const normalizeComprehensiveEvaluationResponse = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {};
  const normalized = {
    evaluaciones: data.evaluaciones || data.evaluations || [],
    scoreTotal: normalizeScore(data.scoreTotal ?? data.score ?? data.puntuacionTotal),
    nivelGeneral: normalizeScore(data.nivelGeneral ?? data.levelGeneral ?? data.nivel),
    fortalezasGenerales: data.fortalezasGenerales || data.strengths || [],
    areasDeDesarrollo: data.areasDeDesarrollo || data.areas || data.weaknesses || [],
    recomendacionGeneral: data.recomendacionGeneral || data.recommendation || '',
    ...data
  };

  if (!Array.isArray(normalized.evaluaciones)) normalized.evaluaciones = [];
  if (!Array.isArray(normalized.fortalezasGenerales)) normalized.fortalezasGenerales = [];
  if (!Array.isArray(normalized.areasDeDesarrollo)) normalized.areasDeDesarrollo = [];

  return normalized;
};

/**
 * ✅ EVALUACIÓN CRITERIAL - Evalúa UNA dimensión con feedback estructurado por criterio
 * 
 * Body:
 * {
 *   texto: string (texto original),
 *   respuesta: string (respuesta del estudiante),
 *   dimension: string (comprensionAnalitica|acd|contextualizacion|argumentacion),
 *   provider?: string (openai|deepseek, default: openai),
 *   validationMetadata?: object (opcional, del textAnchorValidator)
 * }
 * 
 * Responde:
 * {
 *   dimension: string,
 *   scoreGlobal: number (1-10),
 *   nivel: number (1-4),
 *   criteriosEvaluados: [
 *     {
 *       criterio: string,
 *       nivel: number (1-4),
 *       evidencia: string[],
 *       fortalezas: string[],
 *       mejoras: string[]
 *     }
 *   ],
 *   resumenDimension: string,
 *   siguientesPasos: string[]
 * }
 */
export async function evaluateAnswer(req, res) {
  try {
    const {
      texto,
      respuesta,
      dimension: rawDimension = 'comprensionAnalitica',
      provider = 'openai',
      validationMetadata
    } = req.body || {};

    // Normalizar dimensión
    const dimension = normalizeDimensionInput(rawDimension);

    // Validar entrada
    const validationErrors = validateCriterialEvaluationInput({ respuesta, texto, dimensionKey: dimension });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: validationErrors
      });
    }

    console.log(`📊 [assessment.evaluateAnswer] Evaluando dimensión: ${dimension}`);

    // Construir prompt criterial
    const prompt = buildCriterialEvaluationPrompt({
      respuesta,
      texto,
      dimensionKey: dimension,
      idioma: 'es'
    });

    // Obtener schema específico
    const schema = getCriterialEvaluationSchema(dimension);

    // Reutilizar cliente de IA
    const aiClient = req.app.get('aiClient');
    if (!aiClient) {
      return res.status(501).json({
        error: 'AI client no configurado',
        action: 'Inyecta aiClient en app'
      });
    }

    // Llamar a IA con schema estructurado
    const response = await aiClient.complete({
      provider,
      prompt,
      response_format: { type: 'json_object', schema }
    });

    // Parsear respuesta
    const parsed = safeJsonParse(response);
    if (!parsed.ok) {
      console.error('[assessment.evaluateAnswer] Error parseando JSON:', parsed.error);
      return res.status(200).json({
        valid: false,
        degraded: true,
        error: 'Respuesta de IA no es JSON válido',
        raw: typeof response === 'string' ? response.slice(0, 500) : String(response).slice(0, 500),
        dimension,
        timestamp: new Date().toISOString()
      });
    }

    let data = normalizeCriterialEvaluationResponse(parsed.data, dimension);

    // Validar estructura de respuesta
    const hasCore = !!data.dimension && data.scoreGlobal != null && Array.isArray(data.criteriosEvaluados);
    if (!hasCore) {
      console.warn('[assessment.evaluateAnswer] Respuesta de IA incompleta (degraded):', data);
      return res.status(200).json({
        valid: false,
        degraded: true,
        message: 'Evaluación parcial: la IA no generó todos los campos requeridos',
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    // Enriquecer con metadata de validación si existe
    if (validationMetadata) {
      data.anchorValidation = {
        quotesCount: validationMetadata.quotesCount || 0,
        integrationQuality: validationMetadata.integrationQuality || 'unknown',
        hasInferences: validationMetadata.hasInferences || false
      };
    }

    console.log(`✅ [assessment.evaluateAnswer] Evaluación completada: score ${data.scoreGlobal}/10, nivel ${data.nivel}/4`);

    return res.json({
      valid: true,
      ...data,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[assessment.evaluateAnswer] Error:', err);
    return res.status(200).json({
      valid: false,
      degraded: true,
      error: 'Error al evaluar la respuesta',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * ✅ EVALUACIÓN COMPREHENSIVA - Evalúa las 4 dimensiones simultáneamente
 * 
 * Body:
 * {
 *   texto: string (texto original),
 *   respuesta: string (respuesta del estudiante, debe ser extensa),
 *   provider?: string (default: openai)
 * }
 * 
 * Responde:
 * {
 *   evaluaciones: [ { dimension, scoreGlobal, nivel, criteriosEvaluados, resumenDimension } ],
 *   scoreTotal: number (1-10),
 *   nivelGeneral: number (1-4),
 *   fortalezasGenerales: string[],
 *   areasDeDesarrollo: string[],
 *   recomendacionGeneral: string
 * }
 */
export async function evaluateComprehensive(req, res) {
  try {
    const {
      texto,
      respuesta,
      provider = 'openai'
    } = req.body || {};

    // Validar entrada
    const validationErrors = validateComprehensiveEvaluationInput({ respuesta, texto });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: validationErrors
      });
    }

    console.log(`📊 [assessment.evaluateComprehensive] Evaluando las 4 dimensiones`);

    // Construir prompt comprehensivo
    const prompt = buildComprehensiveEvaluationPrompt({
      respuesta,
      texto,
      idioma: 'es'
    });

    // Obtener schema comprehensivo
    const schema = getComprehensiveEvaluationSchema();

    // Reutilizar cliente de IA
    const aiClient = req.app.get('aiClient');
    if (!aiClient) {
      return res.status(501).json({
        error: 'AI client no configurado'
      });
    }

    // Llamar a IA (esto puede tardar más, considerar timeout mayor)
    const response = await aiClient.complete({
      provider,
      prompt,
      response_format: { type: 'json_object', schema },
      max_tokens: 4000 // Evaluación comprehensiva requiere más tokens
    });

    // Parsear respuesta
    const parsed = safeJsonParse(response);
    if (!parsed.ok) {
      console.error('[assessment.evaluateComprehensive] Error parseando JSON:', parsed.error);
      return res.status(200).json({
        valid: false,
        degraded: true,
        error: 'Respuesta de IA no es JSON válido',
        raw: typeof response === 'string' ? response.slice(0, 500) : String(response).slice(0, 500),
        timestamp: new Date().toISOString()
      });
    }

    const data = normalizeComprehensiveEvaluationResponse(parsed.data);

    // Validar estructura de respuesta
    if (!Array.isArray(data.evaluaciones) || data.evaluaciones.length < 4) {
      console.warn('[assessment.evaluateComprehensive] Respuesta incompleta (degraded):', data);
      return res.status(200).json({
        valid: false,
        degraded: true,
        message: 'Evaluación parcial: se requieren al menos 4 dimensiones evaluadas',
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ [assessment.evaluateComprehensive] Evaluación completada: score total ${data.scoreTotal}/10`);

    return res.json({
      valid: true,
      ...data,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[assessment.evaluateComprehensive] Error:', err);
    return res.status(200).json({
      valid: false,
      degraded: true,
      error: 'Error en evaluación comprehensiva',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * ✅ EVALUACIÓN EN LOTE - Evalúa múltiples respuestas de forma secuencial
 * 
 * Body:
 * {
 *   items: [
 *     { texto, respuesta, dimension, provider? },
 *     ...
 *   ]
 * }
 * 
 * Responde:
 * {
 *   results: [
 *     { ok: true, data: {...} } | { ok: false, error: string }
 *   ]
 * }
 */
export async function bulkEvaluate(req, res) {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'items debe ser un array con al menos una evaluación'
      });
    }

    if (items.length > 10) {
      return res.status(400).json({
        error: 'Máximo 10 evaluaciones por lote',
        details: `Recibidas ${items.length} evaluaciones`
      });
    }

    console.log(`📊 [assessment.bulkEvaluate] Procesando ${items.length} evaluaciones`);

    const results = [];
    const aiClient = req.app.get('aiClient');

    if (!aiClient) {
      return res.status(501).json({ error: 'AI client no configurado' });
    }

    // Procesar secuencialmente para evitar rate limits
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`📝 [assessment.bulkEvaluate] Procesando item ${i + 1}/${items.length}`);

      try {
        // Sanitizar/limitar tamaños para controlar coste y evitar prompts excesivos
        const safeTexto = typeof item?.texto === 'string' ? item.texto.slice(0, 10000) : item?.texto;
        const safeRespuesta = typeof item?.respuesta === 'string' ? item.respuesta.slice(0, 5000) : item?.respuesta;

        // Normalizar dimensión
        const dimension = normalizeDimensionInput(item.dimension || 'comprensionAnalitica');

        // Validar item
        const validationErrors = validateCriterialEvaluationInput({
          respuesta: safeRespuesta,
          texto: safeTexto,
          dimensionKey: dimension
        });

        if (validationErrors.length > 0) {
          results.push({
            ok: false,
            error: `Item ${i + 1}: ${validationErrors.join(', ')}`
          });
          continue;
        }

        // Construir prompt
        const prompt = buildCriterialEvaluationPrompt({
          respuesta: safeRespuesta,
          texto: safeTexto,
          dimensionKey: dimension,
          idioma: item.idioma || 'es'
        });

        // Obtener schema
        const schema = getCriterialEvaluationSchema(dimension);

        // Evaluar
        const response = await aiClient.complete({
          provider: item.provider || 'openai',
          prompt,
          response_format: { type: 'json_object', schema }
        });

        // Parsear
        let data = response;
        if (typeof response === 'string') {
          data = JSON.parse(response);
        }

        results.push({
          ok: true,
          data: {
            ...data,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`[assessment.bulkEvaluate] Error en item ${i + 1}:`, error);
        results.push({
          ok: false,
          error: `Item ${i + 1}: ${error.message}`
        });
      }
    }

    const successCount = results.filter(r => r.ok).length;
    console.log(`✅ [assessment.bulkEvaluate] Completado: ${successCount}/${items.length} exitosos`);

    return res.json({
      totalItems: items.length,
      successCount,
      failureCount: items.length - successCount,
      results
    });

  } catch (err) {
    console.error('[assessment.bulkEvaluate] Error:', err);
    return res.status(500).json({
      error: 'Error en evaluación en lote',
      message: err.message
    });
  }
}
