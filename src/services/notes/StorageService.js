/**
 * @file Servicio de almacenamiento local para notas de estudio
 * @module StorageService
 * @version 1.0.0
 * @description Servicio para gestionar la persistencia de datos en localStorage
 */

import logger from '../../utils/logger';

/**
 * Servicio de Almacenamiento Local
 * Maneja la persistencia de notas, cronogramas y configuración
 */
class StorageService {
  constructor() {
    // Claves de almacenamiento
    this.keys = {
      NOTAS_PROGRESO: 'notas_estudio_progreso',
      CONFIGURACION: 'notas_estudio_config',
      CACHE_TEMPORAL: 'notas_estudio_cache',
      API_KEY: 'user_openai_api_key',
      ESTADISTICAS: 'notas_estudio_stats'
    };
    
    // Configuración por defecto
    this.defaultConfig = {
      tipoTexto: 'auto',
      duracionEstudio: 30,
      numeroTarjetas: 5,
      notificaciones: true,
      modoOscuro: false,
      autoguardado: true
    };
    
    // Límites de almacenamiento
    this.limits = {
      MAX_ENTRIES: 50, // Máximo número de textos guardados
      MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 días en millisegundos
      MAX_STORAGE_SIZE: 5 * 1024 * 1024 // 5MB en bytes
    };
  }

  resolveUserKey(baseKey, userId = null) {
    if (!userId) return baseKey;
    return `${baseKey}:${userId}`;
  }

  migrateLegacyKeyIfNeeded(baseKey, userId = null) {
    if (!userId) return;

    const scopedKey = this.resolveUserKey(baseKey, userId);
    try {
      if (!localStorage.getItem(scopedKey) && localStorage.getItem(baseKey)) {
        const legacyRaw = localStorage.getItem(baseKey);
        localStorage.setItem(scopedKey, legacyRaw);
        localStorage.removeItem(baseKey);
        logger.log(`[StorageService] Migrada clave legacy ${baseKey} -> ${scopedKey}`);
      }
    } catch (e) {
      logger.warn('[StorageService] No se pudo migrar clave legacy:', e);
    }
  }

  /**
   * Genera un ID único para un texto basado en su contenido
   * @param {string} texto - Texto a procesar
   * @returns {string} ID único
   */
  generarIdTexto(texto) {
    if (!texto) return '';
    
    // Crear hash simple del contenido con muestras de inicio y fin
    let hash = 0;
    const head = texto.substring(0, 1000);
    const tail = texto.substring(Math.max(0, texto.length - 1000));
    const content = `${head}::${tail}::${texto.length}`;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    
    // ⚠️ IMPORTANTE: debe ser estable para poder cargar/guardar de forma consistente.
    // (Si falta textoId, este ID es solo fallback legacy.)
    return `texto_${Math.abs(hash)}`;
  }

