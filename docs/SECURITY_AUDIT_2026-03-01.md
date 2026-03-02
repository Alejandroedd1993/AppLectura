# Auditoría de Seguridad — AppLectura (2026-03-01)

> Estado: **PENDIENTE DE CORRECCIÓN**
> Prioridad: HIGH → MEDIUM → LOW

---

## HIGH — Corregir inmediatamente

### S1 — SSRF en proxy de Storage
- **Archivo:** `server/routes/storage.routes.js` L8-11
- **Problema:** `host.endsWith('firebasestorage.app')` acepta dominios como `evilfirebasestorage.app`
- **Fix:**
```js
return host === 'firebasestorage.googleapis.com'
    || host.endsWith('.firebasestorage.googleapis.com')
    || host === 'firebasestorage.app'
    || host.endsWith('.firebasestorage.app');
```

### S2 — Auth bypass por defecto en dev/test
- **Archivo:** `server/middleware/firebaseAuth.js` L97-110
- **Problema:** Si `NODE_ENV` no está definido en producción, auth se desactiva silenciosamente
- **Fix:**
```js
if (!enforce && envName === 'production') {
  throw new Error('ENFORCE_FIREBASE_AUTH=false no permitido en producción');
}
```

### S3 — Timing attack en cleanup secret + sin auth Firebase
- **Archivo:** `server/controllers/adminCleanup.controller.js` L86-92, `server/routes/adminCleanup.routes.js` L8
- **Problema:** Comparación `!==` vulnerable a timing attack; endpoint sin `requireFirebaseAuth`
- **Fix:**
```js
import crypto from 'crypto';
// Comparación constant-time:
if (!workerSecret || workerSecret.length !== providedSecret.length ||
    !crypto.timingSafeEqual(Buffer.from(workerSecret), Buffer.from(providedSecret))) {
  return res.status(403).json({ ... });
}
// En routes: añadir requireFirebaseAuth antes del handler
```

---

## MEDIUM — Corregir antes de deploy a producción

### S4 — Prompt injection en chat completion
- **Archivo:** `server/controllers/chat.completion.controller.js` L73-83
- **Problema:** `messages` del body se envía sin validar roles, cantidad ni longitud
- **Fix:**
```js
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 50;
const MAX_TOTAL_CHARS = 50000;

if (messages.length > MAX_MESSAGES) return res.status(400).json({ error: 'Demasiados mensajes' });
let totalChars = 0;
for (const m of messages) {
  if (!m || typeof m.content !== 'string' || !ALLOWED_ROLES.has(m.role)) {
    return res.status(400).json({ error: 'Formato de mensaje inválido' });
  }
  totalChars += m.content.length;
}
if (totalChars > MAX_TOTAL_CHARS) return res.status(400).json({ error: 'Input total demasiado largo' });
```

### S5 — Cualquier usuario puede crear notificaciones a otros
- **Archivo:** `firestore.rules` L307-309
- **Problema:** `allow create: if isAuthenticated()` sin verificar emisor
- **Fix:**
```
allow create: if isAuthenticated() &&
  request.resource.data.emisorUid == request.auth.uid;
```

### S6 — bulkEvaluate sin validación de input
- **Archivo:** `server/routes/assessment.route.js` L72
- **Problema:** `/bulk-evaluate` no pasa por middleware de validación (10 items × 10k chars = abuso de costes)
- **Fix:** Agregar `validateBulkInput` middleware

### S7 — Error messages exponen detalles internos
- **Archivos:** `server/controllers/webSearch.controller.js` L175, `analisis.controller.js` L91, `storage.routes.js` L44, `preLectura.controller.js` L390
- **Problema:** `error.message` y `error.stack` se devuelven al cliente
- **Fix:** Devolver mensajes genéricos; loguear detalles server-side

### S8 — Indirect prompt injection vía webEnrichment
- **Archivo:** `src/components/tutor/TutorCore.js` L141-146
- **Problema:** Contenido de búsqueda web se concatena al system prompt sin sanitizar
- **Fix:** Truncar a longitud máxima, envolver en delimitadores `"""`, añadir instrucción de que es contenido no confiable

---

## LOW — Nice to have

### S9 — Health endpoint sin auth
- **Archivo:** `server/index.js` L173-182
- **Fix:** Proteger con `requireFirebaseAuth` o quitar detalles de APIs

### S10 — Preflight CORS permisivo
- **Archivo:** `server/index.js` L218
- **Fix:** Eliminar `app.options('*', cors())` o reutilizar config restrictiva

### S11 — Sufijos de API keys en logs
- **Archivo:** `server/index.js` L31-41
- **Fix:** Loguear solo presencia (`configurada` / `NO_CONFIG`) sin chars de la key

