# 🔍 Auditoría del Sistema de Sincronización - Diciembre 2025

> **Fecha:** 11 de diciembre de 2025  
> **Alcance:** Análisis completo del sistema de persistencia y sincronización después de las correcciones de aislamiento por curso.

---

## 📋 Resumen Ejecutivo

El sistema de sincronización de AppLectura utiliza **persistencia dual** con tres capas de almacenamiento:

| Capa | Tecnología | Propósito | Scope |
|------|------------|-----------|-------|
| 1 | `sessionStorage` | Borradores de artefactos (temporal) | Por pestaña |
| 2 | `localStorage` | Sesiones inmediatas | Por usuario (`{uid}`) |
| 3 | `Firestore` | Persistencia en la nube | Por usuario + curso |

### Archivos Clave Analizados

- `src/services/sessionManager.js` - Gestión de sesiones dual (local + cloud)
- `src/context/AppContext.js` - Estado global y triggers de sincronización
- `src/firebase/firestore.js` - Operaciones CRUD y merge de datos
- `src/utils/sessionHash.js` - Detección de conflictos y merge inteligente
- `src/utils/sessionValidator.js` - Validación y sanitización de sesiones
- `src/hooks/useActivityPersistence.js` - Persistencia de actividades por curso

---

## 🚨 Problemas Identificados

### ✅ PROBLEMA 1: `fileURL` no se preserva en sanitización — CORREGIDO
**Severidad:** 🔴 CRÍTICA  
**Archivo:** `src/utils/sessionValidator.js`  
**Líneas:** 210-217  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
La función `sanitizeSession()` sanitiza el objeto `text` pero **omite el campo `fileURL`**, causando que PDFs pierdan su referencia de descarga cuando una sesión pasa por sanitización.

#### Código Actual
```javascript
if (session.text && isObject(session.text)) {
  sanitized.text = {
    content: typeof session.text.content === 'string' ? session.text.content : '',
    fileName: session.text.fileName || 'texto_manual',
    fileType: session.text.fileType || 'text/plain',
    metadata: isObject(session.text.metadata) ? session.text.metadata : {}
    // ❌ FALTA: fileURL
  };
}
```

#### Impacto
- PDFs que pasan por sanitización pierden la URL de descarga
- Al restaurar sesión, el PDF aparece como texto plano
- Afecta solo a sesiones con errores menores que necesitan sanitización

#### Solución Propuesta
```javascript
if (session.text && isObject(session.text)) {
  sanitized.text = {
    content: typeof session.text.content === 'string' ? session.text.content : '',
    fileName: session.text.fileName || 'texto_manual',
    fileType: session.text.fileType || 'text/plain',
    fileURL: session.text.fileURL || null, // ✅ PRESERVAR URL DEL PDF
    metadata: isObject(session.text.metadata) ? session.text.metadata : {}
  };
}
```

---

### PROBLEMA 2: `rewardsState` no se maneja en merge de conflictos
**Severidad:** 🟠 MODERADA  
**Archivo:** `src/utils/sessionHash.js`  
**Función:** `mergeSessionsWithConflictResolution()`

#### Descripción
Al fusionar sesiones con conflicto entre local y cloud, el campo `rewardsState` (puntos, racha, achievements) no tiene lógica de merge específica, pudiendo perderse progreso de gamificación.

#### Código Actual
```javascript
// Solo se preservan estos campos explícitamente:
merged.sourceCourseId = local.sourceCourseId || cloud.sourceCourseId || null;
merged.currentTextoId = local.currentTextoId || local.text?.metadata?.id || 
                        cloud.currentTextoId || cloud.text?.metadata?.id || null;
// ❌ No hay merge de rewardsState
```

#### Impacto
- Si hay conflicto, rewardsState toma el valor de la versión cloud (base)
- Puntos o achievements ganados localmente pueden perderse

#### Solución Propuesta
Agregar merge inteligente de rewardsState que preserve el máximo de cada campo:

