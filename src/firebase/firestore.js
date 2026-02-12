/**
 * Funciones helper para operaciones comunes de Firestore
 * Maneja textos, progreso de estudiantes, evaluaciones, etc.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  arrayUnion,
  arrayRemove,
  collectionGroup,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './config';
import { getSessionContentHash, compareSessionContent, mergeSessionsWithConflictResolution } from '../utils/sessionHash';
import logger from '../utils/logger';

const COURSE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let __firestoreWritesDisabled = false;
let __firestoreWritesDisabledLogged = false;

function __isPermissionDeniedError(error) {
  const code = error?.code || error?.name;
  const message = String(error?.message || '').toLowerCase();
  return code === 'permission-denied' || message.includes('missing or insufficient permissions') || message.includes('permission-denied');
}

/**
 * 🔧 FIX Bug 5: Reintentar operaciones con backoff exponencial.
 * No reintenta errores de permisos (son permanentes).
 */
const __RETRY_MAX_ATTEMPTS = 3;
const __RETRY_BASE_DELAY_MS = 1000;

async function __retryWithBackoff(fn) {
  let lastError;
  for (let attempt = 0; attempt < __RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (__isPermissionDeniedError(error) || attempt >= __RETRY_MAX_ATTEMPTS - 1) {
        throw error;
      }
      const delay = __RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
      logger.warn(`⚠️ [Firestore] Reintento ${attempt + 1}/${__RETRY_MAX_ATTEMPTS} en ${Math.round(delay)}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function generateUniqueCourseCode(length = 6) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length }, () =>
      COURSE_CODE_CHARS[Math.floor(Math.random() * COURSE_CODE_CHARS.length)]
    ).join('');
    const codeDoc = await getDoc(doc(db, 'courseCodes', code));
    if (!codeDoc.exists()) {
      return code;
    }
  }
  throw new Error('No se pudo generar un código de curso único. Intenta nuevamente.');
}

function sanitizeLecturasInput(lecturas = []) {
  return (lecturas || []).filter(Boolean).map((lectura) => ({
    textoId: lectura.textoId,
    titulo: lectura.titulo || 'Lectura sin título',
    fechaLimite: lectura.fechaLimite || null,
    notas: lectura.notas || ''
  })).filter(item => !!item.textoId);
}

// ============================================
// GESTIÓN DE TEXTOS (Docentes)
// ============================================

/**
 * Sube un texto (PDF o TXT) y crea el documento en Firestore
 * @param {File} file - Archivo a subir
 * @param {object} metadata - { titulo, autor, genero, complejidad, docenteUid, docenteNombre }
 * @returns {Promise<string>} - ID del texto creado
 */
export async function uploadTexto(file, metadata) {
  try {
    logger.log('📤 Subiendo texto:', file.name);

    // 🆕 D14 FIX: Validar tamaño máximo de archivo (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`El archivo excede el límite de 50MB (tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // 🆕 D7 FIX: Validar extensiones permitidas
    const allowedExtensions = ['.pdf', '.txt', '.docx'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      throw new Error(`Tipo de archivo no permitido. Formatos válidos: ${allowedExtensions.join(', ')}`);
    }

    // 1. Subir archivo a Storage
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `textos/${metadata.docenteUid}/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    logger.log('✅ Archivo subido a Storage:', downloadURL);

    // 2. Crear documento en Firestore
    const textoData = {
      titulo: metadata.titulo,
      autor: metadata.autor || 'No especificado',
      genero: metadata.genero || 'General',
      complejidad: metadata.complejidad || 'intermedio',
      docenteUid: metadata.docenteUid,
      docenteNombre: metadata.docenteNombre,

      fileURL: downloadURL,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,

      asignadoA: [], // Array de UIDs de estudiantes
      visible: true,
      analisisGenerado: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const textoRef = doc(collection(db, 'textos'));
    await setDoc(textoRef, textoData);

    logger.log('✅ Texto creado en Firestore:', textoRef.id);

    return textoRef.id;

  } catch (error) {
    logger.error('❌ Error subiendo texto:', error);
    throw error;
  }
}

// [L1 cleanup] getTextosDocente, getTextosEstudiante, assignTextoToStudents, saveAnalisisTexto
// removed — replaced by subscription-based and course-based patterns (see git history)

// ============================================
// PROGRESO DE ESTUDIANTES
// ============================================

// 🛡️ Anti-spam: deduplicar escrituras idénticas por (uid, textoId)
// Esto evita ráfagas de writes cuando el estado local rebota con snapshots de Firestore.
const __progressWriteDedupe = new Map();
const __DEDUPE_WINDOW_MS = 2500;

// 📈 Métricas opcionales de dedupe (desactivadas por defecto)
// Activar: localStorage.setItem('__firestore_dedupe_debug__','1')
const __DEDUPE_DEBUG_FLAG = '__firestore_dedupe_debug__';
let __firestoreStatsWindowStart = 0;
let __firestoreStatsLastLogAt = 0;
let __firestoreStats = {
  deduped: 0,
  writeAttempted: 0,
  writeSuccess: 0,
  writeError: 0
};

function __isDedupeDebugEnabled() {
  try {
    return typeof window !== 'undefined' && window?.localStorage?.getItem(__DEDUPE_DEBUG_FLAG) === '1';
  } catch {
    return false;
  }
}

function __maybeLogFirestoreStats() {
  if (!__isDedupeDebugEnabled()) return;

  const now = Date.now();
  if (!__firestoreStatsWindowStart) {
    __firestoreStatsWindowStart = now;
  }

  // Log como máximo 1 vez por minuto
  const elapsed = now - __firestoreStatsWindowStart;
  if (elapsed >= 60000 && (now - __firestoreStatsLastLogAt) >= 60000) {
    const seconds = Math.max(1, Math.round(elapsed / 1000));
    const attempted = __firestoreStats.writeAttempted;
    const success = __firestoreStats.writeSuccess;
    const error = __firestoreStats.writeError;
    const deduped = __firestoreStats.deduped;
    const perMin = (n) => Math.round((n / (elapsed / 60000)) * 10) / 10;

    logger.log(
      `📈 [Firestore] Métricas ~${seconds}s | writes: ${attempted} intentados (~${perMin(attempted)}/min), ` +
      `${success} ok (~${perMin(success)}/min), ${error} errores (~${perMin(error)}/min) | ` +
      `dedupe: ${deduped} omitidos (~${perMin(deduped)}/min)`
    );

    __firestoreStatsLastLogAt = now;
    __firestoreStatsWindowStart = now;
    __firestoreStats = { deduped: 0, writeAttempted: 0, writeSuccess: 0, writeError: 0 };
  }
}

function __trackFirestoreStat(kind) {
  if (!__isDedupeDebugEnabled()) return;
  if (!__firestoreStatsWindowStart) {
    __firestoreStatsWindowStart = Date.now();
  }

  if (kind === 'deduped') __firestoreStats.deduped += 1;
  else if (kind === 'writeAttempted') __firestoreStats.writeAttempted += 1;
  else if (kind === 'writeSuccess') __firestoreStats.writeSuccess += 1;
  else if (kind === 'writeError') __firestoreStats.writeError += 1;

  __maybeLogFirestoreStats();
}

const __VOLATILE_KEYS = new Set([
  'lastSync',
  'syncType',
  'userId',
  // 🆕 NO deduplicar por timestamp - cada evaluación es única
  // 'timestamp', // Comentado: el timestamp dentro de scores SÍ debe contar para dedupe
  // 'lastUpdate' // Comentado: el lastUpdate SÍ debe contar para dedupe
]);

function __stripVolatileDeep(value) {
  if (Array.isArray(value)) {
    return value.map(__stripVolatileDeep);
  }

  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      if (__VOLATILE_KEYS.has(k)) return;
      out[k] = __stripVolatileDeep(value[k]);
    });
    return out;
  }

  return value;
}

function __stableStringify(value) {
  const seen = new WeakSet();

  const normalize = (v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const out = {};
    Object.keys(v)
      .sort()
      .forEach((k) => {
        out[k] = normalize(v[k]);
      });
    return out;
  };

  return JSON.stringify(normalize(value));
}

/**
 * 🔍 DIAGNÓSTICO: Exponer estado interno para debugging
 * Útil en consola: window.__getFirestoreDebugInfo?.()
 */
function getFirestoreDebugInfo() {
  return {
    writesDisabled: __firestoreWritesDisabled,
    dedupeMapSize: __progressWriteDedupe.size,
    stats: { ...__firestoreStats },
    dedupeWindowMs: __DEDUPE_WINDOW_MS,
    timestamp: new Date().toISOString()
  };
}

// Exponer globalmente para debugging en consola
if (typeof window !== 'undefined') {
  window.__getFirestoreDebugInfo = getFirestoreDebugInfo;
  window.__resetFirestoreWritesDisabled = () => {
    __firestoreWritesDisabled = false;
    __firestoreWritesDisabledLogged = false;
    console.log('🔓 [Firestore] Escrituras rehabilitadas manualmente');
    return true;
  };
  // 🆕 Limpiar cache de dedupe para forzar escritura
  window.__clearFirestoreDedupe = () => {
    __progressWriteDedupe.clear();
    console.log('🧹 [Firestore] Cache de dedupe limpiada');
    return true;
  };
  // 🆕 Test de escritura directa
  window.__testFirestoreWrite = async (uid, textoId, testData) => {
    console.log('🧪 [Firestore] Test de escritura:', { uid, textoId, testData });
    try {
      const progressRef = doc(db, 'students', uid, 'progress', textoId);
      await setDoc(progressRef, { 
        testWrite: true, 
        timestamp: new Date().toISOString(),
        ...testData 
      }, { merge: true });
      console.log('✅ [Firestore] Test de escritura exitoso');
      return true;
    } catch (error) {
      console.error('❌ [Firestore] Test de escritura fallido:', error);
      return false;
    }
  };
}

/**
 * Guarda/actualiza el progreso de un estudiante en un texto
 * @param {string} estudianteUid 
 * @param {string} textoId 
 * @param {object} progressData - { rubrica1: {...}, rubrica2: {...}, ... }
 */
export async function saveStudentProgress(estudianteUid, textoId, progressData) {
  logger.log('🔵 [Firestore] saveStudentProgress llamado:', {
    uid: estudianteUid,
    textoId,
    hasRewardsState: !!progressData?.rewardsState,
    rewardsResetAt: progressData?.rewardsState?.resetAt,
    rewardsTotalPoints: progressData?.rewardsState?.totalPoints,
    hasRubricProgress: !!progressData?.rubricProgress,
    rubricKeys: Object.keys(progressData?.rubricProgress || {}),
    writesDisabled: __firestoreWritesDisabled
  });

  // 🔵 Log de la ruta completa para debug
  logger.log(`🔵 [Firestore] Ruta de escritura: students/${estudianteUid}/progress/${textoId}`);

  try {
    if (__firestoreWritesDisabled) {
      if (!__firestoreWritesDisabledLogged) {
        __firestoreWritesDisabledLogged = true;
        logger.warn('⚠️ [Firestore] Escrituras deshabilitadas en esta sesión (permission-denied). Se omiten guardados hasta recargar.');
      }
      __trackFirestoreStat('writeSkipped');
      return;
    }
    // 🧩 FASE 4 HARDEN: rewardsState es global (global_progress) y nunca debe guardarse por lectura.
    // Esto blinda rutas legacy o genéricas que puedan incluir rewardsState por accidente.
    if (textoId !== 'global_progress' && progressData?.rewardsState) {
      // Evitar mutar el objeto original que pueda estar en React state
      progressData = { ...progressData };
      delete progressData.rewardsState;
      if (localStorage.getItem('__firestore_dedupe_debug__')) {
        logger.warn('⚠️ [saveStudentProgress] Ignorando rewardsState fuera de global_progress');
      }
    }

    // 🔁 DEDUPE: si el payload útil es idéntico y reciente, saltar write
    const dedupeKey = `${estudianteUid}::${textoId}`;
    const now = Date.now();
    const signature = __stableStringify(__stripVolatileDeep(progressData || {}));
    const prev = __progressWriteDedupe.get(dedupeKey);
    if (prev && prev.signature === signature && (now - prev.at) < __DEDUPE_WINDOW_MS) {
      logger.log('⏭️ [Firestore] Escritura deduplicada (payload idéntico):', estudianteUid, textoId);
      __trackFirestoreStat('deduped');
      return;
    }

    __progressWriteDedupe.set(dedupeKey, { signature, at: now });
    // 🔧 M2 FIX: limpieza selectiva de entradas expiradas (evita memory leak)
    // En lugar de nuclear clear() al exceder 500, podar solo las expiradas
    if (__progressWriteDedupe.size > 100) {
      for (const [k, v] of __progressWriteDedupe) {
        if (now - v.at > __DEDUPE_WINDOW_MS * 4) {
          __progressWriteDedupe.delete(k);
        }
      }
    }

    // Métrica: write real (no dedupe)
    __trackFirestoreStat('writeAttempted');

    const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);

    // 🔧 FIX Bug 4: Resolver sourceCourseId si viene null (fallback desde enrolledCourses)
    let resolvedSourceCourseId = null;
    if (!progressData.sourceCourseId) {
      try {
        const userProfileRef = doc(db, 'users', estudianteUid);
        const userProfileSnap = await getDoc(userProfileRef);
        const enrolled = userProfileSnap.exists() ? (userProfileSnap.data().enrolledCourses || []) : [];
        if (enrolled.length > 0) {
          resolvedSourceCourseId = enrolled[enrolled.length - 1]; // Último curso inscrito
          logger.log('🔧 [Firestore] sourceCourseId resuelto desde enrolledCourses:', resolvedSourceCourseId);
        }
      } catch (err) {
        logger.warn('⚠️ [Firestore] No se pudo resolver sourceCourseId:', err.message);
      }
    }

    // 🔄 FIX Bug 3+5: Transacción atómica con retry para evitar race conditions
    let _savedFinalData;
    await __retryWithBackoff(() => runTransaction(db, async (transaction) => {

    // Obtener datos existentes para hacer merge inteligente
    const existingDoc = await transaction.get(progressRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};

    // 🔄 MERGE INTELIGENTE: Combinar datos nuevos con existentes
    const mergedData = { ...existingData };

    // Mergear rubricProgress (CONCATENAR scores, no reemplazar)
    if (progressData.rubricProgress) {
      mergedData.rubricProgress = mergedData.rubricProgress || {};

      Object.keys(progressData.rubricProgress).forEach(rubricId => {
        const newRubric = progressData.rubricProgress[rubricId];
        const existingRubric = mergedData.rubricProgress[rubricId];

        if (!existingRubric) {
          // Si no existe, crear nueva
          mergedData.rubricProgress[rubricId] = newRubric;
        } else {
          // 🔧 FIX: Concatenar scores únicos por timestamp en lugar de reemplazar
          const existingScores = existingRubric.scores || [];
          const newScores = newRubric.scores || [];

          // Crear mapa de scores existentes por timestamp para evitar duplicados
          const existingTimestamps = new Set(existingScores.map(s => s.timestamp));

          // Agregar solo scores nuevos (que no existan por timestamp)
          const uniqueNewScores = newScores.filter(s => !existingTimestamps.has(s.timestamp));

          // Combinar y ordenar por timestamp
          const combinedScores = [...existingScores, ...uniqueNewScores]
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

          // Recalcular promedio con últimos 3 intentos
          const recentScores = combinedScores.slice(-3);
          const newAverage = recentScores.length > 0
            ? Math.round((recentScores.reduce((sum, s) => sum + (s.score || 0), 0) / recentScores.length) * 10) / 10
            : 0;

          // Combinar artefactos únicos
          const combinedArtefactos = [...new Set([
            ...(existingRubric.artefactos || []),
            ...(newRubric.artefactos || [])
          ])];

          mergedData.rubricProgress[rubricId] = {
            scores: combinedScores,
            average: newAverage,
            lastUpdate: Math.max(existingRubric.lastUpdate || 0, newRubric.lastUpdate || 0),
            artefactos: combinedArtefactos
          };

          logger.log(`🔄 [Firestore] Merge de ${rubricId}: ${existingScores.length} existentes + ${uniqueNewScores.length} nuevos = ${combinedScores.length} total`);
        }
      });
    }

    // Mergear activitiesProgress (priorizar entregas de artefactos y recencia)
    if (progressData.activitiesProgress) {
      mergedData.activitiesProgress = mergedData.activitiesProgress || {};

      const getActivityMergeStats = (activity) => {
        const preparationUpdatedAt = activity?.preparation?.updatedAt || 0;
        const artifacts = activity?.artifacts || {};
        let submittedCount = 0;
        let latestSubmittedAt = 0;

        Object.values(artifacts).forEach((a) => {
          if (a?.submitted) {
            submittedCount += 1;
            latestSubmittedAt = Math.max(latestSubmittedAt, a.submittedAt || 0);
          }
        });

        return {
          submittedCount,
          preparationUpdatedAt,
          latestSubmittedAt,
          effectiveUpdatedAt: Math.max(preparationUpdatedAt, latestSubmittedAt)
        };
      };

      Object.keys(progressData.activitiesProgress).forEach(docId => {
        const newActivity = progressData.activitiesProgress[docId];
        const existingActivity = mergedData.activitiesProgress[docId];

        // Si no existe, agregar
        if (!existingActivity) {
          mergedData.activitiesProgress[docId] = newActivity;
          return;
        }

        const newStats = getActivityMergeStats(newActivity);
        const existingStats = getActivityMergeStats(existingActivity);

        // 1) Más artefactos entregados gana
        if (newStats.submittedCount > existingStats.submittedCount) {
          mergedData.activitiesProgress[docId] = newActivity;
          return;
        }

        // 2) Si están iguales, más reciente (considerando submittedAt o updatedAt)
        if (newStats.submittedCount === existingStats.submittedCount &&
          newStats.effectiveUpdatedAt > existingStats.effectiveUpdatedAt) {
          mergedData.activitiesProgress[docId] = newActivity;
        }
      });
    }

     // 🆕 MERGEAR rewardsState (Gamificación) - MERGE INTELIGENTE
     // 🧩 FASE 4: solo se permite en global_progress
     if (textoId === 'global_progress' && progressData.rewardsState) {
      const existingRewards = mergedData.rewardsState || {};
      const newRewards = progressData.rewardsState;

      // 🆕 FIX: Detectar reset intencional
      const newResetAt = newRewards.resetAt || 0;
      const existingResetAt = existingRewards.resetAt || 0;
      const isIntentionalReset = newResetAt > existingResetAt && newRewards.totalPoints === 0;

      logger.log('🔵 [Firestore] Merge de rewardsState:', {
        newResetAt,
        existingResetAt,
        newTotalPoints: newRewards.totalPoints,
        existingTotalPoints: existingRewards.totalPoints,
        isIntentionalReset
      });

      if (isIntentionalReset) {
        // 🗑️ RESET: Reemplazar completamente con el estado vacío, NO hacer merge
        logger.log('🗑️ [Firestore] Reset intencional detectado, reemplazando estado de rewards');
        mergedData.rewardsState = {
          ...newRewards,
          lastInteraction: newRewards.lastInteraction || Date.now(),
          lastUpdate: newRewards.lastUpdate || Date.now(),
          resetAt: newResetAt
        };
      } else {
        // Merge normal: mantener máximos y concatenar historial
        const existingTs = existingRewards.lastInteraction || existingRewards.lastUpdate || 0;
        const newTs = newRewards.lastInteraction || newRewards.lastUpdate || Date.now();
        const mergedTs = Math.max(existingTs, newTs);

        mergedData.rewardsState = {
          totalPoints: Math.max(existingRewards.totalPoints || 0, newRewards.totalPoints || 0),
          availablePoints: Math.max(existingRewards.availablePoints || 0, newRewards.availablePoints || 0),
          currentStreak: Math.max(existingRewards.currentStreak || 0, newRewards.currentStreak || 0),
          maxStreak: Math.max(existingRewards.maxStreak || 0, newRewards.maxStreak || 0),
          streak: Math.max(existingRewards.streak || 0, newRewards.streak || 0),
          // Combinar achievements únicos
          achievements: [...new Set([
            ...(existingRewards.achievements || []),
            ...(newRewards.achievements || [])
          ])],
          // Mantener el historial más reciente o largo
          history: (newRewards.history?.length || 0) >= (existingRewards.history?.length || 0)
            ? newRewards.history
            : existingRewards.history,
          // Preservar stats del más reciente
          stats: newTs >= existingTs ? (newRewards.stats || existingRewards.stats) : (existingRewards.stats || newRewards.stats),
          // Preservar recordedMilestones (anti-farming)
          recordedMilestones: {
            ...(existingRewards.recordedMilestones || {}),
            ...(newRewards.recordedMilestones || {})
          },
          // Mantener ambos campos por compatibilidad; lastInteraction es el preferido.
          lastInteraction: mergedTs,
          lastUpdate: mergedTs,
          resetAt: Math.max(existingResetAt, newResetAt) // Preservar el más reciente
        };
      }
    }

    // Calcular métricas agregadas
    const rubricas = Object.keys(mergedData.rubricProgress || {}).filter(k => k.startsWith('rubrica'));
    const scores = rubricas.map(k => mergedData.rubricProgress[k]?.average || 0).filter(s => s > 0);
    const promedio_global = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // 🆕 CRÍTICO: Calcular porcentaje de progreso (para dashboard del docente)
    // Basado en número de rúbricas con scores > 0
    const rubricasCompletadas = rubricas.filter(k => {
      const rubrica = mergedData.rubricProgress?.[k];
      return rubrica && rubrica.scores && rubrica.scores.length > 0;
    }).length;
    const porcentaje = rubricas.length > 0
      ? Math.round((rubricasCompletadas / 5) * 100) // 5 rúbricas totales
      : 0;

    // 🆕 CRÍTICO: Determinar estado (para dashboard del docente)
    const estado = porcentaje >= 100 ? 'completed' : (porcentaje > 0 ? 'in-progress' : 'pending');

    // 🆕 ENTREGA FINAL: Calcular estado de entregas de artefactos
    const ARTIFACT_NAMES = ['resumenAcademico', 'tablaACD', 'mapaActores', 'respuestaArgumentativa', 'bitacoraEticaIA'];
    const artifactsData = mergedData.activitiesProgress || {};

    // Buscar artifacts en cualquier documentId dentro de activitiesProgress
    let artifactsSubmitted = {};
    Object.values(artifactsData).forEach(docProgress => {
      if (docProgress?.artifacts) {
        Object.entries(docProgress.artifacts).forEach(([artName, artData]) => {
          if (artData?.submitted && !artifactsSubmitted[artName]) {
            artifactsSubmitted[artName] = {
              submitted: true,
              submittedAt: artData.submittedAt || Date.now(),
              score: artData.score || 0
            };
          }
        });
      }
    });

    const entregados = ARTIFACT_NAMES.filter(name => artifactsSubmitted[name]?.submitted).length;
    const entregaCompleta = entregados === 5;
    const fechaEntregaFinal = entregaCompleta
      ? Math.max(...ARTIFACT_NAMES.map(n => artifactsSubmitted[n]?.submittedAt || 0))
      : null;

    // Preparar datos finales a guardar
    const finalData = {
      ...mergedData,
      textoId,
      estudianteUid,
      promedio_global,
      // 🆕 CRÍTICO: Campos que espera getCourseMetrics
      score: promedio_global, // Alias para compatibilidad
      ultimaPuntuacion: promedio_global, // Alias legacy
      porcentaje, // Porcentaje de rúbricas completadas
      progress: porcentaje, // Alias
      avancePorcentaje: porcentaje, // Alias legacy
      estado, // Estado calculado
      // 🆕 ENTREGA FINAL: Nuevo campo para dashboard del docente
      entregaFinal: {
        completa: entregaCompleta,
        entregados,
        total: 5,
        artifacts: artifactsSubmitted,
        fechaEntrega: fechaEntregaFinal ? new Date(fechaEntregaFinal).toISOString() : null
      },
      // 🆕 CRÍTICO: Preservar sourceCourseId con fallback desde enrolledCourses (Bug 4)
      sourceCourseId: progressData.sourceCourseId || existingData.sourceCourseId || resolvedSourceCourseId || null,
      ultima_actividad: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSync: progressData.lastSync || new Date().toISOString(),
      syncType: progressData.syncType || 'full'
    };

    // Si es primera vez, agregar timestamps de creación
    if (!existingDoc.exists()) {
      finalData.primera_actividad = serverTimestamp();
      finalData.total_intentos = 0;
      finalData.tiempo_total_min = 0;
      finalData.tiempoLecturaTotal = 0; // Para compatibilidad con dashboard
      finalData.tiempoTotal = 0; // Alias legacy
      finalData.completado = false;
      finalData.bloqueado = false;
    }

    // Guardar con merge (dentro de transacción atómica)
    _savedFinalData = finalData;
    transaction.set(progressRef, finalData, { merge: true });

    })); // fin de runTransaction + __retryWithBackoff

    __trackFirestoreStat('writeSuccess');

    // 🆕 Log detallado para debug de persistencia
    const rubricKeys = Object.keys((_savedFinalData?.rubricProgress) || {}).filter(k => k.startsWith('rubrica'));
    logger.log('✅ [Firestore] Progreso guardado con merge inteligente:', {
      uid: estudianteUid,
      textoId,
      rubricasGuardadas: rubricKeys,
      tieneActivities: !!_savedFinalData?.activitiesProgress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    __trackFirestoreStat('writeError');
    if (__isPermissionDeniedError(error)) {
      // 🆕 NO deshabilitar permanentemente - solo loguear el error
      // Las escrituras se reintentarán en la próxima operación
      logger.warn('⚠️ [Firestore] permission-denied al guardar progreso:', {
        estudianteUid,
        textoId,
        code: error?.code,
        message: error?.message,
        hint: 'Verifica las reglas de Firestore y que el usuario esté autenticado correctamente'
      });
      // NO hacer: __firestoreWritesDisabled = true;
      // Esto permite reintentar en lugar de bloquear permanentemente
      return;
    }
    logger.error('❌ [Firestore] Error guardando progreso:', error);
    throw error;
  }
}

/**
 * Obtiene el progreso de un estudiante en un texto específico
 * @param {string} estudianteUid 
 * @param {string} textoId 
 * @returns {Promise<object|null>}
 */
export async function getStudentProgress(estudianteUid, textoId) {
  logger.log('🔵 [Firestore] getStudentProgress llamado:', { uid: estudianteUid, textoId });
  
  try {
    const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      logger.log('ℹ️ [Firestore] No existe documento de progreso para:', { uid: estudianteUid, textoId });
      return null;
    }

    const data = progressDoc.data();
    const rubricKeys = Object.keys(data.rubricProgress || {}).filter(k => 
      data.rubricProgress?.[k]?.scores?.length > 0
    );
    
    logger.log('✅ [Firestore] Progreso encontrado:', {
      uid: estudianteUid,
      textoId,
      rubricasConDatos: rubricKeys,
      tieneActivities: !!data.activitiesProgress
    });

    // Asegurar que la estructura tenga los campos esperados
    return {
      ...data,
      rubricProgress: data.rubricProgress || {},
      activitiesProgress: data.activitiesProgress || {},
      promedio_global: data.promedio_global || 0,
      ultima_actividad: data.ultima_actividad?.toDate?.() || data.ultima_actividad,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
    };

  } catch (error) {
    logger.error('❌ Error obteniendo progreso:', error);
    throw error;
  }
}

/**
 * Obtiene todo el progreso de un estudiante (todos los textos)
 * @param {string} estudianteUid 
 * @returns {Promise<Array>}
 */
export async function getAllStudentProgress(estudianteUid) {
  try {
    const progressCollection = collection(db, 'students', estudianteUid, 'progress');
    const snapshot = await getDocs(progressCollection);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    logger.error('❌ Error obteniendo progreso completo:', error);
    throw error;
  }
}

// [L1 cleanup] getTextProgressForStudents removed — unused (see git history)

// ============================================
// EVALUACIONES
// ============================================

/**
 * Guarda una evaluación completa
 * @param {object} evaluacionData 
 * @returns {Promise<string>} - ID de la evaluación
 */
export async function saveEvaluacion(evaluacionData) {
  try {
    const evalRef = doc(collection(db, 'evaluaciones'));

    const dataToSave = {
      ...evaluacionData,
      timestamp: serverTimestamp()
    };

    await setDoc(evalRef, dataToSave);

    logger.log('✅ Evaluación guardada:', evalRef.id);

    return evalRef.id;

  } catch (error) {
    logger.error('❌ Error guardando evaluación:', error);
    throw error;
  }
}

// [L1 cleanup] getEvaluacionesEstudiante removed — unused (see git history)

// ============================================
// ACTUALIZACIÓN ATÓMICA DE TIEMPO DE LECTURA
// ============================================

/**
 * 🆕 Bug 6 FIX: Incrementa atómicamente el tiempo de lectura usando Firestore increment().
 * Se llama desde useReadingTimeTracker periódicamente y al desmontar el visor.
 *
 * @param {string} estudianteUid
 * @param {string} textoId
 * @param {number} deltaMinutes – minutos a sumar (puede ser fraccionario, ej. 0.5)
 */
export async function updateReadingTime(estudianteUid, textoId, deltaMinutes) {
  if (!estudianteUid || !textoId || !deltaMinutes || deltaMinutes <= 0) return;
  if (__firestoreWritesDisabled) return;

  const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);

  try {
    await updateDoc(progressRef, {
      tiempoLecturaTotal: increment(deltaMinutes),
      tiempoTotal: increment(deltaMinutes),
      tiempo_total_min: increment(deltaMinutes),
      ultima_actividad: serverTimestamp()
    });
    logger.log(`⏱️ [Firestore] Tiempo lectura +${deltaMinutes.toFixed(2)} min → ${textoId}`);
  } catch (error) {
    // Si el documento no existe aún, crearlo con merge
    if (error?.code === 'not-found') {
      try {
        await setDoc(progressRef, {
          tiempoLecturaTotal: deltaMinutes,
          tiempoTotal: deltaMinutes,
          tiempo_total_min: deltaMinutes,
          ultima_actividad: serverTimestamp(),
          primera_actividad: serverTimestamp()
        }, { merge: true });
        logger.log(`⏱️ [Firestore] Doc creado con tiempo: ${deltaMinutes.toFixed(2)} min → ${textoId}`);
      } catch (setError) {
        logger.error('❌ [Firestore] Error creando doc de tiempo:', setError);
      }
    } else if (!__isPermissionDeniedError(error)) {
      logger.error('❌ [Firestore] Error actualizando tiempo:', error);
    }
  }
}

// ============================================
// LISTENERS EN TIEMPO REAL
// ============================================

/**
 * Suscribe a cambios en el progreso de un estudiante (real-time)
 * @param {string} estudianteUid 
 * @param {string} textoId 
 * @param {Function} callback - Función a llamar cuando hay cambios
 * @returns {Function} - Función para cancelar la suscripción
 */
export function subscribeToStudentProgress(estudianteUid, textoId, callback) {
  const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);

  return onSnapshot(progressRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  }, (error) => {
    logger.error('❌ Error en listener de progreso:', error);
  });
}

/**
 * Suscribe a la lista de textos de un docente (real-time)
 * @param {string} docenteUid 
 * @param {Function} callback 
 * @returns {Function}
 */
export function subscribeToDocenteTextos(docenteUid, callback) {
  const q = query(
    collection(db, 'textos'),
    where('docenteUid', '==', docenteUid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const textos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(textos);
  }, (error) => {
    logger.error('❌ Error en listener de textos:', error);
  });
}

/**
 * 🆕 Bug 8 FIX: Suscribe a la lista de cursos de un docente (real-time).
 * Reemplaza getCursosDocente para el dashboard.
 * @param {string} docenteUid
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribeToCursosDocente(docenteUid, callback) {
  const q = query(
    collection(db, 'courses'),
    where('docenteUid', '==', docenteUid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const cursos = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(cursos);
  }, (error) => {
    logger.error('❌ Error en listener de cursos:', error);
  });
}

/**
 * 🆕 Bug 8 FIX: Suscribe a cambios en la subcollection de estudiantes de un curso.
 * Útil para detectar inscripciones, aprobaciones y cambios de estado en tiempo real.
 * @param {string} courseId
 * @param {Function} callback - recibe array de estudiantes
 * @returns {Function} unsubscribe
 */
export function subscribeToCourseStudents(courseId, callback) {
  const studentsRef = collection(db, 'courses', courseId, 'students');

  return onSnapshot(studentsRef, (snapshot) => {
    const students = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      estudianteUid: docSnap.id,
      ...docSnap.data()
    }));
    callback(students);
  }, (error) => {
    logger.error('❌ Error en listener de estudiantes del curso:', error);
  });
}

// ============================================
// UTILIDADES
// ============================================

// [L1 cleanup] incrementCounter, softDelete removed — unused (see git history)

// ============================================
// GESTIÓN DE SESIONES (localStorage → Firestore)
// ============================================

/**
 * Genera hash simple de un texto para deduplicación
 * @param {string} text 
 * @returns {string}
 */
function simpleHash(text) {
  if (!text) return 'empty';
  let hash = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sube un texto grande a Firebase Storage y retorna la URL de descarga
 * @param {string} userId - UID del usuario
 * @param {string} sessionId - ID de la sesión
 * @param {string} textContent - Contenido del texto
 * @returns {Promise<string>} - URL de descarga del texto
 */
async function uploadTextToStorage(userId, sessionId, textContent) {
  try {
    logger.log(`📤 [Storage] Subiendo texto grande (${(textContent.length / 1024).toFixed(2)} KB)...`);

    // Crear referencia en Storage: users/{userId}/sessions/{sessionId}/text.txt
    const storageRef = ref(storage, `users/${userId}/sessions/${sessionId}/text.txt`);

    // Convertir texto a Blob
    const textBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });

    // Subir con metadata
    const metadata = {
      contentType: 'text/plain',
      customMetadata: {
        sessionId,
        userId,
        uploadedAt: new Date().toISOString(),
        sizeBytes: textContent.length.toString()
      }
    };

    const snapshot = await uploadBytes(storageRef, textBlob, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    logger.log('✅ [Storage] Texto subido exitosamente. URL:', downloadURL.substring(0, 50) + '...');

    return downloadURL;

  } catch (error) {
    logger.error('❌ [Storage] Error subiendo texto:', error);
    throw error;
  }
}

/**
 * Descarga un texto desde Firebase Storage
 * @param {string} downloadURL - URL del texto en Storage
 * @returns {Promise<string>} - Contenido del texto
 */
async function downloadTextFromStorage(downloadURL) {
  try {
    logger.log('📥 [Storage] Descargando texto desde URL...');

    const response = await fetch(downloadURL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const textContent = await response.text();

    logger.log(`✅ [Storage] Texto descargado (${(textContent.length / 1024).toFixed(2)} KB)`);

    return textContent;

  } catch (error) {
    logger.error('❌ [Storage] Error descargando texto:', error);
    throw error;
  }
}

/**
 * Elimina un texto de Firebase Storage
 * @param {string} userId - UID del usuario
 * @param {string} sessionId - ID de la sesión
 */
async function deleteTextFromStorage(userId, sessionId) {
  try {
    const storageRef = ref(storage, `users/${userId}/sessions/${sessionId}/text.txt`);
    await deleteObject(storageRef);
    logger.log('✅ [Storage] Texto eliminado de Storage');
  } catch (error) {
    // Si el archivo no existe, no es un error crítico
    if (error.code === 'storage/object-not-found') {
      logger.log('ℹ️ [Storage] Archivo no encontrado (ya eliminado)');
    } else {
      logger.error('❌ [Storage] Error eliminando texto:', error);
      throw error;
    }
  }
}

async function mapSessionDoc(doc) {
  const data = doc.data();

  // 🆕 Si el texto está en Storage, descargarlo
  let textContent = data.textContent || data.text?.content || null;

  if (data.textInStorage && data.textStorageURL && !textContent) {
    try {
      logger.log(`📥 [mapSessionDoc] Texto en Storage detectado, descargando...`);
      textContent = await downloadTextFromStorage(data.textStorageURL);
    } catch (error) {
      logger.error('❌ [mapSessionDoc] Error descargando texto desde Storage:', error);
      // Fallback: usar textPreview si falla descarga
      textContent = data.textPreview || null;
    }
  }

  const textMetadata = data.textMetadata || data.text?.metadata || {};

  const text = textContent ? {
    content: textContent,
    fileName: textMetadata.fileName || data.text?.fileName || 'texto_manual',
    fileType: textMetadata.fileType || data.text?.fileType || 'text/plain',
    // 🆕 Compat: restauración de PDF/archivo original (si aplica)
    fileURL: textMetadata.fileURL || data.text?.fileURL || null,
    metadata: {
      length: textMetadata.length || textContent.length,
      words: textMetadata.words || (textContent ? textContent.split(/\s+/).length : 0)
    }
  } : null;

  const textPreview = data.textPreview || (textContent ? textContent.substring(0, 200) : '');

  return {
    id: doc.id,
    ...data,
    text,
    textPreview,
    // 🆕 ASEGURAR que activitiesProgress se incluya explícitamente
    activitiesProgress: data.activitiesProgress || {},
    // 🆕 CRÍTICO: Incluir sourceCourseId y currentTextoId en la restauración
    sourceCourseId: data.sourceCourseId || null,
    currentTextoId: data.currentTextoId || textMetadata.id || null,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    lastModified: data.lastModified?.toDate?.() || data.lastModified,
    lastAccess: data.lastAccess?.toDate?.() || data.lastAccess,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    source: 'firestore',
    textInStorage: data.textInStorage || false, // 🆕 Flag para saber si texto está en Storage
    textStorageURL: data.textStorageURL || null // 🆕 URL de Storage si aplica
  };
}

/**
 * Guarda una sesión completa en Firestore
 * @param {string} userId 
 * @param {object} sessionData - Datos de la sesión desde sessionManager
 * @returns {Promise<string>} - ID de la sesión en Firestore
 */
export async function saveSessionToFirestore(userId, sessionData) {
  try {
    logger.log('💾 [Firestore] Guardando sesión:', sessionData.id);

    // Generar hash del texto para deduplicación
    const textHash = sessionData.text?.content
      ? simpleHash(sessionData.text.content)
      : 'no-text';

    // Preparar datos para Firestore (sin el texto completo si es muy grande)
    const textContent = sessionData.text?.content || '';
    const textPreview = textContent.substring(0, 200);

    // 🆕 LÍMITE ACTUALIZADO: 1MB (límite real de Firestore)
    // Si texto >1MB → Firebase Storage, sino → Firestore directamente
    const TEXT_SIZE_LIMIT = 1000000; // 1MB en caracteres (~1MB en bytes para texto UTF-8)
    const shouldSaveFullText = textContent.length < TEXT_SIZE_LIMIT;

    let textStorageURL = null;

    // 🆕 Si el texto excede el límite, subirlo a Storage
    if (!shouldSaveFullText && textContent.length > 0) {
      logger.log(`📦 [Firestore] Texto grande detectado (${(textContent.length / 1024).toFixed(2)} KB), usando Storage...`);
      textStorageURL = await uploadTextToStorage(userId, sessionData.id, textContent);
    }

    const firestoreData = {
      // Metadata de sesión
      localSessionId: sessionData.id,
      title: sessionData.title || 'Sesión sin título',
      createdAt: new Date(sessionData.createdAt),
      lastModified: new Date(sessionData.lastModified || sessionData.createdAt),
      lastAccess: serverTimestamp(),

      // Texto
      textHash,
      textPreview,
      textContent: shouldSaveFullText ? textContent : null, // null si está en Storage
      textStorageURL: textStorageURL || null, // 🆕 URL de Storage si texto >1MB
      textInStorage: !shouldSaveFullText, // 🆕 Flag para saber dónde está el texto
      textMetadata: {
        fileName: sessionData.text?.fileName || 'texto_manual',
        fileType: sessionData.text?.fileType || 'text/plain',
        // 🆕 Guardar fileURL para poder restaurar PDFs/archivos al rehidratar desde cloud
        fileURL: sessionData.text?.fileURL || sessionData.text?.metadata?.fileURL || null,
        length: sessionData.text?.metadata?.length || textContent.length,
        words: sessionData.text?.metadata?.words || 0,
        sizeKB: Math.round(textContent.length / 1024) // 🆕 Tamaño en KB para referencia
      },

      // Análisis y progreso
      hasCompleteAnalysis: !!sessionData.completeAnalysis,
      completeAnalysis: sessionData.completeAnalysis || null,
      rubricProgress: sessionData.rubricProgress || {},

      // 🆕 CRÍTICO: Progreso de actividades (FALTABA!)
      activitiesProgress: sessionData.activitiesProgress || {},

      // 🆕 CRÍTICO: ID del curso para sincronización
      sourceCourseId: sessionData.sourceCourseId || null,

      // 🆕 CRÍTICO: ID del texto actual para coherencia
      currentTextoId: sessionData.currentTextoId || sessionData.text?.metadata?.id || null,

      // Artefactos y citas
      artifactsDrafts: sessionData.artifactsDrafts || {},
      savedCitations: sessionData.savedCitations || {},

      // 🆕 Historial del Tutor (Persistencia de mensajes)
      // 🔧 P5 FIX: Limitar a últimos 100 mensajes para evitar exceder límite de 1MB de Firestore
      tutorHistory: (sessionData.tutorHistory || []).slice(-100),

      // Settings
      settings: sessionData.settings || {},

      // 🆕 FASE 4 FIX: rewardsState NO se guarda en sesiones individuales
      // Se sincroniza solo en global_progress para evitar duplicación

      // Metadata de sincronización
      syncStatus: 'synced',
      userId,

      // 🆕 (Opción A) Señales de backup write-only
      isCloudBackup: Boolean(sessionData?.isCloudBackup),
      backupMeta: sessionData?.backupMeta || null,

      // Timestamp de Firestore
      updatedAt: serverTimestamp()
    };

    // Usar localSessionId como ID del documento para evitar duplicados
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionData.id);

    await setDoc(sessionRef, firestoreData, { merge: true });

    logger.log('✅ [Firestore] Sesión guardada exitosamente:', sessionData.id);

    return sessionData.id;

  } catch (error) {
    logger.error('❌ [Firestore] Error guardando sesión:', error);
    throw error;
  }
}

/**
 * Guarda un backup write-only de borradores (artefactos) en una colección dedicada.
 * No debe afectar al historial/listado de sesiones.
 *
 * Ruta: /users/{userId}/draftBackups/{docId}
 *
 * @param {string} userId
 * @param {object} backup
 * @param {string} backup.id - ID estable del backup (ej: draft_backup_<textoId>)
 * @param {string} backup.textoId
 * @param {string|null} backup.sourceCourseId
 * @param {object} backup.artifactsDrafts
 * @param {object|null} backup.fileMeta
 * @param {object|null} backup.backupMeta
 */
export async function saveDraftBackupToFirestore(userId, backup) {
  try {
    if (!userId) throw new Error('userId requerido');
    if (!backup || typeof backup !== 'object') throw new Error('backup inválido');

    const docId = String(backup.id || '').trim();
    const textoId = backup.textoId;
    if (!docId) throw new Error('backup.id requerido');
    if (!textoId) throw new Error('backup.textoId requerido');

    const refDoc = doc(db, 'users', userId, 'draftBackups', docId);
    const nowMs = Date.now();

    const payload = {
      id: docId,
      textoId,
      sourceCourseId: backup.sourceCourseId || null,
      artifactsDrafts: backup.artifactsDrafts || {},
      fileMeta: backup.fileMeta || null,

      // Señales explícitas de que esto NO es una sesión normal
      isCloudBackup: true,
      backupMeta: backup.backupMeta || {
        kind: 'artifactsDrafts',
        writeOnly: true,
        updatedAt: nowMs
      },

      updatedAt: serverTimestamp(),
      updatedAtMs: nowMs
    };

    // Crear createdAt solo si no existía (evitar sobrescribir en updates)
    const existing = await getDoc(refDoc);
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
      payload.createdAtMs = nowMs;
    }

    await setDoc(refDoc, payload, { merge: true });
    return docId;
  } catch (error) {
    logger.error('❌ [Firestore] Error guardando draft backup:', error);
    throw error;
  }
}

/**
 * Obtiene todas las sesiones de un usuario desde Firestore
 * @param {string} userId 
 * @param {object} options - { orderBy, limit, where }
 * @returns {Promise<Array>}
 */
export async function getUserSessions(userId, options = {}) {
  try {
    const {
      orderBy: orderByField = 'lastModified',
      orderDirection = 'desc',
      limitCount = 50,
      where: _whereClause = null,
      includeCloudBackups = false
    } = options;

    logger.log('📥 [Firestore] Obteniendo sesiones del usuario:', userId);

    const sessionsRef = collection(db, 'users', userId, 'sessions');

    let q = query(
      sessionsRef,
      orderBy(orderByField, orderDirection)
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);

    // 🆕 Mapear sesiones con soporte async para Storage
    const mapped = await Promise.all(snapshot.docs.map(mapSessionDoc));

    // 🧹 No contaminar historial de sesiones con docs auxiliares (Opción A write-only)
    const sessions = includeCloudBackups
      ? mapped
      : mapped.filter((s) => {
        if (!s || typeof s !== 'object') return false;
        if (s.isCloudBackup) return false;
        const id = String(s.id || '');
        if (id.startsWith('draft_backup_')) return false;
        const kind = s.backupMeta?.kind;
        if (kind === 'artifactsDrafts') return false;
        return true;
      });

    logger.log(`✅ [Firestore] ${sessions.length} sesiones obtenidas${includeCloudBackups ? ' (incluyendo backups)' : ''}`);

    return sessions;

  } catch (error) {
    logger.error('❌ [Firestore] Error obteniendo sesiones:', error);
    throw error;
  }
}

// [L1 cleanup] getSessionById removed — unused (see git history)

/**
 * Actualiza una sesión existente en Firestore
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {object} updates 
 */
export async function updateSessionInFirestore(userId, sessionId, updates) {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);

    await updateDoc(sessionRef, {
      ...updates,
      lastModified: new Date(),
      updatedAt: serverTimestamp()
    });

    logger.log('✅ [Firestore] Sesión actualizada:', sessionId);

  } catch (error) {
    logger.error('❌ [Firestore] Error actualizando sesión:', error);
    throw error;
  }
}

/**
 * Elimina una sesión de Firestore
 * @param {string} userId 
 * @param {string} sessionId 
 */
export async function deleteSessionFromFirestore(userId, sessionId) {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);

    // 🆕 Verificar si hay texto en Storage antes de eliminar
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists() && sessionDoc.data().textInStorage) {
      logger.log('🗑️ [Firestore] Eliminando texto de Storage...');
      await deleteTextFromStorage(userId, sessionId);
    }

    await deleteDoc(sessionRef);

    logger.log('✅ [Firestore] Sesión eliminada:', sessionId);

  } catch (error) {
    logger.error('❌ [Firestore] Error eliminando sesión:', error);
    throw error;
  }
}

/**
 * Elimina todas las sesiones de un usuario
 * @param {string} userId 
 */
export async function deleteAllUserSessions(userId) {
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const snapshot = await getDocs(sessionsRef);

    // 🔧 C3 FIX: Eliminar archivos de Storage ANTES del batch delete
    for (const docSnap of snapshot.docs) {
      if (docSnap.data().textInStorage) {
        try {
          await deleteTextFromStorage(userId, docSnap.id);
        } catch (storageError) {
          // Best-effort: continuar aunque falle un archivo individual
          logger.warn('⚠️ [Firestore] Error eliminando texto de Storage:', storageError.message);
        }
      }
    }

    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.log(`✅ [Firestore] ${snapshot.docs.length} sesiones eliminadas (+ archivos Storage)`);

  } catch (error) {
    logger.error('❌ [Firestore] Error eliminando sesiones:', error);
    throw error;
  }
}

// [L1 cleanup] syncSessionsToFirestore removed — unused (see git history)

/**
 * Combina sesiones de localStorage y Firestore (merge inteligente)
 * @param {Array} localSessions - Sesiones desde localStorage
 * @param {Array} firestoreSessions - Sesiones desde Firestore
 * @returns {Array} - Sesiones combinadas sin duplicados
 */
export function mergeSessions(localSessions, firestoreSessions) {
  const merged = new Map();

  // Agregar sesiones de Firestore primero
  firestoreSessions.forEach(session => {
    merged.set(session.localSessionId || session.id, {
      ...session,
      source: 'firestore',
      inCloud: true,
      inLocal: false
    });
  });

  // Agregar/actualizar con sesiones locales
  localSessions.forEach(session => {
    const existing = merged.get(session.id);

    if (existing) {
      // 🆕 Comparar por hash de contenido, no solo timestamp
      const localHash = getSessionContentHash(session);
      const cloudHash = getSessionContentHash(existing);

      if (localHash === cloudHash) {
        // Contenido idéntico, usar versión más reciente por timestamp
        const localModified = new Date(session.lastModified || session.createdAt).getTime();
        const cloudModified = new Date(existing.lastModified || existing.createdAt).getTime();

        merged.set(session.id, {
          ...(localModified > cloudModified ? session : existing),
          source: 'both',
          inCloud: true,
          inLocal: true,
          syncStatus: 'synced',
          contentHash: localHash
        });
      } else {
        // Contenido diferente → merge inteligente
        logger.log(`⚠️ [mergeSessions] Conflicto en sesión ${session.id}, resolviendo...`);

        const comparison = compareSessionContent(session, existing);
        logger.log('📊 [mergeSessions] Diferencias:', comparison.differences);

        const mergedSession = mergeSessionsWithConflictResolution(session, existing);

        merged.set(session.id, {
          ...mergedSession,
          source: 'both',
          inCloud: true,
          inLocal: true,
          syncStatus: 'needs-sync', // Necesita re-sincronizar versión merged
          contentHash: getSessionContentHash(mergedSession),
          hasConflict: true,
          conflictResolved: true,
          resolvedAt: Date.now()
        });
      }
    } else {
      // Solo existe en local
      merged.set(session.id, {
        ...session,
        source: 'local',
        inCloud: false,
        inLocal: true,
        syncStatus: 'local-only',
        contentHash: getSessionContentHash(session)
      });
    }
  });

  // Convertir Map a Array y ordenar por fecha
  return Array.from(merged.values()).sort((a, b) => {
    const dateA = new Date(a.lastModified || a.createdAt).getTime();
    const dateB = new Date(b.lastModified || b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Listener en tiempo real para cambios en sesiones
 * @param {string} userId 
 * @param {Function} callback 
 * @returns {Function} - Función para cancelar la suscripción
 */
export function subscribeToUserSessions(userId, callback) {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsRef, orderBy('lastModified', 'desc'), limit(50));

  return onSnapshot(q, async (snapshot) => {
    // 🆕 Mapear con soporte async para Storage
    const mapped = await Promise.all(snapshot.docs.map(mapSessionDoc));

    // Por compatibilidad, permitimos pasar options como 3er argumento sin romper llamadas previas.
    // subscribeToUserSessions(userId, callback, { includeCloudBackups: true })
    const includeCloudBackups = arguments.length >= 3 && arguments[2] && typeof arguments[2] === 'object'
      ? Boolean(arguments[2].includeCloudBackups)
      : false;

    const sessions = includeCloudBackups
      ? mapped
      : mapped.filter((s) => {
        if (!s || typeof s !== 'object') return false;
        if (s.isCloudBackup) return false;
        const id = String(s.id || '');
        if (id.startsWith('draft_backup_')) return false;
        const kind = s.backupMeta?.kind;
        if (kind === 'artifactsDrafts') return false;
        return true;
      });

    callback(sessions);
  }, (error) => {
    logger.error('❌ Error en listener de sesiones:', error);
  });
}

// ============================================
// CURSOS Y PERFIL DOCENTE (estilo Classroom)
// ============================================

export async function createCourse(docenteUid, { nombre, periodo, descripcion = '', lecturas = [], autoApprove = true }) {
  if (!docenteUid) {
    throw new Error('docenteUid requerido');
  }
  if (!nombre) {
    throw new Error('El curso debe tener un nombre');
  }
  const codigoJoin = await generateUniqueCourseCode();
  const sanitizedLecturas = sanitizeLecturasInput(lecturas);
  const courseRef = doc(collection(db, 'courses'));
  const courseData = {
    nombre,
    periodo: periodo || '2025',
    descripcion,
    docenteUid,
    autoApprove,
    codigoJoin,
    lecturasAsignadas: sanitizedLecturas,
    totalLecturas: sanitizedLecturas.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(courseRef, courseData);
  await setDoc(doc(db, 'courseCodes', codigoJoin), {
    courseId: courseRef.id,
    docenteUid,
    createdAt: serverTimestamp()
  });

  logger.log('✅ Curso creado con código:', codigoJoin);
  return { id: courseRef.id, ...courseData };
}

// [L1 cleanup] getCursosDocente removed — replaced by subscribeToCursosDocente (see git history)

/**
 * 🆕 Actualizar pesos de evaluación formativa/sumativa del curso
 * @param {string} courseId - ID del curso
 * @param {number} pesoFormativa - Peso de evaluación formativa (0-100)
 * @param {number} pesoSumativa - Peso de evaluación sumativa (0-100)
 */
export async function updateCourseWeights(courseId, pesoFormativa, pesoSumativa) {
  if (!courseId) throw new Error('courseId requerido');
  if (pesoFormativa + pesoSumativa !== 100) {
    throw new Error('Los pesos deben sumar 100%');
  }
  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    pesoFormativa,
    pesoSumativa,
    updatedAt: serverTimestamp()
  });
  logger.log(`⚖️ Curso ${courseId} pesos actualizados: F=${pesoFormativa}% S=${pesoSumativa}%`);
}

export async function assignLecturasToCourse(courseId, lecturas) {
  // 🆕 D13 FIX: Validar límite máximo de lecturas por curso
  const MAX_LECTURAS_POR_CURSO = 30;
  if (lecturas.length > MAX_LECTURAS_POR_CURSO) {
    throw new Error(`El curso no puede tener más de ${MAX_LECTURAS_POR_CURSO} lecturas. Tienes ${lecturas.length}.`);
  }

  const sanitizedLecturas = sanitizeLecturasInput(lecturas);
  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    lecturasAsignadas: sanitizedLecturas,
    totalLecturas: sanitizedLecturas.length,
    updatedAt: serverTimestamp()
  });
  logger.log(`📚 Curso ${courseId} actualizado con ${sanitizedLecturas.length} lecturas`);

  // Asignar lecturas a estudiantes activos para mantener sincronía
  const studentsSnap = await getDocs(collection(db, 'courses', courseId, 'students'));
  for (const studentDoc of studentsSnap.docs) {
    const data = studentDoc.data();
    if (data.estado === 'active') {
      await syncCourseAssignments(courseId, studentDoc.id, sanitizedLecturas);
    }
  }
}

/**
 * 🆕 Remueve una lectura específica de un curso (sin eliminarla de la biblioteca)
 * @param {string} courseId - ID del curso
 * @param {string} textoId - ID de la lectura a remover
 * @returns {Promise<boolean>}
 */
export async function removeLecturaFromCourse(courseId, textoId) {
  try {
    if (!courseId || !textoId) throw new Error('IDs requeridos');

    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      throw new Error('Curso no encontrado');
    }

    const currentLecturas = courseSnap.data().lecturasAsignadas || [];
    const updatedLecturas = currentLecturas.filter(l => l.textoId !== textoId);

    if (updatedLecturas.length === currentLecturas.length) {
      logger.log('ℹ️ La lectura no estaba asignada al curso');
      return false;
    }

    await updateDoc(courseRef, {
      lecturasAsignadas: updatedLecturas,
      totalLecturas: updatedLecturas.length,
      updatedAt: serverTimestamp()
    });

    // Mantener sincronía con estudiantes activos (para que se refleje inmediatamente)
    const studentsSnap = await getDocs(collection(db, 'courses', courseId, 'students'));
    for (const studentDoc of studentsSnap.docs) {
      const data = studentDoc.data();
      if (data.estado === 'active') {
        await syncCourseAssignments(courseId, studentDoc.id, updatedLecturas);
      }
    }

    logger.log(`✅ Lectura ${textoId} removida del curso ${courseId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error removiendo lectura del curso:', error);
    throw error;
  }
}

export async function joinCourseWithCode(codigoJoin, estudianteUid) {
  const cleanCode = (codigoJoin || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Código de curso requerido');
  }

  let step = 'init';
  const log = (...args) => logger.log('🔍 [joinCourse]', ...args);

  try {
    step = 'fetch_code';
    log('Buscando código:', cleanCode);
    const codeDoc = await getDoc(doc(db, 'courseCodes', cleanCode));
    if (!codeDoc.exists()) {
      throw new Error('Código de curso inválido');
    }

    const { courseId } = codeDoc.data();
    log('Código válido. CourseId:', courseId);

    step = 'fetch_course';
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) {
      throw new Error('Curso no encontrado');
    }

    const courseData = courseSnap.data();
    log('Curso encontrado:', courseData.nombre);

    step = 'check_existing_student';
    const studentRef = doc(db, 'courses', courseId, 'students', estudianteUid);
    const existing = await getDoc(studentRef);
    if (existing.exists()) {
      logger.warn('⚠️ [joinCourse] Estudiante ya inscrito en el curso');
      // FIXED: Ensure profile is updated even if already in course
      const userRef = doc(db, 'users', estudianteUid);
      await setDoc(userRef, {
        enrolledCourses: arrayUnion(courseId)
      }, { merge: true });

      return { courseId, estado: existing.data().estado, curso: courseData };
    }

    const estado = courseData.autoApprove === false ? 'pending' : 'active';
    log('Inscribiendo estudiante con estado:', estado);

    step = 'write_course_student';
    await setDoc(studentRef, {
      estudianteUid,
      estado,
      fechaIngreso: serverTimestamp(),
      ultimoAcceso: serverTimestamp(),
      lecturasAsignadas: (courseData.lecturasAsignadas || []).map(l => l.textoId),
      stats: {
        avancePorcentaje: 0,
        promedioScore: 0,
        tiempoLecturaTotal: 0,
        lecturasCompletadas: 0
      }
    });
    log('Estudiante inscrito en colección del curso');

    step = 'update_user_profile';
    // NEW: Update user profile with enrolled course ID for easy fetching
    const userRef = doc(db, 'users', estudianteUid);
    await setDoc(userRef, {
      enrolledCourses: arrayUnion(courseId)
    }, { merge: true });

    if (estado === 'active') {
      step = 'sync_assignments';
      log('Sincronizando asignaciones...');
      await syncCourseAssignments(courseId, estudianteUid, courseData.lecturasAsignadas || []);
      log('Asignaciones sincronizadas');
    }

    return { courseId, estado, curso: courseData };
  } catch (error) {
    logger.error(`❌ [joinCourse] Error en paso "${step}":`, error);
    throw error;
  }
}

export async function approveStudentInCourse(courseId, estudianteUid) {
  const studentRef = doc(db, 'courses', courseId, 'students', estudianteUid);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) {
    throw new Error('Solicitud no encontrada');
  }
  await updateDoc(studentRef, {
    estado: 'active',
    aprobadoEn: serverTimestamp()
  });
  const courseSnap = await getDoc(doc(db, 'courses', courseId));
  if (courseSnap.exists()) {
    await syncCourseAssignments(courseId, estudianteUid, courseSnap.data().lecturasAsignadas || []);
  }
  return true;
}

async function syncCourseAssignments(courseId, estudianteUid, lecturasAsignadas = []) {
  if (!lecturasAsignadas?.length) {
    logger.log('ℹ️ [syncCourseAssignments] Sin lecturas para sincronizar');
    return;
  }

  logger.log(`🔁 [syncCourseAssignments] Sincronizando ${lecturasAsignadas.length} lecturas para`, estudianteUid);

  for (const lectura of lecturasAsignadas) {
    if (!lectura?.textoId) {
      logger.warn('⚠️ [syncCourseAssignments] Lectura inválida detectada, se omite:', lectura);
      continue;
    }

    const progressRef = doc(db, 'students', estudianteUid, 'progress', lectura.textoId);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      logger.log('✅ [syncCourseAssignments] Progreso ya existente para texto:', lectura.textoId);
      continue;
    }

    try {
      logger.log('🆕 [syncCourseAssignments] Creando progreso para texto:', lectura.textoId);
      await setDoc(progressRef, {
        estudianteUid, // Required by seguridad
        textoId: lectura.textoId,
        titulo: lectura.titulo || '',
        estado: 'pending',
        porcentaje: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sourceCourseId: courseId,
        fechaLimite: lectura.fechaLimite || null
      });
    } catch (error) {
      logger.error(`❌ [syncCourseAssignments] Error creando progreso ${lectura.textoId}:`, error);
      throw error;
    }
  }
}

