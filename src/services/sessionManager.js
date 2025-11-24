/**
 * Servicio para gestionar sesiones de trabajo
 * Similar a los chats de IA, guarda todo el progreso del usuario
 * 
 * 🔥 SINCRONIZACIÓN FIREBASE:
 * - Guarda automáticamente en localStorage (inmediato)
 * - Sincroniza con Firestore (async, non-blocking)
 * - Merge inteligente entre local y cloud
 */

import {
  saveSessionToFirestore,
  getUserSessions,
  updateSessionInFirestore,
  deleteSessionFromFirestore,
  deleteAllUserSessions,
  mergeSessions
} from '../firebase/firestore';
import { validateAndSanitizeSession } from '../utils/sessionValidator';

const SESSIONS_KEY = 'appLectura_sessions';
const CURRENT_SESSION_KEY = 'appLectura_current_session_id';
const MAX_SESSIONS = 5; // 🎯 Límite máximo de sesiones (5 sesiones recientes es suficiente)

// Variable global para mantener referencia al usuario actual
let currentUserId = null;

/**
 * Establece el usuario actual para sincronización con Firestore
 * @param {string|null} userId 
 */
export function setCurrentUser(userId) {
  currentUserId = userId;
  console.log('👤 [SessionManager] Usuario establecido:', userId || 'ninguno');
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
    const sessionsJson = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsJson) return [];
    
    const sessions = JSON.parse(sessionsJson);
    // Ordenar por última modificación (más reciente primero)
    return sessions.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  } catch (error) {
    console.error('❌ [SessionManager] Error cargando sesiones:', error);
    return [];
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
      console.error('❌ [SessionManager] Sesión inválida, rechazada:', validation.errors);
      return false;
    }
    
    if (validation.errors.length > 0) {
      console.warn('⚠️ [SessionManager] Sesión sanitizada con advertencias:', validation.errors);
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
        console.log(`🗑️ [SessionManager] Límite alcanzado (${MAX_SESSIONS}). Eliminadas ${removed.length} sesiones antiguas`);
        
        // Eliminar también de Firestore si están sincronizadas
        if (currentUserId && syncToCloud) {
          removed.forEach(oldSession => {
            if (oldSession.id) {
              deleteSessionFromFirestore(currentUserId, oldSession.id)
                .catch(err => console.warn('⚠️ Error limpiando sesión antigua:', err));
            }
          });
        }
      }
    }
    
    // Guardar en localStorage (inmediato)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    console.log('✅ [SessionManager] Sesión guardada localmente:', sessionToSave.id);
    
    // 🔥 Sincronizar con Firestore (async, non-blocking)
    if (syncToCloud && currentUserId) {
      saveSessionToFirestore(currentUserId, sessionToSave)
        .then(() => {
          console.log('☁️ [SessionManager] Sesión sincronizada con Firestore:', session.id);
        })
        .catch(error => {
          console.warn('⚠️ [SessionManager] Error sincronizando con Firestore:', error.message);
          // No fallar si falla la sincronización, los datos están en localStorage
        });
    } else if (syncToCloud && !currentUserId) {
      console.log('ℹ️ [SessionManager] Sin usuario autenticado, solo guardado local');
    }
    
    return true;
  } catch (error) {
    console.error('❌ [SessionManager] Error guardando sesión:', error);
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
      console.log('✅ [SessionManager] Sesión cargada:', sessionId);
      return session;
    }
    
    console.warn('⚠️ [SessionManager] Sesión no encontrada:', sessionId);
    
    // 🧹 AUTO-LIMPIEZA: Si la sesión no existe pero está marcada como current, limpiar
    const currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (currentId === sessionId) {
      console.log('🧹 [SessionManager] Limpiando referencia a sesión inválida:', sessionId);
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
    
    return null;
  } catch (error) {
    console.error('❌ [SessionManager] Error cargando sesión:', error);
    return null;
  }
}

/**
 * Eliminar una sesión (localStorage + Firestore)
 */
