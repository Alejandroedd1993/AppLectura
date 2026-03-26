# Plan Integral de Corrección - AppLectura

**Fecha:** 2026-03-06
**Fuentes:** Análisis profundo de ~200 archivos (backend, frontend, pedagogy, tests, styles, config) + `INFORME_ANALISIS_INTEGRAL.md` + `PLAN_CORRECCION_INTEGRAL_2026-03-06.md` (react-doctor)

---

## Contexto

AppLectura es una plataforma educativa de lectura con IA (tutor + evaluador) construida con React 18 + Express + Firebase. Tras un análisis exhaustivo de todo el código fuente se identificaron **problemas críticos** en seguridad, arquitectura, rendimiento, calidad de tests y mantenibilidad. El modelo pedagógico (Bloom, ZDP, ACD) es sólido pero la infraestructura técnica tiene deuda severa que compromete la evolución del producto.

Este plan organiza **todas las correcciones necesarias** en 7 fases priorizadas, con archivos específicos, acciones concretas y criterios de verificación.

> **Nota sobre ejecución:** Este plan es un documento de referencia integral, no un sprint único. La validación posterior contra el código real confirma el diagnóstico general, pero obliga a **reordenar la ejecución**: primero **Track 0** (quick wins y reducción de ruido), luego seguridad y saneamiento de API, después deduplicación/performance de bajo riesgo, y recién al final los refactors estructurales grandes. En particular, el split de `AppContext.js` **no debe arrancar** sin profiler, tests de regresión mínimos y una estrategia explícita para no duplicar la sincronización Firestore/localStorage.

> **Regla de secuenciación:** los cambios que alteran contratos entre frontend y backend (por ejemplo el nuevo envelope de errores) deben desplegarse en transición controlada. No conviene mezclar en una sola ola cambios de seguridad, refactor de estado global y cambios de contrato HTTP.

> **Regla de lectura del plan:** las **Fases** describen el dominio del problema y sus correcciones; los **Tracks** describen el orden práctico de ejecución y agrupación en lotes de trabajo. Cuando haya conflicto aparente, prevalece el orden de los Tracks y sus gates de entrada/salida.

**Puntuación por área (pre-corrección):**

| Área | Nota | Veredicto |
|------|------|-----------|
| Modelo pedagógico | 8/10 | Sólido, bien fundamentado teóricamente |
| Seguridad | 4/10 | Múltiples riesgos activos |
| Arquitectura backend | 5/10 | Buena base, ejecución inconsistente |
| Arquitectura frontend | 3/10 | God-context, archivos monolíticos |
| Calidad de tests | 3/10 | Cobertura real baja, claims inflados |
| Sistema de estilos | 5/10 | Buen tema base, implementación fragmentada |
| CI/CD y DevOps | 1/10 | Inexistente |
| Duplicación de código | 2/10 | Masiva y sistémica |

---

## ESTADO DE PROGRESO (actualizado 2026-03-25)

| Fase / Track | Estado | Progreso |
|---|---|---|
| **Track 0** — Quick Wins | ✅ COMPLETADO | Archivos basura, exports duplicados resueltos |
| **Track A1** — Saneamiento urgente | ✅ COMPLETADO | errorHandler, fugas, backdoor, globals, admin-cleanup |
| **Track A2** — Auth robustez | ✅ COMPLETADO | Migración a firebase-admin completa |
| **Track A3** — Contrato API | ✅ COMPLETADO | Envelope, Zod, error codes, textLimits |
| **Track B1** — Dedup bajo riesgo | 🔶 PARCIAL | envUtils, modelUtils, BACKEND_URL, rateLimiters, dotenv ✅ — hashes frontend consolidados con aliases legacy mínimos |
| **Track B2** — Infra medio riesgo | 🔶 PARCIAL | AI client, pooling, timeouts, retry, streaming ✅ |
| **Track B3** — Resiliencia avanzada | ⬜ PENDIENTE | Circuit breaker postergado |
| **Track C1** — Reorganización segura | 🔶 PARCIAL | BACKEND_URL ✅ — firestore split, docs ⬜ |
| **Track C2** — Calidad | 🔶 PARCIAL | CI, react-doctor, cross-env ✅ — ESLint strict, coverage 45% ⬜ |
| **Track C3** — Refactor mayor | ⬜ PENDIENTE | AppContext split, sync, Router |
| **Track C4** — Estilos y limpieza | ⬜ PENDIENTE | Dark mode, theme, dead code |

| Fase | Completado | Total | % |
|---|---|---|---|
| Fase 1 — Seguridad | 6.5/7 | 7 | ~93% |
| Fase 2 — Arquitectura | 1.5/7 | 7 | ~21% |
| Fase 3 — Duplicación | 12/13 | 13 | ~92% |
| Fase 4 — Performance | 10/10 | 10 | ✅ 100% |
| Fase 5 — API Standard | 6/6 | 6 | ✅ 100% |
| Fase 6 — CI/Tests | 6/9 | 9 | ~67% |
| Fase 7 — Estilos/Limpieza | 0.5/18 | 18 | ~3% |

---

## FASE 1 — Seguridad y Fugas Críticas

**Prioridad:** URGENTE — riesgos activos en producción
**Archivos principales a modificar:**

> **Ajuste de alcance:** dentro de esta fase, la prioridad real es cerrar fugas activas (`error.message`, backdoors, globals de debug y rutas administrativas incompletamente protegidas). La migración de JWT manual a `firebase-admin` es recomendable, pero no debe bloquear el cierre del resto de la fase.

### 1.1 Error handler global — Dejar de filtrar error.message al cliente ✅ COMPLETADO

Los siguientes endpoints devuelven `error.message` crudo, exponiendo rutas internas, URLs de API y config:

| Archivo | Línea(s) | Cambio |
|---------|----------|--------|
| `server/routes/pdf.routes.js` | 45 | Reemplazar `details: err.message` por mensaje genérico |
| `server/routes/storage.routes.js` | 42, 64 | Reemplazar `details: errorText.substring(0,500)` y `details: error.message` |
| `server/controllers/analisis.controller.js` | 89, 97, 104 | Reemplazar `detalle: error.message` por código de error |
| `server/controllers/webSearch.controller.js` | 173 | Reemplazar `detalle: error.message` |
| `server/middleware/firebaseAuth.js` | 156 | Reemplazar `details: error.message` |
| `server/controllers/chat.completion.controller.js` | 397 | Reemplazar `error: error.message` |

**Acción:** Crear middleware `server/middleware/errorHandler.js` que:
- Loguee `error.message` + `error.stack` internamente
- Devuelva al cliente solo `{ error: "código_genérico", mensaje: "Descripción segura" }`
- Se monte como último middleware en `server/index.js`

### 1.2 Eliminar backdoor de testing en producción ✅ COMPLETADO

| Archivo | Detalle |
|---------|---------|
| `src/hooks/usePasteUnlock.js` | `window.__PASTE_UNLOCKED` activable con Ctrl+Alt+U |

**Acción:** Envolver toda la lógica en `if (process.env.NODE_ENV === 'development')`. En producción el hook debe ser un no-op.

### 1.3 Usar firebase-admin SDK para verificación JWT ✅ COMPLETADO

| Archivo | Línea(s) |
|---------|----------|
| `server/middleware/firebaseAuth.js` | 69-92 |

**Acción:** Reemplazar la verificación JWT manual (RS256, cert rotation, claim validation) por `admin.auth().verifyIdToken(token)` del SDK `firebase-admin`. Eliminar `certsCache` manual (línea 9) y toda la lógica de fetch de Google certs.

**Secuencia recomendada:** ejecutar este punto después de 1.1, 1.2, 1.4, 1.6 y 1.7. Mejora robustez y mantenibilidad, pero el riesgo activo mayor está en la exposición de errores y en la superficie de administración.

