# Plan de Auditoría Profunda - AppLectura Post-Migración

> **Objetivo**: Verificar exhaustivamente que la aplicación funciona correctamente después de restaurar archivos desde AppLectura11, sin regresiones funcionales y sin contaminación de datos entre **usuarios** y **cursos**.

> **Principio rector**: La auditoría debe producir evidencia reproducible (pasos + resultados + artefactos) y un veredicto claro **GO / NO-GO**.

---

## 0. Alcance, Entorno y Evidencias (CRÍTICO)

### 0.1 Alcance
- Incluye: arranque, APIs backend, flujo estudiante/docente, autenticación, sesiones, análisis (con degradación), recompensas, sincronización Firebase, aislamiento UID+curso.
- Excluye (si aplica): optimización de performance, refactors masivos, mejoras UX no solicitadas.

### 0.2 Entorno y precondiciones
- SO: Windows
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Recomendado: dos navegadores/ventanas (normal + incógnito) para pruebas multiusuario.
- Recomendado: 2 cuentas reales (Usuario A y Usuario B) y 2 cursos (Curso 1 y Curso 2).

### 0.3 Matriz de escenarios (para evitar falsos positivos)
Ejecuta la auditoría en estos escenarios y registra cuál aplica:

1) **Sin API keys** (modo degradado):
- Esperado: la app **no se rompe**. El análisis puede ser básico/fallback, pero Lectura Guiada y la navegación deben funcionar.

2) **Con API keys válidas** (modo completo):
- Esperado: el análisis profundo responde sin errores recurrentes y la UI se actualiza.

3) **API key inválida / sin crédito** (p.ej. errores 401/402/429):
- Esperado: el backend responde con fallback (o el frontend mantiene análisis básico) y **no bloquea el flujo**.

### 0.4 Evidencias mínimas a capturar (por cada hallazgo)
- Captura de pantalla de UI + consola.
- En Network: request fallida (status/response) o confirmación de status 200.
- Identificadores: `uid`, `courseId`, `currentTextoId`, `document_id` (si aparecen en logs).
- (Si es aislamiento) capturas de Local Storage keys relevantes.
- (Si es Firebase) capturas/exports mínimos de documentos afectados (ruta + campos clave), sin datos sensibles.

### 0.5 Criterio de GO / NO-GO
- **GO**: Flujos críticos (Secciones 1–5 y 8) pasan en el escenario objetivo (degradado o completo) y no hay contaminación de datos.
- **NO-GO**: cualquiera de:
	- No se puede leer/continuar en Lectura Guiada.
	- Login/Logout deja estado contaminado.
	- Cambio de curso o usuario mezcla progreso/puntos/sesiones.
	- El análisis bloquea la UI (loading infinito o error permanente que impide usar el módulo).

---

## Índice de Secciones

