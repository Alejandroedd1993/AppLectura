/**
 * Funciones de autenticación con Firebase
 * Maneja login, registro, logout y gestión de perfiles
 */

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import logger from '../utils/logger';

const googleProvider = new GoogleAuthProvider();

/**
 * Registra un nuevo usuario con email y contraseña
 * @param {string} email 
 * @param {string} password 
 * @param {string} nombre - Nombre completo del usuario
 * @param {string} role - 'estudiante' o 'docente'
 * @param {object} metadata - Datos adicionales según el rol
 * @returns {Promise<object>} - Usuario creado
 */
export async function registerWithEmail(email, password, nombre, role, metadata = {}) {
  try {
    logger.log('📝 Registrando usuario:', email, 'con rol:', role);
    
    // Validar rol
    if (!['estudiante', 'docente'].includes(role)) {
      throw new Error('Rol inválido. Debe ser "estudiante" o "docente"');
    }
    
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Actualizar perfil con nombre
    await updateProfile(user, { displayName: nombre });
    
    // Crear documento de usuario en Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      nombre,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      ...metadata // institucion (docente) o cohorte/docenteAsignado (estudiante)
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    logger.log('✅ Usuario registrado exitosamente:', user.uid);
    
    return { user, userData };
    
  } catch (error) {
    logger.error('❌ Error en registro:', error);
    
    // Mapear errores de Firebase a mensajes amigables
    const errorMessages = {
      'auth/email-already-in-use': 'Este email ya está registrado',
      'auth/invalid-email': 'Email inválido',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/operation-not-allowed': 'Operación no permitida. Contacta al administrador'
    };
    
    throw new Error(errorMessages[error.code] || error.message);
  }
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} - Usuario autenticado con datos de Firestore
 */
export async function loginWithEmail(email, password) {
  try {
    logger.log('🔑 Iniciando sesión:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Obtener datos adicionales de Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('Usuario no encontrado en la base de datos');
    }
    
    const userData = userDoc.data();
    
    // Actualizar último login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp()
    });
    
    logger.log('✅ Sesión iniciada exitosamente:', user.uid, 'Rol:', userData.role);
    
    return { user, userData };
    
  } catch (error) {
    logger.error('❌ Error en login:', error);
    
    const errorMessages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuario deshabilitado. Contacta al administrador',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde'
    };
    
    throw new Error(errorMessages[error.code] || error.message);
  }
}

/**
 * Inicia sesión con Google (SSO)
 * Si el usuario no existe, se crea automáticamente con rol "estudiante" por defecto
 * @param {string} defaultRole - Rol por defecto si es primer login ('estudiante' o 'docente')
 * @returns {Promise<object>}
 */
export async function loginWithGoogle(defaultRole = 'estudiante') {
  try {
    logger.log('🔑 Iniciando sesión con Google...');
    
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    
    // Verificar si ya existe en Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let userData;
    
    if (!userDoc.exists()) {
      // Primer login: crear usuario en Firestore
      logger.log('📝 Primer login con Google. Creando usuario...');
      
      userData = {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || 'Usuario',
        role: defaultRole,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(userDocRef, userData);
      
    } else {
      // Usuario existente: actualizar último login
      userData = userDoc.data();
      
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
        photoURL: user.photoURL // Actualizar foto si cambió
      });
    }
    
    logger.log('✅ Sesión con Google exitosa:', user.uid, 'Rol:', userData.role);
    
    return { user, userData };
    
  } catch (error) {
    logger.error('❌ Error en login con Google:', error);
    
    const errorMessages = {
      'auth/popup-closed-by-user': 'Popup cerrado. Intenta de nuevo',
      'auth/cancelled-popup-request': 'Operación cancelada',
      'auth/popup-blocked': 'Popup bloqueado por el navegador. Permite popups para este sitio',
      'auth/internal-error': 'Error de configuración o red. Verifica tu conexión y las variables de entorno (API Key).'
    };
    
    const customError = new Error(errorMessages[error.code] || error.message);
    customError.code = error.code;
    throw customError;
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logout() {
  try {
    logger.log('👋 Cerrando sesión...');
    await signOut(auth);
    logger.log('✅ Sesión cerrada');
  } catch (error) {
    logger.error('❌ Error cerrando sesión:', error);
    throw error;
  }
}

/**
 * Envía email para resetear contraseña
 * @param {string} email 
 */
export async function resetPassword(email) {
  try {
    logger.log('📧 Enviando email de recuperación a:', email);
    await sendPasswordResetEmail(auth, email);
    logger.log('✅ Email enviado');
  } catch (error) {
    logger.error('❌ Error enviando email:', error);
    
    const errorMessages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/invalid-email': 'Email inválido'
    };
    
    throw new Error(errorMessages[error.code] || error.message);
  }
}

/**
 * Actualiza el perfil del usuario
 * @param {string} userId 
 * @param {object} updates - Campos a actualizar
 */
export async function updateUserProfile(userId, updates) {
  try {
    logger.log('📝 Actualizando perfil de usuario:', userId);
    
    const userRef = doc(db, 'users', userId);
    
    // Actualizar en Firestore
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Si se actualizó el nombre, actualizar también en Auth
    if (updates.nombre && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.nombre
      });
    }
    
    logger.log('✅ Perfil actualizado');
    
  } catch (error) {
    logger.error('❌ Error actualizando perfil:', error);
    throw error;
  }
}

/**
 * Obtiene los datos completos del usuario desde Firestore
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function getUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('Usuario no encontrado');
    }
    
    return userDoc.data();
    
  } catch (error) {
    logger.error('❌ Error obteniendo datos de usuario:', error);
    throw error;
  }
}

/**
 * Verifica si el usuario tiene un rol específico
 * @param {string} userId 
 * @param {string} role - 'estudiante' o 'docente'
 * @returns {Promise<boolean>}
 */
export async function hasRole(userId, role) {
  try {
    const userData = await getUserData(userId);
    return userData.role === role;
  } catch (error) {
    logger.error('❌ Error verificando rol:', error);
    return false;
  }
}

export { auth };