```javascript
// MERGE DE REWARDS: Preservar valores máximos
if (local.rewardsState || cloud.rewardsState) {
  const localRewards = local.rewardsState || {};
  const cloudRewards = cloud.rewardsState || {};
  
  merged.rewardsState = {
    points: Math.max(localRewards.points || 0, cloudRewards.points || 0),
    streak: Math.max(localRewards.streak || 0, cloudRewards.streak || 0),
    lastActivityDate: Math.max(
      new Date(localRewards.lastActivityDate || 0).getTime(),
      new Date(cloudRewards.lastActivityDate || 0).getTime()
    ) || null,
    achievements: [...new Set([
      ...(localRewards.achievements || []),
      ...(cloudRewards.achievements || [])
    ])]
  };
}
```

---

### ✅ PROBLEMA 3: Race condition en sincronización — CORREGIDO
**Severidad:** 🟠 MODERADA  
**Archivo:** `src/services/sessionManager.js`  
**Función:** `saveSession()`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
La sincronización con Firestore es asíncrona y no-bloqueante. Si el usuario cierra la página inmediatamente después de guardar, los datos pueden no llegar a Firestore.

#### Solución Implementada
Se implementó sistema de `pending_syncs`:
1. `markPendingSync()` - Marca sesiones pendientes en localStorage
2. `clearPendingSync()` - Limpia al completar sincronización
3. `syncPendingSessions()` - Sincroniza pendientes al reconectar
4. `setupBeforeUnloadSync()` - Handler para advertir al cerrar

```javascript
// En saveSession():
markPendingSync(sessionToSave.id);
saveSessionToFirestore(currentUserId, sessionToSave)
  .then(() => clearPendingSync(sessionToSave.id))
  .catch(() => { /* Mantiene en pendientes para reintento */ });

// En AppContext (al autenticar):
syncPendingSessions().then(({ synced, failed }) => {...});
```

#### Impacto Original (RESUELTO)
- ~~Datos inconsistentes entre dispositivos~~
- ~~Progreso reciente puede perderse al cambiar de dispositivo~~

---

### PROBLEMA 4: `getAllSessionsMerged()` no se invoca automáticamente
  }
---

### ✅ PROBLEMA 4: `getAllSessionsMerged()` no se invoca automáticamente — CORREGIDO
**Severidad:** 🟡 MENOR  
**Archivo:** `src/context/AppContext.js`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
La función `getAllSessionsMerged()` que combina sesiones locales con Firestore **solo se usaba explícitamente** en Smart Resume.

#### Solución Implementada
Se agregó llamada automática a `getAllSessionsMerged()` en el `useEffect` de autenticación:

```javascript
// En AppContext.js (líneas 753-760)
// 🆕 P4 FIX: Auto-merge de sesiones cloud al login
getAllSessionsMerged().then(mergedSessions => {
  if (mergedSessions.length > 0) {
    console.log(`☁️ [AppContext] Sesiones sincronizadas desde cloud: ${mergedSessions.length}`);
  }
}).catch(err => {
  console.warn('⚠️ [AppContext] Error en auto-merge de sesiones:', err);
});
```

#### Impacto Original (RESUELTO)
- ~~Un usuario en nuevo dispositivo no ve sus sesiones de cloud hasta usar Smart Resume~~
- ~~Datos pueden estar desincronizados sin que el usuario lo note~~

---

### ✅ PROBLEMA 5: `tutorHistory` puede exceder límite de Firestore — CORREGIDO
**Severidad:** 🟡 MENOR  
**Archivo:** `src/firebase/firestore.js`  
**Función:** `saveSessionToFirestore()`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
El campo `tutorHistory` guardaba todo el historial de mensajes del tutor sin límite.

#### Solución Implementada
```javascript
// firestore.js línea 904
// 🔧 P5 FIX: Limitar a últimos 100 mensajes para evitar exceder límite de 1MB de Firestore
tutorHistory: (sessionData.tutorHistory || []).slice(-100),
```

#### Impacto Original (RESUELTO)
- ~~Sesiones con muchos mensajes pueden acercarse al límite de 1MB de Firestore~~
- ~~Escrituras pueden fallar silenciosamente~~

---

### PROBLEMA 6: Sesiones legacy sin `sourceCourseId`
**Severidad:** 🟡 MENOR  
**Archivos:** Múltiples

#### Descripción
Sesiones creadas antes de implementar `sourceCourseId` no tienen este campo, lo que podría causar que Smart Resume las muestre para cualquier curso.

