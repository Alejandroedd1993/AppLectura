/**
 * Hook de persistencia mejorada para Actividades
 * 
 * Diferencias con useAnalysisPersistence:
 * - Usa document_id de completeAnalysis.metadata (más robusto que hash de texto)
 * - Añade métricas de progreso (intentos, tiempo, puntuaciones)
 * - Versionado de datos para migración futura
 * - Manejo de múltiples documentos con límite de almacenamiento
 * - 🆕 Aislamiento por curso usando courseId
 */

import { useEffect, useRef, useCallback } from 'react';

import logger from '../utils/logger';
const STORAGE_KEY_PREFIX = 'activity_results_';
const VERSION = '1.1'; // Incrementado por cambio en estructura de claves
const MAX_STORED_DOCUMENTS = 15; // Límite de documentos almacenados
const TTL_DAYS = 30; // Tiempo de vida: 30 días

/**
 * useActivityPersistence
 * @param {string|null} documentId - ID único del documento (de completeAnalysis.metadata.document_id)
 * @param {object} options
 *  - enabled: boolean para permitir guardado
 *  - courseId: ID del curso para aislar datos entre cursos (opcional)
 *  - studentAnswers: objeto con respuestas { [questionIndex]: text }
 *  - aiFeedbacks: objeto con feedbacks { [questionIndex]: feedback }
 *  - criterionFeedbacks: objeto con feedbacks por criterio
 *  - currentIndex: índice actual de pregunta
 *  - onRehydrate: fn(data) llamada cuando hay datos guardados
 * @returns {object} - { saveManual, clearResults, getMetrics }
 */
