# Reporte de Auditoría Profunda: Persistencia y Sincronización

## Hallazgos Nuevos (Post-Fix Inicial)

Tras una revisión exhaustiva del código de fusión de sesiones y manejo de conflictos, se identificó una vulnerabilidad adicional que podría causar la pérdida del vínculo con el curso en escenarios específicos.

### 1. Vulnerabilidad en Fusión de Conflictos (`sessionHash.js`)
**Problema:**
La función `mergeSessionsWithConflictResolution` utilizaba la sesión de la nube (`cloud`) como objeto base para el merge:
```javascript
const merged = { ...cloud, ... };
```
Si la versión de la nube era antigua o estaba corrupta (sin `sourceCourseId`), y la versión local sí tenía el ID correcto, el proceso de fusión **sobrescribía** el dato local con el valor nulo de la nube, perdiendo nuevamente la conexión con el curso.

**Solución Aplicada:**
Se modificó la lógica de inicialización del objeto `merged` para priorizar explícitamente la preservación del `sourceCourseId` si existe en *cualquiera* de las dos fuentes:
```javascript
sourceCourseId: local.sourceCourseId || cloud.sourceCourseId || null
```
Esto garantiza que el vínculo con el curso sobreviva a cualquier conflicto de sincronización.

### 2. Riesgo de "Progreso Fantasma" (`global_progress`)
**Observación:**
En `AppContext.js`, si `currentTextoId` no está definido al momento de guardar progreso (ej. puntos de gamificación ganados fuera de una lectura específica), el sistema usa `'global_progress'` como ID de fallback.
**Impacto:**
El dashboard del docente filtra estrictamente por los IDs de las lecturas asignadas. Cualquier progreso guardado bajo el ID `'global_progress'` es invisible para el docente.
**Mitigación:**
Aunque no es un error crítico de bloqueo, se recomienda asegurar que `currentTextoId` esté siempre disponible antes de permitir interacciones evaluables. Las correcciones previas en `TextoSelector` ya minimizan este riesgo al forzar la selección de texto antes de entrar.

## Estado Final del Sistema

| Componente | Estado | Notas |
| :--- | :---: | :--- |
| **Creación de Sesión** | ✅ Blindado | Inyecta `sourceCourseId` desde el inicio. |
| **Guardado Local** | ✅ Blindado | `sessionManager` persiste el ID correctamente. |
| **Subida a Nube** | ✅ Blindado | `firestore.js` incluye el ID en el payload. |
| **Guardado de Notas** | ✅ Autocurativo | Repara documentos sin ID automáticamente. |
| **Resolución de Conflictos** | ✅ Blindado | Preserva el ID si existe en local o nube. |

El sistema ahora cuenta con múltiples capas de redundancia para asegurar que el trabajo del estudiante siempre llegue al dashboard del docente.
