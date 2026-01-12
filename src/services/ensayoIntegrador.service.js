// src/services/ensayoIntegrador.service.js

import {
  chatCompletion,
  extractContent,
  parseJSONFromContent
} from './unifiedAiService';
import { getDimension } from '../pedagogy/rubrics/criticalLiteracyRubric';
import { CHAT_TIMEOUT_MS } from '../constants/timeoutConstants';

// 🆕 Logging estructurado para producción
const LOG_PREFIX = '📝 [EnsayoIntegrador]';

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, ...data };
  
  if (level === 'error') {
    console.error(`${LOG_PREFIX} ❌ ${message}`, logData);
  } else if (level === 'warn') {
    console.warn(`${LOG_PREFIX} ⚠️ ${message}`, logData);
  } else {
    console.log(`${LOG_PREFIX} ${message}`, logData);
  }
}

// 🆕 Clases de error tipadas para mejor manejo
export class EssayEvaluationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'EssayEvaluationError';
    this.code = code;
    this.details = details;
    this.userMessage = this.getUserMessage(code);
  }

  getUserMessage(code) {
    const messages = {
      INVALID_DIMENSION: 'La dimensión seleccionada no es válida. Por favor, selecciona otra.',
      MISSING_TEXT: 'Falta el texto base para evaluar. Asegúrate de tener una lectura cargada.',
      MISSING_ESSAY: 'No has escrito ningún ensayo para evaluar.',
      ESSAY_TOO_SHORT: 'Tu ensayo es demasiado corto para una evaluación significativa.',
      PROVIDER_ERROR: 'Error al conectar con el servicio de evaluación. Intenta de nuevo en unos segundos.',
      PARSE_ERROR: 'El servicio respondió con un formato inesperado. Intenta de nuevo.',
      TIMEOUT: 'La evaluación está tardando demasiado. Intenta de nuevo en unos minutos.',
      ALL_PROVIDERS_FAILED: 'Todos los servicios de evaluación fallaron. Por favor, intenta más tarde.',
      NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet e intenta de nuevo.',
      UNKNOWN: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.'
    };
    return messages[code] || messages.UNKNOWN;
  }
}

const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_MODEL = 'gpt-4o-mini';

// 🆕 Timeout específico para evaluación de ensayos (más largo que chat normal)
const ESSAY_EVALUATION_TIMEOUT_MS = Math.max(CHAT_TIMEOUT_MS, 90000); // Mínimo 90s

const DIMENSION_MAP = {
  comprension_analitica: 'comprensionAnalitica',
  acd: 'acd',
  contextualizacion: 'contextualizacion',
  argumentacion: 'argumentacion'
};

// 🆕 Dimensiones válidas para validación
const VALID_DIMENSIONS = Object.keys(DIMENSION_MAP);

function clampScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, n));
}

function toNivel(score) {
  const s = clampScore(score);
  if (!Number.isFinite(s)) return null;
  return Math.max(1, Math.min(4, Math.round(s / 2.5)));
}

function uniqueStrings(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean).map(String)));
}

// 🆕 Validación robusta de entrada
function validateEssayInput({ texto, essayText, dimension }) {
  const errors = [];

  if (!dimension || typeof dimension !== 'string') {
    errors.push({ field: 'dimension', code: 'INVALID_DIMENSION', message: 'Dimensión requerida' });
  } else if (!VALID_DIMENSIONS.includes(dimension)) {
    errors.push({ field: 'dimension', code: 'INVALID_DIMENSION', message: `Dimensión "${dimension}" no válida` });
  }

  if (!texto || typeof texto !== 'string' || texto.trim().length < 50) {
    errors.push({ field: 'texto', code: 'MISSING_TEXT', message: 'Texto base insuficiente' });
  }

  if (!essayText || typeof essayText !== 'string') {
    errors.push({ field: 'essayText', code: 'MISSING_ESSAY', message: 'Ensayo requerido' });
  } else if (essayText.trim().length < 100) {
    errors.push({ field: 'essayText', code: 'ESSAY_TOO_SHORT', message: 'Ensayo demasiado corto (mín. 100 caracteres)' });
  }

  return errors;
}

