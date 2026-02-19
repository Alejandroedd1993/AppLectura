# Verificación Forense del Informe de Auditoría — 18/02/2026

## Metodología
Se verificó **cada hallazgo** del `INFORME_AUDITORIA_CORREGIDA_2026-02-17.md` directamente contra el código fuente, el índice de Git y los archivos del sistema de archivos. Se usaron: `git ls-files`, `grep` en código fuente, inspección directa de archivos de rutas, middleware y servicios.

---

## Resumen ejecutivo

| # | Hallazgo del informe | Veredicto | Severidad |
|---|-----|-----|-----|
| 1.1 | .env/.env.production en Git | ✅ **CONFIRMADO** | 🔴 Crítico |
| 1.1 | node_modules en Git (69,004) | ✅ **CONFIRMADO** | 🔴 Crítico |
| 1.1 | Archivos test-* en public/ | ✅ **CONFIRMADO** | 🟡 Medio |
| 1.2 | Endpoints sin auth ni rate-limit | ✅ **CONFIRMADO** (lista explícita correcta) | 🔴 Crítico |
| 1.3 | Llamadas relativas /api en frontend vivo | ⚠️ **PARCIALMENTE CORRECTO** (2 activos en prod, no 3) | 🟠 Alto |
| 1.4 | Dead code backend (4 archivos) | ✅ **CONFIRMADO** | 🟡 Medio |
| 1.4 | Dead code frontend (84 archivos) | ⚠️ **NO VERIFICABLE sin lista** (🆕 5 verificados) | 🟡 Medio |
| 1.5 | AppContext.js y TeacherDashboard.js sobredimensionados | ✅ **CONFIRMADO** | 🟡 Medio |

**Precisión global del informe: ~80%** — Los hallazgos principales son correctos. La sección 1.3 tiene un falso positivo en TutorCore pero el diagnóstico general es correcto. La sección 1.2 era más precisa de lo que indicó esta verificación inicialmente.

---

## 1. Verificación detallada hallazgo por hallazgo

### 1.1 Seguridad y operación — ✅ CONFIRMADO

#### .env y .env.production trackeados en Git
**Veredicto: CONFIRMADO**

```
> git ls-files .env .env.production
.env
.env.production
```

Ambos archivos están efectivamente en el índice de Git. Sin embargo, el `.gitignore` actual (líneas 11 y 16) **sí los excluye**:

```gitignore
.env
.env.production
```

**Diagnóstico**: Los archivos fueron commiteados *antes* de que se agregaran al `.gitignore`. El `.gitignore` solo previene cambios *futuros*, pero no retira archivos ya trackeados. Se requiere `git rm --cached` para remediar. **El informe es correcto.**

#### node_modules versionado en Git
**Veredicto: CONFIRMADO**

```
> git ls-files node_modules | Measure-Object -Line
69004
```

Exactamente 69,004 entradas, como indica el informe. Confirmado al 100%.

#### Archivos de prueba en public/
**Veredicto: CONFIRMADO**

Los tres archivos existen en el sistema de archivos:
- `public/test-env.html` ✅
- `public/test-sync.html` ✅  
- `public/test-cross-device-sync.js` ✅

Estos archivos serían desplegados en Firebase Hosting y accesibles públicamente.

---

### 1.2 Backend — Seguridad de endpoints — ✅ CONFIRMADO

El informe afirma que estos endpoints carecen de auth y rate-limit:
- `POST /api/process-pdf`
- `POST /api/detect-tables`
- `POST /api/ocr-image`
- `GET /api/storage/proxy`

#### Evidencia encontrada:

**Rutas SIN auth ni rate-limit (CONFIRMADO):**

| Archivo de ruta | Usa `requireFirebaseAuth`? | Usa rate-limiter? |
|---|---|---|
| `pdf.routes.js` (`/process-pdf`, `/detect-tables`) | ❌ NO | ❌ NO |
| `ocr.routes.js` (`/ocr-image`) | ❌ NO | ❌ NO |
| `storage.routes.js` (`/storage/proxy`) | ❌ NO | ❌ NO |

**Esto está CONFIRMADO. Estos 4 endpoints están realmente desprotegidos.**

**Rutas que SÍ tienen auth y rate-limit (contexto adicional):**