async function getCourseStudents(courseId) {
  const snapshot = await getDocs(collection(db, 'courses', courseId, 'students'));
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, estudianteUid: docSnap.id, ...docSnap.data() }));
}

/**
 * 🧹 MIGRACIÓN ONE-SHOT: Backfill de sourceCourseId en progreso legacy.
 * Caso: hay docs en students/{uid}/progress/{textoId} pero no tienen sourceCourseId,
 * lo que impide que getCourseMetrics los incluya.
 *
 * Reglas:
 * - SOLO actualiza si sourceCourseId está vacío (null/undefined/''), para no mezclar cursos.
 * - SOLO toca lecturas asignadas del curso.
 */
export async function backfillCourseProgressSourceCourseId(courseId, options = {}) {
  const {
    dryRun = false,
    limitStudents = null,
    limitUpdates = null
  } = options;

  if (!courseId) throw new Error('courseId requerido');

  const courseRef = doc(db, 'courses', courseId);
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) throw new Error('Curso no encontrado');

  const curso = { id: courseSnap.id, ...courseSnap.data() };
  const lecturasIds = (curso.lecturasAsignadas || []).map(l => l.textoId).filter(Boolean);
  if (!lecturasIds.length) {
    return {
      cursoId: courseId,
      students: 0,
      checkedDocs: 0,
      updatedDocs: 0,
      skippedOtherCourse: 0,
      skippedMissing: 0,
      dryRun
    };
  }

  let estudiantes = await getCourseStudents(courseId);
  if (limitStudents !== null) estudiantes = estudiantes.slice(0, limitStudents);

  let checkedDocs = 0;
  let updatedDocs = 0;
  let skippedOtherCourse = 0;
  let skippedMissing = 0;

  for (const est of estudiantes) {
    const uid = est.estudianteUid;
    if (!uid) continue;

    for (const textoId of lecturasIds) {
      if (limitUpdates !== null && updatedDocs >= limitUpdates) {
        return {
          cursoId: courseId,
          students: estudiantes.length,
          checkedDocs,
          updatedDocs,
          skippedOtherCourse,
          skippedMissing,
          dryRun,
          stoppedByLimit: true
        };
      }

      const progressRef = doc(db, 'students', uid, 'progress', textoId);
      const snap = await getDoc(progressRef);
      checkedDocs += 1;

      if (!snap.exists()) {
        skippedMissing += 1;
        continue;
      }

      const data = snap.data() || {};
      const scid = data?.sourceCourseId;
      if (scid && scid !== courseId) {
        skippedOtherCourse += 1;
        continue;
      }

      const isEmpty = (scid === undefined || scid === null || scid === '');
      if (!isEmpty) continue;

      if (dryRun) {
        updatedDocs += 1;
        continue;
      }

      await updateDoc(progressRef, {
        sourceCourseId: courseId,
        // reforzar campos mínimos usados por panel docente
        estudianteUid: data.estudianteUid || uid,
        textoId: data.textoId || textoId,
        updatedAt: serverTimestamp(),
        lastSync: new Date().toISOString(),
        syncType: 'backfill_sourceCourseId'
      });
      updatedDocs += 1;
    }
  }

  return {
    cursoId: courseId,
    students: estudiantes.length,
    checkedDocs,
    updatedDocs,
    skippedOtherCourse,
    skippedMissing,
    dryRun
  };
}

