/**
 * Hook de persistencia en Firestore (reemplaza useActivityPersistence con localStorage)
 * 
 * Sincroniza automáticamente el progreso del estudiante con Firestore
 * Soporta:
 * - Progreso de rúbricas
 * - Actividades (respuestas, feedbacks)
 * - Sincronización en tiempo real
 * - Fallback a localStorage si no hay conexión
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  saveStudentProgress, 
  getStudentProgress, 
  subscribeToStudentProgress 
} from '../firebase/firestore';

/**
 * useFirestorePersistence
 * 
 * @param {string} textoId - ID del texto/documento
 * @param {object} data - Datos a persistir
 * @param {object} options - { enabled, onRehydrate, autoSave }
 * @returns {object} - { save, loading, error, lastSaved, synced }
 */
export default function useFirestorePersistence(textoId, data, options = {}) {
  const { 
    enabled = true, 
    onRehydrate = null, 
    autoSave = true, 
    debounceMs = 2000 
  } = options;

  const { currentUser, isEstudiante } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [synced, setSynced] = useState(false);
  
  const dataRef = useRef(data);
  const saveTimeoutRef = useRef(null);
  const hasRehydratedRef = useRef(false);

  // Actualizar ref cuando cambian los datos
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /**
   * Rehidrata datos desde Firestore (solo la primera vez)
   */
  const rehydrate = useCallback(async () => {
    if (!currentUser || !textoId || !enabled || !isEstudiante) return;
    if (hasRehydratedRef.current) return;
    
    try {
      console.log('📥 [FirestorePersistence] Rehidratando desde Firestore...');
      setLoading(true);
      
      const savedData = await getStudentProgress(currentUser.uid, textoId);
      
      if (savedData && onRehydrate) {
        console.log('✅ [FirestorePersistence] Datos encontrados, rehidratando...');
        onRehydrate(savedData);
        setSynced(true);
      } else {
        console.log('ℹ️ [FirestorePersistence] No hay datos guardados (primera vez)');
      }
      
      hasRehydratedRef.current = true;
      
    } catch (err) {
      console.error('❌ [FirestorePersistence] Error rehidratando:', err);
      setError(err.message);
      
      // Fallback a localStorage
      try {
        const localKey = `firestore_backup_${currentUser.uid}_${textoId}`;
        const localData = localStorage.getItem(localKey);
        if (localData && onRehydrate) {
          console.log('📦 [FirestorePersistence] Rehidratando desde localStorage backup');
          onRehydrate(JSON.parse(localData));
        }
      } catch (localErr) {
        console.error('❌ [FirestorePersistence] Error con localStorage backup:', localErr);
      }
      
    } finally {
      setLoading(false);
    }
  }, [currentUser, textoId, enabled, isEstudiante, onRehydrate]);

  /**
   * Guarda datos en Firestore
   */
  const save = useCallback(async (dataToSave = null) => {
    const payload = dataToSave || dataRef.current;
    
    if (!currentUser || !textoId || !enabled || !isEstudiante) {
      console.warn('⚠️ [FirestorePersistence] Guardado deshabilitado (no autenticado o no es estudiante)');
      return false;
    }
    
    try {
      console.log('💾 [FirestorePersistence] Guardando en Firestore...');
      setError(null);
      
      await saveStudentProgress(currentUser.uid, textoId, payload);
      
      setLastSaved(new Date());
      setSynced(true);
      
      // Backup en localStorage
      try {
        const localKey = `firestore_backup_${currentUser.uid}_${textoId}`;
        localStorage.setItem(localKey, JSON.stringify(payload));
      } catch (localErr) {
        console.warn('⚠️ [FirestorePersistence] No se pudo guardar backup local:', localErr);
      }
      
      console.log('✅ [FirestorePersistence] Guardado exitoso');
      return true;
      
    } catch (err) {
      console.error('❌ [FirestorePersistence] Error guardando:', err);
      setError(err.message);
      setSynced(false);
      return false;
    }
  }, [currentUser, textoId, enabled, isEstudiante]);

  /**
   * Guardado automático con debounce
   */
  useEffect(() => {
    if (!autoSave || !enabled) return;
    
    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Programar nuevo guardado
    saveTimeoutRef.current = setTimeout(() => {
      if (hasRehydratedRef.current) {
        save();
      }
    }, debounceMs);
    
    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, autoSave, enabled, save, debounceMs]);

  /**
   * Rehidratar al montar
   */
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  /**
   * Listener en tiempo real (opcional, para ver cambios de otros dispositivos)
   */
  useEffect(() => {
    if (!currentUser || !textoId || !enabled || !isEstudiante) return;
    
    console.log('👂 [FirestorePersistence] Suscribiéndose a cambios en tiempo real...');
    
    const unsubscribe = subscribeToStudentProgress(
      currentUser.uid, 
      textoId, 
      (updatedData) => {
        if (updatedData && onRehydrate && hasRehydratedRef.current) {
          console.log('🔄 [FirestorePersistence] Datos actualizados desde Firestore');
          onRehydrate(updatedData);
          setSynced(true);
        }
      }
    );
    
    return () => {
      console.log('👂 [FirestorePersistence] Cancelando suscripción');
      unsubscribe();
    };
  }, [currentUser, textoId, enabled, isEstudiante, onRehydrate]);

  return {
    save,           // Función para guardar manualmente
    loading,        // Cargando datos iniciales
    error,          // Error si hubo alguno
    lastSaved,      // Timestamp del último guardado
    synced,         // true si está sincronizado con Firestore
    rehydrate       // Función para forzar rehidratación
  };
}

