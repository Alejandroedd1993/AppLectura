describe('preLecturaWebCache.service', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.PRELECTURA_WEB_CACHE_TTL_MS;
    delete process.env.PRELECTURA_WEB_CACHE_MAX_ENTRIES;

    const { resetPreLecturaWebCache } = await import('../../../server/services/preLecturaWebCache.service.js');
    resetPreLecturaWebCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('expone configuración por defecto segura', async () => {
    const { getPreLecturaWebCacheConfig } = await import('../../../server/services/preLecturaWebCache.service.js');

    expect(getPreLecturaWebCacheConfig()).toEqual({ ttlMs: 300000, maxEntries: 200 });
  });

  test('recupera una entrada válida desde caché', async () => {
    const service = await import('../../../server/services/preLecturaWebCache.service.js');
    const key = service.buildPreLecturaWebCacheKey({ q: ['uno'] });
    const payload = { sources: [{ url: 'https://ejemplo.test' }], key_findings: ['dato'] };

    service.setCachedPreLecturaWebContext(key, payload, { ttlMs: 1000, maxEntries: 5 });

    expect(service.getCachedPreLecturaWebContext(key, { ttlMs: 1000, maxEntries: 5 })).toEqual(payload);
  });

  test('expira entradas vencidas y devuelve null', async () => {
    const service = await import('../../../server/services/preLecturaWebCache.service.js');
    const key = service.buildPreLecturaWebCacheKey({ q: ['dos'] });

    service.setCachedPreLecturaWebContext(key, { ok: true }, { ttlMs: 1, maxEntries: 5 });
    await new Promise(resolve => setTimeout(resolve, 5));

    expect(service.getCachedPreLecturaWebContext(key, { ttlMs: 1, maxEntries: 5 })).toBeNull();
  });

  test('expulsa la entrada más antigua cuando supera la capacidad', async () => {
    const service = await import('../../../server/services/preLecturaWebCache.service.js');
    const keyA = service.buildPreLecturaWebCacheKey({ q: ['a'] });
    const keyB = service.buildPreLecturaWebCacheKey({ q: ['b'] });

    service.setCachedPreLecturaWebContext(keyA, { id: 'a' }, { ttlMs: 1000, maxEntries: 1 });
    service.setCachedPreLecturaWebContext(keyB, { id: 'b' }, { ttlMs: 1000, maxEntries: 1 });

    expect(service.getCachedPreLecturaWebContext(keyA, { ttlMs: 1000, maxEntries: 1 })).toBeNull();
    expect(service.getCachedPreLecturaWebContext(keyB, { ttlMs: 1000, maxEntries: 1 })).toEqual({ id: 'b' });
  });
});