**Prerequisito operativo:** verificar antes del merge y del deploy que Render tenga configurado `FIREBASE_SERVICE_ACCOUNT_JSON` o `FIREBASE_SERVICE_ACCOUNT_BASE64`. Sin este prerrequisito, la migración puede degradar o romper completamente la autenticación server-side.

### 1.4 Proteger endpoint admin-cleanup con Firebase Auth ✅ COMPLETADO

| Archivo | Línea |
|---------|-------|
| `server/routes/adminCleanup.routes.js` | 8 |

**Acción:** Agregar `requireFirebaseAuth` como middleware antes de `run-pending`. Mantener el `x-cleanup-secret` como segunda capa, no como única.

### 1.5 Agregar headers de seguridad en Firebase Hosting ✅ COMPLETADO

| Archivo |
|---------|
| `firebase.json` |

**Acción:** Agregar en `hosting.headers`:
```json
{ "key": "X-Frame-Options", "value": "DENY" },
{ "key": "X-Content-Type-Options", "value": "nosniff" },
{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
{ "key": "Content-Security-Policy", "value": "default-src 'self'; ..." }
```

### 1.6 Limpiar globals de debug en producción 🔶 PARCIAL

> **Estado:** `window.ACDAnalyzer` y `window.RewardsEngine` (clases) están envueltos en dev check ✅. El acceso a `window.__rewardsEngine` quedó encapsulado en `src/utils/rewardsBridge.js` como paso previo al split de `AppContext.js`; la dependencia global todavía existe, pero ya no está dispersa en consumidores.
|---------|----------------|
| `src/pedagogy/discourse/ACDAnalyzer.js` | `window.ACDAnalyzer` |
| `src/pedagogy/rewards/RewardsEngine.js` | `window.RewardsEngine` |

**Acción:** Envolver en `if (process.env.NODE_ENV === 'development')`.

### 1.7 Dejar de loguear información de API keys ✅ COMPLETADO

| Archivo | Línea(s) |
|---------|----------|
| `server/index.js` | 38-42 |

**Acción:** Eliminar el log que muestra longitud y últimos 4 caracteres de cada API key. Reemplazar por un simple boolean "configured: true/false" por proveedor.

**Verificación Fase 1:**
- `grep -r "error\.message" server/ --include="*.js"` no debe encontrar ningún caso devuelto en `res.json()`
- `grep -r "window\.__PASTE" src/` no debe existir en builds de producción
- `grep -r "window\.ACDAnalyzer\|window\.RewardsEngine" src/` envueltos en dev check
- Test manual: provocar error en endpoint → verificar que el cliente NO recibe stack trace

---

## FASE 2 — Arquitectura: Descomponer los Monolitos de Forma Incremental

**Prioridad:** ALTA — afecta rendimiento, mantenibilidad y capacidad de testing

> **Gate de entrada:** esta fase no debe empezar hasta cerrar el Track 0 y estabilizar los cambios de seguridad de la Fase 1. Antes de mover estado global o sincronización, se deben tener al menos tests mínimos sobre persistencia/sesiones y una medición base de re-renders con React DevTools Profiler.

### Estrategia de ejecución de la Fase 2

La fase debe dividirse en subfases con distinto riesgo:

| Subfase | Objetivo | Riesgo | Secuencia recomendada |
|---------|----------|--------|------------------------|
| `2A` | Separar `firestore.js` por dominio + centralizar `BACKEND_URL` | Bajo/Medio | Primero |
| `2B` | Extraer servicios de `preLectura.controller.js` y dependencias cruzadas | Medio/Alto | Después de 2A y con tests/fallbacks preservados |
| `2C` | Rediseñar sincronización Firebase/localStorage | Alto | Solo tras mapear side effects e intervalos actuales |
| `2D` | Split de `AppContext.js` | Muy alto | Solo con profiler, tests y estrategia de migración incremental |
| `2E` | React Router para tabs | Alto | Al final, cuando el estado ya esté desacoplado |

### Mapeo entre Fases y Tracks

Para evitar ambigüedad durante la ejecución:

| Track | Equivalencia principal dentro de las fases |
|-------|--------------------------------------------|
| `Track 0` | Quick wins previos a Fases 1-7: duplicates, huérfanos, basura, exports de alto impacto |
| `A1` | Fase 1.1, 1.2, 1.4, 1.6, 1.7 |
| `A2` | Fase 1.3 + endurecimientos remanentes de seguridad |
| `A3` | Fase 5.1, 5.2, 5.3, 5.4, 5.6 |
| `B1` | Fase 3 de bajo riesgo: `BACKEND_URL`, hashes, `envUtils`, `modelUtils` |
| `B2` | Fase 3/4 de infraestructura: AI client singleton, caches, streaming, retry y mejoras de red |
| `B3` | Mejoras opcionales o posteriores de resiliencia, como circuit breaker |
| `C1` | Fase 2A + 2.3 + 2.6 |
| `C2` | Fase 6 + baseline de profiler |
| `C3` | Fase 2B + 2C + 2D + 2E |
| `C4` | Fase 7 |

### 2.1 Dividir AppContext.js (5,896 líneas) en contextos especializados ⬜ PENDIENTE

**Archivo fuente:** `src/context/AppContext.js`

**Problema raíz (del INFORME_ANALISIS_INTEGRAL.md):** Este archivo es un God Object clásico. Maneja caché, control de timeouts de lectura, estado de archivos cargados, persistencia híbrida (localStorage/Firestore), feature flags, limpieza de borradores, control de historial. Cualquier componente que importe AppContext queda suscrito a miles de recreaciones de useCallback y useMemo. Los re-renders desperdiciados son un cuello de botella.

**Archivos a crear:**

| Nuevo contexto | Responsabilidad | Estado que absorbe |
|----------------|----------------|--------------------|
| `src/context/SessionContext.js` | Sesiones de trabajo, persistencia, Firestore sync | `sesionActual`, `sesiones`, CRUD sesiones, autosave interval (línea 3211) |
| `src/context/ReadingContext.js` | Texto cargado, PDF, metadata del documento | `texto`, `tituloTexto`, `archivoOriginal`, `metadatosTexto`, `formatoOrigen` |
| `src/context/AnalysisContext.js` | Análisis AI, prelectura, glosario, web search | `analisis*`, `prelectura`, `resultadosGlosario`, `webSearchResults` |
| `src/context/ProgressContext.js` | Rúbricas, actividades, Bloom, recompensas | `progresoRubricas`, `actividadesCompletadas`, `bloomLevel`, `rewards` |
| `src/context/UIContext.js` | Preferencias visuales, modo oscuro, focus mode | `modoOscuro`, `focusMode`, `tabActivo`, `panelExpandido` |

**Alternativa (del INFORME):** Evaluar migración parcial a **Zustand** o **React Query/SWR** para la sincronización Firebase/localStorage, reemplazando la monstruosa sincronización manual con docenas de `useRef()` por una cola de mensajes en background.

**Ajuste de implementación:** el split no debe arrancar por la superficie de UI sino por la frontera de sincronización. Si primero se reparten estados entre varios providers sin aislar la persistencia, el resultado puede ser peor: múltiples suscripciones, más intervalos y nuevas fuentes de anti-loops.

**Patrón de migración:**
1. Inventariar side effects actuales de `AppContext.js` (intervals, listeners, sync hooks, writes a Firestore/localStorage)
2. Extraer primero la sincronización compartida a una capa estable y testeable
3. Crear cada contexto nuevo con su Provider o adoptar una alternativa como Zustand para el estado altamente fragmentado
4. En `App.js`, anidar los providers solo cuando la capa de sincronización ya no dependa del god-context
5. Migrar componentes uno a uno: reemplazar `useContext(AppContext)` por el contexto específico
6. Dejar `AppContext.js` como re-export temporal para backwards compatibility
7. Una vez migrados los consumidores críticos y validados los flujos, eliminar el wrapper

