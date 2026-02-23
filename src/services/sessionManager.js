/**
 * 💾 WORK SESSION MANAGER (services/sessionManager.js)
 * ====================================================
 * 
 * PROPÓSITO: Gestionar sesiones de TRABAJO del estudiante (como "guardar partida").
 * 
 * ⚠️ NO CONFUNDIR CON: firebase/sessionManager.js (control de LOGIN/autenticación)
 * 
 * FUNCIONALIDADES:
 * - Guarda progreso completo del usuario (texto, análisis, artefactos, evaluaciones)
 * - Persistencia dual: localStorage (inmediato) + Firestore (async)
 * - Historial de sesiones (como "partidas guardadas" de un juego)
 * - Merge inteligente entre local y cloud
 * - Captura instantáneas de borradores de artefactos
 * 
 * ESTRUCTURA DE UNA SESIÓN:
 * {
 *   id: "session_1733580000000_abc123",
 *   name: "Análisis de Artículo Científico",
 *   texto: "El texto completo...",
 *   completeAnalysis: { critical: {...}, preLectura: {...} },
 *   rubricProgress: { rubrica1: {...}, ... },
 *   artifactsDrafts: { resumen: "...", tablaACD: {...} },
 *   createdAt: 1733580000000,
 *   updatedAt: 1733590000000
 * }
 * 
 * USO TÍPICO:
 * - AppContext.js: createSession(), restoreSession(), updateCurrentSession()
 * - SessionsHistory.js: getAllSessions(), deleteSession()
 * - Artefactos: captureArtifactsDrafts() para guardar borradores
 * 
 * @module services/sessionManager
 * @see firebase/sessionManager.js para control de LOGIN/autenticación
 */

import {
  saveSessionToFirestore,
  saveDraftBackupToFirestore,
  getUserSessions,
  deleteSessionFromFirestore,
  deleteAllUserSessions,
  mergeSessions
} from '../firebase/firestore';
import { validateAndSanitizeSession } from '../utils/sessionValidator';
import logger from '../utils/logger';
import { scopeKey } from '../utils/storageKeys';

const SESSIONS_KEY_PREFIX = 'appLectura_sessions_';
const LEGACY_SESSIONS_KEY = 'appLectura_sessions';
const CURRENT_SESSION_KEY_PREFIX = 'appLectura_current_session_id_';
const LEGACY_CURRENT_SESSION_KEY = 'appLectura_current_session_id';
const PENDING_SYNCS_KEY_PREFIX = 'appLectura_pending_syncs_'; // 🆕 Para race condition fix (scoped por usuario)
const LEGACY_PENDING_SYNCS_KEY = 'appLectura_pending_syncs'; // Compat legacy (sin scope)

const MAX_SESSIONS = 20; // 🎯 Límite aumentado a 20 para evitar pérdida de progreso en cursos
const DELETED_SESSIONS_KEY_PREFIX = 'appLectura_deleted_sessions_'; // 🆕 Tombstones para evitar resurrección
const TOMBSTONE_TTL = 10 * 60 * 1000; // 10 minutos de vida para tombstones (tolerancia offline)

// Variable global para mantener referencia al usuario actual
let currentUserId = null;

// 🆕 Set para rastrear sesiones pendientes de sincronización
const pendingSyncIds = new Set();
let unloadSyncSetupDone = false;
let opportunisticSyncInFlight = false;

// ============================================
// 🪦 SISTEMA DE TOMBSTONES ANTI-RESURRECCIÓN
// ============================================

/**
 * Obtiene la clave de tombstones scoped por usuario
 */
function getDeletedSessionsKey() {
  if (!currentUserId) return `${DELETED_SESSIONS_KEY_PREFIX}anonymous`;
  return `${DELETED_SESSIONS_KEY_PREFIX}${currentUserId}`;
}

/**
 * Registra un sessionId como eliminado (tombstone temporal)
 * Evita que mergeSessions re-introduzca la sesión desde Firestore
 * @param {string} sessionId
 */
export function addDeletedSessionTombstone(sessionId) {
  try {
    const key = getDeletedSessionsKey();
    const raw = localStorage.getItem(key);
    const tombstones = raw ? JSON.parse(raw) : {};
    tombstones[sessionId] = Date.now();
    localStorage.setItem(key, JSON.stringify(tombstones));
    logger.log(`🪦 [SessionManager] Tombstone creado para sesión: ${sessionId}`);
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error creando tombstone:', e);
  }
}

/**
 * Obtiene el Set de sessionIds con tombstones activos (no expirados)
 * @returns {Set<string>}
 */
export function getDeletedSessionTombstones() {
  try {
    const key = getDeletedSessionsKey();
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();

    const tombstones = JSON.parse(raw);
    const now = Date.now();
    const activeIds = new Set();
    let hasExpired = false;

    for (const [id, timestamp] of Object.entries(tombstones)) {
      if (now - timestamp < TOMBSTONE_TTL) {
        activeIds.add(id);
      } else {
        hasExpired = true;
      }
    }

    // Limpiar tombstones expirados
    if (hasExpired) {
      const cleaned = {};
      for (const [id, timestamp] of Object.entries(tombstones)) {
        if (now - timestamp < TOMBSTONE_TTL) {
          cleaned[id] = timestamp;
        }
      }
      localStorage.setItem(key, JSON.stringify(cleaned));
    }

    return activeIds;
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error leyendo tombstones:', e);
    return new Set();
  }
}

/**
 * Limpia un tombstone específico (cuando la eliminación de Firestore se confirmó)
 * @param {string} sessionId
 */
export function clearDeletedSessionTombstone(sessionId) {
  try {
    const key = getDeletedSessionsKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const tombstones = JSON.parse(raw);
    delete tombstones[sessionId];
    localStorage.setItem(key, JSON.stringify(tombstones));
  } catch (e) {
    // Silencioso
  }
}

/**
 * Registra múltiples tombstones (para deleteAll)
 * @param {string[]} sessionIds
 */
export function addBulkDeletedTombstones(sessionIds) {
  try {
    const key = getDeletedSessionsKey();
    const raw = localStorage.getItem(key);
    const tombstones = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    sessionIds.forEach(id => { tombstones[id] = now; });
    localStorage.setItem(key, JSON.stringify(tombstones));
    logger.log(`🪦 [SessionManager] ${sessionIds.length} tombstones creados (bulk)`);
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error creando tombstones bulk:', e);
  }
}

function isDraftsEffectivelyEmpty(artifactsDrafts) {
  if (!artifactsDrafts || typeof artifactsDrafts !== 'object') return true;

  const stack = [artifactsDrafts];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (typeof node === 'string') {
      if (node.trim().length > 0) return false;
      continue;
    }
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }
    if (typeof node === 'object') {
      for (const k of Object.keys(node)) stack.push(node[k]);
    }
  }

  return true;
}

/**
 * ☁️ Opción A: Backup write-only de borradores hacia Firestore.
 * - No toca localStorage ni la lista local de sesiones.
 * - Usa un ID estable por (user, textoId) para ir sobreescribiendo.
 */
