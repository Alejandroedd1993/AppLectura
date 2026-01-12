# Informe Fase 1: Namespace Borradores SessionStorage

## Estado: ✅ Completado (Build: Exit 0)

## Objetivo
Namespace todas las claves de sessionStorage con `{textoId}_` para evitar contaminación entre lecturas.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `sessionManager.js` | ✅ Nuevo helper `getDraftKey(base, textoId)` |
| `sessionManager.js` | ✅ `captureArtifactsDrafts(textoId)` actualizado |
| `sessionManager.js` | ✅ `restoreArtifactsDrafts(artifacts, textoId)` actualizado |
| `sessionManager.js` | ✅ `clearArtifactsDrafts(textoId)` actualizado |
| `checkUnsaveDrafts.js` | ✅ `checkUnsaveDrafts(textoId)` usa claves namespaced |
| `ResumenAcademico.js` | ✅ Usa `currentTextoId` para load/save |
| `TablaACD.js` | ✅ Usa `currentTextoId` para load/save |
| `MapaActores.js` | ✅ Usa `currentTextoId` para load/save |
| `RespuestaArgumentativa.js` | ✅ Usa `currentTextoId` para load/save |

## Ajustes críticos de integración (post-verificación)

Durante la revisión se identificaron puntos donde el namespace por `textoId` podía quedarse “a medias” si no se propagaba a todos los call-sites.

### 1) Warnings por cambio de sesión / carga de texto

- **Problema:** `checkUnsaveDrafts()` y `getWarningMessage()` se llamaban sin `textoId` desde UI. Como los borradores ahora están namespaced, eso podía producir falsos negativos (“no hay borradores”) y permitir cambios de sesión/carga sin advertencia.
- **Corrección aplicada:** Los call-sites pasan `currentTextoId` para que el warning verifique el set correcto de claves.

### 2) Captura/restauración de borradores dentro de sesiones

- **Problema:** `sessionManager` y `AppContext` seguían capturando/restaurando borradores con llamadas sin `textoId` (lo que dispara el fallback global y rompe el aislamiento).
- **Corrección aplicada:** Captura/restauración/limpieza ahora se hace con el `textoId` real de la sesión/estado.

## Resultado real de la Fase 1

- Aislamiento de borradores por lectura usando claves `getDraftKey(base, textoId)`.
- Warnings y restauración de sesiones alineados con el namespace por lectura.
- Se evita borrar/restaurar borradores de otras lecturas al restaurar una sesión.

## Patrón Implementado

### Antes (Claves Globales)
```javascript
sessionStorage.setItem('resumenAcademico_draft', text);
// Clave: resumenAcademico_draft (compartida entre lecturas)
```

### Ahora (Claves por textoId)
```javascript
import { getDraftKey } from '../../services/sessionManager';

// En useEffect con currentTextoId
const key = getDraftKey('resumenAcademico_draft', currentTextoId);
sessionStorage.setItem(key, text);
// Clave: abc123_resumenAcademico_draft (única por lectura)
```

## Cambio de Arquitectura

```
ANTES (contaminación):
Lectura A → resumenAcademico_draft ← Lectura B
            (misma clave, se sobrescribe)

AHORA (aislado):
Lectura A → abc123_resumenAcademico_draft
Lectura B → xyz789_resumenAcademico_draft
            (claves diferentes, sin contaminación)
```

## Verificación Requerida

1. Abrir Lectura A → Escribir borrador en ResumenAcademico
2. Abrir Lectura B → Verificar que ResumenAcademico está vacío
3. Volver a Lectura A → Borrador debe restaurarse

## Próximas Fases

- **Fase 2:** Identidad consistente de `documentId` (citas y actividades)
- **Fase 3:** rubricProgress legacy en `checkUnsaveDrafts`
- **Fase 4:** rewardsState único (eliminar de sesiones)
- **Fase 5:** Notas por textoId
- **Fase 6:** Pruebas de regresión

## Pendientes detectados (no bloquean Fase 2)

- `checkUnsaveDrafts` todavía lee `localStorage.getItem('rubricProgress')` (legacy global). Esto puede generar warnings incorrectos por lectura hasta que se migre a `rubricProgress_{uid}` y/o por `textoId` (Fase 3).
- Si se quiere aislamiento también entre usuarios en la misma pestaña: considerar namespace `{uid}_{textoId}_...` (opcional según modelo de uso).