**Componentes que deben migrar (20+ identificados):**
- `src/App.js` → SessionContext + UIContext
- `src/VisorTexto.js` → ReadingContext
- `src/VisorTexto_responsive.js` → ReadingContext
- `src/components/CargaTexto_responsive.js` → ReadingContext
- `src/components/SistemaEvaluacion.js` → ProgressContext
- `src/components/PreLectura.js` → AnalysisContext
- `src/components/Actividades.js` → ProgressContext
- `src/components/ReadingWorkspace.js` → ReadingContext
- `src/components/tutor/TutorDock.js` → AnalysisContext + SessionContext
- `src/components/notas/NotasEstudioRefactorizado.js` → ReadingContext
- `src/components/artefactos/TablaACD.js` → AnalysisContext
- `src/components/artefactos/MapaActores.js` → AnalysisContext
- `src/components/artefactos/RespuestaArgumentativa.js` → AnalysisContext
- `src/components/artefactos/BitacoraEticaIA.js` → AnalysisContext
- `src/components/artefactos/ResumenAcademico.js` → AnalysisContext
- `src/components/ensayoIntegrador/EnsayoIntegrador.js` → AnalysisContext
- `src/components/actividades/PreguntasPersonalizadas.js` → ProgressContext
- `src/components/actividades/ModoPracticaGuiada.js` → ProgressContext
- `src/components/common/ClearHistoryButton.js` → SessionContext
- `src/utils/fetchWebSearch.js` → extraer BACKEND_URL a config (ver 2.3)

### 2.2 Dividir firestore.js (4,369 líneas) en módulos por dominio ⬜ PENDIENTE

**Archivo fuente:** `src/firebase/firestore.js`
**Archivos a crear:**

**Orden recomendado dentro de Fase 2:** este punto debe ejecutarse antes que 2.1. Permite reducir tamaño y acoplamiento sin cambiar todavía el modelo mental del estado en React.

| Módulo | Contenido |
|--------|-----------|
| `src/firebase/firestore/sessions.js` | CRUD y persistencia de sesiones de trabajo |
| `src/firebase/firestore/progress.js` | Rúbricas, actividades, Bloom |
| `src/firebase/firestore/tutor.js` | Historial de tutor, threads |
| `src/firebase/firestore/analytics.js` | Métricas, exportación, tracking |
| `src/firebase/firestore/shared.js` | `__firestoreWritesDisabled` flag, `simpleHash`, helpers comunes |
| `src/firebase/firestore/index.js` | Re-export barrel para backwards compatibility |

### 2.3 Centralizar BACKEND_URL (6+ definiciones) ✅ COMPLETADO

**Definiciones actuales que deben eliminarse:**

| Archivo | Línea | Variable |
|---------|-------|----------|
| `src/context/AppContext.js` | 50 | `BACKEND_URL` |
| `src/hooks/notes/useNotasEstudioHook.js` | 15 | `BACKEND_URL` |
| `src/firebase/firestore.js` | 34 | `BACKEND_BASE_URL` |
| `src/utils/backendUtils.js` | 7 | `BACKEND_URL` |
| `src/utils/pdfRecovery.js` | 38 | `backendBaseUrl` |
| `src/services/textStructureService.js` | 13 | `BACKEND_URL` |

**Acción:** Crear `src/config/backend.js`:
```js
export const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
```
Todos los archivos deben importar desde este módulo. `backendRequest.js` ya tiene `buildBackendEndpoint` que hace exactamente esto — usarlo como fuente canónica.

### 2.4 Refactorizar preLectura.controller.js (1,527 líneas) ⬜ PENDIENTE

**Archivo fuente:** `server/controllers/preLectura.controller.js`
**Extraer a:**

| Nuevo módulo | Contenido a extraer |
|-------------|---------------------|
| `server/services/webCache.service.js` | `PRELECTURA_WEB_CACHE` (línea 63), lógica de cache con TTL |
| `server/services/jsonRepair.service.js` | `tryRepairJSON` (línea 83), toda la lógica de reparación JSON truncado |
| `server/services/preLectura.service.js` | Lógica de construcción de prompts, validación de figuras, creación de fallback analysis |
| `server/services/aiCall.service.js` | Llamadas a DeepSeek/OpenAI con timeout, error handling, y model selection |

**Resolver dependencia cruzada:** Línea 11 importa `searchWebSources` de `webSearch.controller.js` → mover esa función a `server/services/webSearch.service.js`.

### 2.5 Usar React Router para navegación de tabs ⬜ PENDIENTE

**Archivo:** `src/App.js` (~800 líneas)

**Problema (del INFORME_ANALISIS_INTEGRAL.md):** App.js ocupa más de 800 líneas porque controla manualmente la visualización de los Tabs con switch-cases y la limpieza del storage según las condiciones de renderizado. Todos los componentes ocultos permanecen en memoria del DOM.

**Acción:** Migrar a rutas con `react-router-dom` (ya instalado como v7):
- `/lectura` → ReadingWorkspace
- `/analisis` → AnalysisView
- `/evaluacion` → SistemaEvaluacion
- `/actividades` → Actividades
- `/notas` → NotasEstudio
- `/tutor` → TutorDock

Esto desmonta componentes no visibles y reduce consumo de memoria.

**Secuencia recomendada:** no abordar este punto hasta que `AppContext.js` y la sincronización compartida estén suficientemente desacoplados. Migrar navegación antes de estabilizar estado y side effects aumenta la probabilidad de regresiones por desmontaje/remontaje.

### 2.6 Resolver desfase documentación↔código 🔶 PARCIAL

**Problema (del INFORME):** `ARQUITECTURA.md` describe un sistema centralizado en `useApiConfig`, pero este archivo no existe. La delegación real recae sobre `unifiedAiService.js`.

**Acción:** Reescribir `ARQUITECTURA.md` para reflejar la arquitectura real. Mover a `docs/`.

### 2.7 Resolver cruces de responsabilidades en sincronización ⬜ PENDIENTE

**Problema (del INFORME):** `AppContext.js` importa métodos directamente de `sessionManager.js` pero al mismo tiempo implementa lógicas de respaldo que colisionan conceptualmente. Los comentarios tipo `// 🛡️ Anti-loop: cuando el progreso se actualiza` sugieren que la arquitectura de sincronización inicial fue defectuosa.

**Acción:** Como parte del split de contextos, extraer toda la sincronización Firebase/localStorage a hooks dedicados con debouncing propio. Evaluar React Query para reemplazar la sincronización manual.

**Verificación Fase 2:**
- `src/firebase/firestore.js` queda dividido por dominio con barrel de compatibilidad y sin cambios de comportamiento observables
- `BACKEND_URL` queda centralizado antes de continuar con refactors mayores
- Existe una línea base de profiler antes del split y una comparación posterior
- `grep -rn "from.*AppContext" src/` se reduce progresivamente, no de forma abrupta ni masiva en una sola PR
- Ningún refactor de estado global se considera cerrado sin validar persistencia, autosave y restauración de sesión
- La aplicación funciona igual visualmente y sin regresiones funcionales en lectura, tutor, evaluación y notas

---

## FASE 3 — Eliminar Duplicación Sistémica

**Prioridad:** ALTA — afecta mantenibilidad y consistencia

### 3.1 Backend: Extraer utilidades duplicadas

#### 3.1.1 `parseBooleanEnv` → `server/utils/envUtils.js` ✅ COMPLETADO

