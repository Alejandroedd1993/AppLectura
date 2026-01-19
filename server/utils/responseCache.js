/**
 * 🚀 Response Cache para Chat Completions
 */
import crypto from 'crypto';

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '600000', 10);
const CACHE_MAX_SIZE = parseInt(process.env.CACHE_MAX_SIZE || '500', 10);

const cache = new Map();
const cacheStats = { hits: 0, misses: 0, evictions: 0, totalSavedMs: 0 };

function generateCacheKey(messages, temperature) {
  const relevantMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role}:${m.content}`)
    .join('|');
  const keyString = `${relevantMessages}|temp:${temperature}`;
  return crypto.createHash('sha256').update(keyString).digest('hex').slice(0, 16);
}

function evictIfNeeded() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cacheStats.evictions++;
    }
  }
  if (cache.size >= CACHE_MAX_SIZE) {
    const entriesToRemove = cache.size - CACHE_MAX_SIZE + 10;
    let removed = 0;
    for (const key of cache.keys()) {
      if (removed >= entriesToRemove) break;
      cache.delete(key);
      cacheStats.evictions++;
      removed++;
    }
  }
}

export function getCachedResponse(messages, temperature = 0.7) {
  if (!CACHE_ENABLED) return null;
  const key = generateCacheKey(messages, temperature);
  const entry = cache.get(key);
  if (!entry) {
    cacheStats.misses++;
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
  cacheStats.totalSavedMs += entry.originalLatencyMs || 5000;
  cache.delete(key);
  cache.set(key, entry);
  return entry.content;
}

export function setCachedResponse(messages, temperature, content, latencyMs = 0) {
  if (!CACHE_ENABLED) return;
  if (!content || typeof content !== 'string') return;
  if (content.startsWith('⚠️')) return;
  evictIfNeeded();
  const key = generateCacheKey(messages, temperature);
  cache.set(key, {
    content,
    createdAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
    originalLatencyMs: latencyMs
  });
}

export function getCacheStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)
    : 0;
  return {
    enabled: CACHE_ENABLED,
    size: cache.size,
    maxSize: CACHE_MAX_SIZE,
    ttlMs: CACHE_TTL_MS,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: `${hitRate}%`,
    evictions: cacheStats.evictions,
    estimatedTimeSavedMs: cacheStats.totalSavedMs,
    estimatedTimeSavedFormatted: `${(cacheStats.totalSavedMs / 1000).toFixed(1)}s`
  };
}

export function clearCache() {
  cache.clear();
}

export default {
  get: getCachedResponse,
  set: setCachedResponse,
  stats: getCacheStats,
  clear: clearCache
};