| # | Sección | Prioridad | Estado |
|---|---------|-----------|--------|
| 1 | [Compilación y Arranque](#1-compilación-y-arranque) | 🔴 CRÍTICA | ⬜ Pendiente |
| 2 | [Backend APIs](#2-backend-apis) | 🔴 CRÍTICA | ⬜ Pendiente |
| 3 | [Frontend Core](#3-frontend-core) | 🔴 CRÍTICA | ⬜ Pendiente |
| 4 | [Autenticación y Sesiones](#4-autenticación-y-sesiones) | 🔴 CRÍTICA | ⬜ Pendiente |
| 5 | [Análisis de Texto (DeepSeek + OpenAI)](#5-análisis-de-texto) | 🔴 CRÍTICA | ⬜ Pendiente |
| 6 | [Sistema de Recompensas](#6-sistema-de-recompensas) | 🟡 ALTA | ⬜ Pendiente |
| 7 | [Sincronización Firebase](#7-sincronización-firebase) | 🟡 ALTA | ⬜ Pendiente |
| 8 | [Aislamiento Usuario/Curso](#8-aislamiento-usuariocurso) | 🔴 CRÍTICA | ⬜ Pendiente |
| 9 | [Registro de Hallazgos](#9-registro-de-hallazgos) | 🔴 CRÍTICA | ⬜ Pendiente |

---

## 1. Compilación y Arranque

### 1.1 Verificaciones Técnicas
- [ ] `npm run dev` arranca sin errores fatales
- [ ] Backend escucha en puerto 3001
- [ ] Frontend compila sin errores de webpack
- [ ] No hay errores de importación de módulos
- [ ] Hot reload funciona correctamente

**Criterio de aceptación**
- La aplicación queda navegable en `http://localhost:3000`.
- El backend responde `200` en `/health` y `/api/health`.

### 1.2 Logs Esperados
```
✅ Backend: http://localhost:3001 (funcionando)
✅ Frontend: http://localhost:3000 (compilado)
✅ webpack compiled successfully
```

### 1.3 Archivos Críticos a Verificar
- `server/controllers/preLectura.controller.js` - Análisis principal
- `src/context/AppContext.js` - Estado global
- `src/context/AuthContext.js` - Autenticación
- `src/firebase/firestore.js` - Firebase operations

**Evidencia**
- Captura de consola del backend mostrando rutas + puerto.
- Captura del frontend compilado (aunque sea con warnings).

---

## 2. Backend APIs

### 2.1 Health Check
- [ ] `GET /api/health` → 200 OK
- [ ] `GET /health` → 200 OK

**Notas Windows/PowerShell**
- En PowerShell, `curl` puede ser alias de `Invoke-WebRequest` y pedir confirmación. Preferir:
	- `curl.exe http://localhost:3001/health`
	- o `Invoke-WebRequest -UseBasicParsing http://localhost:3001/health`

### 2.2 Análisis de Texto
- [ ] `POST /api/analysis/prelecture` → Responde (no timeout)
- [ ] `POST /api/analysis/text` → Responde correctamente
- [ ] Timeout de 300 segundos configurado
- [ ] Safety timeout de 295 segundos funciona
- [ ] Fallback analysis se genera en caso de error

**Criterio de aceptación (modo degradado)**
- Si faltan keys o hay error del proveedor, el endpoint debe devolver:
	- `200` con análisis básico, o
	- `500` pero con `fallback` utilizable (y la app NO debe romperse).

**Evidencia**
- Guardar payload de respuesta (o fragmentos relevantes: `metadata.document_id`, `metadata.provider`, `prelecture`, `critical`).

### 2.3 Chat Completion
- [ ] `POST /api/chat/completion` → DeepSeek funciona
- [ ] Fallback a OpenAI si DeepSeek falla
- [ ] Fallback a Gemini si OpenAI falla

**Criterio de aceptación**
- Si no hay keys: el endpoint debe manejarlo con mensaje claro, sin tumbar el server.

### 2.4 Figuras Retóricas (Paralelo)
- [ ] DeepSeek + OpenAI se llaman en paralelo (Promise.all)
- [ ] `detectAndExtractFigurasRetoricas` funciona
- [ ] Validación de figuras retóricas no descarta válidas

**Evidencia**
- Logs del backend que indiquen la ejecución paralela y el conteo de figuras.

---

## 3. Frontend Core

### 3.1 Estado Global (AppContext)
- [ ] `activeLecture` maneja estado atómico
- [ ] `switchLecture()` cambia lectura sin race conditions
- [ ] `setCompleteAnalysis()` actualiza correctamente
- [ ] Cache de análisis funciona (localStorage)
- [ ] Cache LRU limita a 10 análisis

**Criterio de aceptación**
- Cambiar entre lecturas no “arrastra” análisis/puntos/artefactos incorrectos.
- Si el análisis profundo falla, la UI debe seguir usable (sin error persistente que tape Lectura Guiada).

### 3.2 Navegación
- [ ] Rutas de estudiante funcionan
- [ ] Rutas de docente funcionan
- [ ] Redirección por rol correcta

**Evidencia**
- Video corto o capturas navegando: Lectura Guiada → Análisis → Actividades → Notas → Evaluación.

### 3.3 Componentes Críticos
- [ ] `TutorDock` renderiza sin errores
- [ ] `ReadingWorkspace` carga texto correctamente
- [ ] `VisorTexto` muestra PDFs y texto plano

**Criterio de aceptación**
- No hay crashes (pantalla en blanco) en componentes principales.

---

## 4. Autenticación y Sesiones

### 4.1 Login/Logout
- [ ] Login con Google funciona
- [ ] Logout limpia estado correctamente
- [ ] Tokens se persisten entre recargas

**Criterio de aceptación**
- Logout debe borrar el estado en memoria y evitar que el siguiente usuario herede UI/estado.

### 4.2 Gestión de Sesiones
- [ ] SessionManager se inicializa con UID correcto
- [ ] Sesiones se guardan en localStorage con namespace
- [ ] Sesiones se sincronizan a Firestore
- [ ] Conflictos de sesión se detectan

**Evidencia**
- Captura de Local Storage mostrando keys por usuario.
- (Si aplica) documento de Firestore de sesiones con ruta y campos clave.

### 4.3 Rol de Usuario
- [ ] `userData.role` se detecta correctamente
- [ ] Componentes de estudiante vs docente se renderizan según rol

---

## 5. Análisis de Texto

### 5.1 Flujo Completo
- [ ] Usuario selecciona texto → análisis inicia
- [ ] Análisis básico (heurísticas) se muestra inmediatamente
- [ ] Análisis profundo (DeepSeek) completa en background
- [ ] UI se actualiza cuando análisis profundo termina

**Criterio de aceptación (degradación obligatoria)**
- Si el análisis profundo falla (401/402/429/500), se mantiene al menos el análisis básico/fallback y el usuario puede seguir leyendo.

### 5.2 Manejo de Errores
- [ ] Timeout de frontend (300s) no aborta prematuramente
- [ ] Si DeepSeek falla, fallback analysis se muestra
- [ ] Errores de red se manejan con retry

**Evidencia**
- Para 1 caso de error real: capturar response y confirmar que no bloquea el flujo.

### 5.3 Cache y Persistencia
- [ ] Análisis se guarda en localStorage por textoId
- [ ] Cache hit evita re-análisis
- [ ] Cache expira correctamente (24h)

### 5.4 Métricas de Tiempo
- [ ] Análisis completa en < 60 segundos (texto normal)
- [ ] Análisis completa en < 180 segundos (texto largo)

**Nota**
- Registrar tiempos reales observados (promedio de 3 intentos) y el escenario (con/sin keys).

---

## 6. Sistema de Recompensas

### 6.1 RewardsEngine
- [ ] `window.__rewardsEngine` se inicializa
- [ ] Puntos se acumulan correctamente
- [ ] Estado se persiste entre recargas

**Criterio de aceptación**
- Puntos visibles y consistentes con acciones; no reseteos inesperados entre recargas.

### 6.2 Aislamiento por Usuario
- [ ] Puntos son específicos por UID
- [ ] Logout NO borra puntos de otros usuarios
- [ ] Login carga puntos del usuario correcto

### 6.3 Sincronización
- [ ] `rewardsState` se guarda en `global_progress`
- [ ] Cambios se sincronizan a Firestore (debounce 3s)

**Evidencia**
- 1 captura de puntos antes/después de acción + registro de escritura remota (si aplica).

---

## 7. Sincronización Firebase

### 7.1 Firestore Rules
- [ ] Estudiantes pueden leer/escribir su progreso
- [ ] Docentes pueden leer progreso de sus estudiantes
- [ ] Reglas de seguridad bloquean acceso no autorizado

**Criterio de aceptación**
- Prueba negativa: Usuario B NO puede leer/escribir progreso de Usuario A (mismo curso y distinto curso).

### 7.2 Listeners en Tiempo Real
- [ ] `subscribeToStudentProgress` funciona
- [ ] Cambios remotos se reflejan en UI
- [ ] No hay loops de sincronización

### 7.3 Conflictos de Merge
- [ ] Estrategia "más reciente gana" funciona
- [ ] Scores se concatenan (no sobrescriben)
- [ ] ArtefactsProgress usa "más completo + timestamp"

**Evidencia**
- Para 1 caso: modificar en 2 ventanas y observar merge sin duplicados/loops.

---

## 8. Aislamiento Usuario/Curso

### 8.1 Smoke Test Multi-Usuario
```
1. Login Usuario A (curso 1) → realizar actividad → logout
2. Login Usuario B (curso 1) → verificar NO heredó datos de A
3. Login Usuario A (curso 2) → verificar datos aislados por curso
```

**Regla de oro**
- Cualquier dato persistente debe estar, como mínimo, namespaced por `uid` y (si aplica) por `courseId`/`textoId`.

### 8.2 Verificaciones de Aislamiento
- [ ] `rubricProgress` es por UID
- [ ] `savedCitations` es por UID + textoId
- [ ] `activitiesProgress` es por UID + textoId
- [ ] `rewardsState` es global por UID (no por curso)

### 8.3 Edge Cases
- [ ] Cambiar de lectura durante análisis no contamina
- [ ] Restaurar sesión no sobrescribe datos de otra lectura
- [ ] `switchLecture()` resetea análisis correctamente

**Evidencia**
- 2 capturas de Local Storage (Usuario A vs Usuario B) mostrando keys diferenciados.
- 1 captura cambiando de curso y verificando que no se arrastran datos.

---

## 9. Registro de Hallazgos

### 9.1 Formato de hallazgo (usar siempre)
- **ID**: AUD-YYYYMMDD-###
- **Severidad**: Crítica / Alta / Media / Baja
- **Escenario**: sin keys / keys válidas / key inválida-sin crédito
- **Pasos para reproducir**: 1..N
- **Resultado esperado**
- **Resultado observado**
- **Evidencia**: capturas + request/response + logs
- **Sospecha técnica** (si aplica)
- **Decisión**: bloquear release (sí/no)

### 9.2 Tabla rápida (opcional)
| ID | Severidad | Módulo | Resumen | Estado |
|----|-----------|--------|--------|--------|
| AUD-YYYYMMDD-001 | Crítica | Lectura Guiada | … | Abierto |

---

## Metodología de Auditoría

### Paso 1: Verificación de Compilación
Ejecutar `npm run dev` y confirmar que todo arranca.

### Paso 2: Tests de Backend
Usar curl/Postman para verificar cada endpoint.

### Paso 3: Tests de Frontend
Navegar por la aplicación verificando cada flujo.

### Paso 4: Tests de Integración
Probar flujos completos end-to-end.

### Paso 5: Tests de Aislamiento
Usar múltiples usuarios para verificar no hay contaminación.

**Orden recomendado (reduce diagnósticos erróneos)**
1) 1. Compilación y Arranque
2) 2. Backend APIs (health + analysis)
3) 4. Autenticación y Sesiones
4) 8. Aislamiento Usuario/Curso
5) 3. Frontend Core
6) 5. Análisis de Texto
7) 6–7 según aplique

---

## Herramientas de Auditoría

| Herramienta | Uso |
|-------------|-----|
| `npm run dev` | Arrancar aplicación |
| Browser DevTools (Console) | Ver logs y errores |
| Browser DevTools (Network) | Ver llamadas API |
| curl / Postman | Probar endpoints |
| Firebase Console | Verificar datos en Firestore |

**Sugerencia práctica**
- Para Network, exportar un HAR cuando aparezca un fallo crítico.

---

## ¿Por dónde empezamos?

> [!IMPORTANT]
> **Recomendación**: Empezar por **Sección 1 (Compilación)** para asegurar que la aplicación arranca correctamente antes de probar funcionalidades.

¿Confirmas para iniciar la auditoría con la Sección 1?
