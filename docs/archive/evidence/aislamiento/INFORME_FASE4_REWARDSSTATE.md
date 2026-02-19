# Informe Fase 4: rewardsState Único

## Estado: ✅ Completado (Hardened)

## Problema Resuelto

`rewardsState` (gamificación: puntos, rachas, achievements) estaba duplicado en múltiples ubicaciones, causando conflictos potenciales:

```
ANTES (Conflicto):
Sesión A guardada → rewardsState (puntos: 100)
Usuario gana 50 puntos → global_progress (puntos: 150)
Restaurar Sesión A → SOBRESCRIBE puntos a 100 ❌
```

## Solución Implementada

### Principio: "Gamificación es global, no por lectura"

| Archivo | Cambio |
|---------|--------|
| `AppContext.js` | ✅ Removido de `createSession` (línea ~1134) |
| `AppContext.js` | ✅ Removido de `updateCurrentSessionFromState` (línea ~1212) |
| `AppContext.js` | ✅ NO restaura desde sesión en `restoreSession` (línea ~1323) |
| `firestore.js` | ✅ NO guarda en `saveSessionToFirestore` (línea ~1025) |
| `firestore.js` | ✅ Blindaje: `saveStudentProgress` ignora `rewardsState` si `textoId !== global_progress` |
| `sessionValidator.js` | ✅ Ignora `session.rewardsState` (legacy) al sanitizar |
| `sessionHash.js` | ✅ No incluye rewards en hash/merge de sesiones |
| `sessionManager.js` | ✅ Ya no trata rewards como parte de sesión (log) |

### Flujo Corregido

```
AHORA (Sin Conflicto):
Sesión A guardada → SIN rewardsState
Usuario gana 50 puntos → global_progress (puntos: 150)
Restaurar Sesión A → Puntos intactos en global_progress ✅
```

## Código Modificado

### AppContext.js - createSession
```diff
-        rewardsState: window.__rewardsEngine ? window.__rewardsEngine.exportState() : null
+        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
+        // Se sincroniza solo en global_progress
```

### AppContext.js - updateCurrentSessionFromState
```diff
-        rewardsState: window.__rewardsEngine ? window.__rewardsEngine.exportState() : null
+        // 🆕 FASE 4 FIX: rewardsState NO se guarda por sesión
```

### AppContext.js - restoreSession
```diff
-        if (session.rewardsState && window.__rewardsEngine) {
-          window.__rewardsEngine.importState(session.rewardsState, false);
-        }
+        // 🆕 FASE 4 FIX: rewardsState NO se restaura desde sesiones individuales
+        if (session.rewardsState) {
+          console.log('ℹ️ [AppContext] Ignorando rewardsState de sesión (se usa global_progress)');
+        }
```

### firestore.js - saveSessionToFirestore
```diff
-      rewardsState: sessionData.rewardsState || null,
+      // 🆕 FASE 4 FIX: rewardsState NO se guarda en sesiones individuales
```

## Sin Cambios (Ya Correctos)

- `saveGlobalProgress()` - Rutas rewardsState a `global_progress` ✅
- Listener de `global_progress` (líneas ~2457-2565) - Carga y sincroniza correctamente ✅

## Ajuste Crítico: Timestamps Consistentes

Se detectó un riesgo de inconsistencias por discrepancia de timestamp (datos legacy / solapamientos de estado entre local y cloud):

- El listener/merge en UI priorizaba `lastInteraction`.
- Parte del merge en Firestore y/o estados legacy usaban `lastUpdate`.

**Corrección:** se soportan ambos campos y se normaliza la comparación/merge usando:

- Preferencia: `lastInteraction`
- Fallback: `lastUpdate`

Y al persistir en `global_progress`, se escriben ambos (`lastInteraction` y `lastUpdate`) con el mismo valor para compatibilidad.

## Impacto

| Aspecto | Resultado |
|---------|-----------|
| Cambiar de lectura | NO afecta puntos |
| Restaurar sesión antigua | NO sobrescribe gamificación actual |
| Multi-dispositivo | NO soportado (se mantiene una sola sesión activa) |
| Sesiones existentes con rewardsState | Se ignoran (sin pérdida de datos) |

## Garantías Nuevas (Anti-regresión)

- Aunque una ruta genérica intente guardar `rewardsState` dentro de un `textoId` normal, Firestore lo elimina y no se persiste.
- El sistema de sesiones (sanitización/hash/merge) ya no puede reintroducir `rewardsState` accidentalmente.

## Verificación Requerida

1. Ganar puntos en Lectura A
2. Cambiar a Lectura B → **Puntos deben mantenerse**
3. Restaurar Sesión A antigua → **Puntos NO deben cambiar**
4. Recargar página → **Puntos deben persistir** (desde global_progress)
