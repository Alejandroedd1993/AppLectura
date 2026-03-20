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
  deleteField,
  collectionGroup,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './config';
import { getSessionContentHash, compareSessionContent, mergeSessionsWithConflictResolution } from '../utils/sessionHash';
import { BACKEND_BASE_URL } from '../config/backend';
import { legacyContentHash } from '../utils/hash';
import logger from '../utils/logger';

const COURSE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let __firestoreWritesDisabled = false;
let __firestoreWritesDisabledLogged = false;

function __isPermissionDeniedError(error) {
  const code = error?.code || error?.name;
  const message = String(error?.message || '').toLowerCase();
  return code === 'permission-denied' || message.includes('missing or insufficient permissions') || message.includes('permission-denied');
}

async function __enqueueOwnedCloudCleanupJob({ courseId, studentUid, reason = 'teacher_action' } = {}) {
  if (!courseId || !studentUid) return { ok: false, skipped: true, reason: 'missing_params' };

  const currentUser = auth?.currentUser;
  if (!currentUser?.uid) {
    return { ok: false, skipped: true, reason: 'missing_auth_user' };
  }

  let authHeader = {};
  try {
    const token = await currentUser.getIdToken();
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch (error) {
    logger.warn('⚠️ [cleanup-owner-only] No se pudo obtener token para enqueue:', error?.message || error);
  }

  if (!authHeader.Authorization) {
    return { ok: false, skipped: true, reason: 'missing_id_token' };
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/admin-cleanup/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      },
      body: JSON.stringify({
        courseId,
        studentUid,
        reason,
        processNow: true
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        skipped: true,
        reason: 'backend_rejected',
        status: res.status,
        details: text
      };
    }

    const payload = await res.json();
    const normalizedPayload = payload?.ok === true && payload?.data ? payload.data : payload;
    const processFailed = normalizedPayload?.processNow && normalizedPayload?.processResult && normalizedPayload?.processResult?.ok === false;
    if (payload?.ok === false || normalizedPayload?.ok === false || processFailed) {
      return {
        ok: false,
        skipped: true,
        reason: processFailed ? 'backend_process_failed' : 'backend_payload_rejected',
        status: res.status,
        details: payload?.error || normalizedPayload?.error || normalizedPayload?.processResult?.error || null,
        processResult: normalizedPayload?.processResult || null,
        jobId: normalizedPayload?.jobId || null
      };
    }

    return {
      ok: true,
      queued: Boolean(normalizedPayload?.queued),
      jobId: normalizedPayload?.jobId || null,
      processResult: normalizedPayload?.processResult || null
    };
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      reason: 'request_failed',
      details: error?.message || String(error)
    };
  }
}

function __resolveProgressCourseId(courseId, textoId) {
  if (!textoId || textoId === 'global_progress') return null;
  if (courseId) return courseId;
  return `free::${textoId}`;
}

function __progressDocId(courseId, textoId) {
  if (courseId && textoId && textoId !== 'global_progress') {
    return `${courseId}_${textoId}`;
  }
  return textoId;
}

async function __resolveProgressDoc(estudianteUid, textoId, courseId = null) {
  if (!estudianteUid || !textoId) {
    return { ref: null, snap: null, usedDocId: null };
  }

  if (courseId) {
    const compositeDocId = __progressDocId(courseId, textoId);
    const compositeRef = doc(db, 'students', estudianteUid, 'progress', compositeDocId);
    const compositeSnap = await getDoc(compositeRef);
    if (compositeSnap.exists()) {
      return { ref: compositeRef, snap: compositeSnap, usedDocId: compositeDocId };
    }
  }

  const legacyRef = doc(db, 'students', estudianteUid, 'progress', textoId);
  const legacySnap = await getDoc(legacyRef);
  if (!legacySnap.exists()) {
    return { ref: null, snap: null, usedDocId: null };
  }

  const legacyCourseId = legacySnap.data()?.sourceCourseId || null;
  const canUseLegacy = !courseId ? !legacyCourseId : legacyCourseId === courseId;

  if (!canUseLegacy) {
    return { ref: null, snap: null, usedDocId: null, legacyCourseId };
  }

  return { ref: legacyRef, snap: legacySnap, usedDocId: textoId };
}

export const getProgressDocId = __progressDocId;

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

/**
 * Subir PDF local de estudiante para restauración de sesiones.
 * Devuelve una URL persistente de Firebase Storage (downloadURL).
 */
