/**
 * Utilidades para manejo de caché de análisis de texto
 *
 * IMPORTANTE (Deprecación):
 * - La key legacy `text_analysis_cache` está deprecada.
 * - Este módulo mantiene compatibilidad temporal: lectura/migración y limpieza.
 * - El almacenamiento principal es la caché unificada por-entrada (ver `src/utils/analysisCache.js`).
 * 
 * Este módulo proporciona funciones para:
 * - Generar hashes únicos para textos
 * - Almacenar análisis en localStorage
 * - Recuperar análisis de localStorage
 * - Gestionar la expiración y límites de la caché
 */

import {
  getCachedAnalysis,
  setCachedAnalysis,
  clearAllAnalysisCache,
  getCacheStats as getUnifiedCacheStats
} from './analysisCache';

let __legacyMigrationRan = false;

// Configuración de caché
const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000, // Tiempo de vida: 24 horas en milisegundos
  MAX_ENTRIES: 20,          // Máximo número de entradas (aumentado de 10)
  STORAGE_KEY: 'text_analysis_cache',
  SAMPLE_SIZE: 3000         // Tamaño de muestra para generar hash (aumentado)
};

// Compat: caché legacy monolítica bajo STORAGE_KEY.
// Nuevo: caché por entrada gestionada por analysisCache (analysis_cache_text_*).

function safeReadLegacyCache() {
  try {
    const raw = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteLegacyCache(cacheObj) {
  try {
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cacheObj || {}));
    return true;
  } catch {
    return false;
  }
}

function removeLegacyEntry(textHash) {
  if (!textHash) return false;
  const legacy = safeReadLegacyCache();
  if (!legacy[textHash]) return false;
  try {
    delete legacy[textHash];
    const remaining = Object.keys(legacy).length;
    if (remaining === 0) {
      try {
        localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
        return true;
      } catch {
        return safeWriteLegacyCache(legacy);
      }
    }
    return safeWriteLegacyCache(legacy);
  } catch {
    return false;
  }
}

/**
 * Migra entradas desde la caché legacy (text_analysis_cache) a la caché unificada.
 * Pensado para llamarse de forma manual/opcional o en momentos no críticos.
 *
 * @param {object} options
 * @param {number} options.limit - Máximo de entradas a migrar en esta llamada.
 * @param {boolean} options.dropExpired - Si true, elimina entradas expiradas del legacy.
 * @returns {{ migrated: number, droppedExpired: number, remainingLegacy: number }}
 */
export function migrateLegacyTextAnalysisCache({ limit = 25, dropExpired = true } = {}) {
  const legacy = safeReadLegacyCache();
  const entries = Object.entries(legacy);
  if (entries.length === 0) {
    // Si ya está vacío, aseguramos que la clave legacy no exista.
    try { localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY); } catch {}
    return { migrated: 0, droppedExpired: 0, remainingLegacy: 0 };
  }

  const now = Date.now();
  let migrated = 0;
  let droppedExpired = 0;

  // Ordenar por timestamp (más antiguos primero) para limpiar de forma determinista.
  entries.sort((a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0));

  for (const [hash, entry] of entries) {
    if (migrated >= limit) break;

    const ts = entry?.timestamp || 0;
    const isExpired = ts ? (now - ts >= CACHE_CONFIG.TTL) : true;
    if (isExpired) {
      if (dropExpired) {
        delete legacy[hash];
        droppedExpired++;
      }
      continue;
    }

    const data = entry?.data;
    if (!data) {
      delete legacy[hash];
      droppedExpired++;
      continue;
    }

    // Migrar a caché unificada.
    try {
      const ok = setCachedAnalysis(hash, data);
      if (ok) {
        delete legacy[hash];
        migrated++;
      }
    } catch {
      // No bloquear la app por fallos de storage.
      break;
    }
  }

  const remainingLegacy = Object.keys(legacy).length;
  if (remainingLegacy === 0) {
    try { localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY); } catch {
      safeWriteLegacyCache(legacy);
    }
  } else {
    safeWriteLegacyCache(legacy);
  }
  return { migrated, droppedExpired, remainingLegacy };
}

/**
 * Ejecuta una migración legacy muy limitada, una sola vez por sesión (por carga de bundle).
 * Diseñado para llamarse en puntos de inicialización seguros (p.ej. montaje de hooks).
 */
export function runLegacyTextAnalysisCacheMigrationOnce({ limit = 5, dropExpired = true } = {}) {
  if (__legacyMigrationRan) return { migrated: 0, droppedExpired: 0, remainingLegacy: undefined };
  __legacyMigrationRan = true;
  try {
    return migrateLegacyTextAnalysisCache({ limit, dropExpired });
  } catch {
    return { migrated: 0, droppedExpired: 0, remainingLegacy: undefined };
  }
}

/**
 * Genera un hash único para un texto y tipo de API
 * @param {string} text - Texto a analizar
 * @param {string} apiType - Tipo de API ('openai', 'gemini', 'basico')
 * @returns {string} Hash único
 */
