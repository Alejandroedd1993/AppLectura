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
  setupBeforeUnloadSync
} from '../services/sessionManager';
import { simpleHash as simpleObjectHash } from '../utils/sessionHash';
import { rubricProgressKey, activitiesProgressKey, activitiesProgressMigratedKey } from '../utils/storageKeys.js';
import { useAuth } from './AuthContext';
import {
  saveEvaluacion,
  saveStudentProgress,
  getStudentProgress,
  subscribeToStudentProgress,
  getUserSessions,
  mergeSessions,
  subscribeToUserSessions
} from '../firebase/firestore';
// (firebase/sessionManager) quedó deprecado en AppContext; se mantiene en otros módulos.
import { useSessionMaintenance } from '../hooks/useSessionMaintenance';
import useFirestorePersistence from '../hooks/useFirestorePersistence';
import { generateBasicAnalysis } from '../services/basicAnalysisService';
import { runLegacyTextAnalysisCacheMigrationOnce } from '../utils/cache';
import {
  createEmptyRubricProgressV2,
  createEmptyFormative,
  normalizeRubricProgress,
  checkEssayPrerequisitesFromProgress
} from '../services/rubricProgressV2';

// Backend URL configuration
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
console.log('🔧 [AppContext] Backend URL configurada:', BACKEND_URL);

// 1. Crear el Contexto
export const 
AppContext = createContext();

/**
 * Este componente Provider encapsula la lógica del estado global
 * para que esté disponible en toda la aplicación.
 */