export function deleteSession(sessionId) {
  try {
    const sessions = getAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    console.log('✅ [SessionManager] Sesión eliminada localmente:', sessionId);
    
    // Si era la sesión actual, limpiar referencia
    const currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (currentId === sessionId) {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
    
    // 🔥 Eliminar de Firestore (async, non-blocking)
    if (currentUserId) {
      deleteSessionFromFirestore(currentUserId, sessionId)
        .then(() => {
          console.log('☁️ [SessionManager] Sesión eliminada de Firestore:', sessionId);
        })
        .catch(error => {
          console.warn('⚠️ [SessionManager] Error eliminando de Firestore:', error.message);
        });
    }
    
    return true;
  } catch (error) {
    console.error('❌ [SessionManager] Error eliminando sesión:', error);
    return false;
  }
}

/**
 * Eliminar todas las sesiones guardadas (localStorage + Firestore)
 */
export function deleteAllSessions() {
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    console.log('✅ [SessionManager] Todas las sesiones eliminadas localmente');
    
    // 🔥 Eliminar de Firestore (async, non-blocking)
    if (currentUserId) {
      deleteAllUserSessions(currentUserId)
        .then(() => {
          console.log('☁️ [SessionManager] Todas las sesiones eliminadas de Firestore');
        })
        .catch(error => {
          console.warn('⚠️ [SessionManager] Error eliminando sesiones de Firestore:', error.message);
        });
    }
    
    return true;
  } catch (error) {
    console.error('❌ [SessionManager] Error eliminando todas las sesiones:', error);
    return false;
  }
}

/**
 * Crear nueva sesión a partir del estado actual
 */
export function createSessionFromState(state) {
  // 🔍 DEBUG: Logging exhaustivo del estado recibido
  console.log('🔵 [SessionManager.createSessionFromState] Iniciando creación...');
  console.log('🔵 [SessionManager] state.texto:', state.texto ? `${state.texto.length} chars` : 'NULL/UNDEFINED');
  console.log('🔵 [SessionManager] state.texto preview:', state.texto?.substring(0, 100) || 'VACÍO');
  console.log('🔵 [SessionManager] state.archivoActual:', state.archivoActual?.name || 'sin archivo');
  console.log('🔵 [SessionManager] state.completeAnalysis:', !!state.completeAnalysis);
  
  const sessionId = generateSessionId();
  const title = state.text?.fileName || 
                `Sesión ${new Date().toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`;
  
  const session = {
    id: sessionId,
    title,
    createdAt: Date.now(),
    lastModified: Date.now(),
    text: state.texto ? {
      content: state.texto,
      fileName: state.archivoActual?.name || 'texto_manual',
      fileType: state.archivoActual?.type || 'text/plain',
      metadata: {
        length: state.texto.length,
        words: state.texto.split(/\s+/).length
      }
    } : null,
    completeAnalysis: state.completeAnalysis || null,
    tutorHistory: state.tutorHistory || [],
    highlights: state.highlights || [],
    annotations: state.annotations || [],
    savedCitations: state.savedCitations || {},
    rubricProgress: state.rubricProgress || {},
    activitiesProgress: state.activitiesProgress || {},
    notes: state.notes || [],
    artifactsDrafts: captureArtifactsDrafts(), // 🆕 Incluir borradores al crear
    settings: {
      modoOscuro: state.modoOscuro || false
    }
  };
  
  console.log('✅ [SessionManager] Sesión creada con texto:', !!session.text, 'length:', session.text?.content?.length || 0);
  
  saveSession(session);
  setCurrentSession(sessionId);
  
  return session;
}

/**
 * Actualizar sesión actual con estado parcial
 */
export function updateCurrentSession(updates) {
  const currentId = getCurrentSessionId();
  if (!currentId) return false;
  
  const session = loadSession(currentId);
  if (!session) return false;
  
  // 🆕 CRÍTICO: Siempre capturar artifactsDrafts actuales cuando se actualiza
  const freshArtifacts = captureArtifactsDrafts();
  
  const updated = {
    ...session,
    ...updates,
    // Merge artifacts: priorizar los del update si existen, sino usar los capturados
    artifactsDrafts: updates.artifactsDrafts || freshArtifacts,
    lastModified: Date.now()
  };
  
  console.log('💾 [SessionManager.updateCurrentSession] Guardando:', {
    sessionId: currentId,
    hasText: !!updated.text,
    hasArtifacts: !!updated.artifactsDrafts,
    hasRewards: !!updated.rewardsState
  });
  
  return saveSession(updated);
}