/**
 * 🆕 D3 FIX: Versión optimizada con soporte para paginación
 * @param {string} courseId 
 * @param {object} options - { limit, offset, batchSize }
 * @returns {Promise<object>} - { curso, estudiantes, resumen, pagination }
 */
export async function getCourseMetrics(courseId, options = {}) {
  const { limit = null, offset = 0, batchSize: _batchSize = 20 } = options;

  const courseRef = doc(db, 'courses', courseId);
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) {
    throw new Error('Curso no encontrado');
  }
  const curso = { id: courseSnap.id, ...courseSnap.data() };
  const lecturasIds = (curso.lecturasAsignadas || []).map(l => l.textoId).filter(Boolean);

  // Obtener todos los estudiantes
  let allEstudiantes = await getCourseStudents(courseId);
  const totalEstudiantes = allEstudiantes.length;

  // 🆕 D3 FIX: Aplicar paginación si se especifica límite
  if (limit !== null) {
    allEstudiantes = allEstudiantes.slice(offset, offset + limit);
    logger.log(`📊 [getCourseMetrics] Paginación: mostrando ${allEstudiantes.length} de ${totalEstudiantes} estudiantes`);
  }

  const estudiantes = allEstudiantes;

  let sumAvance = 0;
  let sumScore = 0;
  let scoreCount = 0;
  let sumTiempo = 0;

  // OPTIMIZACIÓN: Ejecutar consultas de progreso en paralelo
  const studentsPromises = estudiantes.map(async (estudiante) => {
    const stats = {
      avancePorcentaje: 0,
      promedioScore: 0,
      tiempoLecturaTotal: 0,
      lecturasCompletadas: 0,
      ...(estudiante.stats || {})
    };

    // Enriquecer con nombre del estudiante (si existe en /users)
    let estudianteNombre = estudiante.estudianteNombre || estudiante.nombre || null;
    if (!estudianteNombre) {
      try {
        const userSnap = await getDoc(doc(db, 'users', estudiante.estudianteUid));
        estudianteNombre = userSnap.exists() ? (userSnap.data()?.nombre || userSnap.data()?.displayName || null) : null;
      } catch (e) {
        // best-effort
      }
    }

    if (lecturasIds.length) {
      const progressQuery = query(
        collection(db, 'students', estudiante.estudianteUid, 'progress'),
        where('sourceCourseId', '==', courseId)
      );

      const progressSnap = await getDocs(progressQuery);
      let relevantes = progressSnap.docs.filter(docSnap => lecturasIds.includes(docSnap.id));

      // Fallback: si no hay docs por sourceCourseId, intentar por ID exacto de lectura
      // SOLO si el doc no tiene sourceCourseId (null/undefined) para evitar mezclar cursos.
      if (!relevantes.length) {
        const fallbackDocs = [];
        await Promise.all(lecturasIds.map(async (textoId) => {
          try {
            const ref = doc(db, 'students', estudiante.estudianteUid, 'progress', textoId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;
            const data = snap.data();
            const scid = data?.sourceCourseId;
            if (scid === undefined || scid === null || scid === '' || scid === courseId) {
              fallbackDocs.push(snap);
            }
          } catch (e) {
            // best-effort
          }
        }));

        if (fallbackDocs.length) {
          logger.warn('⚠️ [getCourseMetrics] Usando fallback por textoId (sourceCourseId ausente) para estudiante:', estudiante.estudianteUid);
        }

        // Simular la misma estructura (docs) para reusar el cálculo
        relevantes = [...relevantes, ...fallbackDocs];
      }

      if (relevantes.length) {
        const totalAvance = relevantes.reduce((acc, docSnap) => acc + (docSnap.data().porcentaje || docSnap.data().progress || docSnap.data().avancePorcentaje || 0), 0);
        const completadas = relevantes.filter(docSnap => (docSnap.data().estado === 'completed') || (docSnap.data().porcentaje || docSnap.data().progress || 0) >= 100).length;
        const totalScore = relevantes.reduce((acc, docSnap) => acc + (docSnap.data().score || docSnap.data().ultimaPuntuacion || 0), 0);
        const scoreEntries = relevantes.filter(docSnap => (docSnap.data().score || docSnap.data().ultimaPuntuacion)).length;
        const totalTiempo = relevantes.reduce((acc, docSnap) => acc + (docSnap.data().tiempoLecturaTotal || docSnap.data().tiempoTotal || 0), 0);

        // 🆕 ENTREGA FINAL: Contar entregas completadas
        const entregasCompletas = relevantes.filter(docSnap => docSnap.data().entregaFinal?.completa === true).length;
        const totalArtefactosEntregados = relevantes.reduce((acc, docSnap) =>
          acc + (docSnap.data().entregaFinal?.entregados || 0), 0
        );

        // 🆕 Contar entregas sin revisar por el docente (sin límite de tiempo)
        let entregasRecientes = 0;
        
        relevantes.forEach(docSnap => {
          const data = docSnap.data();
          const activitiesProgress = data.activitiesProgress || {};
          
          // Buscar artifacts en estructura anidada
          Object.values(activitiesProgress).forEach(lecProgress => {
            const artifacts = lecProgress?.artifacts || {};
            Object.values(artifacts).forEach(artifact => {
              // Es "nueva" si está entregada y NO ha sido vista por el docente
              if (artifact?.submitted && !artifact.viewedByTeacher) {
                entregasRecientes++;
              }
            });
          });
        });

        stats.avancePorcentaje = lecturasIds.length ? Math.round(totalAvance / lecturasIds.length) : stats.avancePorcentaje;
        stats.lecturasCompletadas = completadas;
        stats.promedioScore = scoreEntries ? Number((totalScore / scoreEntries).toFixed(2)) : stats.promedioScore;
        stats.tiempoLecturaTotal = Number(totalTiempo.toFixed(1));

        // 🆕 ENTREGA FINAL: Agregar métricas de entregas
        stats.entregasCompletas = entregasCompletas;
        stats.artefactosEntregados = totalArtefactosEntregados;
        stats.totalArtefactosPosibles = relevantes.length * 5; // 5 artefactos por lectura
        stats.entregasRecientes = entregasRecientes; // 🆕 Nuevas entregas sin revisar
        
        // 🆕 DETALLE POR LECTURA: Construir objeto con progreso específico por lectura
        const lecturaDetails = {};
        relevantes.forEach(docSnap => {
          const textoId = docSnap.id;
          const data = docSnap.data();
          const activitiesProgress = data.activitiesProgress || {};
          const rubricProgress = data.rubricProgress || {};
          
          // Buscar artifacts en estructura anidada (activitiesProgress[textoId].artifacts)
          let artifacts = {};
          if (activitiesProgress[textoId]?.artifacts) {
            artifacts = activitiesProgress[textoId].artifacts;
          } else if (activitiesProgress.artifacts) {
            artifacts = activitiesProgress.artifacts;
          } else {
            // Buscar en cualquier key
            Object.keys(activitiesProgress).forEach(key => {
              if (activitiesProgress[key]?.artifacts) {
                artifacts = activitiesProgress[key].artifacts;
              }
            });
          }
          
          // Mapear rúbricas a artefactos para obtener scores
          const rubricMapping = {
            resumenAcademico: 'rubrica1',
            tablaACD: 'rubrica2',
            mapaActores: 'rubrica3',
            respuestaArgumentativa: 'rubrica4',
            bitacoraEticaIA: 'rubrica5'
          };
          
          // Enriquecer artifacts con rubricScore
          const enrichedArtifacts = {};
          ['resumenAcademico', 'tablaACD', 'mapaActores', 'respuestaArgumentativa', 'bitacoraEticaIA'].forEach(artKey => {
            const art = artifacts[artKey] || {};
            const rubricKey = rubricMapping[artKey];
            const rubric = rubricProgress[rubricKey] || {};
            
            // 🔧 FIX: Obtener score con prioridad correcta
            // art.score puede ser 0 por bug legacy → no usar si es 0
            // Prioridad: submitted score > lastScore > rubric.average > rubric.scores último > summative
            let rubricScore = 0;
            if (art.submitted && art.score > 0) rubricScore = art.score;
            else if (art.lastScore > 0) rubricScore = art.lastScore;
            else if (art.score > 0) rubricScore = art.score;
            else if (rubric.average > 0) rubricScore = rubric.average;
            else if (rubric.scores?.length > 0) {
              const lastEntry = rubric.scores[rubric.scores.length - 1];
              rubricScore = typeof lastEntry === 'object' ? (lastEntry.score || 0) : (lastEntry || 0);
            }
            // 🆕 Fallback: ensayo sumativo (summative) si existe
            if (rubricScore <= 0 && rubric.summative?.status === 'graded' && rubric.summative?.score > 0) {
              rubricScore = Number(rubric.summative.score) || 0;
            }
            
            // 🆕 Si el docente hizo override, usar ese como score definitivo
            if (art.teacherOverrideScore > 0) {
              rubricScore = art.teacherOverrideScore;
            }
            
            enrichedArtifacts[artKey] = {
              ...art,
              rubricScore: rubricScore || 0,
              attempts: art.attempts || rubric.scores?.length || 0,
              submitted: art.submitted || false,
              teacherOverrideScore: art.teacherOverrideScore || null
            };
          });
          
          // 🆕 Incluir ensayo sumativo en lecturaDetails para la vista overview
          const summativeEssays = [];
          ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4'].forEach(rubricKey => {
            const rubric = rubricProgress[rubricKey] || {};
            const summativeScore = rubric.summative?.teacherOverrideScore ?? rubric.summative?.score;
            if (rubric.summative?.status === 'graded' && summativeScore > 0) {
              summativeEssays.push({
                rubricId: rubricKey,
                score: Number(summativeScore) || 0,
                submitted: true,
                teacherOverrideScore: rubric.summative?.teacherOverrideScore ?? null,
                scoreOverrideReason: rubric.summative?.scoreOverrideReason ?? null,
                scoreOverriddenAt: rubric.summative?.scoreOverriddenAt ?? null,
                docenteNombre: rubric.summative?.docenteNombre ?? null
              });
            }
          });

          lecturaDetails[textoId] = {
            avance: data.porcentaje || data.progress || data.avancePorcentaje || 0,
            score: data.score || data.ultimaPuntuacion || 0,
            tiempo: data.tiempoLecturaTotal || data.tiempoTotal || 0,
            artifacts: enrichedArtifacts,
            summativeEssays,
            lastUpdated: data.lastUpdated || data.lastSync
          };
        });
        
        stats.lecturaDetails = lecturaDetails;
      }
    }

    return { 
      ...estudiante, 
      estudianteNombre: estudianteNombre || estudiante.estudianteUid, 
      stats,
      lecturaDetails: stats.lecturaDetails || {} // 🆕 Acceso directo a detalle por lectura
    };
  });

  const enrichedStudents = await Promise.all(studentsPromises);

  // Calcular totales para resumen
  let sumEntregas = 0;
  let sumArtefactos = 0;

  enrichedStudents.forEach(est => {
    sumAvance += est.stats.avancePorcentaje || 0;
    sumTiempo += est.stats.tiempoLecturaTotal || 0;
    sumEntregas += est.stats.entregasCompletas || 0;
    sumArtefactos += est.stats.artefactosEntregados || 0;
    if (est.stats.promedioScore) {
      sumScore += est.stats.promedioScore;
      scoreCount++;
    }
  });

  const resumen = {
    totalEstudiantes: estudiantes.length,
    activos: estudiantes.filter(s => s.estado === 'active').length,
    pendientes: estudiantes.filter(s => s.estado === 'pending').length,
    promedioAvance: estudiantes.length ? Number((sumAvance / estudiantes.length).toFixed(1)) : 0,
    promedioScore: scoreCount ? Number((sumScore / scoreCount).toFixed(2)) : 0,
    tiempoTotal: Number(sumTiempo.toFixed(1)),
    // 🆕 ENTREGA FINAL: Métricas de entregas para dashboard
    entregasCompletas: sumEntregas,
    artefactosEntregados: sumArtefactos,
    estudiantesConEntregaCompleta: enrichedStudents.filter(e => e.stats.entregasCompletas > 0).length
  };

  return { curso, estudiantes: enrichedStudents, resumen };
}