export const AppContextProvider = ({ children }) => {
  console.log('🚀 AppContext provider loaded'); // Log inmediato

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
      console.warn('⚠️ [AppContext] Error leyendo firestore_backup:', e);
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
      console.warn('⚠️ [AppContext] No se pudo escribir firestore_backup:', e);
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
        console.log('🧹 [AppContext] Limpieza TTL firestore_backup_*:', { removed: keysToDelete.length, uid: uidFilter || 'all' });
      }
    } catch (e) {
      console.warn('⚠️ [AppContext] Error limpiando firestore_backup_*:', e);
    }
  }, [firestoreBackupTtlMs, getFirestoreBackupTimestampMs]);

  // Limpieza TTL al montar (best-effort)
  useEffect(() => {
    cleanupExpiredFirestoreBackups(null);
  }, [cleanupExpiredFirestoreBackups]);

  // Drenado legacy de análisis (muy limitado, una vez por sesión):
  // asegura que `text_analysis_cache` se migre aunque no se use useTextAnalysis.
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
    console.warn('⚠️ [AppContext] AuthContext no disponible aún, continuando sin auth');
  }

  // 🆕 Inicializar SessionManager con el usuario actual
  useEffect(() => {
    if (currentUser) {
      console.log('👤 [AppContext] Inicializando SessionManager para usuario:', currentUser.uid);
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
            console.log(
              `🧹 [AppContext] Cleanup draft backups legacy en sessions: deleted=${res.deleted} failed=${res.failed} scanned=${res.scanned}`
            );
          }
        }
      } catch (e) {
        console.warn('⚠️ [AppContext] Cleanup legacy draft backups en sessions falló:', e);
      }
    })();
  }, [currentUser?.uid, cloudBackupWriteOnly]);

  const isStudent = userData?.role === 'estudiante';

  // Ref para controlar restauración y evitar reset de análisis
  const isRestoringRef = React.useRef(false);

  // 🛡️ Anti-loop: cuando el progreso se actualiza desde Firestore, evitamos re-escribir inmediatamente
  const lastRubricProgressFromCloudAtRef = useRef(0);
  const lastActivitiesProgressFromCloudAtRef = useRef(0);
  const lastRewardsStateFromCloudAtRef = useRef(0);
  const lastSavedCitationsFromCloudAtRef = useRef(0);
  const activitiesProgressLocalDirtyRef = useRef(false);
  const lastActivitiesTouchedTextoIdRef = useRef(null);
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

  useEffect(() => {
    completeAnalysisRef.current = completeAnalysis;
  }, [completeAnalysis]);

  // 🆕 SETTERS DERIVADOS - Para que componentes existentes sigan funcionando
  // Estos actualizan activeLecture internamente
  const setTexto = useCallback((nuevoTexto) => {
    console.log('🔄 [AppContext] setTexto llamado, longitud:', nuevoTexto?.length || 0);
    setActiveLecture(prev => ({
      ...prev,
      content: nuevoTexto || '',
      lastModified: Date.now()
    }));
  }, []);

  const setCurrentTextoId = useCallback((id) => {
    console.log('🔄 [AppContext] setCurrentTextoId:', id);
    setActiveLecture(prev => ({
      ...prev,
      id: id,
      lastModified: Date.now()
    }));
  }, []);

  const setSourceCourseId = useCallback((courseId) => {
    console.log('🔄 [AppContext] setSourceCourseId:', courseId);
    setActiveLecture(prev => ({
      ...prev,
      courseId: courseId,
      lastModified: Date.now()
    }));
  }, []);

  const setCompleteAnalysis = useCallback((analysis) => {
    console.log('🔄 [AppContext] setCompleteAnalysis:', analysis ? 'CON DATOS' : 'NULL');
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
    console.log('🔄 [AppContext] ===== SWITCH LECTURE (ATÓMICO) =====');
    console.log('📎 Nuevo textoId:', lectureData.id);
    console.log('📎 Nuevo courseId:', lectureData.courseId);
    console.log('📎 Contenido:', lectureData.content?.length || 0, 'chars');

    // 🆕 FIX CRÍTICO: Cada lectura necesita su PROPIA sesión
    // Buscar si ya existe una sesión para este textoId
    if (lectureData.id) {
      const allSessions = getAllSessions();
      const existingSession = allSessions.find(s =>
        s.currentTextoId === lectureData.id ||
        s.text?.metadata?.id === lectureData.id ||
        s.text?.textoId === lectureData.id
      );

      if (existingSession) {
        // Reutilizar la sesión existente de esta lectura
        setCurrentSessionId(existingSession.id);
        console.log('♻️ [AppContext] Reutilizando sesión existente para esta lectura:', existingSession.id);
      } else {
        // Crear un NUEVO ID de sesión único para esta lectura
        const newSessionId = `session_${Date.now()}_${lectureData.id.substring(0, 8)}`;
        setCurrentSessionId(newSessionId);
        console.log('🆕 [AppContext] Nueva sesión creada para lectura:', newSessionId);
      }
    } else {
      console.warn('⚠️ [AppContext] switchLecture sin textoId, no se puede asignar sesión');
    }

    setActiveLecture({
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
    });

    console.log('✅ [AppContext] Lectura cambiada atómicamente con sesión aislada');
  }, []);

  // Debug wrapper para compatibilidad
  const setTextoWithDebug = useCallback((nuevoTexto) => {
    console.log('🔄 AppContext - Estableciendo nuevo texto, longitud:', nuevoTexto?.length || 0);
    setTexto(nuevoTexto);
  }, [setTexto]);

  const [openAIApiKey, setOpenAIApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');

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
  const [globalTutorInteractions, setGlobalTutorInteractions] = useState([]);

  useEffect(() => {
    // Usar 'global' como fallback si no hay textoId específico
    const lectureId = currentTextoId || 'global';
    const storageKey = `tutorInteractionsLog:${lectureId}`;

    console.log('🎧 [AppContext] Registrando listener global para tutor-interaction-logged, lectureId:', lectureId);

    // Cargar inicial
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setGlobalTutorInteractions(Array.isArray(saved) ? saved : []);
      console.log('📂 [AppContext] Interacciones cargadas:', saved?.length || 0);
    } catch {
      setGlobalTutorInteractions([]);
    }

    const handleNewInteraction = (event) => {
      console.log('🎯 [AppContext] Evento tutor-interaction-logged recibido:', event.detail);
      const interaction = event.detail;
      setGlobalTutorInteractions(prev => {
        const updated = [...prev, interaction];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        console.log('💾 [AppContext] Interacción guardada. Total:', updated.length);
        return updated;
      });
    };

    window.addEventListener('tutor-interaction-logged', handleNewInteraction);
    return () => {
      console.log('🔌 [AppContext] Removiendo listener global');
      window.removeEventListener('tutor-interaction-logged', handleNewInteraction);
    };
  }, [currentTextoId]);

  // Opción para limpiar log globalmente
  const clearGlobalTutorLog = useCallback(() => {
    const lectureId = currentTextoId || 'global';
    const storageKey = `tutorInteractionsLog:${lectureId}`;
    localStorage.removeItem(storageKey);
    setGlobalTutorInteractions([]);
    console.log('🗑️ [AppContext] Log del tutor limpiado para:', lectureId);
  }, [currentTextoId]);

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

    const key = rubricProgressKey(currentUser.uid, currentTextoId);
    const saved = localStorage.getItem(key);

    if (!saved) {
      // Sin datos locales para esta lectura - mantener vacío
      console.log(`ℹ️ [AppContext] Sin rubricProgress local para ${currentTextoId}`);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        // 🛡️ PASO 2: Cargar datos específicos de ESTA lectura
        setRubricProgress(normalizeRubricProgress(parsed));
        console.log(`✅ [AppContext] rubricProgress cargado (local) para ${currentUser.uid} / ${currentTextoId}`);
      }
    } catch (e) {
      console.warn('⚠️ Error cargando rubricProgress (local):', e);
    }
  }, [currentUser?.uid, currentTextoId, disableLocalProgressMirror, useFirestorePersistenceHook, emptyRubricProgress]);

  // Persistir rubricProgress en localStorage cuando cambie (namespace por lectura)
  // 🛡️ NO guardar si está vacío - evita sobrescribir datos buenos durante el cambio de lectura
  useEffect(() => {
    if (!currentUser?.uid || !currentTextoId || disableLocalProgressMirror || useFirestorePersistenceHook) return;
    
    // 🛡️ PROTECCIÓN: No guardar estado vacío en localStorage
    // Esto evita sobrescribir datos existentes durante el reseteo al cambiar de lectura
    const hasData = Object.keys(rubricProgress).some(k => (rubricProgress[k]?.formative?.scores?.length || rubricProgress[k]?.scores?.length || 0) > 0);
    if (!hasData) {
      console.log(`ℹ️ [AppContext] Omitiendo guardar rubricProgress vacío para ${currentTextoId}`);
      return;
    }
    
    const key = rubricProgressKey(currentUser.uid, currentTextoId);
    localStorage.setItem(key, JSON.stringify(rubricProgress));
    console.log(`💾 [AppContext] rubricProgress guardado en localStorage para ${currentTextoId}`);
  }, [rubricProgress, currentUser, currentTextoId, disableLocalProgressMirror, useFirestorePersistenceHook]);

  // 🆕 FIX: Cargar rubricProgress desde Firestore cuando cambie el texto (currentTextoId)
  // Esto asegura que cada lectura tenga su propio progreso de evaluación
  // 🛡️ NO MERGE: Cargar datos específicos de esta lectura, sin mezclar con datos anteriores
  useEffect(() => {
    // Ref para evitar state updates en componente desmontado
    let isMounted = true;

    const loadProgressForText = async () => {
      // Si no hay usuario o texto, mantener estado actual
      if (!currentUser?.uid || !currentTextoId) {
        console.log('ℹ️ [AppContext] Skipping rubricProgress load - no user or textoId');
        return;
      }

      console.log(`📥 [AppContext] Cargando rubricProgress desde Firestore para texto: ${currentTextoId}`);

      try {
        // Obtener progreso guardado en Firestore para este texto específico
        const progress = await getStudentProgress(currentUser.uid, currentTextoId);

        if (!isMounted) return; // Evitar updates si el componente se desmontó

        // 🔄 DETECTAR RESET: Si lastResetAt existe, limpiar datos locales
        if (progress?.lastResetAt) {
          const resetTime = progress.lastResetAt?.seconds 
            ? progress.lastResetAt.seconds * 1000 
            : (typeof progress.lastResetAt === 'number' ? progress.lastResetAt : 0);
          
          if (resetTime > 0) {
            console.log('🔄 [AppContext] Reset detectado en Firestore, limpiando localStorage...');
            
            // Limpiar localStorage de rubricProgress
            const rubricKey = rubricProgressKey(currentUser.uid, currentTextoId);
            localStorage.removeItem(rubricKey);
            
            // Limpiar localStorage de activitiesProgress
            const activitiesKey = activitiesProgressKey(currentUser.uid, currentTextoId);
            localStorage.removeItem(activitiesKey);
            
            // Limpiar cualquier key de activity_results_ relacionada
            Object.keys(localStorage).forEach(k => {
              if (k.includes('activity_results_') && k.includes(currentTextoId)) {
                localStorage.removeItem(k);
                console.log('🧹 [AppContext] Limpiado localStorage key:', k);
              }
            });
            
            // Aplicar datos de Firestore (reseteados) directamente
            if (progress.rubricProgress) {
              setRubricProgress(normalizeRubricProgress(progress.rubricProgress));
              console.log('✅ [AppContext] rubricProgress reemplazado tras reset');
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
            console.log('🔄 [AppContext] Reset de rúbrica detectado, reemplazando datos');
            const rubricKey = rubricProgressKey(currentUser.uid, currentTextoId);
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
              console.log('✅ [AppContext] rubricProgress cargado desde Firestore (cloud tiene datos, local vacío)');
              return normalizedCloud;
            }
            
            // Si ambos tienen datos, hacer merge por timestamp
            if (cloudHasData && localHasData) {
              const merged = createEmptyRubricProgressV2();
              const allKeys = new Set([...Object.keys(normalizedLocal), ...Object.keys(normalizedCloud)]);
              
              allKeys.forEach(rubricKey => {
                const cloudRubric = normalizedCloud[rubricKey];
                const localRubric = normalizedLocal[rubricKey];
                
                const cloudTime = cloudRubric?.lastUpdate || 0;
                const localTime = localRubric?.lastUpdate || 0;
                
                if (cloudTime > localTime && cloudRubric?.scores?.length) {
                  merged[rubricKey] = cloudRubric;
                } else if (localRubric?.scores?.length) {
                  merged[rubricKey] = localRubric;
                } else if (cloudRubric?.scores?.length) {
                  merged[rubricKey] = cloudRubric;
                }
              });
              
              console.log('✅ [AppContext] rubricProgress MERGED (cloud+local) para texto:', currentTextoId);
              return normalizeRubricProgress(merged);
            }
            
            // Si solo local tiene datos, mantener local
            console.log('ℹ️ [AppContext] Manteniendo datos locales (cloud vacío)');
            return normalizedLocal;
          });
        } else {
          // Sin progreso en Firestore para esta lectura
          // Mantener lo que se cargó del localStorage (si había algo)
          console.log('ℹ️ [AppContext] Sin progreso en Firestore para este texto:', currentTextoId);
        }
      } catch (error) {
        console.error('❌ [AppContext] Error cargando rubricProgress desde Firestore:', error);
        // En caso de error, mantener estado actual
        console.log('⚠️ [AppContext] Error de Firestore, manteniendo estado actual');
      }
    };

    loadProgressForText();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [currentTextoId, currentUser, emptyRubricProgress]);

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

    const key = `savedCitations_${currentUser.uid}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        setSavedCitations(JSON.parse(saved));
      } catch (e) {
        console.warn('⚠️ Error cargando savedCitations:', e);
      }
    }
  }, [currentUser, disableLocalProgressMirror]);

  // Persistir citas guardadas cuando cambien (con namespace)
  useEffect(() => {
    if (currentUser?.uid && !disableLocalProgressMirror && !useFirestorePersistenceHook) {
      const key = `savedCitations_${currentUser.uid}`;
      localStorage.setItem(key, JSON.stringify(savedCitations));
    }
  }, [savedCitations, currentUser, disableLocalProgressMirror, useFirestorePersistenceHook]);

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
        console.log('♻️ [AppContext] Migradas citas legacy -> textoId:', { currentTextoId, migratedFrom: legacyList });
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
        console.log('♻️ [AppContext] Migrado activitiesProgress legacy -> textoId:', { currentTextoId, migratedFrom: legacyList });
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

  // Documento de progreso por lectura (fallback a global_progress)
  const progressDocId = currentTextoId || 'global_progress';

  // Aplicar/mergear progreso remoto en el estado local, reusando las mismas reglas que el listener legacy.
  const applyRemoteStudentProgress = useCallback((progressData, { isInitial } = { isInitial: false }) => {
    if (!progressData) return;

    const currentDocId = currentTextoIdRef.current || 'global_progress';

    // 🔄 DETECTAR RESET: Si Firestore tiene lastResetAt, verificar si es más reciente
    const remoteResetAt = progressData.lastResetAt?.seconds 
      ? progressData.lastResetAt.seconds * 1000 
      : (typeof progressData.lastResetAt === 'number' ? progressData.lastResetAt : 0);
    
    const hasRecentReset = remoteResetAt > 0;
    
    if (hasRecentReset) {
      console.log('🔄 [AppContext] Detectado RESET desde Firestore, timestamp:', new Date(remoteResetAt).toISOString());
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
              console.log('🔄 [AppContext] Reset detectado - reemplazando rubricProgress local con Firestore');
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
                console.log(`🔄 [AppContext] Rúbrica ${rubricId} reseteada, reemplazando`);
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
              console.log(`🔄 [AppContext] Reset detectado en artifacts de ${docId}, usando datos remotos`);
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

            const shouldApply = remoteLen > localLen || (remoteLen === localLen && remoteMaxTs > localMaxTs);
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
  }, [currentUser?.uid, progressDocId, hookProgressEnabled]);

  const { save: saveProgressViaHook, loading: progressHookLoading } = useFirestorePersistence(
    progressDocId,
    { rubricProgress, activitiesProgress, savedCitations, sourceCourseId },
    {
      enabled: hookProgressEnabled,
      autoSave: false,
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

    const key = activitiesProgressKey(currentUser.uid);
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        setActivitiesProgress(JSON.parse(saved));
      } catch (error) {
        console.warn('⚠️ Error cargando activitiesProgress:', error);
      }
    }
  }, [currentUser, disableLocalProgressMirror, useFirestorePersistenceHook]);

  // 🔄 Migración automática de datos antiguos (una sola vez)
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (disableLocalProgressMirror || useFirestorePersistenceHook) return;

    const migrationFlagKey = activitiesProgressMigratedKey(currentUser.uid);
    const migrationFlag = localStorage.getItem(migrationFlagKey);
    if (!migrationFlag) {
      import('../utils/migrateActivityData').then(({ migrateActivityDataToContext }) => {
        const result = migrateActivityDataToContext({ storageKey: activitiesProgressKey(currentUser.uid) });
        if (result.migrated > 0) {
          console.log(`✅ [Migration] ${result.migrated} documentos migrados a activitiesProgress`);
          activitiesProgressLocalDirtyRef.current = true;
          setActivitiesProgress(result.data);
          localStorage.setItem(migrationFlagKey, 'true');
        } else {
          localStorage.setItem(migrationFlagKey, 'true');
        }
      }).catch(err => {
        console.warn('⚠️ [Migration] Error importando migración:', err);
      });
    }
  }, [currentUser, disableLocalProgressMirror, useFirestorePersistenceHook]);

  useEffect(() => {
    if (currentUser?.uid && !disableLocalProgressMirror && !useFirestorePersistenceHook) {
      const key = activitiesProgressKey(currentUser.uid);
      localStorage.setItem(key, JSON.stringify(activitiesProgress));
    }
  }, [activitiesProgress, currentUser, disableLocalProgressMirror, useFirestorePersistenceHook]);

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
        console.log('📤 [saveGlobalProgress] Guardando rewardsState en global_progress...');
        const rewardsPayload = {
          rewardsState,
          // Mantener metadata útil para debugging
          lastSync: payload?.lastSync || new Date().toISOString(),
          syncType: payload?.syncType || 'rewards_only',
          sourceCourseId: payload?.sourceCourseId || sourceCourseId || null,
          userId: payload?.userId || currentUser.uid
        };

        await saveStudentProgress(currentUser.uid, 'global_progress', rewardsPayload);
        console.log('✅ [saveGlobalProgress] rewardsState guardado exitosamente');

        // Airbag local (último estado conocido)
        writeFirestoreBackupMerged(currentUser.uid, 'global_progress', rewardsPayload);
      } catch (error) {
        rewardsSaved = false;
        console.error('❌ [AppContext] Error guardando rewardsState (global_progress):', error);
      }
    }

    // 🆕 CRÍTICO: Evitar 'global_progress' si hay un textoId válido en el contexto
    // Prioridad: options.textoId > currentTextoId > WARNING (no guardar invisible)
    let targetTextoId = options.textoId;

    if (!targetTextoId || targetTextoId === 'global_progress') {
      // Intentar usar currentTextoId del contexto
      if (currentTextoId && currentTextoId !== 'global_progress') {
        targetTextoId = currentTextoId;
        console.log('💡 [AppContext] Usando currentTextoId del contexto:', targetTextoId);
      } else {
        // FALLBACK: Usar 'global_progress' pero loguear warning
        targetTextoId = 'global_progress';
        console.warn('⚠️ [AppContext] Guardando progreso sin textoId específico (global_progress). Este progreso no será visible para el docente.');
      }
    }

    // Si solo venía rewardsState, ya se guardó arriba
    const hasOtherData = Object.keys(payloadWithoutRewards || {}).length > 0;
    if (!hasOtherData) {
      return rewardsSaved;
    }

    try {
      // Etapa 2: si el hook está activo y el write es para el doc de progreso actual,
      // usar SIEMPRE el writer del hook (evita escrituras residuales por rutas legacy).
      if (
        useFirestorePersistenceHook &&
        typeof saveProgressViaHook === 'function' &&
        targetTextoId === progressDocId
      ) {
        const ok = await saveProgressViaHook(payloadWithoutRewards);
        return Boolean(rewardsSaved && ok !== false);
      }

      await saveStudentProgress(currentUser.uid, targetTextoId, payloadWithoutRewards);

      // Airbag local (merge para soportar writes incrementales, p.ej. una sola rúbrica)
      writeFirestoreBackupMerged(currentUser.uid, targetTextoId, payloadWithoutRewards);
      return rewardsSaved;
    } catch (error) {
      console.error('❌ [AppContext] Error guardando progreso por lectura:', error);
      return false;
    }
  }, [currentUser, isStudent, currentTextoId, sourceCourseId, writeFirestoreBackupMerged, useFirestorePersistenceHook, saveProgressViaHook, progressDocId]);

  // OPTIMIZADO: Función para guardar la API key, envuelta en useCallback para estabilidad
  const handleApiKeyChange = useCallback((key) => {
    setOpenAIApiKey(key);
    if (key) {
      localStorage.setItem('openai_api_key', key);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }, []);

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
    setArchivoActual(archivo || null);
  }, []);

  // NUEVO: Setter estable para estructura del texto
  const setTextStructureStable = useCallback((structure) => {
    console.log('📐 AppContext - Estableciendo estructura del texto:', structure);
    setTextStructure(structure || null);
  }, []);

  // 🆕 FUNCIÓN PARA ACTUALIZAR PROGRESO DE RÚBRICAS
  const updateRubricScore = useCallback((rubricId, scoreData) => {
    console.log(`📊 [updateRubricScore] Actualizando ${rubricId}:`, scoreData);

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

      // Calcular promedio (últimos 3 intentos o todos si son menos)
      const recentScores = newScores.slice(-3);
      const average = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;

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

      console.log(`✅ [updateRubricScore] ${rubricId} actualizada. Promedio: ${updatedRubrica.average}/10`);

      // 🆕 DISPARAR EVENTO para sincronización optimizada
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
    console.log(`📝 [submitSummativeEssay] Registrando ensayo sumativo para ${rubricId}`);

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
        console.warn(`⚠️ [submitSummativeEssay] ${rubricId} no soporta sumativo (probablemente rubrica5)`);
        return normalizedPrev;
      }

      const now = Date.now();
      const rawScore = essayData.score ?? essayData.finalScore ?? essayData.scoreGlobal ?? null;
      const score = rawScore == null ? null : Number(rawScore);
      const nivel =
        essayData.nivel != null
          ? Number(essayData.nivel)
          : (Number.isFinite(score) ? Math.round(score / 2.5) : null);

      const submittedAt = Number(essayData.submittedAt ?? current.summative?.submittedAt ?? now) || now;
      const gradedAt = Number(essayData.gradedAt ?? current.summative?.gradedAt ?? (score != null ? now : null)) || null;
      const status = essayData.status || (score != null ? 'graded' : 'submitted');

      // 🆕 FIX: Activar revisión automáticamente tras primer intento exitoso
      // Si es el primer intento (attemptsUsed pasará a 1) y tiene score válido, permitir revisión
      const nextAttemptsUsed = Math.max(Number(current.summative?.attemptsUsed || 0), Number(essayData.attemptsUsed || 1));
      const shouldEnableRevision = 
        essayData.allowRevision !== undefined 
          ? Boolean(essayData.allowRevision)
          : (nextAttemptsUsed === 1 && score != null) || Boolean(current.summative?.allowRevision);

      const nextSummative = {
        ...(current.summative || {}),
        ...essayData,
        score,
        nivel,
        status,
        submittedAt,
        gradedAt,
        attemptsUsed: nextAttemptsUsed,
        allowRevision: shouldEnableRevision
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

      if (score != null) {
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
    console.log(`🗑️ [clearRubricProgress] Limpiando ${rubricId}`);
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
  const resetAllProgress = useCallback(() => {
    console.log('🗑️ [resetAllProgress] Reseteando todo el progreso de rúbricas');
    const emptyProgress = createEmptyRubricProgressV2();
    setRubricProgress(emptyProgress);

    try {
      if (currentUser?.uid && currentTextoId) {
        localStorage.removeItem(rubricProgressKey(currentUser.uid, currentTextoId));
      }
    } catch {
      // ignore
    }
  }, [currentUser?.uid, currentTextoId]);

  // 🆕 FUNCIÓN PARA GUARDAR UNA CITA (llamada desde Lectura Guiada)
  const saveCitation = useCallback((citation) => {
    console.log('💾 [saveCitation] Guardando cita:', citation);

    const { documentId, texto, nota = '' } = citation;
    const targetId = currentTextoId || documentId;

    if (!targetId || !texto || texto.trim().length < 10) {
      console.warn('⚠️ [saveCitation] Cita inválida (requiere textoId/documentId y texto >10 chars)');
      return false;
    }

    savedCitationsLocalDirtyRef.current = true;

    setSavedCitations(prev => {
      const docCitations = prev[targetId] || [];

      // Evitar duplicados (mismos primeros 50 caracteres)
      const isDuplicate = docCitations.some(
        c => c.texto.substring(0, 50) === texto.substring(0, 50)
      );

      if (isDuplicate) {
        console.warn('⚠️ [saveCitation] Cita duplicada, no se guardará');
        return prev;
      }

      const newCitation = {
        id: Date.now(),
        texto: texto.trim(),
        timestamp: Date.now(),
        nota: nota.trim()
      };

      const updated = {
        ...prev,
        [targetId]: [...docCitations, newCitation]
      };

      console.log(`✅ [saveCitation] Cita guardada. Total para documento: ${updated[targetId].length}`);
      return updated;
    });

    return true;
  }, [currentTextoId]);

  // 🆕 FUNCIÓN PARA ELIMINAR UNA CITA
  const deleteCitation = useCallback((documentId, citationId) => {
    console.log(`🗑️ [deleteCitation] Eliminando cita ${citationId} del documento ${documentId}`);

    savedCitationsLocalDirtyRef.current = true;

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
    console.log(`🗑️ [clearDocumentCitations] Limpiando todas las citas del documento ${documentId}`);

    savedCitationsLocalDirtyRef.current = true;

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
      console.log('⚠️ [Firestore] No se puede guardar: usuario no autenticado o texto muy corto');
      return null;
    }

    try {
      console.log('💾 [Firestore] Texto disponible para guardar (función pendiente de implementación completa)');
      console.log('📊 Longitud:', texto.length, 'palabras');

      // TODO: Implementar guardado con estructura docente → uploadTexto()
      // Por ahora solo registramos que está disponible

      return 'pending_implementation';

    } catch (error) {
      console.error('❌ [Firestore] Error:', error);
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
      console.log('💾 [Firestore] Sincronizando progreso de rúbricas...', rubricId || 'todas');

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

        console.log('✅ [Firestore] Progreso de estudiante sincronizado (rúbricas)');
        return true;
      } else {
        console.log('ℹ️ [Firestore] Usuario docente - progreso no se sincroniza');
        return false;
      }

    } catch (error) {
      console.error('❌ [Firestore] Error sincronizando progreso:', error);
      return false;
    }
  }, [currentUser, userData, rubricProgress, saveGlobalProgress, currentTextoId, sourceCourseId, useFirestorePersistenceHook, saveProgressViaHook]);

  /**
   * Guarda una evaluación completada en Firestore
   */
  const saveEvaluationToFirestore = useCallback(async (evaluationData) => {
    if (!currentUser) {
      console.log('⚠️ [Firestore] No se puede guardar evaluación: usuario no autenticado');
      return null;
    }

    try {
      console.log('💾 [Firestore] Guardando evaluación...');

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

      console.log('✅ [Firestore] Evaluación guardada con ID:', evalId);
      return evalId;

    } catch (error) {
      console.error('❌ [Firestore] Error guardando evaluación:', error);
      return null;
    }
  }, [currentUser, userData, saveGlobalProgress, sourceCourseId]);

  /**
   * Sincroniza citas guardadas con Firestore (pendiente de implementación)
   */
  const syncCitationsToFirestore = useCallback(async () => {
    if (!currentUser || Object.keys(savedCitations).length === 0) return;

    try {
      console.log('💾 [Firestore] Citas disponibles para sincronizar:', Object.keys(savedCitations).length);
      console.log('ℹ️ [Firestore] Sincronización de citas pendiente de implementación');

      // TODO: Implementar guardado de notas/citas cuando se agregue la función correspondiente

    } catch (error) {
      console.error('❌ [Firestore] Error sincronizando citas:', error);
    }
  }, [currentUser, savedCitations]);

  // 🆕 OPTIMIZADO: Sincronizar rúbricas solo cuando se dispara evento de evaluación completa
  useEffect(() => {
    const handleArtifactCompleted = async (event) => {
      const { rubricId, score, rubricProgressOverride, textoIdForSync } = event.detail || {};

      if (rubricId && currentUser) {
        // 🔵 LOG DETALLADO para diagnóstico de persistencia
        const targetTextoId = textoIdForSync || currentTextoId || 'global_progress';
        console.log(`📊 [AppContext] Artefacto completado:`, {
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

            console.log('🔵 [AppContext] Guardando progreso en Firestore:', {
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

            console.log('✅ [AppContext] Rúbrica guardada (override) en:', targetTextoId);
          } catch (error) {
            console.error('❌ [AppContext] Error guardando rúbrica (override):', error);
          }
          return;
        }

        // Fallback: sincronizar solo esta rúbrica específica INMEDIATAMENTE
        await syncRubricProgressToFirestore(rubricId);
      }
    };

    window.addEventListener('artifact-evaluated', handleArtifactCompleted);

    return () => window.removeEventListener('artifact-evaluated', handleArtifactCompleted);
  }, [currentUser, currentTextoId, saveGlobalProgress, saveProgressViaHook, sourceCourseId, syncRubricProgressToFirestore, useFirestorePersistenceHook, userData?.role]);

  // 🆕 SINCRONIZAR rewardsState cuando cambia (tutor, actividades, etc.)
  useEffect(() => {
    console.log('🔍 [AppContext] useEffect rewards-state-changed check:', {
      uid: currentUser?.uid,
      role: userData?.role,
      isEstudiante: userData?.role === 'estudiante'
    });

    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') {
      console.log('⏭️ [AppContext] Saltando registro de listener rewards-state-changed (no es estudiante o no hay user)');
      return;
    }

    console.log('✅ [AppContext] Registrando listener rewards-state-changed');

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
            console.log('✅ [AppContext] rewardsState flush sincronizado a Firestore');
          })
          .catch((error) => {
            console.error('❌ [AppContext] Error en flush de rewardsState:', error);
          });
      } catch (error) {
        console.error('❌ [AppContext] Error preparando flush de rewardsState:', error);
      }
    };

    const handleRewardsChanged = (event) => {
      const { totalPoints, availablePoints, forceSync, isReset } = event.detail || {};

      console.log('🎯 [AppContext] rewards-state-changed recibido:', { totalPoints, availablePoints, forceSync, isReset });

      // 🆕 Si es un reset forzado, sincronizar INMEDIATAMENTE (bypass anti-loop y debounce)
      if (forceSync || isReset) {
        console.log('🗑️ [AppContext] Reset de puntos detectado, sincronizando inmediatamente...');
        console.log('🗑️ [AppContext] Usuario actual para reset:', currentUser?.uid);
        if (debounceTimer) clearTimeout(debounceTimer);
        
        // Sincronizar inmediatamente
        (async () => {
          try {
            const currentRewardsState = window.__rewardsEngine?.exportState();
            if (!currentRewardsState) return;

            console.log('🗑️ [AppContext] Estado de rewards a guardar:', {
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

            console.log('🗑️ [AppContext] Llamando saveGlobalProgress con uid:', currentUser.uid);
            await saveGlobalProgress(progressData);
            console.log('✅ [AppContext] Reset de puntos sincronizado a Firestore para uid:', currentUser.uid);
            
            // Marcar como recién sincronizado desde local para evitar que el listener lo sobrescriba
            lastRewardsStateFromCloudAtRef.current = Date.now();
          } catch (error) {
            console.error('❌ [AppContext] Error sincronizando reset:', error);
          }
        })();
        return;
      }

      // 🛡️ Evitar bucle: si este evento viene de una importación desde Firestore,
      // ignoramos durante un breve periodo para no re-escribir inmediatamente.
      const timeSinceCloudImport = Date.now() - (lastRewardsStateFromCloudAtRef.current || 0);
      if (timeSinceCloudImport < 2000) {
        console.log('⏭️ [AppContext] Anti-loop activo, ignorando evento (hace ' + timeSinceCloudImport + 'ms)');
        return;
      }

      console.log(`🎮 [AppContext] Puntos actualizados: ${totalPoints} pts (${availablePoints} disponibles)`);
      console.log(`⏱️ [AppContext] Programando sync en 3 segundos...`);

      // Debounce de 3 segundos para evitar múltiples writes
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        console.log('⏱️ [AppContext] Debounce completado, sincronizando...');
        try {
          const currentRewardsState = window.__rewardsEngine?.exportState();
          if (!currentRewardsState) {
            console.log('⚠️ [AppContext] No hay rewardsState para sincronizar');
            return;
          }

          console.log('📤 [AppContext] Enviando a Firestore:', {
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
          console.log('✅ [AppContext] rewardsState sincronizado a Firestore');
        } catch (error) {
          console.error('❌ [AppContext] Error sincronizando rewardsState:', error);
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
      console.log('⏭️ [AppContext] Sync skip: no user/role/estudiante');
      return;
    }

    // Cloud-first: sincronizar SOLO si el cambio fue local.
    // Evita re-escrituras cuando el estado cambia por merges desde Firestore.
    if (disableLocalProgressMirror && !activitiesProgressLocalDirtyRef.current) {
      console.log('⏭️ [AppContext] Sync skip: cloud-first y no hay dirty local');
      return;
    }

    // Evitar sincronizar en la carga inicial (solo cuando hay cambios reales)
    const hasActivities = Object.keys(activitiesProgress).length > 0;
    if (!hasActivities) {
      console.log('⏭️ [AppContext] Sync skip: no hay activitiesProgress');
      return;
    }

    // 🛡️ Evitar bucle: si este cambio viene de Firestore, no re-escribir inmediatamente
    const cloudTimeDiff = Date.now() - (lastActivitiesProgressFromCloudAtRef.current || 0);
    if (cloudTimeDiff < 5000) {
      console.log('⏭️ [AppContext] Sync skip: update reciente de cloud hace', cloudTimeDiff, 'ms');
      return;
    }

    console.log('🔄 [AppContext] Programando sync de activitiesProgress en 2s...');

    // Debounce de 2 segundos para evitar múltiples writes
    const scheduledForTextoId = currentTextoId;

    const writeNow = () => {
      console.log('💾 [AppContext] Sincronizando activitiesProgress a Firestore...');

      const targetTextoId = lastActivitiesTouchedTextoIdRef.current || currentTextoId || null;

      const progressData = {
        activitiesProgress,
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
          console.log('✅ [AppContext] activitiesProgress sincronizado');

          // Cloud-first: limpiar dirty SOLO tras éxito.
          if (disableLocalProgressMirror) {
            activitiesProgressLocalDirtyRef.current = false;
          }
        })
        .catch(error => {
          console.error('❌ [AppContext] Error sincronizando activitiesProgress:', error);
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

  // 🔄 CLOUD-FIRST (hook): cuando cambia savedCitations, sincronizar a Firestore (solo doc actual)
  useEffect(() => {
    if (!useFirestorePersistenceHook || typeof saveProgressViaHook !== 'function') return;
    if (!currentUser?.uid || !userData?.role || userData.role !== 'estudiante') return;
    if (!currentTextoId || currentTextoId === 'global_progress') return;

    // 🛡️ Evitar bucle: si este cambio viene de Firestore, no re-escribir inmediatamente
    if (Date.now() - (lastSavedCitationsFromCloudAtRef.current || 0) < 5000) {
      return;
    }

    // Cloud-first: sincronizar SOLO si el cambio fue local
    if (!savedCitationsLocalDirtyRef.current) {
      return;
    }

    const scheduledForTextoId = currentTextoId;
    const citationsForDoc = Array.isArray(savedCitations[currentTextoId]) ? savedCitations[currentTextoId] : [];

    const writeNow = () => {
      const progressData = {
        savedCitations: citationsForDoc,
        sourceCourseId,
        lastSync: new Date().toISOString(),
        userId: currentUser.uid,
        syncType: 'citations_update'
      };

      Promise.resolve(saveProgressViaHook(progressData))
        .then(() => {
          savedCitationsLocalDirtyRef.current = false;
        })
        .catch((error) => {
          console.error('❌ [AppContext] Error sincronizando savedCitations:', error);
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
  }, [savedCitations, currentUser, userData, currentTextoId, sourceCourseId, useFirestorePersistenceHook, saveProgressViaHook]);

  // 🔥 Establecer usuario actual en sessionManager cuando cambie
  useEffect(() => {
    if (currentUser?.uid) {
      setSessionManagerUser(currentUser.uid);
      console.log('👤 [AppContext] Usuario establecido en SessionManager:', currentUser.uid);

      // 🆕 RACE CONDITION FIX: Sincronizar sesiones pendientes al reconectar
      // Opción A' (write-only): no sincronizar sesiones completas a cloud.
      if (!cloudBackupWriteOnly) {
        syncPendingSessions().then(({ synced, failed }) => {
          if (synced > 0 || failed > 0) {
            console.log(`🔄 [AppContext] Pending syncs: ${synced} completadas, ${failed} fallidas`);
          }
        }).catch(err => {
          console.warn('⚠️ [AppContext] Error sincronizando sesiones pendientes:', err);
        });
      } else {
        console.log('☁️ [AppContext] cloudBackupWriteOnly activo: omitiendo syncPendingSessions');
      }

      // 🆕 P4 FIX: Auto-merge de sesiones cloud al login
      // Esto sincroniza las sesiones de Firestore con localStorage proactivamente
      if (!cloudBackupWriteOnly) {
        getAllSessionsMerged().then(mergedSessions => {
          if (mergedSessions.length > 0) {
            console.log(`☁️ [AppContext] Sesiones sincronizadas desde cloud: ${mergedSessions.length}`);
          }
        }).catch(err => {
          console.warn('⚠️ [AppContext] Error en auto-merge de sesiones:', err);
        });
      } else {
        console.log('☁️ [AppContext] cloudBackupWriteOnly activo: omitiendo auto-merge de sesiones desde cloud');
      }
    } else {
      setSessionManagerUser(null);
      console.log('👤 [AppContext] Usuario removido de SessionManager');
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

        const drafts = captureArtifactsDrafts(currentTextoId);
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
            console.warn('⚠️ [AppContext] Backup de borradores falló:', e?.message || e);
            lastDraftsBackupHashRef.current = null;
          })
          .finally(() => {
            draftsBackupInFlightRef.current = false;
          });
      } catch (e) {
        console.warn('⚠️ [AppContext] Error en loop de backup de borradores:', e?.message || e);
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
          console.log(`🌐 [AppContext] Online: pending syncs ${synced} ok, ${failed} fallidas`);
        }
      }).catch(err => {
        console.warn('⚠️ [AppContext] Error sincronizando pendientes al volver online:', err);
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
      console.warn(`⚠️ [AppContext] Sync error para sesión ${sessionId}:`, message);
      setSyncStatus('error');

      // Resetear a 'idle' después de 10 segundos para permitir nuevos intentos
      setTimeout(() => setSyncStatus('idle'), 10000);
    };

    const handleStorageQuota = (event) => {
      const { message, sessionsRemaining } = event.detail || {};
      console.warn(`⚠️ [AppContext] Storage quota warning:`, message, `(${sessionsRemaining} sesiones restantes)`);
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
      console.log('🔵 [AppContext.createSession] Iniciando creación de sesión...');
      console.log('🔵 [AppContext.createSession] Texto disponible:', !!texto, 'longitud:', texto?.length || 0);
      console.log('🔵 [AppContext.createSession] Archivo actual:', archivoActual?.name || 'sin archivo');
      console.log('🔵 [AppContext.createSession] currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');

      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado en sessionManager
      if (currentUser?.uid) {
        console.log('👤 [AppContext.createSession] Configurando usuario en sessionManager:', currentUser.uid);
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      } else {
        console.warn('⚠️ [AppContext.createSession] Sin usuario autenticado, sesión solo local');
      }

      if (!texto || texto.length === 0) {
        console.warn('⚠️ [AppContext.createSession] No hay texto para guardar');
        return null;
      }

      const sessionData = {
        texto,
        currentTextoId, // 🆕
        sourceCourseId, // 🆕 CRÍTICO: ID del curso para sincronización
        archivoActual,
        completeAnalysis,
        rubricProgress,
        savedCitations,
        activitiesProgress,
        modoOscuro
        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
        // Se sincroniza solo en global_progress (ver saveGlobalProgress)
      };

      console.log('🔵 [AppContext.createSession] Llamando a createSessionFromState...');
      const session = createSessionFromState(sessionData, { syncToCloud: !cloudBackupWriteOnly });

      console.log('✅ [AppContext.createSession] Sesión creada:', session?.id);

      // Emitir evento para actualizar UI
      window.dispatchEvent(new CustomEvent('session-updated'));

      return session;
    } catch (error) {
      console.error('❌ [AppContext.createSession] Error:', error);
      console.error('❌ [AppContext.createSession] Stack:', error.stack);
      return null;
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentTextoId, sourceCourseId, currentUser, userData]);

  // 🆕 NUEVA FUNCIÓN: Actualizar sesión actual con cambios
  const updateCurrentSessionFromState = useCallback(async () => {
    try {
      console.log('💾 [AppContext.updateCurrentSession] Actualizando sesión actual...');

      // Verificar que hay una sesión activa
      const currentSessionId = getCurrentSessionId();
      if (!currentSessionId) {
        console.warn('⚠️ [AppContext.updateCurrentSession] No hay sesión activa para actualizar');
        return null;
      }

      // 🔥 CRÍTICO: Asegurar que el usuario esté configurado
      if (currentUser?.uid) {
        setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);
      }

      if (!texto || texto.length === 0) {
        console.warn('⚠️ [AppContext.updateCurrentSession] No hay texto para guardar');
        return null;
      }

      // 🆕 FIX CRÍTICO: Verificar que la sesión pertenece al mismo textoId
      // Esto previene que el análisis de una lectura sobrescriba otra
      const allSessions = getAllSessions();
      const loadedSession = allSessions.find(s => s.id === currentSessionId);
      const sessionTextoId = loadedSession?.currentTextoId || loadedSession?.text?.metadata?.id || loadedSession?.text?.textoId;

      if (sessionTextoId && currentTextoId && sessionTextoId !== currentTextoId) {
        console.warn('🚫 [AppContext.updateCurrentSession] ¡PREVINIENDO CONTAMINACIÓN!');
        console.warn(`   Sesión actual es para textoId: ${sessionTextoId}`);
        console.warn(`   Pero currentTextoId es: ${currentTextoId}`);
        console.warn('   NO se actualizará para evitar sobrescribir análisis correcto');
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
        artifactsDrafts: captureArtifactsDrafts(currentTextoId),
        settings: {
          modoOscuro
        }
        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
        // Se sincroniza solo en global_progress
      };

      const success = updateCurrentSession(updates, { syncToCloud: !cloudBackupWriteOnly });

      if (success) {
        console.log('✅ [AppContext.updateCurrentSession] Sesión actualizada:', currentSessionId);
        // Emitir evento para actualizar UI
        window.dispatchEvent(new CustomEvent('session-updated'));
        return currentSessionId;
      } else {
        console.error('❌ [AppContext.updateCurrentSession] Error actualizando sesión');
        return null;
      }
    } catch (error) {
      console.error('❌ [AppContext.updateCurrentSession] Error:', error);
      return null;
    }
  }, [texto, archivoActual, activeLecture, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro, currentTextoId, sourceCourseId, currentUser, userData, cloudBackupWriteOnly]);

  const restoreSession = useCallback(async (session) => {
    try {
      // 🛡️ Activar flag de restauración para bloquear efectos secundarios (como limpieza de análisis)
      isRestoringRef.current = true;

      // 🔒 Deshabilitar auto-guardado temporalmente durante restauración
      const currentId = getCurrentSessionId();
      if (currentId) {
        console.log('🔒 [AppContext] Deshabilitando auto-guardado durante restauración');
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

      if (success) {
        // 🆕 CRÍTICO: Si es un PDF con fileURL, descargar el archivo para poder mostrarlo
        const isPDF = session.text?.fileType === 'application/pdf' ||
          session.text?.fileName?.toLowerCase().endsWith('.pdf');
        let fileURL = session.text?.fileURL;

        // 🆕 FALLBACK: Si no hay fileURL pero tenemos textoId, buscar en Firestore
        if (isPDF && !fileURL && (session.currentTextoId || session.text?.metadata?.id)) {
          const textoId = session.currentTextoId || session.text?.metadata?.id;
          console.log('🔍 [AppContext] Buscando fileURL en Firestore para:', textoId);
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../firebase/config');
            const docSnap = await getDoc(doc(db, 'textos', textoId));
            if (docSnap.exists() && docSnap.data().fileURL) {
              fileURL = docSnap.data().fileURL;
              console.log('✅ [AppContext] fileURL encontrada en Firestore');
            }
          } catch (fbError) {
            console.warn('⚠️ [AppContext] No se pudo obtener fileURL de Firestore:', fbError);
          }
        }

        if (isPDF && fileURL) {
          console.log('📄 [AppContext] Restaurando PDF desde Storage...');
          try {
            const BACKEND_BASE_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
            const proxyUrl = `${BACKEND_BASE_URL}/api/storage/proxy?url=${encodeURIComponent(fileURL)}`;
            const res = await fetch(proxyUrl);

            if (res.ok) {
              const blob = await res.blob();
              const objectUrl = URL.createObjectURL(blob);
              const file = new File([blob], session.text.fileName, { type: session.text.fileType });

              setArchivoActualStable({
                name: session.text.fileName,
                type: session.text.fileType,
                fileURL: fileURL,
                file: file,
                objectUrl: objectUrl
              });
              console.log('✅ [AppContext] PDF restaurado correctamente');
            } else {
              console.warn('⚠️ [AppContext] No se pudo descargar el PDF, mostrando como texto');
              setArchivoActualStable({
                name: session.text.fileName,
                type: session.text.fileType
              });
            }
          } catch (pdfError) {
            console.warn('⚠️ [AppContext] Error descargando PDF:', pdfError);
            setArchivoActualStable({
              name: session.text.fileName,
              type: session.text.fileType
            });
          }
        } else if (session.text?.fileName && session.text?.fileType) {
          // Texto plano - solo guardar referencia
          setArchivoActualStable({
            name: session.text.fileName,
            type: session.text.fileType
          });
        }

        // 🆕 FASE 4 FIX: rewardsState NO se restaura desde sesiones individuales
        // Esto evita sobrescribir puntos actuales con datos obsoletos de sesiones antiguas
        // rewardsState se carga y sincroniza desde global_progress (listener dedicado ~línea 2457)
        if (session.rewardsState) {
          console.log('ℹ️ [AppContext] Ignorando rewardsState de sesión (se usa global_progress)');
        }

        // 🆕 FIX CRÍTICO: Si la sesión restaurada tiene rubricProgress vacío/débil,
        // intentar cargar desde Firestore como fuente de verdad (evita pérdida tras logout/login)
        const textoIdRestored = session.currentTextoId || session.text?.metadata?.id || session.text?.textoId;
        const sessionRubricKeys = Object.keys(session.rubricProgress || {}).filter(
          k => (session.rubricProgress[k]?.formative?.scores?.length || session.rubricProgress[k]?.scores?.length || 0) > 0
        );
        
        if (currentUser?.uid && textoIdRestored && sessionRubricKeys.length === 0) {
          console.log('🔄 [AppContext] Sesión sin rúbricas, intentando cargar desde Firestore...');
          try {
            const firestoreProgress = await getStudentProgress(currentUser.uid, textoIdRestored);
            if (firestoreProgress?.rubricProgress && Object.keys(firestoreProgress.rubricProgress).length > 0) {
              console.log('✅ [AppContext] Rúbricas encontradas en Firestore, aplicando...');
              setRubricProgress(normalizeRubricProgress(firestoreProgress.rubricProgress));
            }
            if (firestoreProgress?.activitiesProgress && Object.keys(firestoreProgress.activitiesProgress).length > 0) {
              console.log('✅ [AppContext] Actividades encontradas en Firestore, aplicando...');
              setActivitiesProgress(firestoreProgress.activitiesProgress);
            }
          } catch (fbErr) {
            console.warn('⚠️ [AppContext] Error cargando progreso de Firestore:', fbErr);
          }
        }

        console.log('✅ [AppContext] Sesión restaurada exitosamente');

        // Re-habilitar auto-guardado después de 500ms (suficiente para React render loop)
        setTimeout(() => {
          localStorage.removeItem('__restoring_session__');
          isRestoringRef.current = false; // 🔓 Liberar protección
          console.log('🔓 [AppContext] Auto-guardado re-habilitado y protección liberada');
        }, 500);
      } else {
        localStorage.removeItem('__restoring_session__');
      }

      return success;
    } catch (error) {
      console.error('❌ [AppContext] Error restaurando sesión:', error);
      localStorage.removeItem('__restoring_session__');
      isRestoringRef.current = false;
      return false;
    }
  }, [setTextoWithDebug, setCompleteAnalysis, setArchivoActualStable, setRubricProgress, setSavedCitations, setActivitiesProgress, setCurrentTextoId, setSourceCourseId]);

  // 🆕 AUTO-GUARDAR sesión cuando el análisis se complete
  useEffect(() => {
    // Ignorar si no hay análisis o si estamos restaurando
    if (!completeAnalysis || !texto || isRestoringRef.current) {
      return;
    }

    const isRestoring = localStorage.getItem('__restoring_session__');
    if (isRestoring) {
      console.log('🛡️ [AppContext] Saltando auto-guardado durante restauración');
      return;
    }

    console.log('💾 [AppContext] Auto-guardando sesión después de análisis completo...');

    const timeoutId = setTimeout(() => {
      const currentId = getCurrentSessionId();

      if (currentId) {
        console.log('📝 [AppContext] Actualizando sesión existente:', currentId);
        updateCurrentSessionFromState();
      } else {
        console.log('🆕 [AppContext] Creando nueva sesión automáticamente...');
        createSession().then(session => {
          if (session) {
            console.log('✅ [AppContext] Sesión auto-guardada:', session.id);
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
      console.log('💾 [AppContext] Auto-guardando progreso de actividades...');
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
      console.log('🆕 [AppContext] Texto detectado sin sesión, creando automáticamente...');
      
      const timeoutId = setTimeout(() => {
        createSession().then(session => {
          if (session) {
            console.log('✅ [AppContext] Sesión auto-creada:', session.id);
            window.dispatchEvent(new CustomEvent('session-updated'));
          }
        }).catch(error => {
          console.error('❌ [AppContext] Error en auto-creación:', error);
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
        console.log('⏸️ [AppContext] Auto-guardado pausado (restauración en curso)');
        return;
      }
    }

    // Solo guardar si hay una sesión actual activa y hay texto cargado
    const currentId = getCurrentSessionId();
    if (currentId && texto) {
      console.log('🔄 [AppContext] Auto-guardado programado para sesión:', currentId);
      // Usar un debounce para no guardar en cada cambio
      const timeoutId = setTimeout(() => {
        console.log('💾 [AppContext] Ejecutando auto-guardado de sesión:', currentId);
        const sessionData = captureCurrentState({
          texto,
          archivoActual,
          completeAnalysis,
          rubricProgress,
          savedCitations,
          activitiesProgress,
          modoOscuro
        });

        // Actualizar sesión actual
        const updated = updateCurrentSession(sessionData, { syncToCloud: !cloudBackupWriteOnly });
        console.log('✅ [AppContext] Auto-guardado completado:', updated);
      }, 2000); // Guardar 2 segundos después del último cambio

      return () => clearTimeout(timeoutId);
    }
  }, [texto, archivoActual, completeAnalysis, rubricProgress, savedCitations, activitiesProgress, modoOscuro]);

  // 🗑️ FUNCIÓN PARA ELIMINAR TODO EL HISTORIAL DE LA APLICACIÓN
  const clearAllHistory = useCallback(() => {
    console.log('🧹 [clearAllHistory] Iniciando LIMPIEZA NUCLEAR completa...');

    try {
      // Lista de claves a preservar (SOLO configuraciones y preferencias del usuario)
      const keysToPreserve = [
        'modoOscuro',
        'openai_api_key',
        'tutorDockWidth',
        'tutorFollowUpsEnabled',
        'tutorCompactMode',
        'tutorLengthMode',
        'tutorTemperature'
      ];

      // Prefijos a preservar (preferencias scopeadas por usuario)
      const prefixesToPreserve = [
        'tutorDockWidth:',
        'tutorFollowUpsEnabled:',
        'tutorCompactMode:',
        'tutorLengthMode:',
        'tutorTemperature:'
      ];

      // Obtener todas las claves de localStorage
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }

      // 🆕 PATRONES EXPANDIDOS - Limpieza más agresiva
      const patternsToRemove = [
        /^tutorHistorial/,           // Historial del tutor (tutorHistorial:hash)
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
          console.log(`  ✓ Eliminado: ${key}`);
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
          console.log(`  ✓ Eliminado (session): ${key}`);
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

      console.log(`✅ [clearAllHistory] Limpieza completada. ${removedCount} elementos eliminados.`);

      // Emitir evento para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('app-history-cleared'));

      return {
        success: true,
        removedCount,
        message: `Se eliminaron ${removedCount} elementos del historial`
      };
    } catch (error) {
      console.error('❌ [clearAllHistory] Error durante la limpieza:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al limpiar el historial'
      };
    }
  }, []);

  // NUEVO: Función para analizar documento con orquestador unificado
  // param textId: ID explícito del texto para evitar race conditions con el estado
  const analyzeDocument = useCallback(async (text, textId = null, options = {}) => {
    console.log('🔵 [AppContext.analyzeDocument] LLAMADA RECIBIDA');
    console.log('🔍 [AppContext.analyzeDocument] Longitud texto:', text?.length || 0, 'ID:', textId);

    // Compat: permitir analyzeDocument(text, { force: true })
    if (textId && typeof textId === 'object' && !Array.isArray(textId)) {
      options = textId;
      textId = null;
    }

    const forceReanalyze = !!(options && (options.force === true || options.forceReanalyze === true || options.bypassCache === true));
    if (forceReanalyze) {
      console.log('🧹 [AppContext.analyzeDocument] Force re-análisis: bypass de cachés habilitado');
    }

    if (!text || text.trim().length < 100) {
      console.warn('⚠️ [AppContext.analyzeDocument] Texto muy corto para análisis completo (mínimo 100 caracteres)');
      return;
    }

    // 🛡️ Si estamos restaurando, ignorar peticiones de análisis nuevas
    if (isRestoringRef.current) {
      console.log('🚫 [AppContext.analyzeDocument] Bloqueado por proceso de restauración activo');
      return;
    }

    // Identificador efectivo: el pasado por parámetro (prioridad) o el más reciente del estado
    const effectiveId = textId || currentTextoIdRef.current;

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

    console.log('🔒 [analyzeDocument] Estado capturado al inicio:');
    console.log('   - textoId:', capturedState.textoId);
    console.log('   - courseId:', capturedState.courseId);
    console.log('   - timestamp:', capturedState.capturedAt);

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

    console.log('📊 [AppContext.analyzeDocument] Iniciando análisis completo con backend RAG...');

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
              console.log(`✅ [AppContext] 🆕 A6: Cache Hit desde localStorage (edad: ${Math.round(cacheAge / 60000)}min)`);
              setCompleteAnalysis(analysis);
              setLoading(false);
              setAnalysisAttempted(true);
              return;
            }

            // Si el cache es preliminar, lo mostramos pero continuamos para disparar el análisis profundo.
            console.log(`ℹ️ [AppContext] Cache preliminar encontrado (edad: ${Math.round(cacheAge / 60000)}min), continuando con análisis profundo...`);
            setCompleteAnalysis(analysis);
            setLoading(false);
          } else {
            console.log(`⚠️ [AppContext] Cache expirado o inválido, procediendo a análisis`);
            localStorage.removeItem(cacheKey); // Limpiar cache inválido
          }
        }
      } catch (cacheError) {
        console.warn('⚠️ [AppContext] Error leyendo cache de localStorage:', cacheError.message);
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
        console.log(`✅ [AppContext] Cache Hit por currentTextoId: ${effectiveId}`);
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
          console.log(`✅ [AppContext] Cache Hit por longitud (~${expectedLen} chars)`);
          isSameText = true;
        }
      }

      if (isSameText) {
        console.log('⚡ [AppContext] Análisis recuperado de memoria/sesión. SALTANDO API.');
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

        console.log('🔎 [AppContext] Cache en memoria:', {
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
        console.warn('⚠️ [AppContext] Cache en memoria es preliminar o inválido (sin prelecture). Re-analizando...');
      } else {
        console.log('⚠️ [AppContext] Análisis en memoria NO coincide con texto actual. Procediendo a re-análisis.');
      }
    }

    setLoading(true);
    setError('');
    setAnalysisAttempted(true);

    // 🆕 A1 FIX: FASE 1 - Análisis básico instantáneo (heurísticas locales)
    console.log('⚡ [AppContext] A1 FIX: FASE 1 - Generando análisis básico instantáneo...');
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
      console.log('✅ [AppContext] A1 FIX: Análisis básico mostrado. Iniciando análisis profundo en background...');
      console.log(`🔑 [AppContext] A1-1 FIX: Document ID para esta sesión: ${analysisDocumentId}`);
    }

    // 🆕 A1 FIX: FASE 2 - Análisis profundo en background (no bloquea UI)
    // 🆕 A1-1 FIX: Pasamos originalDocId para verificar que el texto no cambió
    const enrichInBackground = async (originalDocId) => {

      // 🆕 A4 FIX: Helper function for fetch with automatic retry
      const fetchWithRetry = async (url, options, retries = 1, delay = 2000) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const res = await fetch(url, options);
            return res;
          } catch (fetchError) {
            const isNetworkError = fetchError.message.includes('Failed to fetch') ||
              fetchError.message.includes('NetworkError') ||
              fetchError.name === 'TypeError';

            if (isNetworkError && attempt < retries) {
              console.warn(`⚠️ [AppContext] Error de red, reintentando en ${delay}ms... (intento ${attempt + 1}/${retries + 1})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 1.5; // Backoff exponencial
            } else {
              throw fetchError;
            }
          }
        }
      };

      try {
        console.log('🌐 [AppContext.analyzeDocument] Llamando al endpoint /api/analysis/prelecture...');
        console.log('🔗 [AppContext.analyzeDocument] Backend URL:', BACKEND_URL);

        // Crear AbortController con timeout de 5 minutos (alineado con backend)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 segundos

        // 🆕 A4 FIX: Llamada al backend con retry automático para errores de red
        const response = await fetchWithRetry(`${BACKEND_URL}/api/analysis/prelecture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            metadata: {} // Metadata adicional si es necesario
          }),
          signal: controller.signal
        }, 1, 3000); // 1 retry con 3 segundos de espera inicial

        clearTimeout(timeoutId);

        // PARSEAR LA RESPUESTA (incluso en error) para poder usar fallback
        let responseData = null;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          responseData = null;
        }

        // Compat: algunos backends devuelven HTTP 200 con { degraded, fallback }
        // En ese caso, tratamos el fallback como resultado válido para no romper la UI.
        if (responseData && typeof responseData === 'object' && responseData.fallback && (responseData.degraded || responseData.error)) {
          console.warn('⚠️ [AppContext.analyzeDocument] Backend devolvió respuesta degradada con fallback (HTTP OK); usando fallback');
          const fullAnalysis = responseData.fallback;

          if (!fullAnalysis.metadata) fullAnalysis.metadata = {};
          fullAnalysis.metadata.currentTextoId = fullAnalysis.metadata.currentTextoId || (effectiveId || currentTextoId);
          fullAnalysis.metadata._isPreliminary = false;
          fullAnalysis.metadata._serverFallback = true;
          fullAnalysis.metadata._serverErrorMessage = responseData.message || responseData.error || 'Respuesta degradada'

          if (fullAnalysis.prelecture?.metadata && !fullAnalysis.prelecture.metadata.currentTextoId) {
            fullAnalysis.prelecture.metadata.currentTextoId = effectiveId || currentTextoId;
          }
          if (fullAnalysis.prelecture?.metadata) {
            fullAnalysis.prelecture.metadata._isPreliminary = false;
          }

          const latestTextoId = currentTextoIdRef.current;
          if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
            console.warn('⚠️ [AppContext] Fallback de análisis obsoleto (cambio de lectura); descartando');
            return;
          }

          setCompleteAnalysis(fullAnalysis);
          console.log('✅ [AppContext.analyzeDocument] Fallback degradado del backend guardado en contexto');
          return;
        }

        if (!response.ok) {
          // Si el backend envía fallback, NO bloquear la UI: úsalo como resultado válido
          if (responseData && responseData.fallback) {
            console.warn('⚠️ [AppContext.analyzeDocument] Backend devolvió error pero incluye fallback; continuando sin bloquear UI');
            const fullAnalysis = responseData.fallback;

            // Normalización mínima (mismo contrato que en éxito)
            if (!fullAnalysis.metadata) fullAnalysis.metadata = {};
            fullAnalysis.metadata.currentTextoId = fullAnalysis.metadata.currentTextoId || (effectiveId || currentTextoId);
            fullAnalysis.metadata._isPreliminary = false;
            fullAnalysis.metadata._serverFallback = true;
            fullAnalysis.metadata._serverErrorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;

            if (fullAnalysis.prelecture?.metadata && !fullAnalysis.prelecture.metadata.currentTextoId) {
              fullAnalysis.prelecture.metadata.currentTextoId = effectiveId || currentTextoId;
            }
            if (fullAnalysis.prelecture?.metadata) {
              fullAnalysis.prelecture.metadata._isPreliminary = false;
            }

            // Guard: si el usuario cambió de lectura, descartar resultados
            const latestTextoId = currentTextoIdRef.current;
            if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
              console.warn('⚠️ [AppContext] Fallback de análisis obsoleto (cambio de lectura); descartando');
              return;
            }

            setCompleteAnalysis(fullAnalysis);
            console.log('✅ [AppContext.analyzeDocument] Fallback del backend guardado en contexto');
            return;
          }

          const errorMessage = responseData?.message
            ? `${responseData.error || 'Error'}: ${responseData.message}`
            : (responseData?.error || `HTTP ${response.status}`);

          const customError = new Error(errorMessage);
          customError.response = { data: responseData };
          throw customError;
        }

        const fullAnalysis = responseData;

        console.log('📥 [AppContext.analyzeDocument] Análisis recibido:', fullAnalysis);

        // 🛡️ VALIDACIÓN FLEXIBLE: Metadata puede estar en diferentes ubicaciones
        const hasValidMetadata = fullAnalysis && typeof fullAnalysis === 'object' &&
          (fullAnalysis.metadata || fullAnalysis.prelecture?.metadata);

        if (!hasValidMetadata) {
          console.warn('⚠️ [AppContext] Análisis sin metadata válida, agregando estructura mínima');
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
          console.warn('⚠️ [AppContext] Resultado de análisis profundo obsoleto (cambio de lectura)');
          console.warn(`   Análisis era para: ${capturedState.textoId}`);
          console.warn(`   Lectura actual es: ${latestTextoId}`);
          console.log('🚫 [AppContext] Descartando setCompleteAnalysis para evitar contaminación');
          return;
        }

        const currentDocId = completeAnalysisRef.current?.metadata?.document_id;
        if (originalDocId && currentDocId && originalDocId !== currentDocId) {
          console.warn(`⚠️ [AppContext] A1-1 FIX: Race condition detectada! El texto cambió durante análisis.`);
          console.warn(`   Original: ${originalDocId}, Actual: ${currentDocId}`);
          console.log('🚫 [AppContext] Descartando análisis profundo obsoleto.');
          return; // No actualizar con análisis del texto anterior
        }

        setCompleteAnalysis(fullAnalysis);
        console.log('✅ [AppContext.analyzeDocument] Análisis completo guardado en contexto');

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
              console.log(`🗑️ [AppContext] A6-1 FIX: Cache antiguo eliminado: ${key.substring(0, 30)}...`);
            });
          }

          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(`💾 [AppContext] 🆕 A6: Análisis guardado en localStorage (clave: ${cacheKey.substring(0, 30)}...)`);
        } catch (cacheError) {
          // Si falla (quota exceeded, etc), no interrumpir el flujo
          console.warn('⚠️ [AppContext] No se pudo guardar cache en localStorage:', cacheError.message);
        }

        // 🆕 CREAR SESIÓN después del análisis exitoso
        console.log('💾 [AppContext.analyzeDocument] Creando sesión con análisis completo...');
        console.log('🔍 [AppContext.analyzeDocument] text param length:', text?.length || 0);
        console.log('🔍 [AppContext.analyzeDocument] texto state length:', texto?.length || 0);

        const currentId = getCurrentSessionId();
        // USAR EL PARÁMETRO 'text' EN LUGAR DEL ESTADO 'texto'
        // FIX: Asegurar que usamos el texto analizado para la sesión
        if (text && text.length > 0) {
          console.log('🆕 [AppContext.analyzeDocument] Creando/Actualizando sesión con texto analizado...');
          try {
            // 🆕 FIX: Verificar que el usuario NO cambió de lectura durante el análisis
            if (capturedState.textoId !== currentTextoIdRef.current) {
              console.warn('⚠️ [analyzeDocument] ¡Usuario cambió de lectura durante análisis!');
              console.warn(`   Análisis era para: ${capturedState.textoId}`);
              console.warn(`   Lectura actual es: ${currentTextoIdRef.current}`);
              console.log('🚫 NO se guardará sesión para evitar contaminación');
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

            console.log('💾 [analyzeDocument] Guardando sesión con datos capturados:');
            console.log('   - textoId:', sessionData.currentTextoId);
            console.log('   - courseId:', sessionData.sourceCourseId);

            if (currentId) {
              updateCurrentSession(sessionData, { syncToCloud: !cloudBackupWriteOnly });
              console.log('✅ [AppContext.analyzeDocument] Sesión actual actualizada con análisis');
            } else {
              const session = createSessionFromState(sessionData, { syncToCloud: !cloudBackupWriteOnly });
              if (session) {
                console.log('✅ [AppContext.analyzeDocument] Nueva sesión creada:', session.id);
              }
            }

            // Forzar actualización de UI
            window.dispatchEvent(new CustomEvent('session-updated'));

          } catch (sessionError) {
            console.error('❌ [AppContext.analyzeDocument] Error gestionando sesión:', sessionError);
          }
        } else {
          console.warn('⚠️ [AppContext.analyzeDocument] No hay texto válido para sesión (text length:', text?.length || 0, ')');
        }

      } catch (err) {
        console.error('❌ [AppContext.analyzeDocument] Error en análisis completo:', err);

        // Si el usuario cambió de lectura, no aplicar fallback para evitar contaminación
        const latestTextoId = currentTextoIdRef.current;
        if (capturedState.textoId && latestTextoId && capturedState.textoId !== latestTextoId) {
          console.warn('⚠️ [AppContext] Error de análisis profundo para lectura anterior; evitando fallback en lectura actual');
          return;
        }

        // Si ya existe un análisis (fase 1), NO bloquear Lectura Guiada por fallo en background
        const hasExistingAnalysis = !!completeAnalysisRef.current;
        if (!hasExistingAnalysis) {
          if (err.name === 'AbortError') {
            setError('El análisis tardó demasiado tiempo y fue cancelado');
            console.error('❌ [AppContext.analyzeDocument] Timeout después de 2 minutos');
          } else {
            console.error('❌ [AppContext.analyzeDocument] Stack:', err.stack);
            setError(`Error en análisis: ${err.message}`);
          }
        } else {
          console.warn('⚠️ [AppContext.analyzeDocument] Error en análisis profundo (background). Se mantiene análisis previo.');
        }

        // Solo degradar a fallback mínimo si NO hay análisis previo (fase 1)
        if (!completeAnalysisRef.current) {
          if (err.response?.data?.fallback) {
            setCompleteAnalysis(err.response.data.fallback);
          } else {
            console.log('🔧 [AppContext.analyzeDocument] Creando análisis fallback mínimo...');
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
        // No setLoading(false) aquí porque ya se hizo en Fase 1
        console.log('🏁 [AppContext.analyzeDocument] Fase 2 (análisis profundo) finalizada');
      }
    }; // Fin de enrichInBackground

    // 🆕 A1 FIX: Ejecutar análisis profundo en background (no esperamos)
    // 🆕 A1-1 FIX: Pasamos document ID para verificar race condition
    enrichInBackground(analysisDocumentId).catch(err => {
      console.error('❌ [AppContext] Error en análisis profundo de background:', err);
    });

  }, [texto, archivoActual, rubricProgress, savedCitations, modoOscuro, setCompleteAnalysis]);

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
    console.log('🔍 [AppContext] useEffect Firebase sync ejecutado, currentUser:', currentUser?.email || 'null', 'uid:', currentUser?.uid || 'null');

    if (currentUser?.uid) {
      console.log('🔄 [AppContext] Usuario autenticado detectado, sincronizando sesiones...');
      console.log('👤 [AppContext] UID:', currentUser.uid);
      console.log('👤 [AppContext] Email:', currentUser.email);
      console.log('👤 [AppContext] Nombre:', userData?.nombre || 'sin nombre');

      // Establecer usuario en sessionManager
      setSessionManagerUser(currentUser.uid, userData?.nombre || currentUser.email);

      // Sincronizar sesiones locales → Firebase
      syncAllSessionsToCloud()
        .then(result => {
          console.log(`✅ [AppContext] Sincronización completada: ${result.synced} sesiones subidas`);
          if (result.errors > 0) {
            console.warn(`⚠️ [AppContext] ${result.errors} errores en sincronización`);
          }
        })
        .catch(error => {
          console.error('❌ [AppContext] Error en sincronización inicial:', error);
        });

      // Nota: No necesitamos cargar sesiones aquí porque getAllSessionsMerged()
      // ya combina automáticamente localStorage + Firestore cuando se llama
      // desde el componente HistorialSesiones

    } else if (currentUser === null) {
      // Usuario deslogueado, limpiar referencia
      console.log('🔒 [AppContext] Usuario deslogueado, limpiando referencia');
      setSessionManagerUser(null, null);
    } else {
      console.log('⏳ [AppContext] currentUser es undefined, esperando...');
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

    console.log('👂 [AppContext] Iniciando listener de progreso en tiempo real...');

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
        console.log('📥 [AppContext] Cargando progreso inicial desde Firestore...');
        const initialData = await getStudentProgress(currentUser.uid, progressDocId);

        if (!mounted || !initialData) {
          console.log('ℹ️ [AppContext] No hay datos iniciales en Firestore');
          return;
        }

        console.log('✅ [AppContext] Datos iniciales cargados desde Firestore');

        // 🔄 DETECTAR RESET: Si lastResetAt existe, limpiar datos locales ANTES del merge
        if (initialData.lastResetAt) {
          const resetTime = initialData.lastResetAt?.seconds 
            ? initialData.lastResetAt.seconds * 1000 
            : (typeof initialData.lastResetAt === 'number' ? initialData.lastResetAt : 0);
          
          if (resetTime > 0) {
            console.log('🔄 [AppContext] RESET DETECTADO en carga inicial - limpiando datos locales...');
            
            // Limpiar localStorage
            const rubricKey = rubricProgressKey(currentUser.uid, progressDocId);
            const activitiesKey = activitiesProgressKey(currentUser.uid, progressDocId);
            localStorage.removeItem(rubricKey);
            localStorage.removeItem(activitiesKey);
            
            // Limpiar cualquier key relacionada
            Object.keys(localStorage).forEach(k => {
              if ((k.includes('activity_results_') || k.includes('rubric') || k.includes('activities')) 
                  && k.includes(progressDocId)) {
                localStorage.removeItem(k);
                console.log('🧹 [AppContext] Limpiado localStorage key:', k);
              }
            });
            
            // Aplicar datos reseteados de Firestore directamente (sin merge)
            if (initialData.rubricProgress) {
              setRubricProgress(normalizeRubricProgress(initialData.rubricProgress));
              console.log('✅ [AppContext] rubricProgress reemplazado tras reset (carga inicial)');
            } else {
              setRubricProgress(emptyRubricProgress);
            }
            
            if (initialData.activitiesProgress) {
              setActivitiesProgress(initialData.activitiesProgress);
              console.log('✅ [AppContext] activitiesProgress reemplazado tras reset (carga inicial)');
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
          console.log('🔄 [AppContext] Reset parcial detectado en artefactos:', resetArtifacts);
          
          // Limpiar localStorage para actividades
          const activitiesKey = activitiesProgressKey(currentUser.uid, progressDocId);
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
          console.log('📊 [Carga Inicial] Cargando rubricProgress desde Firebase (Merge con local)');

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
          console.log('🎯 [Carga Inicial] Cargando activitiesProgress desde Firebase (Merge con local)');

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
        console.error('❌ [AppContext] Error cargando progreso inicial:', error);

        // FALLBACK: Intentar rehidratar desde airbag local (firestore_backup_*)
        const backup = readFirestoreBackup(currentUser.uid, progressDocId);
        if (backup) {
          console.log('📦 [AppContext] Usando firestore_backup_* como fallback de progreso');

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

        // FALLBACK EN ERROR: Intentar cargar caché local
        if (window.__rewardsEngine) {
          console.log('⚠️ [AppContext] Error en Firebase, usando caché local para rewards...');
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
          console.log('ℹ️ [AppContext] No hay progreso remoto aún');
          return;
        }

        console.log('📥 [AppContext] Progreso recibido desde Firestore (realtime):', progressData);

        // 🔄 DETECTAR RESET EN TIEMPO REAL: Si lastResetAt existe, aplicar reset inmediato
        // ⚠️ Solo procesar si es un reset NUEVO (no ya procesado)
        if (progressData.lastResetAt) {
          const resetTime = progressData.lastResetAt?.seconds 
            ? progressData.lastResetAt.seconds * 1000 
            : (typeof progressData.lastResetAt === 'number' ? progressData.lastResetAt : 0);
          
          // 🆕 FIX: Solo procesar si este reset es MÁS RECIENTE que el último procesado
          if (resetTime > 0 && resetTime > lastProcessedResetTimeRef.current) {
            console.log('🔄 [AppContext] RESET NUEVO DETECTADO en tiempo real - aplicando cambios...', {
              resetTime,
              lastProcessed: lastProcessedResetTimeRef.current
            });
            
            // Marcar como procesado ANTES de aplicar para evitar re-entradas
            lastProcessedResetTimeRef.current = resetTime;
            
            // Limpiar localStorage
            const rubricKey = rubricProgressKey(currentUser.uid, progressDocId);
            const activitiesKey = activitiesProgressKey(currentUser.uid, progressDocId);
            localStorage.removeItem(rubricKey);
            localStorage.removeItem(activitiesKey);
            
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
            
            console.log('✅ [AppContext] Reset aplicado desde evento en tiempo real');
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
          console.log('🔄 [AppContext] Reset parcial detectado en artefactos (realtime):', resetArtifacts);
          
          // Aplicar activitiesProgress de Firestore directamente
          setActivitiesProgress(progressData.activitiesProgress);
          
          // También actualizar rubricProgress correspondiente
          if (progressData.rubricProgress) {
            setRubricProgress(normalizeRubricProgress(progressData.rubricProgress));
          }
          
          window.dispatchEvent(new CustomEvent('progress-reset-from-teacher', {
            detail: { type: 'artifact-reset-realtime', artifacts: resetArtifacts }
          }));
          
          console.log('✅ [AppContext] Reset parcial aplicado');
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

              // Si no existe localmente, agregar directamente
              if (!localRubric || !localRubric.scores || localRubric.scores.length === 0) {
                mergedRubrics[rubricId] = remoteRubric;
                hasChanges = true;
                console.log(`📊 [Sync] ${rubricId}: Datos remotos agregados (no existía local)`);
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
                console.log(`📊 [Sync] ${rubricId}: Concatenados ${newRemoteScores.length} scores remotos (total: ${combinedScores.length})`);
              } else {
                console.log(`📊 [Sync] ${rubricId}: Sin scores nuevos desde remoto`);
              }
            });

            if (hasChanges) {
              console.log('✅ [Sync] rubricProgress actualizado desde Firestore');
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
                console.log(`🎯 [Sync] ${docId}: Actividad remota agregada (no existía local)`);
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
                console.log(`🎯 [Sync] ${docId}: Remota tiene más artefactos entregados (${remoteArtifacts.submittedCount} > ${localArtifacts.submittedCount})`);
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness > localCompleteness) {
                mergedActivities[docId] = remoteDoc;
                hasChanges = true;
                console.log(`🎯 [Sync] ${docId}: Remota más completa (${remoteCompleteness} campos > ${localCompleteness})`);
              } else if (remoteArtifacts.submittedCount === localArtifacts.submittedCount && remoteCompleteness === localCompleteness) {
                const remoteTs = Math.max(remoteTimestamp, remoteArtifacts.latestSubmittedAt);
                const localTs = Math.max(localTimestamp, localArtifacts.latestSubmittedAt);

                if (remoteTs > localTs) {
                  mergedActivities[docId] = remoteDoc;
                  hasChanges = true;
                  console.log(`🎯 [Sync] ${docId}: Remota más reciente (${new Date(remoteTs).toLocaleTimeString()})`);
                } else {
                  console.log(`🎯 [Sync] ${docId}: Local más completa o igual, manteniendo`);
                }
              } else {
                console.log(`🎯 [Sync] ${docId}: Local más completa o igual, manteniendo`);
              }
            });

            if (hasChanges) {
              console.log('✅ [Sync] activitiesProgress actualizado desde Firestore');
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
      }
    );

    console.log('✅ [AppContext] Listener de tiempo real activo');

    // Cleanup al desmontar o cambiar usuario
    return () => {
      mounted = false;
      console.log('🔌 [AppContext] Desconectando listener de progreso');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, userData, currentTextoId, readFirestoreBackup, useFirestorePersistenceHook]);

  // 🎮 LISTENER GLOBAL: Puntos/logros SIEMPRE desde global_progress
  useEffect(() => {
    if (!currentUser?.uid || !userData?.role) return;
    if (userData.role !== 'estudiante') return;

    console.log('👂 [AppContext] Iniciando listener global de rewardsState (global_progress)...');

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
            console.log('🛡️ [AppContext] Reset local reciente detectado, ignorando estado remoto');
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
              console.log('✅ [AppContext] Estado local vacío, cargando desde Firestore:', remotePoints, 'pts');
              lastRewardsStateFromCloudAtRef.current = Date.now();
              window.__rewardsEngine.importState(remoteState, false);
            } else {
              // 🆕 FIX: Si ambos tienen el mismo resetAt pero local tiene más puntos, NO sobrescribir
              const sameResetEpoch = localResetAt === remoteResetAt && localResetAt > 0;
              if (sameResetEpoch && localPoints > remotePoints) {
                console.log('🛡️ [AppContext] Local tiene más puntos en mismo epoch de reset, subiendo a Firestore');
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
        console.error('❌ [AppContext] Error cargando rewardsState inicial (global_progress):', error);
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
            console.log('🛡️ [AppContext] Listener: Reset local reciente detectado, ignorando estado remoto');
            return; // No hacer nada, el reset ya sincronizó
          }

          // 🆕 FIX: Si local está vacío (resetAt=0 después de logout), preferir remoto
          const localIsEmpty = localResetAt === 0 || (localPoints === 0 && remotePoints > 0);
          if (localIsEmpty && remotePoints > 0) {
            console.log('✅ [AppContext] Listener: Estado local vacío, cargando desde Firestore:', remotePoints, 'pts');
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
            console.log('🛡️ [AppContext] Listener: Local tiene más puntos en mismo epoch de reset, subiendo a Firestore');
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
          console.error('❌ [Sync] Error en merge de rewardsState (global_progress):', error);
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
        console.log('📥 [AppContext] Cargando sesiones iniciales desde Firestore...');

        const firestoreSessions = await getUserSessions(currentUser.uid);

        if (!mounted) return;

        // Merge con sesiones locales
        const localSessions = getAllSessions();
        const merged = mergeSessions(localSessions, firestoreSessions);

        // Guardar merged en localStorage (scoped por usuario)
        replaceAllLocalSessions(merged);

        console.log(`✅ [AppContext] ${merged.length} sesiones cargadas desde Firebase (${firestoreSessions.length} remotas, ${localSessions.length} locales)`);

        // Emitir evento para actualizar UI
        window.dispatchEvent(new CustomEvent('sessions-loaded-from-firebase', {
          detail: { count: merged.length }
        }));

      } catch (error) {
        console.error('❌ [AppContext] Error cargando sesiones iniciales:', error);
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

    console.log('👂 [AppContext] Iniciando listener de sesiones en tiempo real...');

    const unsubscribe = subscribeToUserSessions(currentUser.uid, (sessions) => {
      // 🆕 P12 FIX: Ignorar callbacks de usuarios anteriores
      if (!isCurrent) {
        console.log('⚠️ [AppContext] Ignorando callback de listener obsoleto');
        return;
      }

      console.log(`📥 [AppContext] Actualización de sesiones en tiempo real: ${sessions.length} sesiones`);

      // Actualizar localStorage para persistencia offline y consistencia
      // Nota: subscribeToUserSessions ya devuelve las sesiones mapeadas y ordenadas

      // ✅ Merge correcto: preserva sesiones locales no subidas y resuelve conflictos.
      // Nota: getAllSessions() retorna sesiones crudas sin flags (source/inCloud/inLocal),
      // por lo que no se puede filtrar por `s.source === 'local'` aquí.
      const localSessions = getAllSessions();
      const merged = mergeSessions(localSessions, sessions);

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

    console.log('🎓 [AppContext] Análisis completo detectado, marcando notas disponibles para:', currentTextoId);

    // Marcamos que hay notas disponibles (el componente NotasEstudio las generará)
    setNotasAutoGeneradasByTextoId((prev) => ({
      ...(prev || {}),
      [currentTextoId]: true
    }));

    // Flag persistente aislado por lectura
    localStorage.setItem(`notas_disponibles_${currentTextoId}`, 'true');
  }, [completeAnalysis, texto, currentTextoId, notasAutoGeneradasByTextoId]);

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
    syncCitationsToFirestore
  }), [setTextoWithDebug, handleApiKeyChange, toggleModoOscuro, setLoadingStable, setErrorStable, setArchivoActualStable, setTextStructureStable, analyzeDocument, updateRubricScore, updateFormativeScore, submitSummativeEssay, checkEssayPrerequisites, clearRubricProgress, resetAllProgress, saveCitation, deleteCitation, getCitations, clearDocumentCitations, updateActivitiesProgress, markPreparationProgress, resetActivitiesProgress, clearAllHistory, createSession, updateCurrentSessionFromState, restoreSession, saveCurrentTextToFirestore, syncRubricProgressToFirestore, saveEvaluationToFirestore, syncCitationsToFirestore]);

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
    syncStatus
  }), [texto, openAIApiKey, modoOscuro, loading, error, archivoActual, textStructure, completeAnalysis, analysisAttempted, currentTextoId, sourceCourseId, rubricProgress, savedCitations, notasAutoGeneradasByTextoId, currentUser, userData, activitiesProgress, sessionConflict, conflictingSessionInfo, syncStatus]);

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
