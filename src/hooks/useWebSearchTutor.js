import { useCallback, useState } from 'react';
import webSearchService from '../services/webSearchService';

import logger from '../utils/logger';
/**
 * useWebSearchTutor
 * Hook aislado para (re)integrar la búsqueda web dentro del flujo TutorCore sin acoplar
 * estados legacy del componente principal. Por ahora implementa una versión mínima
 * y segura; si la config indica disabled retorna null inmediatamente.
 *
 * API de retorno:
 *  - search(query, contextoOpcional) => Promise<resultados|null>
 *  - loading: boolean
 *  - error: string|null
 *  - lastQuery / lastResults (para debugging o UI opcional)
 */
export function useWebSearchTutor(config) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [lastResults, setLastResults] = useState(null);

  const search = useCallback(async (query, contextoTexto) => {
    logger.log('🔎 [useWebSearchTutor] Iniciando búsqueda', { enabled: config?.enabled, query });
    if (!config?.enabled) {
      logger.warn('⚠️ [useWebSearchTutor] Búsqueda deshabilitada por config');
      return null;
    }
    setError(null);
    setLoading(true);
    setLastQuery(query);
    try {
      const contextoLimitado = (contextoTexto || '').slice(0, 2000);
      // Generar queries derivadas (fallback si no existe método)
      let queries;
      if (typeof webSearchService.generateCriticalLiteracyQueries === 'function') {
        queries = webSearchService.generateCriticalLiteracyQueries(contextoLimitado, config.analysisType);
      } else if (typeof webSearchService.generateSearchQueries === 'function') {
        queries = webSearchService.generateSearchQueries(contextoLimitado);
      } else {
        queries = [query];
      }
      const effectiveQuery = query || queries[0];
      logger.log('🌐 [useWebSearchTutor] Llamando webSearchService.searchWeb', { effectiveQuery, provider: config.provider });
      const resultados = await webSearchService.searchWeb(effectiveQuery, config.provider, {
        maxResults: config.maxResults || 5,
        language: 'es'
      });
      logger.log('✅ [useWebSearchTutor] Resultados recibidos:', resultados?.length || 0);
      setLastResults(resultados);
      return resultados;
    } catch (e) {
      logger.error('❌ [useWebSearchTutor] Error en búsqueda:', e);
      setError(e.message || 'Error en búsqueda web');
      return null;
    } finally {
      setLoading(false);
    }
  }, [config]);

  return { search, loading, error, lastQuery, lastResults };
}

export default useWebSearchTutor;