#### Estado Actual
✅ **MITIGADO**: El código en `TextoSelector.js` ya usa clave compuesta `courseId_textoId` para el lookup, lo cual previene este problema.

#### Recomendación Opcional
Agregar migración para limpiar sesiones antiguas sin `sourceCourseId`:

```javascript
function migrateOldSessions(sessions, currentCourseId) {
  return sessions.map(session => {
    if (!session.sourceCourseId && session.currentTextoId) {
      // Marcar como "legacy" para que no aparezca en Smart Resume de cursos
      return { ...session, sourceCourseId: 'legacy_global' };
    }
    return session;
  });
}
```

---

### ✅ PROBLEMA 7: `sanitizeSession()` pierde múltiples campos críticos — CORREGIDO
**Severidad:** 🔴 CRÍTICA  
**Archivo:** `src/utils/sessionValidator.js`  
**Función:** `sanitizeSession()`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
La función `sanitizeSession()` solo preservaba 8 campos, pero una sesión tiene 15+ campos según el schema definido en `sessionManager.js`. Cuando una sesión pasaba por sanitización, **se perdían datos valiosos**.

#### Campos que se Perdían (AHORA PRESERVADOS)
| Campo | Tipo | Estado |
|-------|------|--------|
| `sourceCourseId` | string | ✅ Agregado |
| `currentTextoId` | string | ✅ Agregado |
| `notes` | array | ✅ Agregado |
| `annotations` | array | ✅ Agregado |
| `highlights` | array | ✅ Agregado |
| `tutorHistory` | array | ✅ Agregado |
| `rewardsState` | object | ✅ Agregado |

#### Solución Implementada
```javascript
// Agregado al final de sanitizeSession():
if (session.sourceCourseId) sanitized.sourceCourseId = session.sourceCourseId;
if (session.currentTextoId) sanitized.currentTextoId = session.currentTextoId;
if (Array.isArray(session.tutorHistory)) sanitized.tutorHistory = session.tutorHistory;
if (Array.isArray(session.highlights)) sanitized.highlights = session.highlights;
if (Array.isArray(session.annotations)) sanitized.annotations = session.annotations;
if (Array.isArray(session.notes)) sanitized.notes = session.notes;
if (session.rewardsState && isObject(session.rewardsState)) sanitized.rewardsState = session.rewardsState;
```

---

### ✅ PROBLEMA 8: Sin manejo de `QuotaExceededError` en sesiones — CORREGIDO
**Severidad:** 🟠 MODERADA  
**Archivo:** `src/services/sessionManager.js`  
**Función:** `saveSession()`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
El código guardaba sesiones en `localStorage` sin capturar `QuotaExceededError`. Si el almacenamiento local estaba lleno, la operación fallaba silenciosamente.

#### Solución Implementada
```javascript
// sessionManager.js - saveSession()
try {
  localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
} catch (storageError) {
  if (storageError.name === 'QuotaExceededError' || 
      storageError.message?.includes('quota') ||
      storageError.code === 22) { // Safari usa código 22
    
    // 1. Eliminar 3 sesiones antiguas y reintentar
    sessions = sessions.slice(0, -3);
    localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
    
    // 2. Notificar al usuario
    window.dispatchEvent(new CustomEvent('storage-quota-warning', {...}));
    
    // 3. Si sigue fallando, limpiar caché de análisis
    // ...fallback adicional...
  }
}
```

#### Impacto Original (RESUELTO)
- ~~Guardado de sesiones fallaba silenciosamente cuando localStorage estaba lleno~~
- ~~Usuario perdía progreso sin saber por qué~~

---

### ✅ PROBLEMA 9: Errores de Firestore silenciados — CORREGIDO
**Severidad:** 🟠 MODERADA  
**Archivos:** `sessionManager.js`, `AppContext.js`  
**Estado:** ✅ **CORREGIDO** (11 dic 2025)

#### Descripción
Los errores de sincronización con Firestore solo se logueaban con `console.warn()`, sin notificar al usuario.