// ============================================
// FUNCIONES DE ELIMINACIÓN (TEACHER MGMT)
// ============================================

export async function deleteText(textId) {
  try {
    if (!textId) throw new Error('ID de texto requerido');

    // 🆕 D2 FIX: Obtener info del texto para eliminar archivo de Storage
    const textoRef = doc(db, 'textos', textId);
    const textoSnap = await getDoc(textoRef);

    if (textoSnap.exists()) {
      const { fileURL } = textoSnap.data();

      // Eliminar archivo de Storage si existe URL
      if (fileURL) {
        try {
          // Extraer path de Storage desde la URL
          const storageRef = ref(storage, fileURL);
          await deleteObject(storageRef);
          logger.log('🗑️ Archivo eliminado de Storage');
        } catch (storageError) {
          // Continuar aunque falle Storage (puede que ya no exista)
          logger.warn('⚠️ No se pudo eliminar archivo de Storage:', storageError.message);
        }
      }
    }

    // Eliminar documento de Firestore
    await deleteDoc(textoRef);
    logger.log('✅ Texto eliminado:', textId);
    return true;
  } catch (error) {
    logger.error('❌ Error eliminando texto:', error);
    throw error;
  }
}

/**
 * Elimina una lectura de la biblioteca y también la quita de todos los cursos del docente.
 * Regla de negocio:
 * - Borrar desde "Lecturas iniciales" (biblioteca) puede borrar en todos los cursos.
 * - Quitar desde un curso NO debe borrar de la biblioteca.
 */
