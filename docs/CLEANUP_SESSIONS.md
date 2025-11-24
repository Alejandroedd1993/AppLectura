# 🧹 Sistema de Limpieza de Sesiones Antiguas

Sistema completo para gestionar y eliminar sesiones antiguas de Firebase Firestore + Storage.

## 📋 Índice

- [Descripción](#descripción)
- [Componentes](#componentes)
- [Uso](#uso)
- [Configuración](#configuración)
- [Seguridad](#seguridad)
- [Migración a Cloud Functions](#migración-a-cloud-functions)

---

## 🎯 Descripción

Este sistema permite:

- ✅ **Ver estadísticas** de sesiones (antigüedad, tamaño, ubicación)
- ✅ **Simular limpieza** (dry-run) sin eliminar nada
- ✅ **Eliminar sesiones antiguas** de un usuario específico
- ✅ **Limpieza masiva** de todos los usuarios (admin)
- ✅ **Eliminar automáticamente** textos grandes de Firebase Storage

### Criterios de Limpieza

Por defecto, se consideran **sesiones antiguas**:

- Sin acceso durante **90+ días**
- Configurable por comando (30, 60, 90, 180 días, etc.)

---

## 📦 Componentes

### 1. **Frontend Utility** (`src/utils/cleanupSessions.js`)

Para usar desde **navegador/React** (requiere autenticación de usuario):

```javascript
import { cleanupUserSessions, getSessionsStats } from '../utils/cleanupSessions';

// Ver estadísticas
const stats = await getSessionsStats(userId);

// Dry run
const dryRun = await cleanupUserSessions(userId, true, 90);

// Limpieza real
const result = await cleanupUserSessions(userId, false, 90);
```

**Limitaciones:**
- Solo puede eliminar sesiones del usuario autenticado
- Requiere reglas de Firestore permisivas
- No puede acceder a otros usuarios

### 2. **Backend Script** (`scripts/cleanup-old-sessions.js`)

Para usar desde **Node.js/CLI** con **Firebase Admin SDK** (acceso total):

```bash
# Ver estadísticas globales
node scripts/cleanup-old-sessions.js stats

# Ver estadísticas de un usuario
node scripts/cleanup-old-sessions.js stats --user=abc123

# Dry run (simulación)
node scripts/cleanup-old-sessions.js dry-run --user=abc123 --days=90

# Limpieza real de un usuario
node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=90

# Limpieza masiva de todos los usuarios
node scripts/cleanup-old-sessions.js cleanup-all --days=180
```

**Ventajas:**
- Acceso total a Firestore (admin)
- Puede procesar múltiples usuarios
- Operaciones en batch (más eficiente)
- Ideal para cron jobs

---

## ⚙️ Configuración

### 1. **Instalar Firebase Admin SDK** (solo para script backend)

```bash
npm install firebase-admin
```

### 2. **Configurar Credenciales**

#### Opción A: Service Account (Producción)

1. Ve a Firebase Console > Project Settings > Service Accounts
2. Descarga el archivo JSON de credenciales
3. Guárdalo como `serviceAccountKey.json` en la raíz del proyecto
4. **IMPORTANTE**: Agregar al `.gitignore`:

```gitignore
# Firebase
serviceAccountKey.json
```

5. Modificar `scripts/cleanup-old-sessions.js` línea 36:

```javascript
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'YOUR_PROJECT.appspot.com' // Reemplazar con tu bucket
});
```

#### Opción B: Variables de Entorno (Desarrollo)

```bash
# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"

# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="path\to\serviceAccountKey.json"
```

### 3. **Ajustar Configuración**

En ambos archivos, modificar `CLEANUP_CONFIG`:

```javascript
const CLEANUP_CONFIG = {
  DAYS_THRESHOLD: 90,        // Días sin acceso para considerar "antigua"
  MAX_BATCH_DELETE: 100,     // Máximo por ejecución (seguridad)
  DELETE_ORPHANED: true,     // Eliminar sesiones huérfanas
  VERBOSE: true              // Logs detallados
};
```

---

## 🔒 Seguridad

### Reglas de Firestore

Asegúrate de que tus reglas permitan la eliminación:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sessions/{sessionId} {
      // Usuario puede eliminar sus propias sesiones
      allow delete: if request.auth != null && request.auth.uid == userId;
      
      // Admin puede eliminar cualquier sesión (verificar claim 'admin')
      allow delete: if request.auth.token.admin == true;
    }
  }
}
```

### Reglas de Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/sessions/{sessionId}/text.txt {
      // Usuario puede eliminar sus propios textos
      allow delete: if request.auth != null && request.auth.uid == userId;
      
      // Admin puede eliminar cualquier texto
      allow delete: if request.auth.token.admin == true;
    }
  }
}
```

### Protección contra Errores

- **Límite de batch**: Máximo 100 sesiones por ejecución
- **Confirmación**: 5-10 segundos de espera antes de eliminar
- **Dry-run**: Siempre probar primero sin eliminar
- **Logs detallados**: Todas las operaciones se registran

---

## 📊 Ejemplos de Uso

### Caso 1: Ver estadísticas antes de limpiar

```bash
# Estadísticas globales
node scripts/cleanup-old-sessions.js stats

# Estadísticas de un usuario
node scripts/cleanup-old-sessions.js stats --user=abc123
```

**Salida esperada:**
```
📊 [Stats] Estadísticas calculadas:
   Total sesiones: 150
   Por antigüedad:
     - Recientes (<30d): 45
     - Medias (30-90d): 60
     - Antiguas (90-180d): 30
     - Muy antiguas (>180d): 15
   Por tamaño:
     - Pequeñas (<100KB): 100
     - Medianas (100-500KB): 35
     - Grandes (500KB-1MB): 10
     - Muy grandes (>1MB): 5
   En Storage: 5
   Tamaño total: 125.50 MB
```

### Caso 2: Simulación de limpieza (Dry Run)

```bash
node scripts/cleanup-old-sessions.js dry-run --user=abc123 --days=90
```

**Salida esperada:**
```
🧹 [Cleanup] DRY RUN para usuario: abc123
📅 [Cleanup] Fecha límite: 24/08/2025 (90 días atrás)
📊 [Cleanup] Total sesiones encontradas: 50
🔍 [Cleanup] Sesiones antiguas (>90 días): 15

📋 [Cleanup] Sesiones marcadas para eliminación:
  1. La Metamorfosis - Análisis Completo
     ID: sess_20250501_abc
     Último acceso: 01/05/2025 (175 días)
     Tamaño: 1200 KB (en Storage)
     
  2. Don Quijote - Capítulo 1
     ID: sess_20250615_xyz
     Último acceso: 15/06/2025 (130 días)
     Tamaño: 450 KB

🔍 [Cleanup] DRY RUN completado - No se eliminó nada
```

### Caso 3: Limpieza real de un usuario

```bash
node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=90
```

**Proceso:**
1. Muestra advertencia con 5 segundos para cancelar
2. Lista sesiones a eliminar
3. Elimina textos de Storage (si aplica)
4. Elimina documentos de Firestore
5. Muestra estadísticas finales

### Caso 4: Limpieza masiva (todos los usuarios)

```bash
# CUIDADO: Solo para admins
node scripts/cleanup-old-sessions.js cleanup-all --days=180
```

**Advertencias:**
- 10 segundos para cancelar
- Procesa todos los usuarios
- Puede tardar varios minutos
- Solo usar en producción con supervisión

---

## 🚀 Migración a Cloud Functions (Automatización)

Para ejecutar automáticamente cada mes, migrar a **Firebase Cloud Functions**:

### 1. Crear Cloud Function

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Ejecutar automáticamente el primer día de cada mes a las 2:00 AM
exports.cleanupOldSessionsScheduled = functions.pubsub
  .schedule('0 2 1 * *') // Cron: 2:00 AM, día 1 de cada mes
  .timeZone('America/Santiago') // Ajustar timezone
  .onRun(async (context) => {
    console.log('🧹 Iniciando limpieza programada de sesiones...');
    
    const db = admin.firestore();
    const DAYS_THRESHOLD = 90;
    
    // Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    
    let totalDeleted = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const sessionsRef = db.collection('users').doc(userId).collection('sessions');
      
      // Calcular fecha límite
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - DAYS_THRESHOLD);
      
      // Obtener sesiones antiguas
      const oldSessions = await sessionsRef
        .where('lastAccess', '<', thresholdDate)
        .get();
      
      // Eliminar en batch
      const batch = db.batch();
      
      oldSessions.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      
      await batch.commit();
    }
    
    console.log(`✅ Limpieza completada: ${totalDeleted} sesiones eliminadas`);
    
    return null;
  });
```

### 2. Desplegar Cloud Function

```bash
cd functions
npm install firebase-functions firebase-admin
firebase deploy --only functions:cleanupOldSessionsScheduled
```

### 3. Monitoreo

- Firebase Console > Functions > Logs
- Ver ejecuciones programadas
- Alertas por email si hay errores

---

## 📈 Costos

### Operación Manual (Script CLI)

- **Firestore**: Lecturas + Eliminaciones
  - 100 sesiones = 100 lecturas + 100 eliminaciones = 200 operaciones
  - Free tier: 50K lecturas + 20K escrituras/día → **GRATIS hasta 250 sesiones/día**

- **Storage**: Eliminaciones
  - Gratis (no se cobra por operaciones DELETE)

### Operación Automática (Cloud Functions)

- **Cloud Functions**: Tiempo de ejecución
  - 1 ejecución/mes × 2 minutos = **GRATIS** (2M invocaciones/mes gratis)

- **Total mensual**: **$0.00** (dentro de Free Tier)

---

## ❓ FAQ

### ¿Puedo recuperar sesiones eliminadas?

No, la eliminación es permanente. Por eso se recomienda:
1. Siempre hacer **dry-run** primero
2. Revisar logs antes de confirmar
3. Considerar backup manual antes de limpiezas masivas

### ¿Qué pasa si un usuario abre una sesión "antigua"?

El sistema actualiza `lastAccess` automáticamente, por lo que:
- Si el usuario abre la sesión antes de la limpieza → no se elimina
- El campo `lastAccess` se actualiza en cada apertura

### ¿Se pueden ajustar los días de antigüedad?

Sí, usar el parámetro `--days`:

```bash
# 30 días
node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=30

# 180 días
node scripts/cleanup-old-sessions.js cleanup --user=abc123 --days=180
```

### ¿Funciona con textos en Storage?

Sí, automáticamente detecta `textInStorage: true` y elimina:
1. Archivo de Storage (`users/{userId}/sessions/{sessionId}/text.txt`)
2. Documento de Firestore

---

## 📝 Notas Finales

- **Prioridad BAJA**: Esta funcionalidad es opcional, el sistema funciona sin ella
- **Testing**: Siempre probar con `dry-run` antes de ejecutar
- **Monitoreo**: Revisar logs después de cada limpieza
- **Escalabilidad**: Migrar a Cloud Functions cuando superes 100 usuarios activos

---

**Documentación creada:** 23 de noviembre de 2025  
**Versión:** 1.0.0  
**Mantenimiento:** Ejecutar limpieza cada 3-6 meses según crecimiento de usuarios