export async function saveDraftBackupToCloudWriteOnly({
  textoId,
  sourceCourseId = null,
  fileName = null,
  fileType = null,
  fileURL = null,
  artifactsDrafts = null
} = {}) {
  if (!currentUserId) return { ok: false, reason: 'no-user' };
  if (!textoId) return { ok: false, reason: 'no-textoId' };

  const drafts = artifactsDrafts && typeof artifactsDrafts === 'object'
    ? artifactsDrafts
    : captureArtifactsDrafts(textoId, sourceCourseId);

  if (isDraftsEffectivelyEmpty(drafts)) {
    return { ok: false, reason: 'empty-drafts' };
  }

  const now = Date.now();
  const sessionId = `draft_backup_${scopeKey(sourceCourseId, textoId) || textoId}`;

  await saveDraftBackupToFirestore(currentUserId, {
    id: sessionId,
    textoId,
    sourceCourseId,
    artifactsDrafts: drafts,
    fileMeta: {
      fileName: fileName || 'texto_manual',
      fileType: fileType || 'text/plain',
      fileURL: fileURL || null
    },
    backupMeta: {
      kind: 'artifactsDrafts',
      writeOnly: true,
      updatedAt: now
    }
  });

  return { ok: true, sessionId };
}

/**
 * 🧹 Limpieza best-effort: elimina backups legacy `draft_backup_*` que se
 * guardaron históricamente en `/users/{uid}/sessions`.
 *
 * - No afecta sesiones reales.
 * - Solo toca Firestore.
 * - Pensado para ejecutarse una vez (AppContext lo gatea con una marca).
 */
