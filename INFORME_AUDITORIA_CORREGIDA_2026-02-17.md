# Informe de Auditoría Corregida — 17/02/2026

## Alcance y criterio
- Revisión de conexiones reales entre archivos (imports estáticos, referencias textuales, rutas backend, consumo frontend-backend).
- Doble verificación de falsos positivos detectados en iteraciones previas.
- Arquitectura asumida y validada: Frontend en Firebase Hosting + Backend/API en Render.

## 1) Hallazgos confirmados

### 1.1 Seguridad y operación (críticos)
- Archivos sensibles trackeados en Git:
  - .env (contiene clave OpenAI con formato real)
  - .env.production (contiene configuración Firebase de cliente)
- Script de aprovisionamiento con credenciales hardcodeadas trackeado en Git:
  - scripts/provision-expert-users.ps1 (incluye API key y credenciales de cuentas de expertos)
- node_modules está versionado en Git con volumen masivo (69,004 entradas).
- Archivos de test públicos desplegables en hosting:
  - public/test-env.html
  - public/test-sync.html
  - public/test-cross-device-sync.js

### 1.2 Backend (Render) — seguridad de endpoints
- Endpoints sin autenticación ni rate-limit:
  - POST /api/process-pdf
  - POST /api/detect-tables
  - POST /api/ocr-image
  - GET /api/storage/proxy
- Riesgo adicional: upload sin límites explícitos de tamaño en rutas con multer.

### 1.3 Bugs funcionales de producción (Firebase + Render)
- Llamadas relativas /api activas en código vivo (impactan producción):
  - src/services/webSearchService.js
  - src/components/ReadingWorkspace.js
- Caso latente en código vivo:
  - src/components/tutor/TutorCore.js (la llamada relativa existe, pero está deshabilitada por feature flag)
- Causa de impacto en producción:
  - en Firebase Hosting, `firebase.json` reescribe `**` a `/index.html`, por lo que `/api/*` relativo no enruta a Render.
- Estas llamadas deben resolverse con BACKEND_URL/getBackendUrl para apuntar explícitamente al backend.

### 1.4 Código muerto confirmado
- Frontend: 84 archivos confirmados como no usados en producción tras doble validación.
- Verificación forense adicional ya confirmada en 5 casos:
  - src/components/BitacoraEticaIA.js
  - src/components/LecturaInteractiva.js
  - src/components/AnalisisTexto.js
  - src/components/CargaTexto.js
  - src/hooks/useAnalysisPersistence.js
- Backend: 4 archivos confirmados muertos:
  - server/routes/health.routes.js
  - server/routes/preLectura.routes.js
  - server/controllers/chatController.js
  - server/services/deepseek.service.js

### 1.5 Deuda técnica en código vivo
- AppContext.js y TeacherDashboard.js extremadamente grandes (alto acoplamiento, difícil mantenimiento).
- Duplicación amplia de patrones UI (styled-components repetidos) y helpers de auth para fetch.

## 2) Hallazgos corregidos o descartados (falsos positivos)

### 2.1 “No hay API keys en env del frontend”
- Descartado como problema.
- Es correcto que las claves privadas no estén en frontend.
- Diseño válido: frontend usa REACT_APP_BACKEND_URL y backend en Render gestiona claves privadas con process.env.

### 2.2 “Archivos referenciados textualmente = usados”
- Corregido: varias referencias eran comentarios, logs o nombres locales de styled-components.
- Se verificó que esos casos NO constituyen imports reales de runtime.

### 2.3 Casos específicos que parecían vivos y no lo están
- Wrappers legacy reemplazados por variantes responsive.
- Barriles index.js no consumidos (imports directos al archivo concreto).
- Versiones legacy importadas solo por otros módulos muertos o tests.
- Nota de precisión: `preLectura.controller.js` está activo; el archivo dead code confirmado es `server/routes/preLectura.routes.js`.

### 2.4 Matices de seguridad confirmados
- `render.yaml` define `NODE_ENV=production` y `ENFORCE_FIREBASE_AUTH=true` en el despliegue actual.
- `server/routes/storage.routes.js` aplica una mitigación parcial SSRF al permitir solo dominios Firebase Storage, pero sigue sin auth/rate-limit.