Duplicado en 4 archivos:
- `server/controllers/preLectura.controller.js:17`
- `server/controllers/adminCleanup.controller.js:8`
- `server/controllers/webSearch.controller.js:6`
- `server/routes/webSearch.routes.js:33`

**Acción:** Crear `server/utils/envUtils.js` con `parseBooleanEnv(key, defaultVal)` y reemplazar todas las ocurrencias.

#### 3.1.2 `parseAllowedModels` + `pickAllowedModel` → `server/utils/modelUtils.js` ✅ COMPLETADO

Duplicado en 5 archivos con 3 firmas distintas:
- `server/controllers/chat.completion.controller.js:64`
- `server/services/strategies/openai.strategy.js:15`
- `server/services/strategies/deepseek.strategy.js:4,12`
- `server/controllers/preLectura.controller.js:1169,1180`
- `server/controllers/webSearch.controller.js:25,36`

**Acción:** Crear `server/utils/modelUtils.js` con firma unificada:
```js
export function parseAllowedModels(envVar, defaults) { ... }
export function pickAllowedModel({ requested, allowed, fallback }) { ... }
```

#### 3.1.3 Unificar instanciación de clientes AI ✅ COMPLETADO

Actualmente se crean de 5 formas distintas:
- `server/config/apiClients.js` — singleton cached (el correcto)
- `server/index.js:72` — nuevo por cada `aiClient.complete()`
- `server/controllers/chat.completion.controller.js:180` — nuevo por request
- `server/controllers/glossary.controller.js` — raw axios
- `server/services/notes.service.js` — raw fetch para DeepSeek

**Acción:** Todos deben usar `apiClients.js`. Mover el `aiClient` de `index.js:54-113` a `server/services/aiClient.service.js`. Eliminar instanciaciones inline.

#### 3.1.4 Unificar llamadas a DeepSeek API 🔶 PARCIAL

5 métodos distintos (axios, node-fetch, native fetch) para lo mismo:
- `server/services/strategies/deepseek.strategy.js` — native fetch
- `server/controllers/preLectura.controller.js` — axios
- `server/controllers/glossary.controller.js` — axios
- `server/services/notes.service.js` — node-fetch
- `server/controllers/webSearch.controller.js` — native fetch

**Acción:** Todas las llamadas DeepSeek deben pasar por `deepseek.strategy.js` o por el cliente de `apiClients.js`. Eliminar dependencia `node-fetch` (usar native fetch de Node 18+).

#### 3.1.5 Consolidar rate limiters con factory ✅ COMPLETADO

**Archivo:** `server/middleware/rateLimiters.js`

7 rate limiters casi idénticos.

**Acción:** Crear factory:
```js
function createLimiter(prefix, { windowMs, max, envPrefix }) { ... }
export const analysisLimiter = createLimiter('analysis', { ... });
```

#### 3.1.6 Unificar `dotenv.config()` — llamar una sola vez ✅ COMPLETADO

Llamado 5 veces en archivos distintos:
- `server/index.js:27-28` (dos veces, distinto path)
- `server/config/settings.js:3`
- `server/config/apiClients.js:11`
- `server/controllers/chat.completion.controller.js:10`

**Acción:** Llamar solo en `server/index.js` al inicio. Los demás módulos deben confiar en que ya fue cargado.

### 3.2 Frontend: Extraer utilidades duplicadas

#### 3.2.1 Hash functions → `src/utils/hash.js` ⬜ PENDIENTE

7 implementaciones independientes:

| Archivo | Función | Algoritmo |
|---------|---------|-----------|
| `src/utils/netUtils.js` | `hashText()` | FNV-1a |
| `src/utils/sessionHash.js` | `simpleHash()` | DJB2-variante |
| `src/firebase/firestore.js:1626` | `simpleHash()` | desconocido |
| `src/services/annotations.service.js:37` | `simpleHash()` | desconocido |
| `src/services/studyItems.service.js:39` | `simpleHash()` | desconocido |
| `src/services/segmentTextService.js:33` | `shortHash()` | h*31+charCode |
| `src/hooks/useTutorPersistence.js:9` | `fastHash()` | desconocido |

**Acción:** Crear `src/utils/hash.js` con 1-2 funciones canónicas. Reemplazar todas las demás.

#### 3.2.2 `toMillis()` — duplicada en 2 hooks ✅ COMPLETADO

- `src/hooks/useTutorPersistence.js:116`
- `src/hooks/useTutorThreads.js:11`

**Acción:** Mover a `src/utils/dateUtils.js`.

#### 3.2.3 `dimensionMap` duplicada en practiceService ✅ COMPLETADO

- `src/services/practiceService.js:171-182` (en `determineDifficultyLevel`)
- `src/services/practiceService.js:206-217` (en `getHintsForDimension`)

**Acción:** Extraer a constante de módulo fuera de las funciones.

#### 3.2.4 `rubricNames` duplicada en analyticsService ✅ COMPLETADO

- `src/services/analyticsService.js:284-290` (en `exportToCSV`)
- `src/services/analyticsService.js:343-349` (en `exportToJSON`)

**Acción:** Extraer a constante compartida en el módulo. Reusar `RUBRICS` de `rubricProgressV2.js:3`.

#### 3.2.5 JSON fence-stripping duplicado ✅ COMPLETADO

- `src/services/unifiedAiService.js:139-142`
- `src/services/termDefinitionService.js:73-76`

**Acción:** Una sola función en `unifiedAiService.js`, importada por los demás.

#### 3.2.6 `devLog`/`devWarn` en lugar de `logger.js` ✅ COMPLETADO

- `src/services/pdfGlossaryService.js:3-5`
- `src/services/termDefinitionService.js:3-5`

**Acción:** Reemplazar por `import { logger } from '../utils/logger'`.

### 3.3 Flujo huérfano de Web Search (del react-doctor plan) ✅ COMPLETADO

> **Estado:** los archivos huérfanos listados por el plan ya no existen en el repo. Se considera resuelto por retirada del flujo legacy, no por reactivación.

Archivos potencialmente huérfanos:
- `src/components/chat/WebEnrichmentButton.js`
- `src/hooks/useWebSearchTutor.js`
- `src/hooks/useWebSearchAvailability.js`
- `src/services/webSearchService.js`

**Decision gate:** Reactivar feature y conectarla al flujo real del tutor, o retirar por completo.

**Verificación Fase 3:**
- `grep -rn "parseBooleanEnv\|parseBool\|toBool" server/` → solo en `server/utils/envUtils.js`
- `grep -rn "parseAllowedModels\|pickAllowedModel" server/` → solo en `server/utils/modelUtils.js`
- `grep -rn "simpleHash\|fastHash\|shortHash\|hashText" src/` → solo en `src/utils/hash.js` y sus re-exports
- `grep -rn "BACKEND_URL\|BACKEND_BASE_URL" src/` → solo en `src/config/backend.js`
- `npm run build` exitoso sin errores

---

## FASE 4 — Performance y Memory Leaks

**Prioridad:** ALTA — afecta experiencia de usuario

### 4.1 Corregir memory leaks en performanceMonitor.js ✅ COMPLETADO

**Archivo:** `src/utils/performanceMonitor.js`

| Línea | Problema | Corrección |
|-------|----------|-----------|
| 54 | `setInterval` cada 5s para memory tracking — nunca limpiado | Asignar a `this._memoryInterval` y limpiar en un método `destroy()` |
| 277 | `setInterval` cada 1h — nunca limpiado | Asignar a variable de módulo, exponer `cleanup()` |

### 4.2 Agregar límite y TTL a caches in-memory ✅ COMPLETADO

