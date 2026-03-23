import crypto from 'crypto';

const PRELECTURA_WEB_CACHE = new Map();

export function getPreLecturaWebCacheConfig() {
  const cacheTtlRaw = Number(process.env.PRELECTURA_WEB_CACHE_TTL_MS);
  const cacheMaxRaw = Number(process.env.PRELECTURA_WEB_CACHE_MAX_ENTRIES);

  return {
    ttlMs: Number.isFinite(cacheTtlRaw) ? Math.max(0, Math.floor(cacheTtlRaw)) : 300000,
    maxEntries: Number.isFinite(cacheMaxRaw) ? Math.max(0, Math.floor(cacheMaxRaw)) : 200,
  };
}

export function buildPreLecturaWebCacheKey(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function getCachedPreLecturaWebContext(cacheKey, { ttlMs } = getPreLecturaWebCacheConfig()) {
  if (!cacheKey || ttlMs <= 0) return null;

  const cached = PRELECTURA_WEB_CACHE.get(cacheKey);
  if (!cached) return null;

  if (typeof cached.expiresAt === 'number' && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  PRELECTURA_WEB_CACHE.delete(cacheKey);
  return null;
}

export function setCachedPreLecturaWebContext(cacheKey, value, { ttlMs, maxEntries } = getPreLecturaWebCacheConfig()) {
  if (!cacheKey || ttlMs <= 0 || maxEntries <= 0) return;

  while (PRELECTURA_WEB_CACHE.size >= maxEntries) {
    const oldestKey = PRELECTURA_WEB_CACHE.keys().next().value;
    if (!oldestKey) break;
    PRELECTURA_WEB_CACHE.delete(oldestKey);
  }

  PRELECTURA_WEB_CACHE.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function resetPreLecturaWebCache() {
  PRELECTURA_WEB_CACHE.clear();
}