export default function useActivityPersistence(documentId, options = {}) {
  const {
    enabled = true,
    courseId = null, // 🆕 ID del curso para aislar datos
    legacyDocumentIds = [], // 🆕 Migración: ids anteriores para buscar/recuperar datos legacy
    studentAnswers = {},
    aiFeedbacks = {},
    criterionFeedbacks = {},
    currentIndex = 0,
    onRehydrate
  } = options;

  const lastDocIdRef = useRef(null);
  const hasRehydratedRef = useRef(false);

  // Mantener siempre una referencia al último saveResults (para flush en unmount sin re-ejecutar efectos)
  const latestSaveRef = useRef(null);

  /**
   * Genera la clave de storage para este documento
   * 🆕 Incluye courseId para aislar datos entre cursos
   */
  const getStorageKey = useCallback((docId) => {
    if (!docId) return null;
    // Si hay courseId, incluirlo en la clave para aislar por curso
    if (courseId) {
      return `${STORAGE_KEY_PREFIX}${courseId}_${docId}`;
    }
    // Fallback a solo docId (para compatibilidad con datos antiguos)
    return `${STORAGE_KEY_PREFIX}${docId}`;
  }, [courseId]);

  /**
   * Calcula métricas de progreso
   */
  const calculateMetrics = useCallback(() => {
    const totalQuestions = Math.max(
      ...Object.keys(studentAnswers).map(k => parseInt(k, 10)),
      -1
    ) + 1;

    const answeredCount = Object.values(studentAnswers).filter(a => {
      if (!a) return false;
      // Manejar tanto strings como objetos
      if (typeof a === 'string') {
        return a.trim().length > 0;
      }
      if (typeof a === 'object') {
        return Object.values(a).some(v => v && String(v).trim().length > 0);
      }
      return false;
    }).length;

    const feedbackCount = Object.keys(aiFeedbacks).length;

    // Calcular distribución de evaluaciones
    const evaluationDistribution = {};
    Object.values(aiFeedbacks).forEach(fb => {
      if (!fb) return;
      const eval_label = fb.evaluacion || 'Sin evaluar';
      evaluationDistribution[eval_label] = (evaluationDistribution[eval_label] || 0) + 1;
    });

    return {
      total_questions: totalQuestions,
      answered_count: answeredCount,
      feedback_count: feedbackCount,
      completion_percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      evaluation_distribution: evaluationDistribution,
      last_question_index: currentIndex
    };
  }, [studentAnswers, aiFeedbacks, currentIndex]);

  // Extraer valores adicionales de options para las dependencias
  const optionsAttempts = options.attempts;
  const optionsHistory = options.history;
  const optionsSubmitted = options.submitted;

  /**
   * Actualiza el índice de documentos (para gestionar límites y TTL)
   * NOTA: Declarado antes de saveResults para evitar TDZ (Temporal Dead Zone)
   */
  const updateDocumentIndex = useCallback((docId, metrics) => {
    try {
      const indexKey = `${STORAGE_KEY_PREFIX}index`;
      const indexRaw = localStorage.getItem(indexKey) || '{}';
      const index = JSON.parse(indexRaw);

      index[docId] = {
        last_modified: Date.now(),
        completion: metrics.completion_percentage,
        answered_count: metrics.answered_count
      };

      // Limpiar entradas antiguas si excedemos el límite
      const entries = Object.entries(index);
      if (entries.length > MAX_STORED_DOCUMENTS) {
        // Ordenar por última modificación (más antiguos primero)
        entries.sort((a, b) => a[1].last_modified - b[1].last_modified);

        // Eliminar documentos más antiguos
        const toRemove = entries.slice(0, entries.length - MAX_STORED_DOCUMENTS);
        toRemove.forEach(([oldDocId]) => {
          const oldKey = getStorageKey(oldDocId);
          if (oldKey) {
            localStorage.removeItem(oldKey);
            logger.log(`🗑️ [ActivityPersistence] Documento antiguo eliminado: ${oldDocId}`);
          }
          delete index[oldDocId];
        });
      }

      // Limpiar documentos expirados por TTL
      const now = Date.now();
      const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
      Object.entries(index).forEach(([expDocId, data]) => {
        if (now - data.last_modified > ttlMs) {
          const expiredKey = getStorageKey(expDocId);
          if (expiredKey) {
            localStorage.removeItem(expiredKey);
            logger.log(`⏰ [ActivityPersistence] Documento expirado eliminado: ${expDocId}`);
          }
          delete index[expDocId];
        }
      });

      localStorage.setItem(indexKey, JSON.stringify(index));
    } catch (error) {
      logger.warn('[ActivityPersistence] Error al actualizar índice:', error);
    }
  }, [getStorageKey]);

  /**
   * Guarda los resultados en localStorage
   */
  const saveResults = useCallback(() => {
    if (!documentId || !enabled) return false;

    const storageKey = getStorageKey(documentId);
    if (!storageKey) return false;

    try {
      const metrics = calculateMetrics();

      const dataToSave = {
        version: VERSION,
        document_id: documentId,
        timestamp: new Date().toISOString(),
        last_modified: Date.now(),
        data: {
          student_answers: studentAnswers,
          ai_feedbacks: aiFeedbacks,
          criterion_feedbacks: criterionFeedbacks,
          current_index: currentIndex,
          attempts: optionsAttempts || 0,
          history: optionsHistory || [],
          submitted: optionsSubmitted || false
        },
        metrics
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToSave));

      // Actualizar índice de documentos
      updateDocumentIndex(documentId, metrics);

      logger.log(`✅ [ActivityPersistence] Guardado para documento: ${documentId}`);
      return true;
    } catch (error) {
      logger.error('[ActivityPersistence] Error al guardar:', error);
      return false;
    }
  }, [documentId, enabled, studentAnswers, aiFeedbacks, criterionFeedbacks, currentIndex, getStorageKey, calculateMetrics, optionsAttempts, optionsHistory, optionsSubmitted, updateDocumentIndex]);

  // Actualizar ref al último saveResults
  useEffect(() => {
    latestSaveRef.current = saveResults;
  }, [saveResults]);

  /**
   * Carga los resultados desde localStorage
   */
  const loadResults = useCallback(() => {
    if (!documentId) return null;

    const storageKey = getStorageKey(documentId);
    if (!storageKey) return null;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        // 🆕 Migración: si no hay datos para el id actual, intentar con ids legacy
        const legacyIds = Array.isArray(legacyDocumentIds) ? legacyDocumentIds : [];
        for (const legacyId of legacyIds) {
          if (!legacyId || legacyId === documentId) continue;
          const legacyKey = getStorageKey(legacyId);
          if (!legacyKey) continue;
          const legacyRaw = localStorage.getItem(legacyKey);
          if (!legacyRaw) continue;

          try {
            // Copiar tal cual al nuevo storageKey (mantener version/data/metrics)
            localStorage.setItem(storageKey, legacyRaw);
            logger.log(`♻️ [ActivityPersistence] Migrado desde legacyId: ${legacyId} -> ${documentId}`);

            const migrated = JSON.parse(legacyRaw);
            return migrated?.data || null;
          } catch (e) {
            logger.warn('[ActivityPersistence] Error migrando datos legacy:', e);
          }
        }

        return null;
      }

      const saved = JSON.parse(raw);

      // Validar versión (para futuras migraciones)
      if (saved.version !== VERSION) {
        logger.warn(`[ActivityPersistence] Versión incompatible: ${saved.version} vs ${VERSION}`);
        // Aquí se podría añadir lógica de migración si fuera necesario
      }

      logger.log(`📦 [ActivityPersistence] Datos cargados para documento: ${documentId}`);
      return saved.data;
    } catch (error) {
      logger.error('[ActivityPersistence] Error al cargar:', error);
      return null;
    }
  }, [documentId, getStorageKey, legacyDocumentIds]);

  /**
   * Limpia los resultados de este documento
   */
  const clearResults = useCallback(() => {
    if (!documentId) return false;

    const storageKey = getStorageKey(documentId);
    if (!storageKey) return false;

    try {
      localStorage.removeItem(storageKey);

      // Actualizar índice
      const indexKey = `${STORAGE_KEY_PREFIX}index`;
      const indexRaw = localStorage.getItem(indexKey) || '{}';
      const index = JSON.parse(indexRaw);
      delete index[documentId];
      localStorage.setItem(indexKey, JSON.stringify(index));

      logger.log(`🗑️ [ActivityPersistence] Resultados eliminados para: ${documentId}`);
      return true;
    } catch (error) {
      logger.error('[ActivityPersistence] Error al limpiar:', error);
      return false;
    }
  }, [documentId, getStorageKey]);

  /**
   * Obtiene métricas actuales
   */
  const getMetrics = useCallback(() => {
    return calculateMetrics();
  }, [calculateMetrics]);

  // ============================================================
  // EFECTOS
  // ============================================================

  /**
   * Rehidratación cuando cambia el documentId
   */
  useEffect(() => {
    if (!documentId) {
      hasRehydratedRef.current = false;
      lastDocIdRef.current = null;
      return;
    }

    // Solo rehidratar si es un documento nuevo
    if (lastDocIdRef.current === documentId) return;

    lastDocIdRef.current = documentId;
    hasRehydratedRef.current = true;

    const loaded = loadResults();
    if (loaded && onRehydrate) {
      onRehydrate(loaded);
    }
  }, [documentId, loadResults, onRehydrate]);

  /**
   * Guardado automático cuando cambian los datos (debounced)
   */
  useEffect(() => {
    if (!documentId || !enabled || !hasRehydratedRef.current) return;

    // Debounce para evitar guardados excesivos
    const timeoutId = setTimeout(() => {
      saveResults();
    }, 3000); // 3 segundos de debounce

    return () => clearTimeout(timeoutId);
  }, [documentId, enabled, studentAnswers, aiFeedbacks, criterionFeedbacks, currentIndex, saveResults]);

  /**
   * 🛡️ Flush al desmontar o cambiar de documento:
   * Si el usuario navega rápido (antes del debounce), no perder progreso.
   * Importante: este efecto NO depende de saveResults para evitar flush en cada cambio.
   */
  useEffect(() => {
    if (!documentId || !enabled) return;

    return () => {
      if (!hasRehydratedRef.current) return;
      try {
        if (typeof latestSaveRef.current === 'function') {
          latestSaveRef.current();
        }
      } catch (error) {
        logger.warn('[ActivityPersistence] Error en flush al desmontar:', error);
      }
    };
  }, [documentId, enabled]);

  /**
   * Autoguardado periódico cada 30 segundos
   */
  useEffect(() => {
    if (!documentId || !enabled || !hasRehydratedRef.current) return;

    const intervalId = setInterval(() => {
      saveResults();
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [documentId, enabled, saveResults]);

  // ============================================================
  // API PÚBLICA
  // ============================================================
  return {
    saveManual: saveResults,
    clearResults,
    getMetrics
  };
}

/**
 * Obtiene todas las métricas de documentos almacenados
 * @returns {object} - Índice de documentos con métricas
 */
export function getAllStoredActivities() {
  try {
    const indexKey = `${STORAGE_KEY_PREFIX}index`;
    const indexRaw = localStorage.getItem(indexKey) || '{}';
    return JSON.parse(indexRaw);
  } catch (error) {
    logger.error('[ActivityPersistence] Error al obtener índice:', error);
    return {};
  }
}

/**
 * Limpia todos los resultados de actividades
 * @returns {boolean} - Éxito de la operación
 */
export function clearAllActivities() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    logger.log(`🗑️ [ActivityPersistence] ${keys.length} entradas eliminadas`);
    return true;
  } catch (error) {
    logger.error('[ActivityPersistence] Error al limpiar todo:', error);
    return false;
  }
}