export async function deleteTextEverywhere(textId, docenteUid) {
  try {
    if (!textId) throw new Error('ID de texto requerido');

    // 1) Determinar docenteUid si no viene
    let resolvedDocenteUid = docenteUid;
    const textoRef = doc(db, 'textos', textId);
    if (!resolvedDocenteUid) {
      const textoSnap = await getDoc(textoRef);
      resolvedDocenteUid = textoSnap.exists() ? (textoSnap.data()?.docenteUid || null) : null;
    }

    // 2) Quitar de todos los cursos del docente (best-effort)
    let coursesUpdated = 0;
    if (resolvedDocenteUid) {
      const q = query(
        collection(db, 'courses'),
        where('docenteUid', '==', resolvedDocenteUid)
      );
      const snapshot = await getDocs(q);

      for (const courseDoc of snapshot.docs) {
        const data = courseDoc.data();
        const currentLecturas = data?.lecturasAsignadas || [];
        const updatedLecturas = currentLecturas.filter(l => l?.textoId !== textId);

        if (updatedLecturas.length !== currentLecturas.length) {
          await updateDoc(courseDoc.ref, {
            lecturasAsignadas: updatedLecturas,
            totalLecturas: updatedLecturas.length,
            updatedAt: serverTimestamp()
          });
          coursesUpdated += 1;
        }
      }
    }

    // 3) Eliminar la lectura de la biblioteca (doc + storage)
    await deleteText(textId);
    return { coursesUpdated };
  } catch (error) {
    logger.error('❌ Error eliminando texto globalmente:', error);
    throw error;
  }
}

