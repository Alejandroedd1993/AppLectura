import logger from './logger';


/**
 * Script de migración de datos de actividades
 * Migra de useActivityPersistence (activity_results_*) → AppContext (activitiesProgress)
 * 
 * Ejecutar una sola vez al cargar la app para usuarios existentes
 */

const ACTIVITY_PREFIX = 'activity_results_';
const DEFAULT_NEW_KEY = 'activitiesProgress';

/**
 * Migra datos de persistencia antigua a nuevo formato
 *
 * Nota: el destino puede ser por-usuario (p.ej. activitiesProgress_<uid>)
 * para evitar contaminación entre cuentas.
 *
 * @param {object} [options]
 * @param {string} [options.storageKey] - Key destino en localStorage
 * @returns {object} - { migrated: number, errors: number, data: object }
 */
export function migrateActivityDataToContext(options = {}) {
  try {
    logger.log('🔄 [Migration] Iniciando migración de datos de actividades...');

    const storageKey = options?.storageKey || DEFAULT_NEW_KEY;
    
    // 1. Obtener todas las claves de activity_results_
    const activityKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(ACTIVITY_PREFIX));
    
    if (activityKeys.length === 0) {
      logger.log('ℹ️ [Migration] No hay datos antiguos para migrar');
      return { migrated: 0, errors: 0, data: {} };
    }
    
    logger.log(`📊 [Migration] Encontrados ${activityKeys.length} documentos a migrar`);
    
    // 2. Cargar activitiesProgress actual (puede estar vacío)
    let activitiesProgress = {};
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        activitiesProgress = JSON.parse(existing);
      }
    } catch (e) {
      logger.warn('⚠️ [Migration] Error cargando activitiesProgress existente:', e);
    }
    
    let migrated = 0;
    let errors = 0;
    
    // 3. Migrar cada documento
    activityKeys.forEach(key => {
      try {
        const documentId = key.replace(ACTIVITY_PREFIX, '');
        const raw = localStorage.getItem(key);
        const oldData = JSON.parse(raw);
        
        // Extraer datos relevantes
        const studentAnswers = oldData.data?.student_answers || {};
        const mcqData = studentAnswers.mcq;
        const synthesisData = studentAnswers.synthesis;
        
        // Construir nuevo formato
        const newFormat = {
          preparation: {
            mcqPassed: mcqData?.passed || false,
            mcqResults: mcqData || null,
            completed: !!synthesisData, // Si tiene síntesis → completado
            synthesisAnswers: synthesisData || null,
            migratedFrom: 'useActivityPersistence',
            migratedAt: Date.now()
          }
        };
        
        // Guardar en activitiesProgress
        activitiesProgress[documentId] = newFormat;
        
        logger.log(`✅ [Migration] Migrado documento: ${documentId}`);
        migrated++;
        
        // Opcional: Eliminar dato antiguo (comentar si quieres mantener backup)
        // localStorage.removeItem(key);
        
      } catch (error) {
        logger.error(`❌ [Migration] Error migrando ${key}:`, error);
        errors++;
      }
    });
    
    // 4. Guardar activitiesProgress actualizado
    localStorage.setItem(storageKey, JSON.stringify(activitiesProgress));
    
    logger.log(`✅ [Migration] Migración completada: ${migrated} exitosos, ${errors} errores`);
    
    return {
      migrated,
      errors,
      data: activitiesProgress
    };
    
  } catch (error) {
    logger.error('❌ [Migration] Error fatal en migración:', error);
    return { migrated: 0, errors: 1, data: {} };
  }
}

/**
 * Limpia datos antiguos de activity_results_ después de confirmar migración
 * @returns {number} - Cantidad de entradas eliminadas
 */
export function cleanupOldActivityData() {
  try {
    const activityKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(ACTIVITY_PREFIX));
    
    activityKeys.forEach(key => localStorage.removeItem(key));
    
    // También limpiar el índice
    localStorage.removeItem(`${ACTIVITY_PREFIX}index`);
    
    logger.log(`🗑️ [Migration] ${activityKeys.length} entradas antiguas eliminadas`);
    
    return activityKeys.length;
    
  } catch (error) {
    logger.error('❌ [Migration] Error limpiando datos antiguos:', error);
    return 0;
  }
}

/**
 * Verifica si hay datos pendientes de migración
 * @returns {boolean}
 */
export function hasPendingMigration() {
  const activityKeys = Object.keys(localStorage)
    .filter(key => key.startsWith(ACTIVITY_PREFIX));
  
  return activityKeys.length > 0;
}