export async function cleanupLegacyDraftBackupsInSessions({ maxToScan = 200 } = {}) {
  if (!currentUserId) return { ok: false, reason: 'no-user', scanned: 0, deleted: 0, failed: 0 };

  try {
    const scannedLimit = Number.isFinite(maxToScan) && maxToScan > 0 ? Math.floor(maxToScan) : 200;
    const all = await getUserSessions(currentUserId, { includeCloudBackups: true, limitCount: scannedLimit });

    const candidates = (all || []).filter((s) => {
      if (!s || typeof s !== 'object') return false;
      const id = String(s.id || '');
      if (id.startsWith('draft_backup_')) return true;
      const kind = s.backupMeta?.kind;
      return Boolean(s.isCloudBackup && kind === 'artifactsDrafts');
    });

    if (candidates.length === 0) {
      return { ok: true, scanned: all?.length || 0, deleted: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      candidates.map((s) => deleteSessionFromFirestore(currentUserId, s.id))
    );

    const deleted = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - deleted;

    return { ok: true, scanned: all?.length || 0, deleted, failed };
  } catch (error) {
    logger.warn('⚠️ [SessionManager] Error limpiando draft backups legacy en sessions:', error);
    return { ok: false, reason: 'error', scanned: 0, deleted: 0, failed: 0 };
  }
}

// Helper para obtener key de storage
function getStorageKey(uid = currentUserId) {
  return uid ? `${SESSIONS_KEY_PREFIX}${uid}` : `${SESSIONS_KEY_PREFIX}guest`;
}

function getCurrentSessionIdKey(uid = currentUserId) {
  return uid ? `${CURRENT_SESSION_KEY_PREFIX}${uid}` : `${CURRENT_SESSION_KEY_PREFIX}guest`;
}

function getPendingSyncsKey(uid = currentUserId) {
  return uid ? `${PENDING_SYNCS_KEY_PREFIX}${uid}` : `${PENDING_SYNCS_KEY_PREFIX}guest`;
}

// 🛡️ Migración segura: mover pending syncs legacy -> scoped, filtrando solo sesiones existentes
function migratePendingSyncsIfNeeded(uid) {
  try {
    if (!uid) return;
    const scopedKey = getPendingSyncsKey(uid);

    // Si ya hay pendientes scoped, no migrar
    const already = JSON.parse(localStorage.getItem(scopedKey) || '[]');
    if (Array.isArray(already) && already.length > 0) return;

    const legacy = JSON.parse(localStorage.getItem(LEGACY_PENDING_SYNCS_KEY) || '[]');
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    // Filtrar: solo mantener IDs que existan en las sesiones locales del usuario actual
    const sessions = getAllSessions();
    const existingIds = new Set((sessions || []).map(s => s?.id).filter(Boolean));
    const filtered = legacy.filter(id => existingIds.has(id));
    if (filtered.length === 0) return;

    localStorage.setItem(scopedKey, JSON.stringify(filtered));

    // Limpiar solo los IDs migrados desde legacy para no pisar otros posibles usuarios
    const remaining = legacy.filter(id => !existingIds.has(id));
    localStorage.setItem(LEGACY_PENDING_SYNCS_KEY, JSON.stringify(remaining));

    logger.log('📦 [SessionManager] Migrados pending syncs legacy -> scoped:', { uid, migrated: filtered.length });
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error migrando pending syncs:', e);
  }
}

/**
 * 🆕 FASE 1 FIX: Genera clave namespaced para borradores
 * Aísla borradores por textoId (y opcionalmente courseId) para evitar contaminación entre lecturas
 * @param {string} baseKey - Clave base (ej: 'resumenAcademico_draft')
 * @param {string|null} textoId - ID del texto actual
 * @param {string|null} courseId - ID del curso (opcional, para aislamiento cross-course)
 * @returns {string} - Clave namespaced (ej: 'courseId_textoId_resumenAcademico_draft')
 */
export function getDraftKey(baseKey, textoId = null, courseId = null) {
  if (!textoId) {
    // Fallback a clave global si no hay textoId (compatibilidad)
    return baseKey;
  }
  const scoped = scopeKey(courseId, textoId) || textoId;
  return `${scoped}_${baseKey}`;
}

// 🛡️ MIGRACIÓN LEGACY: Mover datos de la key global a la key del usuario actual (solo primera vez)
function _migrateLegacyDataIfNeeded() {
  try {
    const legacyData = localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (!legacyData) return;

    // Si encontramos datos legacy, intentamos migrarlos
    const targetKey = getStorageKey();
    if (!localStorage.getItem(targetKey)) {
      logger.log('📦 [SessionManager] Migrando sesiones legacy a:', targetKey);
      localStorage.setItem(targetKey, legacyData);

      // Migrar también el ID de sesión actual
      const legacyCurrent = localStorage.getItem(LEGACY_CURRENT_SESSION_KEY);
      if (legacyCurrent) {
        localStorage.setItem(getCurrentSessionIdKey(), legacyCurrent);
        localStorage.removeItem(LEGACY_CURRENT_SESSION_KEY);
      }

      // Limpiar legacy sessions después de migrar
      localStorage.removeItem(LEGACY_SESSIONS_KEY);
    }
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error migrando legacy data:', e);
  }
}

/**
 * Establece el usuario actual para sincronización con Firestore
 * @param {string|null} userId 
 */
export function setCurrentUser(userId) {
  currentUserId = userId;
  logger.log('👤 [SessionManager] Usuario establecido:', userId || 'guest');
  // 🆕 Migración segura de pending syncs (filtrada por sesiones existentes)
  if (userId) migratePendingSyncsIfNeeded(userId);
  // 🛡️ SEGURIDAD: Desactivada migración legacy para evitar contaminación de datos entre usuarios
  // if (userId) _migrateLegacyDataIfNeeded();
}

/**
 * Estructura de una sesión:
 * {
 *   id: string (UUID)
 *   title: string (nombre/título de la sesión)
 *   createdAt: timestamp
 *   lastModified: timestamp
 *   text: {
 *     content: string
 *     fileName: string
 *     fileType: string
 *     metadata: object
 *   }
 *   completeAnalysis: object | null
 *   tutorHistory: array (mensajes del tutor)
 *   highlights: array
 *   annotations: array
 *   savedCitations: array
 *   rubricProgress: object
 *   activitiesProgress: object
 *   notes: array
 *   settings: object
 *   rewardsState: object // 🆕 Estado de gamificación (puntos, racha, achievements)
 * }
 */

/**
 * Generar ID único para sesión
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtener todas las sesiones guardadas
 */
export function getAllSessions() {
  try {
    const key = getStorageKey();
    const sessionsJson = localStorage.getItem(key);
    if (!sessionsJson) {
      // Fallback: check legacy if no user specific data found yet? 
      // No, migration should handle it. But if migration hasn't run...
      return [];
    }

    const sessions = JSON.parse(sessionsJson);
    // Ordenar por última modificación (más reciente primero)
    return sessions.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  } catch (error) {
    logger.error('❌ [SessionManager] Error cargando sesiones:', error);
    return [];
  }
}

/**
 * Reemplaza completamente las sesiones locales del usuario actual.
 * Se usa cuando llega un snapshot/merge desde Firestore para mantener consistencia.
 * 
 * ⚠️ No escribe en la key legacy global para evitar contaminación entre usuarios.
 */
export function replaceAllLocalSessions(nextSessions) {
  try {
    const sessions = Array.isArray(nextSessions) ? nextSessions : [];
    const sorted = sessions.sort((a, b) => (b.lastModified || b.createdAt || 0) - (a.lastModified || a.createdAt || 0));
    const limited = sorted.slice(0, MAX_SESSIONS);
    localStorage.setItem(getStorageKey(), JSON.stringify(limited));
    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error reemplazando sesiones locales:', error);
    return false;
  }
}

/**
 * Guardar una sesión (localStorage + Firestore)
 * @param {object} session 
 * @param {boolean} syncToCloud - Si debe sincronizar con Firestore (default: true)
 */
export function saveSession(session, syncToCloud = true) {
  try {
    // 🆕 VALIDAR SESIÓN ANTES DE GUARDAR
    const validation = validateAndSanitizeSession(session);

    if (!validation.valid) {
      logger.error('❌ [SessionManager] Sesión inválida, rechazada:', validation.errors);
      return false;
    }

    if (validation.errors.length > 0) {
      logger.warn('⚠️ [SessionManager] Sesión sanitizada con advertencias:', validation.errors);
    }

    const sessionToSave = {
      ...validation.session,
      lastModified: Date.now()
    };

    let sessions = getAllSessions();
    const existingIndex = sessions.findIndex(s => s.id === sessionToSave.id);

    if (existingIndex >= 0) {
      // Actualizar sesión existente
      sessions[existingIndex] = {
        ...sessions[existingIndex],
        ...sessionToSave
      };
    } else {
      // Agregar nueva sesión
      sessions.unshift(sessionToSave); // Agregar al inicio para que las más nuevas aparezcan primero

      // 🆕 APLICAR LÍMITE DE SESIONES
      if (sessions.length > MAX_SESSIONS) {
        const removed = sessions.slice(MAX_SESSIONS);
        sessions = sessions.slice(0, MAX_SESSIONS);
        logger.log(`🗑️ [SessionManager] Límite alcanzado (${MAX_SESSIONS}). Eliminadas ${removed.length} sesiones antiguas`);

        // Eliminar también de Firestore si están sincronizadas
        if (currentUserId && syncToCloud) {
          removed.forEach(oldSession => {
            if (oldSession.id) {
              deleteSessionFromFirestore(currentUserId, oldSession.id)
                .catch(err => logger.warn('⚠️ Error limpiando sesión antigua:', err));
            }
          });
        }
      }
    }

    // Guardar en localStorage (inmediato) con scope de usuario
    // 🆕 P8 FIX: Manejar QuotaExceededError
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
      logger.log('✅ [SessionManager] Sesión guardada localmente:', sessionToSave.id, 'en', getStorageKey());
    } catch (storageError) {
      if (storageError.name === 'QuotaExceededError' ||
        storageError.message?.includes('quota') ||
        storageError.code === 22) { // Safari usa código 22
        logger.warn('⚠️ [SessionManager] localStorage lleno, eliminando sesiones antiguas...');

        // Eliminar las 3 sesiones más antiguas y reintentar
        sessions = sessions.slice(0, -3);
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
          logger.log('✅ [SessionManager] Sesión guardada después de limpiar espacio');

          // Notificar al usuario que se liberó espacio
          window.dispatchEvent(new CustomEvent('storage-quota-warning', {
            detail: {
              message: 'Se eliminaron sesiones antiguas para liberar espacio',
              sessionsRemaining: sessions.length
            }
          }));
        } catch (retryError) {
          logger.error('❌ [SessionManager] No se pudo guardar incluso después de limpiar:', retryError);
          // Último recurso: limpiar todo el caché de análisis
          try {
            const keysToClean = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (
                key?.startsWith('analysis_cache_') ||
                key === 'text_analysis_cache' ||
                key?.startsWith('appLectura_analysis_cache')
              ) {
                keysToClean.push(key);
              }
            }
            keysToClean.forEach(key => localStorage.removeItem(key));
            localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
            logger.log('✅ [SessionManager] Sesión guardada después de limpiar caché de análisis');
          } catch (finalError) {
            logger.error('❌ [SessionManager] Error crítico de almacenamiento:', finalError);
            return false;
          }
        }
      } else {
        throw storageError; // Re-lanzar si no es error de cuota
      }
    }

    // 🔥 Sincronizar con Firestore (async, non-blocking)
    if (syncToCloud && currentUserId) {
      // 🆕 RACE CONDITION FIX: Marcar como pendiente antes de iniciar sync
      markPendingSync(sessionToSave.id);

      saveSessionToFirestore(currentUserId, sessionToSave)
        .then(() => {
          logger.log('☁️ [SessionManager] Sesión sincronizada con Firestore:', session.id);
          // 🆕 Quitar de pendientes al completar
          clearPendingSync(sessionToSave.id);
        })
        .catch(error => {
          logger.warn('⚠️ [SessionManager] Error sincronizando con Firestore:', error.message);
          // 🆕 Mantener en pendientes para reintento posterior
          // No llamamos clearPendingSync aquí para que se reintente

          // 🆕 P9 FIX: Notificar al UI que la sincronización falló
          window.dispatchEvent(new CustomEvent('sync-error', {
            detail: {
              sessionId: sessionToSave.id,
              message: 'No se pudo sincronizar con la nube',
              error: error.message
            }
          }));
        });
    } else if (syncToCloud && !currentUserId) {
      logger.log('ℹ️ [SessionManager] Sin usuario autenticado, solo guardado local');
    }

    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error guardando sesión:', error);
    return false;
  }
}