  /**
   * Verifica si localStorage está disponible
   * @returns {boolean} True si localStorage está disponible
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      logger.warn('[StorageService] localStorage no disponible:', error);
      return false;
    }
  }

  /**
   * Guarda datos de forma segura en localStorage
   * @param {string} key - Clave de almacenamiento
   * @param {any} data - Datos a guardar
   * @returns {boolean} True si se guardó exitosamente
   */
  saveData(key, data) {
    if (!this.isStorageAvailable()) {
      logger.warn('[StorageService] No se puede guardar, localStorage no disponible');
      return false;
    }

    try {
      const dataToSave = {
        data,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      const jsonString = JSON.stringify(dataToSave);
      
      // Verificar límite de tamaño
      if (jsonString.length > this.limits.MAX_STORAGE_SIZE) {
        logger.warn('[StorageService] Datos demasiado grandes para guardar');
        return false;
      }
      
      localStorage.setItem(key, jsonString);
      logger.log(`[StorageService] Datos guardados exitosamente: ${key}`);
      return true;
      
    } catch (error) {
      logger.error('[StorageService] Error al guardar datos:', error);
      
      // Si es error de cuota, intentar limpiar cache antiguo
      if (error.name === 'QuotaExceededError') {
        this.cleanOldCache();
        // Intentar guardar nuevamente
        try {
          localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
          return true;
        } catch (retryError) {
          logger.error('[StorageService] Error en segundo intento:', retryError);
        }
      }
      
      return false;
    }
  }

  /**
   * Carga datos desde localStorage
   * @param {string} key - Clave de almacenamiento
   * @returns {any} Datos cargados o null si no existen
   */
  loadData(key) {
    if (!this.isStorageAvailable()) {
      return null;
    }

    try {
      const jsonString = localStorage.getItem(key);
      if (!jsonString) {
        return null;
      }

      const parsedData = JSON.parse(jsonString);
      
      // Verificar si tiene el formato nuevo con metadata
      if (parsedData.data !== undefined && parsedData.timestamp !== undefined) {
        return parsedData.data;
      }
      
      // Formato antiguo, devolver directamente
      return parsedData;
      
    } catch (error) {
      logger.error(`[StorageService] Error al cargar datos para ${key}:`, error);
      return null;
    }
  }

  /**
   * Guarda el progreso de notas para un texto específico
   * @param {string} texto - Texto original
   * @param {Object} progreso - Datos de progreso (notas, cronograma, etc.)
   * @returns {boolean} True si se guardó exitosamente
   */
  guardarProgresoNotas(texto, progreso, textoId = null, userId = null) {
    const idTexto = textoId || this.generarIdTexto(texto);
    const progresoActual = this.cargarTodoProgreso(userId);
    
    progresoActual[idTexto] = {
      ...progreso,
      idTexto,
      textoId: textoId || idTexto,
      textoHash: this.generarHashTexto(texto),
      ultimaActualizacion: Date.now(),
      version: '1.0.0'
    };
    
    // Limpiar entradas antiguas si hay demasiadas
    this.cleanOldEntries(progresoActual);
    
    const storageKey = this.resolveUserKey(this.keys.NOTAS_PROGRESO, userId);
    return this.saveData(storageKey, progresoActual);
  }

  /**
   * Carga el progreso de notas para un texto específico
   * @param {string} texto - Texto original
   * @returns {Object|null} Progreso cargado o null si no existe
   */
  cargarProgresoNotas(texto, textoId = null, userId = null) {
    const idTexto = textoId || this.generarIdTexto(texto);
    const todoProgreso = this.cargarTodoProgreso(userId);
    
    if (todoProgreso[idTexto]) {
      logger.log(`[StorageService] Progreso cargado para texto: ${idTexto}`);
      return todoProgreso[idTexto];
    }
    
    // Buscar por hash del texto (para compatibilidad)
    const hashTexto = this.generarHashTexto(texto);
    const entradaPorHash = Object.values(todoProgreso)
      .find(entry => entry.textoHash === hashTexto);
    
    if (entradaPorHash) {
      logger.log(`[StorageService] Progreso encontrado por hash: ${hashTexto}`);

      // 🧩 FASE 5: si ahora tenemos textoId estable, migrar la entrada (sin perder legacy)
      if (textoId && !todoProgreso[textoId]) {
        try {
          todoProgreso[textoId] = {
            ...entradaPorHash,
            idTexto: textoId,
            textoId
          };
          this.cleanOldEntries(todoProgreso);
          const storageKey = this.resolveUserKey(this.keys.NOTAS_PROGRESO, userId);
          this.saveData(storageKey, todoProgreso);
          return todoProgreso[textoId];
        } catch (e) {
          logger.warn('[StorageService] No se pudo migrar progreso a textoId:', e);
        }
      }
      return entradaPorHash;
    }
    
    return null;
  }

  /**
   * Carga todo el progreso guardado
   * @returns {Object} Objeto con todo el progreso
   */
  cargarTodoProgreso(userId = null) {
    this.migrateLegacyKeyIfNeeded(this.keys.NOTAS_PROGRESO, userId);
    const storageKey = this.resolveUserKey(this.keys.NOTAS_PROGRESO, userId);
    return this.loadData(storageKey) || {};
  }

  /**
   * Genera hash del texto para comparación
   * @param {string} texto - Texto a procesar
   * @returns {string} Hash del texto
   */
  generarHashTexto(texto) {
    if (!texto) return '';
    
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Guarda la configuración del usuario
   * @param {Object} config - Configuración a guardar
   * @returns {boolean} True si se guardó exitosamente
   */
  guardarConfiguracion(config, userId = null) {
    const configCompleta = {
      ...this.defaultConfig,
      ...config,
      ultimaModificacion: Date.now()
    };

    const storageKey = this.resolveUserKey(this.keys.CONFIGURACION, userId);
    return this.saveData(storageKey, configCompleta);
  }

  /**
   * Carga la configuración del usuario
   * @returns {Object} Configuración cargada
   */
  cargarConfiguracion(userId = null) {
    this.migrateLegacyKeyIfNeeded(this.keys.CONFIGURACION, userId);
    const storageKey = this.resolveUserKey(this.keys.CONFIGURACION, userId);
    const config = this.loadData(storageKey);
    return config ? { ...this.defaultConfig, ...config } : this.defaultConfig;
  }

  /**
   * Guarda estadísticas de uso
   * @param {Object} stats - Estadísticas a guardar
   * @returns {boolean} True si se guardó exitosamente
   */
  guardarEstadisticas(stats, userId = null) {
    const estadisticasActuales = this.cargarEstadisticas(userId);
    const estadisticasActualizadas = {
      ...estadisticasActuales,
      ...stats,
      ultimaActualizacion: Date.now()
    };

    const storageKey = this.resolveUserKey(this.keys.ESTADISTICAS, userId);
    return this.saveData(storageKey, estadisticasActualizadas);
  }

  /**
   * Carga estadísticas de uso
   * @returns {Object} Estadísticas cargadas
   */
  cargarEstadisticas(userId = null) {
    this.migrateLegacyKeyIfNeeded(this.keys.ESTADISTICAS, userId);
    const storageKey = this.resolveUserKey(this.keys.ESTADISTICAS, userId);
    return this.loadData(storageKey) || {
      textosAnalizados: 0,
      notasGeneradas: 0,
      repasosCompletados: 0,
      tiempoTotalEstudio: 0
    };
  }

  /**
   * Limpia entradas antiguas para no exceder límites
   * @param {Object} progreso - Objeto de progreso
   */
  cleanOldEntries(progreso) {
    const entradas = Object.entries(progreso);
    
    if (entradas.length <= this.limits.MAX_ENTRIES) {
      return;
    }
    
    // Ordenar por fecha de actualización y mantener solo las más recientes
    const entradasOrdenadas = entradas.sort((a, b) => {
      const timestampA = a[1].ultimaActualizacion || 0;
      const timestampB = b[1].ultimaActualizacion || 0;
      return timestampB - timestampA;
    });
    
    const entradasAMantener = entradasOrdenadas.slice(0, this.limits.MAX_ENTRIES);
    
    // Limpiar el objeto original
    Object.keys(progreso).forEach(key => delete progreso[key]);
    
    // Agregar solo las entradas que se mantienen
    entradasAMantener.forEach(([key, value]) => {
      progreso[key] = value;
    });
    
    logger.log(`[StorageService] Limpiadas ${entradas.length - entradasAMantener.length} entradas antiguas`);
  }

  /**
   * Limpia cache temporal antiguo
   */
  cleanOldCache(userId = null) {
    this.migrateLegacyKeyIfNeeded(this.keys.CACHE_TEMPORAL, userId);
    const storageKey = this.resolveUserKey(this.keys.CACHE_TEMPORAL, userId);
    const cache = this.loadData(storageKey) || {};
    const ahora = Date.now();
    let limpiezas = 0;
    
    Object.keys(cache).forEach(key => {
      const entrada = cache[key];
      if (entrada.timestamp && (ahora - entrada.timestamp > this.limits.MAX_CACHE_AGE)) {
        delete cache[key];
        limpiezas++;
      }
    });
    
    if (limpiezas > 0) {
      this.saveData(storageKey, cache);
      logger.log(`[StorageService] Limpiadas ${limpiezas} entradas de cache antiguas`);
    }
    
    return limpiezas;
  }

  /**
   * Obtiene información sobre el uso del almacenamiento
   * @returns {Object} Información de uso
   */
  getStorageInfo() {
    if (!this.isStorageAvailable()) {
      return { available: false };
    }

    let totalSize = 0;
    let itemCount = 0;
    const items = {};

    try {
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          const item = localStorage.getItem(key);
          const size = item ? item.length : 0;
          totalSize += size;
          itemCount++;
          
          if (key.startsWith('notas_estudio_')) {
            items[key] = {
              size,
              sizeKB: Math.round(size / 1024 * 100) / 100
            };
          }
        }
      }

      return {
        available: true,
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        itemCount,
        notasEstudioItems: items,
        limiteUtilizado: Math.round((totalSize / this.limits.MAX_STORAGE_SIZE) * 100)
      };
      
    } catch (error) {
      logger.error('[StorageService] Error al obtener información de almacenamiento:', error);
      return { available: true, error: error.message };
    }
  }