## 3) Conclusión ejecutiva
- El modelo de despliegue Firebase (frontend) + Render (backend) está bien planteado.
- Los riesgos más urgentes son de higiene de repositorio y seguridad de endpoints expuestos.
- La degradación funcional principal en producción proviene de llamadas relativas /api en frontend vivo.
- La limpieza de código muerto y archivos históricos puede reducir complejidad sin afectar runtime, siempre acompañada de ajuste de tests relacionados.

## 4) Prioridad recomendada
1. Remediación P0: retirar secretos/versionados sensibles, limpiar node_modules en git, retirar archivos test públicos de public/.
2. Remediación P0: proteger endpoints backend (auth + rate-limit + límites de upload).
3. Remediación P1: migrar llamadas relativas /api del frontend vivo a backend URL explícita.
4. Remediación P2: limpieza de dead code confirmado y documentación residual.
5. Remediación P3: refactor gradual de AppContext/TeacherDashboard y deduplicación de utilidades UI/API.

## 5) Plan de corrección integral

### 5.1 Objetivo del plan
- Corregir todos los hallazgos confirmados sin interrumpir la operación en producción.
- Ejecutar primero riesgos de seguridad y estabilidad, luego limpieza y refactor.
- Mantener trazabilidad: cada fase tiene tareas, entregables y criterio de cierre.

### 5.2 Enfoque de ejecución
- Estrategia por fases P0→P3 con despliegues pequeños y verificables.
- Cada cambio se valida en entorno local y staging antes de producción.
- No eliminar código muerto sin ajustar o retirar tests asociados.

### 5.3 Fase P0-A — Seguridad de secretos y repositorio (urgente)

**Problemas cubiertos**
- .env y .env.production trackeados en Git.
- script de aprovisionamiento con credenciales hardcodeadas trackeado.
- node_modules versionado en Git (69,004 entradas).
- Archivos de prueba públicos en public/.

**Tareas**
1. Rotar credenciales expuestas:
  - OpenAI, Firebase, Tavily/Serper/Bing (si aplica).
  - contraseñas de cuentas de expertos expuestas en script de aprovisionamiento.
2. Retirar archivos sensibles del versionado:
  - `git rm --cached .env .env.production`.
  - Confirmar `.gitignore` efectivo para `.env*` (excepto `.env.example`).
  - retirar o mover a secreto seguro `scripts/provision-expert-users.ps1`.
  - limpiar historial Git para credenciales hardcodeadas (git-filter-repo/BFG) y forzar rotación.
3. Retirar `node_modules` del índice Git:
  - `git rm -r --cached node_modules`.
4. Eliminar artefactos de prueba públicos:
  - `public/test-env.html`
  - `public/test-sync.html`
  - `public/test-cross-device-sync.js`
5. Limpiar artefactos de salida y temporales en raíz (`*.txt` de debug, outputs de test, etc.).
6. Endurecer ignore de evidencia sensible:
  - agregar `test-results/*` al `.gitignore` salvo excepciones explícitas necesarias.

**Criterio de cierre**
- No existen secretos válidos en historial reciente ni en HEAD.
- `git ls-files node_modules` retorna vacío.
- Los tres archivos `public/test-*` no existen en build ni deploy.
- Script de aprovisionamiento no contiene credenciales hardcodeadas en HEAD.

### 5.4 Fase P0-B — Blindaje de endpoints backend (urgente)

**Problemas cubiertos**
- Endpoints sin auth ni rate-limit.
- Upload sin límites explícitos de tamaño.

**Archivos objetivo**
- `server/routes/pdf.routes.js`
- `server/routes/ocr.routes.js`
- `server/routes/storage.routes.js`
- `server/middleware/rateLimiters.js` (si se requiere nuevo limiter específico)

**Tareas**
1. Añadir `requireFirebaseAuth` a:
  - `POST /api/process-pdf`
  - `POST /api/detect-tables`
  - `POST /api/ocr-image`
  - `GET /api/storage/proxy`
