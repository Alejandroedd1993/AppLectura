/**
 * Rutas para búsqueda web contextual
 */
import express from 'express';
import webSearchController from '../controllers/webSearch.controller.js';
import { webSearchLimiter } from '../middleware/rateLimiters.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { webSearchAnswerRequestSchema, webSearchRequestSchema } from '../validators/requestSchemas.js';

const router = express.Router();
export const validateWebSearchInput = validateRequest(webSearchRequestSchema, {
  buildErrorPayload: ({ details }) => ({
    error: 'Solicitud de busqueda web invalida',
    mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
    codigo: 'INVALID_WEB_SEARCH_REQUEST',
    ...(details[0]?.path ? { field: details[0].path } : {}),
    details
  })
});
export const validateWebSearchAnswerInput = validateRequest(webSearchAnswerRequestSchema, {
  buildErrorPayload: ({ details }) => ({
    error: 'Solicitud de respuesta con busqueda invalida',
    mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
    codigo: 'INVALID_WEB_SEARCH_ANSWER_REQUEST',
    ...(details[0]?.path ? { field: details[0].path } : {}),
    details
  })
});

/**
 * POST /api/web-search
 * Realiza búsqueda web contextual para enriquecer análisis crítico
 * 
 * Body:
 * - query: string (requerido) - Términos de búsqueda
 * - type: string - Tipo de búsqueda (estadisticas_locales, noticias_recientes, etc.)
 * - maxResults: number - Máximo número de resultados (default: 5)
 */
router.post('/', requireFirebaseAuth, webSearchLimiter, validateWebSearchInput, webSearchController.buscarWeb);
// Nueva ruta: respuesta con IA a partir de resultados de búsqueda
router.post('/answer', requireFirebaseAuth, webSearchLimiter, validateWebSearchAnswerInput, webSearchController.responderBusquedaIA);

/**
 * GET /api/web-search/test
 * Endpoint de prueba para verificar configuración
 */
const webSearchTestHandler = (req, res) => {
  const tavilyDisponible = !!process.env.TAVILY_API_KEY;
  const serperDisponible = !!process.env.SERPER_API_KEY;
  const bingDisponible = !!process.env.BING_SEARCH_API_KEY;

  const webSearchHabilitado = (() => {
    const raw = String(process.env.ENABLE_WEB_SEARCH || '').trim().toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
  })();

  const modoFuncionamiento = tavilyDisponible ? 'Tavily AI Search' :
                           serperDisponible ? 'Serper (Google)' :
                           bingDisponible ? 'Bing Search' :
                           'Simulación (sin API keys)';

  const configuracion = {
    enable_web_search: webSearchHabilitado,
    tavily_disponible: tavilyDisponible,
    serper_disponible: serperDisponible,
    bing_disponible: bingDisponible,
    modo_funcionamiento: modoFuncionamiento,
    estado: 'Operativo'
  };
  
  return sendSuccess(res, {
    mensaje: 'Servicio de búsqueda web contextual',
    configuracion,
    ejemplo_uso: {
      endpoint: 'POST /api/web-search',
      body: {
        query: 'pobreza ecuador estadísticas 2024',
        type: 'estadisticas_locales',
        maxResults: 5
      }
    }
  });
};

const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
if (isProduction) {
  router.get('/test', requireFirebaseAuth, webSearchLimiter, webSearchTestHandler);
} else {
  router.get('/test', webSearchTestHandler);
}

export default router;