// 🆕 Sanitizar texto para enviar a la IA (prevenir injection, limpiar caracteres problemáticos)
function sanitizeText(text, maxLength = 10000) {
  if (!text || typeof text !== 'string') return '';
  
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  
  return text
    .substring(0, maxLength)
    .replace(controlCharsRegex, '') // Eliminar caracteres de control
    .replace(/\r\n/g, '\n') // Normalizar saltos de línea
    .replace(/\r/g, '\n')
    .trim();
}

function buildEssayPrompt({ texto, essayText, rubricDimension, dimensionKey }) {
  const criterios = rubricDimension?.criterios
    ? rubricDimension.criterios.map((c, idx) => `${idx + 1}. ${c.nombre}: ${c.descripcion}`).join('\n')
    : '';

  const preguntasGuia = rubricDimension?.preguntasGuia
    ? rubricDimension.preguntasGuia.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
    : '';

  return `Eres un evaluador experto en literacidad crítica.

DIMENSIÓN (ENSAYO): ${rubricDimension?.nombre || dimensionKey}
DESCRIPCIÓN: ${rubricDimension?.descripcion || ''}

CRITERIOS (rúbrica):
${criterios}

PREGUNTAS GUÍA:
${preguntasGuia}

TEXTO ORIGINAL (extracto):
"""
${String(texto || '').substring(0, 1800)}
"""

ENSAYO DEL ESTUDIANTE:
"""
${String(essayText || '').substring(0, 5000)}
"""

TAREA:
Evalúa el ensayo según la rúbrica de la dimensión indicada.

SALIDA OBLIGATORIA: responde SOLO con JSON válido con esta forma:
{
  "score": number,                 // 0-10
  "nivel": number,                 // 1-4
  "fortalezas": string[],
  "debilidades": string[],
  "feedback_estructura": string,
  "feedback_contenido": string,
  "recomendaciones": string[]
}

REGLAS:
- No incluyas texto fuera del JSON.
- Si falta información, asume lo mínimo razonable pero sé conservador.`;
}