---

## Pasada adicional Tutor (estabilidad/concurrencia) — 2026-03-01

### B20 — Timeout colgante al invalidar request tras `fetch`
- **Archivo:** `src/components/tutor/TutorCore.js`
- **Problema:** En `callBackendWith`, si la respuesta de `fetch` llega cuando el `requestId` ya quedó obsoleto, se hacía `return` sin `clearTimeout(timeoutId)`. Ese timer podía dispararse después y abortar una request nueva activa.
- **Estado:** ✅ Corregido
- **Fix aplicado:** limpiar timeout antes del early return.

### B21 — Stream SSE no robusto ante desconexión del cliente
- **Archivo:** `server/controllers/chat.completion.controller.js`
- **Problema:** En streaming, `res.write(...)` podía fallar si el cliente cerraba conexión y la ruta no cortaba de forma segura el bucle asíncrono.
- **Estado:** ✅ Corregido
- **Fix aplicado:** detección de cierre (`req.on('close')`), guardas `res.writableEnded/res.destroyed`, y `try/catch` alrededor de `res.write` para cortar stream limpiamente.

### Verificación de regresión
- `npx jest --no-cache --maxWorkers=1 --forceExit --detectOpenHandles --logHeapUsage` → **49/49 suites, 250/250 tests PASS**
- `npm run build` → **PASS**

---

## Pasada anti-prompt-injection (extra) — 2026-03-01

### Corregido en esta pasada

### PI1 — Validación insuficiente de `messages` en chat completion
- **Archivo:** `server/controllers/chat.completion.controller.js`
- **Riesgo:** Inyección/abuso por payloads malformados (roles no válidos, tamaño excesivo, contenido vacío) y parámetros fuera de rango.
- **Fix aplicado:**
  - Validación estricta de roles permitidos (`system`, `user`, `assistant`).
  - Límites configurables de cantidad y tamaño (`CHAT_MAX_MESSAGES`, `CHAT_MAX_MESSAGE_CHARS`, `CHAT_MAX_TOTAL_CHARS`).
  - Normalización de `temperature` a rango seguro [0,2] y `stream` a booleano estricto.
  - Uso de mensajes validados para cache y llamadas al proveedor.

### PI2 — `webContext` externo inyectado sin encapsulado en prompt del tutor
- **Archivo:** `src/components/tutor/TutorCore.js`
- **Riesgo:** Instrucciones maliciosas embebidas en contexto externo podían mezclarse como parte del prompt de sistema.
- **Fix aplicado:**
  - Saneado de caracteres de control + truncado de longitud.
  - Encapsulado explícito como bloque **NO CONFIABLE**.
  - Instrucción al modelo para ignorar mandatos dentro de ese bloque.

### PI3 — Fuentes web sin sanitizar en `/api/web-search/answer`
- **Archivo:** `server/controllers/webSearch.controller.js`
- **Riesgo:** Prompt injection indirecta desde snippets/títulos de fuentes externas.
- **Fix aplicado:**
  - Sanitización de título/resumen/fuente/url antes de formar el prompt.
  - Marcado explícito de cada fuente como **FUENTE NO CONFIABLE**.
  - Instrucción explícita al modelo para ignorar instrucciones embebidas en fuentes.

### Verificación de esta pasada
- `npx jest --no-cache --maxWorkers=1 --forceExit --detectOpenHandles --logHeapUsage` → **49/49 suites, 250/250 tests PASS**
- `npm run build` → **PASS**

### Hardening pendiente (priorizado)
1. **P0:** Añadir tests unitarios dedicados para validación de `createChatCompletion` (roles, límites, payload adversarial).
2. **P1:** Unificar sanitización de contexto externo en un util server/client compartido para evitar divergencias.
3. **P1:** Aplicar el mismo patrón de saneo/encapsulado a otros endpoints con composición de prompt (`assessment`, `analisis`, `preLectura`).
4. **P2:** Añadir telemetría de rechazo por validación (sin datos sensibles) para detectar ataques de prompt stuffing.

---

## Pasada 15 — React-Doctor + Hallazgos del usuario — 2026-03-02

### Parte A: Validación de 6 hallazgos reportados por el usuario

Todos confirmados como reales. 5 corregidos con código, 1 reconocido como cosmético.

