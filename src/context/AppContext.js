import React, { createContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  createSessionFromState,
  restoreSessionToState,
  captureCurrentState,
  updateCurrentSession,
  setCurrentSession as setCurrentSessionId,
  getCurrentSessionId,
  captureArtifactsDrafts,
  saveDraftBackupToCloudWriteOnly,
  cleanupLegacyDraftBackupsInSessions,
  setCurrentUser as setSessionManagerUser,
  replaceAllLocalSessions,
  syncAllSessionsToCloud,
  getAllSessionsMerged,
  getAllSessions,
  syncPendingSessions,
  setupBeforeUnloadSync,
  getDeletedSessionTombstones,
  deleteAllSessions as deleteAllSessionsFromManager
} from '../services/sessionManager';
import { simpleHash as simpleObjectHash } from '../utils/sessionHash';
import { scopeKey, rubricProgressKey, activitiesProgressKey, activitiesProgressMigratedKey } from '../utils/storageKeys.js';
import { useAuth } from './AuthContext';
import {
  saveEvaluacion,
  saveStudentProgress,
  getStudentProgress,
  subscribeToStudentProgress,
  getUserSessions,
  mergeSessions,
  subscribeToUserSessions,
  resetAllStudentArtifacts
} from '../firebase/firestore';
import { auth } from '../firebase/config';
// (firebase/sessionManager) quedó deprecado en AppContext; se mantiene en otros módulos.
import { useSessionMaintenance } from '../hooks/useSessionMaintenance';
import useFirestorePersistence from '../hooks/useFirestorePersistence';
import { generateBasicAnalysis } from '../services/basicAnalysisService';
import { normalizeBackendErrorPayload } from '../services/unifiedAiService';
import { runLegacyTextAnalysisCacheMigrationOnce } from '../utils/cache';
import { getBackendUrl } from '../utils/backendConfig';
import { PRELECTURE_ANALYSIS_TIMEOUT_MS } from '../constants/timeoutConstants';
import { createAbortControllerWithTimeout, fetchWithRetry } from '../utils/netUtils';
import { recoverPdfBlobWithFallback } from '../utils/pdfRecovery';
import logger from '../utils/logger';
import {
  createEmptyRubricProgressV2,
  createEmptyFormative,
  normalizeRubricProgress,
  checkEssayPrerequisitesFromProgress
} from '../services/rubricProgressV2';

// Backend URL configuration
const BACKEND_URL = getBackendUrl();
logger.log('🔧 [AppContext] Backend URL configurada:', BACKEND_URL);

const normalizeTutorInteraction = (entry) => {
  if (entry == null) return null;

  // Compatibilidad legacy: entradas guardadas como string.
  if (typeof entry === 'string') {
    const question = entry.trim();
    if (!question) return null;
    return {
      timestamp: new Date().toISOString(),
      lectureId: 'global',
      question,
      context: '',
      bloomLevel: null,
      tutorMode: 'general'
    };
  }

  if (typeof entry !== 'object') return null;

  const question = String(
    entry.question ??
    entry.content ??
    entry.prompt ??
    ''
  ).trim();

  if (!question) return null;

  const parsedTs = Date.parse(entry.timestamp);
  const timestamp = Number.isNaN(parsedTs) ? new Date().toISOString() : String(entry.timestamp);
  const context = typeof entry.context === 'string' ? entry.context : '';
  const tutorMode = String(entry.tutorMode ?? entry.mode ?? 'general').trim() || 'general';

  return {
    ...entry,
    timestamp,
    question,
    context,
    bloomLevel: entry.bloomLevel ?? null,
    tutorMode
  };
};

// 1. Crear el Contexto
export const
  AppContext = createContext();

/**
 * Este componente Provider encapsula la lógica del estado global
 * para que esté disponible en toda la aplicación.
 */
