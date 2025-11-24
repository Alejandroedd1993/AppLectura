/**
 * Utilidades para limpieza automática de sesiones antiguas
 * 
 * Uso:
 * - Manual: Ejecutar cleanupOldSessions() desde consola
 * - Automático: Llamar desde Cloud Function programada (cron)
 * - Testing: cleanupOldSessions(userId, dryRun=true) para ver qué se eliminaría
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  doc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { deleteTextFromStorage } from '../firebase/firestore';

// ============================================
// CONFIGURACIÓN
// ============================================

const CLEANUP_CONFIG = {
  // Días sin acceso para considerar sesión "antigua"
  DAYS_THRESHOLD: 90,
  
  // Máximo de sesiones a eliminar por ejecución (seguridad)
  MAX_BATCH_DELETE: 100,
  
  // Eliminar sesiones huérfanas (usuarios que ya no existen)
  DELETE_ORPHANED: true,
  
  // Log detallado
  VERBOSE: true
};

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Elimina sesiones antiguas de un usuario específico
 * @param {string} userId - UID del usuario
 * @param {boolean} dryRun - Si true, solo lista sin eliminar (testing)
 * @param {number} daysThreshold - Días sin acceso para considerar antigua
 * @returns {Promise<object>} - Estadísticas de limpieza
 */