export async function deleteCourse(courseId) {
  try {
    if (!courseId) throw new Error('ID de curso requerido');

    // 1. Obtener datos del curso
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      throw new Error('Curso no encontrado');
    }

    const courseData = courseSnap.data();

    // Guard: evitar errores ambiguos de permisos
    const currentUid = auth?.currentUser?.uid || null;
    if (currentUid && courseData?.docenteUid && courseData.docenteUid !== currentUid) {
      throw new Error('No tienes permisos para eliminar este curso (no eres el docente dueño).');
    }
    const code = courseData.codigoJoin;
    const lecturasAsignadas = courseData.lecturasAsignadas || [];

    // 2. Eliminar código del curso
    if (code) {
      try {
        await deleteDoc(doc(db, 'courseCodes', code));
      } catch (codeError) {
        // No bloquear el borrado del curso por datos legacy en courseCodes.
        // Un código huérfano solo causará que joinCourse falle con "Curso no encontrado".
        logger.warn('⚠️ No se pudo eliminar courseCodes para el curso. Continuando...', {
          code,
          courseId,
          message: codeError?.message
        });
      }
    }

    // 3. Obtener estudiantes y limpiar sus datos
    const studentsSnap = await getDocs(collection(db, 'courses', courseId, 'students'));

    for (const studentDoc of studentsSnap.docs) {
      const studentUid = studentDoc.id;

      // 🆕 D12 FIX: Limpiar progreso de lecturas asociadas a este curso
      for (const lectura of lecturasAsignadas) {
        if (lectura?.textoId) {
          try {
            const progressRef = doc(db, 'students', studentUid, 'progress', lectura.textoId);
            const progressSnap = await getDoc(progressRef);

            // Solo eliminar si el progreso pertenece a este curso
            if (progressSnap.exists() && progressSnap.data().sourceCourseId === courseId) {
              await deleteDoc(progressRef);
              logger.log(`🗑️ Progreso ${lectura.textoId} eliminado para estudiante ${studentUid}`);
            }
          } catch (progressError) {
            logger.warn(`⚠️ Error limpiando progreso ${lectura.textoId}:`, progressError.message);
          }
        }
      }

      // 🆕 D12 FIX: Quitar curso de enrolledCourses del estudiante
      try {
        const userRef = doc(db, 'users', studentUid);
        await updateDoc(userRef, {
          enrolledCourses: arrayRemove(courseId)
        });
      } catch (enrollError) {
        logger.warn(`⚠️ Error quitando curso de enrolledCourses:`, enrollError.message);
      }

      // Eliminar registro de inscripción
      await deleteDoc(doc(db, 'courses', courseId, 'students', studentUid));
    }

    // 4. Eliminar documento del curso
    await deleteDoc(courseRef);
    logger.log('✅ Curso eliminado con limpieza completa:', courseId);
    return true;
  } catch (error) {
    logger.error('❌ Error eliminando curso:', error);
    throw error;
  }
}