export async function uploadSessionPdfFile({ file, userId, textoId = null } = {}) {
  try {
    if (!file) {
      throw new Error('No se recibió archivo para subir');
    }

    if (!userId) {
      throw new Error('No se recibió userId para subir PDF de sesión');
    }

    const fileName = String(file.name || 'documento.pdf');
    const isPdf = String(file.type || '').toLowerCase() === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new Error('El archivo no es PDF');
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (Number(file.size || 0) > MAX_FILE_SIZE) {
      throw new Error(`El PDF excede el límite de 50MB (tamaño: ${(Number(file.size || 0) / 1024 / 1024).toFixed(2)}MB)`);
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = `${Date.now()}_${safeName}`;
    const pathTextoId = (textoId || 'sin_texto').replace(/[^a-zA-Z0-9._-]/g, '_');

    const storageRef = ref(storage, `users/${userId}/session-pdfs/${pathTextoId}/${fileId}`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: 'application/pdf',
      cacheControl: 'public,max-age=31536000'
    });
    const downloadURL = await getDownloadURL(snapshot.ref);

    logger.log('✅ [uploadSessionPdfFile] PDF subido para sesión:', {
      userId,
      textoId: pathTextoId,
      name: fileName,
      size: file.size
    });

    return downloadURL;
  } catch (error) {
    logger.error('❌ [uploadSessionPdfFile] Error subiendo PDF de sesión:', error);
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

/**
 * 🔧 FIX Firestore undefined rejection: Recursively remove all `undefined` values from an object.
 * Firestore rejects any field set to `undefined`. This sanitizes the payload right before write.
 */
function __removeUndefinedDeep(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => __removeUndefinedDeep(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date) && typeof obj.toDate !== 'function') {
    // Preserve Firestore sentinel values (serverTimestamp, deleteField, etc.)
    if (obj._methodName) return obj;
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = __removeUndefinedDeep(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * 🔧 FIX Firestore 1MiB limit: Strip verbose evaluation text from rubricProgress scores.
 * Keeps only essential numeric/ID fields; drops criterios, evidencia, mejoras, fortalezas, etc.
 * This prevents the global_progress document from exceeding Firestore's 1 MiB doc size limit.
 */
function __stripVerboseFromRubricProgress(rubricProgress) {
  if (!rubricProgress || typeof rubricProgress !== 'object') return rubricProgress;

  // Fields to keep per score entry (everything else is stripped)
  const SCORE_KEEP_FIELDS = new Set([
    'score', 'nivel', 'artefacto', 'timestamp', 'fuente', 'source',
    'scoreGlobal', 'dimensionId', 'rubricId', 'textoId', 'type'
  ]);

  const stripScores = (scores) => {
    if (!Array.isArray(scores)) return scores;
    return scores.map(s => {
      if (!s || typeof s !== 'object') return s;
      const slim = {};
      for (const key of Object.keys(s)) {
        if (SCORE_KEEP_FIELDS.has(key)) {
          slim[key] = s[key];
        }
      }
      return slim;
    });
  };

  const stripped = {};
  for (const [rubricId, rubric] of Object.entries(rubricProgress)) {
    if (!rubric || typeof rubric !== 'object') {
      stripped[rubricId] = rubric;
      continue;
    }
    const slim = { ...rubric };
    // Strip top-level scores
    if (slim.scores) slim.scores = stripScores(slim.scores);
    // Strip formative scores
    if (slim.formative && slim.formative.scores) {
      slim.formative = { ...slim.formative, scores: stripScores(slim.formative.scores) };
    }
    // Strip summative verbose fields (keep essential for dashboard)
    if (slim.summative && typeof slim.summative === 'object') {
      const sum = slim.summative;
      slim.summative = {
        score: sum.score ?? null,
        nivel: sum.nivel ?? null,
        status: sum.status || 'pending',
        attemptsUsed: sum.attemptsUsed || 0,
        submittedAt: sum.submittedAt || null,
        gradedAt: sum.gradedAt || null,
        timestamp: sum.timestamp || null,
        teacherOverrideScore: sum.teacherOverrideScore ?? null,
        blocked: sum.blocked || false,
        // 🆕 FIX: Preservar campos esenciales para el Dashboard docente
        essayContent: sum.essayContent || null,
        feedback: sum.feedback || null,
        evaluators: sum.evaluators || null,
        dimension: sum.dimension || null,
        allowRevision: sum.allowRevision || false,
        teacherComment: sum.teacherComment || null,
        docenteNombre: sum.docenteNombre || null,
        scoreOverrideReason: sum.scoreOverrideReason || null
      };
    }
    stripped[rubricId] = slim;
  }
  return stripped;
}

/**
 * 🔧 FIX Firestore global_progress hardening:
 * keep only compact/essential fields for the global progress doc.
 */
function __compactGlobalProgressPayload(progressData) {
  if (!progressData || typeof progressData !== 'object') return progressData;

  const compacted = { ...progressData };

  if (compacted.rubricProgress && typeof compacted.rubricProgress === 'object') {
    const stripped = __stripVerboseFromRubricProgress(compacted.rubricProgress);
    const summarized = {};

    Object.entries(stripped).forEach(([rubricId, rubric]) => {
      if (!rubric || typeof rubric !== 'object') {
        summarized[rubricId] = rubric;
        return;
      }

      summarized[rubricId] = {
        average: Number.isFinite(Number(rubric.average)) ? Number(rubric.average) : 0,
        lastUpdate: rubric.lastUpdate || null,
        artefactos: Array.isArray(rubric.artefactos) ? rubric.artefactos.slice(0, 10) : [],
        formative: rubric.formative ? {
          average: Number.isFinite(Number(rubric.formative.average)) ? Number(rubric.formative.average) : 0,
          attempts: Number.isFinite(Number(rubric.formative.attempts)) ? Number(rubric.formative.attempts) : 0,
          lastUpdate: rubric.formative.lastUpdate || null,
          artefactos: Array.isArray(rubric.formative.artefactos) ? rubric.formative.artefactos.slice(0, 10) : []
        } : null,
        summative: rubric.summative ? {
          score: rubric.summative.score ?? null,
          nivel: rubric.summative.nivel ?? null,
          status: rubric.summative.status || 'pending',
          attemptsUsed: rubric.summative.attemptsUsed || 0,
          submittedAt: rubric.summative.submittedAt || null,
          gradedAt: rubric.summative.gradedAt || null,
          timestamp: rubric.summative.timestamp || null,
          teacherOverrideScore: rubric.summative.teacherOverrideScore ?? null,
          blocked: Boolean(rubric.summative.blocked),
          // 🆕 FIX: Preservar campos esenciales para Dashboard docente
          essayContent: rubric.summative.essayContent || null,
          feedback: rubric.summative.feedback || null,
          evaluators: rubric.summative.evaluators || null,
          dimension: rubric.summative.dimension || null,
          allowRevision: rubric.summative.allowRevision || false,
          teacherComment: rubric.summative.teacherComment || null,
          docenteNombre: rubric.summative.docenteNombre || null,
          scoreOverrideReason: rubric.summative.scoreOverrideReason || null
        } : null
      };
    });

    compacted.rubricProgress = summarized;
  }

  if (compacted.activitiesProgress) {
    delete compacted.activitiesProgress;
  }

  if (Object.prototype.hasOwnProperty.call(compacted, 'savedCitations')) {
    delete compacted.savedCitations;
  }

  return compacted;
}

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

export async function saveStudentProgress(estudianteUid, textoId, progressData) {
  const incomingCourseId = __resolveProgressCourseId(progressData?.sourceCourseId || null, textoId);
  const docId = __progressDocId(incomingCourseId, textoId);
  const queueKey = `${estudianteUid}::${docId}`;
  const queue = __progressWriteQueueByDoc.get(queueKey) || {
    inFlight: false,
    pendingPayload: null,
    waiters: []
  };

  queue.pendingPayload = __mergeProgressPayload(queue.pendingPayload, progressData || {});

  const promise = new Promise((resolve, reject) => {
    queue.waiters.push({ resolve, reject });
  });

  __progressWriteQueueByDoc.set(queueKey, queue);

  if (queue.inFlight) {
    return promise;
  }

  queue.inFlight = true;

  (async () => {
    let writeError = null;

    try {
      while (queue.pendingPayload) {
        const payloadToWrite = queue.pendingPayload;
        queue.pendingPayload = null;
        await __saveStudentProgressDirect(estudianteUid, textoId, payloadToWrite);
      }
    } catch (error) {
      writeError = error;
    } finally {
      queue.inFlight = false;

      const waiters = queue.waiters.splice(0);
      if (writeError) {
        waiters.forEach(({ reject }) => reject(writeError));
      } else {
        waiters.forEach(({ resolve }) => resolve());
      }

      __progressWriteQueueByDoc.delete(queueKey);
    }
  })();

  return promise;
}

// Serializa escrituras por documento de progreso para evitar ráfagas concurrentes
const __progressWriteQueueByDoc = new Map();

function __mergeProgressPayload(base, incoming) {
  const a = (base && typeof base === 'object') ? base : {};
  const b = (incoming && typeof incoming === 'object') ? incoming : {};

  const merged = { ...a, ...b };

  if (a.rubricProgress || b.rubricProgress) {
    merged.rubricProgress = {
      ...(a.rubricProgress || {}),
      ...(b.rubricProgress || {})
    };
  }

  if (a.activitiesProgress || b.activitiesProgress) {
    merged.activitiesProgress = {
      ...(a.activitiesProgress || {}),
      ...(b.activitiesProgress || {})
    };
  }

  if (a.rewardsState || b.rewardsState) {
    merged.rewardsState = {
      ...(a.rewardsState || {}),
      ...(b.rewardsState || {})
    };
  }

  if (Object.prototype.hasOwnProperty.call(b, 'savedCitations')) {
    merged.savedCitations = b.savedCitations;
  }

  return merged;
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
async function __saveStudentProgressDirect(estudianteUid, textoId, progressData) {
  const incomingCourseId = __resolveProgressCourseId(progressData?.sourceCourseId || null, textoId);
  if (textoId !== 'global_progress') {
    progressData = {
      ...(progressData || {}),
      sourceCourseId: incomingCourseId
    };
  }

  logger.log('🔵 [Firestore] saveStudentProgress llamado:', {
    uid: estudianteUid,
    textoId,
    courseScopedDocId: __progressDocId(incomingCourseId, textoId),
    hasRewardsState: !!progressData?.rewardsState,
    rewardsResetAt: progressData?.rewardsState?.resetAt,
    rewardsTotalPoints: progressData?.rewardsState?.totalPoints,
    hasRubricProgress: !!progressData?.rubricProgress,
    rubricKeys: Object.keys(progressData?.rubricProgress || {}),
    writesDisabled: __firestoreWritesDisabled
  });

  // 🔵 Log de la ruta completa para debug
  logger.log(`🔵 [Firestore] Ruta de escritura tentativa: students/${estudianteUid}/progress/${__progressDocId(incomingCourseId, textoId)}`);

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

    // 🔧 HARDEN: compactar payload si es global_progress (evita doc gigante)
    if (textoId === 'global_progress') {
      progressData = __compactGlobalProgressPayload(progressData);
    }

    // 🔁 DEDUPE: si el payload útil es idéntico y reciente, saltar write
    const earlyDocId = __progressDocId(incomingCourseId, textoId);
    const dedupeKey = `${estudianteUid}::${earlyDocId}`;
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

    // 🔧 FIX Bug 4: Resolver sourceCourseId si viene null (fallback desde enrolledCourses)
    let resolvedSourceCourseId = null;
    if (textoId !== 'global_progress' && !progressData.sourceCourseId) {
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

    const finalCourseId = incomingCourseId || resolvedSourceCourseId || null;
    const finalDocId = __progressDocId(finalCourseId, textoId);
    const progressRef = doc(db, 'students', estudianteUid, 'progress', finalDocId);
    logger.log(`🔵 [Firestore] Ruta de escritura final: students/${estudianteUid}/progress/${finalDocId}`);

    // 🔄 FIX Bug 3+5: Transacción atómica con retry para evitar race conditions
    let _savedFinalData;
    await __retryWithBackoff(() => runTransaction(db, async (transaction) => {

      // Obtener datos existentes para hacer merge inteligente
      const existingDoc = await transaction.get(progressRef);
      const existingData = existingDoc.exists() ? existingDoc.data() : {};

      if (textoId === 'global_progress') {
        const compactExisting = __compactGlobalProgressPayload(existingData);
        Object.keys(existingData).forEach((key) => delete existingData[key]);
        Object.assign(existingData, compactExisting);
      }

      // � FIX: Strip verbose fields from existing data too (clean up legacy bloated docs)
      if (existingData.rubricProgress) {
        existingData.rubricProgress = __stripVerboseFromRubricProgress(existingData.rubricProgress);
      }

      // �🔄 MERGE INTELIGENTE: Combinar datos nuevos con existentes
      const mergedData = { ...existingData };

      // Mergear rubricProgress (CONCATENAR scores, no reemplazar)
      // 🔧 CRITICAL FIX: Detectar si el documento fue reseteado por el docente
      // Si existingData tiene lastResetAt, verificar que los scores entrantes sean POST-reset
      const docResetTime = (() => {
        const lr = existingData.lastResetAt;
        if (!lr) return 0;
        if (lr?.seconds) return lr.seconds * 1000;
        if (typeof lr === 'number') return lr;
        if (typeof lr?.toMillis === 'function') return lr.toMillis();
        return 0;
      })();

      if (progressData.rubricProgress) {
        // 🔧 FIX: Strip verbose fields from incoming data before merge
        const cleanedIncoming = __stripVerboseFromRubricProgress(progressData.rubricProgress);
        mergedData.rubricProgress = mergedData.rubricProgress || {};

        Object.keys(cleanedIncoming).forEach(rubricId => {
          const newRubric = cleanedIncoming[rubricId];
          const existingRubric = mergedData.rubricProgress[rubricId];

          if (!existingRubric) {
            // Si no existe, crear nueva
            mergedData.rubricProgress[rubricId] = newRubric;
          } else {
            // 🔧 CRITICAL FIX: Si la rúbrica existente en Firestore fue reseteada por el docente,
            // NO concatenar los scores viejos del estado local del estudiante.
            // Los scores del estudiante pre-reset deben descartarse.
            const existingResetAt = existingRubric.resetAt
              ? new Date(existingRubric.resetAt).getTime()
              : 0;
            const effectiveResetTime = Math.max(docResetTime, existingResetAt);

            if (effectiveResetTime > 0 && existingRubric.resetBy === 'docente') {
              // La rúbrica fue reseteada por el docente — filtrar scores PRE-reset
              const newScores = (newRubric.scores || []).filter(s => {
                const scoreTime = s.timestamp || 0;
                return scoreTime > effectiveResetTime;
              });

              if (newScores.length === 0) {
                // Todos los scores son anteriores al reset — mantener el estado reseteado
                logger.log(`🛡️ [Firestore] ${rubricId}: Rúbrica reseteada por docente, descartando ${(newRubric.scores || []).length} scores pre-reset`);
                // Preservar el estado reseteado del docente
                mergedData.rubricProgress[rubricId] = existingRubric;
                return;
              }

              // Solo hay scores POST-reset — usarlos como nuevos scores
              const recentScores = newScores.slice(-3);
              const newAverage = recentScores.length > 0
                ? Math.round((recentScores.reduce((sum, s) => sum + (s.score || 0), 0) / recentScores.length) * 10) / 10
                : 0;

              mergedData.rubricProgress[rubricId] = {
                scores: newScores,
                average: newAverage,
                lastUpdate: Math.max(existingRubric.lastUpdate || 0, newRubric.lastUpdate || 0),
                artefactos: newRubric.artefactos || [],
                // 🔧 Preservar campos no-scores (summative, formative, etc.)
                ...(newRubric.summative && { summative: newRubric.summative }),
                ...(existingRubric.summative && !newRubric.summative && { summative: existingRubric.summative }),
                ...(newRubric.formative && { formative: newRubric.formative }),
                ...(existingRubric.formative && !newRubric.formative && { formative: existingRubric.formative }),
                ...(newRubric.finalScore != null && { finalScore: newRubric.finalScore }),
                ...(existingRubric.finalScore != null && newRubric.finalScore == null && { finalScore: existingRubric.finalScore }),
                ...(newRubric.certified != null && { certified: newRubric.certified }),
                ...(existingRubric.certified != null && newRubric.certified == null && { certified: existingRubric.certified }),
                ...(newRubric.completionDate && { completionDate: newRubric.completionDate }),
                ...(existingRubric.completionDate && !newRubric.completionDate && { completionDate: existingRubric.completionDate }),
              };

              logger.log(`🔄 [Firestore] ${rubricId}: Post-reset merge, ${newScores.length} scores válidos (post-reset)`);
              return;
            }

            // Flujo normal (sin reset) — concatenar scores únicos
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
              artefactos: combinedArtefactos,
              // 🔧 Preservar campos no-scores (summative, formative, etc.)
              // Prioridad: incoming > existing (los datos más recientes ganan)
              ...(newRubric.summative && { summative: newRubric.summative }),
              ...(existingRubric.summative && !newRubric.summative && { summative: existingRubric.summative }),
              ...(newRubric.formative && { formative: newRubric.formative }),
              ...(existingRubric.formative && !newRubric.formative && { formative: existingRubric.formative }),
              ...(newRubric.finalScore != null && { finalScore: newRubric.finalScore }),
              ...(existingRubric.finalScore != null && newRubric.finalScore == null && { finalScore: existingRubric.finalScore }),
              ...(newRubric.certified != null && { certified: newRubric.certified }),
              ...(existingRubric.certified != null && newRubric.certified == null && { certified: existingRubric.certified }),
              ...(newRubric.completionDate && { completionDate: newRubric.completionDate }),
              ...(existingRubric.completionDate && !newRubric.completionDate && { completionDate: existingRubric.completionDate }),
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

          const toMillis = (value) => {
            if (!value) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              const parsed = Date.parse(value);
              return Number.isFinite(parsed) ? parsed : 0;
            }
            if (typeof value?.toMillis === 'function') return value.toMillis();
            if (typeof value?.seconds === 'number') return value.seconds * 1000;
            return 0;
          };

          // Si no existe, agregar
          if (!existingActivity) {
            mergedData.activitiesProgress[docId] = newActivity;
            return;
          }

          // 🔧 FIX v2: Si hay reset de docente activo, usar merge POR ARTEFACTO.
          // El estado local del alumno puede haberse vaciado al recibir el reset,
          // por lo que comparar submittedCount total falla (newActivity tiene menos artefactos
          // que Firestore, donde los demás artefactos no-reseteados siguen entregados).
          if (docResetTime > 0) {
            const existingArtifacts = existingActivity?.artifacts || {};
            const anyExistingReset = Object.values(existingArtifacts).some(a => a?.resetBy === 'docente');

            if (anyExistingReset) {
              const newArtifacts = newActivity?.artifacts || {};

              // 1) Detectar si algún artefacto entrante es pre-reset (debe descartarse todo)
              const anyNewIsPreReset = Object.entries(newArtifacts).some(([name, a]) => {
                const existingArt = existingArtifacts[name];
                if (!(a?.submitted && existingArt?.resetBy === 'docente' && !existingArt?.submitted)) return false;
                const incomingSubmittedAt = Math.max(
                  toMillis(a?.submittedAt),
                  toMillis(a?.lastEvaluatedAt),
                  toMillis(newActivity?.preparation?.updatedAt),
                  toMillis(newActivity?.updatedAt)
                );
                const resetBoundary = Math.max(docResetTime, toMillis(existingArt?.resetAt));
                if (incomingSubmittedAt <= 0 || resetBoundary <= 0) return false;
                return incomingSubmittedAt <= resetBoundary;
              });

              if (anyNewIsPreReset) {
                logger.log(`🛡️ [Firestore] activitiesProgress[${docId}]: Datos pre-reset descartados (docente reseteó)`);
                return;
              }

              // 2) Sin pre-reset: merge POR ARTEFACTO para preservar entregas no-reseteadas de Firestore
              const mergedArtifacts = { ...existingArtifacts };
              Object.entries(newArtifacts).forEach(([artName, newArt]) => {
                const existingArt = existingArtifacts[artName];
                if (existingArt?.resetBy === 'docente' && !existingArt?.submitted) {
                  // Artefacto reseteado: solo aceptar si la nueva entrega es post-reset
                  if (newArt?.submitted) {
                    const newSubmitTime = Math.max(toMillis(newArt?.submittedAt), toMillis(newArt?.lastEvaluatedAt));
                    const artResetBoundary = Math.max(docResetTime, toMillis(existingArt?.resetAt));
                    if (artResetBoundary <= 0 || newSubmitTime > artResetBoundary) {
                      // Entrega post-reset válida: aceptar y limpiar marcadores de reset
                      mergedArtifacts[artName] = { ...newArt, resetBy: null, resetAt: null };
                      logger.log(`✅ [Firestore] ${artName}: Reentrega post-reset aceptada en ${docId}`);
                    }
                    // else: es pre-reset → mantener estado reseteado existente
                  }
                  // else: no entregado → mantener estado reseteado
                } else {
                  // Artefacto no-reseteado: merge normal por artefacto individual
                  const newSubmitted = newArt?.submitted || false;
                  const existingSubmitted = existingArt?.submitted || false;
                  if (newSubmitted && !existingSubmitted) {
                    mergedArtifacts[artName] = newArt;
                  } else if (newSubmitted && existingSubmitted) {
                    const newTs = toMillis(newArt?.submittedAt);
                    const existingTs = toMillis(existingArt?.submittedAt);
                    mergedArtifacts[artName] = newTs >= existingTs ? newArt : existingArt;
                  } else if (!newSubmitted && existingSubmitted) {
                    mergedArtifacts[artName] = existingArt; // preservar entrega existente
                  } else {
                    const newTs = toMillis(newArt?.updatedAt) || toMillis(newActivity?.preparation?.updatedAt) || 0;
                    const existingTs = toMillis(existingArt?.updatedAt) || 0;
                    mergedArtifacts[artName] = newTs > existingTs ? newArt : (existingArt || newArt);
                  }
                }
              });
              mergedData.activitiesProgress[docId] = {
                ...existingActivity,
                ...newActivity,
                artifacts: mergedArtifacts
              };
              logger.log(`🔄 [Firestore] activitiesProgress[${docId}]: Merge por artefacto con contexto reset`);
              return;
            }
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

      // 🆕 MERGEAR savedCitations (Cuaderno de Lectura)
      // Las citas nuevas del payload reemplazan las existentes (last-write-wins por textoId)
      if (Object.prototype.hasOwnProperty.call(progressData, 'savedCitations')) {
        mergedData.savedCitations = progressData.savedCitations;
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
        // 🛡️ HARDEN: global_progress nunca debe persistir sourceCourseId
        sourceCourseId: textoId === 'global_progress'
          ? null
          : (progressData.sourceCourseId || existingData.sourceCourseId || finalCourseId || resolvedSourceCourseId || null),
        ultima_actividad: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSync: progressData.lastSync || new Date().toISOString(),
        syncType: progressData.syncType || 'full'
      };

      // 🔧 HARDEN: asegurar compacción final en global_progress + limpieza explícita legacy
      if (textoId === 'global_progress') {
        const compactFinal = __compactGlobalProgressPayload(finalData);
        Object.keys(finalData).forEach((key) => delete finalData[key]);
        Object.assign(finalData, compactFinal);
        finalData.activitiesProgress = deleteField();
        finalData.savedCitations = deleteField();
      }

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

      // 🔧 FIX: Strip verbose evaluation text from rubricProgress to stay within Firestore 1 MiB limit
      if (finalData.rubricProgress) {
        finalData.rubricProgress = __stripVerboseFromRubricProgress(finalData.rubricProgress);
      }

      // 🔧 FIX: Sanitizar undefined antes de escribir (Firestore rechaza undefined)
      const sanitizedData = __removeUndefinedDeep(finalData);
      _savedFinalData = sanitizedData;
      transaction.set(progressRef, sanitizedData, { merge: true });

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
export async function getStudentProgress(estudianteUid, textoId, courseId = null) {
  logger.log('🔵 [Firestore] getStudentProgress llamado:', { uid: estudianteUid, textoId, courseId });

  try {
    const { snap: progressDoc, usedDocId, legacyCourseId } = await __resolveProgressDoc(estudianteUid, textoId, courseId);

    if (!progressDoc) {
      if (legacyCourseId && courseId) {
        logger.warn('🚫 [Firestore] Legacy doc ignorado: pertenece a curso', legacyCourseId, 'pero se pidió', courseId);
      }
      logger.log('ℹ️ [Firestore] No existe documento de progreso para:', { uid: estudianteUid, textoId, courseId });
      return null;
    }

    const data = progressDoc.data();
    const rubricKeys = Object.keys(data.rubricProgress || {}).filter(k =>
      data.rubricProgress?.[k]?.scores?.length > 0
    );

    logger.log('✅ [Firestore] Progreso encontrado:', {
      uid: estudianteUid,
      textoId,
      courseId,
      usedDocId,
      rubricasConDatos: rubricKeys,
      tieneActivities: !!data.activitiesProgress
    });

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
export async function updateReadingTime(estudianteUid, textoId, deltaMinutes, courseId = null) {
  if (!estudianteUid || !textoId || !deltaMinutes || deltaMinutes <= 0) return;
  if (__firestoreWritesDisabled) return;

  const scopedCourseId = __resolveProgressCourseId(courseId, textoId);
  const docId = __progressDocId(scopedCourseId, textoId);
  const progressRef = doc(db, 'students', estudianteUid, 'progress', docId);

  try {
    await updateDoc(progressRef, {
      sourceCourseId: scopedCourseId,
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
          sourceCourseId: textoId === 'global_progress' ? null : scopedCourseId,
          textoId,
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
export function subscribeToStudentProgress(estudianteUid, textoId, callback, courseId = null) {
  const scopedCourseId = __resolveProgressCourseId(courseId, textoId);
  const docId = __progressDocId(scopedCourseId, textoId);
  const progressRef = doc(db, 'students', estudianteUid, 'progress', docId);

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
      // 🔧 FIX: Reconstruir metadata COMPLETA para que rutas como
      // session.text?.metadata?.id y session.text?.metadata?.fileURL funcionen
      id: textMetadata.id || data.currentTextoId || null,
      fileName: textMetadata.fileName || data.text?.fileName || 'texto_manual',
      fileType: textMetadata.fileType || data.text?.fileType || 'text/plain',
      fileURL: textMetadata.fileURL || data.text?.fileURL || null,
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
      ? legacyContentHash(sessionData.text.content, { maxChars: 1000, emptyValue: 'empty' })
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
export function mergeSessions(localSessions, firestoreSessions, options = {}) {
  const merged = new Map();

  // 🪦 FIX CRÍTICO: Obtener tombstones de sesiones eliminadas recientemente
  // Esto evita que sesiones borradas localmente sean resucitadas por Firestore
  let deletedTombstones = options.deletedTombstones || new Set();
  if (deletedTombstones.size === 0) {
    try {
      // Importación dinámica evitada: los tombstones se pasan por options o se leen directamente
      const tombstoneKey = Object.keys(localStorage).find(k => k.startsWith('appLectura_deleted_sessions_'));
      if (tombstoneKey) {
        const raw = localStorage.getItem(tombstoneKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const now = Date.now();
          for (const [id, timestamp] of Object.entries(parsed)) {
            if (now - timestamp < 60000) { // 60s TTL
              deletedTombstones.add(id);
            }
          }
        }
      }
    } catch (e) {
      // Silencioso - si falla, no filtramos nada extra
    }
  }

  if (deletedTombstones.size > 0) {
    logger.log(`🪦 [mergeSessions] Filtrando ${deletedTombstones.size} sesiones con tombstone activo`);
  }

  // Agregar sesiones de Firestore primero (excepto las con tombstone)
  firestoreSessions.forEach(session => {
    const sessionId = session.localSessionId || session.id;
    // 🪦 FIX: No agregar sesiones que tienen tombstone
    if (deletedTombstones.has(sessionId)) {
      logger.log(`🪦 [mergeSessions] Sesión ${sessionId} filtrada por tombstone (Firestore)`);
      return;
    }
    merged.set(sessionId, {
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

    // Mantener sincronía con estudiantes activos
    const studentsSnap = await getDocs(collection(db, 'courses', courseId, 'students'));
    for (const studentDoc of studentsSnap.docs) {
      const data = studentDoc.data();
      if (data.estado === 'active') {
        await syncCourseAssignments(courseId, studentDoc.id, updatedLecturas);
      }

      // 🔧 FIX Bug #2: Limpiar progreso huérfano de la lectura removida
      // Solo eliminar si el doc de progreso pertenece a ESTE curso
      try {
        const compositeDocId = __progressDocId(courseId, textoId);
        const compositeRef = doc(db, 'students', studentDoc.id, 'progress', compositeDocId);
        const compositeSnap = await getDoc(compositeRef);
        if (compositeSnap.exists()) {
          await deleteDoc(compositeRef);
          logger.log(`🧹 [removeLectura] Progreso compuesto eliminado: ${compositeDocId} para estudiante ${studentDoc.id}`);
        }

        const legacyRef = doc(db, 'students', studentDoc.id, 'progress', textoId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists() && legacySnap.data()?.sourceCourseId === courseId) {
          await deleteDoc(legacyRef);
          logger.log(`🧹 [removeLectura] Progreso legacy eliminado: ${textoId} para estudiante ${studentDoc.id}`);
        }
      } catch (cleanupError) {
        logger.warn(`⚠️ [removeLectura] Error limpiando progreso huérfano:`, cleanupError.message);
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

    const scopedDocId = __progressDocId(courseId, lectura.textoId);
    const progressRef = doc(db, 'students', estudianteUid, 'progress', scopedDocId);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      logger.log('✅ [syncCourseAssignments] Progreso ya existente para lectura scopeada:', scopedDocId);
      continue;
    }

    // Compatibilidad: si existe doc legacy para el mismo curso, migrarlo al doc compuesto.
    const legacyRef = doc(db, 'students', estudianteUid, 'progress', lectura.textoId);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists() && legacySnap.data()?.sourceCourseId === courseId) {
      await setDoc(progressRef, {
        ...legacySnap.data(),
        textoId: lectura.textoId,
        sourceCourseId: courseId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      logger.log('♻️ [syncCourseAssignments] Progreso legacy migrado a doc compuesto:', scopedDocId);
      continue;
    }

    try {
      logger.log('🆕 [syncCourseAssignments] Creando progreso para lectura scopeada:', scopedDocId);
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
        const resolveLecturaTextoId = (docSnap, data = {}) => {
          if (data?.textoId && lecturasIds.includes(data.textoId)) {
            return data.textoId;
          }
          return lecturasIds.find((lectureTextoId) =>
            docSnap.id === lectureTextoId || docSnap.id.endsWith(`_${lectureTextoId}`)
          ) || null;
        };

      const progressQuery = query(
        collection(db, 'students', estudiante.estudianteUid, 'progress'),
        where('sourceCourseId', '==', courseId)
      );

      const progressSnap = await getDocs(progressQuery);
      let relevantes = progressSnap.docs.filter((docSnap) => {
        const data = docSnap.data() || {};
          const docTextoId = resolveLecturaTextoId(docSnap, data);
        return !!docTextoId && lecturasIds.includes(docTextoId);
      });

      // Fallback seguro: si no hay docs por sourceCourseId,
      // intentar docId compuesto {courseId}_{textoId} para evitar contaminación cross-course.
      if (!relevantes.length) {
        const fallbackDocs = [];
        await Promise.all(lecturasIds.map(async (textoId) => {
          try {
            const compositeDocId = `${courseId}_${textoId}`;
            const ref = doc(db, 'students', estudiante.estudianteUid, 'progress', compositeDocId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return;
            fallbackDocs.push(snap);
          } catch (e) {
            // best-effort
          }
        }));

        if (fallbackDocs.length) {
          logger.warn('⚠️ [getCourseMetrics] Usando fallback por docId compuesto para estudiante:', estudiante.estudianteUid);
        }

        // Simular la misma estructura (docs) para reusar el cálculo
        relevantes = [...relevantes, ...fallbackDocs];
      }

      // 🔧 FIX: Deduplicar relevantes por textoId.
      // Tras backfill de sourceCourseId, pueden coexistir un doc legacy (progress/{textoId})
      // y un doc compuesto (progress/{courseId}_{textoId}) para el mismo texto/curso.
      // Sin deduplicación, las métricas agregadas se duplican y lecturaDetails se sobreescribe.
      if (relevantes.length > lecturasIds.length) {
        const deduped = new Map();
        relevantes.forEach(docSnap => {
          const data = docSnap.data() || {};
          const tid = resolveLecturaTextoId(docSnap, data);
          if (!tid) return;
          const existing = deduped.get(tid);
          if (!existing) { deduped.set(tid, docSnap); return; }

          // Preferir doc con más artefactos entregados en activitiesProgress
          const countArt = (snap) => {
            const d = snap.data() || {};
            const ap = d.activitiesProgress || {};
            let c = 0;
            Object.values(ap).forEach(entry => {
              if (entry?.artifacts) Object.values(entry.artifacts).forEach(a => { if (a?.submitted) c++; });
            });
            return c;
          };
          if (countArt(docSnap) > countArt(existing)) {
            deduped.set(tid, docSnap);
          }
        });
        relevantes = Array.from(deduped.values());
        logger.log(`🔧 [getCourseMetrics] Deduplicados ${relevantes.length} docs de progreso para ${estudiante.estudianteUid}`);
      }

      if (relevantes.length) {
        let globalRubricProgressFallback = null;
        if (relevantes.length === 1) {
          try {
            const globalRef = doc(db, 'students', estudiante.estudianteUid, 'progress', 'global_progress');
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
              globalRubricProgressFallback = globalSnap.data()?.rubricProgress || null;
            }
          } catch (e) {
            // best-effort
          }
        }

        // 🔧 FIX Bug #3: Calcular avance REAL desde rubricProgress (no desde porcentaje que nunca se actualiza)
        const totalAvance = relevantes.reduce((acc, docSnap) => {
          const data = docSnap.data();
          // Prioridad: porcentaje explícito > cálculo desde rubricProgress > 0
          if (data.porcentaje > 0 || data.progress > 0 || data.avancePorcentaje > 0) {
            return acc + (data.porcentaje || data.progress || data.avancePorcentaje || 0);
          }
          // Calcular desde rubricProgress: contar rúbricas con scores reales
          const rp = data.rubricProgress || {};
          let completedRubrics = 0;
          for (let i = 1; i <= 5; i++) {
            const rubric = rp[`rubrica${i}`];
            if (rubric && (rubric.scores?.length > 0 || rubric.average > 0)) {
              completedRubrics++;
            }
          }
          return acc + (completedRubrics / 5) * 100;
        }, 0);
        const completadas = relevantes.filter(docSnap => {
          const data = docSnap.data();
          if (data.estado === 'completed' || (data.porcentaje || data.progress || 0) >= 100) return true;
          // Fallback: todas las rúbricas tienen scores
          const rp = data.rubricProgress || {};
          let count = 0;
          for (let i = 1; i <= 5; i++) {
            const rubric = rp[`rubrica${i}`];
            if (rubric && (rubric.scores?.length > 0 || rubric.average > 0)) count++;
          }
          return count >= 5;
        }).length;
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
        // (relevantes ya está deduplicado por textoId desde arriba)
        const lecturaDetails = {};

        const buildSummativeEssaysFromRubricProgress = (rubricProgressSource = {}) => {
          const essays = [];
          ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4'].forEach(rubricKey => {
            const rubric = rubricProgressSource?.[rubricKey] || {};
            const summative = rubric.summative || null;
            if (!summative) return;

            const rawScore = summative.teacherOverrideScore ?? summative.score;
            const parsedScore = Number(
              typeof rawScore === 'string'
                ? rawScore.replace(',', '.').replace('/10', '').trim()
                : rawScore
            );
            const summativeScore = Number.isFinite(parsedScore) ? parsedScore : 0;
            const essayStatus = String(summative.status || '').toLowerCase();

            const hasEssayEvidence = Boolean(
              summativeScore > 0 ||
              (typeof summative.essayContent === 'string' && summative.essayContent.trim().length > 0) ||
              summative.feedback ||
              Number(summative.submittedAt || 0) > 0 ||
              Number(summative.gradedAt || 0) > 0
            );

            if (hasEssayEvidence && summativeScore > 0) {
              essays.push({
                rubricId: rubricKey,
                score: Number(summativeScore) || 0,
                submitted: essayStatus === 'graded' || essayStatus === 'submitted',
                status: essayStatus || 'evaluated',
                teacherOverrideScore: summative.teacherOverrideScore ?? null,
                scoreOverrideReason: summative.scoreOverrideReason ?? null,
                scoreOverriddenAt: summative.scoreOverriddenAt ?? null,
                docenteNombre: summative.docenteNombre ?? null
              });
            }
          });
          return essays;
        };

        relevantes.forEach(docSnap => {
          const data = docSnap.data();
          const textoId = resolveLecturaTextoId(docSnap, data);
          if (!textoId) return;

          const activitiesProgress = data.activitiesProgress || {};
          const rubricProgress = data.rubricProgress || {};

          // Buscar artifacts en estructura anidada (activitiesProgress[textoId].artifacts)
          let artifacts = {};
          if (activitiesProgress[textoId]?.artifacts) {
            artifacts = activitiesProgress[textoId].artifacts;
          } else if (activitiesProgress[docSnap.id]?.artifacts) {
            artifacts = activitiesProgress[docSnap.id].artifacts;
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
            if (rubricScore <= 0 && rubric.summative?.status === 'graded') {
              const summativeScore = rubric.summative?.teacherOverrideScore ?? rubric.summative?.score;
              if (summativeScore > 0) {
                rubricScore = Number(summativeScore) || 0;
              }
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
          let summativeEssays = buildSummativeEssaysFromRubricProgress(rubricProgress);

          // Fallback conservador para datos legacy: si solo hay 1 lectura y este doc no trae ensayo,
          // intentar recuperar desde global_progress (escrituras antiguas sin textoId específico).
          if (summativeEssays.length === 0 && relevantes.length === 1 && globalRubricProgressFallback) {
            const globalSummative = buildSummativeEssaysFromRubricProgress(globalRubricProgressFallback);
            if (globalSummative.length > 0) {
              summativeEssays = globalSummative;
            }
          }

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

function __isRealCourseId(courseId) {
  return Boolean(courseId) &&
    typeof courseId === 'string' &&
    courseId !== 'global_progress' &&
    !courseId.startsWith('free::');
}

function __resolveOwnedCloudCourseIdFromDoc(docSnap) {
  const data = docSnap?.data?.() || {};
  const candidateIds = [
    data.sourceCourseId,
    data.courseId,
    data.currentCourseId,
    data.text?.sourceCourseId,
    data.textMetadata?.sourceCourseId,
    data.backupMeta?.sourceCourseId,
    data.metadata?.sourceCourseId
  ];

  for (const candidate of candidateIds) {
    if (__isRealCourseId(candidate)) return candidate;
  }

  const docId = String(docSnap?.id || '');
  const textoId = typeof data.textoId === 'string' ? data.textoId : null;
  if (docId.startsWith('draft_backup_') && textoId && docId.endsWith(`_${textoId}`)) {
    const prefix = 'draft_backup_';
    const suffix = `_${textoId}`;
    const maybeCourseId = docId.slice(prefix.length, docId.length - suffix.length);
    if (__isRealCourseId(maybeCourseId)) return maybeCourseId;
  }

  return null;
}

async function __cleanupCourseProgressForStudent(studentUid, courseId, lecturasAsignadas = []) {
  let deleted = 0;
  const deletedDocIds = new Set();

  const progressRef = collection(db, 'students', studentUid, 'progress');
  const byCourseQuery = query(progressRef, where('sourceCourseId', '==', courseId));
  const byCourseSnap = await getDocs(byCourseQuery);

  for (const docSnap of byCourseSnap.docs) {
    await deleteDoc(docSnap.ref);
    if (!deletedDocIds.has(docSnap.id)) {
      deletedDocIds.add(docSnap.id);
      deleted += 1;
    }
  }

  // Barrido adicional: capturar docs compuestos huérfanos con ID {courseId}_{textoId}
  // que podrían no tener sourceCourseId (datos legacy incompletos).
  const allProgressSnap = await getDocs(progressRef);
  for (const docSnap of allProgressSnap.docs) {
    const data = docSnap.data() || {};
    const isOwnedByCourse = data.sourceCourseId === courseId;
    const isCompositeOwned = typeof docSnap.id === 'string' && docSnap.id.startsWith(`${courseId}_`);
    if (!isOwnedByCourse && !isCompositeOwned) continue;
    if (deletedDocIds.has(docSnap.id)) continue;

    try {
      await deleteDoc(docSnap.ref);
      deletedDocIds.add(docSnap.id);
      deleted += 1;
    } catch (error) {
      logger.warn('⚠️ [deleteCourseData] Error eliminando doc huérfano por barrido completo:', {
        studentUid,
        courseId,
        docId: docSnap.id,
        message: error?.message
      });
    }
  }

  // Fallback defensivo para datos legacy o docs huérfanos con ID compuesto.
  for (const lectura of (lecturasAsignadas || [])) {
    if (!lectura?.textoId) continue;

    try {
      const compositeDocId = __progressDocId(courseId, lectura.textoId);
      const compositeDocRef = doc(db, 'students', studentUid, 'progress', compositeDocId);
      const compositeSnap = await getDoc(compositeDocRef);
      if (compositeSnap.exists()) {
        await deleteDoc(compositeDocRef);
        deleted += 1;
      }

      const legacyRef = doc(db, 'students', studentUid, 'progress', lectura.textoId);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists() && legacySnap.data()?.sourceCourseId === courseId) {
        await deleteDoc(legacyRef);
        deleted += 1;
      }
    } catch (error) {
      logger.warn('⚠️ [deleteCourseData] Error en fallback de progreso legacy:', {
        studentUid,
        courseId,
        textoId: lectura.textoId,
        message: error?.message
      });
    }
  }

  return deleted;
}

async function __cleanupCourseNotificationsForStudent(studentUid, courseId) {
  let deleted = 0;
  const notificationsRef = collection(db, 'students', studentUid, 'notifications');
  const byCourseQuery = query(notificationsRef, where('courseId', '==', courseId));
  const byCourseSnap = await getDocs(byCourseQuery);

  for (const docSnap of byCourseSnap.docs) {
    await deleteDoc(docSnap.ref);
    deleted += 1;
  }

  return deleted;
}

async function __cleanupOwnedCloudCourseDataForStudent(studentUid, courseId) {
  let sessionsDeleted = 0;
  let draftBackupsDeleted = 0;
  let notificationsDeleted = 0;
  const deletedSessionIds = new Set();
  const deletedBackupIds = new Set();

  const sessionsRef = collection(db, 'users', studentUid, 'sessions');
  const sessionsByCourse = query(sessionsRef, where('sourceCourseId', '==', courseId));
  const sessionsSnap = await getDocs(sessionsByCourse);
  for (const docSnap of sessionsSnap.docs) {
    try {
      await deleteSessionFromFirestore(studentUid, docSnap.id);
      if (!deletedSessionIds.has(docSnap.id)) {
        deletedSessionIds.add(docSnap.id);
        sessionsDeleted += 1;
      }
    } catch (error) {
      logger.warn('⚠️ [cleanupOwnedCloudCourseData] Error eliminando sesión:', {
        studentUid,
        courseId,
        sessionId: docSnap.id,
        message: error?.message
      });
    }
  }

  const allSessionsSnap = await getDocs(sessionsRef);
  for (const docSnap of allSessionsSnap.docs) {
    if (deletedSessionIds.has(docSnap.id)) continue;
    const scid = __resolveOwnedCloudCourseIdFromDoc(docSnap);
    if (scid !== courseId) continue;

    try {
      await deleteSessionFromFirestore(studentUid, docSnap.id);
      deletedSessionIds.add(docSnap.id);
      sessionsDeleted += 1;
    } catch (error) {
      logger.warn('⚠️ [cleanupOwnedCloudCourseData] Error eliminando sesión legacy:', {
        studentUid,
        courseId,
        sessionId: docSnap.id,
        message: error?.message
      });
    }
  }

  const draftBackupsRef = collection(db, 'users', studentUid, 'draftBackups');
  const backupsByCourse = query(draftBackupsRef, where('sourceCourseId', '==', courseId));
  const backupsSnap = await getDocs(backupsByCourse);
  for (const docSnap of backupsSnap.docs) {
    try {
      await deleteDoc(docSnap.ref);
      if (!deletedBackupIds.has(docSnap.id)) {
        deletedBackupIds.add(docSnap.id);
        draftBackupsDeleted += 1;
      }
    } catch (error) {
      logger.warn('⚠️ [cleanupOwnedCloudCourseData] Error eliminando draftBackup:', {
        studentUid,
        courseId,
        draftBackupId: docSnap.id,
        message: error?.message
      });
    }
  }

  const allBackupsSnap = await getDocs(draftBackupsRef);
  for (const docSnap of allBackupsSnap.docs) {
    if (deletedBackupIds.has(docSnap.id)) continue;
    const scid = __resolveOwnedCloudCourseIdFromDoc(docSnap);
    if (scid !== courseId) continue;

    try {
      await deleteDoc(docSnap.ref);
      deletedBackupIds.add(docSnap.id);
      draftBackupsDeleted += 1;
    } catch (error) {
      logger.warn('⚠️ [cleanupOwnedCloudCourseData] Error eliminando draftBackup legacy:', {
        studentUid,
        courseId,
        draftBackupId: docSnap.id,
        message: error?.message
      });
    }
  }

  notificationsDeleted = await __cleanupCourseNotificationsForStudent(studentUid, courseId);

  return {
    sessionsDeleted,
    draftBackupsDeleted,
    notificationsDeleted
  };
}

/**
 * Purga todos los datos del estudiante asociados a un curso.
 * - Siempre limpia progreso de lecturas y notificaciones con `courseId`.
 * - Opcionalmente (solo cuando el actor es el propio estudiante) limpia
 *   sesiones cloud y draftBackups de ese curso.
 */
export async function purgeStudentCourseData(studentUid, courseId, options = {}) {
  const {
    lecturasAsignadas = [],
    includeOwnedCloudData = false
  } = options || {};

  if (!studentUid || !courseId) {
    throw new Error('studentUid y courseId son requeridos');
  }

  const stats = {
    progressDeleted: 0,
    notificationsDeleted: 0,
    sessionsDeleted: 0,
    draftBackupsDeleted: 0
  };

  stats.progressDeleted = await __cleanupCourseProgressForStudent(studentUid, courseId, lecturasAsignadas);
  stats.notificationsDeleted = await __cleanupCourseNotificationsForStudent(studentUid, courseId);

  if (includeOwnedCloudData) {
    const owned = await __cleanupOwnedCloudCourseDataForStudent(studentUid, courseId);
    stats.sessionsDeleted = owned.sessionsDeleted;
    stats.draftBackupsDeleted = owned.draftBackupsDeleted;
    // Este valor ya se contó arriba. Mantener el mayor por robustez.
    stats.notificationsDeleted = Math.max(stats.notificationsDeleted, owned.notificationsDeleted);
  }

  return stats;
}

/**
 * Limpia datos "huérfanos" del estudiante en nube cuando ya no está inscrito
 * en ciertos cursos (ej: docente lo retira o elimina el curso).
 * Incluye progreso por curso y datos owner-owned del estudiante.
 */
export async function cleanupOrphanedStudentOwnedCourseData(studentUid, activeCourseIds = []) {
  if (!studentUid) throw new Error('studentUid requerido');

  const activeSet = new Set((activeCourseIds || []).filter(Boolean));
  const orphanCourseIds = new Set();
  const stats = {
    orphanCourseIds: [],
    progressDeleted: 0,
    sessionsDeleted: 0,
    draftBackupsDeleted: 0,
    notificationsDeleted: 0
  };

  const shouldDeleteCourseData = (courseId) => {
    if (!__isRealCourseId(courseId)) return false;
    return !activeSet.has(courseId);
  };

  const resolveProgressCourseId = (docSnap) => {
    const data = docSnap.data() || {};
    const fromField = data.sourceCourseId || null;
    if (fromField) return fromField;

    const textoId = data.textoId || null;
    const docId = docSnap.id || '';
    if (!textoId || !docId.endsWith(`_${textoId}`)) return null;
    const maybeCourseId = docId.slice(0, docId.length - (`_${textoId}`).length);
    return maybeCourseId || null;
  };

  const resolveOwnedCloudCourseId = (docSnap) => __resolveOwnedCloudCourseIdFromDoc(docSnap);

  // 1) Progreso por curso huérfano
  try {
    const progressRef = collection(db, 'students', studentUid, 'progress');
    const progressSnap = await getDocs(progressRef);

    for (const docSnap of progressSnap.docs) {
      const scid = resolveProgressCourseId(docSnap);
      if (!shouldDeleteCourseData(scid)) continue;
      try {
        orphanCourseIds.add(scid);
        await deleteDoc(docSnap.ref);
        stats.progressDeleted += 1;
      } catch (error) {
        logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error eliminando progreso huérfano:', {
          studentUid,
          courseId: scid,
          docId: docSnap.id,
          message: error?.message
        });
      }
    }
  } catch (error) {
    logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error limpiando progreso huérfano:', error?.message);
  }

  // 2) Sessions cloud por curso huérfano
  try {
    const sessionsRef = collection(db, 'users', studentUid, 'sessions');
    const sessionsSnap = await getDocs(sessionsRef);

    for (const docSnap of sessionsSnap.docs) {
      const scid = resolveOwnedCloudCourseId(docSnap);
      if (!shouldDeleteCourseData(scid)) continue;
      try {
        orphanCourseIds.add(scid);
        await deleteSessionFromFirestore(studentUid, docSnap.id);
        stats.sessionsDeleted += 1;
      } catch (error) {
        logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error eliminando sesión huérfana:', {
          studentUid,
          courseId: scid,
          sessionId: docSnap.id,
          message: error?.message
        });
      }
    }
  } catch (error) {
    logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error limpiando sessions huérfanas:', error?.message);
  }

  // 3) Draft backups cloud por curso huérfano
  try {
    const backupsRef = collection(db, 'users', studentUid, 'draftBackups');
    const backupsSnap = await getDocs(backupsRef);

    for (const docSnap of backupsSnap.docs) {
      const scid = resolveOwnedCloudCourseId(docSnap);
      if (!shouldDeleteCourseData(scid)) continue;
      try {
        orphanCourseIds.add(scid);
        await deleteDoc(docSnap.ref);
        stats.draftBackupsDeleted += 1;
      } catch (error) {
        logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error eliminando draftBackup huérfano:', {
          studentUid,
          courseId: scid,
          draftBackupId: docSnap.id,
          message: error?.message
        });
      }
    }
  } catch (error) {
    logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error limpiando draftBackups huérfanos:', error?.message);
  }

  // 4) Notificaciones por curso huérfano
  try {
    const notificationsRef = collection(db, 'students', studentUid, 'notifications');
    const notificationsSnap = await getDocs(notificationsRef);

    for (const docSnap of notificationsSnap.docs) {
      const courseId = docSnap.data()?.courseId || null;
      if (!shouldDeleteCourseData(courseId)) continue;
      try {
        orphanCourseIds.add(courseId);
        await deleteDoc(docSnap.ref);
        stats.notificationsDeleted += 1;
      } catch (error) {
        logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error eliminando notificación huérfana:', {
          studentUid,
          courseId,
          notificationId: docSnap.id,
          message: error?.message
        });
      }
    }
  } catch (error) {
    logger.warn('⚠️ [cleanupOrphanedStudentOwnedCourseData] Error limpiando notificaciones huérfanas:', error?.message);
  }

  stats.orphanCourseIds = Array.from(orphanCourseIds);
  return stats;
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

    // 2. Obtener estudiantes
    const studentsSnap = await getDocs(collection(db, 'courses', courseId, 'students'));
    const studentUids = studentsSnap.docs.map((d) => d.id).filter(Boolean);

    // 2.1 Best-effort: intentar enqueue owner-only para sesiones/draftBackups (Admin SDK).
    // Si el backend no responde o falla, NO bloquear la eliminación del curso.
    // La purga de progreso/notificaciones con Client SDK sigue funcionando.
    for (const studentUid of studentUids) {
      try {
        const ownerCleanup = await __enqueueOwnedCloudCleanupJob({
          courseId,
          studentUid,
          reason: 'teacher_delete_course'
        });
        if (!ownerCleanup?.ok) {
          logger.warn('⚠️ [deleteCourse] Cleanup owner-only no encolado (best-effort):', { studentUid, ...ownerCleanup });
        }
      } catch (ownerCleanupError) {
        logger.warn('⚠️ [deleteCourse] Error en enqueue owner-only (best-effort):', {
          studentUid,
          error: ownerCleanupError?.message
        });
      }
    }

    // 2.2 Limpiar datos de todos los estudiantes (fase fail-fast)
    const purgeFailures = [];
    for (const studentDoc of studentsSnap.docs) {
      const studentUid = studentDoc.id;

      try {
        const cleanupStats = await purgeStudentCourseData(studentUid, courseId, {
          lecturasAsignadas,
          includeOwnedCloudData: false
        });
        logger.log('🧹 [deleteCourse] Limpieza aplicada al estudiante:', {
          courseId,
          studentUid,
          ...cleanupStats
        });
      } catch (cleanupError) {
        purgeFailures.push({
          courseId,
          studentUid,
          message: cleanupError?.message
        });
      }
    }

    if (purgeFailures.length > 0) {
      logger.error('❌ [deleteCourse] Purga incompleta; se aborta borrado de matrícula/curso para evitar residuos:', {
        courseId,
        purgeFailures
      });
      throw new Error(`No se pudo purgar completamente el curso para ${purgeFailures.length} estudiante(s). Operación abortada.`);
    }

    // 3. Eliminar matrícula tras purga exitosa
    for (const studentDoc of studentsSnap.docs) {
      const studentUid = studentDoc.id;

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

    // 5. Eliminar código del curso (al final para evitar estado inconsistente)
    if (code) {
      try {
        await deleteDoc(doc(db, 'courseCodes', code));
      } catch (codeError) {
        // No revertir la eliminación del curso por código legacy huérfano.
        logger.warn('⚠️ No se pudo eliminar courseCodes tras borrar curso. Continuando...', {
          code,
          courseId,
          message: codeError?.message
        });
      }
    }

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

    // 1) Resolver lecturas asignadas para fallback de limpieza legacy
    let lecturasAsignadas = [];
    try {
      const courseSnap = await getDoc(doc(db, 'courses', courseId));
      if (courseSnap.exists()) {
        lecturasAsignadas = courseSnap.data()?.lecturasAsignadas || [];
      }
    } catch (courseReadError) {
      logger.warn('⚠️ [deleteStudentFromCourse] No se pudieron leer lecturas del curso:', courseReadError?.message);
    }

    const actorUid = auth?.currentUser?.uid || null;
    const includeOwnedCloudData = actorUid === studentUid;

    // 2) Si el actor es docente (no owner), intentar enqueue owner-only (sesiones/draftBackups via Admin SDK).
    // Best-effort: si el backend no responde, NO bloquear la baja del estudiante.
    if (!includeOwnedCloudData) {
      try {
        const ownerCleanup = await __enqueueOwnedCloudCleanupJob({
          courseId,
          studentUid,
          reason: 'teacher_remove_student'
        });
        if (!ownerCleanup?.ok) {
          logger.warn('⚠️ [deleteStudentFromCourse] Cleanup owner-only no encolado (best-effort):', ownerCleanup);
        }
      } catch (enqueueErr) {
        logger.warn('⚠️ [deleteStudentFromCourse] Error en enqueue owner-only (best-effort):', enqueueErr?.message);
      }
    }

    // 3) Limpiar datos de curso del estudiante ANTES de borrar la matrícula.
    // Si falla la purga, abortar para no dejar residuos con baja aparentemente exitosa.
    try {
      const cleanupStats = await purgeStudentCourseData(studentUid, courseId, {
        lecturasAsignadas,
        includeOwnedCloudData
      });
      logger.log('🧹 [deleteStudentFromCourse] Limpieza por baja aplicada:', {
        courseId,
        studentUid,
        includeOwnedCloudData,
        ...cleanupStats
      });
    } catch (cleanupError) {
      throw new Error(`No se pudo completar limpieza previa a la baja: ${cleanupError?.message || 'error desconocido'}`);
    }

    // 4. Eliminar de la subcolección del curso
    await deleteDoc(doc(db, 'courses', courseId, 'students', studentUid));

    // 5. También quitar del array enrolledCourses del usuario
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
    // 🔧 FIX: deleteStudentFromCourse ya hace arrayRemove de enrolledCourses,
    // no es necesario hacerlo aquí también (evita escritura duplicada)
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
      const staleEnrolledIds = [];
      const coursesPromises = enrolledIds.map(async (courseId) => {
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (!courseSnap.exists()) {
          staleEnrolledIds.push(courseId);
          return null;
        }

        // Obtener estado real desde la subcolección del curso
        const enrollmentSnap = await getDoc(doc(db, 'courses', courseId, 'students', studentUid));
        if (!enrollmentSnap.exists()) {
          staleEnrolledIds.push(courseId);
          return null;
        }

        const status = enrollmentSnap.data()?.estado || 'unknown';
        if (status === 'removed' || status === 'deleted' || status === 'inactive') {
          staleEnrolledIds.push(courseId);
          return null;
        }

        return {
          id: courseSnap.id,
          ...courseSnap.data(),
          enrollmentStatus: status
        };
      });

      const courses = await Promise.all(coursesPromises);

      if (staleEnrolledIds.length > 0) {
        try {
          await updateDoc(userRef, {
            enrolledCourses: arrayRemove(...staleEnrolledIds)
          });
          logger.warn('🧹 [getStudentCourses] EnrolledCourses desalineados removidos del perfil:', staleEnrolledIds);
        } catch (cleanupError) {
          logger.warn('⚠️ [getStudentCourses] No se pudieron limpiar enrolledCourses desalineados:', cleanupError?.message);
        }
      }

      return courses.filter(Boolean);
    }

    // Fallback antiguo si el array está vacío (para usuarios viejos)
    logger.warn('⚠️ [getStudentCourses] Sin enrolledCourses, usando fallback lento (collectionGroup)');
    const studentsQuery = query(
      collectionGroup(db, 'students'),
      where('estudianteUid', '==', studentUid)
    );
    const snapshot = await getDocs(studentsQuery);
    const inactiveStatuses = new Set(['removed', 'deleted', 'inactive']);
    const courses = [];
    for (const docSnap of snapshot.docs) {
      const enrollmentStatus = docSnap.data()?.estado || 'unknown';
      if (inactiveStatuses.has(enrollmentStatus)) {
        continue;
      }

      const courseRef = docSnap.ref.parent.parent;
      if (courseRef) {
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          courses.push({
            id: courseSnap.id,
            ...courseSnap.data(),
            enrollmentStatus
          });
        }
      }
    }
    return courses;
  } catch (error) {
    logger.error('❌ Error obteniendo cursos del estudiante:', error);
    throw error;
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
export async function resetStudentArtifact(studentUid, textoId, artifactName, courseId = null) {
  try {
    if (!studentUid || !textoId || !artifactName) {
      throw new Error('Se requieren studentUid, textoId y artifactName');
    }

    logger.log(`🔄 [Reset] Iniciando reset de ${artifactName} para ${studentUid} en ${textoId} (courseId: ${courseId || 'legacy'})`);
    const { ref: progressRef, snap: progressSnap, legacyCourseId } = await __resolveProgressDoc(studentUid, textoId, courseId);

    if (!progressSnap && legacyCourseId && courseId) {
      logger.warn('🚫 [Reset] Legacy doc ignorado: pertenece a curso', legacyCourseId, 'pero se pidió', courseId);
    }

    if (!progressSnap || !progressSnap.exists() || !progressRef) {
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

    // 🔧 FIX: Recalcular porcentaje, estado y entregaFinal tras el reset
    // para que la barra de progreso del estudiante refleje el cambio inmediatamente.
    const ARTIFACT_NAMES = ['resumenAcademico', 'tablaACD', 'mapaActores', 'respuestaArgumentativa', 'bitacoraEticaIA'];
    const rubricas = Object.keys(rubricProgress).filter(k => k.startsWith('rubrica'));
    const rubricasCompletadas = rubricas.filter(k => {
      const r = rubricProgress[k];
      return r && r.scores && r.scores.length > 0;
    }).length;
    const porcentaje = Math.round((rubricasCompletadas / 5) * 100);
    const estado = porcentaje >= 100 ? 'completed' : (porcentaje > 0 ? 'in-progress' : 'pending');

    // Recalcular entregaFinal con el artefacto reseteado
    const allArtifacts = {};
    Object.values(activitiesProgress).forEach(docProgress => {
      if (docProgress?.artifacts) {
        Object.entries(docProgress.artifacts).forEach(([artName, artData]) => {
          if (artName === artifactName) return; // Excluir el artefacto reseteado
          if (artData?.submitted && !allArtifacts[artName]) {
            allArtifacts[artName] = { submitted: true, submittedAt: artData.submittedAt || 0, score: artData.score || 0 };
          }
        });
      }
    });
    const entregados = ARTIFACT_NAMES.filter(n => allArtifacts[n]?.submitted).length;
    updateData.porcentaje = porcentaje;
    updateData.progress = porcentaje;
    updateData.avancePorcentaje = porcentaje;
    updateData.estado = estado;
    updateData.entregaFinal = {
      completa: entregados === 5,
      entregados,
      total: 5,
      artifacts: allArtifacts,
      fechaEntrega: null
    };

    logger.log('📝 [Reset] Actualizando con:', { artifactsPaths: Array.from(artifactsPaths), artifactName, rubricKey, porcentaje, entregados });
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
export async function resetAllStudentArtifacts(studentUid, textoId, courseId = null, resetBy = 'docente') {
  try {
    if (!studentUid || !textoId) {
      throw new Error('Se requieren studentUid y textoId');
    }

    const normalizedResetBy = resetBy === 'estudiante' ? 'estudiante' : 'docente';

    logger.log(`🔄 [Reset ALL] Iniciando reset de todos los artefactos para ${studentUid} en ${textoId} (courseId: ${courseId || 'legacy'})`);
    const { ref: progressRef, snap: progressSnap, legacyCourseId } = await __resolveProgressDoc(studentUid, textoId, courseId);

    if (!progressSnap && legacyCourseId && courseId) {
      logger.warn('🚫 [Reset ALL] Legacy doc ignorado: pertenece a curso', legacyCourseId, 'pero se pidió', courseId);
    }

    if (!progressSnap || !progressSnap.exists() || !progressRef) {
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
        resetBy: normalizedResetBy
      };
    });

    // Resetear todas las rúbricas con estructura correcta (scores array)
    const emptyRubrics = {
      rubrica1: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: normalizedResetBy },
      rubrica2: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: normalizedResetBy },
      rubrica3: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: normalizedResetBy },
      rubrica4: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: normalizedResetBy },
      rubrica5: { scores: [], average: 0, lastUpdate: Date.now(), artefactos: [], resetAt: new Date().toISOString(), resetBy: normalizedResetBy }
    };

    const updateData = {
      rubricProgress: emptyRubrics,
      lastResetAt: serverTimestamp(),
      lastResetBy: normalizedResetBy
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
export async function getStudentArtifactDetails(studentUid, textoId, courseId = null) {
  try {
    if (!studentUid || !textoId) {
      throw new Error('Se requieren studentUid y textoId');
    }

    logger.log('🔍 [getStudentArtifactDetails] Buscando:', { studentUid, textoId, courseId });
    const { snap: progressSnap, usedDocId, legacyCourseId } = await __resolveProgressDoc(studentUid, textoId, courseId);

    if (!progressSnap && legacyCourseId && courseId) {
      logger.warn('🚫 [getStudentArtifactDetails] Legacy doc ignorado: pertenece a curso', legacyCourseId, 'pero se pidió', courseId);
    }

    logger.log('📄 [getStudentArtifactDetails] Documento encontrado:', Boolean(progressSnap), usedDocId ? `(${usedDocId})` : '');

    if (!progressSnap) {
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
      if (rubric?.summative && rubric.summative.status === 'graded') {
        const summativeScore = rubric.summative.teacherOverrideScore ?? rubric.summative.score;
        if (summativeScore != null) {
          return Number(summativeScore) || 0;
        }
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
        if (!s || (s.score == null && s.teacherOverrideScore == null)) return;

        const scoreNum = Number(
          typeof (s.teacherOverrideScore ?? s.score) === 'string'
            ? String(s.teacherOverrideScore ?? s.score).replace(',', '.').replace('/10', '').trim()
            : (s.teacherOverrideScore ?? s.score)
        );
        if (!Number.isFinite(scoreNum) || scoreNum <= 0) return;

        essays.push({
          rubricId,
          score: scoreNum,
          status: String(s.status || '').toLowerCase() || 'evaluated',
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