/**
 * 🆕 Limpia datos de actividades sin courseId (datos legacy)
 * Útil para resolver problemas de persistencia entre cursos
 * @returns {object} - { cleaned: number, remaining: number }
 */
export function clearLegacyActivities() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    let cleaned = 0;
    let remaining = 0;
    
    keys.forEach(k => {
      // Patrón: activity_results_<courseId>_<docId> (tiene 2+ underscores después del prefix)
      // Legacy: activity_results_<docId> (solo 1 underscore después del prefix)
      const withoutPrefix = k.replace(STORAGE_KEY_PREFIX, '');
      const underscoreCount = (withoutPrefix.match(/_/g) || []).length;
      
      // Si tiene 0 underscores en la parte después del prefix, es legacy
      if (underscoreCount === 0 && k !== `${STORAGE_KEY_PREFIX}index`) {
        localStorage.removeItem(k);
        cleaned++;
        logger.log(`🗑️ [ActivityPersistence] Eliminado dato legacy: ${k}`);
      } else {
        remaining++;
      }
    });
    
    logger.log(`🧹 [ActivityPersistence] Limpieza legacy: ${cleaned} eliminados, ${remaining} conservados`);
    return { cleaned, remaining };
  } catch (error) {
    logger.error('[ActivityPersistence] Error en limpieza legacy:', error);
    return { cleaned: 0, remaining: 0, error: error.message };
  }
}

/**
 * 🆕 Diagnóstico de datos almacenados
 * @returns {object} - Información sobre datos en localStorage
 */
export function diagnoseStoredActivities() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    const legacy = [];
    const withCourseId = [];
    
    keys.forEach(k => {
      if (k === `${STORAGE_KEY_PREFIX}index`) return;
      
      const withoutPrefix = k.replace(STORAGE_KEY_PREFIX, '');
      const underscoreCount = (withoutPrefix.match(/_/g) || []).length;
      
      const entry = { key: k, size: localStorage.getItem(k)?.length || 0 };
      
      if (underscoreCount === 0) {
        legacy.push(entry);
      } else {
        // Extraer courseId del key
        const parts = withoutPrefix.split('_');
        entry.courseId = parts[0];
        entry.docId = parts.slice(1).join('_');
        withCourseId.push(entry);
      }
    });
    
    return {
      totalEntries: keys.length,
      legacy: { count: legacy.length, entries: legacy },
      withCourseId: { count: withCourseId.length, entries: withCourseId }
    };
  } catch (error) {
    logger.error('[ActivityPersistence] Error en diagnóstico:', error);
    return { error: error.message };
  }
}


