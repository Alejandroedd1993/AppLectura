/**
 * Contexto de Autenticación
 * Maneja el estado del usuario autenticado, su rol y datos de Firestore
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserData } from '../firebase/auth';
import logger from '../utils/logger';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Usuario de Firebase Auth
  const [userData, setUserData] = useState(null); // Datos de Firestore (role, nombre, etc.)
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const [error, setError] = useState(null);

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    logger.debug('🔐 [AuthContext] Inicializando listener de autenticación...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logger.debug('🔐 [AuthContext] Estado de auth cambió:', user ? user.email : 'No autenticado');
      
      try {
        if (user) {
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
          // No hay usuario autenticado
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
  }, []);

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
      await firebaseSignOut(auth);
      logger.log('✅ [AuthContext] Sesión cerrada correctamente');
    } catch (err) {
      logger.error('❌ [AuthContext] Error cerrando sesión:', err);
      throw err;
    }
  }, []);

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

export default AuthContext;