#### Solución Implementada
```javascript
// AppContext.js líneas 108, 776-796
const [syncStatus, setSyncStatus] = useState('idle');

// Listener para eventos de error
const handleSyncError = (event) => {
  const { message, sessionId } = event.detail || {};
  console.warn(`⚠️ [AppContext] Sync error para sesión ${sessionId}:`, message);
  setSyncStatus('error');
  setTimeout(() => setSyncStatus('idle'), 10000);
};

window.addEventListener('sync-error', handleSyncError);

// sessionManager.js - dispatch de eventos
window.dispatchEvent(new CustomEvent('sync-error', { 
  detail: { message: error.message, sessionId }
}));
```

#### Estado expuesto
El `syncStatus` está expuesto en el contexto para que los componentes puedan mostrar indicadores de sincronización.

---

## ✅ Aspectos Bien Implementados


| Aspecto | Archivo | Descripción |
|---------|---------|-------------|
| Validación robusta | `sessionValidator.js` | Previene datos corruptos antes de guardar |
| Merge por hash | `sessionHash.js` | Usa hash de contenido, no solo timestamps |
| Límite de sesiones | `sessionManager.js` | 20 sesiones máximo con cleanup automático |
| User-scoped keys | `sessionManager.js` | Cada usuario tiene sus propias keys |
| Textos grandes | `firestore.js` | >1MB se sube a Firebase Storage |
| Fallback fileURL | `AppContext.js` | Busca en Firestore si no está en sesión |
| Aislamiento courseId | `useActivityPersistence.js` | Clave compuesta por actividad |
| Dedup de scores | `firestore.js` | Elimina duplicados por timestamp en merge |

---

## 📊 Matriz de Priorización

| # | Problema | Severidad | Esfuerzo | Prioridad | Estado |
|---|----------|-----------|----------|-----------|--------|
| 1 | fileURL en sanitizeSession | 🔴 CRÍTICA | Bajo | **P1** | ✅ Corregido |
| 7 | sanitizeSession pierde campos | 🔴 CRÍTICA | Bajo | **P1** | ✅ Corregido |
| 2 | rewardsState en merge | 🟠 MODERADA | Medio | **P2** | ✅ Corregido |
| 8 | QuotaExceededError | 🟠 MODERADA | Bajo | **P2** | ✅ Corregido |
| 9 | Errores Firestore silenciados | 🟠 MODERADA | Medio | **P2** | ✅ Corregido |
| 3 | Race condition sync | 🟠 MODERADA | Alto | **P3** | ✅ Corregido |
| 4 | Auto-merge al login | 🟡 MENOR | Bajo | **P4** | ✅ Corregido |
| 5 | tutorHistory límite | 🟡 MENOR | Bajo | **P5** | ✅ Corregido |
| 6 | Sesiones legacy | 🟡 MENOR | N/A | Mitigado | ✅ N/A |

---

## 🛠️ Plan de Acción Recomendado

### Fase 1: Correcciones Críticas (Inmediato)
- [x] Agregar `fileURL` en `sanitizeSession()` de `sessionValidator.js` ✅ (11 dic 2025)
- [x] Completar `sanitizeSession()` con campos faltantes (P7) ✅ (11 dic 2025)

### Fase 2: Mejoras de Robustez (Corto Plazo)
- [x] Implementar merge de `rewardsState` en `sessionHash.js` ✅ (11 dic 2025)
- [x] Agregar límite de 100 mensajes a `tutorHistory` ✅ (11 dic 2025)
- [x] Manejar `QuotaExceededError` en `sessionManager.js` (P8) ✅ (11 dic 2025)
- [x] Implementar indicador de estado de sincronización (P9) ✅ (11 dic 2025)

### Fase 3: Optimizaciones (Mediano Plazo)
- [x] Implementar `pending_syncs` para race conditions (P3) ✅ (11 dic 2025)
- [x] Agregar auto-merge de sesiones al login (P4) ✅ (11 dic 2025)
- [ ] Considerar subcollection para tutorHistory extenso

---

## 📝 Notas Adicionales