| Archivo | Línea | Cache | Corrección |
|---------|-------|-------|-----------|
| `src/services/termDefinitionService.js` | 8 | `_definitionCache` | Migrado a `TtlCache` con `maxEntries` y `ttlMs` |
| `src/services/segmentTextService.js` | 111 | `_cache` | Migrado a `TtlCache` con `maxEntries` y `ttlMs` |

Implementación actual:
```js
const cache = new TtlCache({ maxEntries, ttlMs });
```

### 4.3 Backend: Connection pooling para clientes AI ✅ COMPLETADO

| Archivo | Línea | Problema |
|---------|-------|---------|
| `server/controllers/chat.completion.controller.js` | 180 | `new OpenAI(...)` por cada request |
| `server/index.js` | 72 | `new OpenAI(...)` por cada `aiClient.complete()` |

**Acción:** Usar singleton de `apiClients.js` para todas las llamadas. Crear factory que cachee por `{baseURL, apiKey}`.

### 4.4 Backend: Circuit breaker para APIs externas ✅ COMPLETADO

Ningún endpoint tiene protección contra falla sostenida de OpenAI/DeepSeek/Gemini.

**Acción:** Crear `server/utils/circuitBreaker.js`:
- Estados: CLOSED → OPEN → HALF_OPEN
- Threshold: 5 fallos consecutivos → abrir circuito por 30s
- Aplicar a: `analisis.service.js`, `chat.completion.controller.js`, `preLectura.controller.js`, `notes.service.js`

**Implementación aplicada:** `server/utils/circuitBreaker.js` con estados `CLOSED → OPEN → HALF_OPEN`, threshold por defecto de 5 fallos y reapertura tras 30s. Integrado en `analisis.service.js`, `chat.completion.controller.js`, `preLectura.controller.js` y `notes.service.js`.

### 4.5 Backend: Retry con backoff para llamadas AI ✅ COMPLETADO

**Archivo existente a reusar:** `src/services/retryWrapper.js` — ya tiene exponential backoff con jitter.

**Acción:** Portar el patrón al backend como `server/utils/retryWithBackoff.js`. Aplicar a todos los `fetch`/`axios.post` hacia APIs AI.

### 4.6 Backend: Streaming para archivos grandes ✅ COMPLETADO

| Archivo | Problema |
|---------|---------|
| `server/routes/storage.routes.js:50` | `Buffer.from(await upstreamResponse.arrayBuffer())` carga todo en memoria |
| `server/routes/pdf.routes.js` | `multer.memoryStorage()` con 20MB |

**Acción:** Para storage proxy, usar streaming con `pipeline()`. Para PDF, evaluar `multer.diskStorage()` con archivos temporales.

### 4.7 Bulk evaluation secuencial → paralela ✅ COMPLETADO

**Archivo:** `server/controllers/assessment.controller.js`
**Línea:** 366 — procesa hasta 10 evaluaciones AI en serie

**Acción:** Usar `Promise.allSettled()` con concurrency limit de 3:
```js
const results = [];
for (let i = 0; i < items.length; i += 3) {
  const batch = items.slice(i, i + 3);
  results.push(...await Promise.allSettled(batch.map(evaluate)));
}
```

### 4.8 Estandarizar timeouts ✅ COMPLETADO

| Componente | Timeout actual | Timeout propuesto |
|-----------|---------------|-------------------|
| `performance.js` (global) | 120s | 120s (mantener) |
| `preLectura.controller.js` | 300s | 120s |
| `settings.js` (OpenAI) | 90s | 90s (mantener) |
| `settings.js` (DeepSeek) | 90s | 90s (mantener) |
| `glossary.controller.js` | 60s | 90s (alinear) |
| `chat.completion.controller.js` | sin timeout | 90s |

**Acción:** Centralizar en `server/config/settings.js` y que todos lean de ahí.

### 4.9 Middleware CORS: línea redundante a limpiar ✅ COMPLETADO

`server/index.js` línea 207: `app.options('*', cors())` está colocado DESPUÉS del montaje de rutas. Sin embargo, `app.use(cors(...))` en línea 128 ya maneja preflights OPTIONS implícitamente, por lo que la línea 207 es **código muerto**, no un bug funcional.

**Acción:** Eliminar la línea 207 (`app.options('*', cors())`) por ser redundante. No es necesario moverla.

### 4.10 Error handler global faltante tras rutas ✅ COMPLETADO

No existe middleware de error (4 args) después del montaje de rutas. Si un controller lanza una excepción no capturada, Express la maneja con su handler default. **Nota:** Express solo expone stack traces cuando `NODE_ENV !== 'production'`, por lo que el riesgo real no es el stack trace sino los `error.message` que los controllers devuelven explícitamente en `res.json()` (cubierto en Fase 1.1).

**Acción:** Montar el `errorHandler.js` de Fase 1 como último middleware tras todas las rutas. Es buena práctica aunque en producción Express ya suprime stacks.

**Verificación Fase 4:**
- Abrir DevTools → Memory → Take heap snapshot antes y después de 10 minutos de uso → no debe haber crecimiento sostenido
- `grep -rn "new OpenAI" server/` → solo en `apiClients.js` o factory dedicado
- Simular fallo de DeepSeek → circuit breaker debe evitar requests por 30s

---

## FASE 5 — Estandarización de API y Error Handling

### 5.1 Error envelope estándar ✅ COMPLETADO

Actualmente hay 8+ formatos de error distintos en el backend:
- `{ error: string }`
- `{ error: string, mensaje: string }`
- `{ error: string, mensaje: string, detalle: string }`
- `{ error: string, field: string }`
- `{ error: string, details: [...] }`
- `{ error: string, codigo: string }`
- `{ ok: false, error: string }`
- `{ valid: false, degraded: true, error: string }`

**Acción:** Definir en `server/utils/apiResponse.js`:
```js
export function errorResponse(res, statusCode, { code, message, details = null }) {
  return res.status(statusCode).json({
    ok: false,
    error: { code, message, ...(details && { details }) }
  });
}

export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data });
}
```

Aplicar en TODOS los controllers. No devolver `error.message` — usar códigos de error tipificados.

**Transición frontend/backend:** antes de cambiar el formato de respuesta en backend, crear un adapter en `src/services/unifiedAiService.js` que normalice ambos formatos durante la transición:
- Formato legacy: `{ error: 'mensaje' }`
- Formato nuevo: `{ ok: false, error: { code, message, details? } }`

**Requisito de rollout:** definir una ventana explícita de compatibilidad temporal y una fecha de retiro del formato viejo. No cerrar 5.1 sin esa capa de compatibilidad o sin probar todos los consumidores del frontend.

### 5.2 Estandarizar códigos de error ✅ COMPLETADO

Crear `server/constants/errorCodes.js`:
```js
export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_TIMEOUT: 'AI_TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
```

### 5.3 Corregir status codes incorrectos ✅ COMPLETADO

| Archivo | Situación | Actual | Correcto |
|---------|-----------|--------|----------|
| `server/controllers/preLectura.controller.js:260,393` | Fallback por error AI | 200 | 200 pero con campo `degraded: true` |
| `server/controllers/notes.controller.js:34-42` | API key no configurada | 500 | 503 |

### 5.4 Validación de request bodies con Zod ✅ COMPLETADO

Actualmente solo 2 endpoints usan Zod (para validar respuestas AI, no inputs).

**Acción:** Crear schemas Zod para los endpoints principales:
- `POST /api/analysis/text` → `{ texto: z.string().min(100).max(20000) }`
- `POST /api/analysis/prelecture` → similar
- `POST /api/chat/completion` → `{ messages: z.array(...).max(50), model: z.string(), provider: z.enum([...]) }`
- `POST /api/notes/generate` → schema
- `POST /api/assessment/evaluate` → schema

