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
    let data = response;
    if (typeof response === 'string') {
      try {
        data = JSON.parse(response);
      } catch (parseError) {
        console.error('[assessment.evaluateAnswer] Error parseando JSON:', parseError);
        return res.status(500).json({
          error: 'Respuesta de IA no es JSON válido',
          raw: response.slice(0, 500)
        });
      }
    }

    // Validar estructura de respuesta
    if (!data.dimension || !data.scoreGlobal || !data.criteriosEvaluados) {
      console.warn('[assessment.evaluateAnswer] Respuesta de IA incompleta:', data);
      return res.status(500).json({
        error: 'Evaluación incompleta',
        details: 'La IA no generó todos los campos requeridos'
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
    return res.status(500).json({
      error: 'Error al evaluar la respuesta',
      message: err.message
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
    let data = response;
    if (typeof response === 'string') {
      try {
        data = JSON.parse(response);
      } catch (parseError) {
        console.error('[assessment.evaluateComprehensive] Error parseando JSON:', parseError);
        return res.status(500).json({
          error: 'Respuesta de IA no es JSON válido',
          raw: response.slice(0, 500)
        });
      }
    }

    // Validar estructura de respuesta
    if (!data.evaluaciones || !Array.isArray(data.evaluaciones) || data.evaluaciones.length < 4) {
      console.warn('[assessment.evaluateComprehensive] Respuesta incompleta:', data);
      return res.status(500).json({
        error: 'Evaluación incompleta',
        details: 'Se requieren al menos 4 dimensiones evaluadas'
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
    return res.status(500).json({
      error: 'Error en evaluación comprehensiva',
      message: err.message
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
        // Normalizar dimensión
        const dimension = normalizeDimensionInput(item.dimension || 'comprensionAnalitica');

        // Validar item
        const validationErrors = validateCriterialEvaluationInput({
          respuesta: item.respuesta,
          texto: item.texto,
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
          respuesta: item.respuesta,
          texto: item.texto,
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
