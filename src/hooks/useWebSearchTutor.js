import { useCallback, useState } from 'react';
import { fetchWebSearch } from '../utils/fetchWebSearch';
import logger from '../utils/logger';

/**
 * useWebSearchTutor
 * Hook aislado para búsqueda web dentro del flujo tutor.
 * F3 FIX: Delegates to shared fetchWebSearch utility to avoid duplicating
 * auth/timeout/fetch logic with TutorCore inline enrichment.
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

  const search = useCallback(async (query, _contextoTexto) => {
    logger.log('🔎 [useWebSearchTutor] Iniciando búsqueda vía backend', { enabled: config?.enabled, query });
    if (!config?.enabled) {
      logger.warn('⚠️ [useWebSearchTutor] Búsqueda deshabilitada por config');
      return null;
    }
    setError(null);
    setLoading(true);
    setLastQuery(query);
    try {
      const results = await fetchWebSearch(query, {
        maxResults: config.maxResults || 5,
        timeoutMs: 8000
      });
      logger.log('✅ [useWebSearchTutor] Resultados recibidos:', results?.length ?? 0);
      setLastResults(results);
      return results;
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