export const generateTextHash = (text, apiType) => {
  if (!text || text.length === 0) return `${apiType}_empty`;
  
  // Usar más caracteres para reducir colisiones
  const sampleSize = CACHE_CONFIG.SAMPLE_SIZE;
  
  // Tomar muestras del principio, medio y final del texto
  let sampleText = '';
  if (text.length <= sampleSize) {
    sampleText = text;
  } else {
    const firstPart = text.slice(0, Math.floor(sampleSize/3));
    
    const middleStart = Math.floor(text.length/2 - sampleSize/6);
    const middlePart = text.slice(middleStart, middleStart + Math.floor(sampleSize/3));
    
    const lastPart = text.slice(-Math.floor(sampleSize/3));
    sampleText = firstPart + middlePart + lastPart;
  }
  
  // Algoritmo de hash mejorado
  let hash = 0;
  for (let i = 0; i < sampleText.length; i++) {
    const char = sampleText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  
  // Factor adicional: incluir longitud exacta del texto y una muestra de caracteres específicos
  // para mejorar la unicidad del hash
  const wordCount = text.trim().split(/\s+/).length;
  const specialPositions = [50, 100, 150].map(pos => 
    pos < text.length ? text.charCodeAt(pos) : 0
  ).join('');
  
  return `${apiType}_${hash}_${text.length}_${wordCount}_${specialPositions}`;
};

/**
 * Guarda un análisis en la caché
 * @param {string} textHash - Hash del texto
 * @param {object} analysis - Objeto con el análisis a guardar
 * @returns {boolean} True si se guardó correctamente
 */
export const saveAnalysisToCache = (textHash, analysis) => {
  try {
    if (!textHash || !analysis) {
      console.warn('Intento de guardar en caché con hash o análisis vacío');
      return false;
    }

    // Guardado unificado (por entrada)
    const saved = setCachedAnalysis(textHash, analysis);

    // Acelerar vaciado de legacy: si existe la misma entrada en text_analysis_cache,
    // eliminarla para evitar duplicidad y liberar espacio. (Costo bajo y aislado.)
    if (saved) {
      try { removeLegacyEntry(textHash); } catch {}
    }

    return saved;
  } catch (error) {
    console.error('Error al guardar análisis en caché:', error);
    // Si falla el guardado en caché, simplemente continuamos sin caché
    return false;
  }
};

/**
 * Recupera un análisis desde la caché
 * @param {string} textHash - Hash del texto
 * @returns {object|null} Análisis recuperado o null si no está en caché o expiró
 */
export const getAnalysisFromCache = (textHash) => {
  try {
    if (!textHash) return null;

    // 1) Nueva caché (analysis_cache_text_*)
    const unified = getCachedAnalysis(textHash);
    if (unified) {
      console.log(`Análisis recuperado de caché unificada. Hash: ${textHash.substring(0, 20)}...`);
      return unified;
    }

    // 2) Caché legacy (text_analysis_cache) -> migración perezosa
    const cacheString = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
    let cache;
    try {
      cache = JSON.parse(cacheString);
    } catch (error) {
      console.error('Error al parsear caché legacy:', error);
      return null;
    }

    if (!cache || typeof cache !== 'object') return null;

    if (cache[textHash]) {
      const now = Date.now();
      const ts = cache[textHash]?.timestamp || 0;
      if (now - ts < CACHE_CONFIG.TTL) {
        const legacyData = cache[textHash].data;
        // Migrar a caché unificada y limpiar entrada legacy
        try {
          setCachedAnalysis(textHash, legacyData);
          delete cache[textHash];
          localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cache));
        } catch {}
        console.log(`Análisis migrado desde caché legacy. Hash: ${textHash.substring(0, 20)}...`);
        return legacyData;
      }

      // Expirado
      delete cache[textHash];
      try {
        localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cache));
      } catch (error) {
        console.error('Error al actualizar caché legacy expirada:', error);
      }
    }

    return null;
  } catch (error) {
    console.error('Error al recuperar análisis de caché:', error);
    return null;
  }
};

/**
 * Limpia toda la caché de análisis y archivos de la aplicación.
 * Busca claves que coincidan con los patrones de la aplicación.
 * @returns {{success: boolean, message?: string, error?: string}} El resultado de la operación.
 */
export const limpiarCache = () => {
  try {
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('analysis_cache_') || 
      key.startsWith('file_cache_') ||
      key === CACHE_CONFIG.STORAGE_KEY
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // También limpiar caché unificada (por si el filtro no capturó algo)
    try { clearAllAnalysisCache(); } catch {}

    const message = `Caché limpiada. Se eliminaron ${keysToRemove.length} entradas.`;
    return { success: true, message };
  } catch (error) {
    console.error('Error al limpiar la caché completa:', error);
    return { success: false, error: 'No se pudo limpiar la caché.' };
  }
};

/**
 * Obtiene estadísticas de la caché
 * @returns {object} Objeto con estadísticas de la caché
 */
export const getCacheStats = () => {
  try {
    const unifiedStats = getUnifiedCacheStats();
    let legacyEntries = 0;
    try {
      const cacheString = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
      const cache = JSON.parse(cacheString);
      legacyEntries = cache && typeof cache === 'object' ? Object.keys(cache).length : 0;
    } catch {}

    return {
      ...unifiedStats,
      legacyEntries
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de caché:', error);
    return { error: error.message };
  }
};