Crear middleware `server/middleware/validate.js`:
```js
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return errorResponse(res, 400, { ... });
  req.validatedBody = result.data;
  next();
};
```

### 5.5 Inconsistencia de modelos Gemini ✅ COMPLETADO

| Archivo | Default |
|---------|---------|
| `server/config/settings.js:13` | `gemini-1.0-pro` |
| `server/controllers/chat.completion.controller.js:25` | `gemini-1.5-flash` |
| `.env.example:69` | `gemini-1.5-pro` |

**Acción:** Definir un solo default en `settings.js` y que todos lo lean de ahí. Si la decisión vigente del proyecto ya es `gemini-2.0-flash`, actualizar el plan, `settings.js`, `chat.completion.controller.js` y `.env.example` para reflejar ese target único. No mantener defaults divergentes en documentación, código y configuración.

### 5.6 Truncación de texto inconsistente ✅ COMPLETADO

Diferentes controllers truncan el texto del usuario a longitudes distintas sin razón documentada:

| Controller | Límite |
|-----------|--------|
| `analisis.controller.js:37` | 4,000 chars |
| `glossary.controller.js:23` | min 200, sin máximo |
| `preLectura.controller.js:267` | min 100, max 18,000 (env) |
| `assessment.route.js:34-35` | 10,000 / 5,000 |
| `notes.controller.js` | sin truncación (service: 6,000) |

**Acción:** Definir límites estándar en `settings.js` y documentar por qué cada endpoint tiene un límite distinto si es necesario.

**Verificación Fase 5:**
- Todos los endpoints deben devolver `{ ok: boolean, data|error: ... }`
- `grep -rn "res\.json.*error\.message" server/` → 0 hits
- `grep -rn "res\.status(500)" server/` → solo en error handler genérico

---

## FASE 6 — Tests, CI/CD y Calidad

### 6.1 Crear GitHub Actions workflow ✅ COMPLETADO

**Archivo a crear:** `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --forceExit
      - run: npm run build
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint src/ server/ --max-warnings 0
```

### 6.2 Corregir scripts de test para multiplataforma ✅ COMPLETADO

**Archivo:** `package.json`

Actualmente usan `set NODE_OPTIONS=...` (solo Windows).

**Acción:** Instalar `cross-env` y cambiar:
```json
"test:coverage": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage"
```

### 6.3 Subir coverage threshold progresivamente 🔶 PARCIAL

| Fase | Threshold | Target |
|------|-----------|--------|
| Actual | 30% | — |
| Primer gate Fase 6 | 38-40% | Cubrir rutas críticas y piezas de infraestructura |
| Cierre Fase 6 | 45% | Cubrir además componentes y flujos prioritarios |
| Fase 7+ | 60% | Cubrir componentes principales |

**Nota de realismo:** no asumir que 45% llegará solo por inercia. El salto debe apoyarse en tests de backend, middleware, auth, rutas críticas y algunos flujos UI de alto impacto antes de intentar cubrir componentes pesados como `PreLectura.js` o `TeacherDashboard.js`.

### 6.4 ESLint: cambiar warn a error + agregar plugins ⬜ PENDIENTE

**Archivo:** `package.json` o `.eslintrc`

- Cambiar todas las reglas de `warn` a `error`
- Agregar `eslint-plugin-react-hooks` (reglas de dependencias de hooks)
- Agregar `eslint-plugin-jsx-a11y` (accesibilidad)
- `jest-axe` está instalado pero nunca usado — agregar a al menos 5 tests de componentes

### 6.5 Tests prioritarios a escribir 🔶 PARCIAL

| Componente | Tipo | Justificación |
|-----------|------|---------------|
| `server/middleware/errorHandler.js` | Unit | Verificar que no filtra error.message |
| `server/middleware/firebaseAuth.js` | Unit | Auth es crítico |
| `src/context/SessionContext.js` | Unit | Nuevo contexto (post-split) |
| `src/components/PreLectura.js` | Integration | 1,720 líneas sin test |
| `src/components/SistemaEvaluacion.js` | Integration | Flow crítico de evaluación |
| `src/components/teacher/TeacherDashboard.js` | Integration | ~4,500 líneas sin test |
| Auth flows (Login/Register) | E2E | Zero coverage actual |
| AI chat flow | Integration | Path principal de la app |
| Backend Express routes | Unit | Zero coverage en server/ |

### 6.6 Limpiar archivos basura del repo 🔶 PARCIAL

| Archivos a eliminar | Motivo |
|---------------------|--------|
| `diff-*.txt` en raíz | Residuos de desarrollo |
| `SistemaEvaluacion.test.js.backup` | Backup en repo |
| `SistemaEvaluacion.test.js.new` | Archivo temporal |
| `src/__tests__/netUtils.test.js` | Solo contiene `expect(true).toBe(true)` |
| `tests/PROGRESS_REPORT.md` | Reporte obsoleto |
| `tests/FINAL_SUCCESS_REPORT.md` | Reporte obsoleto |
| `PROMPTS_*.backup` | Backups en raíz |

### 6.7 Corregir README con datos reales de coverage ✅ COMPLETADO

El README afirma 95% statements pero la realidad es ~74% pass rate con threshold de 30%.

### 6.8 Integrar react-doctor en CI (del plan react-doctor existente) ✅ COMPLETADO

**Acción:** Agregar paso en CI:
```yaml
- run: npx -y react-doctor@latest src/ --verbose
```
Con umbrales:
- Fallar PR si `duplicates > 0`
- Fallar PR si `files` o `exports` warnings aumentan contra baseline

### 6.9 Resolver exports duplicados (del plan react-doctor) ✅ COMPLETADO

12 casos `Duplicate export: X|default` identificados. Definir convención única:
- Hooks: named export
- Services: named export
- Componentes: default export
- Utilidades: named export

**Verificación Fase 6:**
- GitHub Actions pasa en verde para push a main
- `npm test` funciona en Linux y Windows
- Coverage mínimo 45% se cumple
- `npx eslint src/ server/ --max-warnings 0` pasa
- `react-doctor` duplicates = 0

---

## FASE 7 — Estilos, Temas y Limpieza Final

### 7.1 Unificar mecanismo de dark mode ⬜ PENDIENTE

Actualmente hay 3 mecanismos compitiendo:
1. `ThemeProvider` de styled-components (activo y principal)
2. `.dark-mode` CSS class (legacy, en `index.css`)
3. `[data-theme="dark"]` attribute selector (obsoleto)

**Acción:** Eliminar los selectores `.dark-mode` y `[data-theme="dark"]` de todos los CSS. Solo usar `theme` via `ThemeProvider`.

### 7.2 Agregar propiedades de tema faltantes ⬜ PENDIENTE

15+ componentes referencian `textPrimary`, `danger`, `surfaceVariant` que no existen en `src/styles/theme.js`.

**Acción:** Agregar las propiedades faltantes a ambos temas (light y dark) en `theme.js`:
```js
textPrimary: '#1a1a2e',    // light
textPrimary: '#e0e0e0',    // dark
danger: '#dc3545',
surfaceVariant: '#f5f5f5',  // light
surfaceVariant: '#2a2a3e',  // dark
```

### 7.3 Unificar breakpoints ⬜ PENDIENTE

4 breakpoints no estándar (720px, 860px, 992px, 1200px) usados fuera del sistema de tema.

**Acción:** Definir breakpoints en `theme.js` y usar exclusivamente esos:
```js
breakpoints: { sm: '576px', md: '768px', lg: '992px', xl: '1200px' }
```

### 7.4 framer-motion + prefers-reduced-motion ⬜ PENDIENTE

CSS media queries no afectan animaciones JavaScript.

**Acción:** Agregar verificación en componentes con framer-motion:
```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Usar variantes sin animación cuando es true
```

