import { generarNotasConOpenAI, generarNotasConDeepSeek, generarNotasConGemini } from '../services/notes.service.js';
import { notesSchema } from '../validators/schemas.js';
import { sendValidationError } from '../utils/validationError.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendSuccess } from '../utils/apiResponse.js';

function isProviderConfigured(provider) {
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY);
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  return true;
}

function getNotesErrorResponse(error) {
  const message = String(error?.message || '');

  if (message.includes('Timeout')) {
    return {
      status: 504,
      body: {
        error: 'Tiempo de espera agotado',
        mensaje: 'La generacion de notas tardo demasiado. Intenta nuevamente.',
        codigo: 'NOTES_TIMEOUT'
      }
    };
  }

  if (message.includes('Rate limit')) {
    return {
      status: 429,
      body: {
        error: 'Limite de solicitudes excedido',
        mensaje: 'El proveedor esta temporalmente saturado. Intenta nuevamente en unos minutos.',
        codigo: 'NOTES_RATE_LIMIT'
      }
    };
  }

  return {
    status: 500,
    body: {
      error: 'Error generando notas',
      mensaje: 'No se pudieron generar las notas de estudio en este momento.',
      codigo: 'NOTES_GENERATION_ERROR'
    }
  };
}

/**
 * POST /api/notes/generate
 * body: { 
 *   texto: string, 
 *   api?: 'openai'|'deepseek'|'gemini',
 *   contexto?: Object, // Contexto enriquecido del análisis académico
 *   nivelAcademico?: 'secundaria'|'pregrado'|'posgrado'|'doctorado', // FASE 3
 *   tipoTexto?: 'auto'|'narrativo'|'poetico'|'filosofico'|'ensayo',
 *   numeroTarjetas?: number
 * }
 */
export async function generarNotas(req, res) {
  const { texto, api = 'openai', contexto = null, nivelAcademico = 'pregrado', tipoTexto = 'auto', numeroTarjetas = undefined } = req.body || {};
  const provider = String(api || 'openai').trim().toLowerCase();

  if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
    return sendValidationError(res, {
      error: 'Texto vacio',
      mensaje: 'Proporciona texto para generar notas',
      codigo: 'EMPTY_NOTES_TEXT'
    });
  }

  // Log del contexto enriquecido y nivel académico
  if (contexto || nivelAcademico !== 'pregrado') {
    console.log('[notes.controller] Recibido contexto enriquecido:', {
      genero: contexto?.genero,
      tiene_tesis: !!contexto?.tesis_central,
      tiene_conceptos: !!contexto?.conceptos_clave,
      tiene_resumen: !!contexto?.resumen_previo,
      nivelAcademico // 🆕 FASE 3
    });
  }

  // Validación por proveedor
  if (!['openai', 'deepseek', 'gemini'].includes(provider)) {
    return sendError(res, 400, {
      error: 'API no soportada',
      mensaje: 'El proveedor solicitado no es valido.',
      codigo: 'UNSUPPORTED_AI_PROVIDER'
    });
  }

  if (!isProviderConfigured(provider)) {
    return sendError(res, 503, {
      error: 'Proveedor no disponible',
      mensaje: 'El proveedor solicitado no esta configurado en el servidor.',
      codigo: 'AI_PROVIDER_NOT_CONFIGURED'
    });
  }

  try {
    let result;
    switch (provider) {
      case 'openai':
        result = await generarNotasConOpenAI(texto, contexto, nivelAcademico, tipoTexto, numeroTarjetas); // 🆕 Pasar nivel
        break;
      case 'deepseek':
        result = await generarNotasConDeepSeek(texto, contexto, nivelAcademico, tipoTexto, numeroTarjetas); // 🆕 Pasar nivel
        break;
      case 'gemini':
        result = await generarNotasConGemini(texto, contexto, nivelAcademico, tipoTexto, numeroTarjetas); // 🆕 Pasar nivel
        break;
    }
    const parsed = notesSchema.safeParse(result);
    if (!parsed.success) {
      console.error('[notes.controller] Formato invalido del proveedor:', parsed.error.flatten());
      return sendError(res, 503, {
        error: 'Respuesta invalida del proveedor',
        mensaje: 'La respuesta del proveedor no tuvo el formato esperado.',
        codigo: 'INVALID_NOTES_RESPONSE'
      });
    }
    return sendSuccess(res, parsed.data);
  } catch (error) {
    console.error('Error en generarNotas:', error);
    const { status, body } = getNotesErrorResponse(error);
    return sendError(res, status, body);
  }
}

export default { generarNotas };