/**
 * Cargar una sesión por ID
 */
export function loadSession(sessionId) {
  try {
    const sessions = getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      logger.log('✅ [SessionManager] Sesión cargada:', sessionId);
      return session;
    }

    logger.warn('⚠️ [SessionManager] Sesión no encontrada:', sessionId);

    // 🧹 AUTO-LIMPIEZA: Si la sesión no existe pero está marcada como current, limpiar
    const currentKey = getCurrentSessionIdKey();
    const currentId = localStorage.getItem(currentKey);
    if (currentId === sessionId) {
      logger.log('🧹 [SessionManager] Limpiando referencia a sesión inválida:', sessionId);
      localStorage.removeItem(currentKey);
    }

    return null;
  } catch (error) {
    logger.error('❌ [SessionManager] Error cargando sesión:', error);
    return null;
  }
}

/**
 * Eliminar una sesión (localStorage + Firestore)
 */
export async function deleteSession(sessionId) {
  try {
    // 🪦 FIX CRÍTICO: Crear tombstone ANTES de eliminar
    // Esto evita que el listener de Firestore resucite la sesión
    addDeletedSessionTombstone(sessionId);

    const sessions = getAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);

    // 🆕 P10 FIX: try-catch defensivo para localStorage
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
    } catch (storageError) {
      logger.error('❌ [SessionManager] Error escribiendo en localStorage:', storageError);
      window.dispatchEvent(new CustomEvent('storage-error', {
        detail: { message: 'Error al eliminar sesión del almacenamiento local', error: storageError.message }
      }));
      return false;
    }

    logger.log('✅ [SessionManager] Sesión eliminada localmente:', sessionId);

    // Si era la sesión actual, limpiar referencia
    const currentKey = getCurrentSessionIdKey();
    const currentId = localStorage.getItem(currentKey);
    if (currentId === sessionId) {
      localStorage.removeItem(currentKey);
    }

    // 🔥 Eliminar de Firestore (async, blocking para asegurar consistencia)
    if (currentUserId) {
      try {
        await deleteSessionFromFirestore(currentUserId, sessionId);
        logger.log('☁️ [SessionManager] Sesión eliminada de Firestore:', sessionId);
        // 🪦 Limpiar tombstone tras confirmación exitosa de Firestore
        clearDeletedSessionTombstone(sessionId);
      } catch (error) {
        logger.warn('⚠️ [SessionManager] Error eliminando de Firestore:', error.message);
        // El tombstone sigue activo para proteger contra resurrección
        // Se limpiará automáticamente tras TOMBSTONE_TTL
        window.dispatchEvent(new CustomEvent('sync-error', {
          detail: {
            message: 'No se pudo eliminar la sesión de la nube. Se eliminará en el próximo intento.',
            sessionId,
            operation: 'delete'
          }
        }));
      }
    }

    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error eliminando sesión:', error);
    return false;
  }
}

/**
 * Eliminar todas las sesiones guardadas (localStorage + Firestore)
 */
export async function deleteAllSessions() {
  try {
    // 🪦 FIX: Crear tombstones para TODAS las sesiones antes de eliminar
    const existingSessions = getAllSessions();
    const allIds = existingSessions.map(s => s.id).filter(Boolean);
    if (allIds.length > 0) {
      addBulkDeletedTombstones(allIds);
    }

    // 🆕 P10 FIX: try-catch defensivo para localStorage
    try {
      localStorage.removeItem(getStorageKey());
      localStorage.removeItem(getCurrentSessionIdKey());
    } catch (storageError) {
      logger.error('❌ [SessionManager] Error limpiando localStorage:', storageError);
      window.dispatchEvent(new CustomEvent('storage-error', {
        detail: { message: 'Error al limpiar el almacenamiento local', error: storageError.message }
      }));
      return false;
    }

    logger.log('✅ [SessionManager] Todas las sesiones eliminadas localmente');

    // 🔥 FIX: Eliminar de Firestore de forma BLOCKING (await) para evitar resurrección
    if (currentUserId) {
      try {
        await deleteAllUserSessions(currentUserId);
        logger.log('☁️ [SessionManager] Todas las sesiones eliminadas de Firestore');
      } catch (error) {
        logger.warn('⚠️ [SessionManager] Error eliminando sesiones de Firestore:', error.message);
        // Los tombstones protegen contra resurrección durante TOMBSTONE_TTL
        window.dispatchEvent(new CustomEvent('sync-error', {
          detail: {
            message: 'No se pudieron eliminar todas las sesiones de la nube.',
            operation: 'deleteAll'
          }
        }));
      }
    }

    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error eliminando todas las sesiones:', error);
    return false;
  }
}

/**
 * Crear nueva sesión a partir del estado actual
 */
export function createSessionFromState(state, { syncToCloud = true } = {}) {
  // 🔍 DEBUG: Logging exhaustivo del estado recibido
  logger.log('🔵 [SessionManager.createSessionFromState] Iniciando creación...');
  logger.log('🔵 [SessionManager] state.texto:', state.texto ? `${state.texto.length} chars` : 'NULL/UNDEFINED');
  logger.log('🔵 [SessionManager] state.texto preview:', state.texto?.substring(0, 100) || 'VACÍO');
  logger.log('🔵 [SessionManager] state.archivoActual:', state.archivoActual?.name || 'sin archivo');
  logger.log('🔵 [SessionManager] state.completeAnalysis:', !!state.completeAnalysis);

  const sessionId = generateSessionId();
  const title = state.text?.fileName ||
    `Sesión ${new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}`;

  const normalizedFileURL = state.archivoActual?.fileURL || null;

  const session = {
    id: sessionId,
    title,
    createdAt: Date.now(),
    lastModified: Date.now(),
    text: state.texto ? {
      content: state.texto,
      fileName: state.archivoActual?.name || 'texto_manual',
      fileType: state.archivoActual?.type || 'text/plain',
      fileURL: normalizedFileURL, // Canonical: fuente principal para restaurar PDFs
      metadata: {
        id: state.currentTextoId, // 🆕
        // 🆕 Compat: algunos flows legacy leen fileName/fileType/fileURL desde metadata
        fileName: state.archivoActual?.name || 'texto_manual',
        fileType: state.archivoActual?.type || 'text/plain',
        length: state.texto.length,
        words: state.texto.split(/\s+/).length
      }
    } : null,
    // 🆕 CRÍTICO: Incluir sourceCourseId para sincronización con dashboard docente
    sourceCourseId: state.sourceCourseId || null,
    // 🆕 CRÍTICO: Incluir currentTextoId como campo de primer nivel
    currentTextoId: state.currentTextoId || null,
    // 🛡️ SANITIZACIÓN FLEXIBLE: metadata puede estar en diferentes ubicaciones
    completeAnalysis: (state.completeAnalysis &&
      (state.completeAnalysis.metadata || state.completeAnalysis.prelecture?.metadata)) ?
      state.completeAnalysis : null,
    tutorHistory: state.tutorHistory || [],
    highlights: state.highlights || [],
    annotations: state.annotations || [],
    savedCitations: state.savedCitations || {},
    rubricProgress: state.rubricProgress || {},
    activitiesProgress: state.activitiesProgress || {},
    notes: state.notes || [],
    artifactsDrafts: captureArtifactsDrafts(state.currentTextoId || state.text?.metadata?.id || state.text?.textoId || null, state.sourceCourseId || null), // 🆕 Incluir borradores al crear
    settings: {
      modoOscuro: state.modoOscuro || false
    }
  };

  logger.log('✅ [SessionManager] Sesión creada con texto:', !!session.text, 'length:', session.text?.content?.length || 0);

  saveSession(session, syncToCloud);
  setCurrentSession(sessionId);

  return session;
}

