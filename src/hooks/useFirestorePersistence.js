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
import logger from '../utils/logger';

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
    debounceMs = 2000,
    backupMerge = true
  } = options;

  const { currentUser, isEstudiante } = useAuth();

  const backupTtlMs = (() => {
    try {
      const envDays = process?.env?.REACT_APP_FIRESTORE_BACKUP_TTL_DAYS;
      const fromEnv = envDays !== undefined && envDays !== null ? Number(envDays) : null;
      const fromStorageRaw = localStorage.getItem('FIRESTORE_BACKUP_TTL_DAYS');
      const fromStorage = fromStorageRaw !== undefined && fromStorageRaw !== null ? Number(fromStorageRaw) : null;
      const days = (Number.isFinite(fromEnv) && fromEnv > 0) ? fromEnv
        : (Number.isFinite(fromStorage) && fromStorage > 0) ? fromStorage
          : 7;
      return Math.round(days * 24 * 60 * 60 * 1000);
    } catch {
      return 7 * 24 * 60 * 60 * 1000;
    }
  })();

  const getBackupTimestampMs = (backup) => {
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
  };

  const stampBackupMeta = (backup) => {
    if (!backup || typeof backup !== 'object') return backup;
    return {
      ...backup,
      __firestoreBackupMeta: {
        ...(backup.__firestoreBackupMeta && typeof backup.__firestoreBackupMeta === 'object' ? backup.__firestoreBackupMeta : {}),
        updatedAt: Date.now(),
        version: 1
      }
    };
  };

  const isBackupExpired = (backup) => {
    const ts = getBackupTimestampMs(backup);
    // 🔧 C2 FIX: backups sin timestamp se consideran expirados para evitar datos zombie
    if (!ts) return true;
    return Date.now() - ts > backupTtlMs;
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [synced, setSynced] = useState(false);
  
  const dataRef = useRef(data);
  const saveTimeoutRef = useRef(null);
  const hasRehydratedRef = useRef(false);

  // Resetear estado de rehidratación al cambiar usuario o documento.
  // Esto es crítico para apps multi-lectura: cada textoId requiere rehidratación propia.
  useEffect(() => {
    hasRehydratedRef.current = false;
    setSynced(false);
    setError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [currentUser?.uid, textoId, enabled, isEstudiante]);

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
      logger.log('📥 [FirestorePersistence] Rehidratando desde Firestore...');
      setLoading(true);
      
      const savedData = await getStudentProgress(currentUser.uid, textoId);
      
      if (savedData && onRehydrate) {
        logger.log('✅ [FirestorePersistence] Datos encontrados, rehidratando...');
        onRehydrate(savedData);
        setSynced(true);
      } else {
        logger.log('ℹ️ [FirestorePersistence] No hay datos guardados (primera vez)');
      }
      
      hasRehydratedRef.current = true;
      
    } catch (err) {
      logger.error('❌ [FirestorePersistence] Error rehidratando:', err);
      setError(err.message);
      
      // Fallback a localStorage
      try {
        const localKey = `firestore_backup_${currentUser.uid}_${textoId}`;
        const localData = localStorage.getItem(localKey);
        if (localData && onRehydrate) {
          const parsed = JSON.parse(localData);
          if (parsed && typeof parsed === 'object') {
            if (isBackupExpired(parsed)) {
              try { localStorage.removeItem(localKey); } catch { /* ignore */ }
            } else {
              const stamped = getBackupTimestampMs(parsed) ? parsed : stampBackupMeta(parsed);
              if (stamped !== parsed) {
                try { localStorage.setItem(localKey, JSON.stringify(stamped)); } catch { /* ignore */ }
              }
              logger.log('📦 [FirestorePersistence] Rehidratando desde localStorage backup');
              onRehydrate(stamped);
            }
          }
        }
      } catch (localErr) {
        logger.error('❌ [FirestorePersistence] Error con localStorage backup:', localErr);
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
      logger.warn('⚠️ [FirestorePersistence] Guardado deshabilitado (no autenticado o no es estudiante)');
      return false;
    }
    
    try {
      logger.log('💾 [FirestorePersistence] Guardando en Firestore...');
      setError(null);
      
      await saveStudentProgress(currentUser.uid, textoId, payload);
      
      setLastSaved(new Date());
      setSynced(true);
      
      // Backup en localStorage
      try {
        const localKey = `firestore_backup_${currentUser.uid}_${textoId}`;
        if (!backupMerge || !payload || typeof payload !== 'object') {
          localStorage.setItem(localKey, JSON.stringify(stampBackupMeta(payload)));
        } else {
          let prev = null;
          try {
            const prevRaw = localStorage.getItem(localKey);
            prev = prevRaw ? JSON.parse(prevRaw) : null;
          } catch {
            prev = null;
          }

          const base = prev && typeof prev === 'object' ? prev : {};
          const next = { ...base, ...payload };

          if (payload.rubricProgress && typeof payload.rubricProgress === 'object') {
            next.rubricProgress = {
              ...(base.rubricProgress && typeof base.rubricProgress === 'object' ? base.rubricProgress : {}),
              ...payload.rubricProgress
            };
          }

          if (payload.activitiesProgress && typeof payload.activitiesProgress === 'object') {
            next.activitiesProgress = {
              ...(base.activitiesProgress && typeof base.activitiesProgress === 'object' ? base.activitiesProgress : {}),
              ...payload.activitiesProgress
            };
          }

          if (Object.prototype.hasOwnProperty.call(payload, 'savedCitations')) {
            next.savedCitations = payload.savedCitations;
          }

          localStorage.setItem(localKey, JSON.stringify(stampBackupMeta(next)));
        }
      } catch (localErr) {
        logger.warn('⚠️ [FirestorePersistence] No se pudo guardar backup local:', localErr);
      }
      
      logger.log('✅ [FirestorePersistence] Guardado exitoso');
      return true;
      
    } catch (err) {
      logger.error('❌ [FirestorePersistence] Error guardando:', err);
      setError(err.message);
      setSynced(false);
      return false;
    }
  }, [currentUser, textoId, enabled, isEstudiante]);

  // 🛡️ Flush al cambiar de textoId / usuario o desmontar:
  // si hay un autosave pendiente, lo ejecutamos inmediatamente para evitar perder cambios.
  // Nota: este efecto NO depende de `data`, así evitamos flush en cada cambio.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;

        if (autoSave && enabled && currentUser && textoId && isEstudiante && hasRehydratedRef.current) {
          try {
            // best-effort (no await en cleanup)
            save(dataRef.current);
          } catch {
            // ignore
          }
        }
      }
    };
  }, [currentUser?.uid, textoId, enabled, isEstudiante, autoSave, save]);

  /**
   * Guardado automático con debounce
   */
  useEffect(() => {
    if (!autoSave || !enabled || !currentUser || !textoId || !isEstudiante) return;
    
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
   * Listener en tiempo real (opcional)
   * Nota: la app mantiene UNA sola sesión activa por usuario; este listener es para reflejar cambios remotos
   * (p.ej., restauración/rehidratación o cambios desde otra pestaña) y no implica soporte multi-dispositivo.
   *
   * 🔧 M5 FIX: Ignora actualizaciones remotas mientras haya un autosave pendiente (saveTimeoutRef activo)
   * para evitar que el listener pise cambios locales aún no enviados.
   */
  useEffect(() => {
    if (!currentUser || !textoId || !enabled || !isEstudiante) return;
    
    logger.log('👂 [FirestorePersistence] Suscribiéndose a cambios en tiempo real...');
    
    const unsubscribe = subscribeToStudentProgress(
      currentUser.uid, 
      textoId, 
      (updatedData) => {
        // 🔧 M5 FIX: si hay un save pendiente, ignorar la actualización remota
        // para evitar pisar cambios locales en curso
        if (saveTimeoutRef.current) {
          logger.log('🛡️ [FirestorePersistence] Ignorando update remoto (save pendiente)');
          return;
        }
        if (updatedData && onRehydrate && hasRehydratedRef.current) {
          logger.log('🔄 [FirestorePersistence] Datos actualizados desde Firestore');
          onRehydrate(updatedData);
          setSynced(true);
        }
      }
    );
    
    return () => {
      logger.log('👂 [FirestorePersistence] Cancelando suscripción');
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