| Archivo de ruta | Auth | Rate-limit |
|---|---|---|
| `chat.completion.routes.js` | ✅ `requireFirebaseAuth` | ✅ `chatLimiter` |
| `analisis.routes.js` | ✅ `requireFirebaseAuth` | ✅ `analysisLimiter` |
| `notes.routes.js` | ✅ `requireFirebaseAuth` | ✅ `notesLimiter` |
| `webSearch.routes.js` | ✅ `requireFirebaseAuth` | ✅ `webSearchLimiter` |
| `assessment.route.js` | ✅ `requireFirebaseAuth` | ✅ `assessmentLimiter` |

⚠️ **CORRECCIÓN (2026-02-18 08:50):** El informe original lista explícitamente los 4 endpoints desprotegidos — no afirma que "todo el backend" esté abierto. La crítica anterior de esta verificación ("parcialmente correcto" y "sobreestimado") era **injusta**. El informe es correcto y preciso en esta sección. Se incluye la tabla de endpoints protegidos como contexto adicional.

**Nota adicional sobre multer**: El informe menciona "upload sin límites explícitos de tamaño". Confirmado: `multer()` sin opciones en `pdf.routes.js` y `ocr.routes.js` no establece `limits.fileSize`, lo cual es correcto como hallazgo.

---

### 1.3 Bugs funcionales — Llamadas relativas /api — ⚠️ PARCIALMENTE CORRECTO

El informe lista estos archivos con llamadas relativas `/api`:
1. `src/services/webSearchService.js`
2. `src/components/tutor/TutorCore.js`
3. `src/components/ReadingWorkspace.js`

#### 🆕 Impacto real en producción — Evidencia de `firebase.json`

El `firebase.json` de Firebase Hosting tiene esta configuración de rewrites:

```json
"rewrites": [
  { "source": "**", "destination": "/index.html" }
]
```

**No existe proxy en Firebase Hosting** — no hay rewrite hacia el backend. Esto significa que en producción, cualquier `fetch('/api/...')` con ruta relativa **recibirá `index.html` como respuesta con HTTP 200**, causando **fallos silenciosos** (HTML donde se espera JSON).

**⚠️ CORRECCIÓN (2026-02-18 08:50):** En desarrollo local, SÍ existe un proxy CRA configurado en `package.json` línea 86 (`"proxy": "http://localhost:3001"`) y un `src/setupProxy.js` que enruta `/api` al backend. Esto explica por qué las rutas relativas funcionan en desarrollo pero **no en producción** (Firebase Hosting no usa el proxy de CRA). La afirmación anterior de que "no hay proxy en package.json" era **incorrecta**.

#### Evidencia encontrada:

**`src/services/webSearchService.js`** — ✅ **CONFIRMADO**

```javascript
// Línea 69: searchWeb()
const response = await fetchWithTimeout('/api/web-search', { ... });

// Línea 287: checkBackendAvailability()
const response = await fetchWithTimeout('/api/web-search/test', { ... });
```

Usa `fetchWithTimeout` de `netUtils.js`, que internamente llama `fetch(resource, ...)` — NO prepone `BACKEND_URL`. **CONFIRMADO como bug activo.**

**`src/components/tutor/TutorCore.js`** — ⚠️ **PARCIALMENTE CORRECTO**

```javascript
// Línea 606 — callBackendWith():
const res = await fetch(`${backendUrl}/api/chat/completion`, { ... });
// ☝️ USA backendUrl — NO es relativa. CORRECTO.

// Línea 1068 — dentro de sendAction (web enrichment):
const response = await fetch('/api/web-search', { ... });
// ☝️ ESTA SÍ es relativa. PERO está detrás de:
const ENABLE_WEB_ENRICHMENT = false; // línea 1046
```

**Corrección**: La llamada principal (`/api/chat/completion`) **YA USA `backendUrl`** — el informe original es INCORRECTO aquí. Solo la llamada a web-search es relativa, y está **deshabilitada por feature flag**.

**`src/components/ReadingWorkspace.js`** — ✅ CONFIRMADO

```javascript
// Línea 304:
fetch('/api/web-search/test')
```

Llamada relativa directa sin `backendUrl`. **CONFIRMADO** como bug funcional activo en producción.

