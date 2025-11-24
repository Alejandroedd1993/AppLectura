/**
 * Utilidades para manejo de caché de análisis de texto
 * 
 * Este módulo proporciona funciones para:
 * - Generar hashes únicos para textos
 * - Almacenar análisis en localStorage
 * - Recuperar análisis de localStorage
 * - Gestionar la expiración y límites de la caché
 */

// Configuración de caché
const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000, // Tiempo de vida: 24 horas en milisegundos
  MAX_ENTRIES: 20,          // Máximo número de entradas (aumentado de 10)
  STORAGE_KEY: 'text_analysis_cache',
  SAMPLE_SIZE: 3000         // Tamaño de muestra para generar hash (aumentado)
};

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
    
    // Obtener caché actual
    const cacheString = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
    let cache;
    try {
      cache = JSON.parse(cacheString);
    } catch (error) {
      console.error('Error al parsear caché existente:', error);
      cache = {};
    }
    
    // Añadir nuevo análisis con timestamp
    cache[textHash] = {
      timestamp: Date.now(),
      data: analysis,
      apiType: textHash.split('_')[0] || 'unknown'
    };
    
    // Podar entradas antiguas si la caché crece demasiado
    const entries = Object.entries(cache);
    if (entries.length > CACHE_CONFIG.MAX_ENTRIES) {
      // Ordenar por timestamp (más antiguos primero)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      // Eliminar entradas más antiguas
      const pruned = entries.slice(entries.length - CACHE_CONFIG.MAX_ENTRIES);
      const newCache = Object.fromEntries(pruned);
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(newCache));
      
      console.log(`Caché podada. Se eliminaron ${entries.length - CACHE_CONFIG.MAX_ENTRIES} entradas antiguas.`);
    } else {
      // Guardar caché actualizada
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cache));
    }
    
    return true;
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
    
    const cacheString = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
    let cache;
    try {
      cache = JSON.parse(cacheString);
    } catch (error) {
      console.error('Error al parsear caché:', error);
      return null;
    }
    
    // Verificar si tenemos este análisis en caché
    if (cache[textHash]) {
      // Verificar si la caché sigue siendo válida
      const now = Date.now();
      
      if (now - cache[textHash].timestamp < CACHE_CONFIG.TTL) {
        console.log(`Análisis recuperado de caché. Hash: ${textHash.substring(0, 20)}...`);
        return cache[textHash].data;
      } else {
        // Caché expirada, eliminarla
        console.log(`Caché expirada para hash: ${textHash.substring(0, 20)}...`);
        delete cache[textHash];
        try {
          localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cache));
        } catch (error) {
          console.error('Error al actualizar caché expirada:', error);
        }
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
    const cacheString = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY) || '{}';
    let cache;
    try {
      cache = JSON.parse(cacheString);
    } catch (error) {
      return { entries: 0, size: 0, error: 'Error al parsear caché' };
    }
    
    const entries = Object.keys(cache).length;
    const apiTypes = {};
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    
    // Analizar entradas
    Object.values(cache).forEach(item => {
      // Contar por tipo de API
      const apiType = item.apiType || 'unknown';
      apiTypes[apiType] = (apiTypes[apiType] || 0) + 1;
      
      // Encontrar timestamps mín/máx
      if (item.timestamp < oldestTimestamp) oldestTimestamp = item.timestamp;
      if (item.timestamp > newestTimestamp) newestTimestamp = item.timestamp;
    });
    
    // Calcular tamaño aproximado
    const size = new Blob([cacheString]).size;
    const sizeKB = Math.round(size / 1024);
    
    return {
      entries,
      size: sizeKB,
      sizeUnit: 'KB',
      distribution: apiTypes,
      oldest: new Date(oldestTimestamp).toISOString(),
      newest: new Date(newestTimestamp).toISOString()
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de caché:', error);
    return { error: error.message };
  }
};