export const AppContextProvider = ({ children }) => {
  logger.log('🚀 AppContext provider loaded'); // Log inmediato

  // ==================== FEATURE FLAGS (PERSISTENCIA) ====================
  // Fase 2: Firestore como verdad para progreso evaluable; localStorage solo como "airbag".
  // Por defecto NO cambia el comportamiento.
  const [disableLocalProgressMirror] = useState(() => {
    const fromEnv = (key) => {
      try {
        const v = process?.env?.[key];
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    const fromStorage = (key) => {
      try {
        const v = localStorage.getItem(key);
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '' || s === 'null' || s === 'undefined') return null;
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    // Cualquiera de estos activa modo cloud-first.
    const cloudFirst = fromEnv('REACT_APP_CLOUD_FIRST_PROGRESS') ?? fromStorage('CLOUD_FIRST_PROGRESS');
    const disableMirror = fromEnv('REACT_APP_DISABLE_LOCAL_PROGRESS_MIRROR') ?? fromStorage('DISABLE_LOCAL_PROGRESS_MIRROR');
    return Boolean((cloudFirst ?? false) || (disableMirror ?? false));
  });

  // Etapa 1 (rollout seguro): usar el hook SOLO para lectura/suscripción.
  // Por defecto está apagado.
  const [useFirestorePersistenceHook] = useState(() => {
    const fromEnv = (key) => {
      try {
        const v = process?.env?.[key];
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    const fromStorage = (key) => {
      try {
        const v = localStorage.getItem(key);
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '' || s === 'null' || s === 'undefined') return null;
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    const v = fromEnv('REACT_APP_USE_FIRESTORE_PERSISTENCE_HOOK') ?? fromStorage('USE_FIRESTORE_PERSISTENCE_HOOK');
    return Boolean(v ?? false);
  });

  // Opción A: backup write-only (solo escribir a cloud; no rehidratar sesiones automáticamente)
  const [cloudBackupWriteOnly] = useState(() => {
    const fromEnv = (key) => {
      try {
        const v = process?.env?.[key];
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    const fromStorage = (key) => {
      try {
        const v = localStorage.getItem(key);
        if (v === undefined || v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s === '' || s === 'null' || s === 'undefined') return null;
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      } catch {
        return null;
      }
    };

    const v = fromEnv('REACT_APP_CLOUD_BACKUP_WRITE_ONLY') ?? fromStorage('CLOUD_BACKUP_WRITE_ONLY');
    return Boolean(v ?? false);
  });

  // ==================== BACKUP TTL (firestore_backup_*) ====================
  // Fase 3: firestore_backup_* es un airbag con TTL, no una fuente paralela.
  const [firestoreBackupTtlMs] = useState(() => {
    const fromEnvDays = () => {
      try {
        const raw = process?.env?.REACT_APP_FIRESTORE_BACKUP_TTL_DAYS;
        if (raw === undefined || raw === null) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        return null;
      }
    };

    const fromStorageDays = () => {
      try {
        const raw = localStorage.getItem('FIRESTORE_BACKUP_TTL_DAYS');
        if (raw === undefined || raw === null) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        return null;
      }
    };

    const days = fromEnvDays() ?? fromStorageDays() ?? 7;
    return Math.round(days * 24 * 60 * 60 * 1000);
  });

  const getFirestoreBackupTimestampMs = useCallback((backup) => {
    try {
      if (!backup || typeof backup !== 'object') return null;
      const meta = backup.__firestoreBackupMeta;
      const ts = meta?.updatedAt ?? meta?.createdAt;
      if (Number.isFinite(ts) && ts > 0) return ts;

      const lastSync = backup.lastSync;
      if (typeof lastSync === 'string' && lastSync.trim()) {
        const parsed = Date.parse(lastSync);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  const stampFirestoreBackupMeta = useCallback((backup) => {
    if (!backup || typeof backup !== 'object') return backup;
    return {
      ...backup,
      __firestoreBackupMeta: {
        ...(backup.__firestoreBackupMeta && typeof backup.__firestoreBackupMeta === 'object' ? backup.__firestoreBackupMeta : {}),
        updatedAt: Date.now(),
        version: 1
      }
    };
  }, []);

  const isFirestoreBackupExpired = useCallback((backup) => {
    const ts = getFirestoreBackupTimestampMs(backup);
    if (!ts) return false;
    return Date.now() - ts > firestoreBackupTtlMs;
  }, [getFirestoreBackupTimestampMs, firestoreBackupTtlMs]);

  const readFirestoreBackup = useCallback((uid, docId) => {
    if (!uid || !docId) return null;
    try {
      const key = `firestore_backup_${uid}_${docId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      // TTL: si expiró, eliminar y no usar
      if (isFirestoreBackupExpired(parsed)) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        return null;
      }

      // Compat: si no tenía timestamp, sellarlo para iniciar ventana de TTL
      if (!getFirestoreBackupTimestampMs(parsed)) {
        try {
          const stamped = stampFirestoreBackupMeta(parsed);
          localStorage.setItem(key, JSON.stringify(stamped));
          return stamped;
        } catch {
          return parsed;
        }
      }

      return parsed;
    } catch (e) {
      logger.warn('⚠️ [AppContext] Error leyendo firestore_backup:', e);
      return null;
    }
  }, [getFirestoreBackupTimestampMs, isFirestoreBackupExpired, stampFirestoreBackupMeta]);

  const writeFirestoreBackupMerged = useCallback((uid, docId, patch) => {
    if (!uid || !docId || !patch || typeof patch !== 'object') return;
    try {
      const key = `firestore_backup_${uid}_${docId}`;
      const prevRaw = localStorage.getItem(key);
      let prev = null;
      try {
        prev = prevRaw ? JSON.parse(prevRaw) : null;
      } catch {
        prev = null;
      }

      const next = { ...(prev && typeof prev === 'object' ? prev : {}) };

      if (patch.rubricProgress && typeof patch.rubricProgress === 'object') {
        next.rubricProgress = {
          ...(next.rubricProgress && typeof next.rubricProgress === 'object' ? next.rubricProgress : {}),
          ...patch.rubricProgress
        };
      }

      if (patch.activitiesProgress && typeof patch.activitiesProgress === 'object') {
        next.activitiesProgress = {
          ...(next.activitiesProgress && typeof next.activitiesProgress === 'object' ? next.activitiesProgress : {}),
          ...patch.activitiesProgress
        };
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'rewardsState')) {
        next.rewardsState = patch.rewardsState;
      }

      // Copiar metadata útil si viene en el patch
      ['lastSync', 'syncType', 'sourceCourseId', 'userId'].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          next[k] = patch[k];
        }
      });

      const stamped = stampFirestoreBackupMeta(next);
      localStorage.setItem(key, JSON.stringify(stamped));
    } catch (e) {
      logger.warn('⚠️ [AppContext] No se pudo escribir firestore_backup:', e);
    }
  }, [stampFirestoreBackupMeta]);

  const cleanupExpiredFirestoreBackups = useCallback((uidFilter = null) => {
    try {
      const prefix = 'firestore_backup_';
      const now = Date.now();
      const keysToDelete = [];

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        if (uidFilter && !k.startsWith(`${prefix}${uidFilter}_`)) continue;

        const raw = localStorage.getItem(k);
        if (!raw) continue;

        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          keysToDelete.push(k);
          continue;
        }

        const ts = getFirestoreBackupTimestampMs(parsed);
        if (ts && now - ts > firestoreBackupTtlMs) {
          keysToDelete.push(k);
        }
      }

      keysToDelete.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });

      if (keysToDelete.length > 0) {
        logger.log('🧹 [AppContext] Limpieza TTL firestore_backup_*:', { removed: keysToDelete.length, uid: uidFilter || 'all' });
      }
    } catch (e) {
      logger.warn('⚠️ [AppContext] Error limpiando firestore_backup_*:', e);
    }
  }, [firestoreBackupTtlMs, getFirestoreBackupTimestampMs]);

  // Limpieza TTL al montar (best-effort)
  useEffect(() => {
    cleanupExpiredFirestoreBackups(null);
  }, [cleanupExpiredFirestoreBackups]);

  // Drenado legacy de análisis (muy limitado, una vez por sesión):
  // asegura que `text_analysis_cache` se migre.
  useEffect(() => {
    try {
      runLegacyTextAnalysisCacheMigrationOnce({ limit: 5, dropExpired: true });
    } catch {
      // no-op
    }
  }, []);

  // Firebase Authentication - Usar try/catch para evitar errores si no está disponible
  let currentUser = null;
  let userData = null;

  try {
    const auth = useAuth();
    currentUser = auth.currentUser;
    userData = auth.userData;
  } catch (error) {
    logger.warn('⚠️ [AppContext] AuthContext no disponible aún, continuando sin auth');
  }

  // 🆕 Inicializar SessionManager con el usuario actual
  useEffect(() => {
    if (currentUser) {
      logger.log('👤 [AppContext] Inicializando SessionManager para usuario:', currentUser.uid);
      setSessionManagerUser(currentUser.uid);

      // 🧹 Fase 3: limpiar backups expirados del usuario actual
      cleanupExpiredFirestoreBackups(currentUser.uid);

      // 🎮 Sincronizar motor de recompensas con el UID para aislamiento
      if (window.__rewardsEngine) {
        window.__rewardsEngine.setUserId(currentUser.uid);
      }
    } else {
      setSessionManagerUser(null);
      // 🎮 Limpiar motor de recompensas al cerrar sesión
      if (window.__rewardsEngine) {
        window.__rewardsEngine.setUserId(null);
      }
    }
  }, [currentUser]);

  // 🧹 Cleanup opcional (best-effort): borra backups legacy `draft_backup_*` que
  // quedaron históricamente en `/users/{uid}/sessions` antes de migrar a `draftBackups`.
  // Se ejecuta SOLO en modo write-only y SOLO una vez por usuario.
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!cloudBackupWriteOnly) return;

    const uid = currentUser.uid;
    const key = `__draft_backups_sessions_cleanup_done__${uid}`;

    try {
      if (localStorage.getItem(key) === '1') return;
    } catch {
      return;
    }

    (async () => {
      try {
        // Evita carrera entre efectos: aseguramos que SessionManager tenga el UID.
        setSessionManagerUser(uid);
        const res = await cleanupLegacyDraftBackupsInSessions({ maxToScan: 250 });
        if (res?.ok) {
          try {
            localStorage.setItem(key, '1');
          } catch {
            // ignore
          }
          if ((res.deleted || 0) > 0 || (res.failed || 0) > 0) {
            logger.log(
              `🧹 [AppContext] Cleanup draft backups legacy en sessions: deleted=${res.deleted} failed=${res.failed} scanned=${res.scanned}`
            );
          }
        }
      } catch (e) {
        logger.warn('⚠️ [AppContext] Cleanup legacy draft backups en sessions falló:', e);
      }
    })();
  }, [currentUser?.uid, cloudBackupWriteOnly]);

  const isStudent = userData?.role === 'estudiante';

  // Ref para controlar restauración y evitar reset de análisis
  const isRestoringRef = React.useRef(false);
  const activeRestoreTokenRef = useRef(null);
  const pdfRestoreAbortRef = useRef(null);

  // 🛡️ Anti-loop: cuando el progreso se actualiza desde Firestore, evitamos re-escribir inmediatamente
  const lastRubricProgressFromCloudAtRef = useRef(0);
  const lastActivitiesProgressFromCloudAtRef = useRef(0);
  const lastRewardsStateFromCloudAtRef = useRef(0);
  const lastSavedCitationsFromCloudAtRef = useRef(0);
  const activitiesProgressLocalDirtyRef = useRef(false);
  const lastActivitiesTouchedTextoIdRef = useRef(null);
  const lastSavedCitationsTouchedTextoIdRef = useRef(null);
  const legacyProgressMigratedRef = useRef(new Set());
  const savedCitationsLocalDirtyRef = useRef(false);
  const progressHookHasAppliedInitialRef = useRef(false);
  const appUnmountingRef = useRef(false);
  // 🆕 Anti-loop para reset de docente: trackear último reset procesado para no repetirlo
  const lastProcessedResetTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      appUnmountingRef.current = true;
    };
  }, []);

  // 🆕 ESTADO ATÓMICO DE LECTURA - Garantiza consistencia al cambiar de lectura
  // Un solo estado que contiene TODO lo relacionado con la lectura activa
  const [activeLecture, setActiveLecture] = useState({
    id: null,              // textoId
    courseId: null,        // sourceCourseId
    content: '',           // texto
    fileName: null,        // archivoActual.name
    fileType: null,        // archivoActual.type
    fileURL: null,         // archivoActual.fileURL
    analysis: null,        // completeAnalysis
    isAnalyzing: false,    // loading state
    analysisAttempted: false,
    lastModified: Date.now()
  });

  // 🆕 VALORES DERIVADOS - Compatibilidad con código existente
  // Estos se actualizan automáticamente cuando activeLecture cambia
  const texto = activeLecture.content;
  const currentTextoId = activeLecture.id;
  const sourceCourseId = activeLecture.courseId;
  const completeAnalysis = activeLecture.analysis;

  // 🧷 Refs con el estado más reciente (evita closures stale en async/race)
  const currentTextoIdRef = useRef(currentTextoId);
  const sourceCourseIdRef = useRef(sourceCourseId);
  const completeAnalysisRef = useRef(completeAnalysis);

  useEffect(() => {
    currentTextoIdRef.current = currentTextoId;
  }, [currentTextoId]);

  useEffect(() => {
    sourceCourseIdRef.current = sourceCourseId;
  }, [sourceCourseId]);

  const resolveProgressCourseScope = useCallback((textoId, courseId = sourceCourseIdRef.current) => {
    if (!textoId || textoId === 'global_progress') return null;
    return courseId || `free::${textoId}`;
  }, []);

  const resolveProgressLocalScopeKey = useCallback((textoId, courseId = sourceCourseIdRef.current) => {
    if (!textoId || textoId === 'global_progress') return 'global_progress';
    const scopedCourseId = resolveProgressCourseScope(textoId, courseId);
    return scopeKey(scopedCourseId, textoId) || textoId;
  }, [resolveProgressCourseScope]);

  const isActivityStorageKeyForLecture = useCallback((storageKey, lectureId, courseId = sourceCourseIdRef.current) => {
    if (!storageKey || !lectureId || !storageKey.startsWith('activity_results_')) return false;

    if (courseId) {
      const coursePrefix = `activity_results_${courseId}_`;
      if (!storageKey.startsWith(coursePrefix)) return false;
      const scopedDocId = storageKey.slice(coursePrefix.length);
      return scopedDocId === lectureId || scopedDocId.endsWith(`_${lectureId}`);
    }

    const unscopedDocId = storageKey.slice('activity_results_'.length);
    return unscopedDocId === lectureId ||
      unscopedDocId === `resumen_academico_${lectureId}` ||
      unscopedDocId === `tabla_acd_${lectureId}` ||
      unscopedDocId === `mapa_actores_${lectureId}` ||
      unscopedDocId === `respuesta_argumentativa_${lectureId}` ||
      unscopedDocId === `bitacora_etica_ia_${lectureId}`;
  }, []);

  // Documento de progreso por lectura (fallback a global_progress)
  const progressDocId = currentTextoId || 'global_progress';
  // Clave local equivalente al scope real (curso o modo libre).
  const progressLocalKey = resolveProgressLocalScopeKey(currentTextoId, sourceCourseId);

  useEffect(() => {
    completeAnalysisRef.current = completeAnalysis;
  }, [completeAnalysis]);

  // 🆕 SETTERS DERIVADOS - Para que componentes existentes sigan funcionando
  // Estos actualizan activeLecture internamente
  const setTexto = useCallback((nuevoTexto) => {
    logger.log('🔄 [AppContext] setTexto llamado, longitud:', nuevoTexto?.length || 0);
    setActiveLecture(prev => ({
      ...prev,
      content: nuevoTexto || '',
      lastModified: Date.now()
    }));
  }, []);

  const setCurrentTextoId = useCallback((id) => {
    logger.log('🔄 [AppContext] setCurrentTextoId:', id);
    setActiveLecture(prev => ({
      ...prev,
      id: id,
      lastModified: Date.now()
    }));
  }, []);

  const setSourceCourseId = useCallback((courseId) => {
    logger.log('🔄 [AppContext] setSourceCourseId:', courseId);
    setActiveLecture(prev => ({
      ...prev,
      courseId: courseId,
      lastModified: Date.now()
    }));
  }, []);

  const setCompleteAnalysis = useCallback((analysis) => {
    logger.log('🔄 [AppContext] setCompleteAnalysis:', analysis ? 'CON DATOS' : 'NULL');
    setActiveLecture(prev => ({
      ...prev,
      analysis: analysis,
      isAnalyzing: false,
      lastModified: Date.now()
    }));
  }, []);

  // 🆕 FUNCIÓN PRINCIPAL: Cambio atómico de lectura
  // GARANTIZA que todos los estados cambien juntos, sin race conditions
  const switchLecture = useCallback((lectureData) => {
    logger.log('🔄 [AppContext] ===== SWITCH LECTURE (ATÓMICO) =====');
    logger.log('📎 Nuevo textoId:', lectureData.id);
    logger.log('📎 Nuevo courseId:', lectureData.courseId);
    logger.log('📎 Contenido:', lectureData.content?.length || 0, 'chars');

    // 🆕 FIX CRÍTICO: Cada lectura necesita su PROPIA sesión aislada por curso+texto
    // Buscar si ya existe una sesión para este textoId EN ESTE CURSO
    if (lectureData.id) {
      const allSessions = getAllSessions();
      const existingSession = allSessions.find(s => {
        const sTextoId = s.currentTextoId || s.text?.metadata?.id || s.text?.textoId;
        const sCourseId = s.sourceCourseId || s.text?.sourceCourseId || null;
        if (sTextoId !== lectureData.id) return false;
        // 🛡️ FIX: Si se pide un courseId específico, la sesión DEBE tener el mismo courseId.
        // Sesiones legacy (sin courseId) NO se reutilizan para peticiones con curso específico.
        if (lectureData.courseId) {
          if (!sCourseId || sCourseId !== lectureData.courseId) return false;
        }
        return true;
      });

      if (existingSession) {
        // Reutilizar la sesión existente de esta lectura+curso
        setCurrentSessionId(existingSession.id);
        logger.log('♻️ [AppContext] Reutilizando sesión existente para esta lectura:', existingSession.id);
      } else {
        // Crear un NUEVO ID de sesión único para esta lectura
        const newSessionId = `session_${Date.now()}_${lectureData.id.substring(0, 8)}`;
        setCurrentSessionId(newSessionId);
        logger.log('🆕 [AppContext] Nueva sesión creada para lectura:', newSessionId);
      }
    } else {
      logger.warn('⚠️ [AppContext] switchLecture sin textoId, no se puede asignar sesión');
    }

    // 🛡️ FIX: Permitir que restoreSessionToState salte el reset de progreso
    // para evitar race condition donde queueMicrotask borra citas/rúbricas/actividades
    // DESPUÉS de que fueron restauradas sincrónicamente.
    const skipReset = Boolean(lectureData.__skipProgressReset);

    setActiveLecture(prev => {
      // 🛡️ FIX CROSS-COURSE: Detectar si cambia el curso (o el textoId)
      // para resetear inmediatamente el estado de progreso y evitar que
      // datos del curso anterior sean visibles ni siquiera durante un frame.
      const isCourseChanging = prev.courseId !== (lectureData.courseId || null);
      const isTextoChanging = prev.id !== (lectureData.id || null);

      if ((isCourseChanging || isTextoChanging) && !skipReset) {
        logger.log('🛡️ [switchLecture] Curso/texto cambió — reseteando progreso eagerly');
        // Los setters de useState son estables y accesibles desde la closure
        // aunque estén declarados más abajo en el cuerpo del componente.
        queueMicrotask(() => {
          setActivitiesProgress({});
          setRubricProgress(createEmptyRubricProgressV2());
          setSavedCitations({});
        });
      } else if ((isCourseChanging || isTextoChanging) && skipReset) {
        logger.log('🛡️ [switchLecture] Curso/texto cambió — skip reset (restauración de sesión)');
      }

      return {
        id: lectureData.id || null,
        courseId: lectureData.courseId || null,
        content: lectureData.content || '',
        fileName: lectureData.fileName || null,
        fileType: lectureData.fileType || null,
        fileURL: lectureData.fileURL || null,
        analysis: null,  // Siempre empezar sin análisis (se cargará después)
        isAnalyzing: false,
        analysisAttempted: false,
        lastModified: Date.now()
      };
    });

    logger.log('✅ [AppContext] Lectura cambiada atómicamente con sesión aislada');
  }, []);

  // 🆕 MODO ENFOQUE GLOBAL - Única fuente de verdad para toda la app
  const [focusMode, _setFocusMode] = useState(false);

  const setFocusMode = useCallback((val) => {
    logger.log('🎯 [AppContext] Cambiando modo enfoque:', val);
    _setFocusMode(val);
  }, []);

  const toggleFocusMode = useCallback(() => {
    _setFocusMode(prev => {
      logger.log('🎯 [AppContext] toggleFocusMode:', !prev);
      return !prev;
    });
  }, []);

  // Debug wrapper para compatibilidad
  const setTextoWithDebug = useCallback((nuevoTexto) => {
    logger.log('🔄 AppContext - Estableciendo nuevo texto, longitud:', nuevoTexto?.length || 0);
    setTexto(nuevoTexto);
  }, [setTexto]);

  const currentUserUid = currentUser?.uid || null;

  const [openAIApiKey, setOpenAIApiKey] = useState(() => {
    // Intentar clave scopeada primero, luego legacy
    const uid = currentUser?.uid;
    if (uid) {
      const scoped = localStorage.getItem(`openai_api_key:${uid}`);
      if (scoped) return scoped;
    }
    return localStorage.getItem('openai_api_key') || '';
  });

  // MEJORA: Inicializar modo oscuro desde localStorage o preferencia del sistema para persistencia.
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('modoOscuro');
    if (guardado !== null) {
      return JSON.parse(guardado);
    }
    // Si no hay nada guardado, detectar preferencia del sistema.
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 🆕 P9 FIX: Estado de sincronización con Firestore (idle | syncing | synced | error)
  const [syncStatus, setSyncStatus] = useState('idle');
  // 🆕 REGISTRO GLOBAL DE INTERACCIONES DEL TUTOR (A5 FIX)
  const [_globalTutorInteractions, setGlobalTutorInteractions] = useState([]);

  useEffect(() => {
    // Usar 'global' como fallback si no hay textoId específico
    // 🛡️ FIX CROSS-COURSE: Incluir sourceCourseId para aislar log entre cursos con mismo textoId
    const buildTutorStorageKey = (courseId, lectureIdValue) => {
      const scopedCourse = courseId ? `${courseId}::` : '';
      return `tutorInteractionsLog:${scopedCourse}${lectureIdValue}`;
    };
    const lectureId = currentTextoId || 'global';
    const storageKey = buildTutorStorageKey(sourceCourseId, lectureId);

    // Cargar inicial
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const parsed = Array.isArray(saved) ? saved : [];
      const normalized = parsed.map(normalizeTutorInteraction).filter(Boolean);
      const trimmed = normalized.slice(-150);
      setGlobalTutorInteractions(trimmed);
      // Si encontramos datos legacy/invalidos o por encima del limite, normalizamos storage.
      if (trimmed.length !== parsed.length || normalized.length !== parsed.length) {
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
      }
    } catch {
      setGlobalTutorInteractions([]);
    }

    const handleNewInteraction = (event) => {
      const normalizedInteraction = normalizeTutorInteraction(event?.detail);
      if (!normalizedInteraction) return;

      const targetLectureId = normalizedInteraction.lectureId || lectureId;
      const targetCourseId = normalizedInteraction.sourceCourseId ?? sourceCourseId;
      const interaction = normalizedInteraction.lectureId
        ? normalizedInteraction
        : { ...normalizedInteraction, lectureId: targetLectureId };
      const targetKey = buildTutorStorageKey(targetCourseId, targetLectureId);

      if (targetLectureId !== lectureId || targetCourseId !== sourceCourseId) {
        try {
          const existing = JSON.parse(localStorage.getItem(targetKey) || '[]');
          const updated = [...(Array.isArray(existing) ? existing : []), interaction].slice(-150);
          localStorage.setItem(targetKey, JSON.stringify(updated));
        } catch { /* noop */ }
        return;
      }

      setGlobalTutorInteractions(prev => {
        const updated = [...prev, interaction].slice(-150);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          logger.warn('⚠️ [AppContext] No se pudo persistir tutorInteractionsLog en localStorage:', e);
        }
        return updated;
      });
    };

    window.addEventListener('tutor-interaction-logged', handleNewInteraction);
    return () => {
      logger.log('🔌 [AppContext] Removiendo listener global');
      window.removeEventListener('tutor-interaction-logged', handleNewInteraction);
    };
  }, [currentTextoId, sourceCourseId]);

  // Opción para limpiar log globalmente
  const _clearGlobalTutorLog = useCallback(() => {
    const lectureId = currentTextoId || 'global';
    const courseScope = sourceCourseId ? `${sourceCourseId}::` : '';
    const storageKey = `tutorInteractionsLog:${courseScope}${lectureId}`;
    localStorage.removeItem(storageKey);
    setGlobalTutorInteractions([]);
    logger.log('🗑️ [AppContext] Log del tutor limpiado para:', lectureId);
  }, [currentTextoId, sourceCourseId]);

  // Flag para saber si ya se intentó analizar el texto actual
  const [analysisAttempted, setAnalysisAttempted] = useState(false);
  // Archivo actual (para preservar PDF original y mostrarlo en visor)
  const [archivoActual, setArchivoActual] = useState(null);

  // NUEVO: Estructura del texto detectada por IA
  const [textStructure, setTextStructure] = useState(null);

  // NOTA: completeAnalysis ahora es parte de activeLecture (línea ~100)
  // El setter setCompleteAnalysis actualiza activeLecture.analysis

  // 🆕 CACHE DESHABILITADO: El estado atómico activeLecture elimina race conditions
  // El localStorage cache (A6) sigue funcionando para persistencia entre sesiones

  // 🆕 PROGRESO POR RÚBRICAS: Sistema de tracking de evaluaciones de artefactos
  // Constante para estado vacío (reutilizable para reset)
  const emptyRubricProgress = useMemo(() => createEmptyRubricProgressV2(), []);

  // Inicializar vacío, se cargará en useEffect cuando haya usuario Y textoId
  const [rubricProgress, setRubricProgress] = useState(emptyRubricProgress);

  // Cargar rubricProgress específico del usuario + textoId (fallback local por lectura)
  // 🛡️ CRÍTICO: Al cambiar de lectura, primero limpiar y luego cargar datos de la nueva lectura
  useEffect(() => {
    if (!currentUser?.uid || !currentTextoId || disableLocalProgressMirror || useFirestorePersistenceHook) {
      // Sin usuario o sin lectura activa -> resetear a vacío para evitar contaminación
      setRubricProgress(emptyRubricProgress);
      return;
    }

    // 🛡️ PASO 1: Resetear a vacío ANTES de cargar datos de la nueva lectura
    // Esto evita contaminación cruzada entre lecturas
    setRubricProgress(emptyRubricProgress);

    const key = rubricProgressKey(currentUser.uid, currentTextoId, sourceCourseId);
    const saved = localStorage.getItem(key);

    if (!saved) {
      // Sin datos locales para esta lectura - mantener vacío
      logger.log(`ℹ️ [AppContext] Sin rubricProgress local para ${currentTextoId}`);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        // 🛡️ PASO 2: Cargar datos específicos de ESTA lectura
        setRubricProgress(normalizeRubricProgress(parsed));
        logger.log(`✅ [AppContext] rubricProgress cargado (local) para ${currentUser.uid} / ${currentTextoId}`);
      }
    } catch (e) {
      logger.warn('⚠️ Error cargando rubricProgress (local):', e);
    }
  }, [currentUser?.uid, currentTextoId, sourceCourseId, disableLocalProgressMirror, useFirestorePersistenceHook, emptyRubricProgress]);

  // Persistir rubricProgress en localStorage cuando cambie (namespace por lectura)
  // 🛡️ NO guardar si está vacío - evita sobrescribir datos buenos durante el cambio de lectura
  useEffect(() => {
    if (!currentUser?.uid || !currentTextoId || disableLocalProgressMirror || useFirestorePersistenceHook) return;

    // 🛡️ PROTECCIÓN: No guardar estado vacío en localStorage
    // Esto evita sobrescribir datos existentes durante el reseteo al cambiar de lectura
    const hasData = Object.keys(rubricProgress).some(k => (rubricProgress[k]?.formative?.scores?.length || rubricProgress[k]?.scores?.length || 0) > 0);
    if (!hasData) {
      logger.log(`ℹ️ [AppContext] Omitiendo guardar rubricProgress vacío para ${currentTextoId}`);
      return;
    }

    // 🛡️ FIX CROSS-COURSE: usar sourceCourseId como valor (no ref) para clave consistente con el render
    const key = rubricProgressKey(currentUser.uid, currentTextoId, sourceCourseId);
    localStorage.setItem(key, JSON.stringify(rubricProgress));
    logger.log(`💾 [AppContext] rubricProgress guardado en localStorage para ${currentTextoId}`);
  }, [rubricProgress, currentUser, currentTextoId, sourceCourseId, disableLocalProgressMirror, useFirestorePersistenceHook]);

  // 🆕 FIX: Cargar rubricProgress desde Firestore cuando cambie el texto (currentTextoId)
  // Esto asegura que cada lectura tenga su propio progreso de evaluación
  // 🛡️ NO MERGE: Cargar datos específicos de esta lectura, sin mezclar con datos anteriores
  useEffect(() => {
    // Ref para evitar state updates en componente desmontado
    let isMounted = true;

    const loadProgressForText = async () => {
      // Si no hay usuario o texto, mantener estado actual
      if (!currentUser?.uid || !currentTextoId) {
        logger.log('ℹ️ [AppContext] Skipping rubricProgress load - no user or textoId');
        return;
      }

      logger.log(`📥 [AppContext] Cargando rubricProgress desde Firestore para texto: ${currentTextoId}`);

      try {
        // Obtener progreso guardado en Firestore para este texto específico
        const progress = await getStudentProgress(
          currentUser.uid,
          currentTextoId,
          resolveProgressCourseScope(currentTextoId, sourceCourseIdRef.current)
        );

        if (!isMounted) return; // Evitar updates si el componente se desmontó

        // 🆕 Cargar citas guardadas del cuaderno para esta lectura
        const remoteCitations = (() => {
          const source = progress?.savedCitations;
          if (Array.isArray(source)) return source;
          if (source && typeof source === 'object') {
            const byCurrent = source[currentTextoId];
            if (Array.isArray(byCurrent)) return byCurrent;
          }
          return [];
        })();

        if (Array.isArray(remoteCitations)) {
          setSavedCitations(prevLocal => {
            const local = Array.isArray(prevLocal[currentTextoId]) ? prevLocal[currentTextoId] : [];
            const remoteLen = remoteCitations.length;
            const localLen = local.length;
            const remoteMaxTs = remoteCitations.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);
            const localMaxTs = local.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);

            // Aplicar datos remotos si: tienen más items, o son más recientes (incluyendo eliminaciones)
            const shouldApply = remoteLen > localLen
              || (remoteLen === localLen && remoteMaxTs > localMaxTs)
              || (remoteLen < localLen && remoteMaxTs > localMaxTs);
            if (!shouldApply) return prevLocal;

            lastSavedCitationsFromCloudAtRef.current = Date.now();

            return {
              ...prevLocal,
              [currentTextoId]: remoteCitations
            };
          });
        }

        // 🔄 DETECTAR RESET: Si lastResetAt existe, limpiar datos locales
        if (progress?.lastResetAt) {
          const resetTime = progress.lastResetAt?.seconds
            ? progress.lastResetAt.seconds * 1000
            : (typeof progress.lastResetAt === 'number' ? progress.lastResetAt : 0);

          if (resetTime > 0) {
            logger.log('🔄 [AppContext] Reset detectado en Firestore, limpiando localStorage...');

            // Limpiar localStorage de rubricProgress
            const rubricKey = rubricProgressKey(currentUser.uid, currentTextoId, sourceCourseIdRef.current);
            localStorage.removeItem(rubricKey);

            // Limpiar localStorage de activitiesProgress
            const activitiesKey = activitiesProgressKey(
              currentUser.uid,
              currentTextoId,
              resolveProgressCourseScope(currentTextoId, sourceCourseIdRef.current)
            );
            localStorage.removeItem(activitiesKey);

            // 🔧 CRITICAL FIX: También limpiar el firestore_backup_* para evitar restauración zombie
            try {
              const backupKey = `firestore_backup_${currentUser.uid}_${resolveProgressLocalScopeKey(currentTextoId, sourceCourseIdRef.current)}`;
              localStorage.removeItem(backupKey);
              logger.log('🧹 [AppContext] firestore_backup limpiado tras reset inicial');
            } catch (e) {
              // Silencioso
            }

            // Limpiar cualquier key de activity_results_ relacionada
            Object.keys(localStorage).forEach(k => {
              if (isActivityStorageKeyForLecture(k, currentTextoId, sourceCourseIdRef.current)) {
                localStorage.removeItem(k);
                logger.log('🧹 [AppContext] Limpiado localStorage key:', k);
              }
            });

            // Aplicar datos de Firestore (reseteados) directamente
            if (progress.rubricProgress) {
              setRubricProgress(normalizeRubricProgress(progress.rubricProgress));
              logger.log('✅ [AppContext] rubricProgress reemplazado tras reset');
            } else {
              setRubricProgress(emptyRubricProgress);
            }
            return;
          }
        }

        if (progress?.rubricProgress && Object.keys(progress.rubricProgress).length > 0) {
          // 🔄 También verificar si alguna rúbrica individual tiene resetAt
          const anyResetAt = Object.values(progress.rubricProgress).some(r => r?.resetAt);

          if (anyResetAt) {
            logger.log('🔄 [AppContext] Reset de rúbrica detectado, reemplazando datos');
            const rubricKey = rubricProgressKey(currentUser.uid, currentTextoId, sourceCourseIdRef.current);
            localStorage.removeItem(rubricKey);
            setRubricProgress(normalizeRubricProgress(progress.rubricProgress));
            return;
          }

          // Tiene progreso guardado en Firestore para ESTA lectura específica
          // 🛡️ REEMPLAZAR (no merge) - los datos de Firestore son la fuente de verdad
          // El useEffect anterior ya cargó datos locales; si cloud tiene datos más completos, usarlos
          setRubricProgress(prevLocal => {
            const normalizedCloud = normalizeRubricProgress(progress.rubricProgress);
            const normalizedLocal = normalizeRubricProgress(prevLocal);
            // Comparar: si cloud tiene más datos o es más reciente, usar cloud
            const cloudHasData = Object.keys(normalizedCloud).some(k =>
              (normalizedCloud[k]?.scores?.length || normalizedCloud[k]?.formative?.scores?.length || 0) > 0
            );
            const localHasData = Object.keys(normalizedLocal).some(k =>
              (normalizedLocal[k]?.scores?.length || normalizedLocal[k]?.formative?.scores?.length || 0) > 0
            );

            // Si solo cloud tiene datos, usar cloud
            if (cloudHasData && !localHasData) {
              logger.log('✅ [AppContext] rubricProgress cargado desde Firestore (cloud tiene datos, local vacío)');
              return normalizedCloud;
            }

            // Si ambos tienen datos, hacer merge por timestamp
            if (cloudHasData && localHasData) {
              const merged = createEmptyRubricProgressV2();
              const allKeys = new Set([...Object.keys(normalizedLocal), ...Object.keys(normalizedCloud)]);

              allKeys.forEach(rubricKey => {
                const cloudRubric = normalizedCloud[rubricKey];
                const localRubric = normalizedLocal[rubricKey];

                // 🔧 FIX: Si cloud tiene resetAt, SIEMPRE usar cloud (fue reseteado por docente)
                if (cloudRubric?.resetAt) {
                  logger.log(`🔄 [AppContext] Rúbrica ${rubricKey} reseteada por docente, usando datos del cloud`);
                  merged[rubricKey] = cloudRubric;
                  return;
                }

                const cloudTime = cloudRubric?.lastUpdate || 0;
                const localTime = localRubric?.lastUpdate || 0;

                if (cloudTime > localTime && cloudRubric?.scores?.length) {
                  merged[rubricKey] = cloudRubric;
                } else if (localRubric?.scores?.length) {
                  merged[rubricKey] = localRubric;
                } else if (cloudRubric?.scores?.length) {
                  merged[rubricKey] = cloudRubric;
                }

                // 🏆 SIEMPRE preservar teacherOverrideScore del cloud (el docente es la fuente de verdad)
                if (cloudRubric?.teacherOverrideScore > 0) {
                  if (!merged[rubricKey]) merged[rubricKey] = localRubric || cloudRubric || {};
                  merged[rubricKey] = {
                    ...merged[rubricKey],
                    teacherOverrideScore: cloudRubric.teacherOverrideScore,
                    average: cloudRubric.teacherOverrideScore,
                  };
                }
              });

              logger.log('✅ [AppContext] rubricProgress MERGED (cloud+local) para texto:', currentTextoId);
              return normalizeRubricProgress(merged);
            }

            // Si solo local tiene datos, mantener local
            logger.log('ℹ️ [AppContext] Manteniendo datos locales (cloud vacío)');
            return normalizedLocal;
          });
        } else {
          // 🛡️ FIX CROSS-COURSE: Sin progreso en Firestore → limpiar estado para evitar herencia del curso anterior
          logger.log('ℹ️ [AppContext] Sin progreso en Firestore para este texto/curso, reseteando:', currentTextoId);
          setRubricProgress(emptyRubricProgress);
        }
      } catch (error) {
        logger.error('❌ [AppContext] Error cargando rubricProgress desde Firestore:', error);
        // En caso de error, mantener estado actual
        logger.log('⚠️ [AppContext] Error de Firestore, manteniendo estado actual');
      }
    };

    loadProgressForText();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [currentTextoId, currentUser, emptyRubricProgress, sourceCourseId, resolveProgressCourseScope, resolveProgressLocalScopeKey, isActivityStorageKeyForLecture]);

  // 🆕 CITAS GUARDADAS: Sistema de citas seleccionadas manualmente por el estudiante
  const [savedCitations, setSavedCitations] = useState({});

  // Cargar savedCitations específico del usuario
  useEffect(() => {
    if (!currentUser?.uid) {
      setSavedCitations({});
      return;
    }

    if (disableLocalProgressMirror || useFirestorePersistenceHook) {
      // Cloud-first: evitar espejo local por-usuario; las citas se persistirán vía sesión/cloud.
      setSavedCitations({});
      return;
    }

    const key = `savedCitations_${currentUser.uid}_${progressLocalKey}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setSavedCitations(parsed);
          return;
        }
      } catch (e) {
        logger.warn('⚠️ Error cargando savedCitations (scoped):', e);
      }
    }

    // Compatibilidad: solo en modo libre, intentar key legacy por usuario.
    if (!sourceCourseId) {
      try {
        const legacyKey = `savedCitations_${currentUser.uid}`;
        const legacyRaw = localStorage.getItem(legacyKey);
        const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (legacyParsed && typeof legacyParsed === 'object') {
          // Cargar únicamente citas del texto activo para evitar contaminación.
          if (currentTextoId && Array.isArray(legacyParsed[currentTextoId])) {
            setSavedCitations({ [currentTextoId]: legacyParsed[currentTextoId] });
          } else {
            setSavedCitations({});
          }
          return;
        }
      } catch (e) {
        logger.warn('⚠️ Error cargando savedCitations legacy:', e);
      }
    }

    setSavedCitations({});
  }, [currentUser, disableLocalProgressMirror, useFirestorePersistenceHook, progressLocalKey, sourceCourseId, currentTextoId]);

  // Persistir citas guardadas cuando cambien (con namespace)
  useEffect(() => {
    if (currentUser?.uid && !disableLocalProgressMirror && !useFirestorePersistenceHook) {
      const key = `savedCitations_${currentUser.uid}_${progressLocalKey}`;
      const hasCitations = currentTextoId && Array.isArray(savedCitations[currentTextoId]) && savedCitations[currentTextoId].length > 0;

      if (!hasCitations && currentTextoId && currentTextoId !== 'global_progress') {
        // 🛡️ FIX: Limpiar localStorage si se eliminaron todas las citas (delete/clear)
        // Evita que citas eliminadas reaparezcan tras recargar la página.
        try {
          const existing = localStorage.getItem(key);
          if (existing) {
            const parsed = JSON.parse(existing);
            if (parsed && parsed[currentTextoId]) {
              delete parsed[currentTextoId];
              if (Object.keys(parsed).length === 0) {
                localStorage.removeItem(key);
              } else {
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            }
          }
        } catch { /* ignore */ }
        return;
      }

      const scopedCitations = (() => {
        if (!currentTextoId || currentTextoId === 'global_progress') return savedCitations;
        const scoped = {};
        if (Array.isArray(savedCitations[currentTextoId])) {
          scoped[currentTextoId] = savedCitations[currentTextoId];
        }
        return scoped;
      })();
      localStorage.setItem(key, JSON.stringify(scopedCitations));
    }
  }, [savedCitations, currentUser, disableLocalProgressMirror, useFirestorePersistenceHook, progressLocalKey, currentTextoId]);

  // 🆕 FASE 2 FIX: Migración automática de claves legacy (documentId/substr) -> currentTextoId
  // Objetivo: que citas y actividades queden aisladas por lectura (textoId) sin perder datos existentes.
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!currentTextoId) return;

    const legacyIds = new Set();

    const analysisDocId = completeAnalysis?.metadata?.document_id || completeAnalysis?.prelecture?.metadata?.document_id;
    if (analysisDocId) legacyIds.add(analysisDocId);

    if (texto) {
      const fallback = `doc_${texto.substring(0, 50).replace(/\s+/g, '_')}`;
      legacyIds.add(fallback);
    }

    // Nunca migrar desde el mismo id
    legacyIds.delete(currentTextoId);

    const legacyList = Array.from(legacyIds).filter(Boolean);
    if (legacyList.length === 0) return;

    // Migrar CITAS
    setSavedCitations(prev => {
      let changed = false;
      const next = { ...prev };
      const current = Array.isArray(next[currentTextoId]) ? next[currentTextoId] : (next[currentTextoId] || []);
      const merged = Array.isArray(current) ? [...current] : [];

      for (const legacyId of legacyList) {
        const legacyCitations = next[legacyId];
        if (!Array.isArray(legacyCitations) || legacyCitations.length === 0) continue;

        // Merge con dedupe por texto (primeros 50 chars) para evitar duplicados
        const existing = new Set(merged.map(c => (c?.texto || '').substring(0, 50)));
        for (const c of legacyCitations) {
          const sig = (c?.texto || '').substring(0, 50);
          if (!sig) continue;
          if (existing.has(sig)) continue;
          merged.push(c);
          existing.add(sig);
        }

        delete next[legacyId];
        changed = true;
      }

      if (changed) {
        next[currentTextoId] = merged;
        logger.log('♻️ [AppContext] Migradas citas legacy -> textoId:', { currentTextoId, migratedFrom: legacyList });
        return next;
      }

      return prev;
    });

    // Migrar ACTIVIDADES
    setActivitiesProgress(prev => {
      let changed = false;
      const next = { ...prev };
      const current = next[currentTextoId] || {};
      let merged = { ...current };

      for (const legacyId of legacyList) {
        const legacyDoc = next[legacyId];
        if (!legacyDoc || typeof legacyDoc !== 'object') continue;

        merged = {
          ...legacyDoc,
          ...merged,
          preparation: {
            ...(legacyDoc.preparation || {}),
            ...(merged.preparation || {})
          },
          artifacts: {
            ...(legacyDoc.artifacts || {}),
            ...(merged.artifacts || {})
          }
        };

        delete next[legacyId];
        changed = true;
      }

      if (changed) {
        next[currentTextoId] = merged;
        logger.log('♻️ [AppContext] Migrado activitiesProgress legacy -> textoId:', { currentTextoId, migratedFrom: legacyList });
        return next;
      }

      return prev;
    });
  }, [currentUser, currentTextoId, completeAnalysis, texto]);

  // 🆕 ACTIVIDADES: Progreso de preparación y artefactos por documento
  const [activitiesProgress, setActivitiesProgress] = useState({});

  // ============================================================
  // Etapas 1-2: useFirestorePersistence (leer/suscribir + writer único bajo flag)
  // IMPORTANTE: este bloque debe ir DESPUÉS de rubricProgress/activitiesProgress para evitar TDZ.
  // ============================================================

  // Aplicar/mergear progreso remoto en el estado local, reusando las mismas reglas que el listener legacy.
  const applyRemoteStudentProgress = useCallback((progressData, { isInitial } = { isInitial: false }) => {
    if (!progressData) return;

    const currentDocId = (
      progressData?.textoId && progressData.textoId !== 'global_progress'
        ? progressData.textoId
        : (currentTextoIdRef.current || 'global_progress')
    );

    // 🔄 DETECTAR RESET: Si Firestore tiene lastResetAt, verificar si es más reciente
    const remoteResetAt = progressData.lastResetAt?.seconds
      ? progressData.lastResetAt.seconds * 1000
      : (typeof progressData.lastResetAt === 'number' ? progressData.lastResetAt : 0);

    const hasRecentReset = remoteResetAt > 0;

    if (hasRecentReset) {
      logger.log('🔄 [AppContext] Detectado RESET desde Firestore, timestamp:', new Date(remoteResetAt).toISOString());
    }

    const getArtifactsStats = (docProgress) => {
      const artifacts = docProgress?.artifacts || {};
      let submittedCount = 0;
      let latestSubmittedAt = 0;

      Object.values(artifacts).forEach((a) => {
        if (a?.submitted) {
          submittedCount += 1;
          latestSubmittedAt = Math.max(latestSubmittedAt, a.submittedAt || 0);
        }
      });

      return { submittedCount, latestSubmittedAt };
    };

    if (isInitial) {
      if (progressData.rubricProgress && Object.keys(progressData.rubricProgress).length > 0) {
        const normalizedRemote = normalizeRubricProgress(progressData.rubricProgress);
        setRubricProgress(prevLocal => {
          const normalizedLocal = normalizeRubricProgress(prevLocal);
          // 🔄 Si hay reset reciente, REEMPLAZAR datos locales con Firestore
          if (hasRecentReset) {
            const anyLocalHasData = Object.values(normalizedLocal).some(r => (r?.scores?.length || r?.formative?.scores?.length || 0) > 0);
            if (anyLocalHasData) {
              logger.log('🔄 [AppContext] Reset detectado - reemplazando rubricProgress local con Firestore');
              lastRubricProgressFromCloudAtRef.current = Date.now();
              return normalizedRemote;
            }
          }

          const mergedRubrics = { ...normalizedLocal };
          let hasChanges = false;

          Object.keys(normalizedRemote).forEach(rubricId => {
            const remoteRubric = normalizedRemote[rubricId];
            const localRubric = normalizedLocal[rubricId];

            // 🔄 Si esta rúbrica tiene resetAt, reemplazar
            if (remoteRubric?.resetAt) {
              const resetTime = new Date(remoteRubric.resetAt).getTime();
              const localTime = localRubric?.lastUpdate || 0;
              if (resetTime > localTime) {
                logger.log(`🔄 [AppContext] Rúbrica ${rubricId} reseteada, reemplazando`);
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                return;
              }
            }

            if (!localRubric || !localRubric.lastUpdate) {
              mergedRubrics[rubricId] = remoteRubric;
              hasChanges = true;
              return;
            }

            const remoteAvg = remoteRubric?.average || 0;
            const localAvg = localRubric?.average || 0;
            const remoteTimestamp = remoteRubric?.lastUpdate || 0;
            const localTimestamp = localRubric?.lastUpdate || 0;
            const remoteScoresLen = Array.isArray(remoteRubric?.scores) ? remoteRubric.scores.length : 0;
            const localScoresLen = Array.isArray(localRubric?.scores) ? localRubric.scores.length : 0;

            if (remoteScoresLen > localScoresLen) {
              mergedRubrics[rubricId] = remoteRubric;
              hasChanges = true;
            } else if (remoteScoresLen === localScoresLen && remoteAvg > localAvg) {
              mergedRubrics[rubricId] = remoteRubric;
              hasChanges = true;
            } else if (remoteScoresLen === localScoresLen && remoteAvg === localAvg && remoteTimestamp > localTimestamp) {
              mergedRubrics[rubricId] = remoteRubric;
              hasChanges = true;
            }
          });

          if (hasChanges) {
            lastRubricProgressFromCloudAtRef.current = Date.now();
            return normalizeRubricProgress(mergedRubrics);
          }

          return normalizedLocal;
        });
      }

      if (progressData.activitiesProgress && Object.keys(progressData.activitiesProgress).length > 0) {
        setActivitiesProgress(prevLocal => {
          const mergedActivities = { ...prevLocal };
          let hasChanges = false;

          Object.keys(progressData.activitiesProgress).forEach(docId => {
            const remoteDoc = progressData.activitiesProgress[docId];
            const localDoc = prevLocal[docId];

            // 🔄 Detectar reset en artefactos - PRIORIDAD A DATOS REMOTOS SI HAY RESET
            const remoteArtifacts = remoteDoc?.artifacts || {};
            const anyArtifactReset = Object.values(remoteArtifacts).some(a => a?.resetBy === 'docente');

            if (anyArtifactReset || hasRecentReset) {
              // 🆕 SIEMPRE usar datos remotos si hay resetBy='docente' en cualquier artefacto
              // El docente tiene autoridad para resetear, así que sus datos tienen prioridad
              logger.log(`🔄 [AppContext] Reset detectado en artifacts de ${docId}, usando datos remotos`);
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
              return;
            }

            if (!localDoc || !localDoc.preparation?.updatedAt) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
              return;
            }

            const remoteTimestamp = remoteDoc.preparation?.updatedAt || 0;
            const localTimestamp = localDoc.preparation?.updatedAt || 0;
            const remoteCompleteness = Object.keys(remoteDoc.preparation || {}).length;
            const localCompleteness = Object.keys(localDoc.preparation || {}).length;

            const remoteArtifactsStats = getArtifactsStats(remoteDoc);
            const localArtifactsStats = getArtifactsStats(localDoc);

            if (remoteArtifactsStats.submittedCount > localArtifactsStats.submittedCount) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
            } else if (remoteArtifactsStats.submittedCount === localArtifactsStats.submittedCount && remoteCompleteness > localCompleteness) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
            } else if (remoteArtifactsStats.submittedCount === localArtifactsStats.submittedCount && remoteCompleteness === localCompleteness) {
              const remoteTs = Math.max(remoteTimestamp, remoteArtifactsStats.latestSubmittedAt);
              const localTs = Math.max(localTimestamp, localArtifactsStats.latestSubmittedAt);
              if (remoteTs > localTs) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
              }
            }
          });

          if (hasChanges) {
            lastActivitiesProgressFromCloudAtRef.current = Date.now();
            return mergedActivities;
          }

          return prevLocal;
        });
      }

      if (progressData.savedCitations && currentDocId !== 'global_progress') {
        const remote = Array.isArray(progressData.savedCitations)
          ? progressData.savedCitations
          : (progressData.savedCitations?.[currentDocId] || []);

        if (Array.isArray(remote)) {
          setSavedCitations(prevLocal => {
            const local = Array.isArray(prevLocal[currentDocId]) ? prevLocal[currentDocId] : [];
            const remoteLen = remote.length;
            const localLen = local.length;
            const remoteMaxTs = remote.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);
            const localMaxTs = local.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);

            // Aplicar datos remotos si: tienen más items, o son más recientes (incluyendo eliminaciones)
            const shouldApply = remoteLen > localLen
              || (remoteLen === localLen && remoteMaxTs > localMaxTs)
              || (remoteLen < localLen && remoteMaxTs > localMaxTs);
            if (!shouldApply) return prevLocal;

            lastSavedCitationsFromCloudAtRef.current = Date.now();
            return {
              ...prevLocal,
              [currentDocId]: remote
            };
          });
        }
      }

      return;
    }

    if (progressData.rubricProgress) {
      setRubricProgress(prevLocal => {
        const normalizedRemote = normalizeRubricProgress(progressData.rubricProgress);
        const normalizedLocal = normalizeRubricProgress(prevLocal);
        const mergedRubrics = { ...normalizedLocal };
        let hasChanges = false;

        Object.keys(normalizedRemote).forEach(rubricId => {
          const remoteRubric = normalizedRemote[rubricId];
          const localRubric = normalizedLocal[rubricId];

          if (!localRubric || !localRubric.scores || localRubric.scores.length === 0) {
            mergedRubrics[rubricId] = remoteRubric;
            hasChanges = true;
            return;
          }

          const localScores = localRubric.scores || [];
          const remoteScores = remoteRubric.scores || [];
          const localTimestamps = new Set(localScores.map(s => s.timestamp));
          const newRemoteScores = remoteScores.filter(s => !localTimestamps.has(s.timestamp));

          if (newRemoteScores.length > 0) {
            const combinedScores = [...localScores, ...newRemoteScores]
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            const recentScores = combinedScores.slice(-3);
            const newAverage = recentScores.length > 0
              ? Math.round((recentScores.reduce((sum, s) => sum + (s.score || 0), 0) / recentScores.length) * 10) / 10
              : 0;

            const combinedArtefactos = [...new Set([
              ...(localRubric.artefactos || []),
              ...(remoteRubric.artefactos || [])
            ])];

            mergedRubrics[rubricId] = {
              scores: combinedScores,
              average: newAverage,
              lastUpdate: Math.max(localRubric.lastUpdate || 0, remoteRubric.lastUpdate || 0),
              artefactos: combinedArtefactos
            };

            hasChanges = true;
          }
        });

        if (hasChanges) {
          lastRubricProgressFromCloudAtRef.current = Date.now();
          window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
            detail: { type: 'rubricProgress', timestamp: Date.now() }
          }));
          return normalizeRubricProgress(mergedRubrics);
        }

        return normalizedLocal;
      });
    }

    if (progressData.activitiesProgress) {
      setActivitiesProgress(prevLocal => {
        const mergedActivities = { ...prevLocal };
        let hasChanges = false;

        Object.keys(progressData.activitiesProgress).forEach(docId => {
          const remoteDoc = progressData.activitiesProgress[docId];
          const localDoc = prevLocal[docId];

          if (!localDoc || !localDoc.preparation?.updatedAt) {
            mergedActivities[docId] = remoteDoc;
            hasChanges = true;
            return;
          }

          const remoteTimestamp = remoteDoc.preparation?.updatedAt || 0;
          const localTimestamp = localDoc.preparation?.updatedAt || 0;
          const remoteCompleteness = Object.keys(remoteDoc.preparation || {}).length;
          const localCompleteness = Object.keys(localDoc.preparation || {}).length;

          const remoteArtifacts = getArtifactsStats(remoteDoc);
          const localArtifacts = getArtifactsStats(localDoc);

          if (remoteArtifacts.submittedCount > localArtifacts.submittedCount) {
            mergedActivities[docId] = remoteDoc;
            hasChanges = true;
          } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness > localCompleteness) {
            mergedActivities[docId] = remoteDoc;
            hasChanges = true;
          } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness === localCompleteness) {
            const remoteTs = Math.max(remoteTimestamp, remoteArtifacts.latestSubmittedAt);
            const localTs = Math.max(localTimestamp, localArtifacts.latestSubmittedAt);
            if (remoteTs > localTs) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
            }
          } else {
            const remoteTs = Math.max(remoteTimestamp, remoteArtifacts.latestSubmittedAt);
            const localTs = Math.max(localTimestamp, localArtifacts.latestSubmittedAt);
            if (remoteTs > localTs) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
            } else if (remoteTs === localTs && remoteTimestamp > localTimestamp) {
              mergedActivities[docId] = remoteDoc;
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          lastActivitiesProgressFromCloudAtRef.current = Date.now();
          window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
            detail: { type: 'activitiesProgress', timestamp: Date.now() }
          }));
          return mergedActivities;
        }

        return prevLocal;
      });
    }

    if (progressData.savedCitations && currentDocId !== 'global_progress') {
      const remote = Array.isArray(progressData.savedCitations)
        ? progressData.savedCitations
        : (progressData.savedCitations?.[currentDocId] || []);

      if (Array.isArray(remote)) {
        setSavedCitations(prevLocal => {
          const local = Array.isArray(prevLocal[currentDocId]) ? prevLocal[currentDocId] : [];
          const remoteLen = remote.length;
          const localLen = local.length;
          const remoteMaxTs = remote.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);
          const localMaxTs = local.reduce((m, c) => Math.max(m, c?.timestamp || 0), 0);

          const shouldApply = remoteLen > localLen || (remoteLen === localLen && remoteMaxTs > localMaxTs);
          if (!shouldApply) return prevLocal;

          lastSavedCitationsFromCloudAtRef.current = Date.now();
          window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
            detail: { type: 'savedCitations', timestamp: Date.now() }
          }));

          return {
            ...prevLocal,
            [currentDocId]: remote
          };
        });
      }
    }
  }, []);

  // Hook de persistencia (writer único bajo flag)
  const hookProgressEnabled = Boolean(useFirestorePersistenceHook && currentUser?.uid && isStudent);

  useEffect(() => {
    progressHookHasAppliedInitialRef.current = false;
  }, [currentUser?.uid, progressDocId, hookProgressEnabled, sourceCourseId]);

  const { save: saveProgressViaHook, loading: progressHookLoading } = useFirestorePersistence(
    progressDocId,
    { rubricProgress, activitiesProgress, savedCitations, sourceCourseId },
    {
      enabled: hookProgressEnabled,
      autoSave: false,
      courseId: sourceCourseId,  // 🔧 FIX CROSS-COURSE: Pasar courseId para doc scoping
      onRehydrate: (remoteData) => {
        const isInitial = !progressHookHasAppliedInitialRef.current;
        progressHookHasAppliedInitialRef.current = true;
        applyRemoteStudentProgress(remoteData, { isInitial });

        if (typeof window !== 'undefined') {
          window.__firebaseUserLoading = false;
        }
      }
    }
  );

  useEffect(() => {
    if (!useFirestorePersistenceHook) return;
    if (!currentUser?.uid || !isStudent) return;
    if (typeof window === 'undefined') return;

    window.__firebaseUserLoading = Boolean(progressHookLoading);
  }, [useFirestorePersistenceHook, progressHookLoading, currentUser, isStudent]);

  // Cargar activitiesProgress específico del usuario
  useEffect(() => {
    if (!currentUser?.uid) {
      setActivitiesProgress({});
      return;
    }

    if (disableLocalProgressMirror || useFirestorePersistenceHook) {
      // Cloud-first: rehidratación desde Firestore; localStorage queda como airbag vía firestore_backup_*.
      setActivitiesProgress({});
      return;
    }

    const scopedCourseId = resolveProgressCourseScope(progressDocId, sourceCourseId);
    const key = activitiesProgressKey(currentUser.uid, progressDocId, scopedCourseId);
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setActivitiesProgress(parsed);
          return;
        }
      } catch (error) {
        logger.warn('⚠️ Error cargando activitiesProgress (scoped):', error);
      }
    }

    // Compatibilidad: solo en modo libre, intentar key legacy por usuario.
    if (!sourceCourseId) {
      try {
        const legacyRaw = localStorage.getItem(activitiesProgressKey(currentUser.uid));
        const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (legacyParsed && typeof legacyParsed === 'object') {
          const subset = {};
          ['index', 'general', progressDocId].forEach((docKey) => {
            if (Object.prototype.hasOwnProperty.call(legacyParsed, docKey)) {
              subset[docKey] = legacyParsed[docKey];
            }
          });
          setActivitiesProgress(Object.keys(subset).length > 0 ? subset : {});
          return;
        }
      } catch (error) {
        logger.warn('⚠️ Error cargando activitiesProgress legacy:', error);
      }
    }

    setActivitiesProgress({});
  }, [currentUser, disableLocalProgressMirror, useFirestorePersistenceHook, progressDocId, sourceCourseId, resolveProgressCourseScope]);

  // 🔄 Migración automática de datos antiguos (una sola vez)
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (disableLocalProgressMirror || useFirestorePersistenceHook) return;
    if (sourceCourseId) return; // solo aplica para migrar modo libre legacy

    const migrationFlagKey = activitiesProgressMigratedKey(currentUser.uid);
    const migrationFlag = localStorage.getItem(migrationFlagKey);
    if (!migrationFlag) {
      import('../utils/migrateActivityData').then(({ migrateActivityDataToContext }) => {
        const result = migrateActivityDataToContext({ storageKey: activitiesProgressKey(currentUser.uid) });
        if (result.migrated > 0) {
          logger.log(`✅ [Migration] ${result.migrated} documentos migrados a activitiesProgress`);
          activitiesProgressLocalDirtyRef.current = true;
          setActivitiesProgress(result.data);
          localStorage.setItem(migrationFlagKey, 'true');
        } else {
          localStorage.setItem(migrationFlagKey, 'true');
        }
      }).catch(err => {
        logger.warn('⚠️ [Migration] Error importando migración:', err);
      });
    }
  }, [currentUser, disableLocalProgressMirror, useFirestorePersistenceHook, sourceCourseId]);

  useEffect(() => {
    if (currentUser?.uid && !disableLocalProgressMirror && !useFirestorePersistenceHook) {
      // 🛡️ FIX CROSS-COURSE: usar sourceCourseId como valor (no ref) para que la clave sea consistente con el ciclo de render
      const scopedCourseId = resolveProgressCourseScope(progressDocId, sourceCourseId);
      const key = activitiesProgressKey(currentUser.uid, progressDocId, scopedCourseId);
      // 🛡️ GUARDIA: No persistir si activitiesProgress está vacío (evita copiar datos del curso anterior con clave nueva)
      if (!activitiesProgress || typeof activitiesProgress !== 'object' || Object.keys(activitiesProgress).length === 0) {
        return;
      }
      const scopedActivities = (() => {
        const scoped = {};
        ['index', 'general', progressDocId].forEach((docKey) => {
          if (Object.prototype.hasOwnProperty.call(activitiesProgress, docKey)) {
            scoped[docKey] = activitiesProgress[docKey];
          }
        });
        return scoped;
      })();
      localStorage.setItem(key, JSON.stringify(scopedActivities));
    }
  }, [activitiesProgress, currentUser, disableLocalProgressMirror, useFirestorePersistenceHook, progressDocId, sourceCourseId, resolveProgressCourseScope]);

  // Helper centralizado para sincronizar progreso global (solo estudiantes)
  const saveGlobalProgress = useCallback(async (payload, options = {}) => {
    if (!currentUser?.uid || !isStudent) {
      return false;
    }

    // 🧩 REGLA: rewardsState SIEMPRE es global (no por lectura)
    const hasRewardsState = Object.prototype.hasOwnProperty.call(payload || {}, 'rewardsState') && !!payload?.rewardsState;
    const { rewardsState, ...payloadWithoutRewards } = payload || {};

    let rewardsSaved = true;
    if (hasRewardsState) {
      try {
        logger.log('📤 [saveGlobalProgress] Guardando rewardsState en global_progress...');
        const rewardsPayload = {
          rewardsState,
          // Mantener metadata útil para debugging
          lastSync: payload?.lastSync || new Date().toISOString(),
          syncType: payload?.syncType || 'rewards_only',
          sourceCourseId: null,
          userId: payload?.userId || currentUser.uid
        };

        await saveStudentProgress(currentUser.uid, 'global_progress', rewardsPayload);
        logger.log('✅ [saveGlobalProgress] rewardsState guardado exitosamente');

        // Airbag local (último estado conocido)
        writeFirestoreBackupMerged(currentUser.uid, 'global_progress', rewardsPayload);
      } catch (error) {
        rewardsSaved = false;
        logger.error('❌ [AppContext] Error guardando rewardsState (global_progress):', error);
      }
    }

    // 🆕 CRÍTICO: Evitar 'global_progress' si hay un textoId válido en el contexto
    // Prioridad: options.textoId > currentTextoId > WARNING (no guardar invisible)
    let targetTextoId = options.textoId;

    if (!targetTextoId || targetTextoId === 'global_progress') {
      // Intentar usar currentTextoId del contexto
      if (currentTextoId && currentTextoId !== 'global_progress') {
        targetTextoId = currentTextoId;
        logger.log('💡 [AppContext] Usando currentTextoId del contexto:', targetTextoId);
      } else {
        // FALLBACK: Usar 'global_progress' pero loguear warning
        targetTextoId = 'global_progress';
        logger.warn('⚠️ [AppContext] Guardando progreso sin textoId específico (global_progress). Este progreso no será visible para el docente.');
      }
    }

    // Si solo venía rewardsState, ya se guardó arriba
    const hasOtherData = Object.keys(payloadWithoutRewards || {}).length > 0;
    if (!hasOtherData) {
      return rewardsSaved;
    }

    // 🛡️ Compactar activitiesProgress para evitar commits gigantes en Firestore
    const compactedPayload = (() => {
      if (!payloadWithoutRewards || typeof payloadWithoutRewards !== 'object') return payloadWithoutRewards;
      if (!Object.prototype.hasOwnProperty.call(payloadWithoutRewards, 'activitiesProgress')) return payloadWithoutRewards;

      const ap = payloadWithoutRewards.activitiesProgress;
      if (!ap || typeof ap !== 'object') return payloadWithoutRewards;

      const scoped = {};
      ['index', 'general', targetTextoId].forEach((key) => {
        if (key && Object.prototype.hasOwnProperty.call(ap, key)) {
          scoped[key] = ap[key];
        }
      });

      return {
        ...payloadWithoutRewards,
        activitiesProgress: Object.keys(scoped).length > 0 ? scoped : ap
      };
    })();

    const scopedPayload = (() => {
      if (!compactedPayload || typeof compactedPayload !== 'object') return compactedPayload;
      if (targetTextoId === 'global_progress') {
        return {
          ...compactedPayload,
          sourceCourseId: null
        };
      }
      return {
        ...compactedPayload,
        sourceCourseId: compactedPayload.sourceCourseId
          ?? resolveProgressCourseScope(targetTextoId, sourceCourseId)
      };
    })();

    try {
      // Etapa 2: si el hook está activo y el write es para el doc de progreso actual,
      // usar SIEMPRE el writer del hook (evita escrituras residuales por rutas legacy).
      if (
        useFirestorePersistenceHook &&
        typeof saveProgressViaHook === 'function' &&
        targetTextoId === progressDocId
      ) {
        const ok = await saveProgressViaHook(scopedPayload);
        return Boolean(rewardsSaved && ok !== false);
      }

      await saveStudentProgress(currentUser.uid, targetTextoId, scopedPayload);

      // Airbag local (merge para soportar writes incrementales, p.ej. una sola rúbrica)
      // 🔧 FIX CROSS-COURSE: usar la misma clave local efectiva del scope de escritura.
      const backupScopeKey = resolveProgressLocalScopeKey(
        targetTextoId,
        scopedPayload?.sourceCourseId ?? sourceCourseId
      );
      writeFirestoreBackupMerged(currentUser.uid, backupScopeKey, scopedPayload);
      return rewardsSaved;
    } catch (error) {
      logger.error('❌ [AppContext] Error guardando progreso por lectura:', error);
      return false;
    }
  }, [currentUser, isStudent, currentTextoId, sourceCourseId, writeFirestoreBackupMerged, useFirestorePersistenceHook, saveProgressViaHook, progressDocId, resolveProgressCourseScope, resolveProgressLocalScopeKey]);

  // 🆕 MIGRACIÓN FIRESTORE: si en el pasado se guardó progreso bajo document_id (legacy),
  // mover/mergear automáticamente al textoId canónico para que persista recarga y se vea en docente.
  useEffect(() => {
    if (!currentUser?.uid || !isStudent || !currentTextoId) return;

    const legacyDocId = completeAnalysis?.metadata?.document_id || completeAnalysis?.prelecture?.metadata?.document_id;
    if (!legacyDocId || legacyDocId === currentTextoId) return;

    const migrationKey = `${currentUser.uid}:${legacyDocId}->${currentTextoId}`;
    if (legacyProgressMigratedRef.current.has(migrationKey)) return;

    let cancelled = false;

    const pickBetterArtifact = (currentArtifact, legacyArtifact) => {
      if (!currentArtifact) return legacyArtifact;
      if (!legacyArtifact) return currentArtifact;

      const currentSubmitted = Boolean(currentArtifact.submitted);
      const legacySubmitted = Boolean(legacyArtifact.submitted);
      const currentAttempts = Number(currentArtifact.attempts || 0);
      const legacyAttempts = Number(legacyArtifact.attempts || 0);
      const currentSubmittedAt = Number(currentArtifact.submittedAt || 0);
      const legacySubmittedAt = Number(legacyArtifact.submittedAt || 0);

      if (legacySubmitted && !currentSubmitted) return { ...currentArtifact, ...legacyArtifact };
      if (legacyAttempts > currentAttempts) return { ...currentArtifact, ...legacyArtifact };
      if (legacySubmittedAt > currentSubmittedAt) return { ...currentArtifact, ...legacyArtifact };

      return currentArtifact;
    };

    const mergeActivityDoc = (currentDoc = {}, legacyDoc = {}) => {
      const currentArtifacts = currentDoc?.artifacts || {};
      const legacyArtifacts = legacyDoc?.artifacts || {};
      const artifactKeys = new Set([...Object.keys(currentArtifacts), ...Object.keys(legacyArtifacts)]);
      const mergedArtifacts = {};

      artifactKeys.forEach((artifactKey) => {
        mergedArtifacts[artifactKey] = pickBetterArtifact(currentArtifacts[artifactKey], legacyArtifacts[artifactKey]);
      });

      return {
        ...legacyDoc,
        ...currentDoc,
        preparation: {
          ...(legacyDoc?.preparation || {}),
          ...(currentDoc?.preparation || {}),
          updatedAt: Math.max(
            Number(legacyDoc?.preparation?.updatedAt || 0),
            Number(currentDoc?.preparation?.updatedAt || 0)
          )
        },
        artifacts: mergedArtifacts
      };
    };

    (async () => {
      try {
        const legacyScopeCourseId = sourceCourseId || (legacyDocId ? `free::${legacyDocId}` : null);
        let legacyProgress = await getStudentProgress(currentUser.uid, legacyDocId, legacyScopeCourseId);
        // Compatibilidad con datos históricos totalmente legacy (sin sourceCourseId).
        // Solo aplica cuando no hay curso explícito en el contexto actual.
        if ((!legacyProgress || typeof legacyProgress !== 'object') && !sourceCourseId) {
          legacyProgress = await getStudentProgress(currentUser.uid, legacyDocId, null);
        }
        if (cancelled) return;

        if (!legacyProgress || typeof legacyProgress !== 'object') {
          legacyProgressMigratedRef.current.add(migrationKey);
          return;
        }

        const ap = legacyProgress.activitiesProgress;
        let legacyActivityDoc = null;

        if (ap?.[legacyDocId]) {
          legacyActivityDoc = ap[legacyDocId];
        } else if (ap?.[currentTextoId]) {
          legacyActivityDoc = ap[currentTextoId];
        } else if (ap?.artifacts || ap?.preparation) {
          legacyActivityDoc = ap;
        } else if (ap && typeof ap === 'object') {
          for (const key of Object.keys(ap)) {
            if (ap?.[key]?.artifacts) {
              legacyActivityDoc = ap[key];
              break;
            }
          }
        }

        const legacySavedCitations = (() => {
          const source = legacyProgress?.savedCitations;
          if (Array.isArray(source)) return source;
          if (source && typeof source === 'object') {
            if (Array.isArray(source[currentTextoId])) return source[currentTextoId];
            if (Array.isArray(source[legacyDocId])) return source[legacyDocId];
          }
          return [];
        })();

        const hasLegacyArtifacts = Boolean(legacyActivityDoc?.artifacts && Object.keys(legacyActivityDoc.artifacts).length > 0);
        const hasLegacyCitations = Array.isArray(legacySavedCitations) && legacySavedCitations.length > 0;

        if (!hasLegacyArtifacts && !hasLegacyCitations) {
          legacyProgressMigratedRef.current.add(migrationKey);
          return;
        }

        // Fallback defensivo: evitar payload null si React difiere la ejecución del updater.
        let mergedForWrite = hasLegacyArtifacts ? mergeActivityDoc({}, legacyActivityDoc) : null;
        let mergedCitationsForWrite = hasLegacyCitations ? legacySavedCitations : [];

        if (hasLegacyArtifacts) {
          lastActivitiesProgressFromCloudAtRef.current = Date.now();
          setActivitiesProgress((prev) => {
            const currentDoc = prev?.[currentTextoId] || {};
            const mergedDoc = mergeActivityDoc(currentDoc, legacyActivityDoc);
            mergedForWrite = mergedDoc;

            return {
              ...prev,
              [currentTextoId]: mergedDoc
            };
          });
        }

        if (hasLegacyCitations) {
          lastSavedCitationsFromCloudAtRef.current = Date.now();
          setSavedCitations((prev) => {
            const current = Array.isArray(prev?.[currentTextoId]) ? prev[currentTextoId] : [];
            const merged = [...current];
            const existing = new Set(merged.map((c) => `${c?.id || ''}:${(c?.texto || '').substring(0, 50)}`));

            for (const c of legacySavedCitations) {
              const sig = `${c?.id || ''}:${(c?.texto || '').substring(0, 50)}`;
              if (!sig || existing.has(sig)) continue;
              merged.push(c);
              existing.add(sig);
            }

            mergedCitationsForWrite = merged;
            return {
              ...prev,
              [currentTextoId]: merged
            };
          });
        }

        // Persistir explícitamente en el doc canónico del texto (visible para docente)
        const migrationPayload = {
          sourceCourseId,
          syncType: 'legacy_docid_migration'
        };

        if (hasLegacyArtifacts && mergedForWrite) {
          migrationPayload.activitiesProgress = {
            [currentTextoId]: mergedForWrite
          };
        }

        if (hasLegacyCitations) {
          migrationPayload.savedCitations = mergedCitationsForWrite;
        }

        await saveGlobalProgress(migrationPayload, { textoId: currentTextoId });

        if (!cancelled) {
          lastActivitiesTouchedTextoIdRef.current = currentTextoId;
          if (hasLegacyCitations) {
            lastSavedCitationsTouchedTextoIdRef.current = currentTextoId;
          }
          legacyProgressMigratedRef.current.add(migrationKey);
          logger.log('♻️ [AppContext] Migración Firestore legacy completada:', {
            legacyDocId,
            currentTextoId,
            artifacts: Object.keys(mergedForWrite?.artifacts || {}),
            citations: hasLegacyCitations ? mergedCitationsForWrite.length : 0
          });
        }
      } catch (error) {
        logger.warn('⚠️ [AppContext] Error en migración Firestore legacy:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isStudent, currentTextoId, completeAnalysis, saveGlobalProgress, sourceCourseId]);

  // OPTIMIZADO: Función para guardar la API key, envuelta en useCallback para estabilidad
  const handleApiKeyChange = useCallback((key) => {
    setOpenAIApiKey(key);
    // Guardar con clave scopeada si hay usuario, legacy como fallback
    const storageKey = currentUserUid ? `openai_api_key:${currentUserUid}` : 'openai_api_key';
    if (key) {
      localStorage.setItem(storageKey, key);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [currentUserUid]);

  // OPTIMIZADO: Función para cambiar y persistir el modo oscuro.
  const toggleModoOscuro = useCallback(() => {
    setModoOscuro(prevModo => {
      const nuevoModo = !prevModo;
      localStorage.setItem('modoOscuro', JSON.stringify(nuevoModo));
      return nuevoModo;
    });
  }, []);

  // OPTIMIZADO: Funciones adicionales estables
  const setLoadingStable = useCallback((newLoading) => {
    setLoading(newLoading);
  }, []);

  const setErrorStable = useCallback((newError) => {
    setError(newError);
  }, []);

  // Setter estable para archivo actual
  const setArchivoActualStable = useCallback((archivo) => {
    const normalizedFile = archivo || null;
    setArchivoActual(normalizedFile);

    // Mantener activeLecture sincronizado con metadata de archivo para restauraciones futuras
    if (normalizedFile && typeof normalizedFile === 'object') {
      setActiveLecture(prev => ({
        ...prev,
        fileName: normalizedFile.name || normalizedFile.fileName || prev.fileName || null,
        fileType: normalizedFile.type || normalizedFile.fileType || prev.fileType || null,
        fileURL: normalizedFile.fileURL || normalizedFile.url || prev.fileURL || null,
        lastModified: Date.now()
      }));
    }
  }, []);

  // NUEVO: Setter estable para estructura del texto
  const setTextStructureStable = useCallback((structure) => {
    logger.log('📐 AppContext - Estableciendo estructura del texto:', structure);
    setTextStructure(structure || null);
  }, []);

  // 🆕 FUNCIÓN PARA ACTUALIZAR PROGRESO DE RÚBRICAS
  const updateRubricScore = useCallback((rubricId, scoreData) => {
    logger.log(`📊 [updateRubricScore] Actualizando ${rubricId}:`, scoreData);

    // 🛡️ Preferir un textoId explícito si el caller lo provee (p.ej. lectureId)
    const textoIdForSync =
      scoreData?.textoId ||
      scoreData?.textId ||
      scoreData?.documentId ||
      scoreData?.document_id ||
      null;

    setRubricProgress(prev => {
      const normalizedPrev = normalizeRubricProgress(prev);

      // Validar que la rúbrica existe, si no, usar estructura por defecto
      const rubrica = normalizedPrev[rubricId] || {
        ...createEmptyRubricProgressV2().rubrica1,
        formative: createEmptyFormative()
      };

      // Agregar nuevo score con metadata
      const newScoreEntry = {
        score: scoreData.score || scoreData.scoreGlobal || scoreData.nivel || 0,
        nivel: scoreData.nivel || Math.round((scoreData.score || scoreData.scoreGlobal || 0) / 2.5),
        artefacto: scoreData.artefacto || scoreData.source || 'unknown',
        timestamp: Date.now(),
        criterios: scoreData.criterios || scoreData.criteriosEvaluados || null
      };

      const newScores = [...(rubrica.scores || []), newScoreEntry];

      // Calcular promedio solo con scores de artefactos reales (excluir PracticaGuiada)
      const artifactOnlyScores = newScores.filter(s => s.artefacto !== 'PracticaGuiada');
      const recentScores = artifactOnlyScores.slice(-3);
      const average = recentScores.length > 0
        ? recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length
        : 0;

      // Registrar artefactos únicos
      const artefactosSet = new Set([...(rubrica.artefactos || []), newScoreEntry.artefacto]);

      const updatedRubrica = {
        ...rubrica,
        formative: {
          ...(rubrica.formative || createEmptyFormative()),
          scores: newScores,
          average: Math.round(average * 10) / 10,
          attempts: newScores.length,
          lastUpdate: Date.now(),
          artefactos: Array.from(artefactosSet)
        },
        // Compatibilidad legacy (espejo)
        scores: newScores,
        average: Math.round(average * 10) / 10,
        lastUpdate: Date.now(),
        artefactos: Array.from(artefactosSet)
      };

      logger.log(`✅ [updateRubricScore] ${rubricId} actualizada. Promedio: ${updatedRubrica.average}/10`);

      // Disparar eventos de rewards para dimensiones (activar eventos huérfanos)
      try {
        const engine = typeof window !== 'undefined' ? window.__rewardsEngine : null;
        if (engine && newScoreEntry.artefacto !== 'PracticaGuiada') {
          // DIMENSION_UNLOCKED: primera vez que se evalúa un artefacto en esta dimensión
          const prevArtifactScores = (rubrica.scores || []).filter(s => s.artefacto !== 'PracticaGuiada');
          if (prevArtifactScores.length === 0) {
            engine.recordEvent('DIMENSION_UNLOCKED', {
              rubricId,
              artefacto: newScoreEntry.artefacto,
              resourceId: `dim_unlock:${rubricId}`
            });
          }

          // DIMENSION_COMPLETED: promedio >= 6 con al menos 2 evaluaciones de artefactos
          if (average >= 6 && artifactOnlyScores.length >= 2) {
            engine.recordEvent('DIMENSION_COMPLETED', {
              rubricId,
              average: updatedRubrica.average,
              resourceId: `dim_complete:${rubricId}`
            });
          }
        }
      } catch (_e) {
        // no bloquear actualización de rúbrica por rewards
      }

      // DISPARAR EVENTO para sincronización optimizada
      window.dispatchEvent(new CustomEvent('artifact-evaluated', {
        detail: {
          rubricId,
          score: newScoreEntry.score,
          average: updatedRubrica.average,
          artefacto: newScoreEntry.artefacto,
          textoIdForSync,
          // 🛡️ Importante: pasar la rúbrica ya actualizada para evitar
          // sincronizar con `rubricProgress[rubricId]` todavía desfasado.
          rubricProgressOverride: { [rubricId]: updatedRubrica }
        }
      }));

      return {
        ...normalizedPrev,
        [rubricId]: updatedRubrica
      };
    });
  }, []);

  // 🆕 Sprint 1: API explícita para evaluación FORMATIVA (alias compatible)
  const updateFormativeScore = useCallback((rubricId, scoreData) => {
    return updateRubricScore(rubricId, scoreData);
  }, [updateRubricScore]);

  // 🆕 Sprint 1: Validación de prerequisitos para Ensayo Integrador
  const checkEssayPrerequisites = useCallback((options = {}) => {
    const minScoreEach = Number.isFinite(options?.minScoreEach) ? Number(options.minScoreEach) : 5.0;
    const normalized = normalizeRubricProgress(rubricProgress);

    const base = checkEssayPrerequisitesFromProgress(normalized);
    const scores = (base.details || []).map((d) => {
      const avg = Number(normalized?.[d.rubricId]?.formative?.average ?? normalized?.[d.rubricId]?.average ?? 0) || 0;
      const passing = avg >= minScoreEach;
      return { ...d, average: avg, passing };
    });

    const allPassingScore = scores.every(s => s.passing);

    return {
      ...base,
      minScoreEach,
      allPassingScore,
      canAccess: Boolean(base.canAccess && allPassingScore),
      scores
    };
  }, [rubricProgress]);

  // 🆕 Sprint 1: Registro de Ensayo Integrador (SUMATIVO) en la rúbrica seleccionada
  const submitSummativeEssay = useCallback((rubricId, essayData = {}) => {
    logger.log(`📝 [submitSummativeEssay] Registrando ensayo sumativo para ${rubricId}`);

    const textoIdForSync =
      essayData?.textoId ||
      essayData?.textId ||
      essayData?.documentId ||
      essayData?.document_id ||
      currentTextoId ||
      null;

    setRubricProgress((prev) => {
      const normalizedPrev = normalizeRubricProgress(prev);
      const current = normalizedPrev[rubricId];
      if (!current) return normalizedPrev;

      if (!current.summative) {
        logger.warn(`⚠️ [submitSummativeEssay] ${rubricId} no soporta sumativo (probablemente rubrica5)`);
        return normalizedPrev;
      }

      const now = Date.now();
      const isDraft = essayData.status === 'draft';
      const rawScore = essayData.score ?? essayData.finalScore ?? essayData.scoreGlobal ?? null;
      const score = rawScore == null ? null : Number(rawScore);
      const nivel =
        essayData.nivel != null
          ? Number(essayData.nivel)
          : (Number.isFinite(score) ? Math.round(score / 2.5) : null);

      // 🆕 Para borradores: preservar datos existentes de envío/calificación
      const submittedAt = isDraft
        ? (current.summative?.submittedAt || null)
        : (Number(essayData.submittedAt ?? current.summative?.submittedAt ?? now) || now);
      const gradedAt = isDraft
        ? (current.summative?.gradedAt || null)
        : (Number(essayData.gradedAt ?? current.summative?.gradedAt ?? (score != null ? now : null)) || null);
      const status = essayData.status || (score != null ? 'graded' : 'submitted');

      // 🆕 Para borradores: NO incrementar intentos ni cambiar revisión
      const nextAttemptsUsed = isDraft
        ? Number(current.summative?.attemptsUsed || 0)
        : Math.max(Number(current.summative?.attemptsUsed || 0), Number(essayData.attemptsUsed || 1));
      const shouldEnableRevision = isDraft
        ? Boolean(current.summative?.allowRevision || false)
        : (essayData.allowRevision !== undefined
          ? Boolean(essayData.allowRevision)
          : (nextAttemptsUsed === 1 && score != null) || Boolean(current.summative?.allowRevision));

      // 🆕 Para borradores: guardar en draftContent sin tocar essayContent (la versión calificada)
      const nextSummative = isDraft
        ? {
          ...(current.summative || {}),
          draftContent: essayData.essayContent || essayData.draftContent || current.summative?.draftContent || null,
          draftDimension: essayData.dimension || current.summative?.draftDimension || null,
          draftSavedAt: now,
          // Preservar todos los campos calificados existentes
          score: current.summative?.score ?? null,
          nivel: current.summative?.nivel ?? null,
          status: current.summative?.status === 'graded' ? 'graded' : 'draft',
          submittedAt,
          gradedAt,
          attemptsUsed: nextAttemptsUsed,
          allowRevision: shouldEnableRevision,
        }
        : {
          ...(current.summative || {}),
          ...essayData,
          score,
          nivel,
          status,
          submittedAt,
          gradedAt,
          attemptsUsed: nextAttemptsUsed,
          allowRevision: shouldEnableRevision,
          // Limpiar borrador al enviar oficialmente
          draftContent: null,
          draftDimension: null,
          draftSavedAt: null,
        };

      const finalScore = score != null ? score : (current.finalScore != null ? Number(current.finalScore) : null);
      const certified = Number.isFinite(finalScore) ? finalScore >= 6 : Boolean(current.certified);

      const updatedRubrica = {
        ...current,
        summative: nextSummative,
        finalScore,
        completionDate: submittedAt,
        certified,
        // Mantener compat legacy espejo (formativo)
        scores: current.scores,
        average: current.average,
        lastUpdate: current.lastUpdate,
        artefactos: current.artefactos
      };

      if (isDraft) {
        // 🆕 Para borradores guardados en nube: disparar sync sin evaluar
        window.dispatchEvent(new CustomEvent('rubricProgress-draft-saved', {
          detail: {
            rubricId,
            artefacto: 'EnsayoIntegrador',
            textoIdForSync,
            rubricProgressOverride: { [rubricId]: updatedRubrica }
          }
        }));
      } else if (score != null) {
        window.dispatchEvent(new CustomEvent('artifact-evaluated', {
          detail: {
            rubricId,
            score,
            average: updatedRubrica.average,
            artefacto: 'EnsayoIntegrador',
            textoIdForSync,
            rubricProgressOverride: { [rubricId]: updatedRubrica }
          }
        }));
      }

      return {
        ...normalizedPrev,
        [rubricId]: updatedRubrica
      };
    });
  }, [currentTextoId]);

  // 🆕 FUNCIÓN PARA LIMPIAR PROGRESO DE UNA RÚBRICA
  const clearRubricProgress = useCallback((rubricId) => {
    logger.log(`🗑️ [clearRubricProgress] Limpiando ${rubricId}`);
    setRubricProgress(prev => {
      const normalizedPrev = normalizeRubricProgress(prev);
      const current = normalizedPrev[rubricId];
      if (!current) return normalizedPrev;

      const emptyFormative = createEmptyFormative();

      return {
        ...normalizedPrev,
        [rubricId]: {
          ...current,
          formative: emptyFormative,
          // Compat legacy
          scores: emptyFormative.scores,
          average: emptyFormative.average,
          lastUpdate: emptyFormative.lastUpdate,
          artefactos: emptyFormative.artefactos
        }
      };
    });
  }, []);

  // 🆕 FUNCIÓN PARA RESETEAR TODO EL PROGRESO
  const resetAllProgress = useCallback(async () => {
    logger.log('🗑️ [resetAllProgress] Reseteando todo el progreso de rúbricas');
    const emptyProgress = createEmptyRubricProgressV2();
    const targetTextoId = currentTextoId || null;

    try {
      if (currentUser?.uid && currentTextoId) {
        const result = await resetAllStudentArtifacts(currentUser.uid, currentTextoId, sourceCourseIdRef.current, 'estudiante');
        if (!result?.success) {
          logger.warn('⚠️ [resetAllProgress] Reset remoto incompleto:', result?.message);
          return false;
        }

        logger.log('✅ [resetAllProgress] Reset persistido en Firestore');
        localStorage.removeItem(rubricProgressKey(currentUser.uid, currentTextoId, sourceCourseIdRef.current));
        localStorage.removeItem(activitiesProgressKey(
          currentUser.uid,
          currentTextoId,
          resolveProgressCourseScope(currentTextoId, sourceCourseIdRef.current)
        ));
      }

      setRubricProgress(emptyProgress);
      if (targetTextoId) {
        setActivitiesProgress(prev => ({
          ...prev,
          [targetTextoId]: {
            ...(prev?.[targetTextoId] || {}),
            artifacts: {}
          }
        }));
      }

      return true;
    } catch (error) {
      logger.warn('⚠️ [resetAllProgress] Error sincronizando reset completo:', error);
      return false;
    }
  }, [currentUser?.uid, currentTextoId, resolveProgressCourseScope]);

  // 🆕 FUNCIÓN PARA GUARDAR UNA CITA (llamada desde Lectura Guiada)
  const saveCitation = useCallback((citation) => {
    logger.log('💾 [saveCitation] Guardando entrada:', citation);

    const { documentId, texto, nota = '', tipo = 'cita' } = citation;
    const targetId = currentTextoId || documentId;

    // Las reflexiones/comentarios requieren mínimo 5 chars, las citas textuales mínimo 10
    const minLength = tipo === 'cita' ? 10 : 5;
    if (!targetId || !texto || texto.trim().length < minLength) {
      logger.warn(`⚠️ [saveCitation] Entrada inválida (requiere textoId/documentId y texto >${minLength} chars)`);
      return false;
    }

    savedCitationsLocalDirtyRef.current = true;
    lastSavedCitationsTouchedTextoIdRef.current = targetId;

    setSavedCitations(prev => {
      const docCitations = prev[targetId] || [];

      // Evitar duplicados (mismos primeros 50 caracteres + mismo tipo)
      const isDuplicate = docCitations.some(
        c => c.texto.substring(0, 50) === texto.substring(0, 50) && (c.tipo || 'cita') === tipo
      );

      if (isDuplicate) {
        logger.warn('⚠️ [saveCitation] Entrada duplicada, no se guardará');
        return prev;
      }

      const newCitation = {
        id: Date.now(),
        texto: texto.trim(),
        timestamp: Date.now(),
        nota: nota.trim(),
        tipo // 'cita' | 'reflexion' | 'comentario' | 'pregunta'
      };

      const updated = {
        ...prev,
        [targetId]: [...docCitations, newCitation]
      };

      logger.log(`✅ [saveCitation] Entrada guardada (${tipo}). Total para documento: ${updated[targetId].length}`);
      return updated;
    });

    return true;
  }, [currentTextoId]);

  // 🆕 FUNCIÓN PARA ELIMINAR UNA CITA
  const deleteCitation = useCallback((documentId, citationId) => {
    logger.log(`🗑️ [deleteCitation] Eliminando cita ${citationId} del documento ${documentId}`);

    savedCitationsLocalDirtyRef.current = true;
    if (documentId) {
      lastSavedCitationsTouchedTextoIdRef.current = documentId;
    }

    setSavedCitations(prev => {
      const docCitations = prev[documentId] || [];
      const filtered = docCitations.filter(c => c.id !== citationId);

      if (filtered.length === 0) {
        // Si no quedan citas, eliminar el documento del objeto
        const { [documentId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [documentId]: filtered
      };
    });
  }, []);

  // 🆕 FUNCIÓN PARA OBTENER CITAS DE UN DOCUMENTO
  const getCitations = useCallback((documentId) => {
    if (!documentId) return [];
    return savedCitations[documentId] || [];
  }, [savedCitations]);

  // 🆕 FUNCIÓN PARA LIMPIAR TODAS LAS CITAS DE UN DOCUMENTO
  const clearDocumentCitations = useCallback((documentId) => {
    logger.log(`🗑️ [clearDocumentCitations] Limpiando todas las citas del documento ${documentId}`);

    savedCitationsLocalDirtyRef.current = true;
    if (documentId) {
      lastSavedCitationsTouchedTextoIdRef.current = documentId;
    }

    setSavedCitations(prev => {
      const { [documentId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // 🆕 FUNCIONES DE PROGRESO DE ACTIVIDADES
  const updateActivitiesProgress = useCallback((documentId, updater) => {
    const targetId = currentTextoId || documentId;
    if (!targetId) return;

    // Marcar como cambio local (evita re-escrituras tras merges desde Firestore en modo cloud-first)
    activitiesProgressLocalDirtyRef.current = true;
    lastActivitiesTouchedTextoIdRef.current = targetId;

    setActivitiesProgress(prev => {
      const previous = prev[targetId] || {};
      const nextDocRaw = typeof updater === 'function' ? updater(previous) : updater;
      const now = Date.now();

      // 🛡️ Muchos merges tratan `preparation.updatedAt` como señal de “existe progreso”
      // (p.ej. cuando solo se actualiza `artifacts` en entregas). Aseguramos esta marca.
      const nextPreparation = {
        ...((nextDocRaw && typeof nextDocRaw === 'object' ? nextDocRaw.preparation : null) || (previous.preparation || {})),
        updatedAt: Math.max(
          ((nextDocRaw && typeof nextDocRaw === 'object' ? nextDocRaw.preparation?.updatedAt : null) || previous.preparation?.updatedAt || 0),
          now
        )
      };

      const nextDoc = {
        ...(nextDocRaw && typeof nextDocRaw === 'object' ? nextDocRaw : {}),
        preparation: nextPreparation
      };

      return {
        ...prev,
        [targetId]: {
          ...previous,
          ...nextDoc
        }
      };
    });
  }, [currentTextoId]);

  const markPreparationProgress = useCallback((documentId, payload) => {
    if (!documentId && !currentTextoId) return;
    const targetId = currentTextoId || documentId;
    updateActivitiesProgress(targetId, (previous = {}) => ({
      ...previous,
      preparation: {
        ...(previous.preparation || {}),
        ...payload,
        updatedAt: Date.now()
      }
    }));
  }, [updateActivitiesProgress]);

  const resetActivitiesProgress = useCallback((documentId) => {
    const targetId = currentTextoId || documentId;
    if (!targetId) return;

    activitiesProgressLocalDirtyRef.current = true;
    lastActivitiesTouchedTextoIdRef.current = targetId;

    setActivitiesProgress(prev => {
      const { [targetId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [currentTextoId]);

  // ==================== SINCRONIZACIÓN CON FIRESTORE ====================

  /**
   * Guarda el texto actual en Firestore (NO implementado aún - requiere estructura docente/estudiante)
   * Por ahora solo muestra log
   */
  const saveCurrentTextToFirestore = useCallback(async () => {
    if (!currentUser || !texto || texto.length < 100) {
      logger.log('⚠️ [Firestore] No se puede guardar: usuario no autenticado o texto muy corto');
      return null;
    }

    try {
      logger.log('💾 [Firestore] Texto disponible para guardar (función pendiente de implementación completa)');
      logger.log('📊 Longitud:', texto.length, 'palabras');

      // TODO: Implementar guardado con estructura docente → uploadTexto()
      // Por ahora solo registramos que está disponible

      return 'pending_implementation';

    } catch (error) {
      logger.error('❌ [Firestore] Error:', error);
      return null;
    }
  }, [currentUser, texto]);

  /**
   * Sincroniza el progreso de rúbricas con Firestore
   * OPTIMIZADO: Solo llamar cuando se completa un artefacto
   */
  const syncRubricProgressToFirestore = useCallback(async (rubricId = null) => {
    if (!currentUser || !userData?.role) return;

    try {
      logger.log('💾 [Firestore] Sincronizando progreso de rúbricas...', rubricId || 'todas');

      // Usar saveStudentProgress para estudiantes
      if (userData.role === 'estudiante') {
        const progressData = {
          rubricProgress: rubricId ? { [rubricId]: rubricProgress[rubricId] } : rubricProgress,
          sourceCourseId, // 🆕 CRÍTICO: Vincular con el curso
          lastSync: new Date().toISOString(),
          userId: currentUser.uid,
          syncType: rubricId ? 'incremental' : 'full'
        };

        if (useFirestorePersistenceHook && typeof saveProgressViaHook === 'function') {
          const ok = await saveProgressViaHook(progressData);
          // 🛡️ IMPORTANTE: el hook puede devolver false si aún no está habilitado/rehidratado.
          // En ese caso, hacemos fallback a guardado directo para garantizar persistencia tras logout/login.
          if (!ok) {
            const targetTextoId = currentTextoId || 'global_progress';
            await saveGlobalProgress(progressData, { textoId: targetTextoId });
          }
        } else {
          // 🆕 CRÍTICO: Usar el ID del texto actual para que el docente pueda verlo
          // Si no hay texto actual, se usa 'global_progress' (fallback)
          const targetTextoId = currentTextoId || 'global_progress';
          await saveGlobalProgress(progressData, { textoId: targetTextoId });
        }

        logger.log('✅ [Firestore] Progreso de estudiante sincronizado (rúbricas)');
        return true;
      } else {
        logger.log('ℹ️ [Firestore] Usuario docente - progreso no se sincroniza');
        return false;
      }

    } catch (error) {
      logger.error('❌ [Firestore] Error sincronizando progreso:', error);
      return false;
    }
  }, [currentUser, userData, rubricProgress, saveGlobalProgress, currentTextoId, sourceCourseId, useFirestorePersistenceHook, saveProgressViaHook]);

  /**
   * Guarda una evaluación completada en Firestore
   */
  const saveEvaluationToFirestore = useCallback(async (evaluationData) => {
    if (!currentUser) {
      logger.log('⚠️ [Firestore] No se puede guardar evaluación: usuario no autenticado');
      return null;
    }

    try {
      logger.log('💾 [Firestore] Guardando evaluación...');

      const evalData = {
        estudianteUid: currentUser.uid,
        estudianteNombre: userData?.nombre || currentUser.displayName || 'Usuario',
        textoId: evaluationData.textId || 'unknown',
        textoTitulo: evaluationData.textTitle || 'Sin título',
        respuestas: evaluationData.responses || [],
        puntajes: evaluationData.scores || {},
        puntajeTotal: evaluationData.totalScore || 0,
        rubricas: evaluationData.rubrics || [],
        feedback: evaluationData.feedback || '',
        // 🆕 CRÍTICO: Vincular evaluación con el curso
        sourceCourseId: sourceCourseId || null,
        timestamp: new Date()
      };

      const evalId = await saveEvaluacion(evalData);

      logger.log('✅ [Firestore] Evaluación guardada con ID:', evalId);
      return evalId;

    } catch (error) {
      logger.error('❌ [Firestore] Error guardando evaluación:', error);
      return null;
    }
  }, [currentUser, userData, saveGlobalProgress, sourceCourseId]);

  /**
   * Sincroniza citas guardadas con Firestore para el texto activo.
   */
  const syncCitationsToFirestore = useCallback(async () => {
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') return;

    const targetTextoId = currentTextoId || lastSavedCitationsTouchedTextoIdRef.current;
    if (!targetTextoId || targetTextoId === 'global_progress') return;

    const citationsForDoc = Array.isArray(savedCitations[targetTextoId]) ? savedCitations[targetTextoId] : [];
    if (citationsForDoc.length === 0 && Object.keys(savedCitations).length === 0) return;

    try {
      logger.log('💾 [Firestore] Sincronizando citas para texto:', targetTextoId, '- total:', citationsForDoc.length);

      const progressData = {
        savedCitations: citationsForDoc,
        sourceCourseId,
        lastSync: new Date().toISOString(),
        userId: currentUser.uid,
        syncType: 'citations_update'
      };

      await saveGlobalProgress(progressData, { textoId: targetTextoId });
      logger.log('✅ [Firestore] Citas sincronizadas exitosamente');
    } catch (error) {
      logger.error('❌ [Firestore] Error sincronizando citas:', error);
    }
  }, [currentUser, userData, savedCitations, currentTextoId, sourceCourseId, saveGlobalProgress]);

  // 🆕 OPTIMIZADO: Sincronizar rúbricas solo cuando se dispara evento de evaluación completa
  useEffect(() => {
    const handleArtifactCompleted = async (event) => {
      const { rubricId, score, rubricProgressOverride, textoIdForSync } = event.detail || {};

      if (rubricId && currentUser) {
        // 🔵 LOG DETALLADO para diagnóstico de persistencia
        const targetTextoId = textoIdForSync || currentTextoId || 'global_progress';
        logger.log(`📊 [AppContext] Artefacto completado:`, {
          rubricId,
          score,
          textoIdForSync,
          currentTextoId,
          targetTextoId,
          hasOverride: !!rubricProgressOverride,
          isStudent: userData?.role === 'estudiante',
          userId: currentUser.uid
        });

        // 🛡️ Si tenemos override, guardar directamente para evitar estado stale
        if (rubricProgressOverride && userData?.role === 'estudiante') {
          try {
            const progressData = {
              rubricProgress: rubricProgressOverride,
              sourceCourseId,
              lastSync: new Date().toISOString(),
              userId: currentUser.uid,
              syncType: 'incremental_override'
            };

            logger.log('🔵 [AppContext] Guardando progreso en Firestore:', {
              targetTextoId,
              rubricKeys: Object.keys(rubricProgressOverride),
              sourceCourseId
            });

            if (useFirestorePersistenceHook && typeof saveProgressViaHook === 'function') {
              const ok = await saveProgressViaHook(progressData);
              if (!ok) {
                await saveGlobalProgress(progressData, { textoId: targetTextoId });
              }
            } else {
              await saveGlobalProgress(progressData, { textoId: targetTextoId });
            }

            logger.log('✅ [AppContext] Rúbrica guardada (override) en:', targetTextoId);
          } catch (error) {
            logger.error('❌ [AppContext] Error guardando rúbrica (override):', error);
          }
          return;
        }

        // Fallback: sincronizar solo esta rúbrica específica INMEDIATAMENTE
        await syncRubricProgressToFirestore(rubricId);
      }
    };

    window.addEventListener('artifact-evaluated', handleArtifactCompleted);
    window.addEventListener('rubricProgress-draft-saved', handleArtifactCompleted);

    return () => {
      window.removeEventListener('artifact-evaluated', handleArtifactCompleted);
      window.removeEventListener('rubricProgress-draft-saved', handleArtifactCompleted);
    };
  }, [currentUser, currentTextoId, saveGlobalProgress, saveProgressViaHook, sourceCourseId, syncRubricProgressToFirestore, useFirestorePersistenceHook, userData?.role]);

  // 🆕 SINCRONIZAR rewardsState cuando cambia (tutor, actividades, etc.)
  useEffect(() => {
    logger.log('🔍 [AppContext] useEffect rewards-state-changed check:', {
      uid: currentUser?.uid,
      role: userData?.role,
      isEstudiante: userData?.role === 'estudiante'
    });

    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') {
      logger.log('⏭️ [AppContext] Saltando registro de listener rewards-state-changed (no es estudiante o no hay user)');
      return;
    }

    logger.log('✅ [AppContext] Registrando listener rewards-state-changed');

    let debounceTimer = null;

    const flushPendingRewardsSync = () => {
      try {
        const currentRewardsState = window.__rewardsEngine?.exportState();
        if (!currentRewardsState) return;

        const progressData = {
          rewardsState: currentRewardsState,
          sourceCourseId, // 🆕 CRÍTICO: Vincular con el curso
          lastSync: new Date().toISOString(),
          userId: currentUser.uid,
          syncType: 'rewards_update_flush'
        };

        Promise.resolve(saveGlobalProgress(progressData))
          .then(() => {
            logger.log('✅ [AppContext] rewardsState flush sincronizado a Firestore');
          })
          .catch((error) => {
            logger.error('❌ [AppContext] Error en flush de rewardsState:', error);
          });
      } catch (error) {
        logger.error('❌ [AppContext] Error preparando flush de rewardsState:', error);
      }
    };

    const handleRewardsChanged = (event) => {
      const { totalPoints, availablePoints, forceSync, isReset } = event.detail || {};

      logger.log('🎯 [AppContext] rewards-state-changed recibido:', { totalPoints, availablePoints, forceSync, isReset });

      // 🆕 Si es un reset forzado, sincronizar INMEDIATAMENTE (bypass anti-loop y debounce)
      if (forceSync || isReset) {
        logger.log('🗑️ [AppContext] Reset de puntos detectado, sincronizando inmediatamente...');
        logger.log('🗑️ [AppContext] Usuario actual para reset:', currentUser?.uid);
        if (debounceTimer) clearTimeout(debounceTimer);

        // Sincronizar inmediatamente
        (async () => {
          try {
            const currentRewardsState = window.__rewardsEngine?.exportState();
            if (!currentRewardsState) return;

            logger.log('🗑️ [AppContext] Estado de rewards a guardar:', {
              totalPoints: currentRewardsState.totalPoints,
              resetAt: currentRewardsState.resetAt,
              userId: currentUser.uid
            });

            const progressData = {
              rewardsState: currentRewardsState,
              sourceCourseId,
              lastSync: new Date().toISOString(),
              userId: currentUser.uid,
              syncType: 'rewards_reset_forced'
            };

            logger.log('🗑️ [AppContext] Llamando saveGlobalProgress con uid:', currentUser.uid);
            await saveGlobalProgress(progressData);
            logger.log('✅ [AppContext] Reset de puntos sincronizado a Firestore para uid:', currentUser.uid);

            // Marcar como recién sincronizado desde local para evitar que el listener lo sobrescriba
            lastRewardsStateFromCloudAtRef.current = Date.now();
          } catch (error) {
            logger.error('❌ [AppContext] Error sincronizando reset:', error);
          }
        })();
        return;
      }

      // 🛡️ Evitar bucle: si este evento viene de una importación desde Firestore,
      // ignoramos durante un breve periodo para no re-escribir inmediatamente.
      const timeSinceCloudImport = Date.now() - (lastRewardsStateFromCloudAtRef.current || 0);
      if (timeSinceCloudImport < 2000) {
        logger.log('⏭️ [AppContext] Anti-loop activo, ignorando evento (hace ' + timeSinceCloudImport + 'ms)');
        return;
      }

      logger.log(`🎮 [AppContext] Puntos actualizados: ${totalPoints} pts (${availablePoints} disponibles)`);
      logger.log(`⏱️ [AppContext] Programando sync en 3 segundos...`);

      // Debounce de 3 segundos para evitar múltiples writes
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        logger.log('⏱️ [AppContext] Debounce completado, sincronizando...');
        try {
          const currentRewardsState = window.__rewardsEngine?.exportState();
          if (!currentRewardsState) {
            logger.log('⚠️ [AppContext] No hay rewardsState para sincronizar');
            return;
          }

          logger.log('📤 [AppContext] Enviando a Firestore:', {
            totalPoints: currentRewardsState.totalPoints,
            resetAt: currentRewardsState.resetAt,
            userId: currentUser.uid
          });

          const progressData = {
            rewardsState: currentRewardsState,
            sourceCourseId, // 🆕 CRÍTICO: Vincular con el curso
            lastSync: new Date().toISOString(),
            userId: currentUser.uid,
            syncType: 'rewards_update'
          };

          await saveGlobalProgress(progressData);
          logger.log('✅ [AppContext] rewardsState sincronizado a Firestore');
        } catch (error) {
          logger.error('❌ [AppContext] Error sincronizando rewardsState:', error);
        }
      }, 3000);
    };

    window.addEventListener('rewards-state-changed', handleRewardsChanged);

    return () => {
      window.removeEventListener('rewards-state-changed', handleRewardsChanged);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        // 🛡️ IMPORTANTE: si el usuario navega/cambia de lectura antes del debounce,
        // hacemos flush para no perder puntos recién ganados.
        flushPendingRewardsSync();
      }
    };
  }, [currentUser, userData, saveGlobalProgress, sourceCourseId]);

  // 🔄 SINCRONIZACIÓN INMEDIATA: Cuando cambia activitiesProgress, sincronizar a Firestore
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') {
      logger.log('⏭️ [AppContext] Sync skip: no user/role/estudiante');
      return;
    }

    // Cloud-first: sincronizar SOLO si el cambio fue local.
    // Evita re-escrituras cuando el estado cambia por merges desde Firestore.
    if (disableLocalProgressMirror && !activitiesProgressLocalDirtyRef.current) {
      logger.log('⏭️ [AppContext] Sync skip: cloud-first y no hay dirty local');
      return;
    }

    // Evitar sincronizar en la carga inicial (solo cuando hay cambios reales)
    const hasActivities = Object.keys(activitiesProgress).length > 0;
    if (!hasActivities) {
      logger.log('⏭️ [AppContext] Sync skip: no hay activitiesProgress');
      return;
    }

    // 🛡️ Evitar bucle: si este cambio viene de Firestore, no re-escribir inmediatamente
    // PERO: si el cambio fue LOCAL (dirty), siempre sincronizar sin importar el cooldown.
    // Caso crítico: al entregar un artefacto, el save de rubricProgress dispara un listener
    // que actualiza lastActivitiesProgressFromCloudAt, y el debounce de activitiesProgress
    // se salta si el cooldown es < 5s, perdiendo la entrega.
    const cloudTimeDiff = Date.now() - (lastActivitiesProgressFromCloudAtRef.current || 0);
    if (cloudTimeDiff < 5000 && !activitiesProgressLocalDirtyRef.current) {
      logger.log('⏭️ [AppContext] Sync skip: update reciente de cloud hace', cloudTimeDiff, 'ms');
      return;
    }

    logger.log('🔄 [AppContext] Programando sync de activitiesProgress en 2s...');

    // Debounce de 2 segundos para evitar múltiples writes
    const scheduledForTextoId = currentTextoId;

    const writeNow = () => {
      logger.log('💾 [AppContext] Sincronizando activitiesProgress a Firestore...');

      const targetTextoId = lastActivitiesTouchedTextoIdRef.current || currentTextoId || null;

      // 🛡️ Reducir payload: sincronizar solo el progreso relevante para el texto activo/tocado
      const scopedActivitiesProgress = (() => {
        if (!activitiesProgress || typeof activitiesProgress !== 'object') return activitiesProgress;
        if (!targetTextoId) return activitiesProgress;

        const scoped = {};
        ['index', 'general', targetTextoId].forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(activitiesProgress, key)) {
            scoped[key] = activitiesProgress[key];
          }
        });

        return Object.keys(scoped).length > 0 ? scoped : activitiesProgress;
      })();

      const progressData = {
        activitiesProgress: scopedActivitiesProgress,
        sourceCourseId, // 🆕 CRÍTICO: Vincular con el curso
        lastSync: new Date().toISOString(),
        userId: currentUser.uid,
        syncType: 'activities_update'
      };

      // Preferir writer del hook SOLO si el destino coincide con el doc actual.
      // Si el cambio fue sobre otro textoId (p.ej. usando document_id cuando currentTextoId es null),
      // enrutar por saveGlobalProgress con textoId explícito.
      const canUseHookWriter = Boolean(
        useFirestorePersistenceHook &&
        typeof saveProgressViaHook === 'function' &&
        targetTextoId &&
        targetTextoId === progressDocId
      );

      const writePromise = canUseHookWriter
        ? saveProgressViaHook(progressData)
        : saveGlobalProgress(progressData, { textoId: targetTextoId });

      Promise.resolve(writePromise)
        .then(() => {
          logger.log('✅ [AppContext] activitiesProgress sincronizado');

          // Cloud-first: limpiar dirty SOLO tras éxito.
          if (disableLocalProgressMirror) {
            activitiesProgressLocalDirtyRef.current = false;
          }
        })
        .catch(error => {
          logger.error('❌ [AppContext] Error sincronizando activitiesProgress:', error);
        });

    };

    const timeoutId = setTimeout(writeNow, 2000);

    return () => {
      // Si estamos cambiando de lectura o desmontando, hacemos flush del write pendiente.
      const isSwitchingTexto = currentTextoIdRef.current !== scheduledForTextoId;
      const isUnmounting = appUnmountingRef.current;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (isSwitchingTexto || isUnmounting) {
        // Solo flush si hay cambio local real (cloud-first) o si hay dirty (en general).
        if (activitiesProgressLocalDirtyRef.current) {
          writeNow();
        }
      }
    };
  }, [activitiesProgress, currentUser, userData, saveGlobalProgress, sourceCourseId, disableLocalProgressMirror, useFirestorePersistenceHook, saveProgressViaHook, currentTextoId, progressDocId]);

  // 🔄 SINCRONIZACIÓN DE CITAS: cuando cambia savedCitations, sincronizar a Firestore
  // Funciona en TODOS los modos (default + cloud-first) — igual que activitiesProgress.
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') return;

    // Cloud-first: sincronizar SOLO si el cambio fue local.
    if (disableLocalProgressMirror && !savedCitationsLocalDirtyRef.current) return;

    // 🛡️ Evitar bucle: si este cambio viene de Firestore, no re-escribir inmediatamente
    if (Date.now() - (lastSavedCitationsFromCloudAtRef.current || 0) < 5000) return;

    // Solo sincronizar si hay cambios reales (dirty ref o si hay citas)
    if (!savedCitationsLocalDirtyRef.current) return;

    const targetTextoId = (
      (currentTextoId && currentTextoId !== 'global_progress')
        ? currentTextoId
        : (lastSavedCitationsTouchedTextoIdRef.current || null)
    );

    if (!targetTextoId || targetTextoId === 'global_progress') return;

    const scheduledForTextoId = targetTextoId;
    const citationsForDoc = Array.isArray(savedCitations[targetTextoId]) ? savedCitations[targetTextoId] : [];

    logger.log('🔄 [AppContext] Programando sync de savedCitations en 1s para:', targetTextoId, '- total:', citationsForDoc.length);

    const writeNow = () => {
      const progressData = {
        savedCitations: citationsForDoc,
        sourceCourseId,
        lastSync: new Date().toISOString(),
        userId: currentUser.uid,
        syncType: 'citations_update'
      };

      // Preferir writer del hook SOLO si el destino coincide con el doc actual.
      const canUseHookWriter = Boolean(
        useFirestorePersistenceHook &&
        typeof saveProgressViaHook === 'function' &&
        targetTextoId === progressDocId
      );

      const writePromise = canUseHookWriter
        ? saveProgressViaHook(progressData)
        : saveGlobalProgress(progressData, { textoId: targetTextoId });

      Promise.resolve(writePromise)
        .then(() => {
          logger.log('✅ [AppContext] savedCitations sincronizado para:', targetTextoId);
          savedCitationsLocalDirtyRef.current = false;
        })
        .catch((error) => {
          logger.error('❌ [AppContext] Error sincronizando savedCitations:', error);
        });
    };

    const timeoutId = setTimeout(writeNow, 1000);

    return () => {
      const isSwitchingTexto = currentTextoIdRef.current !== scheduledForTextoId;
      const isUnmounting = appUnmountingRef.current;
      if (timeoutId) clearTimeout(timeoutId);
      if ((isSwitchingTexto || isUnmounting) && savedCitationsLocalDirtyRef.current) {
        writeNow();
      }
    };
  }, [savedCitations, currentUser, userData, currentTextoId, sourceCourseId, disableLocalProgressMirror, useFirestorePersistenceHook, saveProgressViaHook, progressDocId, saveGlobalProgress]);

  // 🔥 Establecer usuario actual en sessionManager cuando cambie
  useEffect(() => {
    if (currentUser?.uid) {
      setSessionManagerUser(currentUser.uid);
      logger.log('👤 [AppContext] Usuario establecido en SessionManager:', currentUser.uid);

      // 🆕 RACE CONDITION FIX: Sincronizar sesiones pendientes al reconectar
      // Opción A' (write-only): no sincronizar sesiones completas a cloud.
      if (!cloudBackupWriteOnly) {
        syncPendingSessions().then(({ synced, failed }) => {
          if (synced > 0 || failed > 0) {
            logger.log(`🔄 [AppContext] Pending syncs: ${synced} completadas, ${failed} fallidas`);
          }
        }).catch(err => {
          logger.warn('⚠️ [AppContext] Error sincronizando sesiones pendientes:', err);
        });
      } else {
        logger.log('☁️ [AppContext] cloudBackupWriteOnly activo: omitiendo syncPendingSessions');
      }

      // 🆕 P4 FIX: Auto-merge de sesiones cloud al login
      // Esto sincroniza las sesiones de Firestore con localStorage proactivamente
      if (!cloudBackupWriteOnly) {
        getAllSessionsMerged().then(mergedSessions => {
          if (mergedSessions.length > 0) {
            logger.log(`☁️ [AppContext] Sesiones sincronizadas desde cloud: ${mergedSessions.length}`);
          }
        }).catch(err => {
          logger.warn('⚠️ [AppContext] Error en auto-merge de sesiones:', err);
        });
      } else {
        logger.log('☁️ [AppContext] cloudBackupWriteOnly activo: omitiendo auto-merge de sesiones desde cloud');
      }
    } else {
      setSessionManagerUser(null);
      logger.log('👤 [AppContext] Usuario removido de SessionManager');
    }
  }, [currentUser, cloudBackupWriteOnly]);

  // ☁️ Opción A: backup silencioso de borradores (artifactsDrafts) a Firestore.
  // - Solo escribe a cloud.
  // - No crea/actualiza sesiones locales.
  // - Deduplica por hash y limita frecuencia.
  const lastDraftsBackupHashRef = useRef(null);
  const lastDraftsBackupAtRef = useRef(0);
  const draftsBackupInFlightRef = useRef(false);

  useEffect(() => {
    if (!cloudBackupWriteOnly) return;
    if (!currentUser?.uid) return;
    if (!currentTextoId || currentTextoId === 'global_progress') return;

    const fileName = archivoActual?.name || null;
    const fileType = archivoActual?.type || null;
    const fileURL = archivoActual?.fileURL || null;

    const intervalId = setInterval(() => {
      try {
        if (draftsBackupInFlightRef.current) return;

        const drafts = captureArtifactsDrafts(currentTextoId, sourceCourseId);
        const hash = simpleObjectHash(drafts);

        if (hash && hash === lastDraftsBackupHashRef.current) return;

        const now = Date.now();
        if (now - (lastDraftsBackupAtRef.current || 0) < 8000) return;

        draftsBackupInFlightRef.current = true;
        // setear hash optimistamente; si falla, lo limpiamos para permitir reintento
        lastDraftsBackupHashRef.current = hash;

        Promise.resolve(saveDraftBackupToCloudWriteOnly({
          textoId: currentTextoId,
          sourceCourseId,
          fileName,
          fileType,
          fileURL,
          artifactsDrafts: drafts
        }))
          .then((res) => {
            if (res?.ok) {
              lastDraftsBackupAtRef.current = Date.now();
            } else {
              // si no se guardó (ej: drafts vacíos), no “bloqueamos” futuros cambios
              if (res?.reason === 'empty-drafts') {
                lastDraftsBackupHashRef.current = null;
              }
            }
          })
          .catch((e) => {
            logger.warn('⚠️ [AppContext] Backup de borradores falló:', e?.message || e);
            lastDraftsBackupHashRef.current = null;
          })
          .finally(() => {
            draftsBackupInFlightRef.current = false;
          });
      } catch (e) {
        logger.warn('⚠️ [AppContext] Error en loop de backup de borradores:', e?.message || e);
      }
    }, 12000);

    return () => clearInterval(intervalId);
  }, [cloudBackupWriteOnly, currentUser?.uid, currentTextoId, sourceCourseId, archivoActual?.name, archivoActual?.type, archivoActual?.fileURL]);

  // 🆕 Reintentar sync de sesiones pendientes al recuperar conexión
  useEffect(() => {
    const handleOnline = () => {
      // Solo intentar si ya hay usuario configurado en SessionManager
      // Opción A' (write-only): no sincronizar sesiones completas a cloud.
      if (cloudBackupWriteOnly) return;

      syncPendingSessions().then(({ synced, failed }) => {
        if (synced > 0 || failed > 0) {
          logger.log(`🌐 [AppContext] Online: pending syncs ${synced} ok, ${failed} fallidas`);
        }
      }).catch(err => {
        logger.warn('⚠️ [AppContext] Error sincronizando pendientes al volver online:', err);
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [cloudBackupWriteOnly]);

  // 🆕 RACE CONDITION FIX: Registrar handler de beforeunload al montar
  useEffect(() => {
    setupBeforeUnloadSync();
  }, []);

  // 🆕 P9 FIX: Escuchar eventos de sincronización para actualizar UI
  useEffect(() => {
    const handleSyncError = (event) => {
      const { message, sessionId } = event.detail || {};
      logger.warn(`⚠️ [AppContext] Sync error para sesión ${sessionId}:`, message);
      setSyncStatus('error');

      // Resetear a 'idle' después de 10 segundos para permitir nuevos intentos
      setTimeout(() => setSyncStatus('idle'), 10000);
    };

    const handleStorageQuota = (event) => {
      const { message, sessionsRemaining } = event.detail || {};
      logger.warn(`⚠️ [AppContext] Storage quota warning:`, message, `(${sessionsRemaining} sesiones restantes)`);
    };

    window.addEventListener('sync-error', handleSyncError);
    window.addEventListener('storage-quota-warning', handleStorageQuota);

    return () => {
      window.removeEventListener('sync-error', handleSyncError);
      window.removeEventListener('storage-quota-warning', handleStorageQuota);
    };
  }, []);

  // ==================== FIN SINCRONIZACIÓN FIRESTORE ====================

  // 📚 FUNCIONES DE GESTIÓN DE SESIONES
  const createSession = useCallback(async () => {
    try {
      logger.log('🔵 [AppContext.createSession] Iniciando creación de sesión...');
      logger.log('🔵 [AppContext.createSession] Texto disponible:', !!texto, 'longitud:', texto?.length || 0);
      logger.log('🔵 [AppContext.createSession] Archivo actual:', archivoActual?.name || 'sin archivo');
      logger.log('🔵 [AppContext.createSession] currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');

      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado en sessionManager
      if (currentUser?.uid) {
        logger.log('👤 [AppContext.createSession] Configurando usuario en sessionManager:', currentUser.uid);
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      } else {
        logger.warn('⚠️ [AppContext.createSession] Sin usuario autenticado, sesión solo local');
      }

      if (!texto || texto.length === 0) {
        logger.warn('⚠️ [AppContext.createSession] No hay texto para guardar');
        return null;
      }

      const resolvedFileURL = archivoActual?.fileURL || activeLecture?.fileURL || null;
      const resolvedFileName = archivoActual?.name || activeLecture?.fileName || 'texto_manual';
      const resolvedFileType = archivoActual?.type || activeLecture?.fileType || 'text/plain';

      const normalizedArchivoActual = {
        ...(archivoActual || {}),
        name: resolvedFileName,
        type: resolvedFileType,
        fileURL: resolvedFileURL
      };

      const sessionData = {
        texto,
        currentTextoId, // 🆕
        sourceCourseId, // 🆕 CRÍTICO: ID del curso para sincronización
        archivoActual: normalizedArchivoActual,
        completeAnalysis,
        rubricProgress,
        savedCitations,
        activitiesProgress,
        modoOscuro
        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
        // Se sincroniza solo en global_progress (ver saveGlobalProgress)
      };

      logger.log('🔵 [AppContext.createSession] Llamando a createSessionFromState...');
      const session = createSessionFromState(sessionData, { syncToCloud: !cloudBackupWriteOnly });

      logger.log('✅ [AppContext.createSession] Sesión creada:', session?.id);

      // Emitir evento para actualizar UI
      window.dispatchEvent(new CustomEvent('session-updated'));

      return session;
    } catch (error) {
      logger.error('❌ [AppContext.createSession] Error:', error);
      logger.error('❌ [AppContext.createSession] Stack:', error.stack);
      return null;
    }
  }, [texto, archivoActual, activeLecture, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentTextoId, sourceCourseId, currentUser, userData]);

  // 🆕 NUEVA FUNCIÓN: Actualizar sesión actual con cambios
  const updateCurrentSessionFromState = useCallback(async () => {
    try {
      logger.log('💾 [AppContext.updateCurrentSession] Actualizando sesión actual...');

      // Verificar que hay una sesión activa
      const currentSessionId = getCurrentSessionId();
      if (!currentSessionId) {
        logger.warn('⚠️ [AppContext.updateCurrentSession] No hay sesión activa para actualizar');
        return null;
      }

      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado
      if (currentUser?.uid) {
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      }

      if (!texto || texto.length === 0) {
        logger.warn('⚠️ [AppContext.updateCurrentSession] No hay texto para guardar');
        return null;
      }

      // 🆕 FIX CRÍTICO: Verificar que la sesión pertenece al mismo textoId
      // Esto previene que el análisis de una lectura sobrescriba otra
      const allSessions = getAllSessions();
      const loadedSession = allSessions.find(s => s.id === currentSessionId);
      const sessionTextoId = loadedSession?.currentTextoId || loadedSession?.text?.metadata?.id || loadedSession?.text?.textoId;

      if (sessionTextoId && currentTextoId && sessionTextoId !== currentTextoId) {
        logger.warn('🚫 [AppContext.updateCurrentSession] ¡PREVINIENDO CONTAMINACIÓN!');
        logger.warn(`   Sesión actual es para textoId: ${sessionTextoId}`);
        logger.warn(`   Pero currentTextoId es: ${currentTextoId}`);
        logger.warn('   NO se actualizará para evitar sobrescribir análisis correcto');
        return null;
      }

      // Preparar datos actualizados
      const fileURL = archivoActual?.fileURL || activeLecture?.fileURL || null;
      const updates = {
        text: {
          id: currentTextoId, // 🆕
          content: texto,
          fileName: archivoActual?.name || 'texto_manual',
          fileType: archivoActual?.type || 'text/plain',
          fileURL,
          metadata: {
            id: currentTextoId,
            fileName: archivoActual?.name || 'texto_manual',
            fileType: archivoActual?.type || 'text/plain',
            fileURL,
            length: texto.length,
            words: texto.split(/\s+/).length
          }
        },
        sourceCourseId, // 🆕 CRÍTICO: Preservar ID del curso
        completeAnalysis,
        rubricProgress,
        savedCitations,
        activitiesProgress,
        // 🆕 CRÍTICO: Capturar borradores de artefactos desde sessionStorage
        artifactsDrafts: captureArtifactsDrafts(currentTextoId, sourceCourseId),
        settings: {
          modoOscuro
        }
        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
        // Se sincroniza solo en global_progress
      };

      const success = updateCurrentSession(updates, { syncToCloud: !cloudBackupWriteOnly });

      if (success) {
        logger.log('✅ [AppContext.updateCurrentSession] Sesión actualizada:', currentSessionId);
        // Emitir evento para actualizar UI
        window.dispatchEvent(new CustomEvent('session-updated'));
        return currentSessionId;
      } else {
        logger.error('❌ [AppContext.updateCurrentSession] Error actualizando sesión');
        return null;
      }
    } catch (error) {
      logger.error('❌ [AppContext.updateCurrentSession] Error:', error);
      return null;
    }
  }, [texto, archivoActual, activeLecture, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentTextoId, sourceCourseId, currentUser, userData, cloudBackupWriteOnly]);

  const restoreSession = useCallback(async (session) => {
    const restoreToken = `${session?.id || 'unknown'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    activeRestoreTokenRef.current = restoreToken;

    if (pdfRestoreAbortRef.current) {
      try {
        pdfRestoreAbortRef.current.abort();
      } catch { }
    }

    const restoreAbortController = new AbortController();
    pdfRestoreAbortRef.current = restoreAbortController;

    const isRestoreStillActive = () => activeRestoreTokenRef.current === restoreToken;
    const canApplyRestoreState = () => isRestoreStillActive() && getCurrentSessionId() === session?.id;
    const releaseRestoreLock = (reason = 'unknown') => {
      if (!isRestoreStillActive()) return;
      localStorage.removeItem('__restoring_session__');
      isRestoringRef.current = false;
      logger.log(`🔓 [AppContext] Auto-guardado re-habilitado (${reason})`);
    };

    try {
      // 🛡️ Activar flag de restauración para bloquear efectos secundarios (como limpieza de análisis)
      isRestoringRef.current = true;

      // 🔒 Deshabilitar auto-guardado temporalmente durante restauración
      const currentId = getCurrentSessionId();
      if (currentId) {
        logger.log('🔒 [AppContext] Deshabilitando auto-guardado durante restauración');
        localStorage.setItem('__restoring_session__', Date.now().toString());
      }

      const setters = {
        setTexto: setTextoWithDebug,
        setCompleteAnalysis,
        setRubricProgress: (data) => setRubricProgress(data),
        setSavedCitations: (data) => setSavedCitations(data),
        setActivitiesProgress: (data) => setActivitiesProgress(data),
        setCurrentTextoId: (id) => setCurrentTextoId(id), // 🆕 Restaurar ID del texto
        setSourceCourseId: (id) => setSourceCourseId(id), // 🆕 CRÍTICO: Restaurar ID del curso
        switchLecture // 🆕 CAMBIO ATÓMICO para restauración
      };

      const success = restoreSessionToState(session, setters);

      if (!isRestoreStillActive()) {
        logger.log('⏭️ [AppContext] Restauración obsoleta detectada, ignorando resultado.');
        return false;
      }

      if (success) {
        // ✅ Cerrar ventana de bloqueo de auto-guardado apenas se restaura el estado base.
        // La recuperación del PDF puede tardar; no debe bloquear el guardado de progreso.
        setTimeout(() => releaseRestoreLock('estado base restaurado'), 250);

        // 🆕 CRÍTICO: Si es un PDF con fileURL, descargar el archivo para poder mostrarlo
        const isPDF = session.text?.fileType === 'application/pdf' ||
          session.text?.fileName?.toLowerCase().endsWith('.pdf');
        let fileURL =
          session.text?.fileURL ||
          session.text?.metadata?.fileURL ||
          activeLecture?.fileURL ||
          archivoActual?.fileURL ||
          null;

        // 🆕 FALLBACK LOCAL: intentar recuperar fileURL desde otras sesiones del mismo texto
        if (isPDF && !fileURL) {
          try {
            const textoIdForLookup = session.currentTextoId || session.text?.metadata?.id || session.text?.textoId || null;
            const fileNameForLookup = session.text?.fileName || session.text?.metadata?.fileName || null;
            const candidates = getAllSessions();

            const match = candidates.find((candidate) => {
              const candidateFileURL = candidate?.text?.fileURL || candidate?.text?.metadata?.fileURL || null;
              if (!candidateFileURL) return false;

              const candidateTextoId = candidate?.currentTextoId || candidate?.text?.metadata?.id || candidate?.text?.textoId || null;
              if (textoIdForLookup && candidateTextoId && candidateTextoId === textoIdForLookup) {
                return true;
              }

              const candidateFileName = candidate?.text?.fileName || candidate?.text?.metadata?.fileName || null;
              if (!textoIdForLookup && fileNameForLookup && candidateFileName === fileNameForLookup) {
                return true;
              }

              return false;
            });

            if (match) {
              fileURL = match.text?.fileURL || match.text?.metadata?.fileURL || null;
              logger.log('✅ [AppContext] fileURL recuperada desde otra sesión local/cloud');
            }
          } catch (localRecoverError) {
            logger.warn('⚠️ [AppContext] No se pudo recuperar fileURL desde sesiones locales:', localRecoverError);
          }
        }

        // 🆕 FALLBACK: Si no hay fileURL pero tenemos textoId, buscar en Firestore
        if (isPDF && !fileURL && (session.currentTextoId || session.text?.metadata?.id)) {
          const textoId = session.currentTextoId || session.text?.metadata?.id;
          logger.log('🔍 [AppContext] Buscando fileURL en Firestore para:', textoId);
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../firebase/config');
            const docSnap = await getDoc(doc(db, 'textos', textoId));
            if (docSnap.exists() && docSnap.data().fileURL) {
              fileURL = docSnap.data().fileURL;
              logger.log('✅ [AppContext] fileURL encontrada en Firestore');
            }
          } catch (fbError) {
            logger.warn('⚠️ [AppContext] No se pudo obtener fileURL de Firestore:', fbError);
          }
        }

        if (isPDF && fileURL) {
          logger.log('📄 [AppContext] Restaurando PDF. fileURL:', fileURL?.substring(0, 80));
          let pdfRestored = false;

          try {
            const recovered = await recoverPdfBlobWithFallback(fileURL, {
              backendBaseUrl: BACKEND_URL.replace(/\/$/, ''),
              signal: restoreAbortController.signal,
              logger,
              prefix: '[AppContext]'
            });

            if (recovered?.blob) {
              if (!canApplyRestoreState()) {
                logger.log('⏭️ [AppContext] Restauración PDF cancelada por cambio de sesión.');
                return false;
              }

              const objectUrl = URL.createObjectURL(recovered.blob);
              const file = new File([recovered.blob], session.text.fileName || 'documento.pdf', { type: 'application/pdf' });
              setArchivoActualStable({ name: session.text.fileName, type: 'application/pdf', fileURL, file, objectUrl });
              logger.log(`✅ [AppContext] PDF restaurado via ${recovered.method}:`, recovered.blob.size, 'bytes');
              pdfRestored = true;
            }
          } catch (pdfRecoverErr) {
            if (pdfRecoverErr?.name === 'AbortError') {
              logger.log('⏭️ [AppContext] Restauración PDF abortada por nueva restauración.');
              return false;
            }
            logger.warn('⚠️ [AppContext] Falló recuperación de PDF con cascada:', pdfRecoverErr?.message || pdfRecoverErr);
          }

          // ── INTENTO 3: Pasar URL directa a react-pdf (sin descargar previamente) ──
          if (!pdfRestored) {
            logger.log('📄 [AppContext] Intento 3: pasando URL directa a visor PDF');
            if (!canApplyRestoreState()) {
              logger.log('⏭️ [AppContext] Restauración PDF cancelada por cambio de sesión (URL directa).');
              return false;
            }
            setArchivoActualStable({
              name: session.text.fileName || 'documento.pdf',
              type: 'application/pdf',
              fileURL: fileURL,
              objectUrl: fileURL  // react-pdf intentará cargarlo internamente
            });
            pdfRestored = true; // No ideal, pero al menos le da una oportunidad al visor
          }
        } else if (isPDF && !fileURL) {
          // PDF sin URL - establecer archivoActual para que VisorTexto muestre diagnóstico
          logger.warn('⚠️ [AppContext] PDF detectado pero sin fileURL. textoId:', session.currentTextoId);
          if (!canApplyRestoreState()) {
            logger.log('⏭️ [AppContext] Restauración PDF sin URL cancelada por cambio de sesión.');
            return false;
          }
          setArchivoActualStable({
            name: session.text?.fileName || 'documento.pdf',
            type: 'application/pdf',
            fileURL: null,
            __pdfDiag: {
              textoId: session.currentTextoId || session.text?.metadata?.id || 'N/A',
              fileName: session.text?.fileName || 'N/A',
              sessionId: session.id || 'N/A',
              reason: 'fileURL no encontrada en sesión, sesiones locales, ni Firestore'
            }
          });
        } else if (session.text?.fileName && session.text?.fileType) {
          // Texto plano - solo guardar referencia
          if (!canApplyRestoreState()) {
            logger.log('⏭️ [AppContext] Restauración de archivo cancelada por cambio de sesión.');
            return false;
          }
          setArchivoActualStable({
            name: session.text.fileName,
            type: session.text.fileType,
            fileURL: fileURL || null
          });
        }

        // 🆕 FASE 4 FIX: rewardsState NO se restaura desde sesiones individuales
        // Esto evita sobrescribir puntos actuales con datos obsoletos de sesiones antiguas
        // rewardsState se carga y sincroniza desde global_progress (listener dedicado ~línea 2457)
        if (session.rewardsState) {
          logger.log('ℹ️ [AppContext] Ignorando rewardsState de sesión (se usa global_progress)');
        }

        // 🆕 FIX CRÍTICO: Si la sesión restaurada tiene rubricProgress vacío/débil,
        // intentar cargar desde Firestore como fuente de verdad (evita pérdida tras logout/login)
        const textoIdRestored = session.currentTextoId || session.text?.metadata?.id || session.text?.textoId;
        const restoredCourseId = resolveProgressCourseScope(
          textoIdRestored,
          session.sourceCourseId || session.text?.sourceCourseId || null
        );
        const sessionRubricKeys = Object.keys(session.rubricProgress || {}).filter(
          k => (session.rubricProgress[k]?.formative?.scores?.length || session.rubricProgress[k]?.scores?.length || 0) > 0
        );

        if (currentUser?.uid && textoIdRestored && sessionRubricKeys.length === 0) {
          logger.log('🔄 [AppContext] Sesión sin rúbricas, intentando cargar desde Firestore...');
          try {
            let firestoreProgress = await getStudentProgress(currentUser.uid, textoIdRestored, restoredCourseId);
            if (!firestoreProgress && !session.sourceCourseId && !session.text?.sourceCourseId) {
              // Compatibilidad con datos históricos de modo libre sin sourceCourseId.
              firestoreProgress = await getStudentProgress(currentUser.uid, textoIdRestored, null);
            }
            if (firestoreProgress?.rubricProgress && Object.keys(firestoreProgress.rubricProgress).length > 0) {
              logger.log('✅ [AppContext] Rúbricas encontradas en Firestore, aplicando...');
              setRubricProgress(normalizeRubricProgress(firestoreProgress.rubricProgress));
            }
            if (firestoreProgress?.activitiesProgress && Object.keys(firestoreProgress.activitiesProgress).length > 0) {
              logger.log('✅ [AppContext] Actividades encontradas en Firestore, aplicando...');
              setActivitiesProgress(firestoreProgress.activitiesProgress);
            }
          } catch (fbErr) {
            logger.warn('⚠️ [AppContext] Error cargando progreso de Firestore:', fbErr);
          }
        }

        logger.log('✅ [AppContext] Sesión restaurada exitosamente');

        // 🔧 H4 FIX: usar finally pattern para garantizar limpieza del flag
        // incluso si alguna operación posterior falla (descarga PDF, fetch, etc.)
      }

      return success;
    } catch (error) {
      logger.error('❌ [AppContext] Error restaurando sesión:', error);
      return false;
    } finally {
      // 🔧 H4 FIX: Siempre programar limpieza del flag, sin importar el resultado
      // El setTimeout de 500ms permite que React procese los state updates antes
      // de re-habilitar el auto-guardado
      setTimeout(() => {
        if (!isRestoreStillActive()) {
          return;
        }
        releaseRestoreLock('finally');
        if (pdfRestoreAbortRef.current === restoreAbortController) {
          pdfRestoreAbortRef.current = null;
        }
        activeRestoreTokenRef.current = null;
        logger.log('🔓 [AppContext] Protección de restauración liberada');
      }, 500);
    }
  }, [setTextoWithDebug, setCompleteAnalysis, setArchivoActualStable, setRubricProgress, setSavedCitations, setActivitiesProgress, setCurrentTextoId, setSourceCourseId, currentUser, activeLecture, archivoActual]);

  // 🆕 AUTO-GUARDAR sesión cuando el análisis se complete
  useEffect(() => {
    // Ignorar si no hay análisis o si estamos restaurando
    if (!completeAnalysis || !texto || isRestoringRef.current) {
      return;
    }

    const isRestoring = localStorage.getItem('__restoring_session__');
    if (isRestoring) {
      logger.log('🛡️ [AppContext] Saltando auto-guardado durante restauración');
      return;
    }

    logger.log('💾 [AppContext] Auto-guardando sesión después de análisis completo...');

    const timeoutId = setTimeout(() => {
      const currentId = getCurrentSessionId();

      if (currentId) {
        logger.log('📝 [AppContext] Actualizando sesión existente:', currentId);
        updateCurrentSessionFromState();
      } else {
        logger.log('🆕 [AppContext] Creando nueva sesión automáticamente...');
        createSession().then(session => {
          if (session) {
            logger.log('✅ [AppContext] Sesión auto-guardada:', session.id);
          }
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [completeAnalysis, texto, createSession, updateCurrentSessionFromState]);

  // 🆕 AUTO-GUARDAR cuando cambia el progreso de rúbricas o actividades
  useEffect(() => {
    if (isRestoringRef.current || !completeAnalysis) {
      return;
    }

    // Si aún no hay texto cargado, no tiene sentido actualizar la sesión.
    // Esto pasa normalmente durante mount/login/restauración.
    if (!texto || texto.length === 0) {
      return;
    }

    const isRestoring = localStorage.getItem('__restoring_session__');
    if (isRestoring) {
      return;
    }

    const currentId = getCurrentSessionId();
    if (currentId) {
      // Solo actualizar si hay sesión activa
      logger.log('💾 [AppContext] Auto-guardando progreso de actividades...');
      const timeoutId = setTimeout(() => {
        updateCurrentSessionFromState();
      }, 2000); // Mayor delay para agrupar cambios rápidos

      return () => clearTimeout(timeoutId);
    }
  }, [rubricProgress, activitiesProgress, updateCurrentSessionFromState]);

  // 🆕 AUTO-CREAR sesión cuando se carga un texto nuevo
  // DESHABILITADO: Crear sesión manual al hacer clic "Analizar Contenido"
  /*
  useEffect(() => {
    const currentId = getCurrentSessionId();
    
    // Solo crear sesión si:
    // 1. Hay texto cargado
    // 2. NO hay una sesión actual activa
    if (texto && texto.length > 0 && !currentId) {
      logger.log('🆕 [AppContext] Texto detectado sin sesión, creando automáticamente...');
      
      const timeoutId = setTimeout(() => {
        createSession().then(session => {
          if (session) {
            logger.log('✅ [AppContext] Sesión auto-creada:', session.id);
            window.dispatchEvent(new CustomEvent('session-updated'));
          }
        }).catch(error => {
          logger.error('❌ [AppContext] Error en auto-creación:', error);
        });
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [texto, createSession]);
  */

  // Guardar automáticamente cuando cambie el estado relevante
  useEffect(() => {
    // 🔒 No auto-guardar si estamos restaurando una sesión
    const flag = localStorage.getItem('__restoring_session__');
    if (flag) {
      const timestamp = parseInt(flag, 10);
      if (!isNaN(timestamp) && Date.now() - timestamp < 30000) {
        logger.log('⏸️ [AppContext] Auto-guardado pausado (restauración en curso)');
        return;
      }
    }

    // 🛡️ FIX: No auto-guardar si no hay textoId (evita contaminación durante cambio de lectura)
    if (!currentTextoId) {
      logger.log('⏸️ [AppContext] Auto-guardado omitido: sin currentTextoId activo');
      return;
    }

    // Solo guardar si hay una sesión actual activa y hay texto cargado
    const currentId = getCurrentSessionId();
    if (currentId && texto) {
      // 🛡️ FIX: Capturar textoId al momento de programar el guardado
      // para verificar que no cambió cuando se ejecute el timer
      const capturedTextoId = currentTextoId;
      const capturedCourseId = sourceCourseId;

      logger.log('🔄 [AppContext] Auto-guardado programado para sesión:', currentId, 'textoId:', capturedTextoId);
      // Usar un debounce para no guardar en cada cambio
      const timeoutId = setTimeout(() => {
        // 🛡️ FIX CRÍTICO: Verificar que el textoId no cambió durante el debounce
        // Si cambió, el guardado podría contaminar la sesión equivocada
        if (currentTextoIdRef.current !== capturedTextoId) {
          logger.warn('🚫 [AppContext] Auto-guardado CANCELADO: textoId cambió durante debounce',
            { esperado: capturedTextoId, actual: currentTextoIdRef.current });
          return;
        }

        logger.log('💾 [AppContext] Ejecutando auto-guardado de sesión:', currentId);
        const sessionData = captureCurrentState({
          texto,
          archivoActual,
          completeAnalysis,
          rubricProgress,
          savedCitations,
          activitiesProgress,
          modoOscuro,
          // 🛡️ FIX: Pasar currentTextoId y sourceCourseId para namespace correcto
          currentTextoId: capturedTextoId,
          sourceCourseId: capturedCourseId
        });

        // Actualizar sesión actual
        const updated = updateCurrentSession(sessionData, { syncToCloud: !cloudBackupWriteOnly });
        logger.log('✅ [AppContext] Auto-guardado completado:', updated);
      }, 2000); // Guardar 2 segundos después del último cambio

      return () => clearTimeout(timeoutId);
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentTextoId, sourceCourseId]);

  // 🗑️ FUNCIÓN PARA ELIMINAR TODO EL HISTORIAL DE LA APLICACIÓN
  const clearAllHistory = useCallback(async () => {
    logger.log('🧹 [clearAllHistory] Iniciando LIMPIEZA NUCLEAR completa...');

    try {
      // Lista de claves a preservar (SOLO configuraciones y preferencias del usuario)
      const keysToPreserve = [
        'modoOscuro',
        'tutorDockWidth',
        'tutorFollowUpsEnabled',
        'tutorCompactMode',
        'tutorLengthMode',
        'tutorTemperature'
      ];

      // Prefijos a preservar (preferencias scopeadas por usuario + API keys scopeadas)
      const prefixesToPreserve = [
        'tutorDockWidth:',
        'tutorFollowUpsEnabled:',
        'tutorCompactMode:',
        'tutorLengthMode:',
        'tutorTemperature:',
        // API keys scopeadas por uid se preservan
        'openai_api_key:',
        'gemini_api_key:',
        'deepseek_api_key:',
        'ai_provider:',
        'api_usage:'
      ];

      // Obtener todas las claves de localStorage
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }

      // 🆕 PATRONES EXPANDIDOS - Limpieza más agresiva
      const patternsToRemove = [
        /^tutorHistorial/,           // Historial del tutor (tutorHistorial:hash)
        /^tutorMeta:/,               // Metadatos locales del historial del tutor
        /^tutorThreadIndex:/,        // Índice de hilos del tutor por lectura
        /^tutorActiveThread:/,       // Hilo activo por lectura
        /^activity_results_/,        // Resultados de actividades
        /^analysis_cache_/,          // Caché de análisis
        /^visor_highlights_/,        // Resaltados del visor
        /^annotation_/,              // Anotaciones
        /^text_analysis_cache/,      // Caché de análisis de texto
        /^webSearchHistory/,         // 🆕 Historial de búsquedas web (webSearchHistory[:uid])
        /^sessions_/,                // 🆕 Sesiones de Smart Resume
        /^activitiesProgress_/,      // 🆕 Progreso de actividades por usuario
        /^currentSession_/,          // 🆕 Sesión actual
        /^rubricProgress_/,          // 🆕 Progreso de rúbricas por usuario
        /^savedCitations_/,          // 🆕 Citas guardadas por documento
        /^lastReadingContext/,       // 🆕 Contexto de última lectura
        /^courseProgress_/,          // 🆕 Progreso por curso
        /^tutorInteractionsLog/,     // 🆕 Bitácora: logs por lectura (tutorInteractionsLog:<lectureId>)
        /^ethicalReflections/,       // 🆕 Bitácora: reflexiones por lectura (ethicalReflections:<lectureId>)
      ];

      // Claves específicas a eliminar
      const specificKeysToRemove = [
        'notasLectura',
        'conversacionesGuardadas',
        'rubricProgress',
        'savedCitations',
        'webSearchHistory',
        'tutorInteractionsLog',
        'ethicalReflections',
        'tutorConvos',
        'annotations_migrated_v1',
        'tutorHistorial',
        'tutorThreadIndex',
        'tutorActiveThread',
        'analysis_cache_stats',
        'analysis_cache_metrics',
        // 🆕 Nuevas claves críticas para el problema de persistencia entre cursos
        'lastRestoredSession',
        'lastSessionId',
        'currentTextoId',
        'currentCourseId',
        'sourceCourseId',
        'lastSmartResumeCheck',
        'pendingSmartResume',
        'lastActiveText',
        'lastActiveContext',
      ];

      let removedCount = 0;

      // Eliminar claves que coinciden con patrones O que no están en preservar
      allKeys.forEach(key => {
        if (keysToPreserve.includes(key) || prefixesToPreserve.some(p => key && key.startsWith(p))) {
          return; // Preservar esta clave
        }

        // Verificar si coincide con algún patrón
        const matchesPattern = patternsToRemove.some(pattern => pattern.test(key));

        if (matchesPattern || specificKeysToRemove.includes(key)) {
          localStorage.removeItem(key);
          removedCount++;
          logger.log(`  ✓ Eliminado: ${key}`);
        }
      });

      // 🆕 LIMPIEZA COMPLETA DE sessionStorage (no solo algunos patrones)
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        sessionKeys.push(sessionStorage.key(i));
      }

      // 🆕 Patrones expandidos para sessionStorage
      sessionKeys.forEach(key => {
        // Eliminar TODAS las claves de artefactos y borradores
        if (key.includes('resumenAcademico') ||
          key.includes('tablaACD') ||
          key.includes('mapaActores') ||
          key.includes('respuestaArgumentativa') ||
          key.includes('bitacoraEtica') ||      // 🆕 Bitácora ética
          key.includes('_draft') ||             // 🆕 Cualquier borrador
          key.includes('_courseId') ||          // 🆕 Referencias de curso
          key.includes('artifact_') ||          // 🆕 Artefactos genéricos
          key.includes('session') ||            // 🆕 Datos de sesión
          key.includes('current')) {            // 🆕 Estados actuales
          sessionStorage.removeItem(key);
          removedCount++;
          logger.log(`  ✓ Eliminado (session): ${key}`);
        }
      });

      // Resetear estados en el contexto
      setRubricProgress({
        rubrica1: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica2: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica3: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica4: { scores: [], average: 0, lastUpdate: null, artefactos: [] },
        rubrica5: { scores: [], average: 0, lastUpdate: null, artefactos: [] }
      });
      setSavedCitations({});
      setCompleteAnalysis(null);
      setTextStructure(null);

      // 🛡️ FIX: También eliminar sesiones de Firestore
      // Sin esto, las sesiones regresan desde la nube al recargar
      if (currentUser?.uid) {
        try {
          await deleteAllSessionsFromManager();
          logger.log('☁️ [clearAllHistory] Sesiones eliminadas de Firestore');
        } catch (err) {
          logger.warn('⚠️ [clearAllHistory] Error eliminando sesiones de Firestore:', err);
        }
      }

      logger.log(`✅ [clearAllHistory] Limpieza completada. ${removedCount} elementos eliminados.`);

      // Emitir evento para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('app-history-cleared'));

      return {
        success: true,
        removedCount,
        message: `Se eliminaron ${removedCount} elementos del historial`
      };
    } catch (error) {
      logger.error('❌ [clearAllHistory] Error durante la limpieza:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al limpiar el historial'
      };
    }
  }, [currentUser]);

  // NUEVO: Función para analizar documento con orquestador unificado
  // param textId: ID explícito del texto para evitar race conditions con el estado
  const analyzeDocument = useCallback(async (text, textId = null, options = {}) => {
    logger.log('🔵 [AppContext.analyzeDocument] LLAMADA RECIBIDA');
    logger.log('🔍 [AppContext.analyzeDocument] Longitud texto:', text?.length || 0, 'ID:', textId);

    // Compat: permitir analyzeDocument(text, { force: true })
    if (textId && typeof textId === 'object' && !Array.isArray(textId)) {
      options = textId;
      textId = null;
    }

    const forceReanalyze = !!(options && (options.force === true || options.forceReanalyze === true || options.bypassCache === true));
    if (forceReanalyze) {
      logger.log('🧹 [AppContext.analyzeDocument] Force re-análisis: bypass de cachés habilitado');
    }

    if (!text || text.trim().length < 100) {
      logger.warn('⚠️ [AppContext.analyzeDocument] Texto muy corto para análisis completo (mínimo 100 caracteres)');
      return;
    }

    // 🛡️ Si estamos restaurando, ignorar peticiones de análisis nuevas
    if (isRestoringRef.current) {
      logger.log('🚫 [AppContext.analyzeDocument] Bloqueado por proceso de restauración activo');
      return;
    }

    // Identificador efectivo: el pasado por parámetro (prioridad) o el más reciente del estado
    const effectiveId = textId || currentTextoIdRef.current;

    // Cuota mensual para análisis libre (solo estudiantes): 4 análisis/mes
    const FREE_ANALYSIS_MONTHLY_LIMIT = 4;
    const getMonthlyQuotaKey = (uid) => {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return `free_analysis_quota_${uid}_${monthKey}`;
    };

    const isFreeAnalysisMode = !sourceCourseIdRef.current;

    // 🆕 FIX CRÍTICO: Capturar TODO el estado AL INICIO para evitar closure stale
    // Estos valores se usarán cuando el análisis termine, incluso si el usuario cambió de lectura
    const capturedState = {
      textoId: effectiveId,
      courseId: sourceCourseIdRef.current,
      archivoActual: archivoActual ? { ...archivoActual } : null,
      rubricProgress: rubricProgress ? { ...rubricProgress } : {},
      savedCitations: savedCitations ? { ...savedCitations } : {},
      modoOscuro: modoOscuro,
      capturedAt: Date.now()
    };

    logger.log('🔒 [analyzeDocument] Estado capturado al inicio:');
    logger.log('   - textoId:', capturedState.textoId);
    logger.log('   - courseId:', capturedState.courseId);
    logger.log('   - timestamp:', capturedState.capturedAt);

    // 🆕 A6 FIX MEJORADO: Generar clave de caché basada en textoId (preferido) o hash del texto
    const generateAnalysisCacheKey = (inputText, textoId) => {
      // Si hay textoId, usarlo directamente (garantiza aislamiento entre lecturas)
      if (textoId) {
        return `analysis_cache_tid_${textoId}`;
      }
      // Fallback: hash del texto para textos sin ID
      const fingerprint = inputText.substring(0, 200) + inputText.slice(-200) + inputText.length;
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
        hash = hash & hash;
      }
      return `analysis_cache_${Math.abs(hash)}`;
    };

    const cacheKey = generateAnalysisCacheKey(text, effectiveId);

    logger.log('📊 [AppContext.analyzeDocument] Iniciando análisis completo con backend RAG...');

    // 🆕 A6 FIX: Verificar caché persistente en localStorage ANTES del análisis en memoria
    if (!forceReanalyze) {
      try {
        const cachedAnalysis = localStorage.getItem(cacheKey);
        if (cachedAnalysis) {
          const { analysis, timestamp, textLength } = JSON.parse(cachedAnalysis);
          const cacheAge = Date.now() - timestamp;
          const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

          // Validar que el texto tiene la misma longitud (±5%) y el cache no expiró
          const lengthMatch = Math.abs(text.length - textLength) < text.length * 0.05;

          // 🆕 FIX: Si la clave ya está namespaced por textoId (analysis_cache_tid_*),
          // no forzar match por metadata (evita falsos negativos por diferencias de forma).
          const isTextoIdCacheKey = cacheKey.startsWith('analysis_cache_tid_');
          const cachedTextoId =
            analysis?.metadata?.currentTextoId ||
            analysis?.prelecture?.metadata?.currentTextoId ||
            null;
          const cacheMatchesTextoId = isTextoIdCacheKey
            ? true
            : (!effectiveId || cachedTextoId === effectiveId);

          if (lengthMatch && cacheAge < CACHE_TTL && analysis?.prelecture && cacheMatchesTextoId) {
            // 🆕 FIX: Normalizar caches antiguos que pudieron conservar flag preliminar
            if (analysis?.metadata && analysis.metadata._isPreliminary && analysis.metadata.provider !== 'basic-local') {
              analysis.metadata._isPreliminary = false;
            }

            const isCachedPreliminary =
              analysis?.metadata?.provider === 'basic-local' ||
              analysis?.metadata?._isPreliminary === true ||
              analysis?.prelecture?.metadata?._isPreliminary === true;

            if (!isCachedPreliminary) {
              logger.log(`✅ [AppContext] 🆕 A6: Cache Hit desde localStorage (edad: ${Math.round(cacheAge / 60000)}min)`);
              setCompleteAnalysis(analysis);
              setLoading(false);
              setAnalysisAttempted(true);
              return;
            }

            // Si el cache es preliminar, lo mostramos pero continuamos para disparar el análisis profundo.
            logger.log(`ℹ️ [AppContext] Cache preliminar encontrado (edad: ${Math.round(cacheAge / 60000)}min), continuando con análisis profundo...`);
            setCompleteAnalysis(analysis);
            setLoading(false);
          } else {
            logger.log(`⚠️ [AppContext] Cache expirado o inválido, procediendo a análisis`);
            localStorage.removeItem(cacheKey); // Limpiar cache inválido
          }
        }
      } catch (cacheError) {
        logger.warn('⚠️ [AppContext] Error leyendo cache de localStorage:', cacheError.message);
      }
    } else {
      // Si forzamos re-análisis, limpia cache persistente del texto actual
      try {
        localStorage.removeItem(cacheKey);
      } catch { }
    }

    // 🛡️ CACHÉ EN MEMORIA: Validar si la análisis en memoria corresponde al texto actual
    const inMemoryAnalysis = completeAnalysisRef.current;

    // Si no tenemos textoId, evitamos caché en memoria para prevenir contaminación entre textos
    if (!forceReanalyze && effectiveId && inMemoryAnalysis && inMemoryAnalysis.metadata) {
      let isSameText = false;

      // 1. Verificación por textoId (la más segura en esta app)
      if (inMemoryAnalysis.metadata.currentTextoId === effectiveId) {
        logger.log(`✅ [AppContext] Cache Hit por currentTextoId: ${effectiveId}`);
        isSameText = true;
      }
      // 2. Verificación por Título (si metadata tiene título)
      else if (inMemoryAnalysis.metadata.title && text.includes(inMemoryAnalysis.metadata.title)) { // Simple check
        // ⚠️ Riesgoso si títulos similares, mejor confiar en ID o longitud exacta
      }
      // 3. Verificación de Respaldo por Longitud (margen de 5%)
      else if (inMemoryAnalysis.metadata.charCount || inMemoryAnalysis.metadata.text_length) {
        const expectedLen = inMemoryAnalysis.metadata.charCount || inMemoryAnalysis.metadata.text_length;
        const diff = Math.abs(text.length - expectedLen);
        if (diff < text.length * 0.05) { // 5% de tolerancia
          logger.log(`✅ [AppContext] Cache Hit por longitud (~${expectedLen} chars)`);
          isSameText = true;
        }
      }

      if (isSameText) {
        logger.log('⚡ [AppContext] Análisis recuperado de memoria/sesión. SALTANDO API.');
        // ✅ FIX: Hidratar SIEMPRE el estado para que la UI renderice
        setCompleteAnalysis(inMemoryAnalysis);
        setLoading(false);
        setAnalysisAttempted(true);

        // ✅ FIX: Solo saltar API si el análisis tiene estructura esperada
        const hasPrelecture = !!inMemoryAnalysis?.prelecture;
        const isCachedPreliminary =
          inMemoryAnalysis?.metadata?.provider === 'basic-local' ||
          inMemoryAnalysis?.metadata?._isPreliminary === true ||
          inMemoryAnalysis?.prelecture?.metadata?._isPreliminary === true;

        logger.log('🔎 [AppContext] Cache en memoria:', {
          hasPrelecture,
          isCachedPreliminary,
          provider: inMemoryAnalysis?.metadata?.provider
        });

        if (hasPrelecture && !isCachedPreliminary) {
          // Aseguramos que el estado de sesión refleje esto
          const currentId = getCurrentSessionId();
          if (currentId) updateCurrentSession({ completeAnalysis: inMemoryAnalysis, lastModified: Date.now() }, { syncToCloud: !cloudBackupWriteOnly });
          return;
        }

        // Si falta prelecture o es preliminar, no considerarlo cache válido: continuar con análisis profundo.
        logger.warn('⚠️ [AppContext] Cache en memoria es preliminar o inválido (sin prelecture). Re-analizando...');
      } else {
        logger.log('⚠️ [AppContext] Análisis en memoria NO coincide con texto actual. Procediendo a re-análisis.');
      }
    }

    // 🔒 Límite de análisis libre: máximo 4 por mes por alumno
    // Se evalúa tras cachés para no consumir cuota cuando hay cache hit.
    // Persistencia dual: localStorage (rápido) + Firestore global_progress (multi-dispositivo).
    if (!forceReanalyze && isStudent && currentUser?.uid && isFreeAnalysisMode) {
      try {
        const uid = currentUser.uid;
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const quotaKey = getMonthlyQuotaKey(uid);

        // 1) Leer cuota local
        const localRaw = localStorage.getItem(quotaKey);
        const localUsage = localRaw ? JSON.parse(localRaw) : { count: 0, updatedAt: null };
        const localCount = Number.isFinite(Number(localUsage?.count)) ? Number(localUsage.count) : 0;

        // 2) Leer cuota cloud (global_progress) para sincronizar entre dispositivos
        let cloudCount = 0;
        try {
          const cloudProgress = await getStudentProgress(uid, 'global_progress');
          const cloudMonthCount = cloudProgress?.freeAnalysisQuota?.[monthKey]?.count;
          cloudCount = Number.isFinite(Number(cloudMonthCount)) ? Number(cloudMonthCount) : 0;
        } catch (cloudReadError) {
          logger.warn('⚠️ [AppContext.analyzeDocument] No se pudo leer cuota desde Firestore (se usa fallback local):', cloudReadError?.message || cloudReadError);
        }

        // Usar el máximo para evitar subcontar en escenarios multi-dispositivo
        const syncedCount = Math.max(localCount, cloudCount);

        if (syncedCount >= FREE_ANALYSIS_MONTHLY_LIMIT) {
          const message = `Has alcanzado tu cuota de análisis libre (${FREE_ANALYSIS_MONTHLY_LIMIT} por mes). Intenta de nuevo el próximo mes o continúa con lecturas de curso.`;
          logger.warn('⛔ [AppContext.analyzeDocument] Cuota mensual de análisis libre alcanzada:', {
            uid,
            localCount,
            cloudCount,
            syncedCount,
            limit: FREE_ANALYSIS_MONTHLY_LIMIT
          });

          // Mantener localStorage alineado con el máximo conocido
          localStorage.setItem(quotaKey, JSON.stringify({
            count: syncedCount,
            updatedAt: Date.now(),
            monthKey,
            source: cloudCount >= localCount ? 'cloud' : 'local'
          }));

          setError(message);
          setLoading(false);
          setAnalysisAttempted(true);
          return;
        }

        const nextCount = syncedCount + 1;

        // 3) Persistir local inmediato
        localStorage.setItem(quotaKey, JSON.stringify({
          count: nextCount,
          updatedAt: Date.now(),
          monthKey,
          lastTextoId: effectiveId || null,
          source: 'local+cloud'
        }));

        // 4) Persistir cloud (best effort) en students/{uid}/progress/global_progress
        // Campo nuevo: freeAnalysisQuota.{YYYY-MM}.count
        try {
          await saveStudentProgress(uid, 'global_progress', {
            freeAnalysisQuota: {
              [monthKey]: {
                count: nextCount,
                limit: FREE_ANALYSIS_MONTHLY_LIMIT,
                updatedAt: Date.now(),
                scope: 'free-analysis'
              }
            },
            syncType: 'free_analysis_quota'
          });
        } catch (cloudWriteError) {
          logger.warn('⚠️ [AppContext.analyzeDocument] No se pudo guardar cuota en Firestore (se mantiene local):', cloudWriteError?.message || cloudWriteError);
        }

        logger.log('📊 [AppContext.analyzeDocument] Cuota análisis libre consumida:', {
          uid,
          monthKey,
          localCount,
          cloudCount,
          used: nextCount,
          remaining: Math.max(0, FREE_ANALYSIS_MONTHLY_LIMIT - nextCount),
          limit: FREE_ANALYSIS_MONTHLY_LIMIT
        });
      } catch (quotaError) {
        logger.warn('⚠️ [AppContext.analyzeDocument] No se pudo validar cuota de análisis libre:', quotaError?.message || quotaError);
      }
    }

    setLoading(true);
    setError('');
    setAnalysisAttempted(true);

    // 🆕 A1 FIX: FASE 1 - Análisis básico instantáneo (heurísticas locales)
    logger.log('⚡ [AppContext] A1 FIX: FASE 1 - Generando análisis básico instantáneo...');
    const basicAnalysis = generateBasicAnalysis(text);

    // 🆕 A1-1 FIX: Capturar document_id para verificar race condition
    const analysisDocumentId = basicAnalysis?.metadata?.document_id || `doc_${Date.now()}_${text.length}`;

    if (basicAnalysis) {
      // 🆕 Agregar currentTextoId al metadata para cache de memoria
      if (basicAnalysis.metadata) {
        basicAnalysis.metadata.currentTextoId = effectiveId || currentTextoId;
      }
      // Mostrar análisis básico inmediatamente al usuario
      setCompleteAnalysis(basicAnalysis);
      setLoading(false); // Usuario puede interactuar con resultados preliminares
      logger.log('✅ [AppContext] A1 FIX: Análisis básico mostrado. Iniciando análisis profundo en background...');
      logger.log(`🔑 [AppContext] A1-1 FIX: Document ID para esta sesión: ${analysisDocumentId}`);
    }

    // 🆕 A1 FIX: FASE 2 - Análisis profundo en background (no bloquea UI)
    // 🆕 A1-1 FIX: Pasamos originalDocId para verificar que el texto no cambió
    const enrichInBackground = async (originalDocId) => {
      let abortControl = null;
      try {
        logger.log('🌐 [AppContext.analyzeDocument] Llamando al endpoint /api/analysis/prelecture...');
        logger.log('🔗 [AppContext.analyzeDocument] Backend URL:', BACKEND_URL);

        // Crear AbortController con timeout de 5 minutos (alineado con backend)
        abortControl = createAbortControllerWithTimeout({
          timeoutMs: PRELECTURE_ANALYSIS_TIMEOUT_MS
        });
        let authHeader = {};
        try {
          const idToken = await auth?.currentUser?.getIdToken?.();
          if (idToken) {
            authHeader = { Authorization: `Bearer ${idToken}` };
          }
        } catch (tokenError) {
          logger.warn('[AppContext] No se pudo obtener Firebase ID token para prelecture:', tokenError?.message || tokenError);
        }

        // 🆕 A4 FIX: Llamada al backend con retry automático para errores de red
        const response = await fetchWithRetry(`${BACKEND_URL}/api/analysis/prelecture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify({
            text: text,
            metadata: {} // Metadata adicional si es necesario
          }),
          signal: abortControl.signal
        }, {
          retries: 1,
          initialDelayMs: 3000,
          backoffMultiplier: 1.5,
          onRetry: (_error, meta) => {
            logger.warn(`⚠️ [AppContext] Error de red, reintentando en ${meta.delayMs}ms... (intento ${meta.attempt}/${meta.maxAttempts})`);
          }
        }); // 1 retry con 3 segundos de espera inicial

        // PARSEAR LA RESPUESTA (incluso en error) para poder usar fallback
        let responseData = null;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          responseData = null;
        }

        // Unwrap success envelope {ok, data} if present (A3 migration compat)
        if (responseData?.ok === true && 'data' in responseData) {
          responseData = responseData.data;
        }

        // Compat: algunos backends devuelven HTTP 200 con { degraded, fallback }
        // En ese caso, tratamos el fallback como resultado válido para no romper la UI.
        if (responseData && typeof responseData === 'object' && responseData.fallback && (responseData.degraded || responseData.error)) {
          logger.warn('⚠️ [AppContext.analyzeDocument] Backend devolvió respuesta degradada con fallback (HTTP OK); usando fallback');
          const fullAnalysis = responseData.fallback;
          const normalizedBackendError = normalizeBackendErrorPayload(responseData, {
            status: response.status,
            fallbackMessage: 'Respuesta degradada'
          });

          if (!fullAnalysis.metadata) fullAnalysis.metadata = {};
          fullAnalysis.metadata.currentTextoId = fullAnalysis.metadata.currentTextoId || (effectiveId || currentTextoId);
          fullAnalysis.metadata._isPreliminary = false;
          fullAnalysis.metadata._serverFallback = true;
          fullAnalysis.metadata._serverErrorMessage = normalizedBackendError.message;

          if (fullAnalysis.prelecture?.metadata && !fullAnalysis.prelecture.metadata.currentTextoId) {
            fullAnalysis.prelecture.metadata.currentTextoId = effectiveId || currentTextoId;
          }
          if (fullAnalysis.prelecture?.metadata) {
            fullAnalysis.prelecture.metadata._isPreliminary = false;
          }

          const latestTextoId = currentTextoIdRef.current;
          if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
            logger.warn('⚠️ [AppContext] Fallback de análisis obsoleto (cambio de lectura); descartando');
            return;
          }

          setCompleteAnalysis(fullAnalysis);
          logger.log('✅ [AppContext.analyzeDocument] Fallback degradado del backend guardado en contexto');
          return;
        }

        if (!response.ok) {
          // Si el backend envía fallback, NO bloquear la UI: úsalo como resultado válido
          if (responseData && responseData.fallback) {
            logger.warn('⚠️ [AppContext.analyzeDocument] Backend devolvió error pero incluye fallback; continuando sin bloquear UI');
            const fullAnalysis = responseData.fallback;
            const normalizedBackendError = normalizeBackendErrorPayload(responseData, {
              status: response.status,
              fallbackMessage: `HTTP ${response.status}`
            });

            // Normalización mínima (mismo contrato que en éxito)
            if (!fullAnalysis.metadata) fullAnalysis.metadata = {};
            fullAnalysis.metadata.currentTextoId = fullAnalysis.metadata.currentTextoId || (effectiveId || currentTextoId);
            fullAnalysis.metadata._isPreliminary = false;
            fullAnalysis.metadata._serverFallback = true;
            fullAnalysis.metadata._serverErrorMessage = normalizedBackendError.message;

            if (fullAnalysis.prelecture?.metadata && !fullAnalysis.prelecture.metadata.currentTextoId) {
              fullAnalysis.prelecture.metadata.currentTextoId = effectiveId || currentTextoId;
            }
            if (fullAnalysis.prelecture?.metadata) {
              fullAnalysis.prelecture.metadata._isPreliminary = false;
            }

            // Guard: si el usuario cambió de lectura, descartar resultados
            const latestTextoId = currentTextoIdRef.current;
            if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
              logger.warn('⚠️ [AppContext] Fallback de análisis obsoleto (cambio de lectura); descartando');
              return;
            }

            setCompleteAnalysis(fullAnalysis);
            logger.log('✅ [AppContext.analyzeDocument] Fallback del backend guardado en contexto');
            return;
          }

          const normalizedBackendError = normalizeBackendErrorPayload(responseData, {
            status: response.status,
            fallbackMessage: `HTTP ${response.status}`
          });
          const errorMessage = normalizedBackendError.backendError
            ? `${normalizedBackendError.backendError}: ${normalizedBackendError.message}`
            : normalizedBackendError.message;

          const customError = new Error(errorMessage);
          customError.status = normalizedBackendError.status;
          customError.code = normalizedBackendError.code;
          customError.backendError = normalizedBackendError.backendError;
          customError.response = { data: responseData };
          throw customError;
        }

        const fullAnalysis = responseData;

        logger.log('📥 [AppContext.analyzeDocument] Análisis recibido:', fullAnalysis);

        // 🛡️ VALIDACIÓN FLEXIBLE: Metadata puede estar en diferentes ubicaciones
        const hasValidMetadata = fullAnalysis && typeof fullAnalysis === 'object' &&
          (fullAnalysis.metadata || fullAnalysis.prelecture?.metadata);

        if (!hasValidMetadata) {
          logger.warn('⚠️ [AppContext] Análisis sin metadata válida, agregando estructura mínima');
          // Agregar metadata mínima en lugar de fallar
          fullAnalysis.metadata = {
            document_id: `doc_${Date.now()}`,
            analysis_timestamp: new Date().toISOString(),
            provider: 'backend',
            currentTextoId: effectiveId || currentTextoId, // 🆕 Para cache por textoId
            _fallback: true
          };
        } else {
          // 🆕 FIX: Normalizar metadata raíz si el backend devuelve metadata solo en prelecture
          if (!fullAnalysis.metadata && fullAnalysis.prelecture?.metadata) {
            fullAnalysis.metadata = { ...fullAnalysis.prelecture.metadata };
          }

          // 🆕 Asegurar que metadata incluya currentTextoId para cache (raíz y prelecture)
          if (fullAnalysis.metadata && !fullAnalysis.metadata.currentTextoId) {
            fullAnalysis.metadata.currentTextoId = effectiveId || currentTextoId;
          }
          if (fullAnalysis.prelecture?.metadata && !fullAnalysis.prelecture.metadata.currentTextoId) {
            fullAnalysis.prelecture.metadata.currentTextoId = effectiveId || currentTextoId;
          }

          // 🆕 FIX: Si ya tenemos análisis del backend, dejar de considerarlo preliminar
          if (fullAnalysis.metadata) fullAnalysis.metadata._isPreliminary = false;
          if (fullAnalysis.prelecture?.metadata) fullAnalysis.prelecture.metadata._isPreliminary = false;
        }

        // 🆕 A1-1 FIX: Verificar que el texto no cambió durante el análisis profundo
        const latestTextoId = currentTextoIdRef.current;

        // Guard: si el usuario cambió de lectura, descartar resultados (evita contaminación visual)
        if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
          logger.warn('⚠️ [AppContext] Resultado de análisis profundo obsoleto (cambio de lectura)');
          logger.warn(`   Análisis era para: ${capturedState.textoId}`);
          logger.warn(`   Lectura actual es: ${latestTextoId}`);
          logger.log('🚫 [AppContext] Descartando setCompleteAnalysis para evitar contaminación');
          return;
        }

        const currentDocId = completeAnalysisRef.current?.metadata?.document_id;
        if (originalDocId && currentDocId && originalDocId !== currentDocId) {
          logger.warn(`⚠️ [AppContext] A1-1 FIX: Race condition detectada! El texto cambió durante análisis.`);
          logger.warn(`   Original: ${originalDocId}, Actual: ${currentDocId}`);
          logger.log('🚫 [AppContext] Descartando análisis profundo obsoleto.');
          return; // No actualizar con análisis del texto anterior
        }

        setCompleteAnalysis(fullAnalysis);
        logger.log('✅ [AppContext.analyzeDocument] Análisis completo guardado en contexto');

        // 🆕 A6 FIX: Guardar en localStorage para persistencia entre recargas
        try {
          const cacheData = {
            analysis: fullAnalysis,
            timestamp: Date.now(),
            textLength: text.length
          };

          // 🆕 A6-1 FIX: LRU Cache - Limitar a 10 análisis en localStorage
          const ANALYSIS_CACHE_PREFIX = 'analysis_cache_';
          const MAX_CACHED_ANALYSES = 10;

          // Obtener todas las claves de análisis existentes
          const allCacheKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(ANALYSIS_CACHE_PREFIX)) {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                allCacheKeys.push({ key, timestamp: data.timestamp || 0 });
              } catch {
                allCacheKeys.push({ key, timestamp: 0 });
              }
            }
          }

          // Si hay más de MAX_CACHED_ANALYSES, eliminar los más antiguos
          if (allCacheKeys.length >= MAX_CACHED_ANALYSES) {
            allCacheKeys.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = allCacheKeys.slice(0, allCacheKeys.length - MAX_CACHED_ANALYSES + 1);
            toDelete.forEach(({ key }) => {
              localStorage.removeItem(key);
              logger.log(`🗑️ [AppContext] A6-1 FIX: Cache antiguo eliminado: ${key.substring(0, 30)}...`);
            });
          }

          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          logger.log(`💾 [AppContext] 🆕 A6: Análisis guardado en localStorage (clave: ${cacheKey.substring(0, 30)}...)`);
        } catch (cacheError) {
          // Si falla (quota exceeded, etc), no interrumpir el flujo
          logger.warn('⚠️ [AppContext] No se pudo guardar cache en localStorage:', cacheError.message);
        }

        // 🆕 CREAR SESIÓN después del análisis exitoso
        logger.log('💾 [AppContext.analyzeDocument] Creando sesión con análisis completo...');
        logger.log('🔍 [AppContext.analyzeDocument] text param length:', text?.length || 0);
        logger.log('🔍 [AppContext.analyzeDocument] texto state length:', texto?.length || 0);

        const currentId = getCurrentSessionId();
        // USAR EL PARÁMETRO 'text' EN LUGAR DEL ESTADO 'texto'
        // FIX: Asegurar que usamos el texto analizado para la sesión
        if (text && text.length > 0) {
          logger.log('🆕 [AppContext.analyzeDocument] Creando/Actualizando sesión con texto analizado...');
          try {
            // 🆕 FIX: Verificar que el usuario NO cambió de lectura durante el análisis
            if (capturedState.textoId !== currentTextoIdRef.current) {
              logger.warn('⚠️ [analyzeDocument] ¡Usuario cambió de lectura durante análisis!');
              logger.warn(`   Análisis era para: ${capturedState.textoId}`);
              logger.warn(`   Lectura actual es: ${currentTextoIdRef.current}`);
              logger.log('🚫 NO se guardará sesión para evitar contaminación');
              // Aún así actualizamos el localStorage cache con el textoId correcto
              // pero NO actualizamos la sesión activa
              return;
            }

            // 🆕 FIX: Usar valores CAPTURADOS, no del closure actual
            const sessionData = {
              texto: text,
              currentTextoId: capturedState.textoId,       // ✅ Capturado
              sourceCourseId: capturedState.courseId,      // ✅ NUEVO: Agregar courseId
              archivoActual: capturedState.archivoActual,  // ✅ Capturado
              completeAnalysis: fullAnalysis,
              rubricProgress: capturedState.rubricProgress, // ✅ Capturado
              savedCitations: capturedState.savedCitations, // ✅ Capturado
              modoOscuro: capturedState.modoOscuro          // ✅ Capturado
            };

            logger.log('💾 [analyzeDocument] Guardando sesión con datos capturados:');
            logger.log('   - textoId:', sessionData.currentTextoId);
            logger.log('   - courseId:', sessionData.sourceCourseId);

            if (currentId) {
              updateCurrentSession(sessionData, { syncToCloud: !cloudBackupWriteOnly });
              logger.log('✅ [AppContext.analyzeDocument] Sesión actual actualizada con análisis');
            } else {
              const session = createSessionFromState(sessionData, { syncToCloud: !cloudBackupWriteOnly });
              if (session) {
                logger.log('✅ [AppContext.analyzeDocument] Nueva sesión creada:', session.id);
              }
            }

            // Forzar actualización de UI
            window.dispatchEvent(new CustomEvent('session-updated'));

          } catch (sessionError) {
            logger.error('❌ [AppContext.analyzeDocument] Error gestionando sesión:', sessionError);
          }
        } else {
          logger.warn('⚠️ [AppContext.analyzeDocument] No hay texto válido para sesión (text length:', text?.length || 0, ')');
        }

      } catch (err) {
        logger.error('❌ [AppContext.analyzeDocument] Error en análisis completo:', err);

        // Si el usuario cambió de lectura, no aplicar fallback para evitar contaminación
        const latestTextoId = currentTextoIdRef.current;
        if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
          logger.warn('⚠️ [AppContext] Error de análisis profundo para lectura anterior; evitando fallback en lectura actual');
          return;
        }

        // Si ya existe un análisis (fase 1), NO bloquear Lectura Guiada por fallo en background
        const hasExistingAnalysis = !!completeAnalysisRef.current;
        if (!hasExistingAnalysis) {
          if (err.name === 'AbortError') {
            setError('El análisis tardó demasiado tiempo y fue cancelado');
            logger.error('❌ [AppContext.analyzeDocument] Timeout después de 2 minutos');
          } else {
            logger.error('❌ [AppContext.analyzeDocument] Stack:', err.stack);
            setError(`Error en análisis: ${err.message}`);
          }
        } else {
          logger.warn('⚠️ [AppContext.analyzeDocument] Error en análisis profundo (background). Se mantiene análisis previo.');
        }

        // Solo degradar a fallback mínimo si NO hay análisis previo (fase 1)
        if (!completeAnalysisRef.current) {
          if (err.response?.data?.fallback) {
            setCompleteAnalysis(err.response.data.fallback);
          } else {
            logger.log('🔧 [AppContext.analyzeDocument] Creando análisis fallback mínimo...');
            setCompleteAnalysis({
              metadata: {
                document_id: `fallback_${Date.now()}`,
                analysis_timestamp: new Date().toISOString(),
                error: true,
                errorMessage: err.message
              },
              prelecture: {
                metadata: {
                  document_id: `fallback_${Date.now()}`,
                  analysis_timestamp: new Date().toISOString(),
                  error: true,
                  errorMessage: err.message
                }
              },
              critical: null,
              _isFallback: true,
              _errorMessage: err.message
            });
          }
        }
      } finally {
        abortControl?.cleanup?.();
        // No setLoading(false) aquí porque ya se hizo en Fase 1
        logger.log('🏁 [AppContext.analyzeDocument] Fase 2 (análisis profundo) finalizada');
      }
    }; // Fin de enrichInBackground

    // 🆕 A1 FIX: Ejecutar análisis profundo en background (no esperamos)
    // 🆕 A1-1 FIX: Pasamos document ID para verificar race condition
    enrichInBackground(analysisDocumentId).catch(err => {
      logger.error('❌ [AppContext] Error en análisis profundo de background:', err);
    });

  }, [texto, archivoActual, rubricProgress, savedCitations, modoOscuro, setCompleteAnalysis, currentUser?.uid, isStudent]);

  // MEJORA: Añadir un efecto para actualizar la clase en el body y mejorar la consistencia del tema.
  useEffect(() => {
    const body = window.document.body;
    if (modoOscuro) {
      body.classList.add('modo-oscuro');
      body.setAttribute('data-theme', 'dark');
    } else {
      body.classList.remove('modo-oscuro');
      body.setAttribute('data-theme', 'light');
    }
  }, [modoOscuro]);

  // 🔥 SINCRONIZACIÓN FIREBASE: Cargar sesiones cuando el usuario hace login
  useEffect(() => {
    logger.log('🔍 [AppContext] useEffect Firebase sync ejecutado, currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');

    if (currentUser?.uid) {
      logger.log('🔄 [AppContext] Usuario autenticado detectado, sincronizando sesiones...');
      logger.log('👤 [AppContext] UID:', currentUser.uid);
      logger.log('👤 [AppContext] Email:', currentUser.email);
      logger.log('👤 [AppContext] Nombre:', userData?.nombre || 'sin nombre');

      // Establecer usuario en sessionManager
      setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);

      // Sincronizar sesiones locales → Firebase
      syncAllSessionsToCloud()
        .then(result => {
          logger.log(`✅ [AppContext] Sincronización completada: ${result.synced} sesiones subidas`);
          if (result.errors > 0) {
            logger.warn(`⚠️ [AppContext] ${result.errors} errores en sincronización`);
          }
        })
        .catch(error => {
          logger.error('❌ [AppContext] Error en sincronización inicial:', error);
        });

      // Nota: No necesitamos cargar sesiones aquí porque getAllSessionsMerged()
      // ya combina automáticamente localStorage + Firestore cuando se llama
      // desde el componente HistorialSesiones

    } else if (currentUser === null) {
      // Usuario deslogueado, limpiar referencia
      logger.log('🔒 [AppContext] Usuario deslogueado, limpiando referencia');
      setSessionManagerUser(null, null);
    } else {
      logger.log('⏳ [AppContext] currentUser es undefined, esperando...');
    }
  }, [currentUser, userData, currentTextoId, saveGlobalProgress]);

  // 🔐 SESIÓN ÚNICA: Control de sesiones activas por usuario (Extracted to Hook)
  const { sessionConflict, conflictingSessionInfo } = useSessionMaintenance(currentUser, userData);

  // 🆕 LISTENER EN TIEMPO REAL: Sincronizar progreso desde Firestore
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role) return;

    // Rollout seguro: si el hook está activo, evitamos doble listener.
    if (useFirestorePersistenceHook) return;

    // Solo para estudiantes (docentes no tienen progreso individual)
    if (userData.role !== 'estudiante') return;

    logger.log('👂 [AppContext] Iniciando listener de progreso en tiempo real...');

    // Marcar que Firebase está cargando (para RewardsEngine)
    if (typeof window !== 'undefined') {
      window.__firebaseUserLoading = true;
    }

    let unsubscribe = null;
    let mounted = true;

    // Helper: resumen de entregas de artefactos para merges
    const getArtifactsStats = (docProgress) => {
      const artifacts = docProgress?.artifacts || {};
      let submittedCount = 0;
      let latestSubmittedAt = 0;

      Object.values(artifacts).forEach((a) => {
        if (a?.submitted) {
          submittedCount += 1;
          latestSubmittedAt = Math.max(latestSubmittedAt, a.submittedAt || 0);
        }
      });

      return { submittedCount, latestSubmittedAt };
    };

    const progressDocId = currentTextoId || 'global_progress';

    // 1️⃣ CARGA INICIAL INMEDIATA desde Firestore
    const loadInitialProgress = async () => {
      try {
        logger.log('📥 [AppContext] Cargando progreso inicial desde Firestore...');
        const initialData = await getStudentProgress(
          currentUser.uid,
          progressDocId,
          resolveProgressCourseScope(progressDocId, sourceCourseIdRef.current)
        );

        if (!mounted) return;
        if (!initialData) {
          // 🛡️ FIX CROSS-COURSE: Sin datos iniciales → limpiar estado para evitar herencia del curso anterior
          logger.log('ℹ️ [AppContext] No hay datos iniciales en Firestore, reseteando estado');
          setRubricProgress(emptyRubricProgress);
          setActivitiesProgress({});
          if (typeof window !== 'undefined') {
            window.__firebaseUserLoading = false;
          }
          return;
        }

        logger.log('✅ [AppContext] Datos iniciales cargados desde Firestore');

        // 🔄 DETECTAR RESET: Si lastResetAt existe, limpiar datos locales ANTES del merge
        if (initialData.lastResetAt) {
          const resetTime = initialData.lastResetAt?.seconds
            ? initialData.lastResetAt.seconds * 1000
            : (typeof initialData.lastResetAt === 'number' ? initialData.lastResetAt : 0);

          if (resetTime > 0) {
            logger.log('🔄 [AppContext] RESET DETECTADO en carga inicial - limpiando datos locales...');

            // Limpiar localStorage (usar progressLocalKey con scope de curso)
            const rubricKey = rubricProgressKey(currentUser.uid, progressDocId, sourceCourseIdRef.current);
            const activitiesKey = activitiesProgressKey(
              currentUser.uid,
              progressDocId,
              resolveProgressCourseScope(progressDocId, sourceCourseIdRef.current)
            );
            const legacyRubricKey = rubricProgressKey(currentUser.uid, progressDocId);
            const legacyActivitiesKey = activitiesProgressKey(currentUser.uid, progressDocId);
            localStorage.removeItem(rubricKey);
            localStorage.removeItem(activitiesKey);
            localStorage.removeItem(legacyRubricKey);
            localStorage.removeItem(legacyActivitiesKey);

            // Limpiar cualquier key relacionada
            Object.keys(localStorage).forEach(k => {
              const isProgressKey = k === rubricKey ||
                k === activitiesKey ||
                k === legacyRubricKey ||
                k === legacyActivitiesKey;
              if (isProgressKey || isActivityStorageKeyForLecture(k, progressDocId, sourceCourseIdRef.current)) {
                localStorage.removeItem(k);
                logger.log('🧹 [AppContext] Limpiado localStorage key:', k);
              }
            });

            // Aplicar datos reseteados de Firestore directamente (sin merge)
            if (initialData.rubricProgress) {
              setRubricProgress(normalizeRubricProgress(initialData.rubricProgress));
              logger.log('✅ [AppContext] rubricProgress reemplazado tras reset (carga inicial)');
            } else {
              setRubricProgress(emptyRubricProgress);
            }

            if (initialData.activitiesProgress) {
              setActivitiesProgress(initialData.activitiesProgress);
              logger.log('✅ [AppContext] activitiesProgress reemplazado tras reset (carga inicial)');
            } else {
              setActivitiesProgress({});
            }

            // Emitir evento para que componentes UI se actualicen
            window.dispatchEvent(new CustomEvent('progress-reset-from-teacher', {
              detail: { type: 'full-reset', timestamp: resetTime }
            }));

            // Marcar que Firebase terminó de cargar
            if (typeof window !== 'undefined') {
              window.__firebaseUserLoading = false;
            }

            return; // Salir temprano, no hacer merge
          }
        }

        // 🔄 También detectar reset parcial en artefactos individuales
        const checkArtifactResets = (activitiesData) => {
          if (!activitiesData) return { hasResets: false, resetArtifacts: [] };

          const resetArtifacts = [];
          Object.keys(activitiesData).forEach(docId => {
            const doc = activitiesData[docId];
            const artifacts = doc?.artifacts || {};
            Object.keys(artifacts).forEach(artifactName => {
              const artifact = artifacts[artifactName];
              if (artifact?.resetBy === 'docente' && artifact?.submitted === false) {
                resetArtifacts.push({ docId, artifactName, artifact });
              }
            });
          });

          return { hasResets: resetArtifacts.length > 0, resetArtifacts };
        };

        const { hasResets, resetArtifacts } = checkArtifactResets(initialData.activitiesProgress);
        if (hasResets) {
          logger.log('🔄 [AppContext] Reset parcial detectado en artefactos:', resetArtifacts);

          // Limpiar localStorage para actividades (con scope de curso)
          const activitiesKey = activitiesProgressKey(
            currentUser.uid,
            progressDocId,
            resolveProgressCourseScope(progressDocId, sourceCourseIdRef.current)
          );
          localStorage.removeItem(activitiesKey);

          // Aplicar activitiesProgress de Firestore directamente
          setActivitiesProgress(initialData.activitiesProgress);

          // También actualizar rubricProgress correspondiente
          if (initialData.rubricProgress) {
            setRubricProgress(normalizeRubricProgress(initialData.rubricProgress));
          }

          window.dispatchEvent(new CustomEvent('progress-reset-from-teacher', {
            detail: { type: 'artifact-reset', artifacts: resetArtifacts }
          }));

          // Marcar que Firebase terminó de cargar
          if (typeof window !== 'undefined') {
            window.__firebaseUserLoading = false;
          }

          return; // Salir temprano
        }

        // Nota: rewardsState se carga/escucha desde global_progress en un efecto separado.

        // Marcar que Firebase terminó de cargar
        if (typeof window !== 'undefined') {
          window.__firebaseUserLoading = false;
        }

        // 📊 Cargar rubricProgress (MERGE INTELIGENTE)
        if (initialData.rubricProgress && Object.keys(initialData.rubricProgress).length > 0) {
          logger.log('📊 [Carga Inicial] Cargando rubricProgress desde Firebase (Merge con local)');

          setRubricProgress(prevLocal => {
            const normalizedRemote = normalizeRubricProgress(initialData.rubricProgress);
            const normalizedLocal = normalizeRubricProgress(prevLocal);
            const mergedRubrics = { ...normalizedLocal };
            let hasChanges = false;

            Object.keys(normalizedRemote).forEach(rubricId => {
              const remoteRubric = normalizedRemote[rubricId];
              const localRubric = normalizedLocal[rubricId];

              // Si no existe localmente, agregar directamente
              if (!localRubric || !localRubric.lastUpdate) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                return;
              }

              // ESTRATEGIA: Score más alto gana, timestamp como desempate
              // ✅ Esquema actual: { scores: [], average, lastUpdate, artefactos }
              const remoteAvg = remoteRubric?.average || 0;
              const localAvg = localRubric?.average || 0;
              const remoteTimestamp = remoteRubric?.lastUpdate || 0;
              const localTimestamp = localRubric?.lastUpdate || 0;
              const remoteScoresLen = Array.isArray(remoteRubric?.scores) ? remoteRubric.scores.length : 0;
              const localScoresLen = Array.isArray(localRubric?.scores) ? localRubric.scores.length : 0;

              // Prioridad: más scores (más intentos), luego promedio, luego timestamp
              if (remoteScoresLen > localScoresLen) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
              } else if (remoteScoresLen === localScoresLen && remoteAvg > localAvg) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
              } else if (remoteScoresLen === localScoresLen && remoteAvg === localAvg && remoteTimestamp > localTimestamp) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
              }
            });

            if (hasChanges) {
              lastRubricProgressFromCloudAtRef.current = Date.now();
              return normalizeRubricProgress(mergedRubrics);
            }

            return normalizedLocal;
          });
        }

        // 🎯 Cargar activitiesProgress (MERGE INTELIGENTE)
        if (initialData.activitiesProgress && Object.keys(initialData.activitiesProgress).length > 0) {
          logger.log('🎯 [Carga Inicial] Cargando activitiesProgress desde Firebase (Merge con local)');

          setActivitiesProgress(prevLocal => {
            const mergedActivities = { ...prevLocal };
            let hasChanges = false;

            Object.keys(initialData.activitiesProgress).forEach(docId => {
              const remoteDoc = initialData.activitiesProgress[docId];
              const localDoc = prevLocal[docId];

              // Si no existe localmente, agregar directamente
              if (!localDoc || !localDoc.preparation?.updatedAt) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                return;
              }

              const remoteTimestamp = remoteDoc.preparation?.updatedAt || 0;
              const localTimestamp = localDoc.preparation?.updatedAt || 0;
              const remoteCompleteness = Object.keys(remoteDoc.preparation || {}).length;
              const localCompleteness = Object.keys(localDoc.preparation || {}).length;

              const remoteArtifacts = getArtifactsStats(remoteDoc);
              const localArtifacts = getArtifactsStats(localDoc);

              // ESTRATEGIA: Más artefactos entregados gana; luego más completa; timestamp como desempate
              if (remoteArtifacts.submittedCount > localArtifacts.submittedCount) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness > localCompleteness) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness === localCompleteness) {
                const remoteTs = Math.max(remoteTimestamp, remoteArtifacts.latestSubmittedAt);
                const localTs = Math.max(localTimestamp, localArtifacts.latestSubmittedAt);
                if (remoteTs > localTs) {
                  mergedActivities[docId] = remoteDoc;
                  hasChanges = true;
                }
              }
            });

            if (hasChanges) {
              lastActivitiesProgressFromCloudAtRef.current = Date.now();
              return mergedActivities;
            }

            return prevLocal;
          });
        }
      } catch (error) {
        logger.error('❌ [AppContext] Error cargando progreso inicial:', error);

        // FALLBACK: Intentar rehidratar desde airbag local (firestore_backup_*) con scope de curso
        const backup = readFirestoreBackup(currentUser.uid, progressLocalKey);
        if (backup) {
          logger.log('📦 [AppContext] Usando firestore_backup_* como fallback de progreso');

          // 🔧 CRITICAL FIX: Si el backup tiene lastResetAt, verificar que no sea data pre-reset.
          // Si hay un reset reciente, NO aplicar backup — los datos están reseteados en Firestore
          // y el backup local puede contener datos antiguos (pre-reset).
          const backupResetAt = (() => {
            const lr = backup.lastResetAt;
            if (!lr) return 0;
            if (lr?.seconds) return lr.seconds * 1000;
            if (typeof lr === 'number') return lr;
            return 0;
          })();

          // También verificar si alguna rúbrica tiene resetBy='docente'
          const hasResetByDocente = backup.rubricProgress
            ? Object.values(backup.rubricProgress).some(r => r?.resetBy === 'docente')
            : false;

          if (backupResetAt > 0 || hasResetByDocente) {
            logger.log('🛡️ [AppContext] Backup tiene marcas de reset de docente — aplicando datos reseteados del backup');
            // Aplicar los datos del backup tal cual (ya contienen el estado reseteado)
            if (backup.rubricProgress) {
              lastRubricProgressFromCloudAtRef.current = Date.now();
              setRubricProgress(normalizeRubricProgress(backup.rubricProgress));
            }
            if (backup.activitiesProgress) {
              lastActivitiesProgressFromCloudAtRef.current = Date.now();
              setActivitiesProgress(backup.activitiesProgress);
            }
          } else {
            // Sin reset — merge normal con datos locales
            if (backup.rubricProgress && Object.keys(backup.rubricProgress).length > 0) {
              lastRubricProgressFromCloudAtRef.current = Date.now();
              setRubricProgress(prevLocal => ({
                ...normalizeRubricProgress(prevLocal),
                ...normalizeRubricProgress(backup.rubricProgress)
              }));
            }

            if (backup.activitiesProgress && Object.keys(backup.activitiesProgress).length > 0) {
              lastActivitiesProgressFromCloudAtRef.current = Date.now();
              setActivitiesProgress(prevLocal => ({
                ...prevLocal,
                ...backup.activitiesProgress
              }));
            }
          }
        }

        // FALLBACK EN ERROR: Intentar cargar caché local
        if (window.__rewardsEngine) {
          logger.log('⚠️ [AppContext] Error en Firebase, usando caché local para rewards...');
          window.__rewardsEngine.loadFromCache();
        }
      }
    };

    loadInitialProgress();

    // 2️⃣ Suscribirse a cambios en progreso del estudiante (por texto si existe)
    unsubscribe = subscribeToStudentProgress(
      currentUser.uid,
      progressDocId,
      async (progressData) => {
        if (!mounted) return;
        if (!progressData) {
          logger.log('ℹ️ [AppContext] No hay progreso remoto aún');
          return;
        }

        logger.log('📥 [AppContext] Progreso recibido desde Firestore (realtime):', progressData);

        // 🔄 DETECTAR RESET EN TIEMPO REAL: Si lastResetAt existe, aplicar reset inmediato
        // ⚠️ Solo procesar si es un reset NUEVO (no ya procesado)
        if (progressData.lastResetAt) {
          const resetTime = progressData.lastResetAt?.seconds
            ? progressData.lastResetAt.seconds * 1000
            : (typeof progressData.lastResetAt === 'number' ? progressData.lastResetAt : 0);

          // 🆕 FIX: Solo procesar si este reset es MÁS RECIENTE que el último procesado
          if (resetTime > 0 && resetTime > lastProcessedResetTimeRef.current) {
            logger.log('🔄 [AppContext] RESET NUEVO DETECTADO en tiempo real - aplicando cambios...', {
              resetTime,
              lastProcessed: lastProcessedResetTimeRef.current
            });

            // Marcar como procesado ANTES de aplicar para evitar re-entradas
            lastProcessedResetTimeRef.current = resetTime;

            // Limpiar localStorage (con scope de curso)
            const rubricKey = rubricProgressKey(currentUser.uid, progressDocId, sourceCourseIdRef.current);
            const activitiesKey = activitiesProgressKey(
              currentUser.uid,
              progressDocId,
              resolveProgressCourseScope(progressDocId, sourceCourseIdRef.current)
            );
            localStorage.removeItem(rubricKey);
            localStorage.removeItem(activitiesKey);

            // 🔧 CRITICAL FIX: También limpiar el firestore_backup_* para evitar que
            // restaure datos pre-reset si Firestore falla en la próxima carga
            try {
              const backupKey = `firestore_backup_${currentUser.uid}_${progressLocalKey}`;
              localStorage.removeItem(backupKey);
              logger.log('🧹 [AppContext] firestore_backup limpiado tras reset de docente');
            } catch (e) {
              // Silencioso
            }

            // Limpiar cualquier key de activity_results_ relacionada
            Object.keys(localStorage).forEach(k => {
              if (isActivityStorageKeyForLecture(k, progressDocId, sourceCourseIdRef.current)) {
                localStorage.removeItem(k);
              }
            });

            // Aplicar datos reseteados directamente
            if (progressData.rubricProgress) {
              setRubricProgress(normalizeRubricProgress(progressData.rubricProgress));
            } else {
              setRubricProgress(emptyRubricProgress);
            }

            if (progressData.activitiesProgress) {
              setActivitiesProgress(progressData.activitiesProgress);
            } else {
              setActivitiesProgress({});
            }

            window.dispatchEvent(new CustomEvent('progress-reset-from-teacher', {
              detail: { type: 'realtime-reset', timestamp: resetTime }
            }));

            logger.log('✅ [AppContext] Reset aplicado desde evento en tiempo real');
            return; // Salir, no hacer merge normal
          }
        }

        // 🔄 También detectar reset parcial en artefactos individuales
        const checkArtifactResets = (activitiesData) => {
          if (!activitiesData) return { hasResets: false, resetArtifacts: [] };

          const resetArtifacts = [];
          Object.keys(activitiesData).forEach(docId => {
            const doc = activitiesData[docId];
            const artifacts = doc?.artifacts || {};
            Object.keys(artifacts).forEach(artifactName => {
              const artifact = artifacts[artifactName];
              if (artifact?.resetBy === 'docente' && artifact?.submitted === false) {
                resetArtifacts.push({ docId, artifactName, artifact });
              }
            });
          });

          return { hasResets: resetArtifacts.length > 0, resetArtifacts };
        };

        const { hasResets, resetArtifacts } = checkArtifactResets(progressData.activitiesProgress);
        if (hasResets) {
          logger.log('🔄 [AppContext] Reset parcial detectado en artefactos (realtime):', resetArtifacts);

          // Aplicar activitiesProgress de Firestore directamente
          setActivitiesProgress(progressData.activitiesProgress);

          // También actualizar rubricProgress correspondiente
          if (progressData.rubricProgress) {
            setRubricProgress(normalizeRubricProgress(progressData.rubricProgress));
          }

          window.dispatchEvent(new CustomEvent('progress-reset-from-teacher', {
            detail: { type: 'artifact-reset-realtime', artifacts: resetArtifacts }
          }));

          logger.log('✅ [AppContext] Reset parcial aplicado');
          return; // Salir
        }

        // 🔄 MERGE INTELIGENTE: Combinar datos remotos con locales (flujo normal sin reset)
        // ESTRATEGIA: CONCATENAR scores únicos, no elegir uno u otro

        // Actualizar rubricProgress: CONCATENAR scores por timestamp único
        if (progressData.rubricProgress) {
          setRubricProgress(prevLocal => {
            const normalizedRemote = normalizeRubricProgress(progressData.rubricProgress);
            const normalizedLocal = normalizeRubricProgress(prevLocal);
            const mergedRubrics = { ...normalizedLocal };
            let hasChanges = false;

            Object.keys(normalizedRemote).forEach(rubricId => {
              const remoteRubric = normalizedRemote[rubricId];
              const localRubric = normalizedLocal[rubricId];

              // 🔧 CRITICAL FIX: Si la rúbrica remota tiene resetAt + resetBy='docente',
              // SIEMPRE usar la versión remota y descartar datos locales (son pre-reset)
              if (remoteRubric?.resetAt && remoteRubric?.resetBy === 'docente') {
                logger.log(`🛡️ [Sync] ${rubricId}: Rúbrica reseteada por docente — usando datos remotos (reseteados)`);
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                return;
              }

              // Si no existe localmente, agregar directamente
              if (!localRubric || !localRubric.scores || localRubric.scores.length === 0) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                logger.log(`📊 [Sync] ${rubricId}: Datos remotos agregados (no existía local)`);
                return;
              }

              // 🔧 CONCATENAR scores únicos por timestamp
              const localScores = localRubric.scores || [];
              const remoteScores = remoteRubric.scores || [];

              // Crear Set de timestamps locales para detectar duplicados
              const localTimestamps = new Set(localScores.map(s => s.timestamp));

              // Filtrar scores remotos que no existen localmente
              const newRemoteScores = remoteScores.filter(s => !localTimestamps.has(s.timestamp));

              if (newRemoteScores.length > 0) {
                // Combinar y ordenar por timestamp
                const combinedScores = [...localScores, ...newRemoteScores]
                  .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                // Recalcular promedio con últimos 3
                const recentScores = combinedScores.slice(-3);
                const newAverage = recentScores.length > 0
                  ? Math.round((recentScores.reduce((sum, s) => sum + (s.score || 0), 0) / recentScores.length) * 10) / 10
                  : 0;

                // Combinar artefactos únicos
                const combinedArtefactos = [...new Set([
                  ...(localRubric.artefactos || []),
                  ...(remoteRubric.artefactos || [])
                ])];

                const localSummativeTs =
                  (localRubric?.summative?.gradedAt || localRubric?.summative?.submittedAt || 0) || 0;
                const remoteSummativeTs =
                  (remoteRubric?.summative?.gradedAt || remoteRubric?.summative?.submittedAt || 0) || 0;

                const pickedSummative =
                  remoteSummativeTs > localSummativeTs ? remoteRubric?.summative : localRubric?.summative;

                const finalScore =
                  pickedSummative && pickedSummative.score != null
                    ? Number(pickedSummative.score)
                    : (localRubric?.finalScore != null ? Number(localRubric.finalScore) : (remoteRubric?.finalScore != null ? Number(remoteRubric.finalScore) : null));

                const certified = Number.isFinite(finalScore) ? finalScore >= 6 : Boolean(localRubric?.certified || remoteRubric?.certified);

                mergedRubrics[rubricId] = {
                  ...localRubric,
                  ...remoteRubric,
                  formative: {
                    ...(localRubric.formative || {}),
                    ...(remoteRubric.formative || {}),
                    scores: combinedScores,
                    average: newAverage,
                    attempts: combinedScores.length,
                    lastUpdate: Math.max(localRubric.lastUpdate || 0, remoteRubric.lastUpdate || 0),
                    artefactos: combinedArtefactos
                  },
                  summative: pickedSummative ?? localRubric?.summative ?? remoteRubric?.summative ?? null,
                  finalScore,
                  certified,
                  // compat legacy mirror
                  scores: combinedScores,
                  average: newAverage,
                  lastUpdate: Math.max(localRubric.lastUpdate || 0, remoteRubric.lastUpdate || 0),
                  artefactos: combinedArtefactos
                };

                hasChanges = true;
                logger.log(`📊 [Sync] ${rubricId}: Concatenados ${newRemoteScores.length} scores remotos (total: ${combinedScores.length})`);
              } else {
                logger.log(`📊 [Sync] ${rubricId}: Sin scores nuevos desde remoto`);
              }
            });

            if (hasChanges) {
              logger.log('✅ [Sync] rubricProgress actualizado desde Firestore');
              lastRubricProgressFromCloudAtRef.current = Date.now();
              // Emitir evento para que componentes UI se actualicen
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'rubricProgress', timestamp: Date.now() }
              }));
              return normalizeRubricProgress(mergedRubrics);
            }

            return normalizedLocal; // Sin cambios
          });
        }

        // Actualizar activitiesProgress: PRIORIZAR MÁS COMPLETA + timestamp
        if (progressData.activitiesProgress) {
          setActivitiesProgress(prevLocal => {
            const mergedActivities = { ...prevLocal };
            let hasChanges = false;

            Object.keys(progressData.activitiesProgress).forEach(docId => {
              const remoteDoc = progressData.activitiesProgress[docId];
              const localDoc = prevLocal[docId];

              // Si no existe localmente, agregar directamente
              if (!localDoc || !localDoc.preparation?.updatedAt) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                logger.log(`🎯 [Sync] ${docId}: Actividad remota agregada (no existía local)`);
                return;
              }

              const remoteTimestamp = remoteDoc.preparation?.updatedAt || 0;
              const localTimestamp = localDoc.preparation?.updatedAt || 0;
              const remoteCompleteness = Object.keys(remoteDoc.preparation || {}).length;
              const localCompleteness = Object.keys(localDoc.preparation || {}).length;

              const remoteArtifacts = getArtifactsStats(remoteDoc);
              const localArtifacts = getArtifactsStats(localDoc);

              // ESTRATEGIA: Más artefactos entregados gana; luego más completa; timestamp como desempate
              if (remoteArtifacts.submittedCount > localArtifacts.submittedCount) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                logger.log(`🎯 [Sync] ${docId}: Remota tiene más artefactos entregados (${remoteArtifacts.submittedCount} > ${localArtifacts.submittedCount})`);
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness > localCompleteness) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                logger.log(`🎯 [Sync] ${docId}: Remota más completa (${remoteCompleteness} campos > ${localCompleteness})`);
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness === localCompleteness) {
                const remoteTs = Math.max(remoteTimestamp, remoteArtifacts.latestSubmittedAt);
                const localTs = Math.max(localTimestamp, localArtifacts.latestSubmittedAt);

                if (remoteTs > localTs) {
                  mergedActivities[docId] = remoteDoc;
                  hasChanges = true;
                  logger.log(`🎯 [Sync] ${docId}: Remota más reciente (${new Date(remoteTs).toLocaleTimeString()})`);
                } else {
                  logger.log(`🎯 [Sync] ${docId}: Local más completa o igual, manteniendo`);
                }
              } else {
                logger.log(`🎯 [Sync] ${docId}: Local más completa o igual, manteniendo`);
              }
            });

            if (hasChanges) {
              logger.log('✅ [Sync] activitiesProgress actualizado desde Firestore');
              lastActivitiesProgressFromCloudAtRef.current = Date.now();
              // Emitir evento para que componentes UI se actualicen
              window.dispatchEvent(new CustomEvent('progress-synced-from-cloud', {
                detail: { type: 'activitiesProgress', timestamp: Date.now() }
              }));
              return mergedActivities;
            }

            return prevLocal; // Sin cambios
          });
        }

        // Nota: rewardsState se maneja en un listener dedicado a global_progress.
      },
      resolveProgressCourseScope(progressDocId, sourceCourseIdRef.current)  // 🔧 FIX CROSS-COURSE: Suscribirse al doc con scope efectivo
    );

    logger.log('✅ [AppContext] Listener de tiempo real activo');

    // Cleanup al desmontar o cambiar usuario
    return () => {
      mounted = false;
      logger.log('🔌 [AppContext] Desconectando listener de progreso');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, userData, currentTextoId, sourceCourseId, readFirestoreBackup, useFirestorePersistenceHook, resolveProgressCourseScope, isActivityStorageKeyForLecture]);

  // 🎮 LISTENER GLOBAL: Puntos/logros SIEMPRE desde global_progress
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role) return;
    if (userData.role !== 'estudiante') return;

    logger.log('👂 [AppContext] Iniciando listener global de rewardsState (global_progress)...');

    let mounted = true;
    let unsubscribe = null;

    const loadInitialRewards = async () => {
      try {
        const globalData = await getStudentProgress(currentUser.uid, 'global_progress');
        if (!mounted) return;

        if (!window.__rewardsEngine) return;

        // 🧩 Merge seguro: no pisar puntos locales más nuevos/mayores con estado remoto stale
        const localRewardsState = window.__rewardsEngine.exportState();
        const remoteState = globalData?.rewardsState;

        if (remoteState) {
          const remotePoints = remoteState.totalPoints || 0;
          const localPoints = localRewardsState.totalPoints || 0;
          const remoteTimestamp = remoteState.lastInteraction || remoteState.lastUpdate || 0;
          const localTimestamp = localRewardsState.lastInteraction || localRewardsState.lastUpdate || 0;
          const TIME_TOLERANCE = 2000;

          // 🆕 FIX: Si local tiene resetAt reciente, SIEMPRE preferir local (reset intencional)
          const localResetAt = localRewardsState.resetAt || 0;
          const remoteResetAt = remoteState.resetAt || 0;

          // Solo considerar "reset reciente" si:
          // 1. Local tiene un resetAt válido (> 0) - evita falsos positivos después de logout
          // 2. Local resetAt es más reciente que el remoto
          // 3. El reset fue hace menos de 10 segundos
          const localWasResetRecently = localResetAt > 0 && localResetAt > remoteResetAt && (Date.now() - localResetAt) < 10000;

          if (localWasResetRecently) {
            logger.log('🛡️ [AppContext] Reset local reciente detectado, ignorando estado remoto');
            // Subir el estado reseteado a Firestore
            const currentRewardsState = window.__rewardsEngine.exportState();
            Promise.resolve(saveGlobalProgress({
              rewardsState: currentRewardsState,
              lastSync: new Date().toISOString(),
              syncType: 'reset_preserve'
            })).catch(() => { });
          } else {
            // 🆕 FIX: Si local no tiene datos válidos (resetAt=0 o puntos=0), preferir remoto
            const localIsEmpty = localResetAt === 0 || (localPoints === 0 && remotePoints > 0);
            if (localIsEmpty && remotePoints > 0) {
              logger.log('✅ [AppContext] Estado local vacío, cargando desde Firestore:', remotePoints, 'pts');
              lastRewardsStateFromCloudAtRef.current = Date.now();
              window.__rewardsEngine.importState(remoteState, false);
            } else {
              // 🆕 FIX: Si ambos tienen el mismo resetAt pero local tiene más puntos, NO sobrescribir
              const sameResetEpoch = localResetAt === remoteResetAt && localResetAt > 0;
              if (sameResetEpoch && localPoints > remotePoints) {
                logger.log('🛡️ [AppContext] Local tiene más puntos en mismo epoch de reset, subiendo a Firestore');
                const currentRewardsState = window.__rewardsEngine.exportState();
                Promise.resolve(saveGlobalProgress({
                  rewardsState: currentRewardsState,
                  lastSync: new Date().toISOString(),
                  syncType: 'initial_local_more_same_reset'
                })).catch(() => { });
              } else {
                const remoteIsNewer = remoteTimestamp > (localTimestamp + TIME_TOLERANCE);
                const localIsNewer = localTimestamp > (remoteTimestamp + TIME_TOLERANCE);
                const remoteHasMoreProgress = remotePoints > localPoints;
                const localHasMoreProgress = localPoints > remotePoints;

                if (remoteIsNewer || remoteHasMoreProgress) {
                  lastRewardsStateFromCloudAtRef.current = Date.now();
                  window.__rewardsEngine.importState(remoteState, false);
                } else if (localIsNewer || localHasMoreProgress) {
                  // Subir local si el remoto está atrasado (por ejemplo, navegación antes de debounce)
                  const currentRewardsState = window.__rewardsEngine.exportState();
                  Promise.resolve(saveGlobalProgress({
                    rewardsState: currentRewardsState,
                    lastSync: new Date().toISOString(),
                    syncType: 'initial_local_preferred'
                  })).catch(() => { });
                }
              }
            }
          }
        } else {
          window.__rewardsEngine.loadFromCache();
        }

        const safe = window.__rewardsEngine.exportState();
        window.dispatchEvent(new CustomEvent('rewards-state-changed', {
          detail: {
            totalPoints: safe.totalPoints,
            availablePoints: safe.availablePoints
          }
        }));
      } catch (error) {
        logger.error('❌ [AppContext] Error cargando rewardsState inicial (global_progress):', error);
        if (window.__rewardsEngine) {
          window.__rewardsEngine.loadFromCache();
        }
      }
    };

    loadInitialRewards();

    unsubscribe = subscribeToStudentProgress(
      currentUser.uid,
      'global_progress',
      async (progressData) => {
        if (!mounted) return;
        if (!progressData?.rewardsState) return;

        if (!window.__rewardsEngine) {
          setTimeout(() => {
            if (!mounted) return;
            if (window.__rewardsEngine) {
              lastRewardsStateFromCloudAtRef.current = Date.now();
              window.__rewardsEngine.importState(progressData.rewardsState, false);
              const safe = window.__rewardsEngine.exportState();
              window.dispatchEvent(new CustomEvent('rewards-state-changed', {
                detail: {
                  totalPoints: safe.totalPoints,
                  availablePoints: safe.availablePoints
                }
              }));
            }
          }, 500);
          return;
        }

        try {
          const localRewardsState = window.__rewardsEngine.exportState();
          const remoteState = progressData.rewardsState;

          const remotePoints = remoteState.totalPoints || 0;
          const localPoints = localRewardsState.totalPoints || 0;
          // 🧩 FASE 4 HARDEN: soportar esquemas legacy (lastUpdate) y nuevo (lastInteraction)
          const remoteTimestamp = remoteState.lastInteraction || remoteState.lastUpdate || 0;
          const localTimestamp = localRewardsState.lastInteraction || localRewardsState.lastUpdate || 0;

          const TIME_TOLERANCE = 2000;

          // 🆕 FIX: Si local tiene resetAt reciente, SIEMPRE preferir local (reset intencional)
          const localResetAt = localRewardsState.resetAt || 0;
          const remoteResetAt = remoteState.resetAt || 0;

          // Solo considerar "reset reciente" si resetAt local es válido (> 0)
          const localWasResetRecently = localResetAt > 0 && localResetAt > remoteResetAt && (Date.now() - localResetAt) < 10000;

          if (localWasResetRecently) {
            logger.log('🛡️ [AppContext] Listener: Reset local reciente detectado, ignorando estado remoto');
            return; // No hacer nada, el reset ya sincronizó
          }

          // 🆕 FIX: Si local está vacío (resetAt=0 después de logout), preferir remoto
          const localIsEmpty = localResetAt === 0 || (localPoints === 0 && remotePoints > 0);
          if (localIsEmpty && remotePoints > 0) {
            logger.log('✅ [AppContext] Listener: Estado local vacío, cargando desde Firestore:', remotePoints, 'pts');
            lastRewardsStateFromCloudAtRef.current = Date.now();
            window.__rewardsEngine.importState(remoteState, false);
            const safe = window.__rewardsEngine.exportState();
            window.dispatchEvent(new CustomEvent('rewards-state-changed', {
              detail: {
                totalPoints: safe.totalPoints,
                availablePoints: safe.availablePoints
              }
            }));
            return;
          }

          // 🆕 FIX: Si ambos tienen el mismo resetAt pero local tiene más puntos, NO sobrescribir
          // Esto evita que el estado reseteado (0 pts) sobrescriba puntos ganados después del reset
          const sameResetEpoch = localResetAt === remoteResetAt && localResetAt > 0;
          if (sameResetEpoch && localPoints > remotePoints) {
            logger.log('🛡️ [AppContext] Listener: Local tiene más puntos en mismo epoch de reset, subiendo a Firestore');
            const currentRewardsState = window.__rewardsEngine.exportState();
            await saveGlobalProgress({
              rewardsState: currentRewardsState,
              lastSync: new Date().toISOString(),
              syncType: 'local_more_progress_same_reset'
            });
            return;
          }

          const remoteIsNewer = remoteTimestamp > (localTimestamp + TIME_TOLERANCE);
          const localIsNewer = localTimestamp > (remoteTimestamp + TIME_TOLERANCE);
          const remoteHasMoreProgress = remotePoints > localPoints;
          const localHasMoreProgress = localPoints > remotePoints;

          if (remoteIsNewer) {
            lastRewardsStateFromCloudAtRef.current = Date.now();
            window.__rewardsEngine.importState(remoteState, false);
            const safe = window.__rewardsEngine.exportState();
            window.dispatchEvent(new CustomEvent('rewards-state-changed', {
              detail: {
                totalPoints: safe.totalPoints,
                availablePoints: safe.availablePoints
              }
            }));
          } else if (localIsNewer) {
            const currentRewardsState = window.__rewardsEngine.exportState();
            await saveGlobalProgress({
              rewardsState: currentRewardsState,
              lastSync: new Date().toISOString(),
              syncType: 'local_newer'
            });
          } else {
            if (remoteHasMoreProgress) {
              lastRewardsStateFromCloudAtRef.current = Date.now();
              window.__rewardsEngine.importState(remoteState, false);
              const safe = window.__rewardsEngine.exportState();
              window.dispatchEvent(new CustomEvent('rewards-state-changed', {
                detail: {
                  totalPoints: safe.totalPoints,
                  availablePoints: safe.availablePoints
                }
              }));
            } else if (localHasMoreProgress) {
              const currentRewardsState = window.__rewardsEngine.exportState();
              await saveGlobalProgress({
                rewardsState: currentRewardsState,
                lastSync: new Date().toISOString(),
                syncType: 'local_more_progress'
              });
            }
          }
        } catch (error) {
          logger.error('❌ [Sync] Error en merge de rewardsState (global_progress):', error);
        }
      }
    );

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, userData, saveGlobalProgress]);

  // 🆕 CARGA INICIAL DE SESIONES desde Firebase
  useEffect(() => {
    if (cloudBackupWriteOnly) return;
    if (!currentUser?.uid) return;

    let mounted = true;

    const loadInitialSessions = async () => {
      try {
        logger.log('📥 [AppContext] Cargando sesiones iniciales desde Firestore...');

        const firestoreSessions = await getUserSessions(currentUser.uid);

        if (!mounted) return;

        // Merge con sesiones locales (🪦 respetando tombstones)
        const localSessions = getAllSessions();
        const merged = mergeSessions(localSessions, firestoreSessions, {
          deletedTombstones: getDeletedSessionTombstones()
        });

        // Guardar merged en localStorage (scoped por usuario)
        replaceAllLocalSessions(merged);

        logger.log(`✅ [AppContext] ${merged.length} sesiones cargadas desde Firebase (${firestoreSessions.length} remotas, ${localSessions.length} locales)`);

        // Emitir evento para actualizar UI
        window.dispatchEvent(new CustomEvent('sessions-loaded-from-firebase', {
          detail: { count: merged.length }
        }));

      } catch (error) {
        logger.error('❌ [AppContext] Error cargando sesiones iniciales:', error);
      }
    };

    loadInitialSessions();

    return () => {
      mounted = false;
    };
  }, [currentUser, cloudBackupWriteOnly]);

  // 🆕 LISTENER DE SESIONES EN TIEMPO REAL
  useEffect(() => {
    if (cloudBackupWriteOnly) return;
    if (!currentUser?.uid) return;

    // 🆕 P12 FIX: Flag para prevenir race condition al cambiar cuentas
    let isCurrent = true;
    const _currentUserId = currentUser.uid;

    logger.log('👂 [AppContext] Iniciando listener de sesiones en tiempo real...');

    const unsubscribe = subscribeToUserSessions(currentUser.uid, (sessions) => {
      // 🆕 P12 FIX: Ignorar callbacks de usuarios anteriores
      if (!isCurrent) {
        logger.log('⚠️ [AppContext] Ignorando callback de listener obsoleto');
        return;
      }

      logger.log(`📥 [AppContext] Actualización de sesiones en tiempo real: ${sessions.length} sesiones`);

      // Actualizar localStorage para persistencia offline y consistencia
      // Nota: subscribeToUserSessions ya devuelve las sesiones mapeadas y ordenadas

      // ✅ Merge correcto: preserva sesiones locales no subidas y resuelve conflictos.
      // Nota: getAllSessions() retorna sesiones crudas sin flags (source/inCloud/inLocal),
      // por lo que no se puede filtrar por `s.source === 'local'` aquí.
      const localSessions = getAllSessions();
      const merged = mergeSessions(localSessions, sessions, {
        deletedTombstones: getDeletedSessionTombstones()
      });

      replaceAllLocalSessions(merged);

      // Emitir evento para actualizar UI
      window.dispatchEvent(new CustomEvent('sessions-loaded-from-firebase', {
        detail: { count: merged.length }
      }));
    });

    return () => {
      // 🆕 P12 FIX: Marcar como obsoleto antes de unsubscribe
      isCurrent = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, cloudBackupWriteOnly]);

  // 🆕 FASE 5: Notas disponibles por lectura (aislado por currentTextoId)
  const [notasAutoGeneradasByTextoId, setNotasAutoGeneradasByTextoId] = useState({});

  useEffect(() => {
    if (!completeAnalysis || !texto || !currentTextoId) return;
    if (notasAutoGeneradasByTextoId?.[currentTextoId]) return;

    logger.log('🎓 [AppContext] Análisis completo detectado, marcando notas disponibles para:', currentTextoId);

    // Marcamos que hay notas disponibles (el componente NotasEstudio las generará)
    setNotasAutoGeneradasByTextoId((prev) => ({
      ...(prev || {}),
      [currentTextoId]: true
    }));

    // Flag persistente aislado por lectura (con scope de curso)
    localStorage.setItem(`notas_disponibles_${scopeKey(sourceCourseId, currentTextoId) || currentTextoId}`, 'true');
  }, [completeAnalysis, texto, currentTextoId, sourceCourseId, notasAutoGeneradasByTextoId]);

  // 🆕 ELIMINADO: useEffect que reseteaba análisis al cambiar texto
  // Ya no es necesario porque switchLecture() hace el reset atómicamente
  // Esto elimina la race condition entre setTexto y setCurrentTextoId

  // 2. OPTIMIZADO: Crear el valor del contexto que se pasará a los consumidores
  // Separamos los valores estables de los que cambian frecuentemente
  const stableValues = useMemo(() => ({
    setTexto: setTextoWithDebug,
    setOpenAIApiKey: handleApiKeyChange,
    toggleModoOscuro,
    setLoading: setLoadingStable,
    setError: setErrorStable,
    setArchivoActual: setArchivoActualStable,
    setTextStructure: setTextStructureStable,
    // NUEVO: Funciones de análisis unificado
    analyzeDocument,
    setCompleteAnalysis,
    setCurrentTextoId, // 🆕
    setSourceCourseId, // 🆕 CRÍTICO: ID del curso al que pertenece el texto
    switchLecture, // 🆕 CAMBIO ATÓMICO DE LECTURA
    activeLecture, // 🆕 Estado completo de la lectura activa
    // 🆕 NUEVO: Funciones de progreso de rúbricas
    updateRubricScore,
    updateFormativeScore,
    submitSummativeEssay,
    checkEssayPrerequisites,
    clearRubricProgress,
    resetAllProgress,
    // 🆕 NUEVO: Funciones de citas guardadas
    saveCitation,
    deleteCitation,
    getCitations,
    clearDocumentCitations,
    // 🆕 NUEVO: Funciones de progreso de actividades
    updateActivitiesProgress,
    markPreparationProgress,
    resetActivitiesProgress,
    // 🗑️ NUEVO: Función para limpiar todo el historial
    clearAllHistory,
    // 📚 NUEVO: Funciones de gestión de sesiones
    createSession,
    updateCurrentSessionFromState,
    restoreSession,
    // 🔥 NUEVO: Funciones de sincronización con Firestore
    saveCurrentTextToFirestore,
    syncRubricProgressToFirestore,
    saveEvaluationToFirestore,
    syncCitationsToFirestore,
    clearGlobalTutorLog: _clearGlobalTutorLog,
    setFocusMode,          // 🆕 Setter directo
    toggleFocusMode        // 🆕 Toggle global
  }), [setTextoWithDebug, handleApiKeyChange, toggleModoOscuro, setLoadingStable, setErrorStable, setArchivoActualStable, setTextStructureStable, analyzeDocument, updateRubricScore, updateFormativeScore, submitSummativeEssay, checkEssayPrerequisites, clearRubricProgress, resetAllProgress, saveCitation, deleteCitation, getCitations, clearDocumentCitations, updateActivitiesProgress, markPreparationProgress, resetActivitiesProgress, clearAllHistory, createSession, updateCurrentSessionFromState, restoreSession, saveCurrentTextToFirestore, syncRubricProgressToFirestore, saveEvaluationToFirestore, syncCitationsToFirestore, _clearGlobalTutorLog, setFocusMode, toggleFocusMode]);

  const dynamicValues = useMemo(() => ({
    texto,
    openAIApiKey,
    modoOscuro,
    loading,
    error,
    archivoActual,
    textStructure,
    // NUEVO: Análisis completo
    completeAnalysis,
    // NUEVO: Flag de intento de análisis
    analysisAttempted,
    currentTextoId, // 🆕
    sourceCourseId, // 🆕 CRÍTICO: ID del curso actual
    // 🆕 NUEVO: Progreso de rúbricas
    rubricProgress,
    // 🆕 NUEVO: Citas guardadas
    savedCitations,
    // 🆕 FASE 5: Flag de notas disponibles (aislado por lectura)
    notasAutoGeneradas: !!(notasAutoGeneradasByTextoId && currentTextoId && notasAutoGeneradasByTextoId[currentTextoId]),
    // 🔥 NUEVO: Usuario autenticado
    currentUser,
    userData,
    // 🆕 NUEVO: Progreso de actividades
    activitiesProgress,
    // 🔐 NUEVO: Estado de sesión única
    sessionConflict,
    conflictingSessionInfo,
    // 🆕 P9 FIX: Estado de sincronización con Firestore
    syncStatus,
    globalTutorInteractions: _globalTutorInteractions, // Exponer interacciones globales
    focusMode              // 🆕 Única fuente de verdad expuesta
  }), [texto, openAIApiKey, modoOscuro, loading, error, archivoActual, textStructure, completeAnalysis, analysisAttempted, currentTextoId, sourceCourseId, rubricProgress, savedCitations, notasAutoGeneradasByTextoId, currentUser, userData, activitiesProgress, sessionConflict, conflictingSessionInfo, syncStatus, _globalTutorInteractions, focusMode]);

  const contextValue = useMemo(() => ({
    ...dynamicValues,
    ...stableValues
  }), [dynamicValues, stableValues]);

  // 3. Renderizar el Provider con el valor y los componentes hijos
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