#### 🆕 Archivos adicionales con rutas relativas (no mencionados en el informe original)

Durante la segunda verificación se descubrieron **2 archivos adicionales** con el mismo patrón:

**`src/hooks/useTextAnalysis.js`** — ⚠️ **RUTA RELATIVA CONFIRMADA, pero en cadena legacy/inalcanzable**

```javascript
// Línea 126:
const res = await fetchWithTimeout('/api/analysis/text', { ... });
```

⚠️ **CORRECCIÓN (2026-02-18 08:50):** Este hook es importado únicamente por `LegacyAnalisisTexto.js`, el cual **no es importado por ningún archivo activo** en el grafo alcanzable desde `App.js`. Por lo tanto, `useTextAnalysis.js` no está en el runtime activo de producción — está en una cadena legacy/deprecada. El bug es real (ruta relativa) pero **no afecta a usuarios reales actualmente**.

**`src/services/webContextService.js`** — ⚠️ **RUTA RELATIVA CONFIRMADA, pero en cadena legacy/inalcanzable**

```javascript
// Línea 163:
const response = await fetchWithTimeout('/api/web-search', { ... });
```

⚠️ **CORRECCIÓN (2026-02-18 08:50):** Importado por `deepAnalysisService.js` e `intelligentAnalysisService.js`, ninguno de los cuales tiene imports activos desde el árbol de componentes principal. Misma situación que `useTextAnalysis.js`: ruta relativa real, pero en cadena huérfana.

#### Resumen completo de rutas relativas (actualizado con correcciones):

| Archivo | Ruta relativa | ¿En runtime activo? | Veredicto |
|---|---|---|---|
| `webSearchService.js` | `/api/web-search`, `/api/web-search/test` | ✅ Sí | ✅ BUG ACTIVO |
| `ReadingWorkspace.js` | `/api/web-search/test` | ✅ Sí | ✅ BUG ACTIVO |
| `TutorCore.js` (chat/completion) | N/A (usa `backendUrl`) | ✅ Sí | ❌ FALSO POSITIVO |
| `TutorCore.js` (web-search) | `/api/web-search` | ❌ No (flag=false) | ⚠️ Riesgo latente |
| `useTextAnalysis.js` | `/api/analysis/text` | ❌ No (cadena legacy) | ⚠️ Riesgo latente (🆕→corregido) |
| `webContextService.js` | `/api/web-search` | ❌ No (cadena legacy) | ⚠️ Riesgo latente (🆕→corregido) |

**Corrección al informe original**: Son **2 archivos realmente activos en prod** con rutas relativas (`webSearchService.js` y `ReadingWorkspace.js`), no 3. El patrón correcto ya existe en `AppContext.js`, `backendUtils.js`, `glossaryService.js`, `textStructureService.js` y `TutorDock.js` que SÍ usan `BACKEND_URL`.

---

### 1.4 Código muerto confirmado — ✅ CONFIRMADO (backend + frontend parcial)

**Backend — 4 archivos:**

| Archivo | ¿Existe? | ¿Importado en `server/index.js`? | ¿Importado en algún otro archivo? | Veredicto |
|---|---|---|---|---|
| `server/routes/health.routes.js` | ✅ | ❌ (health definido inline en index.js) | ❌ | ✅ DEAD CODE |
| `server/routes/preLectura.routes.js` | ✅ | ❌ | ❌ | ✅ DEAD CODE |
| `server/controllers/chatController.js` | ✅ | ❌ (usa `chat.completion.controller.js`) | ❌ | ✅ DEAD CODE |
| `server/services/deepseek.service.js` | ✅ | ❌ | ❌ | ✅ DEAD CODE |

Los 4 archivos existen físicamente pero **ninguno es importado** desde `server/index.js` ni desde ningún otro archivo activo. El `server/index.js` define las rutas de health inline (líneas 160-183) y usa `chat.completion.controller.js` en vez de `chatController.js`.

**Frontend — 84 archivos (del informe original):**  
⚠️ **NO VERIFICABLE** — El informe no lista los 84 archivos específicos.

#### 🆕 Frontend — 5 archivos dead code verificados (segunda auditoría)

Durante la segunda verificación forense se confirmaron **5 archivos frontend** como código muerto:

