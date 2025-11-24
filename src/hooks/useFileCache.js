import { useCallback, useState, useEffect } from 'react';
import { generateTextHash } from '../utils/cache';

/**
 * Configuración de la caché de archivos
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
 * Hook personalizado para gestionar el caché de archivos en localStorage.
 * Proporciona funciones para guardar y recuperar archivos procesados.
 * 
 * @returns {Object} Funciones y estado de la caché de archivos
 */
const useFileCache = () => {
  // Estado para métricas de caché
  const [cacheStats, setCacheStats] = useState({
    entryCount: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0
  });
  
  /**
   * Genera una clave única para el archivo
   * @param {File} file - El archivo para generar la clave
   * @returns {string|null} Clave única para el archivo o null si no es válido
   */
  const cacheKey = useCallback((file) => {
    if (!file || !(file instanceof File)) return null;
    
    // Generamos un hash único usando nombre, tamaño, tipo y fecha de modificación
    const fileIdentifier = `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
    // Usar el algoritmo de hash mejorado de cache.js
    const hash = generateTextHash(fileIdentifier, 'file');
    
    return `${CACHE_CONFIG.PREFIX}${hash}`;
  }, []);
  
  /**
   * Comprime texto si supera el umbral de tamaño
   * @param {string} texto - Texto a comprimir
   * @returns {Object} Objeto con texto (posiblemente comprimido) y flag de compresión
   */
  const comprimirTextoSiNecesario = useCallback((texto) => {
    if (!texto || texto.length < CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      return { texto, comprimido: false };
    }
    
    try {
      // Implementación básica de compresión - en producción se podría usar una librería como pako
      // Esta versión simplemente elimina espacios en blanco repetidos para textos muy grandes
      const textoComprimido = texto
        .replace(/\s+/g, ' ')       // Convertir múltiples espacios en uno
        .replace(/\n\s*\n/g, '\n'); // Convertir múltiples saltos de línea en uno
      
      console.log(`Texto comprimido: ${texto.length} -> ${textoComprimido.length} bytes`);
      return { 
        texto: textoComprimido, 
        comprimido: true,
        tamañoOriginal: texto.length
      };
    } catch (err) {
      console.warn('Error al comprimir texto:', err);
      return { texto, comprimido: false };
    }
  }, []);
  
  /**
   * Descomprime texto si fue comprimido
   * @param {Object} data - Datos de caché que pueden incluir texto comprimido
   * @returns {Object} Datos con texto descomprimido si es necesario
   */
  const descomprimirSiNecesario = useCallback((data) => {
    if (!data || !data.comprimido) return data;
    
    // En una implementación real, aquí se descomprimiría usando la misma
    // librería que se usó para comprimir
    
    console.log(`Usando texto comprimido (ahorro: ${Math.round((1 - data.texto.length/data.tamañoOriginal) * 100)}%)`);
    
    // Solo registramos que estamos usando el texto comprimido
    return data;
  }, []);
  
  /**
   * Guarda el contenido de un archivo en caché
   * @param {File} file - Archivo original
   * @param {string} texto - Contenido extraído del archivo
   * @param {Object} stats - Estadísticas del texto
   * @param {Object} metadata - Metadatos adicionales opcional
   * @returns {boolean} True si se guardó correctamente
   */
  const guardarEnCache = useCallback((file, texto, stats, metadata = {}) => {
    if (!file || !texto) return false;
    
    try {
      const key = cacheKey(file);
      if (!key) return false;

      // Comprimir texto si es muy grande
      const { texto: textoFinal, comprimido, tamañoOriginal } = comprimirTextoSiNecesario(texto);
      
      // Datos a guardar
      const cacheData = {
        texto: textoFinal,
        stats,
        metadata: {
          ...metadata,
          nombreArchivo: file.name,
          tipoArchivo: file.type,
          tamañoArchivo: file.size
        },
        timestamp: Date.now(),
        comprimido,
        ...(comprimido && { tamañoOriginal })
      };

      // Antes de guardar, verificar si la caché está cerca del límite
      const shouldPrune = verificarLimiteCache();
      if (shouldPrune) {
        podarCache();
      }

      // Guardar en localStorage
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log('Archivo guardado en caché:', file.name);
      
      // Actualizar estadísticas
      actualizarEstadisticasCache();
      
      return true;
    } catch (err) {
      console.warn('Error al guardar en caché:', err);
      
      // Si el almacenamiento está lleno, podar la caché
      if (err.name === 'QuotaExceededError') {
        console.log('Almacenamiento lleno. Realizando poda de emergencia...');
        
        try {
          // Podar más agresivamente en caso de error de cuota
          podarCache(5); // Eliminar las 5 entradas más antiguas
          
          // Reintentar la operación
          const key = cacheKey(file);
          if (key) {
            const { texto: textoComprimido } = comprimirTextoSiNecesario(texto);
            
            // En el segundo intento, omitimos estadísticas y usamos datos mínimos
            const datosMinimos = {
              texto: textoComprimido,
              timestamp: Date.now(),
              comprimido: true
            };
            
            localStorage.setItem(key, JSON.stringify(datosMinimos));
            console.log('Archivo guardado en caché (versión reducida):', file.name);
            return true;
          }
        } catch (e) {
          console.error('Error durante la poda de emergencia:', e);
        }
      }
      
      return false;
    }
  }, [cacheKey, comprimirTextoSiNecesario]);

  /**
   * Recupera el contenido de un archivo desde la caché
   * @param {File} file - Archivo a buscar en caché
   * @returns {Object|null} Datos cacheados o null si no existe o expiró
   */
  const obtenerDeCache = useCallback((file) => {
    if (!file) return null;

    try {
      const key = cacheKey(file);
      if (!key) return null;

      const cachedDataStr = localStorage.getItem(key);
      if (!cachedDataStr) {
        // Caché miss
        setCacheStats(prev => ({...prev, missCount: prev.missCount + 1}));
        return null;
      }

      const data = JSON.parse(cachedDataStr);

      // Validar si la caché ha expirado
      if (Date.now() - data.timestamp > CACHE_CONFIG.TTL) {
        localStorage.removeItem(key);
        setCacheStats(prev => ({...prev, missCount: prev.missCount + 1}));
        return null;
      }

      // Descomprimir si es necesario
      const finalData = descomprimirSiNecesario(data);
      
      console.log('Archivo recuperado de caché:', file.name);
      // Caché hit
      setCacheStats(prev => ({...prev, hitCount: prev.hitCount + 1}));
      
      return finalData;
    } catch (err) {
      console.warn('Error al recuperar de caché:', err);
      setCacheStats(prev => ({...prev, missCount: prev.missCount + 1}));
      return null;
    }
  }, [cacheKey, descomprimirSiNecesario]);
  
  /**
   * Elimina una entrada específica de la caché
   * @param {File} file - Archivo cuya caché se quiere invalidar
   * @returns {boolean} True si se eliminó correctamente
   */
  const invalidarCache = useCallback((file) => {
    if (!file) return false;
    
    try {
      const key = cacheKey(file);
      if (!key) return false;
      
      const existeEnCache = localStorage.getItem(key) !== null;
      if (existeEnCache) {
        localStorage.removeItem(key);
        actualizarEstadisticasCache();
        console.log('Caché invalidada para:', file.name);
        return true;
      }
      
      return false;
    } catch (err) {
      console.warn('Error al invalidar caché:', err);
      return false;
    }
  }, [cacheKey]);
  
  /**
   * Verifica si la caché está cerca de su límite
   * @returns {boolean} True si la caché necesita ser podada
   */
  const verificarLimiteCache = useCallback(() => {
    try {
      let count = 0;
      let totalSize = 0;
      
      // Contar entradas y tamaño total
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_CONFIG.PREFIX)) {
          count++;
          const size = localStorage.getItem(key).length * 2; // Aproximadamente 2 bytes por carácter
          totalSize += size;
        }
      }
      
      // Convertir a MB
      const totalSizeMB = totalSize / (1024 * 1024);
      
      // Actualizar estadísticas
      setCacheStats(prev => ({
        ...prev, 
        entryCount: count,
        totalSize: totalSizeMB
      }));
      
      // Verificar si excede algún límite
      return count > CACHE_CONFIG.MAX_ENTRIES || totalSizeMB > CACHE_CONFIG.MAX_SIZE_MB;
    } catch (err) {
      console.warn('Error al verificar límites de caché:', err);
      return false;
    }
  }, []);
  
  /**
   * Poda la caché eliminando las entradas más antiguas
   * @param {number} numEntries - Número de entradas a eliminar (por defecto 3)
   */
  const podarCache = useCallback((numEntries = 3) => {
    try {
      // Recopilar todas las entradas de caché con sus timestamps
      const entries = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_CONFIG.PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            entries.push({
              key,
              timestamp: data.timestamp || 0
            });
          } catch (e) {
            // Si hay un error al parsear, consideramos esta entrada como candidata a eliminar
            entries.push({
              key,
              timestamp: 0 // Prioridad máxima para eliminar
            });
          }
        }
      }
      
      // Ordenar por antigüedad (más antiguos primero)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Eliminar las entradas más antiguas
      const entriesToRemove = Math.min(numEntries, entries.length);
      for (let i = 0; i < entriesToRemove; i++) {
        localStorage.removeItem(entries[i].key);
        console.log(`Caché podada: ${entries[i].key}`);
      }
      
      // Actualizar estadísticas
      actualizarEstadisticasCache();
      
      return entriesToRemove;
    } catch (err) {
      console.error('Error durante la poda de caché:', err);
      return 0;
    }
  }, []);
  
  /**
   * Limpia toda la caché de archivos
   * @returns {number} Número de entradas eliminadas
   */
  const limpiarCache = useCallback(() => {
    try {
      let count = 0;
      const keysToRemove = [];
      
      // Recopilar todas las claves de caché de archivos
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_CONFIG.PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      // Eliminar todas las entradas
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        count++;
      });
      
      // Actualizar estadísticas
      setCacheStats({
        entryCount: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0
      });
      
      console.log(`Caché de archivos limpiada: ${count} entradas eliminadas`);
      return count;
    } catch (err) {
      console.error('Error al limpiar caché:', err);
      return 0;
    }
  }, []);
  
  /**
   * Actualiza las estadísticas de la caché
   */
  const actualizarEstadisticasCache = useCallback(() => {
    try {
      let count = 0;
      let totalSize = 0;
      
      // Contar entradas y tamaño total
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_CONFIG.PREFIX)) {
          count++;
          const size = localStorage.getItem(key).length * 2; // Aproximadamente 2 bytes por carácter
          totalSize += size;
        }
      }
      
      // Actualizar estadísticas manteniendo contadores de hits/misses
      setCacheStats(prev => ({
        ...prev,
        entryCount: count,
        totalSize: totalSize / (1024 * 1024) // Convertir a MB
      }));
    } catch (err) {
      console.warn('Error al actualizar estadísticas de caché:', err);
    }
  }, []);
  
  // Efecto para limpiar caché automáticamente
  useEffect(() => {
    // Verificar última limpieza
    try {
      const lastCleanup = localStorage.getItem('file_cache_last_cleanup');
      const now = Date.now();
      
      if (!lastCleanup || (now - parseInt(lastCleanup, 10)) > CACHE_CONFIG.CLEANUP_INTERVAL) {
        // Si ha pasado el tiempo de intervalo, realizar limpieza automática
        console.log('Realizando limpieza automática de caché...');
        verificarLimiteCache();
        
        if (cacheStats.entryCount > CACHE_CONFIG.MAX_ENTRIES / 2) {
          // Si hay muchas entradas, podar las más antiguas
          podarCache(Math.ceil(cacheStats.entryCount * 0.2)); // Eliminar 20% de las entradas
        }
        
        // Registrar la fecha de limpieza
        localStorage.setItem('file_cache_last_cleanup', now.toString());
      }
      
      // Actualizar estadísticas al montar
      actualizarEstadisticasCache();
    } catch (err) {
      console.warn('Error en limpieza automática de caché:', err);
    }
  }, [podarCache, verificarLimiteCache, actualizarEstadisticasCache, cacheStats.entryCount]);

  return { 
    obtenerDeCache, 
    guardarEnCache, 
    invalidarCache,
    limpiarCache,
    cacheStats,
    verificarLimiteCache,
    podarCache
  };
};

export default useFileCache;