async function evaluarConProveedor({ provider, model, texto, essayText, dimensionKey, temperature = 0.3, max_tokens = 900, signal }) {
  const startTime = Date.now();
  
  log('info', `Iniciando evaluación con ${provider}`, { model, dimensionKey });

  const rubricaId = DIMENSION_MAP[dimensionKey];
  if (!rubricaId) {
    throw new EssayEvaluationError(
      `Dimensión no soportada para ensayo: ${dimensionKey}`,
      'INVALID_DIMENSION',
      { dimensionKey, validDimensions: VALID_DIMENSIONS }
    );
  }

  const rubricDimension = getDimension(rubricaId);
  if (!rubricDimension) {
    throw new EssayEvaluationError(
      `Dimensión no encontrada en rúbrica: ${rubricaId}`,
      'INVALID_DIMENSION',
      { rubricaId }
    );
  }

  // 🆕 Sanitizar textos antes de enviar
  const sanitizedTexto = sanitizeText(texto, 2000);
  const sanitizedEssay = sanitizeText(essayText, 6000);

  const prompt = buildEssayPrompt({ 
    texto: sanitizedTexto, 
    essayText: sanitizedEssay, 
    rubricDimension, 
    dimensionKey 
  });

  let response;
  try {
    response = await chatCompletion({
      provider,
      model,
      temperature,
      max_tokens,
      messages: [
        { role: 'system', content: 'Responde estrictamente en JSON.' },
        { role: 'user', content: prompt }
      ],
      signal // 🆕 Pasar señal de cancelación
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    
    // 🆕 Clasificar el tipo de error
    if (err.name === 'AbortError') {
      log('warn', `Evaluación cancelada (${provider})`, { elapsed });
      throw new EssayEvaluationError(
        `Evaluación cancelada: ${provider}`,
        'TIMEOUT',
        { provider, elapsed }
      );
    }
    
    if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      log('error', `Timeout en ${provider}`, { elapsed, error: err.message });
      throw new EssayEvaluationError(
        `Timeout al evaluar con ${provider}`,
        'TIMEOUT',
        { provider, elapsed }
      );
    }
    
    if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('ECONNREFUSED')) {
      log('error', `Error de red en ${provider}`, { error: err.message });
      throw new EssayEvaluationError(
        `Error de conexión con ${provider}`,
        'NETWORK_ERROR',
        { provider, originalError: err.message }
      );
    }
    
    log('error', `Error en ${provider}`, { error: err.message, elapsed });
    throw new EssayEvaluationError(
      `Error al evaluar con ${provider}: ${err.message}`,
      'PROVIDER_ERROR',
      { provider, originalError: err.message }
    );
  }

  const content = extractContent(response);
  const parsed = parseJSONFromContent(content);

  if (!parsed || typeof parsed !== 'object') {
    const snippet = typeof content === 'string' ? content.substring(0, 200) : '';
    log('error', `Respuesta inválida de ${provider}`, { snippet });
    throw new EssayEvaluationError(
      `Respuesta inválida del proveedor ${provider}`,
      'PARSE_ERROR',
      { provider, contentSnippet: snippet }
    );
  }

  const score = clampScore(parsed.score);
  const nivel = parsed.nivel != null ? Number(parsed.nivel) : toNivel(score);

  const elapsed = Date.now() - startTime;
  log('info', `Evaluación completada (${provider})`, { score, nivel, elapsed });

  return {
    provider,
    model,
    score,
    nivel: Number.isFinite(nivel) ? Math.max(1, Math.min(4, nivel)) : null,
    fortalezas: uniqueStrings(parsed.fortalezas),
    debilidades: uniqueStrings(parsed.debilidades),
    feedback_estructura: parsed.feedback_estructura ? String(parsed.feedback_estructura) : '',
    feedback_contenido: parsed.feedback_contenido ? String(parsed.feedback_contenido) : '',
    recomendaciones: uniqueStrings(parsed.recomendaciones),
    usage: response?.usage || null,
    evaluationTime: elapsed,
    raw: parsed
  };
}

export function combineDualEssayEvaluations(deepseek, openai) {
  const dsScore = clampScore(deepseek?.score);
  const oaScore = clampScore(openai?.score);

  const scores = [dsScore, oaScore].filter((s) => Number.isFinite(s));
  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

  const nivel = toNivel(avgScore);

  return {
    score: avgScore,
    nivel,
    fortalezas: uniqueStrings([...(deepseek?.fortalezas || []), ...(openai?.fortalezas || [])]),
    debilidades: uniqueStrings([...(deepseek?.debilidades || []), ...(openai?.debilidades || [])]),
    recomendaciones: uniqueStrings([...(deepseek?.recomendaciones || []), ...(openai?.recomendaciones || [])]),
    evaluators: {
      deepseek,
      openai
    }
  };
}

/**
 * Evalúa un ensayo con estrategia dual (DeepSeek + OpenAI).
 * 
 * 🆕 Mejoras de producción:
 * - Validación robusta de entrada
 * - Timeout configurable con AbortController
 * - Logging estructurado
 * - Errores tipados con mensajes amigables
 *
 * @param {object} params
 * @param {string} params.texto - texto base (lectura)
 * @param {string} params.essayText - ensayo del estudiante
 * @param {string} params.dimension - una de: comprension_analitica | acd | contextualizacion | argumentacion
 * @param {number} [params.timeout] - timeout en ms (default: ESSAY_EVALUATION_TIMEOUT_MS)
 * @throws {EssayEvaluationError} Error tipado con código y mensaje amigable
 */
