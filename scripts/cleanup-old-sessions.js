/**
 * Script CLI para ejecutar limpieza de sesiones antiguas
 * 
 * IMPORTANTE: Este script debe ejecutarse desde el backend/Node.js
 * ya que usa Firebase Admin SDK (acceso total a Firestore)
 * 
 * Uso:
 * node scripts/cleanup-old-sessions.js [command] [options]
 * 
 * Comandos:
 * - stats           Ver estadísticas sin eliminar nada
 * - dry-run         Simular limpieza (muestra qué se eliminaría)
 * - cleanup         Ejecutar limpieza real
 * - cleanup-all     Limpieza global de todos los usuarios (admin)
 * 
 * Opciones:
 * --user=<userId>   Usuario específico (requerido para cleanup)
 * --days=<number>   Días sin acceso (default: 90)
 * 
 * Ejemplos:
 * node scripts/cleanup-old-sessions.js stats
 * node scripts/cleanup-old-sessions.js dry-run --user=abc123 --days=90
 * node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=90
 * node scripts/cleanup-old-sessions.js cleanup-all --days=180
 */

const admin = require('firebase-admin');

// ============================================
// CONFIGURACIÓN FIREBASE ADMIN
// ============================================

// Inicializar Firebase Admin (sin Service Account para testing local)
// En producción, usar Service Account JSON
if (!admin.apps.length) {
  try {
    // Opción 1: Con Service Account (producción)
    // const serviceAccount = require('../serviceAccountKey.json');
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount)
    // });
    
    // Opción 2: Usando variables de entorno (desarrollo)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'app-lectura'
    });
    
    console.log('✅ Firebase Admin SDK inicializado');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

// ============================================
// CONFIGURACIÓN
// ============================================

const CLEANUP_CONFIG = {
  DAYS_THRESHOLD: 90,
  MAX_BATCH_DELETE: 100,
  VERBOSE: true
};

// ============================================
// FUNCIONES DE LIMPIEZA (adaptadas para Admin SDK)
// ============================================

