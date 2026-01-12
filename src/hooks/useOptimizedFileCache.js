import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { generateTextHash } from '../utils/cache';

/**
 * Configuración optimizada de la caché de archivos
 */
const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000,             // 24 horas en milisegundos
  CLEANUP_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Limpiar caché cada 7 días
  PREFIX: 'file_cache_',                 // Prefijo para claves de caché
  MAX_ENTRIES: 25,                       // Máximo número de entradas en caché
  MAX_SIZE_MB: 50,                       // Tamaño máximo aproximado de la caché en MB
  COMPRESSION_THRESHOLD: 100000          // Comprimir textos mayores a 100KB
};

/**
 * Hook optimizado para gestionar el caché de archivos con mejores técnicas de performance.
 * Utiliza memoización, debouncing y optimizaciones para minimizar re-renders.
 * 
 * @returns {Object} Funciones y estado de la caché de archivos
 */
const useOptimizedFileCache = () => {
  // Estado para métricas de caché - solo se actualiza cuando es necesario
  const [cacheStats, setCacheStats] = useState({
    entryCount: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0
  });

  // Ref para evitar re-cálculos innecesarios
  const statsUpdateTimeoutRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  /**
   * OPTIMIZADO: Función memoizada para comprimir texto si es necesario
   */
  const compressText = useMemo(() => {
    return (text) => {
      if (text.length > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
        try {
          // Compresión simple basada en frecuencia de caracteres
          const compressed = text.replace(/\s+/g, ' ').trim();
          return compressed;
        } catch (error) {
          console.warn('Error comprimiendo texto:', error);
          return text;
        }
      }
      return text;
    };
  }, []);

  /**
   * OPTIMIZADO: Función debounced para actualizar estadísticas
   */
  const updateStatsDebounced = useCallback(() => {
    if (statsUpdateTimeoutRef.current) {
      clearTimeout(statsUpdateTimeoutRef.current);
    }

    statsUpdateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 1000) return; // Máximo cada segundo

      try {
        let entryCount = 0;
        let totalSize = 0;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
            entryCount++;
            const item = localStorage.getItem(key);
            if (item) {
              totalSize += item.length;
            }
          }
        }

        setCacheStats(prevStats => {
          // Solo actualizar si hay cambios significativos
          if (prevStats.entryCount !== entryCount || 
              Math.abs(prevStats.totalSize - totalSize) > 1000) {
            return {
              ...prevStats,
              entryCount,
              totalSize
            };
          }
          return prevStats;
        });

        lastUpdateTimeRef.current = now;
      } catch (error) {
        console.warn('Error actualizando estadísticas de caché:', error);
      }
    }, 250); // Debounce de 250ms
  }, []);

  /**
   * OPTIMIZADO: Obtener archivo de caché con memoización
   */
  const obtenerDeCache = useCallback((fileName, fileSize) => {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX}${generateTextHash(fileName + fileSize)}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        setCacheStats(prev => ({ ...prev, missCount: prev.missCount + 1 }));
        return null;
      }

      const parsedData = JSON.parse(cached);
      const now = Date.now();

      // Verificar TTL
      if (now - parsedData.timestamp > CACHE_CONFIG.TTL) {
        localStorage.removeItem(cacheKey);
        setCacheStats(prev => ({ ...prev, missCount: prev.missCount + 1 }));
        return null;
      }

      setCacheStats(prev => ({ ...prev, hitCount: prev.hitCount + 1 }));
      return parsedData.data;
    } catch (error) {
      console.warn('Error obteniendo de caché:', error);
      setCacheStats(prev => ({ ...prev, missCount: prev.missCount + 1 }));
      return null;
    }
  }, []);

  /**
   * OPTIMIZADO: Guardar archivo en caché con compresión inteligente
   */
  const guardarEnCache = useCallback((fileName, fileSize, data) => {
    let cacheKey;
    let compressedData;
    try {
      cacheKey = `${CACHE_CONFIG.PREFIX}${generateTextHash(fileName + fileSize)}`;
      
      // Comprimir texto si es necesario
      compressedData = {
        ...data,
        content: compressText(data.content || ''),
        timestamp: Date.now()
      };

      const serializedData = JSON.stringify(compressedData);
      
      // Verificar si hay espacio
      const estimatedSize = serializedData.length;
      if (estimatedSize > CACHE_CONFIG.MAX_SIZE_MB * 1024 * 1024 * 0.1) {
        console.warn('Archivo muy grande para caché:', fileName);
        return false;
      }

      localStorage.setItem(cacheKey, serializedData);
      updateStatsDebounced();
      
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('Cuota de localStorage excedida, limpiando caché...');
        limpiarCacheAntiguo();
        // Intentar guardar de nuevo
        try {
          if (!cacheKey || !compressedData) return false;
          localStorage.setItem(cacheKey, JSON.stringify(compressedData));
          updateStatsDebounced();
          return true;
        } catch (retryError) {
          console.error('Error guardando en caché después de limpieza:', retryError);
          return false;
        }
      }
      console.warn('Error guardando en caché:', error);
      return false;
    }
  }, [compressText, updateStatsDebounced]);

  /**
   * OPTIMIZADO: Limpieza inteligente de caché antiguo
   */
  const limpiarCacheAntiguo = useCallback(() => {
    try {
      const cacheEntries = [];
      
      // Recopilar entradas de caché
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            const parsed = JSON.parse(item);
            cacheEntries.push({
              key,
              timestamp: parsed.timestamp,
              size: item.length
            });
          } catch (e) {
            // Remover entradas corruptas
            localStorage.removeItem(key);
          }
        }
      }

      // Ordenar por antigüedad y eliminar las más viejas
      cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
      
      const entriesToRemove = Math.ceil(cacheEntries.length * 0.3); // Remover 30%
      for (let i = 0; i < entriesToRemove; i++) {
        localStorage.removeItem(cacheEntries[i].key);
      }

      updateStatsDebounced();
      console.log(`Caché limpiada: ${entriesToRemove} entradas removidas`);
    } catch (error) {
      console.warn('Error limpiando caché:', error);
    }
  }, [updateStatsDebounced]);

  /**
   * OPTIMIZADO: Invalidar entrada específica
   */
  const invalidarCache = useCallback((fileName, fileSize) => {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX}${generateTextHash(fileName + fileSize)}`;
      const existed = localStorage.getItem(cacheKey) !== null;
      localStorage.removeItem(cacheKey);
      
      if (existed) {
        updateStatsDebounced();
      }
      
      return existed;
    } catch (error) {
      console.warn('Error invalidando caché:', error);
      return false;
    }
  }, [updateStatsDebounced]);

  /**
   * OPTIMIZADO: Limpiar toda la caché
   */
  const limpiarCache = useCallback(() => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      setCacheStats({
        entryCount: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0
      });

      console.log(`Caché completamente limpiada: ${keysToRemove.length} entradas removidas`);
    } catch (error) {
      console.warn('Error limpiando caché completa:', error);
    }
  }, []);

  // Efecto para inicialización y limpieza automática
  useEffect(() => {
    updateStatsDebounced();

    // Cleanup al desmontar
    return () => {
      if (statsUpdateTimeoutRef.current) {
        clearTimeout(statsUpdateTimeoutRef.current);
      }
    };
  }, [updateStatsDebounced]);

  // Memoizar las funciones retornadas para evitar re-renders
  return useMemo(() => ({
    obtenerDeCache,
    guardarEnCache,
    invalidarCache,
    limpiarCache,
    limpiarCacheAntiguo,
    cacheStats
  }), [
    obtenerDeCache,
    guardarEnCache, 
    invalidarCache,
    limpiarCache,
    limpiarCacheAntiguo,
    cacheStats
  ]);
};

export default useOptimizedFileCache;
