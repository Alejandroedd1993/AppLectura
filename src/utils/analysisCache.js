/**
 * Sistema de Caché para Análisis de Texto
 * Guarda resultados de análisis IA en localStorage para evitar llamadas repetidas
 * 
 * Beneficios:
 * - Análisis instantáneo para textos ya procesados
 * - Ahorro de costos de API (~70% de casos)
 * - Mejor experiencia offline
 * 
 * Limitaciones:
 * - localStorage: ~5-10 MB por dominio
 * - Expiración: 7 días por defecto
 */

const CACHE_PREFIX = 'analysis_cache_';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const MAX_CACHE_ENTRIES = 50; // Límite de análisis guardados
const CACHE_VERSION = 'v2'; // Incrementar si cambia estructura

/**
 * Obtiene un análisis del caché si existe y no ha expirado
 * @param {string} textHash - Hash único del texto
 * @returns {Object|null} - Objeto con analysis y questions, o null si no existe/expiró
 */
export function getCachedAnalysis(textHash) {
  if (!textHash) return null;

  try {
    const cacheKey = `${CACHE_PREFIX}${textHash}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log('📭 No hay análisis en caché para este texto');
      return null;
    }

    const { data, timestamp, version } = JSON.parse(cached);
    
    // Verificar versión del caché
    if (version !== CACHE_VERSION) {
      console.log('🔄 Caché de versión antigua, invalidando...');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Verificar expiración
    const age = Date.now() - timestamp;
    if (age > CACHE_DURATION_MS) {
      console.log(`⏰ Caché expirado (${Math.round(age / (24 * 60 * 60 * 1000))} días), eliminando...`);
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Validar estructura de datos
    if (!data.analysis || !data.questions || !Array.isArray(data.questions)) {
      console.warn('⚠️ Caché corrupto, eliminando...');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    const daysOld = Math.round(age / (24 * 60 * 60 * 1000));
    console.log(`✅ Análisis encontrado en caché (${daysOld} días de antigüedad)`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error leyendo caché:', error);
    return null;
  }
}

/**
 * Guarda un análisis en el caché
 * @param {string} textHash - Hash único del texto
 * @param {Object} data - Objeto con { analysis, questions }
 * @returns {boolean} - true si se guardó exitosamente
 */
export function setCachedAnalysis(textHash, data) {
  if (!textHash || !data) return false;

  try {
    // Validar datos antes de guardar
    if (!data.analysis || !data.questions || !Array.isArray(data.questions)) {
      console.warn('⚠️ Datos inválidos, no se guardarán en caché');
      return false;
    }

    // Limpiar caché antiguo si hay demasiadas entradas
    cleanupOldCache();

    const cacheKey = `${CACHE_PREFIX}${textHash}`;
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    console.log('💾 Análisis guardado en caché exitosamente');
    
    // Actualizar stats
    updateCacheStats('save');
    
    return true;
    
  } catch (error) {
    // QuotaExceededError: localStorage lleno
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage lleno, limpiando caché antiguo...');
      const cleared = forceClearOldCache(10); // Eliminar 10 entradas más antiguas
      if (cleared) {
        // Reintentar
        try {
          const cacheKey = `${CACHE_PREFIX}${textHash}`;
          const cacheEntry = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
          console.log('💾 Análisis guardado después de limpiar caché');
          return true;
        } catch (retryError) {
          console.error('❌ No se pudo guardar en caché después de limpiar:', retryError);
          return false;
        }
      }
    }
    
    console.error('❌ Error guardando en caché:', error);
    return false;
  }
}

/**
 * Limpia entradas de caché expiradas
 * @returns {number} - Número de entradas eliminadas
 */
function cleanupOldCache() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    
    if (keys.length <= MAX_CACHE_ENTRIES) {
      return 0; // No es necesario limpiar
    }

    console.log(`🧹 Limpiando caché (${keys.length} entradas, límite ${MAX_CACHE_ENTRIES})`);
    
    // Obtener timestamps de todas las entradas
    const entries = keys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return { key, timestamp: data.timestamp };
      } catch {
        return { key, timestamp: 0 }; // Entrada corrupta
      }
    });

    // Ordenar por antigüedad (más antigua primero)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Eliminar las más antiguas hasta estar bajo el límite
    const toDelete = entries.slice(0, keys.length - MAX_CACHE_ENTRIES + 5); // +5 margen
    let deleted = 0;

    toDelete.forEach(({ key }) => {
      localStorage.removeItem(key);
      deleted++;
    });

    console.log(`✅ ${deleted} entradas antiguas eliminadas`);
    return deleted;
    
  } catch (error) {
    console.error('❌ Error limpiando caché:', error);
    return 0;
  }
}

/**
 * Fuerza la eliminación de N entradas más antiguas
 * @param {number} count - Número de entradas a eliminar
 * @returns {boolean} - true si se eliminaron entradas
 */
function forceClearOldCache(count = 10) {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    
    if (keys.length === 0) return false;

    const entries = keys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return { key, timestamp: data.timestamp };
      } catch {
        return { key, timestamp: 0 };
      }
    });

    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = entries.slice(0, Math.min(count, entries.length));

    toDelete.forEach(({ key }) => {
      localStorage.removeItem(key);
    });

    console.log(`🗑️ ${toDelete.length} entradas forzadas a eliminar`);
    return true;
    
  } catch (error) {
    console.error('❌ Error en eliminación forzada:', error);
    return false;
  }
}

/**
 * Elimina un análisis específico del caché
 * @param {string} textHash - Hash del texto a eliminar
 * @returns {boolean} - true si se eliminó
 */
export function clearCachedAnalysis(textHash) {
  if (!textHash) return false;

  try {
    const cacheKey = `${CACHE_PREFIX}${textHash}`;
    localStorage.removeItem(cacheKey);
    console.log('🗑️ Análisis eliminado del caché');
    updateCacheStats('clear');
    return true;
  } catch (error) {
    console.error('❌ Error eliminando caché:', error);
    return false;
  }
}

/**
 * Elimina todo el caché de análisis
 * @returns {number} - Número de entradas eliminadas
 */
export function clearAllAnalysisCache() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    let deleted = 0;

    keys.forEach(key => {
      localStorage.removeItem(key);
      deleted++;
    });

    console.log(`🗑️ Todo el caché de análisis eliminado (${deleted} entradas)`);
    
    // Resetear stats
    localStorage.removeItem('analysis_cache_stats');
    
    return deleted;
  } catch (error) {
    console.error('❌ Error eliminando todo el caché:', error);
    return 0;
  }
}

/**
 * Obtiene estadísticas del caché
 * @returns {Object} - Stats del caché
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        totalSize += item.length * 2; // Aproximado (UTF-16)
        
        const { timestamp } = JSON.parse(item);
        const age = now - timestamp;
        
        if (age > CACHE_DURATION_MS) {
          expiredEntries++;
        } else {
          validEntries++;
        }
      } catch {
        expiredEntries++;
      }
    });

    // Obtener stats personalizadas
    const customStats = getCustomStats();

    return {
      totalEntries: keys.length,
      validEntries,
      expiredEntries,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxEntries: MAX_CACHE_ENTRIES,
      cacheDurationDays: Math.round(CACHE_DURATION_MS / (24 * 60 * 60 * 1000)),
      version: CACHE_VERSION,
      ...customStats
    };
  } catch (error) {
    console.error('❌ Error obteniendo stats de caché:', error);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSizeMB: 0,
      error: error.message
    };
  }
}

/**
 * Actualiza estadísticas personalizadas de uso
 * @param {string} action - 'save', 'hit', 'miss', 'clear'
 */
function updateCacheStats(action) {
  try {
    const statsKey = 'analysis_cache_stats';
    const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');

    stats.totalSaves = (stats.totalSaves || 0) + (action === 'save' ? 1 : 0);
    stats.totalHits = (stats.totalHits || 0) + (action === 'hit' ? 1 : 0);
    stats.totalMisses = (stats.totalMisses || 0) + (action === 'miss' ? 1 : 0);
    stats.totalClears = (stats.totalClears || 0) + (action === 'clear' ? 1 : 0);
    stats.lastAction = { type: action, timestamp: Date.now() };

    localStorage.setItem(statsKey, JSON.stringify(stats));
  } catch (error) {
    // Fallar silenciosamente para no interrumpir flujo principal
  }
}

/**
 * Obtiene estadísticas personalizadas de uso
 * @returns {Object} - Stats de uso
 */
function getCustomStats() {
  try {
    const statsKey = 'analysis_cache_stats';
    const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');

    const totalRequests = (stats.totalHits || 0) + (stats.totalMisses || 0);
    const hitRate = totalRequests > 0 
      ? ((stats.totalHits / totalRequests) * 100).toFixed(1) 
      : 0;

    return {
      totalSaves: stats.totalSaves || 0,
      totalHits: stats.totalHits || 0,
      totalMisses: stats.totalMisses || 0,
      hitRate: `${hitRate}%`,
      apiCallsSaved: stats.totalHits || 0,
      estimatedCostSaved: `$${((stats.totalHits || 0) * 0.03).toFixed(2)}`
    };
  } catch {
    return {};
  }
}

/**
 * Verifica si hay espacio suficiente en localStorage
 * @returns {Object} - Info de espacio disponible
 */
export function checkStorageSpace() {
  try {
    // Calcular espacio usado
    let totalUsed = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalUsed += localStorage.getItem(key).length * 2; // UTF-16
      }
    }

    const totalUsedMB = (totalUsed / (1024 * 1024)).toFixed(2);
    const estimatedLimitMB = 5; // ~5MB típico en Chrome
    const percentUsed = ((totalUsedMB / estimatedLimitMB) * 100).toFixed(1);

    return {
      totalUsedMB,
      estimatedLimitMB,
      percentUsed: `${percentUsed}%`,
      hasSpace: totalUsedMB < estimatedLimitMB * 0.9 // 90% del límite
    };
  } catch (error) {
    return {
      error: error.message,
      hasSpace: false
    };
  }
}

/**
 * Hook para tracking de uso de caché (opcional, para métricas)
 */
export function trackCacheUsage(wasFromCache, analysisTimeMs) {
  try {
    const metricsKey = 'analysis_cache_metrics';
    const metrics = JSON.parse(localStorage.getItem(metricsKey) || '[]');

    metrics.push({
      timestamp: Date.now(),
      fromCache: wasFromCache,
      timeMs: analysisTimeMs
    });

    // Mantener solo últimos 100 registros
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    localStorage.setItem(metricsKey, JSON.stringify(metrics));
  } catch {
    // Fallar silenciosamente
  }
}

/**
 * Obtiene métricas de performance
 * @returns {Object} - Métricas de tiempo
 */
export function getPerformanceMetrics() {
  try {
    const metricsKey = 'analysis_cache_metrics';
    const metrics = JSON.parse(localStorage.getItem(metricsKey) || '[]');

    if (metrics.length === 0) {
      return { avgCacheTime: 0, avgApiTime: 0, speedup: 0 };
    }

    const cachedMetrics = metrics.filter(m => m.fromCache);
    const apiMetrics = metrics.filter(m => !m.fromCache);

    const avgCacheTime = cachedMetrics.length > 0
      ? cachedMetrics.reduce((sum, m) => sum + m.timeMs, 0) / cachedMetrics.length
      : 0;

    const avgApiTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.timeMs, 0) / apiMetrics.length
      : 0;

    const speedup = avgApiTime > 0 
      ? (avgApiTime / Math.max(avgCacheTime, 1)).toFixed(1)
      : 0;

    return {
      avgCacheTime: Math.round(avgCacheTime),
      avgApiTime: Math.round(avgApiTime),
      speedup: `${speedup}x`,
      sampleSize: metrics.length
    };
  } catch {
    return { avgCacheTime: 0, avgApiTime: 0, speedup: 0 };
  }
}

export default {
  getCachedAnalysis,
  setCachedAnalysis,
  clearCachedAnalysis,
  clearAllAnalysisCache,
  getCacheStats,
  checkStorageSpace,
  trackCacheUsage,
  getPerformanceMetrics
};
