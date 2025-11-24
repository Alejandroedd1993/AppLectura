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
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { getSessionContentHash, compareSessionContent, mergeSessionsWithConflictResolution } from '../utils/sessionHash';

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
    console.log('📤 Subiendo texto:', file.name);
    
    // 1. Subir archivo a Storage
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `textos/${metadata.docenteUid}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Archivo subido a Storage:', downloadURL);
    
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
    
    console.log('✅ Texto creado en Firestore:', textoRef.id);
    
    return textoRef.id;
    
  } catch (error) {
    console.error('❌ Error subiendo texto:', error);
    throw error;
  }
}

/**
 * Obtiene todos los textos de un docente
 * @param {string} docenteUid 
 * @returns {Promise<Array>}
 */
export async function getTextosDocente(docenteUid) {
  try {
    const q = query(
      collection(db, 'textos'),
      where('docenteUid', '==', docenteUid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('❌ Error obteniendo textos del docente:', error);
    throw error;
  }
}

/**
 * Obtiene los textos asignados a un estudiante
 * @param {string} estudianteUid 
 * @returns {Promise<Array>}
 */
export async function getTextosEstudiante(estudianteUid) {
  try {
    const q = query(
      collection(db, 'textos'),
      where('asignadoA', 'array-contains', estudianteUid),
      where('visible', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('❌ Error obteniendo textos del estudiante:', error);
    throw error;
  }
}

/**
 * Asigna un texto a uno o más estudiantes
 * @param {string} textoId 
 * @param {Array<string>} estudianteUids 
 */
export async function assignTextoToStudents(textoId, estudianteUids) {
  try {
    const textoRef = doc(db, 'textos', textoId);
    
    // Obtener asignados actuales
    const textoDoc = await getDoc(textoRef);
    const currentAssignments = textoDoc.data()?.asignadoA || [];
    
    // Combinar (sin duplicados)
    const newAssignments = [...new Set([...currentAssignments, ...estudianteUids])];
    
    await updateDoc(textoRef, {
      asignadoA: newAssignments,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Texto asignado a', estudianteUids.length, 'estudiantes');
    
  } catch (error) {
    console.error('❌ Error asignando texto:', error);
    throw error;
  }
}

/**
 * Guarda el análisis completo de un texto (pre-lectura + crítico)
 * @param {string} textoId 
 * @param {object} completeAnalysis 
 */
export async function saveAnalisisTexto(textoId, completeAnalysis) {
  try {
    const textoRef = doc(db, 'textos', textoId);
    
    await updateDoc(textoRef, {
      completeAnalysis,
      analisisGenerado: true,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Análisis guardado para texto:', textoId);
    
  } catch (error) {
    console.error('❌ Error guardando análisis:', error);
    throw error;
  }
}

// ============================================
// PROGRESO DE ESTUDIANTES
// ============================================

/**
 * Guarda/actualiza el progreso de un estudiante en un texto
 * @param {string} estudianteUid 
 * @param {string} textoId 
 * @param {object} progressData - { rubrica1: {...}, rubrica2: {...}, ... }
 */
export async function saveStudentProgress(estudianteUid, textoId, progressData) {
  try {
    const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);
    
    // Obtener datos existentes para hacer merge inteligente
    const existingDoc = await getDoc(progressRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};
    
    // 🔄 MERGE INTELIGENTE: Combinar datos nuevos con existentes
    const mergedData = { ...existingData };
    
    // Mergear rubricProgress (mantener el más reciente por rúbrica)
    if (progressData.rubricProgress) {
      mergedData.rubricProgress = mergedData.rubricProgress || {};
      
      Object.keys(progressData.rubricProgress).forEach(rubricId => {
        const newRubric = progressData.rubricProgress[rubricId];
        const existingRubric = mergedData.rubricProgress[rubricId];
        
        // Si no existe o el nuevo es más reciente, actualizar
        if (!existingRubric || 
            (newRubric.lastUpdate || 0) > (existingRubric.lastUpdate || 0)) {
          mergedData.rubricProgress[rubricId] = newRubric;
        }
      });
    }
    
    // Mergear activitiesProgress (mantener el más reciente por documento)
    if (progressData.activitiesProgress) {
      mergedData.activitiesProgress = mergedData.activitiesProgress || {};
      
      Object.keys(progressData.activitiesProgress).forEach(docId => {
        const newActivity = progressData.activitiesProgress[docId];
        const existingActivity = mergedData.activitiesProgress[docId];
        
        // Si no existe o el nuevo es más reciente, actualizar
        if (!existingActivity ||
            (newActivity.preparation?.updatedAt || 0) > (existingActivity.preparation?.updatedAt || 0)) {
          mergedData.activitiesProgress[docId] = newActivity;
        }
      });
    }

    // 🆕 MERGEAR rewardsState (Gamificación)
    // Si viene en progressData, siempre actualiza (la lógica de conflicto está en el cliente/AppContext)
    if (progressData.rewardsState) {
      mergedData.rewardsState = progressData.rewardsState;
    }
    
    // Calcular métricas agregadas
    const rubricas = Object.keys(mergedData.rubricProgress || {}).filter(k => k.startsWith('rubrica'));
    const scores = rubricas.map(k => mergedData.rubricProgress[k]?.average || 0).filter(s => s > 0);
    const promedio_global = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 
      : 0;
    
    // Preparar datos finales a guardar
    const finalData = {
      ...mergedData,
      textoId,
      estudianteUid,
      promedio_global,
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
      finalData.completado = false;
      finalData.bloqueado = false;
    }
    
    // Guardar con merge
    await setDoc(progressRef, finalData, { merge: true });
    
    console.log('✅ [Firestore] Progreso guardado con merge inteligente:', estudianteUid, textoId);
    
  } catch (error) {
    console.error('❌ [Firestore] Error guardando progreso:', error);
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
  try {
    const progressRef = doc(db, 'students', estudianteUid, 'progress', textoId);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      return null;
    }
    
    const data = progressDoc.data();
    
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
    console.error('❌ Error obteniendo progreso:', error);
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
    console.error('❌ Error obteniendo progreso completo:', error);
    throw error;
  }
}

/**
 * Obtiene el progreso de todos los estudiantes asignados a un texto (vista docente)
 * @param {string} textoId 
 * @param {Array<string>} estudianteUids 
 * @returns {Promise<Array>}
 */
export async function getTextProgressForStudents(textoId, estudianteUids) {
  try {
    const progressData = [];
    
    // Firestore no permite IN con más de 10 elementos, así que hacemos batch queries
    const batches = [];
    for (let i = 0; i < estudianteUids.length; i += 10) {
      batches.push(estudianteUids.slice(i, i + 10));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (uid) => {
        const progress = await getStudentProgress(uid, textoId);
        
        // Obtener nombre del estudiante
        const userDoc = await getDoc(doc(db, 'users', uid));
        const estudianteNombre = userDoc.data()?.nombre || 'Usuario';
        
        return {
          estudianteUid: uid,
          estudianteNombre,
          ...progress
        };
      });
      
      const results = await Promise.all(promises);
      progressData.push(...results);
    }
    
    return progressData;
    
  } catch (error) {
    console.error('❌ Error obteniendo progreso de estudiantes:', error);
    throw error;
  }
}

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
    
    console.log('✅ Evaluación guardada:', evalRef.id);
    
    return evalRef.id;
    
  } catch (error) {
    console.error('❌ Error guardando evaluación:', error);
    throw error;
  }
}

/**
 * Obtiene todas las evaluaciones de un estudiante para un texto
 * @param {string} estudianteUid 
 * @param {string} textoId 
 * @returns {Promise<Array>}
 */
export async function getEvaluacionesEstudiante(estudianteUid, textoId) {
  try {
    const q = query(
      collection(db, 'evaluaciones'),
      where('estudianteUid', '==', estudianteUid),
      where('textoId', '==', textoId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('❌ Error obteniendo evaluaciones:', error);
    throw error;
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
    console.error('❌ Error en listener de progreso:', error);
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
    console.error('❌ Error en listener de textos:', error);
  });
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Incrementa un contador (útil para métricas)
 * @param {string} collection 
 * @param {string} docId 
 * @param {string} field 
 * @param {number} amount 
 */
export async function incrementCounter(collectionName, docId, field, amount = 1) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [field]: increment(amount)
    });
  } catch (error) {
    console.error('❌ Error incrementando contador:', error);
    throw error;
  }
}

/**
 * Elimina un documento (soft delete: marca como invisible)
 * @param {string} collection 
 * @param {string} docId 
 */
export async function softDelete(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      visible: false,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Error en soft delete:', error);
    throw error;
  }
}

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
    console.log(`📤 [Storage] Subiendo texto grande (${(textContent.length / 1024).toFixed(2)} KB)...`);
    
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
    
    console.log('✅ [Storage] Texto subido exitosamente. URL:', downloadURL.substring(0, 50) + '...');
    
    return downloadURL;
    
  } catch (error) {
    console.error('❌ [Storage] Error subiendo texto:', error);
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
    console.log('📥 [Storage] Descargando texto desde URL...');
    
    const response = await fetch(downloadURL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const textContent = await response.text();
    
    console.log(`✅ [Storage] Texto descargado (${(textContent.length / 1024).toFixed(2)} KB)`);
    
    return textContent;
    
  } catch (error) {
    console.error('❌ [Storage] Error descargando texto:', error);
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
    console.log('✅ [Storage] Texto eliminado de Storage');
  } catch (error) {
    // Si el archivo no existe, no es un error crítico
    if (error.code === 'storage/object-not-found') {
      console.log('ℹ️ [Storage] Archivo no encontrado (ya eliminado)');
    } else {
      console.error('❌ [Storage] Error eliminando texto:', error);
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
      console.log(`📥 [mapSessionDoc] Texto en Storage detectado, descargando...`);
      textContent = await downloadTextFromStorage(data.textStorageURL);
    } catch (error) {
      console.error('❌ [mapSessionDoc] Error descargando texto desde Storage:', error);
      // Fallback: usar textPreview si falla descarga
      textContent = data.textPreview || null;
    }
  }
  
  const textMetadata = data.textMetadata || data.text?.metadata || {};

  const text = textContent ? {
    content: textContent,
    fileName: textMetadata.fileName || data.text?.fileName || 'texto_manual',
    fileType: textMetadata.fileType || data.text?.fileType || 'text/plain',
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
    console.log('💾 [Firestore] Guardando sesión:', sessionData.id);
    
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
      console.log(`📦 [Firestore] Texto grande detectado (${(textContent.length / 1024).toFixed(2)} KB), usando Storage...`);
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
      
      // Artefactos y citas
      artifactsDrafts: sessionData.artifactsDrafts || {},
      savedCitations: sessionData.savedCitations || {},
      
      // Settings
      settings: sessionData.settings || {},
      
      // 🆕 Gamificación (puntos, racha, achievements)
      rewardsState: sessionData.rewardsState || null,
      
      // Metadata de sincronización
      syncStatus: 'synced',
      userId,
      
      // Timestamp de Firestore
      updatedAt: serverTimestamp()
    };
    
    // Usar localSessionId como ID del documento para evitar duplicados
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionData.id);
    
    await setDoc(sessionRef, firestoreData, { merge: true });
    
    console.log('✅ [Firestore] Sesión guardada exitosamente:', sessionData.id);
    
    return sessionData.id;
    
  } catch (error) {
    console.error('❌ [Firestore] Error guardando sesión:', error);
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
      where: whereClause = null
    } = options;
    
    console.log('📥 [Firestore] Obteniendo sesiones del usuario:', userId);
    
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
    const sessions = await Promise.all(snapshot.docs.map(mapSessionDoc));
    
    console.log(`✅ [Firestore] ${sessions.length} sesiones obtenidas`);
    
    return sessions;
    
  } catch (error) {
    console.error('❌ [Firestore] Error obteniendo sesiones:', error);
    throw error;
  }
}

/**
 * Obtiene una sesión específica por ID
 * @param {string} userId 
 * @param {string} sessionId 
 * @returns {Promise<object|null>}
 */
export async function getSessionById(userId, sessionId) {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ [Firestore] Sesión no encontrada:', sessionId);
      return null;
    }
    
    // 🆕 Await porque mapSessionDoc ahora es async
    return await mapSessionDoc(sessionDoc);
    
  } catch (error) {
    console.error('❌ [Firestore] Error obteniendo sesión:', error);
    throw error;
  }
}

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
    
    console.log('✅ [Firestore] Sesión actualizada:', sessionId);
    
  } catch (error) {
    console.error('❌ [Firestore] Error actualizando sesión:', error);
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
      console.log('🗑️ [Firestore] Eliminando texto de Storage...');
      await deleteTextFromStorage(userId, sessionId);
    }
    
    await deleteDoc(sessionRef);
    
    console.log('✅ [Firestore] Sesión eliminada:', sessionId);
    
  } catch (error) {
    console.error('❌ [Firestore] Error eliminando sesión:', error);
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
    
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ [Firestore] ${snapshot.docs.length} sesiones eliminadas`);
    
  } catch (error) {
    console.error('❌ [Firestore] Error eliminando sesiones:', error);
    throw error;
  }
}