export async function deleteStudentFromCourse(courseId, studentUid) {
  try {
    if (!courseId || !studentUid) throw new Error('IDs requeridos');

    // 1. Eliminar de la subcolección del curso
    await deleteDoc(doc(db, 'courses', courseId, 'students', studentUid));

    // 2. 🆕 CRÍTICO: También quitar del array enrolledCourses del usuario
    try {
      const userRef = doc(db, 'users', studentUid);
      await updateDoc(userRef, {
        enrolledCourses: arrayRemove(courseId)
      });
      logger.log('✅ Estudiante eliminado del curso y de enrolledCourses:', studentUid);
    } catch (enrollError) {
      // Si falla actualizar el perfil, al menos ya se eliminó de la subcolección
      logger.warn('⚠️ No se pudo actualizar enrolledCourses del usuario:', enrollError);
    }

    return true;
  } catch (error) {
    logger.error('❌ Error eliminando estudiante:', error);
    throw error;
  }
}

export async function withdrawFromCourse(courseId, studentUid) {
  try {
    // 1. Quitar del array del perfil
    const userRef = doc(db, 'users', studentUid);
    await updateDoc(userRef, {
      enrolledCourses: arrayRemove(courseId)
    });

    // 2. Eliminar de la subcolección del curso
    return deleteStudentFromCourse(courseId, studentUid);
  } catch (error) {
    logger.error('❌ Error saliendo del curso:', error);
    throw error;
  }
}

export async function getStudentCourses(studentUid) {
  try {
    const userRef = doc(db, 'users', studentUid);
    const userSnap = await getDoc(userRef);

    // Fallback: Si no hay enrolledCourses, intentamos collectionGroup (útil para migración)
    // o si el usuario no tiene perfil aún.
    const enrolledIds = userSnap.exists() ? (userSnap.data().enrolledCourses || []) : [];

    if (enrolledIds.length > 0) {
      logger.log('📚 [getStudentCourses] Usando lista de cursos del perfil:', enrolledIds.length);
      const coursesPromises = enrolledIds.map(async (courseId) => {
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (!courseSnap.exists()) return null;

        // Obtener estado real desde la subcolección del curso
        const enrollmentSnap = await getDoc(doc(db, 'courses', courseId, 'students', studentUid));
        const status = enrollmentSnap.exists() ? enrollmentSnap.data().estado : 'unknown';

        return {
          id: courseSnap.id,
          ...courseSnap.data(),
          enrollmentStatus: status
        };
      });

      const courses = await Promise.all(coursesPromises);
      return courses.filter(Boolean);
    }

    // Fallback antiguo si el array está vacío (para usuarios viejos)
    logger.warn('⚠️ [getStudentCourses] Sin enrolledCourses, usando fallback lento (collectionGroup)');
    const studentsQuery = query(
      collectionGroup(db, 'students'),
      where('estudianteUid', '==', studentUid)
    );
    const snapshot = await getDocs(studentsQuery);
    // ... lógica anterior ...
    const courses = [];
    for (const docSnap of snapshot.docs) {
      const courseRef = docSnap.ref.parent.parent;
      if (courseRef) {
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          courses.push({
            id: courseSnap.id,
            ...courseSnap.data(),
            enrollmentStatus: docSnap.data().estado
          });
        }
      }
    }
    return courses;
  } catch (error) {
    logger.error('❌ Error obteniendo cursos del estudiante:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 RESET DE ARTEFACTOS (Para docentes)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resetea un artefacto específico de un estudiante para una lectura
 * @param {string} studentUid - UID del estudiante
 * @param {string} textoId - ID del texto/lectura
 * @param {string} artifactName - Nombre del artefacto (resumenAcademico, tablaACD, etc.)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function resetStudentArtifact(studentUid, textoId, artifactName) {
  try {
    if (!studentUid || !textoId || !artifactName) {
      throw new Error('Se requieren studentUid, textoId y artifactName');
    }

    logger.log(`🔄 [Reset] Iniciando reset de ${artifactName} para ${studentUid} en ${textoId}`);

    const progressRef = doc(db, 'students', studentUid, 'progress', textoId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      return { success: true, message: 'No hay progreso que resetear' };
    }

    const currentData = progressSnap.data();
    const activitiesProgress = currentData.activitiesProgress || {};

    // Siempre resetear en la estructura que consume el estudiante:
    // activitiesProgress[textoId].artifacts.<artifactName>
    // Además, si existen estructuras duplicadas (activitiesProgress.artifacts o keys alternativas), resetearlas también.
    const artifactsPaths = new Set();
    artifactsPaths.add(`activitiesProgress.${textoId}.artifacts`);
    if (activitiesProgress?.artifacts) artifactsPaths.add('activitiesProgress.artifacts');
    if (activitiesProgress && typeof activitiesProgress === 'object') {
      Object.keys(activitiesProgress).forEach((key) => {
        if (activitiesProgress[key]?.artifacts) {
          artifactsPaths.add(`activitiesProgress.${key}.artifacts`);
        }
      });
    }

    const resetArtifactPayload = {
      history: [],
      attempts: 0,
      submitted: false,
      submittedAt: null,
      score: null,
      nivel: null,
      lastScore: null,
      lastNivel: null,
      lastEvaluatedAt: null,
      drafts: null,
      draft: null,
      finalContent: null,
      teacherComment: null,
      commentedAt: null,
      commentedBy: null,
      resetAt: new Date().toISOString(),
      resetBy: 'docente'
    };

    // También resetear la rúbrica asociada si existe
    const rubricMapping = {
      resumenAcademico: 'rubrica1',
      tablaACD: 'rubrica2',
      mapaActores: 'rubrica3',
      respuestaArgumentativa: 'rubrica4',
      bitacoraEticaIA: 'rubrica5'
    };

    const rubricProgress = { ...(currentData.rubricProgress || {}) };
    const rubricKey = rubricMapping[artifactName];
    if (rubricKey) {
      // 🔧 FORMATO CORRECTO: Usar estructura con scores array
      rubricProgress[rubricKey] = {
        scores: [],
        average: 0,
        lastUpdate: Date.now(),
        artefactos: [],
        resetAt: new Date().toISOString(),
        resetBy: 'docente'
      };
    }

    // Construir updateData para cada variante de estructura encontrada
    const updateData = {
      rubricProgress,
      lastResetAt: serverTimestamp()
    };

    artifactsPaths.forEach((path) => {
      // Obtener artifacts actuales de ese path si existen (para no borrar otros artefactos)
      let existingArtifacts = {};
      if (path === `activitiesProgress.${textoId}.artifacts`) {
        existingArtifacts = { ...(activitiesProgress?.[textoId]?.artifacts || {}) };
      } else if (path === 'activitiesProgress.artifacts') {
        existingArtifacts = { ...(activitiesProgress?.artifacts || {}) };
      } else {
        const key = path.replace('activitiesProgress.', '').replace('.artifacts', '');
        existingArtifacts = { ...(activitiesProgress?.[key]?.artifacts || {}) };
      }

      updateData[path] = {
        ...existingArtifacts,
        [artifactName]: resetArtifactPayload
      };
    });

    logger.log('📝 [Reset] Actualizando con:', { artifactsPaths: Array.from(artifactsPaths), artifactName, rubricKey });
    await updateDoc(progressRef, updateData);

    logger.log(`✅ [Reset] Artefacto ${artifactName} reseteado para estudiante ${studentUid} en texto ${textoId}`);
    return { success: true, message: `Artefacto "${artifactName}" reseteado correctamente` };
  } catch (error) {
    logger.error('❌ Error reseteando artefacto:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Resetea todos los artefactos de un estudiante para una lectura específica
 * @param {string} studentUid - UID del estudiante
 * @param {string} textoId - ID del texto/lectura
 * @returns {Promise<{success: boolean, message: string, resetCount: number}>}
 */
export async function resetAllStudentArtifacts(studentUid, textoId) {
  try {
    if (!studentUid || !textoId) {
      throw new Error('Se requieren studentUid y textoId');
    }

    logger.log(`🔄 [Reset ALL] Iniciando reset de todos los artefactos para ${studentUid} en ${textoId}`);

    const progressRef = doc(db, 'students', studentUid, 'progress', textoId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      return { success: true, message: 'No hay progreso que resetear', resetCount: 0 };
    }

    const currentData = progressSnap.data();
    const activitiesProgress = currentData.activitiesProgress || {};

    // 🔧 Resetear SIEMPRE en activitiesProgress[textoId].artifacts (lo que lee el estudiante)
    // y también en otras variantes si existen.
    const artifactsPaths = new Set();
    artifactsPaths.add(`activitiesProgress.${textoId}.artifacts`);
    if (activitiesProgress?.artifacts) artifactsPaths.add('activitiesProgress.artifacts');
    if (activitiesProgress && typeof activitiesProgress === 'object') {
      Object.keys(activitiesProgress).forEach((key) => {
        if (activitiesProgress[key]?.artifacts) {
          artifactsPaths.add(`activitiesProgress.${key}.artifacts`);
        }
      });
    }

    const artifactNames = [
      'resumenAcademico',
      'tablaACD', 
      'mapaActores',
      'respuestaArgumentativa',
      'bitacoraEticaIA'
    ];

    // Crear estructura vacía para todos los artefactos
    const emptyArtifacts = {};
    artifactNames.forEach(name => {
      emptyArtifacts[name] = {
        history: [],
        attempts: 0,
        submitted: false,
        submittedAt: null,
        score: null,
        nivel: null,
        lastScore: null,
        lastNivel: null,
        lastEvaluatedAt: null,
        drafts: null,
        draft: null,
        finalContent: null,
        teacherComment: null,
        commentedAt: null,
        commentedBy: null,
        resetAt: new Date().toISOString(),
        resetBy: 'docente'
      };
    });

    // Resetear todas las rúbricas con estructura correcta (scores array)
    const emptyRubrics = {
      rubrica1: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: 'docente' },
      rubrica2: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: 'docente' },
      rubrica3: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: 'docente' },
      rubrica4: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: 'docente' },
      rubrica5: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: 'docente' }
    };

    const updateData = {
      rubricProgress: emptyRubrics,
      lastResetAt: serverTimestamp()
    };

    artifactsPaths.forEach((path) => {
      updateData[path] = emptyArtifacts;
    });

    logger.log('📝 [Reset ALL] Actualizando con paths:', Array.from(artifactsPaths));
    await updateDoc(progressRef, updateData);

    logger.log(`✅ [Reset ALL] Todos los artefactos reseteados para estudiante ${studentUid} en texto ${textoId}`);
    return { success: true, message: 'Todos los artefactos reseteados', resetCount: artifactNames.length };
  } catch (error) {
    logger.error('❌ Error reseteando todos los artefactos:', error);
    return { success: false, message: error.message, resetCount: 0 };
  }
}