| Archivo | Tamaño | ¿Alguien lo importa? | Motivo | Veredicto |
|---|---|---|---|---|
| `src/components/BitacoraEticaIA.js` | 800 líneas | ❌ Nadie | `Actividades.js` L32 importa desde `./artefactos/BitacoraEticaIA`. La versión en `src/components/` no es referenciada por ningún import activo. | ✅ DEAD CODE (shadow orphan) |
| `src/components/LecturaInteractiva.js` | 9 líneas (mock) | ❌ Nadie | `App.js` L117: `// ELIMINADO: LecturaInteractiva deprecada`. Solo `App.test.js` lo referencia con `jest.mock()`. | ✅ DEAD CODE |
| `src/components/AnalisisTexto.js` | 9 líneas (mock) | ❌ Nadie | Solo `App.test.js` L94 lo referencia con `jest.mock()`. | ✅ DEAD CODE |
| `src/components/CargaTexto.js` | **0 bytes** | ❌ Nadie | `App.js` L22: `import CargaTexto from './components/CargaTexto_responsive'`. El archivo vacío es un vestigio. | ✅ DEAD CODE |
| `src/hooks/useAnalysisPersistence.js` | 59 líneas | ❌ Nadie | Solo `useActivityPersistence.js` lo menciona en un comentario L4: `Diferencias con useAnalysisPersistence`. Sin ningún import activo. Reemplazado por `useActivityPersistence`. | ✅ DEAD CODE |

**Nota sobre `BitacoraEticaIA.js`**: Este es un caso de **"shadow orphan"** — un archivo de 800 líneas que fue reemplazado por una versión refactorizada en `src/components/artefactos/BitacoraEticaIA.js` (con integración de `useActivityPersistence`, recompensas, etc.) pero el archivo original nunca fue eliminado. Ambos archivos coexisten pero solo el de `artefactos/` se usa.

---

### 1.5 Deuda técnica — ✅ CONFIRMADO

| Archivo | Tamaño |
|---|---|
| `src/context/AppContext.js` | **230,639 bytes** (~5,500+ líneas) |
| `src/components/teacher/TeacherDashboard.js` | **150,859 bytes** (~3,500+ líneas) |

Ambos archivos son extraordinariamente grandes. El diagnóstico del informe es correcto: alto acoplamiento y difícil mantenimiento.

---

## 2. Verificación de hallazgos descartados (falsos positivos)

### 2.1 "No hay API keys en env del frontend"
**Veredicto del informe: Descartado como problema → ✅ CORRECTO**

La arquitectura es correcta: el frontend usa `REACT_APP_BACKEND_URL` y las claves privadas (OpenAI, DeepSeek, Gemini, Tavily) están solo en el backend (Render).

### 2.2 y 2.3 — Referencias textuales y wrappers legacy
**No verificado en detalle** — Se aceptan como razonables dado que el informe los marca como falsos positivos descartados.

---

## 3. Hallazgos adicionales NO mencionados en el informe

Durante la verificación forense, encontré estos problemas que el informe **no menciona**:

### 3.1 🔴 `ENFORCE_FIREBASE_AUTH` bypass en desarrollo
El middleware `firebaseAuth.js` (líneas 96-109) desactiva la autenticación cuando `NODE_ENV` es `development` o `test`, O cuando `ENFORCE_FIREBASE_AUTH` no está explícitamente en `true`:

```javascript
const rawEnforce = String(
  process.env.ENFORCE_FIREBASE_AUTH ?? (isLocalLikeEnv ? 'false' : 'true')
).trim().toLowerCase();
```

**Riesgo teórico**: Si Render no tiene `NODE_ENV=production` o `ENFORCE_FIREBASE_AUTH=true`, toda la auth queda deshabilitada.

⚠️ **CORRECCIÓN (2026-02-18 08:50) — Riesgo mitigado por configuración actual:** El `render.yaml` (líneas 13-14 y 27-28) define explícitamente:
```yaml
- key: NODE_ENV
  value: production
- key: ENFORCE_FIREBASE_AUTH
  value: "true"
```
Por lo tanto, en el despliegue actual de Render, la auth está **activa**. El riesgo persiste solo si alguien modifica la configuración del dashboard de Render directamente sin actualizar `render.yaml`.

