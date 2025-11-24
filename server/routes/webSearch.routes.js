/**
 * Rutas para búsqueda web contextual
 */
import express from 'express';
import webSearchController from '../controllers/webSearch.controller.js';

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
router.post('/', webSearchController.buscarWeb);
// Nueva ruta: respuesta con IA a partir de resultados de búsqueda
router.post('/answer', webSearchController.responderBusquedaIA);

/**
 * GET /api/web-search/test
 * Endpoint de prueba para verificar configuración
 */
router.get('/test', (req, res) => {
  const configuracion = {
    serper_disponible: !!process.env.SERPER_API_KEY,
    bing_disponible: !!process.env.BING_SEARCH_API_KEY,
    modo_funcionamiento: process.env.SERPER_API_KEY ? 'Serper (Google)' :
                         process.env.BING_SEARCH_API_KEY ? 'Bing Search' :
                         'Simulación (sin API keys)',
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