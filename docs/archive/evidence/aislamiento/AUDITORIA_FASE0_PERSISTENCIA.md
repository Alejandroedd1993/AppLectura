# Auditoría Fase 0: Fuentes de Verdad por Feature (v2 - Corregida)

## Resumen Ejecutivo

| Feature | Almacenamiento | Clave/Identificador | Estado |
|---------|----------------|---------------------|--------|
| **Sesiones** | localStorage + Firestore | `appLectura_sessions_{uid}` → `users/{uid}/sessions/{sessionId}` | ✅ Correcto (fix aplicado) |
| **Progreso académico** | Firestore | `students/{uid}/progress/{textoId}` | ✅ Por lectura |
| **Gamificación** | localStorage + Firestore | `rewards_state` local → `progress/global_progress` | 🟠 Duplicado (global + local + sesiones) |
| **Rúbricas** | localStorage + Firestore | `rubricProgress_{uid}` + carga por textoId | 🔴 checkUnsaveDrafts lee legacy |
| **Citas** | localStorage | `savedCitations_{uid}` → `{documentId: []}` | 🔴 documentId inconsistente |
| **Actividades** | localStorage + Firestore | `activitiesProgress_{uid}` → `{documentId: {}}` | 🔴 documentId inconsistente |
| **Borradores** | sessionStorage | Claves globales (no namespace) | 🔴 Contaminación directa |
| **Notas** | localStorage | `notas_disponibles_${texto.substring(0,50)}` | 🔴 Por substring, no textoId |
| **Caché análisis** | localStorage | `analysis_cache_tid_{textoId}` o `analysis_cache_{hash}` | 🟠 Fallback por hash |

---

## Mapa de Persistencia Detallado

### 1. SESIONES DE TRABAJO (Snapshots "Guardar Partida")

| Ubicación | Archivo | Clave/Path |
|-----------|---------|------------|
| localStorage | sessionManager.js:34-76 | `appLectura_sessions_{uid}` |
| localStorage | sessionManager.js | `appLectura_current_session_id_{uid}` |
| Firestore | firestore.js:970-1020 | `users/{userId}/sessions/{sessionId}` |
| Storage | firestore.js:750-820 | `users/{userId}/sessions/{sessionId}/text.txt` |

**Estado:** ✅ Fix aplicado - `switchLecture` ahora busca/crea sesión por textoId

**Matiz importante (verificado):** `switchLecture` asigna/reutiliza `currentSessionId` por `textoId`, pero no “persiste” por sí sola un snapshot completo; el guardado/rehidratación efectiva ocurre a través de los flujos de `sessionManager`/autosave.

---

### 2. PROGRESO ACADÉMICO POR LECTURA

| Ubicación | Archivo | Path Firestore |
|-----------|---------|----------------|
| Firestore | firestore.js:240-670 | `students/{uid}/progress/{textoId}` |
| Funciones | firestore.js | `saveStudentProgress`, `getStudentProgress`, `subscribeToStudentProgress` |

**Contenido:** `rubricProgress`, `activitiesProgress`, agregados dashboard  
**Estado:** ✅ Aislado por textoId

---

### 3. GAMIFICACIÓN (Puntos/Logros)

| Ubicación | Archivo | Clave/Path |
|-----------|---------|------------|
| localStorage (fallback) | rewardsEngine.js:200-260 | `rewards_state` |
| Firestore (global) | AppContext.js:420-480 | `students/{uid}/progress/global_progress` |
| Listener dedicado | AppContext.js:2293-2405 | Escucha `global_progress` |

**⚠️ Problema:** También se guarda `rewardsState` en cada sesión (AppContext.js:1015-1095)  
**Riesgo:** 3 copias del mismo estado = inconsistencias y merges conflictivos

---

### 4. RÚBRICAS

| Ubicación | Archivo | Clave |
|-----------|---------|-------|
| localStorage | AppContext.js:240-340 | `rubricProgress_{uid}` |
| Firestore | Por textoId en `progress/{textoId}` | Campo `rubricProgress` |

**🔴 BUG:** `checkUnsaveDrafts.js:13-33` lee `rubricProgress` (clave legacy global)  
**Impacto:** Warnings basados en rúbrica de OTRA lectura

---

### 5. CITAS GUARDADAS

| Ubicación | Archivo | Clave |
|-----------|---------|-------|
| localStorage | AppContext.js:330-410 | `savedCitations_{uid}` |
| Estructura | — | `{ [documentId]: Citation[] }` |

**🔴 BUG:** `documentId` NO es estable ni es `textoId`:
- Fuente 1: `completeAnalysis.metadata.document_id` (análisis)
- Fuente 2: `doc_${texto.substring(...)}` (fallback en VisorTexto_responsive.js:455-492)