### 3.2 � `preLectura.controller.js` — Aclaración de atribución
El `server/controllers/preLectura.controller.js` existe (62,733 bytes). Es importado activamente por `analisis.routes.js`:

```javascript
// analisis.routes.js, línea 4:
import { analyzePreLecture } from '../controllers/preLectura.controller.js';
// analisis.routes.js, línea 17:
router.post('/prelecture', requireFirebaseAuth, analysisLimiter, analyzePreLecture);
```

**Resultado**: `preLectura.routes.js` SÍ es dead code (el archivo de rutas está huérfano), pero **`preLectura.controller.js` NO es dead code** — es importado activamente.

⚠️ **CORRECCIÓN (2026-02-18 08:50) — Error de atribución:** El informe original (línea 39: `server/routes/preLectura.routes.js`) **sí marcaba solo las RUTAS** como dead code, no el controlador. La versión anterior de esta verificación sugirió incorrectamente que el informe había marcado el controlador como muerto. El informe original era correcto en este punto.

### 3.3 🟡 Endpoint `/api/web-search/test` sin auth — ✅ CONFIRMADO
Verificado en `webSearch.routes.js` línea 28: el endpoint GET `/test` está definido como handler inline **sin `requireFirebaseAuth`** ni rate-limiter, a diferencia de las rutas POST que sí los usan. Esto expone información de configuración del servidor (qué APIs están disponibles) sin autenticación. ReadingWorkspace lo llama sin headers de auth (línea 304).

### 3.4 🟡 `storage.routes.js` — SSRF parcialmente mitigada
El proxy de storage tiene validación de URL (`isAllowedStorageUrl`) que solo permite dominios de Firebase Storage. Esto mitiga parcialmente el riesgo de SSRF abierto. El informe no menciona esta mitigación existente.

### 3.5 🔴 Credenciales hardcodeadas en repositorio (🆕 Tercera verificación)

**Hallazgo crítico** descubierto durante el peer review:

**`scripts/provision-expert-users.ps1`** — ✅ **Trackeado en Git** (`git ls-files` confirmado)

Este script contiene en texto plano:
- **Firebase API Key** hardcodeada en línea 2: `AIzaSy[REDACTED]`
- **8 pares de credenciales** (email + contraseña) de cuentas de expertos evaluadores (líneas 82-87)
- **UIDs de Firebase Auth** de cada cuenta

```powershell
# Línea 2:
param([string]$ApiKey = 'AIzaSy[REDACTED]', ...)

# Líneas 82-87 — ejemplo:
@{ docenteEmail = 'experto1.docente@applectura.dev'; docentePass = '[REDACTED_PASSWORD]'; ... }
```

**`test-results/`** — Contiene dumps generados por el script:
- `credenciales-expertos-validacion-2026-02-16.csv` — CSV con emails, contraseñas y UIDs
- `expert-users-20260216-090336.json` — JSON con las mismas credenciales

⚠️ Los archivos de credenciales (`credenciales-*.csv`, `expert-users-*.json`) **no están en Git** (solo los `smoke-cost-endpoints-*.json` de test-results están trackeados). Sin embargo, `provision-expert-users.ps1` **sí está en Git** con todas las contraseñas hardcodeadas.

**Impacto**: Cualquier persona con acceso al repositorio (incluso histórico) puede:
1. Acceder a las cuentas de expertos evaluadores con las contraseñas expuestas
2. Usar la Firebase API key para operaciones de autenticación
3. Acceder a datos de evaluación de los expertos en Firestore

**Acción requerida**:
- Rotar inmediatamente las contraseñas de las 8 cuentas de expertos
- Eliminar el script del historial de Git (`git filter-branch` o `git-filter-repo`)
- Agregar `scripts/provision-expert-users.ps1` y `test-results/` al `.gitignore`
- Considerar parametrizar las credenciales vía variables de entorno

---

## 4. Evaluación del plan de corrección (Sección 5 del informe)