/**
 * Actualizar sesión actual con estado parcial
 */
export function updateCurrentSession(updates, { syncToCloud = true } = {}) {
  const currentId = getCurrentSessionId();
  if (!currentId) return false;

  const session = loadSession(currentId);
  if (!session) return false;

  // 🛡️ FIX CRÍTICO: Validar que el update pertenece al mismo textoId+courseId de la sesión
  // Esto previene contaminación cruzada entre lecturas durante el auto-save
  const sessionTextoId = session.currentTextoId || session.text?.metadata?.id || session.text?.textoId || null;
  const updateTextoId = updates.currentTextoId || updates.text?.metadata?.id || null;
  const sessionCourseId = session.sourceCourseId || null;
  const updateCourseId = updates.sourceCourseId || null;

  if (sessionTextoId && updateTextoId && sessionTextoId !== updateTextoId) {
    logger.warn('🚫 [SessionManager.updateCurrentSession] ¡CONTAMINACIÓN BLOQUEADA (textoId)!');
    logger.warn(`   Sesión pertenece a textoId: ${sessionTextoId}`);
    logger.warn(`   Update viene con textoId: ${updateTextoId}`);
    logger.warn('   NO se actualizará para proteger datos de la sesión.');
    return false;
  }

  // 🛡️ FIX: Bloquear si mismo textoId pero courseIds no coinciden.
  // Incluye el caso donde la sesión es legacy (null) y el update trae courseId, o viceversa.
  if (sessionTextoId && updateTextoId && sessionTextoId === updateTextoId) {
    const courseMismatch = (sessionCourseId || updateCourseId) && sessionCourseId !== updateCourseId;
    if (courseMismatch) {
      logger.warn('🚫 [SessionManager.updateCurrentSession] ¡CONTAMINACIÓN BLOQUEADA (courseId)!');
      logger.warn(`   Sesión pertenece a courseId: ${sessionCourseId}`);
      logger.warn(`   Update viene con courseId: ${updateCourseId}`);
      logger.warn('   NO se actualizará para proteger datos de la sesión.');
      return false;
    }
  }

  // 🆕 CRÍTICO: Siempre capturar artifactsDrafts actuales cuando se actualiza
  const textoIdForDrafts = updates.currentTextoId ?? session.currentTextoId ?? session.text?.metadata?.id ?? session.text?.textoId ?? null;
  const courseIdForDrafts = updates.sourceCourseId ?? session.sourceCourseId ?? null;
  const freshArtifacts = captureArtifactsDrafts(textoIdForDrafts, courseIdForDrafts);

  const updated = {
    ...session,
    ...updates,
    // Merge artifacts: priorizar los del update si existen, sino usar los capturados
    artifactsDrafts: updates.artifactsDrafts || freshArtifacts,
    // 🆕 CRÍTICO: Preservar IDs si no vienen en updates
    sourceCourseId: updates.sourceCourseId ?? session.sourceCourseId ?? null,
    currentTextoId: updates.currentTextoId ?? session.currentTextoId ?? null,
    lastModified: Date.now()
  };

  logger.log('💾 [SessionManager.updateCurrentSession] Guardando:', {
    sessionId: currentId,
    hasText: !!updated.text,
    hasArtifacts: !!updated.artifactsDrafts,
    textoId: updated.currentTextoId,
  });

  return saveSession(updated, syncToCloud);
}

/**
 * Establecer sesión actual
 */
export function setCurrentSession(sessionId) {
  try {
    localStorage.setItem(getCurrentSessionIdKey(), sessionId);
    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error estableciendo sesión actual:', error);
    return false;
  }
}

/**
 * Obtener ID de sesión actual
 */
export function getCurrentSessionId() {
  try {
    return localStorage.getItem(getCurrentSessionIdKey());
  } catch (error) {
    return null;
  }
}

/**
 * Cargar estado completo desde una sesión al contexto
 */
export function restoreSessionToState(session, contextSetters) {
  if (!session) {
    logger.error('❌ [restoreSessionToState] Sesión inválida:', session);
    return false;
  }

  try {
    logger.log('🔄 [SessionManager] Restaurando sesión:', session.id);
    logger.log('📊 Datos de sesión:', {
      hasText: !!session.text?.content,
      hasAnalysis: !!session.completeAnalysis,
      hasRubrics: !!session.rubricProgress,
      hasCitations: !!session.savedCitations,
      hasActivities: !!session.activitiesProgress,
      hasDrafts: !!session.artifactsDrafts
    });

    // 🆕 Limpiar borradores del texto que se va a restaurar (sin tocar otras lecturas)
    // Nota: el textoId se calcula más abajo (textoIdToRestore)

    // 🆕 CAMBIO ATÓMICO: Usar switchLecture si está disponible
    // Esto garantiza que texto, textoId, courseId y analysis se actualicen juntos
    const textoIdToRestore = session.currentTextoId ||
      session.text?.metadata?.id ||
      session.text?.textoId || null;
    clearArtifactsDrafts(textoIdToRestore);

    const courseIdToRestore = session.sourceCourseId ||
      session.text?.sourceCourseId || null;

    if (contextSetters.switchLecture) {
      logger.log('🔄 [SessionManager] Usando switchLecture ATÓMICO para restaurar');
      logger.log('📎 textoId:', textoIdToRestore);
      logger.log('📎 courseId:', courseIdToRestore);

      // Primero: cambio atómico de lectura (texto + IDs + reset análisis)
      // 🛡️ __skipProgressReset: evita que queueMicrotask borre citas/rúbricas/actividades
      // que serán restauradas sincrónicamente más abajo en esta misma función.
      contextSetters.switchLecture({
        id: textoIdToRestore,
        courseId: courseIdToRestore,
        content: session.text?.content || '',
        // ✅ Fuente correcta: fileName/fileType/fileURL viven en text.*
        // (metadata históricamente solo tenía length/words, pero mantenemos fallback)
        fileName: session.text?.fileName || session.text?.metadata?.fileName || null,
        fileType: session.text?.fileType || session.text?.metadata?.fileType || null,
        fileURL: session.text?.fileURL || session.text?.metadata?.fileURL || null,
        __skipProgressReset: true
      });

      // Después: restaurar análisis específico de la sesión
      if (session.completeAnalysis && contextSetters.setCompleteAnalysis) {
        logger.log('🔬 Restaurando análisis de la sesión...');
        contextSetters.setCompleteAnalysis(session.completeAnalysis);
      }
    } else {
      // Fallback: método antiguo (sin estado atómico)
      logger.warn('⚠️ [SessionManager] switchLecture no disponible, usando método legacy');

      if (session.text?.content && contextSetters.setTexto) {
        contextSetters.setTexto(session.text.content);
      }

      if (session.completeAnalysis && contextSetters.setCompleteAnalysis) {
        contextSetters.setCompleteAnalysis(session.completeAnalysis);
      }

      if (textoIdToRestore && contextSetters.setCurrentTextoId) {
        contextSetters.setCurrentTextoId(textoIdToRestore);
      }

      if (courseIdToRestore && contextSetters.setSourceCourseId) {
        contextSetters.setSourceCourseId(courseIdToRestore);
      }
    }

    // Restaurar progreso de rúbricas (independiente del estado atómico)
    if (session.rubricProgress && contextSetters.setRubricProgress) {
      logger.log('📈 Restaurando progreso de rúbricas...');
      contextSetters.setRubricProgress(session.rubricProgress);
    }

    // Restaurar citas guardadas
    if (session.savedCitations && contextSetters.setSavedCitations) {
      logger.log('📚 Restaurando citas guardadas...');
      contextSetters.setSavedCitations(session.savedCitations);
    }

    // 🆕 Restaurar progreso de actividades
    if (session.activitiesProgress && contextSetters.setActivitiesProgress) {
      logger.log('🎯 Restaurando progreso de actividades...');
      contextSetters.setActivitiesProgress(session.activitiesProgress);
    }

    // 🆕 CRÍTICO: Restaurar sourceCourseId para sincronización con dashboard
    if (session.sourceCourseId && contextSetters.setSourceCourseId) {
      logger.log('🎓 Restaurando sourceCourseId:', session.sourceCourseId);
      contextSetters.setSourceCourseId(session.sourceCourseId);
    } else if (session.sourceCourseId) {
      logger.warn('⚠️ sourceCourseId presente pero sin setter - progreso no se sincronizará');
    }

    // 🆕 Restaurar borradores de artefactos
    if (session.artifactsDrafts) {
      logger.log('📋 Restaurando borradores de artefactos...');
      restoreArtifactsDrafts(session.artifactsDrafts, textoIdToRestore, session.sourceCourseId || null);
    }

    // Establecer como sesión actual
    setCurrentSession(session.id);

    // Emitir evento para que otros componentes se actualicen
    window.dispatchEvent(new CustomEvent('session-restored', {
      detail: { sessionId: session.id }
    }));

    logger.log('✅ [SessionManager] Sesión restaurada exitosamente');
    return true;
  } catch (error) {
    logger.error('❌ [SessionManager] Error restaurando sesión:', error);
    return false;
  }
}

