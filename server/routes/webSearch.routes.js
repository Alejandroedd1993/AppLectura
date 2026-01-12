/**
 * Rutas para búsqueda web contextual
 */
import express from 'express';
import webSearchController from '../controllers/webSearch.controller.js';
import { webSearchLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

/**
 * POST /api/web-search
 * Realiza búsqueda web contextual para enriquecer análisis crítico
 * 
 * Body:
 * - query: string (requerido) - Términos de búsqueda
 * - type: string - Tipo de búsqueda (estadisticas_locales, noticias_recientes, etc.)
 * - maxResults: number - Máximo número de resultados (default: 5)
 */
router.post('/', webSearchLimiter, webSearchController.buscarWeb);
// Nueva ruta: respuesta con IA a partir de resultados de búsqueda
router.post('/answer', webSearchLimiter, webSearchController.responderBusquedaIA);

/**
 * GET /api/web-search/test
 * Endpoint de prueba para verificar configuración
 */
router.get('/test', (req, res) => {
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
  
  res.json({
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
});

export default router;