2. Añadir limiter adecuado por ruta (análisis/upload o uno nuevo de alto costo).
3. Definir límites de `multer` (`fileSize`, tipo MIME permitido, rechazo temprano).
4. Estandarizar respuestas de error (401/403/429/413/415).
5. Revisar endpoint `/api/web-search/test`:
  - mantenerlo solo en desarrollo o protegerlo en producción.
6. Mantener y documentar validación de dominio en storage proxy como control complementario, no sustitutivo de auth.

**Criterio de cierre**
- Todas las rutas de alto costo requieren auth y rate-limit.
- Requests no autenticadas reciben 401.
- Uploads fuera de límite reciben 413/415.

### 5.5 Fase P1 — Corrección funcional frontend (producción)

**Problemas cubiertos**
- Llamadas relativas `/api` en código vivo (fallan en Firebase Hosting).

**Archivos objetivo**
- `src/services/webSearchService.js`
- `src/components/ReadingWorkspace.js`
- `src/components/tutor/TutorCore.js` (riesgo latente, detrás de feature flag)

**Tareas**
1. Reemplazar rutas relativas por URL absoluta de backend:
  - usar `getBackendUrl()`/`BACKEND_URL` centralizado.
2. Homogeneizar helper de fetch autenticado (evitar duplicación local).
3. Agregar manejo de errores consistente:
  - backend caído
  - timeout
  - 401/429
4. Verificar que no queden rutas relativas `/api` en archivos alcanzables.
5. Para `TutorCore`, corregir también la ruta latente aunque esté deshabilitada para evitar regresión al activar feature flag.

**Criterio de cierre**
- Búsqueda web y verificación de disponibilidad funcionan en entorno Firebase + Render.
- `grep` de rutas relativas `/api/` en código vivo retorna 0 coincidencias activas y 0 latentes en rutas de ejecución previstas.

### 5.6 Fase P2-A — Limpieza de código muerto confirmado

**Problemas cubiertos**
- 84 archivos frontend y 4 backend confirmados dead code.

**Tareas**
1. Eliminar primero dead code backend:
  - `server/routes/health.routes.js`
  - `server/routes/preLectura.routes.js`
  - `server/controllers/chatController.js`
  - `server/services/deepseek.service.js`
2. Eliminar dead code frontend en lotes pequeños (10–15 archivos por PR) con validación continua.
3. Ajustar o eliminar tests que dependían de archivos retirados.
4. Verificar que no queden imports rotos ni referencias de barriles huérfanos.

**Criterio de cierre**
- Build y test suite pasan sin imports faltantes.
- Disminuye el tamaño del grafo y de la base de código sin cambios funcionales.

### 5.7 Fase P2-B — Limpieza documental y de artefactos históricos

**Problemas cubiertos**
- Volumen alto de documentación residual y binarios no necesarios.

**Tareas**
1. Mover documentación histórica a `docs/archive/` o repositorio de evidencias.
2. Mantener en raíz solo documentación operacional vigente.
3. Eliminar binarios y backups innecesarios (`*.docx`, `*_backup.md`, etc.).

**Criterio de cierre**
- Raíz del proyecto queda enfocada en documentación vigente y operación.
- Reducción medible de ruido documental y archivos no funcionales.

### 5.8 Fase P3 — Refactor técnico controlado

**Problemas cubiertos**
- `AppContext.js` y `TeacherDashboard.js` sobredimensionados.
- Duplicación de styled-components y helpers de auth/fetch.

**Tareas**
1. Dividir `AppContext` por dominios:
  - Texto/Lectura
  - Evaluación
  - Sesión/Sincronización
  - UI/Preferencias
2. Trocear `TeacherDashboard` en submódulos funcionales (cursos, estudiantes, métricas, acciones).
3. Extraer helper único de auth/fetch reutilizable.
4. Consolidar componentes UI repetidos en una capa compartida.
5. Añadir reglas de calidad para evitar regresión:
  - límite de líneas por archivo
  - detección de duplicación
  - chequeo de rutas relativas `/api` en CI