/**
 * Sincroniza múltiples sesiones de localStorage a Firestore
 * @param {string} userId 
 * @param {Array} sessions - Array de sesiones desde localStorage
 */
export async function syncSessionsToFirestore(userId, sessions) {
  try {
    console.log(`🔄 [Firestore] Sincronizando ${sessions.length} sesiones...`);
    
    let synced = 0;
    let errors = 0;
    
    for (const session of sessions) {
      try {
        await saveSessionToFirestore(userId, session);
        synced++;
      } catch (error) {
        console.error(`❌ Error sincronizando sesión ${session.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ [Firestore] Sincronización completada: ${synced} exitosas, ${errors} errores`);
    
    return { synced, errors };
    
  } catch (error) {
    console.error('❌ [Firestore] Error en sincronización masiva:', error);
    throw error;
  }
}

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
        console.log(`⚠️ [mergeSessions] Conflicto en sesión ${session.id}, resolviendo...`);
        
        const comparison = compareSessionContent(session, existing);
        console.log('📊 [mergeSessions] Diferencias:', comparison.differences);
        
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
    const sessions = await Promise.all(snapshot.docs.map(mapSessionDoc));
    
    callback(sessions);
  }, (error) => {
    console.error('❌ Error en listener de sesiones:', error);
  });
}