/**
 * Capturar todos los borradores de artefactos desde sessionStorage
 * 🆕 FASE 1 FIX: Ahora usa claves namespaced por textoId (y opcionalmente courseId)
 * @param {string|null} textoId - ID del texto para namespace de claves
 * @param {string|null} courseId - ID del curso para aislamiento cross-course
 */
export function captureArtifactsDrafts(textoId = null, courseId = null) {
  const key = (base) => getDraftKey(base, textoId, courseId);

  const artifacts = {
    resumenAcademico: {
      draft: sessionStorage.getItem(key('resumenAcademico_draft')) || ''
    },
    tablaACD: {
      marcoIdeologico: sessionStorage.getItem(key('tablaACD_marcoIdeologico')) || '',
      estrategiasRetoricas: sessionStorage.getItem(key('tablaACD_estrategiasRetoricas')) || '',
      vocesPresentes: sessionStorage.getItem(key('tablaACD_vocesPresentes')) || '',
      vocesSilenciadas: sessionStorage.getItem(key('tablaACD_vocesSilenciadas')) || ''
    },
    mapaActores: {
      actores: sessionStorage.getItem(key('mapaActores_actores')) || '',
      contextoHistorico: sessionStorage.getItem(key('mapaActores_contextoHistorico')) || '',
      conexiones: sessionStorage.getItem(key('mapaActores_conexiones')) || '',
      consecuencias: sessionStorage.getItem(key('mapaActores_consecuencias')) || ''
    },
    respuestaArgumentativa: {
      tesis: sessionStorage.getItem(key('respuestaArgumentativa_tesis')) || '',
      evidencias: sessionStorage.getItem(key('respuestaArgumentativa_evidencias')) || '',
      contraargumento: sessionStorage.getItem(key('respuestaArgumentativa_contraargumento')) || '',
      refutacion: sessionStorage.getItem(key('respuestaArgumentativa_refutacion')) || ''
    },
    ensayoIntegrador: {
      text: sessionStorage.getItem(key('ensayoIntegrador_text')) || '',
      dimension: sessionStorage.getItem(key('ensayoIntegrador_dimension')) || ''
    }
  };

  return artifacts;
}

/**
 * Restaurar borradores de artefactos en sessionStorage
 * 🆕 FASE 1 FIX: Ahora usa claves namespaced por textoId (y opcionalmente courseId)
 * @param {object} artifacts - Objeto con borradores
 * @param {string|null} textoId - ID del texto para namespace de claves
 * @param {string|null} courseId - ID del curso para aislamiento cross-course
 */
export function restoreArtifactsDrafts(artifacts, textoId = null, courseId = null) {
  if (!artifacts) return;

  const key = (base) => getDraftKey(base, textoId, courseId);

  try {
    // Limpiar primero (solo las claves de este textoId)
    clearArtifactsDrafts(textoId, courseId);

    // Restaurar resumen académico
    if (artifacts.resumenAcademico?.draft) {
      sessionStorage.setItem(key('resumenAcademico_draft'), artifacts.resumenAcademico.draft);
    }

    // Restaurar Tabla ACD
    if (artifacts.tablaACD) {
      if (artifacts.tablaACD.marcoIdeologico) {
        sessionStorage.setItem(key('tablaACD_marcoIdeologico'), artifacts.tablaACD.marcoIdeologico);
      }
      if (artifacts.tablaACD.estrategiasRetoricas) {
        sessionStorage.setItem(key('tablaACD_estrategiasRetoricas'), artifacts.tablaACD.estrategiasRetoricas);
      }
      if (artifacts.tablaACD.vocesPresentes) {
        sessionStorage.setItem(key('tablaACD_vocesPresentes'), artifacts.tablaACD.vocesPresentes);
      }
      if (artifacts.tablaACD.vocesSilenciadas) {
        sessionStorage.setItem(key('tablaACD_vocesSilenciadas'), artifacts.tablaACD.vocesSilenciadas);
      }
    }

    // Restaurar Mapa de Actores
    if (artifacts.mapaActores) {
      if (artifacts.mapaActores.actores) {
        sessionStorage.setItem(key('mapaActores_actores'), artifacts.mapaActores.actores);
      }
      if (artifacts.mapaActores.contextoHistorico) {
        sessionStorage.setItem(key('mapaActores_contextoHistorico'), artifacts.mapaActores.contextoHistorico);
      }
      if (artifacts.mapaActores.conexiones) {
        sessionStorage.setItem(key('mapaActores_conexiones'), artifacts.mapaActores.conexiones);
      }
      if (artifacts.mapaActores.consecuencias) {
        sessionStorage.setItem(key('mapaActores_consecuencias'), artifacts.mapaActores.consecuencias);
      }
    }

    // Restaurar Respuesta Argumentativa
    if (artifacts.respuestaArgumentativa) {
      if (artifacts.respuestaArgumentativa.tesis) {
        sessionStorage.setItem(key('respuestaArgumentativa_tesis'), artifacts.respuestaArgumentativa.tesis);
      }
      if (artifacts.respuestaArgumentativa.evidencias) {
        sessionStorage.setItem(key('respuestaArgumentativa_evidencias'), artifacts.respuestaArgumentativa.evidencias);
      }
      if (artifacts.respuestaArgumentativa.contraargumento) {
        sessionStorage.setItem(key('respuestaArgumentativa_contraargumento'), artifacts.respuestaArgumentativa.contraargumento);
      }
      if (artifacts.respuestaArgumentativa.refutacion) {
        sessionStorage.setItem(key('respuestaArgumentativa_refutacion'), artifacts.respuestaArgumentativa.refutacion);
      }
    }

    // 🆕 Restaurar Ensayo Integrador
    if (artifacts.ensayoIntegrador) {
      if (artifacts.ensayoIntegrador.text) {
        sessionStorage.setItem(key('ensayoIntegrador_text'), artifacts.ensayoIntegrador.text);
      }
      if (artifacts.ensayoIntegrador.dimension) {
        sessionStorage.setItem(key('ensayoIntegrador_dimension'), artifacts.ensayoIntegrador.dimension);
      }
    }

    logger.log('✅ [SessionManager] Borradores de artefactos restaurados para textoId:', textoId || 'global');
  } catch (error) {
    logger.error('❌ [SessionManager] Error restaurando borradores:', error);
  }
}

