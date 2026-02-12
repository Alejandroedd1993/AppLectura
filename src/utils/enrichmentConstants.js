import logger from './logger';
export const ENRICHMENT_SENTINEL_PREFIX = 'Integra de forma crítica estos resultados externos en tu respuesta al usuario:';

export function buildEnrichmentPrompt(results, includeCitations = true) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    logger.warn('⚠️ [buildEnrichmentPrompt] Sin resultados válidos');
    return '';
  }
  
  const formattedResults = results.map((r, idx) => {
    return `Resultado ${idx + 1}:
Título: ${r.title || 'Sin título'}
Resumen: ${r.snippet || r.description || r.resumen || 'Sin resumen'}
URL: ${r.url || 'Sin URL'}`;
  }).join('\n---\n');
  
  // Mejora #4: Generar lista de URLs para citación automática
  const citations = includeCitations ? results
    .filter(r => r.url)
    .map((r, idx) => `[${idx + 1}] ${r.title || 'Fuente'}: ${r.url}`)
    .join('\n') : '';
  
  const citationInstruction = includeCitations ? `

IMPORTANTE: Al citar información de estos resultados, incluye las referencias usando el formato [1], [2], etc., y al final de tu respuesta añade una sección "📚 Fuentes consultadas:" con las URLs:
${citations}` : '';
  
  const enrichedPrompt = `${ENRICHMENT_SENTINEL_PREFIX}

${formattedResults}

Usa esta información para enriquecer tu respuesta, citando las fuentes cuando sea relevante.${citationInstruction}`;

  logger.log('📝 [buildEnrichmentPrompt] Prompt construido con citaciones, longitud:', enrichedPrompt.length);
  return enrichedPrompt;
}

export default { ENRICHMENT_SENTINEL_PREFIX, buildEnrichmentPrompt };