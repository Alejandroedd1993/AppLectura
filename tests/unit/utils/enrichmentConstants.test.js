import { ENRICHMENT_SENTINEL_PREFIX, buildEnrichmentPrompt } from '../../../src/utils/enrichmentConstants';

describe('enrichmentConstants', () => {
  test('buildEnrichmentPrompt construye prompt con separadores', () => {
    const results = [
      { title: 'Uno', url: 'https://a', snippet: 'Resumen A' },
      { title: 'Dos', url: 'https://b', description: 'Desc B' },
      { title: 'Tres', url: 'https://c', snippet: 'Resumen C' }
    ];
    const prompt = buildEnrichmentPrompt(results);
    expect(prompt.startsWith(ENRICHMENT_SENTINEL_PREFIX)).toBe(true);
    expect(prompt.split('\n---\n').length).toBe(3); // tres bloques
    expect(prompt).toMatch(/Título: Uno/);
    expect(prompt).toMatch(/Resumen: Resumen A/);
    expect(prompt).toMatch(/URL: https:\/\/c/);
  });
});