/**
 * Limpiar todos los borradores de artefactos de sessionStorage
 * 🆕 FASE 1 FIX: Ahora usa claves namespaced por textoId (y opcionalmente courseId)
 * @param {string|null} textoId - ID del texto para namespace de claves
 * @param {string|null} courseId - ID del curso para aislamiento cross-course
 */
export function clearArtifactsDrafts(textoId = null, courseId = null) {
  const key = (base) => getDraftKey(base, textoId, courseId);

  try {
    // Resumen Académico
    sessionStorage.removeItem(key('resumenAcademico_draft'));

    // Tabla ACD
    sessionStorage.removeItem(key('tablaACD_marcoIdeologico'));
    sessionStorage.removeItem(key('tablaACD_estrategiasRetoricas'));
    sessionStorage.removeItem(key('tablaACD_vocesPresentes'));
    sessionStorage.removeItem(key('tablaACD_vocesSilenciadas'));

    // Mapa de Actores
    sessionStorage.removeItem(key('mapaActores_actores'));
    sessionStorage.removeItem(key('mapaActores_contextoHistorico'));
    sessionStorage.removeItem(key('mapaActores_conexiones'));
    sessionStorage.removeItem(key('mapaActores_consecuencias'));

    // Respuesta Argumentativa
    sessionStorage.removeItem(key('respuestaArgumentativa_tesis'));
    sessionStorage.removeItem(key('respuestaArgumentativa_evidencias'));
    sessionStorage.removeItem(key('respuestaArgumentativa_contraargumento'));
    sessionStorage.removeItem(key('respuestaArgumentativa_refutacion'));

    // 🆕 Ensayo Integrador
    sessionStorage.removeItem(key('ensayoIntegrador_text'));
    sessionStorage.removeItem(key('ensayoIntegrador_dimension'));

    logger.log('✅ [SessionManager] Borradores de artefactos limpiados para textoId:', textoId || 'global');
  } catch (error) {
    logger.error('❌ [SessionManager] Error limpiando borradores:', error);
  }
}

/**
 * Capturar estado completo desde el contexto
 * 🛡️ FIX: Ya NO llama a updateCurrentSession internamente.
 * El llamador (auto-save en AppContext) es responsable de llamar a updateCurrentSession.
 * Esto evita la doble llamada que causó guardados duplicados y posible contaminación.
 */
export function captureCurrentState(contextState) {
  // Capturar borradores de artefactos (con scope de curso)
  const artifactsDrafts = captureArtifactsDrafts(contextState.currentTextoId || null, contextState.sourceCourseId || null);
  const normalizedFileURL = contextState.archivoActual?.fileURL || null;

  const sessionData = {
    text: contextState.texto ? {
      content: contextState.texto,
      fileName: contextState.archivoActual?.name || 'texto_manual',
      fileType: contextState.archivoActual?.type || 'text/plain',
      fileURL: normalizedFileURL,
      metadata: {
        id: contextState.currentTextoId,
        fileName: contextState.archivoActual?.name || 'texto_manual',
        fileType: contextState.archivoActual?.type || 'text/plain',
        length: contextState.texto.length,
        words: contextState.texto.split(/\s+/).length
      }
    } : null,
    // 🛡️ SANITIZACIÓN FLEXIBLE: metadata puede estar en diferentes ubicaciones
    completeAnalysis: (contextState.completeAnalysis &&
      (contextState.completeAnalysis.metadata || contextState.completeAnalysis.prelecture?.metadata)) ?
      contextState.completeAnalysis : null,
    rubricProgress: contextState.rubricProgress || {},
    savedCitations: contextState.savedCitations || {},
    activitiesProgress: contextState.activitiesProgress || {},
    artifactsDrafts: artifactsDrafts,
    // CRÍTICO: Incluir IDs para vinculación con curso
    sourceCourseId: contextState.sourceCourseId || null,
    currentTextoId: contextState.currentTextoId || null,
    settings: {
      modoOscuro: contextState.modoOscuro || false
    }
  };

  return sessionData;
}

// ============================================
// 🔥 FUNCIONES DE SINCRONIZACIÓN FIRESTORE
// ============================================

/**
 * Obtiene sesiones combinadas (localStorage + Firestore)
 * @returns {Promise<Array>}
 */
export async function getAllSessionsMerged() {
  try {
    const localSessions = getAllSessions();

    if (!currentUserId) {
      logger.log('ℹ️ [SessionManager] Sin usuario autenticado, solo sesiones locales');
      return localSessions.map(s => ({ ...s, source: 'local', inCloud: false, inLocal: true }));
    }

    logger.log('🔄 [SessionManager] Obteniendo sesiones de Firestore...');
    const firestoreSessions = await getUserSessions(currentUserId);

    const merged = mergeSessions(localSessions, firestoreSessions);

    logger.log(`✅ [SessionManager] ${merged.length} sesiones totales (${localSessions.length} locales, ${firestoreSessions.length} en cloud)`);

    return merged;

  } catch (error) {
    logger.error('❌ [SessionManager] Error obteniendo sesiones merged:', error);
    // Fallback a sesiones locales
    return getAllSessions().map(s => ({ ...s, source: 'local', inCloud: false, inLocal: true }));
  }
}

/**
 * Sincroniza todas las sesiones locales con Firestore
 * @returns {Promise<object>} - { synced, errors }
 */
