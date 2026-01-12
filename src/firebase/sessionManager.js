/**
 * 🔐 LOGIN SESSION MANAGER (firebase/sessionManager.js)
 * =====================================================
 * 
 * PROPÓSITO: Control de AUTENTICACIÓN y sesión única por usuario.
 * 
 * ⚠️ NO CONFUNDIR CON: services/sessionManager.js (sesiones de TRABAJO/progreso)
 * 
 * FUNCIONALIDADES:
 * - Garantiza UNA SOLA sesión activa por usuario (cierra otras pestañas/instancias del navegador)
 * - Heartbeat cada 30s para detectar sesiones abandonadas
 * - Listener en tiempo real para detectar conflictos de sesión
 * - Auto-logout cuando otra sesión toma el control
 * 
 * USO TÍPICO:
 * - App.js: createActiveSession() al hacer login
 * - useSessionMaintenance.js: startSessionHeartbeat(), subscribeToSessionConflicts()
 * 
 * IMPACTO EN FIREBASE:
 * - Heartbeat escribe en Firestore cada 30s por usuario activo
 * - Con 40 estudiantes = ~80 escrituras/minuto = ~4,800/hora
 * - Considerar aumentar intervalo a 60-90s si costos son problema
 * 
 * @module firebase/sessionManager
 * @see services/sessionManager.js para sesión de TRABAJO (progreso, borradores)
 */

import { db } from './config';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Genera un ID único para esta sesión del navegador
 */
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene o crea el ID de sesión actual (persistente en sessionStorage)
 */
function getCurrentSessionId() {
  let sessionId = sessionStorage.getItem('appLectura_sessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('appLectura_sessionId', sessionId);
  }
  return sessionId;
}

/**
 * Registra una nueva sesión activa en Firestore
 * Cierra automáticamente cualquier sesión previa del mismo usuario
 * 
 * @param {string} userId - UID del usuario
 * @param {Object} metadata - Información adicional (navegador, ubicación, etc.)
 * @returns {Promise<string>} - ID de la sesión creada
 */
export async function createActiveSession(userId, metadata = {}) {
  const sessionId = getCurrentSessionId();
  
  console.log('🔐 [SessionManager.createActiveSession] Iniciando...');
  console.log('  - User ID:', userId);
  console.log('  - Session ID:', sessionId);
  console.log('  - Metadata:', metadata);
  
  const sessionData = {
    sessionId,
    userId,
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
    browser: navigator.userAgent,
    ...metadata
  };
  
  const sessionRef = doc(db, 'active_sessions', userId);
  
  try {
    console.log('📝 [SessionManager] Escribiendo a Firestore:', sessionRef.path);
    await setDoc(sessionRef, sessionData);
    console.log('✅ [SessionManager] Sesión creada exitosamente');
    console.log('📊 [SessionManager] Datos guardados:', sessionData);
    return sessionId;
  } catch (error) {
    console.error('❌ [SessionManager] Error creando sesión:', error);
    console.error('📋 [SessionManager] Detalles del error:', error.message);
    throw error;
  }
}

/**
 * Actualiza el timestamp de última actividad de la sesión
 * Se debe llamar periódicamente (cada 30s) para mantener sesión viva
 * 
 * @param {string} userId 
 */
export async function updateSessionActivity(userId) {
  const sessionId = getCurrentSessionId();
  const sessionRef = doc(db, 'active_sessions', userId);
  
  try {
    await setDoc(sessionRef, {
      sessionId,
      lastActivity: serverTimestamp()
    }, { merge: true });
    
    console.log('🔄 [SessionManager] Actividad actualizada');
  } catch (error) {
    console.warn('⚠️ [SessionManager] Error actualizando actividad:', error);
  }
}

/**
 * Cierra la sesión activa del usuario
 * 
 * @param {string} userId 
 */
export async function closeActiveSession(userId) {
  const sessionRef = doc(db, 'active_sessions', userId);
  
  try {
    await deleteDoc(sessionRef);
    sessionStorage.removeItem('appLectura_sessionId');
    console.log('✅ [SessionManager] Sesión cerrada');
  } catch (error) {
    console.error('❌ [SessionManager] Error cerrando sesión:', error);
  }
}

/**
 * Escucha cambios en la sesión activa del usuario
 * Si detecta que otra sesión tomó el control, ejecuta callback
 * 
 * @param {string} userId 
 * @param {Function} onSessionConflict - Callback cuando otra sesión toma control
 * @returns {Function} - Función para cancelar el listener
 */
export function listenToSessionConflicts(userId, onSessionConflict) {
  const currentSessionId = getCurrentSessionId();
  const sessionRef = doc(db, 'active_sessions', userId);
  
  console.log('👂 [SessionManager.listenToSessionConflicts] Iniciando listener...');
  console.log('  - User ID:', userId);
  console.log('  - Current Session ID:', currentSessionId);
  console.log('  - Firestore path:', sessionRef.path);
  
  return onSnapshot(sessionRef, (doc) => {
    console.log('📡 [SessionManager] Snapshot recibido');
    console.log('  - Documento existe:', doc.exists());
    
    if (doc.exists()) {
      const data = doc.data();
      console.log('📊 [SessionManager] Datos de sesión:', data);
      console.log('  - Session ID en Firestore:', data.sessionId);
      console.log('  - Session ID local:', currentSessionId);
      console.log('  - ¿Son diferentes?:', data.sessionId !== currentSessionId);
      
      // Si el sessionId es diferente al nuestro, otra sesión tomó control
      if (data.sessionId !== currentSessionId) {
        console.warn('⚠️⚠️⚠️ [SessionManager] ¡CONFLICTO! Sesión tomada por otro dispositivo');
        console.warn('  - Session ID nueva:', data.sessionId);
        console.warn('  - Session ID nuestra:', currentSessionId);
        onSessionConflict(data);
      } else {
        console.log('✅ [SessionManager] Sesión válida, es nuestra');
      }
    } else {
      // La sesión fue eliminada (logout manual)
      console.log('ℹ️ [SessionManager] Sesión eliminada de Firestore');
    }
  }, (error) => {
    console.error('❌ [SessionManager] Error en listener de sesión:', error);
  });
}

/**
 * Hook para mantener sesión viva con heartbeat cada 30 segundos
 * 
 * @param {string} userId 
 * @returns {Function} - Función para detener heartbeat
 */
export function startSessionHeartbeat(userId) {
  const intervalId = setInterval(() => {
    updateSessionActivity(userId);
  }, 30000); // Cada 30 segundos
  
  // Primera actualización inmediata
  updateSessionActivity(userId);
  
  return () => clearInterval(intervalId);
}

/**
 * Información de la sesión actual
 */
export function getSessionInfo() {
  return {
    sessionId: getCurrentSessionId(),
    browser: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
}