async function cleanupUserSessions(userId, dryRun = false, daysThreshold = CLEANUP_CONFIG.DAYS_THRESHOLD) {
  try {
    console.log(`\n🧹 [Cleanup] ${dryRun ? 'DRY RUN' : 'Iniciando limpieza'} para usuario: ${userId}`);
    
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
    
    console.log(`📅 [Cleanup] Fecha límite: ${thresholdDate.toLocaleDateString()} (${daysThreshold} días atrás)`);
    
    // Obtener todas las sesiones del usuario
    const sessionsRef = db.collection('users').doc(userId).collection('sessions');
    const snapshot = await sessionsRef.get();
    
    stats.total = snapshot.size;
    console.log(`📊 [Cleanup] Total sesiones encontradas: ${stats.total}`);
    
    // Filtrar sesiones antiguas
    const sessionsToDelete = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const lastAccess = data.lastAccess || data.lastModified || data.createdAt;
      
      // Convertir Timestamp a Date
      const lastAccessDate = lastAccess?.toDate ? lastAccess.toDate() : new Date(lastAccess);
      
      if (lastAccessDate < thresholdDate) {
        const daysSinceAccess = Math.floor((Date.now() - lastAccessDate.getTime()) / (1000 * 60 * 60 * 24));
        
        sessionsToDelete.push({
          id: docSnap.id,
          title: data.title || 'Sin título',
          lastAccess: lastAccessDate,
          daysSinceAccess,
          textInStorage: data.textInStorage || false,
          textSize: data.textMetadata?.sizeKB || 0
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
    console.log('\n📋 [Cleanup] Sesiones marcadas para eliminación:');
    toDelete.forEach((session, i) => {
      console.log(`  ${i + 1}. ${session.title}`);
      console.log(`     ID: ${session.id}`);
      console.log(`     Último acceso: ${session.lastAccess.toLocaleDateString()} (${session.daysSinceAccess} días)`);
      console.log(`     Tamaño: ${session.textSize} KB ${session.textInStorage ? '(en Storage)' : ''}`);
    });
    console.log('');
    
    // Si es dry run, solo retornar estadísticas
    if (dryRun) {
      console.log('🔍 [Cleanup] DRY RUN completado - No se eliminó nada');
      stats.sessions = toDelete;
      return stats;
    }
    
    // Eliminar sesiones
    console.log(`🗑️ [Cleanup] Eliminando ${toDelete.length} sesiones...`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const session of toDelete) {
      try {
        // Eliminar texto de Storage si existe
        if (session.textInStorage) {
          try {
            const bucket = admin.storage().bucket();
            const filePath = `users/${userId}/sessions/${session.id}/text.txt`;
            await bucket.file(filePath).delete();
            stats.bytesFreed += (session.textSize * 1024);
          } catch (storageError) {
            console.warn(`⚠️ [Cleanup] Error eliminando Storage para ${session.id}:`, storageError.message);
          }
        }
        
        // Agregar a batch
        const sessionRef = db.collection('users').doc(userId).collection('sessions').doc(session.id);
        batch.delete(sessionRef);
        batchCount++;
        
        // Commit cada 500 operaciones (límite de Firestore)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  ✅ Batch de ${batchCount} sesiones eliminado`);
          batchCount = 0;
        }
        
        stats.deleted++;
        
      } catch (error) {
        console.error(`  ❌ Error eliminando ${session.id}:`, error);
        stats.errors++;
      }
    }
    
    // Commit batch final
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Batch final de ${batchCount} sesiones eliminado`);
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

async function getSessionsStats(userId = null) {
  try {
    console.log('\n📊 [Stats] Calculando estadísticas de sesiones...');
    
    const stats = {
      total: 0,
      byAge: {
        recent: 0,
        medium: 0,
        old: 0,
        veryOld: 0
      },
      bySize: {
        small: 0,
        medium: 0,
        large: 0,
        veryLarge: 0
      },
      inStorage: 0,
      totalSizeKB: 0
    };
    
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    
    if (userId) {
      const sessionsRef = db.collection('users').doc(userId).collection('sessions');
      const snapshot = await sessionsRef.get();
      
      snapshot.forEach(doc => processSessionDoc(doc, stats, now, DAY_MS));
    } else {
      const usersRef = db.collection('users');
      const usersSnapshot = await usersRef.get();
      
      for (const userDoc of usersSnapshot.docs) {
        const sessionsRef = db.collection('users').doc(userDoc.id).collection('sessions');
        const snapshot = await sessionsRef.get();
        
        snapshot.forEach(doc => processSessionDoc(doc, stats, now, DAY_MS));
      }
    }
    
    console.log('\n✅ [Stats] Estadísticas calculadas:');
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

function processSessionDoc(doc, stats, now, DAY_MS) {
  const data = doc.data();
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
  
  if (data.textInStorage) {
    stats.inStorage++;
  }
}

async function cleanupAllUsersSessions(dryRun, daysThreshold) {
  console.log('\n🧹 [Cleanup Global] Iniciando limpieza masiva...');
  
  const globalStats = {
    usersProcessed: 0,
    totalSessions: 0,
    totalDeleted: 0,
    totalErrors: 0,
    bytesFreed: 0
  };
  
  const usersRef = db.collection('users');
  const usersSnapshot = await usersRef.get();
  
  console.log(`👥 [Cleanup Global] Usuarios encontrados: ${usersSnapshot.size}`);
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    
    try {
      const stats = await cleanupUserSessions(userId, dryRun, daysThreshold);
      
      globalStats.usersProcessed++;
      globalStats.totalSessions += stats.total;
      globalStats.totalDeleted += stats.deleted;
      globalStats.totalErrors += stats.errors;
      globalStats.bytesFreed += stats.bytesFreed;
      
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
}

// ============================================
// CLI PARSER
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🧹 Script de Limpieza de Sesiones Antiguas            ║
╚═══════════════════════════════════════════════════════════════╝

Uso: node scripts/cleanup-old-sessions.js [command] [options]

Comandos:
  stats           Ver estadísticas sin eliminar nada
  dry-run         Simular limpieza (muestra qué se eliminaría)
  cleanup         Ejecutar limpieza real
  cleanup-all     Limpieza global de todos los usuarios

Opciones:
  --user=<userId>   Usuario específico (requerido para cleanup/dry-run)
  --days=<number>   Días sin acceso (default: 90)

Ejemplos:
  node scripts/cleanup-old-sessions.js stats
  node scripts/cleanup-old-sessions.js stats --user=abc123
  node scripts/cleanup-old-sessions.js dry-run --user=abc123 --days=90
  node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=90
  node scripts/cleanup-old-sessions.js cleanup-all --days=180
    `);
    process.exit(0);
  }
  
  const command = args[0];
  
  // Parsear opciones
  const options = {
    user: null,
    days: 90
  };
  
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--user=')) {
      options.user = arg.split('=')[1];
    } else if (arg.startsWith('--days=')) {
      options.days = parseInt(arg.split('=')[1]);
    }
  });
  
  try {
    switch (command) {
      case 'stats':
        await getSessionsStats(options.user);
        break;
        
      case 'dry-run':
        if (!options.user) {
          console.error('❌ Error: --user=<userId> es requerido para dry-run');
          process.exit(1);
        }
        await cleanupUserSessions(options.user, true, options.days);
        break;
        
      case 'cleanup':
        if (!options.user) {
          console.error('❌ Error: --user=<userId> es requerido para cleanup');
          process.exit(1);
        }
        console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará sesiones permanentemente');
        console.log('⚠️  Presiona Ctrl+C para cancelar en los próximos 5 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await cleanupUserSessions(options.user, false, options.days);
        break;
        
      case 'cleanup-all':
        console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará sesiones de TODOS los usuarios');
        console.log('⚠️  Presiona Ctrl+C para cancelar en los próximos 10 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await cleanupAllUsersSessions(false, options.days);
        break;
        
      default:
        console.error(`❌ Comando desconocido: ${command}`);
        console.log('Comandos válidos: stats, dry-run, cleanup, cleanup-all');
        process.exit(1);
    }
    
    console.log('\n✅ Script completado exitosamente\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  }
}

// Ejecutar script
main();
