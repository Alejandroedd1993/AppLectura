export const ENRICHMENT_SENTINEL_PREFIX = 'Integra de forma crítica estos resultados externos en tu respuesta al usuario:';

export function buildEnrichmentPrompt(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    console.warn('⚠️ [buildEnrichmentPrompt] Sin resultados válidos');
    return '';
  }
  
  const formattedResults = results.map((r, idx) => {
    return `Resultado ${idx + 1}:
Título: ${r.title || 'Sin título'}
Resumen: ${r.snippet || r.description || r.resumen || 'Sin resumen'}
URL: ${r.url || 'Sin URL'}`;
  }).join('\n---\n');
  
  const enrichedPrompt = `${ENRICHMENT_SENTINEL_PREFIX}

${formattedResults}

Usa esta información para enriquecer tu respuesta, citando las fuentes cuando sea relevante.`;

  console.log('📝 [buildEnrichmentPrompt] Prompt construido, longitud:', enrichedPrompt.length);
  return enrichedPrompt;
}

export default { ENRICHMENT_SENTINEL_PREFIX, buildEnrichmentPrompt };