/**
 * Obtiene el detalle de progreso de artefactos de un estudiante para una lectura
 * @param {string} studentUid - UID del estudiante
 * @param {string} textoId - ID del texto/lectura
 * @returns {Promise<Object>} Detalle de artefactos con intentos, estado, historial
 */
export async function getStudentArtifactDetails(studentUid, textoId) {
  try {
    if (!studentUid || !textoId) {
      throw new Error('Se requieren studentUid y textoId');
    }

    logger.log('🔍 [getStudentArtifactDetails] Buscando:', { studentUid, textoId });
    
    const progressRef = doc(db, 'students', studentUid, 'progress', textoId);
    const progressSnap = await getDoc(progressRef);

    logger.log('📄 [getStudentArtifactDetails] Documento existe:', progressSnap.exists());

    if (!progressSnap.exists()) {
      logger.log('⚠️ [getStudentArtifactDetails] No existe documento de progreso');
      return {
        hasProgress: false,
        artifacts: {},
        rubricProgress: {}
      };
    }

    const data = progressSnap.data();
    // Evitar loguear contenido sensible/pesado (p.ej. ensayos). Loguear solo forma/keys.
    try {
      const topKeys = data && typeof data === 'object' ? Object.keys(data) : [];
      const rubricKeys = data?.rubricProgress && typeof data.rubricProgress === 'object' ? Object.keys(data.rubricProgress) : [];
      const hasActivitiesProgress = !!data?.activitiesProgress;
      logger.log('📊 [getStudentArtifactDetails] Data resumen:', {
        topKeys,
        rubricKeys,
        hasActivitiesProgress
      });
    } catch (e) {
      // Silencioso: el log es solo diagnóstico.
    }
    
    // 🔧 ESTRUCTURA CORRECTA: activitiesProgress puede tener los datos anidados bajo textoId
    // Estructura 1: data.activitiesProgress[textoId].artifacts
    // Estructura 2: data.activitiesProgress.artifacts (directa)
    let artifacts = {};
    
    // Intentar estructura anidada primero (como se guarda desde AppContext)
    if (data.activitiesProgress?.[textoId]?.artifacts) {
      artifacts = data.activitiesProgress[textoId].artifacts;
      logger.log('🎯 [getStudentArtifactDetails] Usando estructura anidada [textoId].artifacts');
    } 
    // Fallback: estructura directa
    else if (data.activitiesProgress?.artifacts) {
      artifacts = data.activitiesProgress.artifacts;
      logger.log('🎯 [getStudentArtifactDetails] Usando estructura directa .artifacts');
    }
    // Último intento: buscar en cualquier key de activitiesProgress que tenga artifacts
    else if (data.activitiesProgress && typeof data.activitiesProgress === 'object') {
      const keys = Object.keys(data.activitiesProgress);
      for (const key of keys) {
        if (data.activitiesProgress[key]?.artifacts) {
          artifacts = data.activitiesProgress[key].artifacts;
          logger.log(`🎯 [getStudentArtifactDetails] Encontrado artifacts bajo key: ${key}`);
          break;
        }
      }
    }
    
    const rubricProgress = data.rubricProgress || {};
    
    logger.log('🎯 [getStudentArtifactDetails] Artifacts encontrados:', Object.keys(artifacts));
    logger.log('📈 [getStudentArtifactDetails] RubricProgress:', Object.keys(rubricProgress));

    // 🔧 Helper para obtener el score correcto de una rúbrica
    // La estructura real es: { scores: [{score, timestamp}...], average, lastUpdate }
    const getRubricScore = (rubricKey, artifactData) => {
      const rubric = rubricProgress[rubricKey];

      // 🏆 Prioridad MÁXIMA: teacherOverrideScore (nota editada por el docente)
      // Consistente con getCourseMetrics: el override siempre gana
      if (artifactData?.teacherOverrideScore > 0) {
        return artifactData.teacherOverrideScore;
      }
      
      // Prioridad 1: Si el artefacto está entregado y tiene score válido (>0)
      if (artifactData?.submitted && artifactData?.score > 0) {
        return artifactData.score;
      }
      
      // Prioridad 2: lastScore del artefacto (más reciente, debe ser >0)
      if (artifactData?.lastScore > 0) {
        return artifactData.lastScore;
      }
      
      // Prioridad 2.5: score del artefacto si es >0 (puede venir de evaluación)
      if (artifactData?.score > 0) {
        return artifactData.score;
      }
      
      // Prioridad 3: Promedio de la rúbrica
      if (rubric?.average > 0) {
        return rubric.average;
      }

      // Prioridad 3.5: Ensayo Integrador (SUMATIVO) si existe (para casos sin formativo)
      if (rubric?.summative && rubric.summative.status === 'graded' && rubric.summative.score != null) {
        return Number(rubric.summative.score) || 0;
      }
      
      // Prioridad 4: Último score del array
      if (rubric?.scores?.length > 0) {
        const lastScoreEntry = rubric.scores[rubric.scores.length - 1];
        return typeof lastScoreEntry === 'object' ? lastScoreEntry.score : lastScoreEntry;
      }
      
      return 0;
    };

    // 📝 Ensayo Integrador (sumativo): puede existir SOLO en rubrica1–4
    const buildSummativeEssays = () => {
      const essays = [];
      ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4'].forEach((rubricId) => {
        const r = rubricProgress?.[rubricId];
        const s = r?.summative;
        if (!s || s.status !== 'graded' || (s.score == null && s.teacherOverrideScore == null)) return;

        const scoreNum = Number(s.teacherOverrideScore ?? s.score);
        if (!Number.isFinite(scoreNum) || scoreNum <= 0) return;

        essays.push({
          rubricId,
          score: scoreNum,
          teacherOverrideScore: s.teacherOverrideScore ?? null,
          scoreOverrideReason: s.scoreOverrideReason ?? null,
          scoreOverriddenAt: s.scoreOverriddenAt ?? null,
          docenteNombre: s.docenteNombre ?? null,
          teacherComment: s.teacherComment ?? null,
          commentedAt: s.commentedAt ?? null,
          commentedBy: s.commentedBy ?? null,
          nivel: s.nivel ?? null,
          essayContent: s.essayContent ?? null,
          submittedAt: s.submittedAt ?? null,
          gradedAt: s.gradedAt ?? null,
          attemptsUsed: s.attemptsUsed ?? null,
          evaluators: s.evaluators ?? null,
          feedback: s.feedback ?? null
        });
      });
      return essays;
    };

    const summativeEssays = buildSummativeEssays();

    // Formatear para UI
    const artifactDetails = {
      resumenAcademico: {
        name: 'Resumen Académico',
        icon: '📝',
        rubric: 'Rúbrica 1',
        attempts: 0, submitted: false, history: [],
        ...(artifacts.resumenAcademico || {}),
        rubricScore: getRubricScore('rubrica1', artifacts.resumenAcademico),
        rubricAverage: rubricProgress.rubrica1?.average || 0,
        totalAttempts: rubricProgress.rubrica1?.scores?.length || 0
      },
      tablaACD: {
        name: 'Tabla ACD',
        icon: '📊',
        rubric: 'Rúbrica 2',
        attempts: 0, submitted: false, history: [],
        ...(artifacts.tablaACD || {}),
        rubricScore: getRubricScore('rubrica2', artifacts.tablaACD),
        rubricAverage: rubricProgress.rubrica2?.average || 0,
        totalAttempts: rubricProgress.rubrica2?.scores?.length || 0
      },
      mapaActores: {
        name: 'Mapa de Actores',
        icon: '🗺️',
        rubric: 'Rúbrica 3',
        attempts: 0, submitted: false, history: [],
        ...(artifacts.mapaActores || {}),
        rubricScore: getRubricScore('rubrica3', artifacts.mapaActores),
        rubricAverage: rubricProgress.rubrica3?.average || 0,
        totalAttempts: rubricProgress.rubrica3?.scores?.length || 0
      },
      respuestaArgumentativa: {
        name: 'Respuesta Argumentativa',
        icon: '💬',
        rubric: 'Rúbrica 4',
        attempts: 0, submitted: false, history: [],
        ...(artifacts.respuestaArgumentativa || {}),
        rubricScore: getRubricScore('rubrica4', artifacts.respuestaArgumentativa),
        rubricAverage: rubricProgress.rubrica4?.average || 0,
        totalAttempts: rubricProgress.rubrica4?.scores?.length || 0
      },
      bitacoraEticaIA: {
        name: 'Bitácora Ética IA',
        icon: '🤖',
        rubric: 'Rúbrica 5',
        attempts: 0, submitted: false, history: [],
        ...(artifacts.bitacoraEticaIA || {}),
        rubricScore: getRubricScore('rubrica5', artifacts.bitacoraEticaIA),
        rubricAverage: rubricProgress.rubrica5?.average || 0,
        totalAttempts: rubricProgress.rubrica5?.scores?.length || 0
      }
    };

    // Determinar si realmente hay progreso (al menos un artifact con datos)
    const hasRealProgress = Object.values(artifacts).some(a => 
      (a?.attempts > 0) || (a?.submitted) || (a?.history?.length > 0)
    ) || Object.keys(rubricProgress).length > 0 || (summativeEssays?.length || 0) > 0;

    return {
      hasProgress: hasRealProgress || progressSnap.exists(),
      artifacts: artifactDetails,
      rubricProgress,
      summativeEssays,
      lastUpdated: data.lastUpdated || data.lastSync,
      lastResetAt: data.lastResetAt
    };
  } catch (error) {
    logger.error('❌ Error obteniendo detalles de artefactos:', error);
    return { hasProgress: false, artifacts: {}, rubricProgress: {}, error: error.message };
  }
}