  /**
   * Exporta todos los datos de notas de estudio
   * @returns {Object} Datos exportados
   */
  exportarTodosDatos(userId = null) {
    return {
      progreso: this.cargarTodoProgreso(userId),
      configuracion: this.cargarConfiguracion(userId),
      estadisticas: this.cargarEstadisticas(userId),
      exportado: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Importa datos desde un objeto exportado
   * @param {Object} datos - Datos a importar
   * @returns {boolean} True si se importó exitosamente
   */
  importarDatos(datos, userId = null) {
    try {
      let importados = 0;
      
      if (datos.progreso) {
        const storageKey = this.resolveUserKey(this.keys.NOTAS_PROGRESO, userId);
        this.saveData(storageKey, datos.progreso);
        importados++;
      }
      
      if (datos.configuracion) {
        const storageKey = this.resolveUserKey(this.keys.CONFIGURACION, userId);
        this.saveData(storageKey, datos.configuracion);
        importados++;
      }
      
      if (datos.estadisticas) {
        const storageKey = this.resolveUserKey(this.keys.ESTADISTICAS, userId);
        this.saveData(storageKey, datos.estadisticas);
        importados++;
      }
      
      logger.log(`[StorageService] ${importados} conjuntos de datos importados exitosamente`);
      return true;
      
    } catch (error) {
      logger.error('[StorageService] Error al importar datos:', error);
      return false;
    }
  }

  /**
   * Limpia todos los datos de notas de estudio
   * @returns {number} Número de elementos eliminados
   */
  limpiarTodosDatos(userId = null) {
    let eliminados = 0;

    Object.values(this.keys).forEach(baseKey => {
      const key = this.resolveUserKey(baseKey, userId);
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        eliminados++;
      }
    });
    
    logger.log(`[StorageService] ${eliminados} elementos eliminados`);
    return eliminados;
  }
}

// Instancia singleton del servicio
const storageService = new StorageService();

export default storageService;
