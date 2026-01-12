# Plan de Correcciones Post-Auditoría AppLectura

> **Fecha**: 2025-12-24
> **Basado en**: INFORME_AUDITORIA_DIC2025.md
> **Objetivo**: Cerrar hallazgos abiertos y preparar para piloto (12-20 alumnos)

---

## Resumen de Hallazgos

| ID | Severidad | Estado | Acción Requerida |
|----|-----------|--------|------------------|
| H-001 | 🔴 Alta | ✅ Implementado | Normalizar respuesta IA en assessment (degraded 200 en fallos IA) |
| H-002 | 🟠 Media | ✅ Cerrado | Ya corregido |
| H-003 | 🟡 Baja | ✅ Implementado | Alinear /api/web-search/test con prioridad real de proveedor |
| H-004 | 🟡 Baja | ✅ Cerrado | Ya corregido |
| H-005 | 🟡 Media | ✅ Implementado | = H-003 (mismo problema) |
| H-006 | 🟡 Baja | 📝 Observación | No requiere acción |
| H-007 | 🔴 Crítica | ✅ Cerrado | Ya corregido |
| H-008 | 🟠 Media | ✅ Desplegado | **CRÍTICO PRE-PILOTO** (rules aplicadas en Firebase) |
| H-009 | 🟠 Media | ✅ Implementado | Limpieza local completa (prefijos appLectura_* + sessionStorage) |
| H-010 | 🟠 Media | ✅ Desplegado | Aislamiento por curso reforzado en rules (membresía verificada, `sourceCourseId` no-tamperable) |
| H-011 | 🔴 Alta | ✅ Implementado | Fuga de API key potencial en frontend (OpenAINotesService) |
| H-012 | 🟠 Media | ✅ Implementado | Rate limiting faltante en endpoints costosos (/api/analysis/*) |

---

## Prioridad de Correcciones

### 🔴 P0 - BLOQUEANTE para Piloto

#### H-011: Fuga de API Key en Frontend (OpenAINotesService)

**Archivo**: `src/services/notes/OpenAINotesService.js`

**Problema**: El código frontend intenta leer `process.env.REACT_APP_OPENAI_API_KEY`. Si esta variable se define en el `.env` de build, la clave queda expuesta en el bundle del navegador. `useNotasEstudioHook` hace fallback a este servicio si falla el backend.

**Solución**:
Remover la lectura de variable de entorno en el cliente. Solo permitir BYOK (Bring Your Own Key) explícito por el usuario si es necesario, y evitar fallback silencioso cuando el backend falla (debe ser opt-in).

**Estado actual**: ✅ Implementado

```javascript
// src/services/notes/OpenAINotesService.js línea 35
getClient() {
  try {
    // ELIMINAR: process.env.REACT_APP_OPENAI_API_KEY
    const key = localStorage.getItem('user_openai_api_key'); 
    
    if (!key) {
      // Si llegamos aquí por fallback del backend, lanzamos error limpio
      throw new Error('Backend no disponible y no hay clave personal configurada');
    }
    // ...
```

#### H-008: Remover DEBUG flags en Firestore Rules

**Archivo**: `firestore.rules`

**Cambios requeridos**:

```diff
// Línea 203 - /courses/{courseId}
-allow read: if true; // DEBUG: Allow public read
+allow read: if isDocente() && isCourseOwner(courseId) || isCourseMember(courseId);

// Línea 213 - /courses/{id}/students/{uid}
-allow read: if true; // DEBUG: Allow public read
+allow read: if isCourseOwner(courseId) || isOwner(studentId);

// Línea 216
-allow create: if true; // DEBUG: Allow public create
+allow create: if isAuthenticated() && request.auth.uid == studentId;

// Línea 219
-allow update: if true; // DEBUG: Allow public update
+allow update: if isCourseOwner(courseId) || (isOwner(studentId) && 
+              request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastAccess', 'progress']));

// Línea 231 - /courseCodes/{code}
-allow read: if true; // DEBUG: Allow public read
+allow read: if isAuthenticated();
```

**Verificación**: 
- Deploy rules: `firebase deploy --only firestore:rules`
- Test: Usuario sin curso no puede leer `/courses/abc123`

**Estado actual**: ✅ Desplegado (rules aplicadas en Firebase)

---

### 🟠 P1 - RECOMENDADO antes de Piloto

#### H-010: Aislamiento por curso no garantizado (rules)

**Problema**: El aislamiento docente podría depender de `resource.data.sourceCourseId` dentro del progreso del estudiante (campo controlado por el estudiante) sin validar relación curso↔estudiante.

**Riesgo**: fuga de privacidad entre cursos (vector adversarial: etiquetar progreso con un `sourceCourseId` ajeno).

**Solución (orientativa)**: endurecer reglas para que la lectura docente se base en una relación verificable (membresía) y no solo en un campo que viene del cliente. Mantener como prioridad alta junto con H-008.

**Estado actual**: ✅ Desplegado dentro del endurecimiento de rules

#### H-012: Falta Rate Limiting en endpoints costosos

**Archivo**: `server/routes/analisis.routes.js`

**Problema**: `/api/analysis/text` y `/api/analysis/prelecture` usan modelos costosos (DeepSeek/GPT-4o) sin límite de tasa.

**Solución**: Aplicar middleware de rate limit existente.

**Nota importante para piloto (aula con NAT/IP compartida)**: un límite “20/15min por IP” puede bloquear a toda la clase si salen por el mismo IP. Mejor opción:
- Si hay auth en backend: usar `keyGenerator` por `uid` (o `uid+ip`).
- Si no hay auth: subir el límite por IP (p.ej. 120/15min) y agregar un segundo límite más estricto por ruta (p.ej. `prelecture` más bajo).

**Implementación aplicada (actual)**:
- Se agregó un limiter configurable en `server/middleware/rateLimiters.js` y se aplicó a `/api/analysis/text`, `/api/analysis/prelecture`, `/api/analysis/glossary` y alias.
- `keyGenerator` prioriza `Authorization: Bearer …` (hasheado) y si no existe, usa `req.ip`.
- Se activó `app.set('trust proxy', 1)` para despliegue detrás de proxy.

**Variables de entorno (recomendado)**:
- `ANALYSIS_RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `ANALYSIS_RATE_LIMIT_MAX` (default: `120`)

**Recomendación para piloto (12–20 alumnos)**:
- Si **NO** hay `Authorization` y la clase sale por una IP (NAT): empezar con `ANALYSIS_RATE_LIMIT_WINDOW_MS=60000` y `ANALYSIS_RATE_LIMIT_MAX=240`.
- Si **SÍ** hay `Authorization` consistente por alumno: `ANALYSIS_RATE_LIMIT_MAX=60`–`120` suele bastar.
- Ajustar según actividad: `prelecture` es más costoso; si se requiere más control, conviene separar un limiter específico (no aplicado aún).

**Estado actual**: ✅ Implementado

```javascript
import rateLimit from 'express-rate-limit';

const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // max 20 análisis por IP
  message: 'Demasiadas solicitudes de análisis, por favor intente más tarde'
});

router.post('/text', analysisLimiter, analizarTexto);
router.post('/prelecture', analysisLimiter, analyzePreLecture);
```

#### H-001: Assessment devuelve 500 "Evaluación incompleta"

**Archivo**: `server/controllers/assessment.controller.js`
**Líneas**: 108-114

**Problema**: Validación estricta de campos exactos (`dimension`, `scoreGlobal`, `criteriosEvaluados`)

**Solución propuesta**:

```javascript
// Antes de validar, normalizar campos alternativos
const normalizeEvaluationResponse = (data) => {
  return {
    dimension: data.dimension || data.dimensión || data.category || 'general',
    scoreGlobal: data.scoreGlobal ?? data.score ?? data.puntuacion ?? 0,
    criteriosEvaluados: data.criteriosEvaluados || data.criterios || data.criteria || [],
    retroalimentacion: data.retroalimentacion || data.feedback || data.comentarios || '',
    // Preservar campos originales
    ...data
  };
};

// Aplicar antes de validación
const normalized = normalizeEvaluationResponse(evaluationData);
if (!normalized.dimension || normalized.scoreGlobal === undefined) {
  // Fallback: usar respuesta parcial en vez de error 500
  return res.status(200).json({
    degraded: true,
    message: 'Evaluación parcial',
    ...normalized
  });
}
```

**Verificación**: `curl -X POST /api/assessment/evaluate` con payload válido → 200

**Estado actual**: ✅ Implementado (ahora devuelve 200 + `degraded:true` cuando la IA falla o entrega JSON incompleto)

---

#### H-003/H-005: Inconsistencia web-search (Tavily vs Serper)

**Archivo**: `server/routes/webSearch.routes.js`

**Implementación aplicada**:
- El endpoint `GET /api/web-search/test` ahora reporta disponibilidad de Tavily/Serper/Bing y el `modo_funcionamiento` siguiendo la misma prioridad que `buscarWeb`:
  - Tavily → Serper → Bing → Simulación

**Verificación**: `GET /api/web-search/test` devuelve `modo_funcionamiento: "Tavily AI Search"` si `TAVILY_API_KEY` existe

**Estado actual**: ✅ Implementado

---

#### H-009: Limpieza local incompleta (localStorage/sessionStorage)

**Archivo**: `src/context/AuthContext.js`

**Problema**: coexistían claves legacy y nuevas (p. ej. prefijos `appLectura_*` de `SessionManager`) que no se limpiaban completamente en logout/cambio de usuario; además `sessionStorage` podía conservar borradores/artefactos.

**Implementación aplicada**:
- Se amplió `clearLocalUserData()` para:
  - borrar prefijos `appLectura_` y `applectura_` (además de otros existentes),
  - borrar `openai_api_key` y `user_openai_api_key`,
  - limpiar `sessionStorage` (para evitar contaminación de borradores entre usuarios en la misma pestaña).

**Estado actual**: ✅ Implementado

---

## Condiciones Pre-Piloto (12-20 alumnos)

### Checklist de Lanzamiento

| # | Tarea | Prioridad | Tiempo Est. |
|---|-------|-----------|-------------|
| 1 | Fix H-011 (API Key Leak) | 🔴 Bloqueante | 5 min |
| 2 | Fix H-008 (Rules) + Deploy | 🔴 Bloqueante | 20 min |
| 3 | Fix H-012 (Rate Limit) | 🟠 Alta | 10 min |
| 4 | Test adversarial | 🟠 Alta | 20 min |
| 5 | Fix H-001 (Assessment) | 🟡 Media | 30 min |
| 6 | Aplicar fix H-003 (web-search) | 🟡 Baja | 15 min |
| 6 | Stress test multi-tab | 🟡 Media | 30 min |

### Test Adversarial (Acceso Cruzado)

**Objetivo**: confirmar que las Firestore rules desplegadas (H-008/H-010) bloquean lectura/escritura cruzada entre cursos/usuarios.

**Pre-requisitos**:
- Tener 2 cuentas reales: Usuario A (estudiante curso X) y Usuario B (estudiante curso Y o sin curso).
- Abrir consola del navegador (DevTools) para ver errores de *permission denied*.

```bash
# 1. Login como Usuario A (estudiante de curso X)
# 2. Intentar leer documento de curso Y (no inscrito)
#    Esperado: Permission denied

# 3. Intentar escribir progreso de Usuario B
#    Esperado: Permission denied

# 4. Intentar leer progreso de Usuario B
#    Esperado: Permission denied
```

**Puntos de verificación concretos (si el flujo UI lo permite)**:
- Usuario A no debe poder leer `courses/{courseIdY}` ni `courses/{courseIdY}/students/{uidA}`.
- Usuario A no debe poder leer `students/{uidB}/progress/{textoId}`.
- Usuario A no debe poder escribir en `users/{uidB}` ni `active_sessions/{uidB}`.

### Stress Test Multi-Tab

1. Abrir 2 pestañas con mismo usuario
2. En Tab 1: Cargar lectura A
3. En Tab 2: Cargar lectura B  
4. Verificar: No hay contaminación de datos
5. Desconectar red → Reconectar
6. Verificar: Sync se resuelve sin loops

### Verificación H-009 (limpieza local/sessionStorage)

**Objetivo**: evitar contaminación de borradores/sesiones entre usuarios al hacer logout/login en la misma pestaña.

**Pasos**:
1. Login como Usuario A.
2. Crear contenido que genere persistencia local (ej. abrir un artefacto y escribir un borrador, o crear una sesión).
3. Logout.
4. Sin cerrar la pestaña, login como Usuario B.

**Esperado**:
- No se restauran borradores/sesiones del Usuario A.
- En DevTools → Application → Storage:
  - no quedan claves con prefijos `appLectura_`/`applectura_` asociadas al Usuario A,
  - `sessionStorage` aparece vacío (o sin claves de artefactos/borradores).

---

## Orden de Ejecución Recomendado

```
┌─────────────────────────────────────────────┐
│ FASE 1: CRÍTICO (antes de cualquier piloto) │
├─────────────────────────────────────────────┤
│ 1. H-009: Seguridad frontend (API Key)    │
│ 2. H-008: Endurecer firestore.rules         │
│ 3. H-010: Rate Limiting                     │
│ 4. Deploy rules + Test adversarial          │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ FASE 2: FUNCIONAL (mejora experiencia)      │
├─────────────────────────────────────────────┤
│ 4. H-001: Fix assessment evaluate           │
│ 5. Test de evaluación criterial             │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ FASE 3: NICE-TO-HAVE                        │
├─────────────────────────────────────────────┤
│ 6. H-003/H-005: Documentar web-search       │
│ 7. Stress test multi-tab                    │
└─────────────────────────────────────────────┘
```

---

## Tiempo Total Estimado

| Fase | Tiempo |
|------|--------|
| Fase 1 (Crítico + Seguridad) | ~60 min |
| Fase 2 (Funcional) | ~45 min |
| Fase 3 (Nice-to-have) | ~45 min |
| **Total** | **~2 horas** |

---

## Verificación Final

Después de aplicar todas las correcciones:

- [ ] `npm run dev` arranca sin errores
- [ ] Firestore rules desplegadas (sin DEBUG)
- [ ] Test adversarial PASS
- [ ] `/api/assessment/evaluate` devuelve 200
- [ ] `/api/web-search/test` reporta prioridad correcta
- [ ] Multi-tab no causa loops
