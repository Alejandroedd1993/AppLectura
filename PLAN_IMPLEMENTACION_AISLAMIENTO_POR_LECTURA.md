# Plan de Implementación: Aislamiento total por Lectura (excepto Puntos/Logros)

## Objetivo

Garantizar que **cada lectura (`textoId`) tenga estado 100% independiente** en:
- Análisis
- Actividades + artefactos
- Notas de estudio
- Evaluación / rúbricas / citas
- Sesiones (smart resume)

y que **solo Puntos/Logros (gamificación)** sea **global** por usuario.

## Principios / Reglas del Sistema

1. **Todo lo académico es por lectura**
   - Persistencia primaria: `students/{uid}/progress/{textoId}`
   - Persistencia local: sesión por lectura + cachés por `textoId`

2. **Gamificación es global**
   - Persistencia primaria: `students/{uid}/progress/global_progress`
   - Nunca duplicar `rewardsState` en docs por lectura.

3. **No re-analizar al volver**
   - Si existe análisis guardado/cached para `textoId`, se reutiliza.
   - El análisis en background nunca debe aplicarse a otra lectura.

---

## Fase 0 — Auditoría rápida (sin cambios funcionales)

**Meta:** confirmar estado actual y puntos exactos de escritura/lectura.

- Verificar:
  - Dónde se guarda `completeAnalysis` (sesión + caché localStorage + Firestore si aplica).
  - Dónde se guardan actividades (local + Firestore).
  - Dónde se guardan notas (actualmente hay un flag basado en contenido).
  - Qué listeners de Firestore están activos y sobre qué doc escuchan.
- **Criterio de salida:**
  - Lista corta de “Fuentes de verdad” por feature (análisis/actividades/notas/evaluación/gamificación).

---

## Fase 1 — Aislamiento de Sesiones por Lectura (Smart Resume)

**Meta:** cada `textoId` debe mapear a una sesión distinta.

- Acciones:
  - Asegurar que `switchLecture()` siempre seleccione/cree `currentSessionId` por `textoId`.
  - Alinear claves de persistencia de sesiones a `appLectura_sessions_<uid>` (no legacy global).
  - Al recibir sesiones desde Firestore, persistirlas usando el SessionManager (scope por usuario).
- Validación:
  - Abrir Lectura A → B → A → B: cada una conserva su sesión y no se sobreescriben.
- **Criterio de salida:**
  - El historial muestra sesiones separadas por lectura y el restore no cruza datos.

---

## Fase 2 — Aislamiento del Análisis (y caché por `textoId`)

**Meta:** al volver a una lectura, se carga su análisis y nunca el de otra.

- Acciones:
  - CacheKey de análisis por `textoId`: `analysis_cache_tid_${textoId}`.
  - En `analyzeDocument()`:
    - Capturar `textoId` al inicio.
    - Antes de aplicar resultado (y fallback), verificar `textoId` actual == `textoId` capturado.
    - Evitar heurísticas de caché en memoria que no usan `textoId`.
  - En restore de sesión:
    - Al restaurar una sesión, aplicar `completeAnalysis` solo si coincide con `currentTextoId`.
- Validación:
  - Repetir escenario del bug: A→B→A→B y confirmar análisis correcto en cada pestaña.
- **Criterio de salida:**
  - No existe contaminación visual ni persistente entre lecturas.

---

## Fase 3 — Progreso Académico por Lectura (Firestore + merge seguro)

**Meta:** rúbricas/actividades/citas se guardan y escuchan por `textoId`.

- Acciones:
  - Listener + carga inicial de Firestore:
    - Deben usar `progress/{textoId}` (fallback `global_progress` solo si no hay lectura).
  - Merge de `activitiesProgress`:
    - Priorizar entregas de artefactos (`artifacts.submitted/submittedAt`) sobre `preparation.updatedAt`.
  - Guardados:
    - Toda sincronización académica llama a `saveStudentProgress(uid, textoId, payload)` (no global).
- Validación:
  - Completar 1-2 artefactos en A, cambiar a B, volver a A: se conserva entregado.
- **Criterio de salida:**
  - Firestore refleja progreso correcto por lectura y no “pierde” entregas.

---

## Fase 4 — Gamificación Global (única fuente de verdad)

**Meta:** puntos/logros nunca se mezclan con lecturas.

- Acciones:
  - Crear listener dedicado a `global_progress` para `rewardsState`.
  - `saveGlobalProgress()` debe:
    - enviar `rewardsState` siempre a `global_progress`
    - enviar el resto del payload a `textoId` (si aplica).
  - El listener por lectura no debe importar `rewardsState`.
- Validación:
  - Cambiar A↔B no debe cambiar puntos ni traer rewards “de otra lectura”.
- **Criterio de salida:**
  - Un único flujo de rewards consistente (sesión única; sin soporte multi-dispositivo).

---

## Fase 5 — Notas de Estudio por Lectura

**Meta:** notas y flags asociados no deben derivarse del contenido (evitar colisiones).

- Acciones:
  - Reemplazar claves basadas en `texto.substring(...)` por claves basadas en `currentTextoId`.
    - Ejemplo: `notas_disponibles_${currentTextoId}`
  - Si hay persistencia de notas (local/Firestore):
    - Almacenar por `textoId`.
- Validación:
  - Generar notas en A, ir a B: B no muestra “notas disponibles” de A.
- **Criterio de salida:**
  - Notas aisladas por lectura.

---

## Fase 6 — Pruebas de Regresión (manual + checklist)

**Meta:** asegurar que no se rompe nada colateral.

### Checklist manual mínimo

- A→B→A→B:
  - Análisis correcto por lectura.
  - Actividades correctas por lectura.
  - Notas correctas por lectura.
  - Evaluación/rúbricas correctas por lectura.
  - Puntos/logros globales estables.
- Logout/Login:
  - Sesiones se cargan solo para el usuario.
- Multi-dispositivo:
  - No aplica (se mantiene una sola sesión activa por usuario).

---

## Riesgos y mitigaciones

- **Riesgo:** duplicar `rewardsState` en docs por lectura existentes en Firestore
  - Mitigación: migración opcional o ignorar `rewardsState` en docs por lectura al cargar.
- **Riesgo:** listeners múltiples y re-render excesivo
  - Mitigación: listeners separados (1 por lectura + 1 global), y cleanup correcto.
- **Riesgo:** pérdida de entregas en merges
  - Mitigación: merge por `submittedCount` + `submittedAt`.

---

## Entregables

- Cambios en:
  - `src/context/AppContext.js`
  - `src/services/sessionManager.js`
  - `src/firebase/firestore.js`
  - (Opcional) módulo de migración de notas/flags
- Documento de verificación: checklist y pasos reproducibles del bug.
