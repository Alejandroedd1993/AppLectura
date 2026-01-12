import React, { useCallback, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import useWebSearchTutor from '../../hooks/useWebSearchTutor';
import { buildEnrichmentPrompt } from '../../utils/enrichmentConstants';
import { useRewards } from '../../context/PedagogyContext';

const Btn = styled.button`
  padding: 0.5rem 0.9rem;
  background: ${p => p.theme?.success || '#16a34a'};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
  
  &:disabled { 
    opacity: 0.5; 
    cursor: not-allowed; 
  }
  &:hover:not(:disabled) { 
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: ${p => p.$error ? '#dc2626' : (p.theme?.primary || '#3190FC')};
  color: #fff;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: ${fadeIn} 0.25s ease-out;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * WebEnrichmentButton - Versión Simplificada
 * 
 * Click → Busca → Envía automáticamente al tutor → Toast de confirmación
 * Sin modal de selección intermedio.
 */
export default function WebEnrichmentButton({
  query,
  contextBuilder,
  onEnriched,
  rewardsResourceId,
  provider = 'tavily',
  maxResults = 3,
  analysisType = 'contexto-social',
  disabled,
  children = '🌐 Con Web'
}) {
  const { search, loading } = useWebSearchTutor({
    enabled: !disabled,
    provider,
    maxResults,
    analysisType
  });

  const rewards = useRewards();

  const [toast, setToast] = useState(null); // { message, error? }

  const showToast = (message, error = false, duration = 3000) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), duration);
  };

  const handleClick = useCallback(async () => {
    if (disabled || !query?.trim()) return;

    console.log('🔍 [WebEnrichmentButton] Iniciando búsqueda web:', query.trim());

    try {
      const contexto = contextBuilder ? contextBuilder(query) : '';
      const resultados = await search(query.trim(), contexto);

      console.log('📊 [WebEnrichmentButton] Resultados:', resultados?.length || 0);

      if (resultados && resultados.length) {
        // Construir contexto enriquecido con TODOS los resultados
        const enrichedContext = buildEnrichmentPrompt(resultados, true);

        console.log('✅ [WebEnrichmentButton] Enviando al tutor automáticamente');

        // Enviar directamente al tutor (sin modal)
        onEnriched?.(enrichedContext);

        // 🎮 Registrar recompensa
        if (rewards) {
          rewards.recordEvent('WEB_SEARCH_USED', {
            query: query.trim(),
            resultsCount: resultados.length,
            // Una vez por texto/lectura (si el caller provee id estable)
            resourceId: rewardsResourceId
          });
        }

        // Toast de éxito
        showToast(`✅ ${resultados.length} fuentes encontradas. Procesando respuesta...`);
      } else {
        console.warn('⚠️ [WebEnrichmentButton] Sin resultados');
        showToast('No se encontraron resultados. Intenta otra pregunta.', true);
      }
    } catch (e) {
      console.error('❌ [WebEnrichmentButton] Error:', e);
      showToast(`Error: ${e.message}`, true);
    }
  }, [disabled, query, search, contextBuilder, onEnriched, rewards, rewardsResourceId]);

  return (
    <>
      <Btn
        type="button"
        data-testid="btn-con-web"
        disabled={disabled || loading || !query?.trim()}
        title={disabled ? 'Búsqueda web no disponible' : 'Buscar información web relevante'}
        onClick={handleClick}
      >
        {loading ? (
          <>
            <Spinner /> Buscando...
          </>
        ) : (
          children
        )}
      </Btn>

      {/* Toast de feedback */}
      {toast && (
        <Toast $error={toast.error}>
          {toast.message}
        </Toast>
      )}
    </>
  );
}