### 7.5 Resolver conflicto de focus-visible ⬜ PENDIENTE

| Archivo | Estilo |
|---------|--------|
| `src/styles/index.css` | `3px #4d90fe` |
| `src/styles/a11y.css` | `2px #3498db` |

**Acción:** Definir en `a11y.css` (es el archivo de accesibilidad canónico) y eliminar de `index.css`.

### 7.6 Eliminar colores hardcodeados en styled-components ⬜ PENDIENTE

| Archivo | Problema |
|---------|---------|
| `src/components/ui/FormComponents.styled.js` | Colores hex directos |
| `src/components/feedback/FeedbackDisplay.styled.js` | Colores hex directos |
| `src/components/auth/Login.js` | Palette propia `const C = {…}` sin dark mode |

**Acción:** Reemplazar todos los colores hardcodeados por `${({ theme }) => theme.propiedad}`.

### 7.7 Reducir !important rules (33 encontradas) ⬜ PENDIENTE

22 en CSS, 11 en JS. Revisar cada una — la mayoría se resuelven aumentando la especificidad del selector.

### 7.8 Corregir cache rota en pedagogía ⬜ PENDIENTE

**Archivo:** `src/pedagogy/rubrics/` (función `getCriteriaByDimension`)

El `Map` se crea DENTRO de la función — se recrea en cada llamada, nullificando el cache.

**Acción:** Mover el Map a nivel de módulo.

### 7.9 Alinear 5ta dimensión de rúbrica ⬜ PENDIENTE

JSON tiene 5 dimensiones, JS tiene 4. La 5ta (metacognición ética AI) existe en UI pero sin pathway de evaluación completo.

**Acción:** Decidir si activar (agregar pathway) o retirar de UI.

### 7.10 Código muerto a eliminar ⬜ PENDIENTE

| Archivo | Elemento | Motivo |
|---------|----------|--------|
| `src/utils/accessibility.js:252` | `useScreenReaderAnnounce` | Nunca importado |
| `src/services/analyticsService.js:342` | `exportToJSON` | Marcado `@deprecated`, nunca usado |
| `src/hooks/notes/useNotasEstudioHook.js:567-577` | useEffect comentado | Dead code |
| `src/utils/migrateActivityData.js` | completo | Migración one-off completada |
| `server/index.js:6` | `import multer` | Nunca usado (línea 45 también) |
| `server/index.js:8` | `// import pdf from 'pdf-parse'` | Import comentado |
| `server/controllers/assessment.controller.js:1` | `import { buildEvaluatorPrompt, getEvaluationSchema }` | Nunca usados |
| `server/services/notes.service.js:3` | `import fetch from 'node-fetch'` | Usar native fetch de Node 18+ |
| `server/controllers/preLectura.controller.js:83-86` | JSDoc duplicado | Doble `/** Intenta reparar JSON truncado */` |
| `server/controllers/preLectura.controller.js:100-113` | Lógica comentada | Bloque que no hace nada |

### 7.11 Resolver inconsistencia de import style de firebaseAuth ⬜ PENDIENTE

Algunos archivos importan como default, otros como named:
```js
import requireFirebaseAuth from ...       // default
import { requireFirebaseAuth } from ...   // named
```

**Acción:** Elegir una convención (named export preferido) y aplicar consistentemente. Eliminar el `export default` duplicado.

### 7.12 Limpiar ruido en raíz del proyecto 🔶 PARCIAL

Archivos que no deberían estar en raíz:
- `ARQUITECTURA.md` → mover a `docs/`
- `CONFIGURACION_APIS.md` → mover a `docs/`
- `PROMPTS_*.md` → mover a `docs/`
- Todos los `diff-*.txt` → eliminar
- Todos los `*.backup` → eliminar

### 7.13 Actualizar ARQUITECTURA.md 🔶 PARCIAL

El documento describe un sistema centralizado en `useApiConfig` que **no existe**. La delegación real pasa por `unifiedAiService.js`.

**Acción:** Reescribir secciones para reflejar la arquitectura real post-correcciones.

### 7.14 Resolver naming confuso de dos sessionManagers ⬜ PENDIENTE

- `src/firebase/sessionManager.js` — Login session management (single-session enforcement, heartbeat)
- `src/services/sessionManager.js` — Work session persistence (localStorage + Firestore, tombstones)

**Acción:** Renombrar para clarificar:
- `src/firebase/sessionManager.js` → `src/firebase/loginSessionManager.js`
- `src/services/sessionManager.js` → `src/services/workSessionManager.js`

### 7.15 Resolver dual auth export ⬜ PENDIENTE

`auth` se exporta desde `src/firebase/config.js` Y desde `src/firebase/auth.js`.

**Acción:** Exportar solo desde `auth.js`. Que `config.js` no exporte `auth`.

### 7.16 Eliminar side effects en imports ⬜ PENDIENTE

| Archivo | Línea | Side effect |
|---------|-------|-------------|
| `src/constants/timeoutConstants.js` | 29 | `logger.log()` al importar |
| `src/context/AppContext.js` | 51 | `logger.log()` al importar |

**Acción:** Mover logs a funciones de inicialización explícita, no a nivel de módulo.

### 7.17 Detección Bloom mejorable ⬜ PENDIENTE

`"por qué"` siempre trigger nivel 4 (Análisis) aunque sea pregunta fáctica.

**Acción:** Agregar contexto adicional al matching — verificar si hay marcadores de análisis genuino (comparar, contrastar, examinar) vs preguntas simples de causa-efecto.

### 7.18 Regex de nominalización con falsos positivos ⬜ PENDIENTE

`\b\w+(ción|miento|dad)\b` genera falsos positivos abundantes.

**Acción:** Agregar stoplist de palabras comunes (educación, conocimiento, ciudad, etc.) o usar un diccionario de nominalizaciones conocidas.

**Verificación Fase 7:**
- Toggle dark/light mode funciona en todas las pantallas
- `grep -rn "\.dark-mode\|data-theme" src/styles/` → 0 hits
- `grep -rn "!important" src/` → reducido a < 10
- `npm run build` exitoso
- Lighthouse accessibility score > 90

---

## RESUMEN DE ARCHIVOS NUEVOS A CREAR

| Archivo | Fase | Propósito |
|---------|------|-----------|
| `server/middleware/errorHandler.js` | 1 | Error handler global |
| `server/constants/errorCodes.js` | 5 | Códigos de error tipificados |
| `server/utils/apiResponse.js` | 5 | Envelope estándar |
| `server/utils/envUtils.js` | 3 | `parseBooleanEnv` unificado |
| `server/utils/modelUtils.js` | 3 | `parseAllowedModels`, `pickAllowedModel` |
| `server/utils/circuitBreaker.js` | 4 | Circuit breaker para APIs |
| `server/utils/retryWithBackoff.js` | 4 | Retry con exponential backoff |
| `server/services/aiClient.service.js` | 3 | Singleton AI client |
| `server/services/webCache.service.js` | 2 | Cache de web search |
| `server/services/jsonRepair.service.js` | 2 | Reparación JSON truncado |
| `server/services/preLectura.service.js` | 2 | Business logic extraída |
| `server/services/webSearch.service.js` | 2 | searchWebSources extraído |
| `server/middleware/validate.js` | 5 | Validación Zod de requests |
| `src/config/backend.js` | 2 | BACKEND_URL centralizado |
| `src/context/SessionContext.js` | 2 | Contexto de sesiones |
| `src/context/ReadingContext.js` | 2 | Contexto de lectura |
| `src/context/AnalysisContext.js` | 2 | Contexto de análisis |
| `src/context/ProgressContext.js` | 2 | Contexto de progreso |
| `src/context/UIContext.js` | 2 | Contexto de UI |
| `src/utils/hash.js` | 3 | Hash functions unificadas |
| `src/utils/dateUtils.js` | 3 | `toMillis` y similares |
| `src/utils/LRUCache.js` | 4 | Cache con límite y TTL |
| `.github/workflows/ci.yml` | 6 | Pipeline CI/CD |