| ID | Sev. | Archivo | Descripción | Estado |
|----|------|---------|-------------|--------|
| H1 | Alta | TutorCore.js L752,764 | `cancelPending`/`clear` no abortaban `webSearchAbortRef` → fetch zombi de búsqueda web. | **FIXED** |
| H2 | Alta | TutorCore.js L625-640 | Placeholder de stream (`▌`) quedaba colgado en errores no-AbortError. catch no lo eliminaba. | **FIXED** |
| H3 | Media | useReaderActions.js L54-62 | Anti-duplicado con hash bloqueaba indefinidamente la misma acción+fragmento. Ahora tiene TTL de 3 s. | **FIXED** |
| H4 | Media | TutorDock.js L95 | `parseMarkdown` solo buscaba `<ol|ul|div|blockquote>` al inicio; elementos de bloque embebidos se envolvían en `<p>`. | **FIXED** |
| H5 | Media | TutorCore.js L1027 | `sendAction` no sanitizaba `webEnrichment` con `sanitizeExternalWebContext`, a diferencia de `sendPrompt`/`callBackend`. | **FIXED** |
| H6 | Baja | TutorDock.js | Advertencias ESLint (`no-unused-vars`, `react-hooks/exhaustive-deps`) en TutorDock — requieren ajuste de config, no bugs. | Reconocido |

### Parte B: Auditoría React-Doctor

Análisis exhaustivo de anti-patrones React en **TutorCore.js** (1168 líneas), **TutorDock.js** (1325 líneas), **useTutorPersistence.js** (338 líneas), **useTutorThreads.js** (260 líneas), **useReaderActions.js** (71 líneas).

#### Arquitectura evaluada como sólida en:
- **Render-props pattern** (`children(api)`): TutorCore expone API sin prop-drilling; funciones internas estabilizadas con `useCallback` + refs.
- **Refs para estabilidad de callbacks**: `onMessagesChangeRef`, `onBusyChangeRef`, `apiRef`, `backendBaseUrlRef` evitan recrear `callBackendWith` y cascada de deps.
- **Actualizaciones funcionales de estado**: Todos los `setMessages(prev => ...)` son seguros bajo concurrencia de streams overlapping.
- **Cleanup de efectos**: `abortRef.abort()` + `webSearchAbortRef.abort()` + `requestIdRef++` en unmount. Listeners de resize con `resizeCleanupRef`.
- **Batching de React 18**: Múltiples `setMessages` en mismo bloque sync se agrupan correctamente.

#### Hallazgos nuevos (react-doctor):

| ID | Sev. | Archivo | Línea(s) | Descripción | Acción |
|----|------|---------|----------|-------------|--------|
| RD1 | Media | TutorCore.js | 399-403, 530 | **Timeout leak teórico entre llamadas solapadas.** `timeoutId` es variable local — si la llamada anterior dura ~45 s y la nueva comienza justo al filo del timeout, el old timeout podría leer `abortRef.current` (que ya apunta al nuevo controller) y abortar la nueva petición. Probabilidad extremadamente baja por modelo de eventos JS (microtasks de abort error se procesan antes que macrotask del setTimeout), pero no hay garantía 100% cross-browser. | Pendiente (P1). Fix: almacenar en `timeoutIdRef` y limpiar al inicio de `callBackendWith`. |
| RD2 | Baja | TutorCore.js | 530 | **`lastStreamPersistRef` no se resetea al iniciar nuevo stream.** Si el stream previo terminó <3 s antes, la primera persistencia periódica del nuevo stream se demora hasta completar los 3 s acumulados. Impacto: posible micro-pérdida de datos si el usuario cierra pestaña en los primeros 3 s del stream. | Pendiente (P2). Fix: `lastStreamPersistRef.current = 0` junto al placeholder. |
| RD3 | Baja | TutorDock.js (Effects) | 187-203 | **Lectura stale de `initialMessagesRef.current` en efecto de `historyScopeKey`.** Cuando el usuario cambia de hilo, el efecto de scope puede leer mensajes del hilo anterior si `initialMessages` no se actualizó aún (carga async de Firestore). El efecto B5 lo autocorrige cuando llegan los datos reales. Impacto: flash visual <200 ms de mensajes antiguos. | Aceptable — el diseño self-healing es correcto. |
| RD4 | Info | TutorDock.js | 889-1325 | **Funciones inline en render-prop JSX.** Event handlers (`exportPdf`, `onClick`, `onSubmit`) se recrean cada render. Solo aloca memoria — no provoca re-renders hijos porque `api.messages` ya causa render completo por diseño. | No requiere acción. |
| RD5 | Info | useTutorPersistence.js | 94-99 | **6 `useState` para estado de sync.** Candidatos a `useReducer` para reducir complejidad, pero funcionalmente correcto. | Cosmético, no priorizar. |

### Verificación de esta pasada
- `npx jest --no-cache` → **49/49 suites, 250/250 tests PASS**
- `npm run build` → **PASS**
- Fuzz test (6000 eventos, 10 semillas): **PASS**