**Criterio de cierre**
- Reducción de tamaño y acoplamiento en módulos críticos.
- Menor duplicación y menor superficie de regresión.

### 5.9 Cronograma sugerido
- Semana 1: P0-A + P0-B
- Semana 2: P1 + inicio P2-A
- Semana 3: cierre P2-A + P2-B
- Semana 4+: P3 incremental por lotes

### 5.10 Matriz de validación por fase
- P0-A:
  - `git ls-files node_modules` = 0
  - escaneo de secretos en HEAD sin hallazgos
- P0-B:
  - pruebas de rutas con y sin token
  - pruebas de límite de upload y rate-limit
- P1:
  - pruebas E2E de búsqueda web y tutor
  - validación en entorno Firebase + Render
- P2:
  - test suite + build sin imports rotos
- P3:
  - métricas de tamaño de archivo y render performance

### 5.11 Riesgos y mitigación
- Riesgo: ruptura por eliminación de dead code ligado a tests.
  - Mitigación: borrado por lotes + CI en cada lote.
- Riesgo: bloqueo de usuarios por auth/rate-limit más estricto.
  - Mitigación: umbrales graduales + monitoreo de 429.
- Riesgo: regresión al refactorizar contexto.
  - Mitigación: migración por feature flags y snapshot de comportamiento.

### 5.12 Definición de “completado” global
- Sin secretos ni artefactos sensibles versionados.
- Endpoints críticos protegidos con auth, rate-limit y límites de upload.
- Sin llamadas relativas `/api` activas ni latentes en frontend vivo.
- Dead code confirmado eliminado y tests estabilizados.
- Módulos monolíticos en ruta de reducción sostenida con métricas objetivas.

## 6) Actualización por verificación forense (18/02/2026)
- Verificación general: hallazgos nucleares confirmados; precisión alta con corrección puntual en 1.3.
- Ajuste aplicado: en producción hay 2 rutas relativas activas (`webSearchService`, `ReadingWorkspace`) y 1 latente (`TutorCore`, por feature flag).
- Nuevo hallazgo crítico incorporado: credenciales hardcodeadas en `scripts/provision-expert-users.ps1`.
- Matices incorporados al plan:
  - mitigación parcial SSRF en storage proxy ya existente;
  - `render.yaml` fuerza auth en producción (`NODE_ENV=production`, `ENFORCE_FIREBASE_AUTH=true`).

## 7) Ejecución parcial de P0-A — Estado verificado (18/02/2026)

### Tareas completadas ✅

| Tarea | Estado | Evidencia |
|-------|--------|-----------|
| Retirar `.env` y `.env.production` del índice Git | ✅ Hecho | `git ls-files .env .env.production` → vacío. Archivos existen en disco (uso local) pero no se versionan. |
| Retirar `node_modules` del índice Git (69,004 archivos) | ✅ Hecho | `git ls-files node_modules` → 0 entradas. |
| Eliminar `public/test-env.html`, `public/test-sync.html`, `public/test-cross-device-sync.js` | ✅ Hecho | No existen en disco ni en índice Git. |
| Eliminar artefactos de `test-results/` del índice Git | ✅ Hecho | `git ls-files test-results/*` → vacío. Regla en `.gitignore`: `test-results/*` con excepción `.gitkeep`. |
| Limpiar credenciales hardcodeadas del script de aprovisionamiento | ✅ Hecho | `scripts/provision-expert-users.ps1` ya no contiene patrones `AIza*` ni asignaciones de `Pass`. Se creó `scripts/provision-expert-users.example.json` como plantilla sin secretos. |
| Actualizar `.gitignore` | ✅ Hecho | Cubre: `.env*`, `node_modules`, `test-results/*`, `/build`, `/coverage`. |

### Cambios pendientes de commit (staged)

Hay un commit masivo en staging listo para push:
- **69,011 archivos eliminados** del índice (mayoritariamente `node_modules`).
- Incluye eliminación de `public/test-*`, `test-results/smoke-*`.
- **Recomendación**: hacer commit y push cuanto antes para materializar la limpieza en remoto.

### Tareas pendientes ⏳

