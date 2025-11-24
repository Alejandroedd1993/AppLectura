/**
 * @file Servicio de almacenamiento local para notas de estudio
 * @module StorageService
 * @version 1.0.0
 * @description Servicio para gestionar la persistencia de datos en localStorage
 */

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

  /**
   * Genera un ID único para un texto basado en su contenido
   * @param {string} texto - Texto a procesar
   * @returns {string} ID único
   */
  generarIdTexto(texto) {
    if (!texto) return '';
    
    // Crear hash simple del contenido
    let hash = 0;
    const content = texto.substring(0, 500); // Usar muestra del texto
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    
    const timestamp = Date.now();
    return `texto_${Math.abs(hash)}_${timestamp}`;
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
      console.warn('[StorageService] localStorage no disponible:', error);
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
      console.warn('[StorageService] No se puede guardar, localStorage no disponible');
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
        console.warn('[StorageService] Datos demasiado grandes para guardar');
        return false;
      }
      
      localStorage.setItem(key, jsonString);
      console.log(`[StorageService] Datos guardados exitosamente: ${key}`);
      return true;
      
    } catch (error) {
      console.error('[StorageService] Error al guardar datos:', error);
      
      // Si es error de cuota, intentar limpiar cache antiguo
      if (error.name === 'QuotaExceededError') {
        this.cleanOldCache();
        // Intentar guardar nuevamente
        try {
          localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
          return true;
        } catch (retryError) {
          console.error('[StorageService] Error en segundo intento:', retryError);
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
      console.error(`[StorageService] Error al cargar datos para ${key}:`, error);
      return null;
    }
  }

  /**
   * Guarda el progreso de notas para un texto específico
   * @param {string} texto - Texto original
   * @param {Object} progreso - Datos de progreso (notas, cronograma, etc.)
   * @returns {boolean} True si se guardó exitosamente
   */
  guardarProgresoNotas(texto, progreso) {
    const idTexto = this.generarIdTexto(texto);
    const progresoActual = this.cargarTodoProgreso();
    
    progresoActual[idTexto] = {
      ...progreso,
      idTexto,
      textoHash: this.generarHashTexto(texto),
      ultimaActualizacion: Date.now(),
      version: '1.0.0'
    };
    
    // Limpiar entradas antiguas si hay demasiadas
    this.cleanOldEntries(progresoActual);
    
    return this.saveData(this.keys.NOTAS_PROGRESO, progresoActual);
  }

  /**
   * Carga el progreso de notas para un texto específico
   * @param {string} texto - Texto original
   * @returns {Object|null} Progreso cargado o null si no existe
   */
  cargarProgresoNotas(texto) {
    const idTexto = this.generarIdTexto(texto);
    const todoProgreso = this.cargarTodoProgreso();
    
    if (todoProgreso[idTexto]) {
      console.log(`[StorageService] Progreso cargado para texto: ${idTexto}`);
      return todoProgreso[idTexto];
    }
    
    // Buscar por hash del texto (para compatibilidad)
    const hashTexto = this.generarHashTexto(texto);
    const entradaPorHash = Object.values(todoProgreso)
      .find(entry => entry.textoHash === hashTexto);
    
    if (entradaPorHash) {
      console.log(`[StorageService] Progreso encontrado por hash: ${hashTexto}`);
      return entradaPorHash;
    }
    
    return null;
  }

  /**
   * Carga todo el progreso guardado
   * @returns {Object} Objeto con todo el progreso
   */
  cargarTodoProgreso() {
    return this.loadData(this.keys.NOTAS_PROGRESO) || {};
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
  guardarConfiguracion(config) {
    const configCompleta = {
      ...this.defaultConfig,
      ...config,
      ultimaModificacion: Date.now()
    };
    
    return this.saveData(this.keys.CONFIGURACION, configCompleta);
  }

  /**
   * Carga la configuración del usuario
   * @returns {Object} Configuración cargada
   */
  cargarConfiguracion() {
    const config = this.loadData(this.keys.CONFIGURACION);
    return config ? { ...this.defaultConfig, ...config } : this.defaultConfig;
  }

  /**
   * Guarda estadísticas de uso
   * @param {Object} stats - Estadísticas a guardar
   * @returns {boolean} True si se guardó exitosamente
   */
  guardarEstadisticas(stats) {
    const estadisticasActuales = this.cargarEstadisticas();
    const estadisticasActualizadas = {
      ...estadisticasActuales,
      ...stats,
      ultimaActualizacion: Date.now()
    };
    
    return this.saveData(this.keys.ESTADISTICAS, estadisticasActualizadas);
  }

  /**
   * Carga estadísticas de uso
   * @returns {Object} Estadísticas cargadas
   */
  cargarEstadisticas() {
    return this.loadData(this.keys.ESTADISTICAS) || {
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
    
    console.log(`[StorageService] Limpiadas ${entradas.length - entradasAMantener.length} entradas antiguas`);
  }

  /**
   * Limpia cache temporal antiguo
   */
  cleanOldCache() {
    const cache = this.loadData(this.keys.CACHE_TEMPORAL) || {};
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
      this.saveData(this.keys.CACHE_TEMPORAL, cache);
      console.log(`[StorageService] Limpiadas ${limpiezas} entradas de cache antiguas`);
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
        if (localStorage.hasOwnProperty(key)) {
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
      console.error('[StorageService] Error al obtener información de almacenamiento:', error);
      return { available: true, error: error.message };
    }
  }

  /**
   * Exporta todos los datos de notas de estudio
   * @returns {Object} Datos exportados
   */
  exportarTodosDatos() {
    return {
      progreso: this.cargarTodoProgreso(),
      configuracion: this.cargarConfiguracion(),
      estadisticas: this.cargarEstadisticas(),
      exportado: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Importa datos desde un objeto exportado
   * @param {Object} datos - Datos a importar
   * @returns {boolean} True si se importó exitosamente
   */
  importarDatos(datos) {
    try {
      let importados = 0;
      
      if (datos.progreso) {
        this.saveData(this.keys.NOTAS_PROGRESO, datos.progreso);
        importados++;
      }
      
      if (datos.configuracion) {
        this.saveData(this.keys.CONFIGURACION, datos.configuracion);
        importados++;
      }
      
      if (datos.estadisticas) {
        this.saveData(this.keys.ESTADISTICAS, datos.estadisticas);
        importados++;
      }
      
      console.log(`[StorageService] ${importados} conjuntos de datos importados exitosamente`);
      return true;
      
    } catch (error) {
      console.error('[StorageService] Error al importar datos:', error);
      return false;
    }
  }

  /**
   * Limpia todos los datos de notas de estudio
   * @returns {number} Número de elementos eliminados
   */
  limpiarTodosDatos() {
    let eliminados = 0;
    
    Object.values(this.keys).forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        eliminados++;
      }
    });
    
    console.log(`[StorageService] ${eliminados} elementos eliminados`);
    return eliminados;
  }
}

// Instancia singleton del servicio
const storageService = new StorageService();

export default storageService;