export async function cleanupUserSessions(userId, dryRun = false, daysThreshold = CLEANUP_CONFIG.DAYS_THRESHOLD) {
  try {
    console.log(`🧹 [Cleanup] ${dryRun ? 'DRY RUN' : 'Iniciando limpieza'} para usuario: ${userId}`);
    
    const stats = {
      total: 0,
      old: 0,
      deleted: 0,
      errors: 0,
      bytesFreed: 0,
      sessions: []
    };
    
    // Calcular fecha límite
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    const thresholdTimestamp = Timestamp.fromDate(thresholdDate);
    
    console.log(`📅 [Cleanup] Fecha límite: ${thresholdDate.toLocaleDateString()} (${daysThreshold} días atrás)`);
    
    // Obtener todas las sesiones del usuario
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const snapshot = await getDocs(sessionsRef);
    
    stats.total = snapshot.size;
    console.log(`📊 [Cleanup] Total sesiones encontradas: ${stats.total}`);
    
    // Filtrar sesiones antiguas
    const sessionsToDelete = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const lastAccess = data.lastAccess || data.lastModified || data.createdAt;
      
      // Convertir a Date si es Timestamp
      const lastAccessDate = lastAccess?.toDate ? lastAccess.toDate() : new Date(lastAccess);
      
      if (lastAccessDate < thresholdDate) {
        const daysSinceAccess = Math.floor((Date.now() - lastAccessDate.getTime()) / (1000 * 60 * 60 * 24));
        
        sessionsToDelete.push({
          id: docSnap.id,
          title: data.title || 'Sin título',
          lastAccess: lastAccessDate,
          daysSinceAccess,
          textInStorage: data.textInStorage || false,
          textSize: data.textMetadata?.sizeKB || 0,
          data
        });
      }
    });
    
    stats.old = sessionsToDelete.length;
    
    console.log(`🔍 [Cleanup] Sesiones antiguas (>${daysThreshold} días): ${stats.old}`);
    
    if (stats.old === 0) {
      console.log('✅ [Cleanup] No hay sesiones antiguas para eliminar');
      return stats;
    }
    
    // Limitar por seguridad
    const toDelete = sessionsToDelete.slice(0, CLEANUP_CONFIG.MAX_BATCH_DELETE);
    
    if (toDelete.length < sessionsToDelete.length) {
      console.warn(`⚠️ [Cleanup] Limitando a ${CLEANUP_CONFIG.MAX_BATCH_DELETE} sesiones por seguridad`);
    }
    
    // Mostrar sesiones a eliminar
    if (CLEANUP_CONFIG.VERBOSE || dryRun) {
      console.log('\n📋 [Cleanup] Sesiones marcadas para eliminación:');
      toDelete.forEach((session, i) => {
        console.log(`  ${i + 1}. ${session.title}`);
        console.log(`     ID: ${session.id}`);
        console.log(`     Último acceso: ${session.lastAccess.toLocaleDateString()} (${session.daysSinceAccess} días)`);
        console.log(`     Tamaño: ${session.textSize} KB ${session.textInStorage ? '(en Storage)' : ''}`);
      });
      console.log('');
    }
    
    // Si es dry run, solo retornar estadísticas
    if (dryRun) {
      console.log('🔍 [Cleanup] DRY RUN completado - No se eliminó nada');
      stats.sessions = toDelete;
      return stats;
    }
    
    // Eliminar sesiones en batch
    console.log(`🗑️ [Cleanup] Eliminando ${toDelete.length} sesiones...`);
    
    for (const session of toDelete) {
      try {
        // Eliminar texto de Storage si existe
        if (session.textInStorage) {
          try {
            await deleteTextFromStorage(userId, session.id);
            stats.bytesFreed += (session.textSize * 1024); // KB a bytes
          } catch (storageError) {
            console.warn(`⚠️ [Cleanup] Error eliminando Storage para ${session.id}:`, storageError.message);
          }
        }
        
        // Eliminar documento de Firestore
        const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
        await deleteDoc(sessionRef);
        
        stats.deleted++;
        
        if (CLEANUP_CONFIG.VERBOSE) {
          console.log(`  ✅ Eliminada: ${session.title} (${session.id})`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error eliminando ${session.id}:`, error);
        stats.errors++;
      }
    }
    
    console.log('\n✅ [Cleanup] Limpieza completada');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Total sesiones: ${stats.total}`);
    console.log(`   - Antiguas encontradas: ${stats.old}`);
    console.log(`   - Eliminadas: ${stats.deleted}`);
    console.log(`   - Errores: ${stats.errors}`);
    console.log(`   - Espacio liberado: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ [Cleanup] Error en limpieza de sesiones:', error);
    throw error;
  }
}

/**
 * Elimina sesiones antiguas de TODOS los usuarios (admin only)
 * @param {boolean} dryRun - Si true, solo lista sin eliminar
 * @param {number} daysThreshold - Días sin acceso
 * @returns {Promise<object>} - Estadísticas globales
 */
export async function cleanupAllUsersSessions(dryRun = false, daysThreshold = CLEANUP_CONFIG.DAYS_THRESHOLD) {
  try {
    console.log('🧹 [Cleanup Global] Iniciando limpieza masiva...');
    
    const globalStats = {
      usersProcessed: 0,
      totalSessions: 0,
      totalDeleted: 0,
      totalErrors: 0,
      bytesFreed: 0,
      userStats: []
    };
    
    // Obtener todos los usuarios
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`👥 [Cleanup Global] Usuarios encontrados: ${usersSnapshot.size}`);
    
    // Procesar cada usuario
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        console.log(`\n🔄 [Cleanup Global] Procesando usuario: ${userId}`);
        
        const stats = await cleanupUserSessions(userId, dryRun, daysThreshold);
        
        globalStats.usersProcessed++;
        globalStats.totalSessions += stats.total;
        globalStats.totalDeleted += stats.deleted;
        globalStats.totalErrors += stats.errors;
        globalStats.bytesFreed += stats.bytesFreed;
        
        if (stats.deleted > 0 || stats.old > 0) {
          globalStats.userStats.push({
            userId,
            userName: userDoc.data()?.nombre || 'Usuario',
            ...stats
          });
        }
        
      } catch (error) {
        console.error(`❌ [Cleanup Global] Error procesando usuario ${userId}:`, error);
        globalStats.totalErrors++;
      }
    }
    
    console.log('\n✅ [Cleanup Global] Limpieza masiva completada');
    console.log('📊 Estadísticas Globales:');
    console.log(`   - Usuarios procesados: ${globalStats.usersProcessed}`);
    console.log(`   - Total sesiones: ${globalStats.totalSessions}`);
    console.log(`   - Eliminadas: ${globalStats.totalDeleted}`);
    console.log(`   - Errores: ${globalStats.totalErrors}`);
    console.log(`   - Espacio liberado: ${(globalStats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
    
    return globalStats;
    
  } catch (error) {
    console.error('❌ [Cleanup Global] Error en limpieza masiva:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de sesiones sin eliminar nada
 * @param {string} userId - UID del usuario (opcional, si no se pasa analiza todos)
 * @returns {Promise<object>} - Estadísticas detalladas
 */
export async function getSessionsStats(userId = null) {
  try {
    console.log('📊 [Stats] Calculando estadísticas de sesiones...');
    
    const stats = {
      total: 0,
      byAge: {
        recent: 0,      // < 30 días
        medium: 0,      // 30-90 días
        old: 0,         // 90-180 días
        veryOld: 0      // > 180 días
      },
      bySize: {
        small: 0,       // < 100KB
        medium: 0,      // 100KB - 500KB
        large: 0,       // 500KB - 1MB
        veryLarge: 0    // > 1MB
      },
      inStorage: 0,
      totalSizeKB: 0,
      oldestSession: null,
      newestSession: null
    };
    
    // Si se especifica userId, analizar solo ese usuario
    if (userId) {
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      const snapshot = await getDocs(sessionsRef);
      
      processSessionsSnapshot(snapshot, stats);
      
    } else {
      // Analizar todos los usuarios
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const sessionsRef = collection(db, 'users', userDoc.id, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        
        processSessionsSnapshot(snapshot, stats);
      }
    }
    
    console.log('✅ [Stats] Estadísticas calculadas:');
    console.log(`   Total sesiones: ${stats.total}`);
    console.log(`   Por antigüedad:`);
    console.log(`     - Recientes (<30d): ${stats.byAge.recent}`);
    console.log(`     - Medias (30-90d): ${stats.byAge.medium}`);
    console.log(`     - Antiguas (90-180d): ${stats.byAge.old}`);
    console.log(`     - Muy antiguas (>180d): ${stats.byAge.veryOld}`);
    console.log(`   Por tamaño:`);
    console.log(`     - Pequeñas (<100KB): ${stats.bySize.small}`);
    console.log(`     - Medianas (100-500KB): ${stats.bySize.medium}`);
    console.log(`     - Grandes (500KB-1MB): ${stats.bySize.large}`);
    console.log(`     - Muy grandes (>1MB): ${stats.bySize.veryLarge}`);
    console.log(`   En Storage: ${stats.inStorage}`);
    console.log(`   Tamaño total: ${(stats.totalSizeKB / 1024).toFixed(2)} MB`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ [Stats] Error calculando estadísticas:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES HELPER
// ============================================

function processSessionsSnapshot(snapshot, stats) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    stats.total++;
    
    // Calcular antigüedad
    const lastAccess = data.lastAccess || data.lastModified || data.createdAt;
    const lastAccessDate = lastAccess?.toDate ? lastAccess.toDate() : new Date(lastAccess);
    const daysSinceAccess = Math.floor((now - lastAccessDate.getTime()) / DAY_MS);
    
    if (daysSinceAccess < 30) {
      stats.byAge.recent++;
    } else if (daysSinceAccess < 90) {
      stats.byAge.medium++;
    } else if (daysSinceAccess < 180) {
      stats.byAge.old++;
    } else {
      stats.byAge.veryOld++;
    }
    
    // Calcular tamaño
    const sizeKB = data.textMetadata?.sizeKB || 0;
    stats.totalSizeKB += sizeKB;
    
    if (sizeKB < 100) {
      stats.bySize.small++;
    } else if (sizeKB < 500) {
      stats.bySize.medium++;
    } else if (sizeKB < 1000) {
      stats.bySize.large++;
    } else {
      stats.bySize.veryLarge++;
    }
    
    // Contar sesiones en Storage
    if (data.textInStorage) {
      stats.inStorage++;
    }
    
    // Rastrear sesión más antigua/nueva
    if (!stats.oldestSession || lastAccessDate < stats.oldestSession.date) {
      stats.oldestSession = {
        id: docSnap.id,
        title: data.title || 'Sin título',
        date: lastAccessDate,
        daysSinceAccess
      };
    }
    
    if (!stats.newestSession || lastAccessDate > stats.newestSession.date) {
      stats.newestSession = {
        id: docSnap.id,
        title: data.title || 'Sin título',
        date: lastAccessDate,
        daysSinceAccess
      };
    }
  });
}

// ============================================
// EJEMPLO DE USO
// ============================================

/**
 * Ejemplo de cómo usar las funciones de limpieza
 * 
 * // Ver estadísticas sin eliminar nada
 * const stats = await getSessionsStats('user123');
 * 
 * // Dry run: ver qué se eliminaría
 * const dryRun = await cleanupUserSessions('user123', true, 90);
 * 
 * // Eliminar sesiones antiguas (90 días)
 * const result = await cleanupUserSessions('user123', false, 90);
 * 
 * // Limpieza global (solo admins)
 * const globalResult = await cleanupAllUsersSessions(false, 90);
 */

export default {
  cleanupUserSessions,
  cleanupAllUsersSessions,
  getSessionsStats,
  CLEANUP_CONFIG
};