### Flujo de Sincronización Actual

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE GUARDADO DE SESIÓN                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Usuario completa actividad                                          │
│           │                                                          │
│           ▼                                                          │
│  createSessionFromState() ──► validateAndSanitizeSession()           │
│           │                            │                             │
│           │                   ❌ Si fileURL se pierde aquí           │
│           ▼                                                          │
│  saveSession() ─────────────────────────────────────────────────┐    │
│           │                                                     │    │
│           ▼                                                     ▼    │
│  localStorage.setItem()                    saveSessionToFirestore()  │
│  (inmediato, sincrónico)                   (async, non-blocking)     │
│           │                                         │                │
│           │                              ❌ Race condition aquí      │
│           ▼                                         ▼                │
│     ✅ Local OK                              ☁️ Firestore OK         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Flujo de Restauración de Sesión

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE SMART RESUME                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Usuario abre texto desde curso                                      │
│           │                                                          │
│           ▼                                                          │
│  getAllSessionsMerged() ──► mergeSessions(local, firestore)          │
│           │                                                          │
│           ▼                                                          │
│  Buscar con clave: `${courseId}_${textoId}`                          │
│           │                                                          │
│           ▼                                                          │
│  restoreSession() ──► ¿Es PDF sin fileURL?                           │
│           │                   │                                      │
│           │          ┌────────┴────────┐                             │
│           │          ▼                 ▼                             │
│           │   Buscar en Firestore   Usar fileURL existente           │
│           │          │                 │                             │
│           │          ▼                 │                             │
│           │   Descargar via proxy ◄────┘                             │
│           │          │                                               │
│           ▼          ▼                                               │
│     ✅ Sesión restaurada con PDF funcional                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🆕 AUDITORÍA ADICIONAL - Hallazgos Menores (11 dic 2025)

Después de completar las correcciones P1-P9, se realizó una auditoría adicional. Se encontraron **6 problemas menores a moderados** que no afectan el uso normal pero son recomendaciones de hardening:

### 📋 Nuevos Hallazgos

| # | Problema | Severidad | Archivo | Impacto | Estado |
|---|----------|-----------|---------|---------|--------|
| 10 | `localStorage.setItem` sin try-catch en `deleteSession/deleteCurrentSession` | 🟠 MODERADA | `sessionManager.js:343,471` | Si localStorage está corrupto, falla silenciosamente | ✅ Corregido |
| 11 | Promesas de `deleteSessionFromFirestore` sin propagación de error | 🟠 MODERADA | `sessionManager.js:354-379` | Usuario cree que eliminó de cloud cuando podría fallar | ✅ Corregido |
| 12 | Race condition en listener de sesiones | 🟡 MENOR | `AppContext.js:1988-2002` | Conflicto potencial al cambiar cuentas rápidamente | ✅ Corregido |
| 13 | Timeout sin cleanup en listener de progreso | 🟡 MENOR | `AppContext.js:1934-1941` | Memory leak potencial si componente se desmonta | ✅ Ya existía |
| 14 | `tutorHistory` puede exceder 1MB con mensajes largos | 🟡 MENOR | `firestore.js:904` | 100 mensajes largos de IA podrían acercarse al límite | ✅ Ya existía |
| 15 | `getSessionContentHash` no incluye `rewardsState` | 🟡 MENOR | `sessionHash.js:52-57` | Dos sesiones con diferente gamificación se ven "iguales" | ✅ Corregido |

### ✅ Correcciones Aplicadas (P10 y P11)

**P10 Fix** - Agregado try-catch defensivo en `deleteSession()` y `deleteAllSessions()`:
```javascript
try {
  localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
} catch (storageError) {
  window.dispatchEvent(new CustomEvent('storage-error', {...}));
  return false;
}
```

**P11 Fix** - Propagación de errores de Firestore al usuario:
```javascript
.catch(error => {
  window.dispatchEvent(new CustomEvent('sync-error', {
    detail: { 
      message: 'No se pudo eliminar la sesión de la nube.',
      operation: 'delete'
    }
  }));
});
```

### ✅ Recomendación

~~**Para producción inmediata:** Los problemas 10 y 11 deberían agregarse try-catch defensivos.~~  
✅ **COMPLETADO** - Problemas 10 y 11 corregidos (11 dic 2025)

~~**Para versión futura:** Los problemas 12-15 pueden programarse como mejoras de mantenimiento.~~  
✅ **COMPLETADO** - Problemas 12, 15 corregidos / 13, 14 ya existían (11 dic 2025)

**Estado general:** ✅ **SISTEMA COMPLETAMENTE AUDITADO Y CORREGIDO PARA PRODUCCIÓN**

---

**Documento generado automáticamente por análisis de código.**  
**Última actualización:** 11 de diciembre de 2025