export async function syncAllSessionsToCloud() {
  if (!currentUserId) {
    logger.warn('⚠️ [SessionManager] No se puede sincronizar sin usuario autenticado');
    return { synced: 0, errors: 0 };
  }

  try {
    const localSessions = getAllSessions();

    logger.log(`🔄 [SessionManager] Sincronizando ${localSessions.length} sesiones con Firestore...`);

    let synced = 0;
    let errors = 0;

    for (const session of localSessions) {
      try {
        await saveSessionToFirestore(currentUserId, session);
        synced++;
      } catch (error) {
        logger.error(`❌ Error sincronizando sesión ${session.id}:`, error);
        errors++;
      }
    }

    logger.log(`✅ [SessionManager] Sincronización completada: ${synced} exitosas, ${errors} errores`);

    return { synced, errors };

  } catch (error) {
    logger.error('❌ [SessionManager] Error en sincronización masiva:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de sincronización
 * @returns {Promise<object>}
 */
export async function getSyncStatus() {
  try {
    const merged = await getAllSessionsMerged();

    const stats = {
      total: merged.length,
      maxSessions: MAX_SESSIONS,
      remaining: MAX_SESSIONS - merged.length,
      percentUsed: Math.round((merged.length / MAX_SESSIONS) * 100),
      localOnly: merged.filter(s => s.syncStatus === 'local-only').length,
      cloudOnly: merged.filter(s => !s.inLocal).length,
      synced: merged.filter(s => s.syncStatus === 'synced').length,
      needsSync: merged.filter(s => s.syncStatus === 'needs-sync').length,
      conflicts: merged.filter(s => s.syncStatus === 'conflict').length
    };

    return stats;

  } catch (error) {
    logger.error('❌ [SessionManager] Error obteniendo estado de sincronización:', error);
    return {
      total: 0,
      maxSessions: MAX_SESSIONS,
      remaining: MAX_SESSIONS,
      percentUsed: 0,
      localOnly: 0,
      cloudOnly: 0,
      synced: 0,
      needsSync: 0,
      conflicts: 0
    };
  }
}

/**
 * 🆕 Obtiene información sobre el límite de sesiones
 */
export function getSessionsLimit() {
  const current = getAllSessions().length;
  return {
    max: MAX_SESSIONS,
    current,
    remaining: MAX_SESSIONS - current,
    percentUsed: Math.round((current / MAX_SESSIONS) * 100),
    isNearLimit: current >= MAX_SESSIONS * 0.9, // Alerta al 90%
    isFull: current >= MAX_SESSIONS
  };
}

// ============================================
// 🆕 RACE CONDITION FIX: Pending Syncs System
// ============================================

/**
 * Marca una sesión como pendiente de sincronización
 * @param {string} sessionId 
 */
function markPendingSync(sessionId) {
  pendingSyncIds.add(sessionId);
  // Persistir en localStorage para sobrevivir recargas
  try {
    const pending = JSON.parse(localStorage.getItem(getPendingSyncsKey()) || '[]');
    if (!pending.includes(sessionId)) {
      pending.push(sessionId);
      localStorage.setItem(getPendingSyncsKey(), JSON.stringify(pending));
    }
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error guardando pending sync:', e);
  }
}

/**
 * Quita una sesión de pendientes de sincronización
 * @param {string} sessionId 
 */
function clearPendingSync(sessionId) {
  pendingSyncIds.delete(sessionId);
  try {
    const pending = JSON.parse(localStorage.getItem(getPendingSyncsKey()) || '[]');
    const updated = pending.filter(id => id !== sessionId);
    localStorage.setItem(getPendingSyncsKey(), JSON.stringify(updated));
  } catch (e) {
    logger.warn('⚠️ [SessionManager] Error limpiando pending sync:', e);
  }
}

/**
 * Obtiene las sesiones pendientes de sincronización
 * @returns {string[]}
 */
export function getPendingSyncs() {
  try {
    const scoped = JSON.parse(localStorage.getItem(getPendingSyncsKey()) || '[]');
    if (Array.isArray(scoped) && scoped.length > 0) return scoped;

    // Fallback legacy (no scoped) solo si no hay usuario (guest) para compat
    if (!currentUserId) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_PENDING_SYNCS_KEY) || '[]');
      return Array.isArray(legacy) ? legacy : [];
    }

    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Sincroniza todas las sesiones pendientes (llamar al iniciar la app)
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function syncPendingSessions() {
  if (!currentUserId) {
    logger.log('ℹ️ [SessionManager] No hay usuario, omitiendo sync de pendientes');
    return { synced: 0, failed: 0 };
  }

  const pendingIds = getPendingSyncs();
  if (pendingIds.length === 0) {
    return { synced: 0, failed: 0 };
  }

  logger.log(`🔄 [SessionManager] Sincronizando ${pendingIds.length} sesiones pendientes...`);

  let synced = 0;
  let failed = 0;
  const sessions = getAllSessions();

  for (const sessionId of pendingIds) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      // Sesión ya no existe localmente, limpiar de pendientes
      clearPendingSync(sessionId);
      continue;
    }

    try {
      await saveSessionToFirestore(currentUserId, session);
      clearPendingSync(sessionId);
      synced++;
      logger.log(`✅ [SessionManager] Sesión pendiente sincronizada: ${sessionId}`);
    } catch (error) {
      failed++;
      logger.warn(`⚠️ [SessionManager] Error sincronizando sesión pendiente ${sessionId}:`, error.message);
    }
  }

  logger.log(`✅ [SessionManager] Sync pendientes completado: ${synced} ok, ${failed} fallidas`);
  return { synced, failed };
}

/**
 * Handler para beforeunload - intenta sincronizar antes de cerrar
 * Nota: No garantiza completar, pero hace mejor esfuerzo
 */
export function setupBeforeUnloadSync() {
  if (typeof window === 'undefined') return;
  if (unloadSyncSetupDone) return;
  unloadSyncSetupDone = true;

  const triggerOpportunisticSync = (reason) => {
    if (!currentUserId || opportunisticSyncInFlight) return;
    const pendingIds = getPendingSyncs();
    if (pendingIds.length === 0) return;

    opportunisticSyncInFlight = true;
    Promise.resolve(syncPendingSessions())
      .then(({ synced, failed }) => {
        if (synced > 0 || failed > 0) {
          logger.log(`🔄 [SessionManager] Sync oportunista (${reason}): ${synced} ok, ${failed} fallidas`);
        }
      })
      .catch((err) => {
        logger.warn(`⚠️ [SessionManager] Sync oportunista (${reason}) falló:`, err?.message || err);
      })
      .finally(() => {
        opportunisticSyncInFlight = false;
      });
  };

  window.addEventListener('beforeunload', (_event) => {
    const pendingIds = getPendingSyncs();
    if (pendingIds.length > 0 && currentUserId) {
      logger.log(`⚠️ [SessionManager] Hay ${pendingIds.length} sesiones sin sincronizar`);
      // No podemos hacer async aquí, pero el pending_syncs se sincronizará al volver
      // Opcionalmente mostrar advertencia al usuario
      // event.preventDefault();
      // event.returnValue = 'Hay cambios sin guardar en la nube';
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerOpportunisticSync('visibilitychange:hidden');
    }
  });

  window.addEventListener('pagehide', () => {
    triggerOpportunisticSync('pagehide');
  });

  logger.log('✅ [SessionManager] beforeunload sync handler registrado');
}