| Tarea | Estado | Nota |
|-------|--------|------|
| Rotar credenciales reales (OpenAI, Firebase, usuarios expertos) | ⏳ Pendiente | Requiere acceso a consolas de OpenAI, Firebase Console y Render Dashboard. No automatizable desde código. |
| Limpiar historial Git antiguo (`git-filter-repo` / BFG) | ⏳ Pendiente | Necesario para purgar secretos de commits anteriores. Requiere ejecución en repo local, force-push, y notificación a colaboradores. |

### Observaciones adicionales sobre el estado actual

**Archivos unstaged (no relacionados con P0)**:
- Se detectan 16 archivos con cambios unstaged en `src/context/AppContext.js`, `src/firebase/firestore.js`, `src/services/sessionManager.js`, `storage.rules` y otros. Estos parecen ser desarrollo en curso no relacionado con la limpieza P0.

**Archivos untracked residuales**:
- `tools/tmp-*.js` y `tools/deep-audit.js` → scripts temporales de auditoría, pueden eliminarse.
- `PROMPTS_DISENO_IA_TUTOR_Y_ARTEFACTOS.docx` y `*_backup.md` → binarios/backups pendientes de limpieza (Fase P2-B).
- `all_files.txt`, `components_list.txt` → outputs temporales, pueden eliminarse.
- `storage.cors.json` → evaluar si debe versionarse (config operacional de Firebase Storage).

## 8) Cierre forense final P0-A (18/02/2026)

### Estado final verificado

| Control | Resultado |
|--------|-----------|
| `git ls-files .env .env.production` | ✅ Vacío (no versionados en HEAD) |
| `git ls-files node_modules` | ✅ 0 |
| `git ls-files public/test-*` | ✅ Vacío |
| `git ls-files test-results/*` | ✅ Vacío |
| `git stash list` | ✅ Vacío |

### Cierre técnico aplicado
- Se eliminaron del índice los dos artefactos remanentes en `test-results/`:
  - `smoke-cost-endpoints-20260215-111232.json`
  - `smoke-cost-endpoints-20260215-111543.json`
- Se purgó el backup local sensible (`stash`) y se ejecutó limpieza de objetos (`reflog expire` + `gc --prune=now --aggressive`).

### Pendiente único de P0-A
- ⏳ Rotación real externa de credenciales (OpenAI/Firebase/cuentas de expertos).

### Nota de consistencia
- La sección 7 describe una foto intermedia de ejecución parcial; esta sección 8 refleja el estado final posterior al cierre técnico forense.

### Criterio de cierre P0-A actualizado

| Criterio | Estado |
|----------|--------|
| No existen secretos válidos en HEAD | ✅ Cumplido (pendiente rotación externa) |
| `git ls-files node_modules` = 0 | ✅ Cumplido |
| `public/test-*` eliminados | ✅ Cumplido |
| Script de aprovisionamiento sin credenciales en HEAD | ✅ Cumplido |
| Secretos purgados del historial Git | ⏳ Pendiente (filter-repo/BFG) |
| Credenciales rotadas en servicios externos | ⏳ Pendiente (acción manual) |

## 9) Trazabilidad de cierres publicados (19/02/2026)

### Commits de cierre en `main`

| Hash | Tipo | Alcance | Estado |
|------|------|---------|--------|
| `c62bf71b` | `test(p2-a)` | Retiro de suites huérfanas + estabilización de mocks activos (`App.test`, `ConfirmModal.test`, `VisorTexto.test`) | ✅ Publicado |
| `65f78daf` | `chore(p2-b)` | Consolidación de limpieza backend/docs + artefactos de auditoría | ✅ Publicado |

### Verificación post-publicación

| Control | Resultado |
|--------|-----------|
| `git push origin main` | ✅ Exitoso |
| Sincronización de rama | ✅ `HEAD`, `origin/main`, `origin/HEAD` en `65f78daf` |
| Suite de pruebas completa | ✅ `35/35` suites, `206/206` tests, `0` snapshots |

### Pendiente global fuera de código
- Rotación externa de credenciales (OpenAI, Firebase, Render y cuentas de expertos).
