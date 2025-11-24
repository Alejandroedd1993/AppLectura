import React, { useCallback } from 'react';
import styled from 'styled-components';
import useWebSearchTutor from '../../hooks/useWebSearchTutor';
import { buildEnrichmentPrompt } from '../../utils/enrichmentConstants';

const Btn = styled.button`
  padding: 0.5rem 0.75rem;
  background: #16a34a;
  color: #fff;
  border: 1px solid #16a34a;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  transition: all .2s ease;
  &:disabled { opacity:.5; cursor:not-allowed; }
  &:hover:not(:disabled){ opacity:.9; }
`;

/**
 * Componente reutilizable que encapsula la lógica de enriquecimiento vía búsqueda web.
 * Props:
 *  - query (string): texto base para buscar
 *  - contextBuilder: fn(opcional) que recibe query y devuelve contexto adicional
 *  - onEnriched: callback(promptEnriquecido) cuando hay resultados
 *  - maxResults, provider, analysisType: config de búsqueda
 *  - disabled: controla estado externo
 */
export default function WebEnrichmentButton({
  query,
  contextBuilder,
  onEnriched,
  provider = 'duckduckgo',
  maxResults = 3,
  analysisType = 'contexto-social',
  disabled,
  children = '🌐 Con Web',
  debug = true // Activado por defecto para debugging
}) {
  const { search, loading } = useWebSearchTutor({ enabled: !disabled, provider, maxResults, analysisType });

  const handleClick = useCallback(async () => {
    if (disabled || !query?.trim()) return;
    console.log('🔍 [WebEnrichmentButton] Iniciando búsqueda web...', { query: query.trim() });
    try {
      const contexto = contextBuilder ? contextBuilder(query) : '';
      debug && console.log('[WebEnrichmentButton] Ejecutando búsqueda', { query, contextoPreview: contexto?.slice(0,120) });
      const resultados = await search(query.trim(), contexto);
      console.log('📊 [WebEnrichmentButton] Resultados recibidos:', resultados?.length || 0, resultados);
      if (resultados && resultados.length) {
        // Mantener frase exacta usada en tests previos: "Integra de forma crítica estos resultados externos..."
        const enrichedContext = buildEnrichmentPrompt(resultados);
        console.log('✅ [WebEnrichmentButton] Contexto web enriquecido:', enrichedContext.substring(0, 200));
        console.log('📝 [WebEnrichmentButton] Pregunta original:', query.trim());
        onEnriched?.(enrichedContext);
        debug && console.log('[WebEnrichmentButton] Callback onEnriched ejecutado');
      } else {
        console.warn('⚠️ [WebEnrichmentButton] Sin resultados de búsqueda');
        alert('No se encontraron resultados en la búsqueda web. Intenta reformular tu pregunta.');
      }
    } catch (e) {
      console.error('❌ [WebEnrichmentButton] Error en búsqueda:', e);
      alert(`Error en búsqueda web: ${e.message}`);
      debug && console.warn('[WebEnrichmentButton] Error', e);
    }
  }, [disabled, query, search, contextBuilder, onEnriched, debug]);

  return (
    <Btn
      type="button"
      data-testid="btn-con-web"
      disabled={disabled || loading || !query?.trim()}
      title={disabled ? 'Activa Web antes de usar' : 'Realizar búsqueda web y enriquecer'}
      onClick={handleClick}
    >
      {loading ? 'Buscando...' : children}
    </Btn>
  );
}