**Impacto:**
1. Fragmentación: misma lectura con distinto `document_id` = "perdí mis citas"
2. Colisiones: fallback por substring puede coincidir entre lecturas
3. Imposibilidad de aislar por lectura de forma estable

---

### 6. ACTIVIDADES (Preparación/Artefactos)

| Ubicación | Archivo | Clave |
|-----------|---------|-------|
| localStorage | AppContext.js:382-430 | `activitiesProgress_{uid}` |
| Estructura | — | `{ [documentId]: {preparation, artifacts...} }` |
| Sync Firestore | AppContext.js:900-940 | Vía `saveGlobalProgress` (usa `currentTextoId` si existe) |

**🔴 Mismo problema de `documentId` inconsistente que citas**

**Matiz importante (verificado):** el efecto de sync de actividades llama `saveGlobalProgress(progressData)` sin pasar `textoId` explícito; `saveGlobalProgress` intenta usar `currentTextoId` y, si no está disponible, cae a `global_progress` con warning. Esto puede provocar que el progreso quede “invisible” para el docente si se sincroniza sin un `textoId` activo.

---

### 7. BORRADORES DE ARTEFACTOS (RIESGO ALTO)

| Ubicación | Archivo | Claves |
|-----------|---------|--------|
| sessionStorage | Componentes varios | `resumenAcademico_draft` |
| sessionStorage | — | `tablaACD_*` |
| sessionStorage | — | `mapaActores_*` |
| sessionStorage | — | `respuestaArgumentativa_*` |
| Detector | checkUnsaveDrafts.js:1-105 | Lee claves directamente |

**🔴 CRÍTICO:** 
- Claves **GLOBALES** (sin namespace por textoId)
- Solo algunos componentes tienen gate por `courseId` (no textoId)
- **No evita mezcla entre lecturas del mismo curso**

**Impacto:** Contaminación directa de UX, restauración incorrecta, warnings erróneos

---

### 8. NOTAS DE ESTUDIO

| Ubicación | Archivo | Clave |
|-----------|---------|-------|
| localStorage | AppContext.js:2507-2520 | `notas_disponibles_${texto.substring(0,50)}` |
| Hook | useNotasEstudioHook.js:45-63 | `generarIdTexto(texto)` (por contenido) |

**🔴 BUG:** Usa substring del texto, NO textoId  
**Impacto:** Colisiones posibles, no garantiza aislamiento por lectura

---

### 9. CACHÉ DE ANÁLISIS

| Ubicación | Archivo | Clave |
|-----------|---------|-------|
| Principal (preferido) | AppContext.js:1546-1560 | `analysis_cache_tid_{textoId}` ✅ |
| Fallback | AppContext.js:1520-1660 | `analysis_cache_{hash}` |
| Alterno | analysisCache.js:1-60 | `analysis_cache_{textHash}` |
| LRU/Guardado | AppContext.js:1720-1805 | — |

**🟠 Parcialmente correcto:** Prioriza textoId pero fallback por hash rompe aislamiento

**Matiz importante:** el fallback por hash no contamina entre lecturas distintas salvo colisión o casos de lecturas con contenido idéntico (mismo hash). El riesgo principal aquí es consistencia/fragmentación de cachés, no mezcla directa de estados por lectura.

---

## Problemas Principales (Ordenados por Impacto)

### 🔴 1. Borradores sessionStorage Globales
**Archivo:** Componentes de artefactos + checkUnsaveDrafts.js  
**Fix:** Namespace todas las claves con `{courseId}_{textoId}_`

### 🔴 2. Identidad Inconsistente de `documentId`
**Archivos:** VisorTexto_responsive.js, AppContext.js (citas/actividades)  
**Fix:** Usar siempre `currentTextoId` del contexto como identificador

### 🟠 3. rubricProgress Legacy en checkUnsaveDrafts
**Archivo:** checkUnsaveDrafts.js:13-33  
**Fix:** Leer `rubricProgress_{uid}` y validar con `currentTextoId`

### 🟠 4. rewardsState Duplicado en 3 Lugares
**Archivos:** rewardsEngine.js, AppContext.js, sessionManager.js  
**Fix:** Eliminar de sesiones por lectura, mantener solo en `global_progress`

### 🟡 5. Notas por Substring
**Archivos:** AppContext.js:2507-2520, useNotasEstudioHook.js:45-63  
**Fix:** Cambiar a `notas_disponibles_${currentTextoId}`

---

## Criterio de Salida Fase 0

- [x] Lista de fuentes de verdad por feature
- [x] Identificación de claves/paths inconsistentes
- [x] Priorización de problemas por impacto
- [ ] Documento revisado y aprobado
