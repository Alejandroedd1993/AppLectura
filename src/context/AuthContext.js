/**
 * Contexto de Autenticación
 * Maneja el estado del usuario autenticado, su rol y datos de Firestore
 */

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserData } from '../firebase/auth';
import logger from '../utils/logger';
import { LEGACY_KEYS, storagePrefixesToClear } from '../utils/storageKeys.js';
import { setCurrentUser as setSessionManagerUser, syncPendingSessions } from '../services/sessionManager';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Usuario de Firebase Auth
  const [userData, setUserData] = useState(null); // Datos de Firestore (role, nombre, etc.)
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const [error, setError] = useState(null);
  // 🔧 C1 FIX: detección de cambio de usuario usa solo lastUserIdRef (eliminado previousUserId state)
  const lastUserIdRef = useRef(null);

  // Función para limpiar datos locales del usuario (debe estar antes del useEffect)
  const clearLocalUserData = ({ mode = 'full', uid = null } = {}) => {
    logger.debug('🧹 [AuthContext] Limpiando datos locales del usuario...');

    // En logout normal queremos preservar el progreso local del usuario.
    // Solo limpiamos datos sensibles/no deterministas para evitar contaminación.
    const isLogout = mode === 'logout';

    // Helper: elimina tanto la clave legacy como la scopeada por uid
    const removeKeyAndScoped = (baseKey) => {
      try {
        localStorage.removeItem(baseKey);
        if (uid) localStorage.removeItem(`${baseKey}:${uid}`);
      } catch (err) {
        logger.warn(`⚠️ No se pudo eliminar ${baseKey}:`, err);
      }
    };

    if (isLogout) {
      // API keys (legacy + scoped por usuario)
      const sensitiveBaseKeys = [
        'openai_api_key',
        'gemini_api_key',
        'deepseek_api_key',
        'user_openai_api_key',
        'ai_provider',
        'api_usage',
        // Flags/colas transitorias
        '__restoring_session__'
      ];

      sensitiveBaseKeys.forEach(removeKeyAndScoped);

      // sessionStorage es por pestaña/origen; conviene limpiar para evitar contaminación de borradores.
      try {
        sessionStorage.clear();
      } catch (err) {
        logger.warn('⚠️ No se pudo limpiar sessionStorage:', err);
      }

      logger.log('✅ [AuthContext] Logout: datos sensibles limpiados (progreso preservado)');
      return;
    }

    // Lista de keys que deben limpiarse al cambiar de usuario
    const keysToRemove = [
      LEGACY_KEYS.APPLECTURA_SESSIONS,
      LEGACY_KEYS.APPLECTURA_CURRENT_SESSION,
      // API keys (legacy + scoped)
      'openai_api_key',
      'gemini_api_key',
      'deepseek_api_key',
      'user_openai_api_key',
      'ai_provider',
      'api_usage',
      'rubricProgress',
      'savedCitations',
      'activitiesProgress',
      LEGACY_KEYS.REWARDS_STATE,
      'annotations_migrated_v1',
      'analysisCache',
      'analysis_cache_stats',
      'analysis_cache_metrics',
      'studyItems_cache',
      'annotations_cache',
      // Flags/colas relacionadas a sesiones/sync
      '__restoring_session__',
      LEGACY_KEYS.APPLECTURA_PENDING_SYNCS
    ];

    keysToRemove.forEach(removeKeyAndScoped);

    // También limpiar keys que empiecen con ciertos prefijos
    const prefixesToClear = [
      ...storagePrefixesToClear()
    ];
    Object.keys(localStorage).forEach(key => {
      if (prefixesToClear.some(prefix => key.startsWith(prefix))) {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          logger.warn(`⚠️ No se pudo eliminar ${key}:`, err);
        }
      }
    });

    // sessionStorage es por pestaña/origen, pero en logout/cambio de usuario
    // conviene limpiar para evitar contaminación de borradores/artefactos.
    try {
      sessionStorage.clear();
    } catch (err) {
      logger.warn('⚠️ No se pudo limpiar sessionStorage:', err);
    }

    logger.log('✅ [AuthContext] Datos locales limpiados');
  };

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    logger.debug('🔐 [AuthContext] Inicializando listener de autenticación...');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logger.debug('🔐 [AuthContext] Estado de auth cambió:', user ? user.email : 'No autenticado');

      try {
        if (user) {
          // Configurar SessionManager para scoping (local + cloud)
          setSessionManagerUser(user.uid);

          // Detectar cambio de usuario (incluso si hubo logout intermedio)
          if (lastUserIdRef.current && lastUserIdRef.current !== user.uid) {
            logger.warn('🔄 [AuthContext] Cambio de usuario detectado, limpiando datos locales...');
            clearLocalUserData({ mode: 'full', uid: lastUserIdRef.current });
          }

          lastUserIdRef.current = user.uid;

          // Mejor esfuerzo: sincronizar pendientes al iniciar sesión
          try {
            syncPendingSessions();
          } catch (e) {
            logger.warn('⚠️ [AuthContext] No se pudo iniciar syncPendingSessions:', e);
          }

          // Usuario autenticado: cargar datos de Firestore
          const data = await getUserData(user.uid);

          setCurrentUser(user);
          setUserData(data);

          logger.log('✅ [AuthContext] Usuario cargado:', {
            uid: user.uid,
            email: user.email,
            role: data.role,
            nombre: data.nombre
          });

        } else {
          // No hay usuario autenticado - preservar progreso local, limpiar solo datos sensibles
          setSessionManagerUser(null);
          if (lastUserIdRef.current) {
            logger.debug('🧹 [AuthContext] Usuario cerró sesión, limpiando datos sensibles...');
            clearLocalUserData({ mode: 'logout', uid: lastUserIdRef.current });
          }

          lastUserIdRef.current = null;
          setCurrentUser(null);
          setUserData(null);

          logger.debug('ℹ️ [AuthContext] No hay usuario autenticado');
        }

      } catch (err) {
        logger.error('❌ [AuthContext] Error cargando datos de usuario:', err);
        setError(err.message);

        // Si hay error cargando datos, cerrar sesión
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      logger.debug('🔐 [AuthContext] Limpiando listener de autenticación');
      unsubscribe();
    };
  }, []); // 🔧 C1 FIX: montar listener UNA sola vez; detección de cambio usa lastUserIdRef

  // Función para refrescar datos del usuario (útil después de actualizaciones)
  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;

    try {
      logger.debug('🔄 [AuthContext] Refrescando datos de usuario...');
      const data = await getUserData(currentUser.uid);
      setUserData(data);
      logger.log('✅ [AuthContext] Datos refrescados');
    } catch (err) {
      logger.error('❌ [AuthContext] Error refrescando datos:', err);
      setError(err.message);
    }
  }, [currentUser]);

  // Función para cerrar sesión
  const signOut = useCallback(async () => {
    try {
      logger.debug('🔐 [AuthContext] Cerrando sesión...');

      // 🔧 FIX: Cerrar sesión activa en Firestore ANTES de invalidar el token de auth
      if (currentUser?.uid) {
        try {
          const { closeActiveSession } = await import('../firebase/sessionManager');
          await closeActiveSession(currentUser.uid);
        } catch (sessionErr) {
          logger.warn('⚠️ [AuthContext] Error cerrando sesión activa (pre-signOut):', sessionErr.message);
        }
      }

      // Logout: preservar progreso local; limpiar solo datos sensibles
      clearLocalUserData({ mode: 'logout', uid: currentUser?.uid });

      await firebaseSignOut(auth);
      logger.log('✅ [AuthContext] Sesión cerrada correctamente');
    } catch (err) {
      logger.error('❌ [AuthContext] Error cerrando sesión:', err);
      throw err;
    }
  }, [clearLocalUserData, currentUser]);

  // Helpers de verificación de rol
  const isEstudiante = userData?.role === 'estudiante';
  const isDocente = userData?.role === 'docente';

  const value = {
    currentUser,
    userData,
    loading,
    error,
    refreshUserData,
    signOut,
    isEstudiante,
    isDocente,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
}