export async function evaluateEssayDual({ texto, essayText, dimension, timeout = ESSAY_EVALUATION_TIMEOUT_MS }) {
  const startTime = Date.now();
  log('info', 'Iniciando evaluación dual', { dimension, textLength: texto?.length, essayLength: essayText?.length });

  // 🆕 Validación de entrada
  const validationErrors = validateEssayInput({ texto, essayText, dimension });
  if (validationErrors.length > 0) {
    const firstError = validationErrors[0];
    log('error', 'Validación fallida', { errors: validationErrors });
    throw new EssayEvaluationError(
      `Validación fallida: ${firstError.message}`,
      firstError.code,
      { validationErrors }
    );
  }

  // 🆕 AbortController para timeout global
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    log('warn', 'Timeout global alcanzado', { timeout });
    controller.abort();
  }, timeout);

  try {
    const results = await Promise.allSettled([
      evaluarConProveedor({
        provider: 'deepseek',
        model: DEEPSEEK_MODEL,
        texto,
        essayText,
        dimensionKey: dimension,
        signal: controller.signal
      }),
      evaluarConProveedor({
        provider: 'openai',
        model: OPENAI_MODEL,
        texto,
        essayText,
        dimensionKey: dimension,
        signal: controller.signal
      })
    ]);

    clearTimeout(timeoutId);

    const deepseek = results[0].status === 'fulfilled' ? results[0].value : null;
    const openai = results[1].status === 'fulfilled' ? results[1].value : null;

    // 🆕 Logging de resultados
    const elapsed = Date.now() - startTime;
    log('info', 'Evaluación dual completada', { 
      deepseekOk: !!deepseek, 
      openaiOk: !!openai, 
      elapsed 
    });

    if (!deepseek && !openai) {
      const dsError = results[0].status === 'rejected' ? results[0].reason : null;
      const oaError = results[1].status === 'rejected' ? results[1].reason : null;
      
      log('error', 'Ambos proveedores fallaron', {
        deepseekError: dsError?.message || String(dsError),
        openaiError: oaError?.message || String(oaError)
      });

      // 🆕 Usar el error más informativo si está disponible
      const primaryError = dsError instanceof EssayEvaluationError ? dsError : 
                          oaError instanceof EssayEvaluationError ? oaError : null;
      
      throw new EssayEvaluationError(
        'No se pudo evaluar el ensayo (ambos servicios fallaron)',
        'ALL_PROVIDERS_FAILED',
        {
          deepseekError: dsError?.message || String(dsError),
          openaiError: oaError?.message || String(oaError),
          suggestedAction: primaryError?.code === 'TIMEOUT' 
            ? 'Intenta de nuevo en unos minutos cuando haya menos carga.'
            : 'Verifica tu conexión a internet e intenta de nuevo.'
        }
      );
    }

    const failedProviders = [];
    if (!deepseek && results[0].status === 'rejected') {
      const err = results[0].reason;
      failedProviders.push({ 
        provider: 'deepseek', 
        error: err?.userMessage || err?.message || String(err),
        code: err?.code || 'UNKNOWN'
      });
    }
    if (!openai && results[1].status === 'rejected') {
      const err = results[1].reason;
      failedProviders.push({ 
        provider: 'openai', 
        error: err?.userMessage || err?.message || String(err),
        code: err?.code || 'UNKNOWN'
      });
    }

    // 🆕 Log de advertencia si evaluación parcial
    if (failedProviders.length > 0) {
      log('warn', 'Evaluación parcial (un proveedor falló)', { failedProviders });
    }

    return {
      ...combineDualEssayEvaluations(deepseek, openai),
      dimension,
      partial: failedProviders.length > 0,
      failedProviders: failedProviders.length > 0 ? failedProviders : undefined,
      evaluationTime: elapsed
    };

  } catch (err) {
    clearTimeout(timeoutId);
    
    // 🆕 Re-lanzar errores tipados, envolver otros
    if (err instanceof EssayEvaluationError) {
      throw err;
    }
    
    log('error', 'Error inesperado en evaluación dual', { error: err.message });
    throw new EssayEvaluationError(
      `Error inesperado: ${err.message}`,
      'UNKNOWN',
      { originalError: err.message }
    );
  }
}

export default {
  evaluateEssayDual,
  combineDualEssayEvaluations,
  EssayEvaluationError,
  // 🆕 Exportar constantes útiles para tests
  VALID_DIMENSIONS,
  ESSAY_EVALUATION_TIMEOUT_MS
};