/**
 * Establecer sesión actual
 */
export function setCurrentSession(sessionId) {
  try {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    return true;
  } catch (error) {
    console.error('❌ [SessionManager] Error estableciendo sesión actual:', error);
    return false;
  }
}

/**
 * Obtener ID de sesión actual
 */
export function getCurrentSessionId() {
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Cargar estado completo desde una sesión al contexto
 */
export function restoreSessionToState(session, contextSetters) {
  if (!session) {
    console.error('❌ [restoreSessionToState] Sesión inválida:', session);
    return false;
  }
  
  try {
    console.log('🔄 [SessionManager] Restaurando sesión:', session.id);
    console.log('📊 Datos de sesión:', {
      hasText: !!session.text?.content,
      hasAnalysis: !!session.completeAnalysis,
      hasRubrics: !!session.rubricProgress,
      hasCitations: !!session.savedCitations,
      hasActivities: !!session.activitiesProgress,
      hasDrafts: !!session.artifactsDrafts
    });
    
    // 🆕 Limpiar borradores actuales antes de restaurar
    clearArtifactsDrafts();
    
    // Restaurar texto
    if (session.text?.content && contextSetters.setTexto) {
      console.log('📝 Restaurando texto...');
      contextSetters.setTexto(session.text.content);
    } else {
      console.warn('⚠️ No hay texto para restaurar');
    }
    
    // Restaurar análisis
    if (session.completeAnalysis && contextSetters.setCompleteAnalysis) {
      console.log('🔬 Restaurando análisis...');
      contextSetters.setCompleteAnalysis(session.completeAnalysis);
    }
    
    // Restaurar progreso de rúbricas
    if (session.rubricProgress && contextSetters.setRubricProgress) {
      console.log('📈 Restaurando progreso de rúbricas...');
      contextSetters.setRubricProgress(session.rubricProgress);
    }
    
    // Restaurar citas guardadas
    if (session.savedCitations && contextSetters.setSavedCitations) {
      console.log('📚 Restaurando citas guardadas...');
      contextSetters.setSavedCitations(session.savedCitations);
    }
    
    // 🆕 Restaurar progreso de actividades
    if (session.activitiesProgress && contextSetters.setActivitiesProgress) {
      console.log('🎯 Restaurando progreso de actividades...');
      contextSetters.setActivitiesProgress(session.activitiesProgress);
    }
    
    // 🆕 Restaurar borradores de artefactos
    if (session.artifactsDrafts) {
      console.log('📋 Restaurando borradores de artefactos...');
      restoreArtifactsDrafts(session.artifactsDrafts);
    }
    
    // Establecer como sesión actual
    setCurrentSession(session.id);
    
    // Emitir evento para que otros componentes se actualicen
    window.dispatchEvent(new CustomEvent('session-restored', { 
      detail: { sessionId: session.id } 
    }));
    
    console.log('✅ [SessionManager] Sesión restaurada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [SessionManager] Error restaurando sesión:', error);
    return false;
  }
}

/**
 * Capturar todos los borradores de artefactos desde sessionStorage
 */
export function captureArtifactsDrafts() {
  const artifacts = {
    resumenAcademico: {
      draft: sessionStorage.getItem('resumenAcademico_draft') || ''
    },
    tablaACD: {
      marcoIdeologico: sessionStorage.getItem('tablaACD_marcoIdeologico') || '',
      estrategiasRetoricas: sessionStorage.getItem('tablaACD_estrategiasRetoricas') || '',
      vocesPresentes: sessionStorage.getItem('tablaACD_vocesPresentes') || '',
      vocesSilenciadas: sessionStorage.getItem('tablaACD_vocesSilenciadas') || ''
    },
    mapaActores: {
      actores: sessionStorage.getItem('mapaActores_actores') || '',
      contextoHistorico: sessionStorage.getItem('mapaActores_contextoHistorico') || '',
      conexiones: sessionStorage.getItem('mapaActores_conexiones') || '',
      consecuencias: sessionStorage.getItem('mapaActores_consecuencias') || ''
    },
    respuestaArgumentativa: {
      tesis: sessionStorage.getItem('respuestaArgumentativa_tesis') || '',
      evidencias: sessionStorage.getItem('respuestaArgumentativa_evidencias') || '',
      contraargumento: sessionStorage.getItem('respuestaArgumentativa_contraargumento') || '',
      refutacion: sessionStorage.getItem('respuestaArgumentativa_refutacion') || ''
    }
  };
  
  return artifacts;
}

/**
 * Restaurar borradores de artefactos en sessionStorage
 */
export function restoreArtifactsDrafts(artifacts) {
  if (!artifacts) return;
  
  try {
    // Limpiar primero
    clearArtifactsDrafts();
    
    // Restaurar resumen académico
    if (artifacts.resumenAcademico?.draft) {
      sessionStorage.setItem('resumenAcademico_draft', artifacts.resumenAcademico.draft);
    }
    
    // Restaurar Tabla ACD
    if (artifacts.tablaACD) {
      if (artifacts.tablaACD.marcoIdeologico) {
        sessionStorage.setItem('tablaACD_marcoIdeologico', artifacts.tablaACD.marcoIdeologico);
      }
      if (artifacts.tablaACD.estrategiasRetoricas) {
        sessionStorage.setItem('tablaACD_estrategiasRetoricas', artifacts.tablaACD.estrategiasRetoricas);
      }
      if (artifacts.tablaACD.vocesPresentes) {
        sessionStorage.setItem('tablaACD_vocesPresentes', artifacts.tablaACD.vocesPresentes);
      }
      if (artifacts.tablaACD.vocesSilenciadas) {
        sessionStorage.setItem('tablaACD_vocesSilenciadas', artifacts.tablaACD.vocesSilenciadas);
      }
    }
    
    // Restaurar Mapa de Actores
    if (artifacts.mapaActores) {
      if (artifacts.mapaActores.actores) {
        sessionStorage.setItem('mapaActores_actores', artifacts.mapaActores.actores);
      }
      if (artifacts.mapaActores.contextoHistorico) {
        sessionStorage.setItem('mapaActores_contextoHistorico', artifacts.mapaActores.contextoHistorico);
      }
      if (artifacts.mapaActores.conexiones) {
        sessionStorage.setItem('mapaActores_conexiones', artifacts.mapaActores.conexiones);
      }
      if (artifacts.mapaActores.consecuencias) {
        sessionStorage.setItem('mapaActores_consecuencias', artifacts.mapaActores.consecuencias);
      }
    }
    
    // Restaurar Respuesta Argumentativa
    if (artifacts.respuestaArgumentativa) {
      if (artifacts.respuestaArgumentativa.tesis) {
        sessionStorage.setItem('respuestaArgumentativa_tesis', artifacts.respuestaArgumentativa.tesis);
      }
      if (artifacts.respuestaArgumentativa.evidencias) {
        sessionStorage.setItem('respuestaArgumentativa_evidencias', artifacts.respuestaArgumentativa.evidencias);
      }
      if (artifacts.respuestaArgumentativa.contraargumento) {
        sessionStorage.setItem('respuestaArgumentativa_contraargumento', artifacts.respuestaArgumentativa.contraargumento);
      }
      if (artifacts.respuestaArgumentativa.refutacion) {
        sessionStorage.setItem('respuestaArgumentativa_refutacion', artifacts.respuestaArgumentativa.refutacion);
      }
    }
    
    console.log('✅ [SessionManager] Borradores de artefactos restaurados');
  } catch (error) {
    console.error('❌ [SessionManager] Error restaurando borradores:', error);
  }
}

/**
 * Limpiar todos los borradores de artefactos de sessionStorage
 */
export function clearArtifactsDrafts() {
  try {
    // Resumen Académico
    sessionStorage.removeItem('resumenAcademico_draft');
    
    // Tabla ACD
    sessionStorage.removeItem('tablaACD_marcoIdeologico');
    sessionStorage.removeItem('tablaACD_estrategiasRetoricas');
    sessionStorage.removeItem('tablaACD_vocesPresentes');
    sessionStorage.removeItem('tablaACD_vocesSilenciadas');
    
    // Mapa de Actores
    sessionStorage.removeItem('mapaActores_actores');
    sessionStorage.removeItem('mapaActores_contextoHistorico');
    sessionStorage.removeItem('mapaActores_conexiones');
    sessionStorage.removeItem('mapaActores_consecuencias');
    
    // Respuesta Argumentativa
    sessionStorage.removeItem('respuestaArgumentativa_tesis');
    sessionStorage.removeItem('respuestaArgumentativa_evidencias');
    sessionStorage.removeItem('respuestaArgumentativa_contraargumento');
    sessionStorage.removeItem('respuestaArgumentativa_refutacion');
    
    console.log('✅ [SessionManager] Borradores de artefactos limpiados');
  } catch (error) {
    console.error('❌ [SessionManager] Error limpiando borradores:', error);
  }
}

/**
 * Capturar estado completo desde el contexto
 */
export function captureCurrentState(contextState) {
  const currentId = getCurrentSessionId();
  
  // Capturar borradores de artefactos
  const artifactsDrafts = captureArtifactsDrafts();
  
  const sessionData = {
    text: contextState.texto ? {
      content: contextState.texto,
      fileName: contextState.archivoActual?.name || 'texto_manual',
      fileType: contextState.archivoActual?.type || 'text/plain',
      metadata: {
        length: contextState.texto.length,
        words: contextState.texto.split(/\s+/).length
      }
    } : null,
    completeAnalysis: contextState.completeAnalysis || null,
    rubricProgress: contextState.rubricProgress || {},
    savedCitations: contextState.savedCitations || {},
    activitiesProgress: contextState.activitiesProgress || {}, // 🆕 Progreso de actividades
    artifactsDrafts: artifactsDrafts, // 🆕 Incluir borradores
    settings: {
      modoOscuro: contextState.modoOscuro || false
    }
  };
  
  if (currentId) {
    updateCurrentSession(sessionData);
  }
  
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
      console.log('ℹ️ [SessionManager] Sin usuario autenticado, solo sesiones locales');
      return localSessions.map(s => ({ ...s, source: 'local', inCloud: false, inLocal: true }));
    }
    
    console.log('🔄 [SessionManager] Obteniendo sesiones de Firestore...');
    const firestoreSessions = await getUserSessions(currentUserId);
    
    const merged = mergeSessions(localSessions, firestoreSessions);
    
    console.log(`✅ [SessionManager] ${merged.length} sesiones totales (${localSessions.length} locales, ${firestoreSessions.length} en cloud)`);
    
    return merged;
    
  } catch (error) {
    console.error('❌ [SessionManager] Error obteniendo sesiones merged:', error);
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
    console.warn('⚠️ [SessionManager] No se puede sincronizar sin usuario autenticado');
    return { synced: 0, errors: 0 };
  }
  
  try {
    const localSessions = getAllSessions();
    
    console.log(`🔄 [SessionManager] Sincronizando ${localSessions.length} sesiones con Firestore...`);
    
    let synced = 0;
    let errors = 0;
    
    for (const session of localSessions) {
      try {
        await saveSessionToFirestore(currentUserId, session);
        synced++;
      } catch (error) {
        console.error(`❌ Error sincronizando sesión ${session.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ [SessionManager] Sincronización completada: ${synced} exitosas, ${errors} errores`);
    
    return { synced, errors };
    
  } catch (error) {
    console.error('❌ [SessionManager] Error en sincronización masiva:', error);
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
    console.error('❌ [SessionManager] Error obteniendo estado de sincronización:', error);
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

