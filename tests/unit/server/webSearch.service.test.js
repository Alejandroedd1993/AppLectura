import {
  clampWebResultCount,
  sanitizeWebQuery,
  searchWebSources,
} from '../../../server/services/webSearch.service.js';

describe('webSearch.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ENABLE_WEB_SEARCH;
    delete process.env.TAVILY_API_KEY;
    delete process.env.SERPER_API_KEY;
    delete process.env.BING_SEARCH_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('sanitizeWebQuery recorta espacios y longitud', () => {
    expect(sanitizeWebQuery('   hola mundo   ')).toBe('hola mundo');
    expect(sanitizeWebQuery('x'.repeat(10), 4)).toBe('xxxx');
    expect(sanitizeWebQuery('   ')).toBe('');
  });

  test('clampWebResultCount fuerza rango seguro', () => {
    expect(clampWebResultCount('9', { min: 1, max: 10, fallback: 5 })).toBe(9);
    expect(clampWebResultCount('999', { min: 1, max: 10, fallback: 5 })).toBe(10);
    expect(clampWebResultCount('nan', { min: 1, max: 10, fallback: 5 })).toBe(5);
  });

  test('searchWebSources usa fallback offline y normaliza resultados', async () => {
    const results = await searchWebSources('pobreza ecuador contexto actual', 20);

    expect(results.length).toBeLessThanOrEqual(10);
    expect(results[0]).toEqual(expect.objectContaining({
      title: expect.any(String),
      url: expect.any(String),
      snippet: expect.any(String),
      score: expect.any(Number)
    }));
  });

  test('searchWebSources devuelve vacio con query invalida', async () => {
    await expect(searchWebSources('   ', 5)).resolves.toEqual([]);
  });
});