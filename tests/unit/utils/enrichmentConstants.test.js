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
  
  test('buildEnrichmentPrompt incluye citaciones automáticas cuando se solicita', () => {
    const results = [
      { title: 'Fuente 1', url: 'https://ejemplo1.com', snippet: 'Texto 1' },
      { title: 'Fuente 2', url: 'https://ejemplo2.com', snippet: 'Texto 2' }
    ];
    const prompt = buildEnrichmentPrompt(results, true);
    expect(prompt).toMatch(/📚 Fuentes consultadas:/);
    expect(prompt).toMatch(/\[1\] Fuente 1: https:\/\/ejemplo1\.com/);
    expect(prompt).toMatch(/\[2\] Fuente 2: https:\/\/ejemplo2\.com/);
    expect(prompt).toMatch(/IMPORTANTE: Al citar información/);
  });
  
  test('buildEnrichmentPrompt sin citaciones cuando includeCitations=false', () => {
    const results = [
      { title: 'Test', url: 'https://test.com', snippet: 'Content' }
    ];
    const prompt = buildEnrichmentPrompt(results, false);
    expect(prompt).not.toMatch(/📚 Fuentes consultadas:/);
    expect(prompt).not.toMatch(/IMPORTANTE: Al citar información/);
  });
});