## RESUMEN DE ARCHIVOS A ELIMINAR

| Archivo | Motivo |
|---------|--------|
| `diff-*.txt` (raíz) | Residuos |
| `*.backup` (raíz) | Backups |
| `SistemaEvaluacion.test.js.backup` | Backup |
| `SistemaEvaluacion.test.js.new` | Temporal |
| `tests/PROGRESS_REPORT.md` | Obsoleto |
| `tests/FINAL_SUCCESS_REPORT.md` | Obsoleto |
| `src/utils/migrateActivityData.js` | One-off completado |
| `src/__tests__/netUtils.test.js` | Test placeholder vacío |

## RESUMEN DE ARCHIVOS A RENOMBRAR

| Archivo actual | Nombre nuevo | Motivo |
|---------------|-------------|--------|
| `src/firebase/sessionManager.js` | `src/firebase/loginSessionManager.js` | Clarificar vs work session |
| `src/services/sessionManager.js` | `src/services/workSessionManager.js` | Clarificar vs login session |

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
Track 0 (Quick Wins)   ██████████  ✅ COMPLETADO
Fase 1 (Seguridad)     █████████░  ~93% — falta: window.__rewardsEngine → se resuelve en Fase 2.1
Fase 5 (API Standard)  ██████████  ✅ COMPLETADO
Fase 3 (Duplicación)   █████████░  ~92% — falta: limpieza final de aliases/hash legacy no críticos
Fase 4 (Performance)   ██████████  ✅ COMPLETADO
Fase 6 (CI/CD+Tests)   ██████░░░░  ~67% — falta: ESLint strict, coverage 45%, más tests
Fase 2 (Arquitectura)  ██░░░░░░░░  ~21% — falta: firestore split, preLectura, AppContext, Router
Fase 7 (Estilos+Clean) ░░░░░░░░░░  ~3%  — todo pendiente
```

Lectura práctica del orden:
- Seguir primero el orden por `Track`.
- Usar las `Fases` como checklist temática para no dejar dominios sin cubrir.
- Dentro de Fase 2, ejecutar siempre `2A → 2B → 2C/2D → 2E`, no en paralelo.

## CRITERIO DE CIERRE

El plan se considera cerrado cuando:
- [ ] 0 error.message filtrados al cliente
- [ ] 0 globals de debug en producción
- [ ] 0 backdoors de testing accesibles en producción
- [ ] Existe baseline y comparación posterior de profiler para los cambios de estado global
- [ ] 0 re-renders claramente innecesarios en flujos críticos medidos con React DevTools Profiler
- [ ] Firestore operations agrupadas por dominio en módulos separados
- [ ] 0 funciones hash duplicadas
- [ ] 1 sola definición de BACKEND_URL
- [ ] CI/CD pasa en verde (GitHub Actions)
- [ ] Coverage >= 45%
- [ ] ESLint con 0 warnings
- [ ] react-doctor duplicates = 0
- [ ] Todos los endpoints usan envelope estándar `{ ok, data|error }` o existe una capa de compatibilidad temporal explícita
- [ ] Dark mode funciona sin mecanismos legacy
- [ ] ARQUITECTURA.md refleja el código real
- [ ] 0 archivos basura (diff, backup, reports obsoletos) en el repo

---

## TRACKS DE EJECUCIÓN RECOMENDADOS

Este plan es demasiado grande para una sola ola. Se recomienda dividir en 3 tracks paralelos con un **track 0** de quick wins que debe completarse primero:

### Track 0 — Quick Wins (prerequisito) ✅ COMPLETADO
Derivado del análisis react-doctor. Bajo riesgo, alto impacto medible.
1. Resolver 12 exports duplicados (`Duplicate export: X|default`)
2. Decision gate Web Search: activar o retirar flujo huérfano (4 archivos)
3. Limpieza de exports sin uso en top-10 archivos de mayor concentración
4. Eliminar archivos basura (diff-*.txt, *.backup, reports obsoletos)

**Criterio de salida Track 0:** react-doctor duplicates = 0, archivos huérfanos resueltos.

### Track A — Seguridad + API (Fases 1, 5) ✅ COMPLETADO
Puede ejecutarse inmediatamente tras Track 0.
- `A1` Saneamiento urgente: error handler global, fugas `error.message`, backdoor, globals y `admin-cleanup`
- `A2` Robustez auth: migración a `firebase-admin` y endurecimiento restante
- `A3` Contrato API: envelope estándar, error codes y Zod validation con transición controlada frontend/backend

**Salida mínima de `A3`:** backend emite envelope consistente y `src/services/unifiedAiService.js` acepta tanto el formato nuevo como el legado durante la ventana de transición.

**Checkpoint de cierre parcial alcanzado (2026-03-09):**
- `notes.controller.js`, `assessment.controller.js` y `glossary.controller.js` ya emiten errores sanitizados y alineados sobre `codigo`/`mensaje`.
- `src/services/unifiedAiService.js` ya normaliza payloads legacy y payloads nuevos durante la transición.
- Suite completa ejecutada en verde: `54/54` suites, `268/268` tests.
- `A2` permanece deliberadamente fuera de este cierre: la migración de `firebaseAuth` a `firebase-admin` requiere prerrequisitos operativos separados y no debe mezclarse con el cierre del contrato HTTP.

**Checkpoint A2 iniciado (2026-03-09):**
- `server/middleware/firebaseAuth.js` ya migró de validación JWT manual a `firebase-admin`.
- El backend responde `503` con `codigo=FIREBASE_ADMIN_NOT_CONFIGURED` cuando la autenticación está forzada pero faltan credenciales de backend.
- Se agregaron tests dedicados del middleware y documentación operativa para `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_SERVICE_ACCOUNT_BASE64`.
- Validación focalizada en verde; la suite completa mostró una falla aislada y no reproducible en sync (`useTutorPersistence.sync`), actualmente tratada como inestabilidad ajena a A2.

### Track B — Deduplicación + Performance (Fases 3, 4) 🔶 PARCIAL
Puede ejecutarse en paralelo con Track A.
- `B1` Bajo riesgo: `BACKEND_URL`, hashes, `envUtils`, `modelUtils`, cleanup de duplicaciones directas
- `B2` Riesgo medio: AI client singleton, caches con TTL/límite, connection pooling, retry con backoff, timeouts, streaming
- `B3` Riesgo mayor o condicional: circuit breaker y otras capas de resiliencia avanzada

**Regla de priorización de `B`:** no introducir circuit breaker antes de cerrar `B1` y `B2`. El retorno inmediato está en deduplicación simple, retry y pooling; la resiliencia con estado se deja para una etapa posterior o para producción si la telemetría lo justifica.

### Track C — Arquitectura + Calidad (Fases 2, 6, 7) 🔶 PARCIAL
Requiere Track 0 completado. Track A y B ayudan pero no son bloqueantes estrictos.
- `C1` Reorganización segura: split de `firestore.js`, centralización de `BACKEND_URL`, documentación real
- `C2` Calidad: CI/CD, ESLint, tests prioritarios y baseline de profiler
- `C3` Refactor mayor: sincronización, `AppContext.js` y luego Router
- `C4` Estilos y limpieza final

**Gate explícito para `C3`:** no iniciar el split de `AppContext.js` ni la migración completa a Router sin haber validado antes persistencia, autosave, restauración de sesión y contratos de datos entre frontend y backend.