| Fase | Evaluación |
|---|---|
| P0-A (secretos/repo) | ✅ Correcto y necesario. Las tareas son precisas. |
| P0-B (endpoints) | ✅ Correcto. `ENFORCE_FIREBASE_AUTH=true` y `NODE_ENV=production` están configurados en `render.yaml`. |
| P1 (rutas relativas) | ⚠️ **Ligeramente sobreestimado**: Son **2 archivos realmente activos en prod** (`webSearchService.js`, `ReadingWorkspace.js`), no 3. TutorCore (chat/completion) es falso positivo. `useTextAnalysis.js` y `webContextService.js` están en cadenas legacy inalcanzables. `firebase.json` confirma que en prod las rutas relativas devuelven `index.html` silenciosamente. |
| P2-A (dead code) | ✅ **COMPLETADO al 100%**. Se eliminaron 5 archivos de frontend de riesgo nulo y se limpió la cadena legacy (LegacyAnalisisTexto, useTextAnalysis, crypto.js) tras verificar que no tenían dependencias activas. Se migraron tests afectados. |
| P2-B (documentación) | ✅ Razonable. |
| P3 (refactor) | ✅ Correcto y bien priorizado. |

---

## 5. Conclusión de la verificación forense

### ✅ El informe acierta en:
1. **Secretos en Git** — Problema real y confirmado al 100%.
2. **node_modules en Git** — Confirmado con la cifra exacta.
3. **Archivos de test públicos** — Los 3 archivos existen.
4. **Endpoints desprotegidos** — pdf, ocr y storage realmente carecen de auth/rate-limit.
5. **Dead code backend** — Los 4 archivos son realmente código muerto.
6. **Tamaño de archivos monolíticos** — AppContext (~230KB) y TeacherDashboard (~151KB).

### ⚠️ El informe tiene imprecisiones en:
1. **TutorCore.js** — La llamada principal de chat/completion **ya usa `backendUrl`**. Solo tiene una llamada relativa residual deshabilitada por feature flag. El informe lo lista como bug activo, lo cual es **incorrecto**.
2. **84 archivos frontend muertos** — La cifra no es verificable sin la lista completa.

### ❌ El informe omite:
1. La mitigación parcial de SSRF en `storage.routes.js`.
2. La configuración de `firebase.json` que causa que rutas relativas `/api/*` devuelvan `index.html` en producción (fallo silencioso, no 404).
3. Dead code frontend verificado: 5 archivos confirmados sin imports activos (`BitacoraEticaIA.js` shadow orphan de 800 líneas, `LecturaInteractiva.js` mock, `AnalisisTexto.js` mock, `CargaTexto.js` de 0 bytes, `useAnalysisPersistence.js` reemplazado).
4. 🔴 **Credenciales hardcodeadas en repositorio** (ver sección 3.5).

### ⚠️ Errores de esta verificación forense (auto-corrección):
1. Afirmó que "no hay proxy en `package.json`" — **FALSO**, existe en línea 86 y en `setupProxy.js`.
2. Clasificó `useTextAnalysis.js` y `webContextService.js` como "activos en prod" — **FALSO**, están en cadenas legacy inalcanzables.
3. Acusó al informe original de marcar `preLectura.controller.js` como dead code — **FALSO**, el informe marcaba las rutas, no el controlador.
4. Sobrecriticaba la sección 1.2 del informe — el informe listaba explícitamente los 4 endpoints; no implicaba que "todo" estuviera abierto.

---

## 6. 🆕 Registro de actualizaciones

| Fecha | Cambios |
|---|---|
| 2026-02-18 08:30 | Documento original creado con verificación de hallazgos del informe del 17/02. |
| 2026-02-18 08:35 | **Segunda verificación**: Agregados 5 archivos frontend dead code confirmados (sección 1.4). Descubiertos 2 archivos adicionales con rutas relativas `/api/` (sección 1.3). Agregada evidencia de `firebase.json` explicando impacto real de rutas relativas en producción. |
| 2026-02-18 08:50 | **Tercera verificación (peer review)**: Corregidos 4 errores propios de esta verificación: (1) proxy SÍ existe en `package.json:86` y `setupProxy.js`, (2) `useTextAnalysis.js` y `webContextService.js` no están en runtime activo, (3) el informe original no marcó `preLectura.controller.js` como dead code, (4) crítica excesiva de sección 1.2. Añadida mitigación de `ENFORCE_FIREBASE_AUTH` vía `render.yaml`. **Nuevo hallazgo crítico**: credenciales hardcodeadas en `scripts/provision-expert-users.ps1` (trackeado en Git) con emails, contraseñas, UIDs y Firebase API key. |
