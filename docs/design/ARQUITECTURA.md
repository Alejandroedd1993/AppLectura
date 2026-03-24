# Arquitectura y Flujo de Datos - AppLectura

> **Actualizado**: junio 2026
> **Estado**: Arquitectura post-refactorización (servicios centralizados + evaluación criterial)
> **Versión**: 3.0

---

## Resumen Arquitectónico

AppLectura es una aplicación React + Express que proporciona lectura guiada, evaluación criterial y análisis de texto mediante IA.

- **Frontend**: React 18.2 con lazy loading, styled-components, framer-motion
- **Backend**: Express modular con controladores, servicios y middleware Firebase Auth
- **Gestión de Estado**: Context API (`AppContext`, `AuthContext`, `PedagogyContext`)
- **Proveedores IA**: `unifiedAiService.js` (frontend) / `apiClients.js` (backend) — OpenAI, DeepSeek
- **Styling**: Styled-components con temas claro/oscuro (`theme.js`)
- **Persistencia**: Firebase Firestore + localStorage

La separación **Tutor** (no evaluativo) vs **Evaluador** (formal) se mantiene. El visor unificado es `ReadingWorkspace`.

---

## Frontend (React)

### Estructura de Directorios

```
src/
├── index.js                        # Punto de entrada React
├── App.js                          # Componente raíz (tabs, lazy loading, focus mode)
├── components/                     # Componentes organizados por dominio
│   ├── tutor/                      # TutorCore, TutorDock, mensajes
│   ├── evaluacion/                 # DashboardRubricas, evaluación criterial
│   ├── analisis/                   # Análisis de texto con IA
│   ├── notas/ + notes/             # NotasEstudio, NotesPanelDock
│   ├── layout/                     # Header, Sidebar, AppShell
│   ├── auth/                       # LoginForm, AuthGuard
│   ├── teacher/ + estudiante/      # Vistas por rol
│   ├── pedagogy/                   # Integración pedagógica
│   ├── actividades/                # Artefactos de literacidad crítica
│   ├── analytics/                  # AnalyticsDashboard, distribución
│   ├── ReadingWorkspace.js         # Workspace unificado de lectura
│   ├── VisorTexto_responsive.js    # Visor de texto virtualizado
│   ├── CargaTexto_responsive.js    # Carga de archivos
│   └── LecturaInteractiva.js       # Legacy (detrás de feature flag)
├── hooks/
│   ├── useTutorThreads.js          # Gestión de hilos de tutor
│   ├── useTutorPersistence.js      # Persistencia compacta [{r,c}]
│   ├── useFollowUpQuestion.js      # Follow-ups heurísticos
│   ├── useAnnotations.js           # Anotaciones sobre texto
│   ├── useKeyboardShortcuts.js     # Atajos de teclado
│   ├── useRateLimit.js             # Rate limiting frontend
│   ├── useSessionMaintenance.js    # Mantenimiento de sesión
│   ├── usePedagogyIntegration.js   # Integración con rúbricas
│   ├── useReadingProgress.js       # Progreso de lectura
│   └── notes/useNotasEstudioHook.js
├── services/
│   ├── unifiedAiService.js         # Servicio IA unificado (chatCompletion, extractContent)
│   ├── glossaryService.js          # Glosario inteligente
│   ├── termDefinitionService.js    # Definiciones contextuales (TtlCache)
│   ├── segmentTextService.js       # Segmentación de texto (TtlCache)
│   ├── evaluacionIntegral.service.js # Evaluación criterial dual
│   ├── bitacoraEticaIA.service.js  # Bitácora ética IA
│   ├── mapaActores.service.js      # Mapa de actores
│   ├── respuestaArgumentativa.service.js # Respuesta argumentativa
│   ├── tablaACD.service.js         # Tabla ACD
│   ├── resumenAcademico.service.js # Resumen académico
│   ├── sessionManager.js           # Gestión de sesiones
│   └── notes/                      # OpenAINotesService, StorageService
├── context/
│   ├── AppContext.js               # Estado global (texto, modoOscuro, loading)
│   ├── AuthContext.js              # Autenticación Firebase
│   └── PedagogyContext.js          # Contexto pedagógico
├── config/
│   └── backend.js                  # URL del backend (REACT_APP_BACKEND_URL)
├── constants/
│   ├── aiModelDefaults.js          # Modelos por defecto (DeepSeek, OpenAI)
│   └── timeoutConstants.js         # Timeouts de IA
├── pedagogy/rubrics/               # Rúbricas de literacidad crítica
├── styles/
│   └── theme.js                    # Temas claro/oscuro
└── utils/
    ├── jsonClean.js                # stripJsonFences() — limpieza JSON unificada
    ├── TtlCache.js                 # Caché LRU con TTL
    ├── backendRequest.js           # buildBackendEndpoint, getFirebaseAuthHeader
    ├── backendUtils.js             # fetchWithTimeout, processPdfWithBackend
    ├── fileProcessor.js            # Procesamiento de archivos
    ├── textAnalysisMetrics.js      # Métricas de texto
    ├── hash.js                     # buildEdgeFingerprint, hashStringDjb2
    ├── sessionHash.js              # Hash de sesión
    ├── cache.js                    # Utilidades de caché localStorage
    ├── runtimeEnv.js               # Detección de entorno
    └── fetchWebSearch.js           # Búsqueda web frontend
```

### Punto de Entrada

`src/index.js` → `src/App.js` (envuelto en `AppContextProvider` + `ThemeProvider` + `AuthProvider` + `PedagogyProvider`).

`App.js` usa lazy loading para componentes principales y un sistema de tabs (ReadingWorkspace, Evaluación, Actividades, Mi Progreso).

### Servicio IA Unificado (`unifiedAiService.js`)

Abstrae la comunicación con proveedores de IA vía backend proxy:

```js
import { chatCompletion, extractContent } from './unifiedAiService';
const response = await chatCompletion({ provider: 'deepseek', messages, temperature: 0.3 });
const content = extractContent(response);
```

Todos los servicios de evaluación criterial consumen este servicio.

### Utilidades Compartidas

| Utilidad | Función |
|---|---|
| `stripJsonFences()` | Elimina markdown fences de respuestas IA |
| `TtlCache` | Caché LRU con TTL (reemplaza `new Map()` sin límites) |
| `buildBackendEndpoint()` | Construye URLs del backend con `REACT_APP_BACKEND_URL` |
| `getFirebaseAuthHeader()` | Header Authorization para endpoints protegidos |

---

## Backend (Express)

### Estructura

```
server/
├── index.js                        # Servidor Express, monta rutas
├── config/
│   ├── apiClients.js               # Pool de clientes OpenAI SDK (getOpenAICompatibleClient)
│   ├── providerDefaults.js         # buildDeepSeekChatRequest, modelos default
│   ├── firebaseAdmin.js            # Firebase Admin SDK
│   ├── loadEnv.js                  # Carga .env consolidada
│   └── settings.js                 # Configuraciones del servidor
├── routes/
│   ├── chat.completion.routes.js   # /api/chat/completion
│   ├── analisis.routes.js          # /api/analysis/text
│   ├── assessment.routes.js        # /api/assessment/*
│   ├── notes.routes.js             # /api/notes/generate
│   ├── glossary.routes.js          # /api/glossary/*
│   ├── pdf.routes.js               # /api/process-pdf
│   ├── ocr.routes.js               # /api/ocr-image
│   ├── webSearch.routes.js         # /api/web-search
│   ├── storage.routes.js           # /api/storage/*
│   └── adminCleanup.routes.js      # /api/admin/cleanup
├── controllers/
│   ├── chat.completion.controller.js # Chat con caché (responseCache)
│   ├── analisis.controller.js      # Análisis de texto
│   ├── assessment.controller.js    # Evaluación criterial
│   ├── glossary.controller.js      # Glosario (usa OpenAI SDK client)
│   ├── preLectura.controller.js    # Pre-lectura con web search
│   ├── notes.controller.js         # Generación de notas
│   ├── webSearch.controller.js     # Búsqueda web (Tavily)
│   └── adminCleanup.controller.js  # Limpieza admin Firestore
├── services/
│   ├── aiClient.service.js         # Cliente IA genérico
│   ├── webSearch.service.js        # Búsqueda web Tavily
│   ├── preLecturaWebCache.service.js # Caché pre-lectura (TTL + LRU)
│   ├── preLecturaWebDecision.service.js # Lógica de decisión web search
│   ├── jsonRepair.service.js       # Reparación de JSON malformado
│   └── pdf.service.js              # Procesamiento de PDFs
├── middleware/
│   ├── firebaseAuth.js             # Autenticación Firebase
│   ├── rateLimiter.js              # Rate limiting por endpoint
│   └── requestContext.js           # Contexto de request (requestId)
├── utils/
│   ├── responseCache.js            # Caché de respuestas chat (TTL + max size)
│   ├── envUtils.js                 # parseBool, parseIntEnv
│   ├── modelUtils.js               # resolveModel, resolveMaxTokens
│   └── apiResponse.js              # Helpers de respuesta estandarizada
├── prompts/                        # Templates de prompts IA
└── validators/                     # Validación de entrada
```

### Endpoints Principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/chat/completion` | Chat conversacional (Tutor/Evaluador) |
| POST | `/api/analysis/text` | Pre-lectura con web search opcional |
| POST | `/api/assessment/evaluate` | Evaluación criterial |
| POST | `/api/notes/generate` | Notas de estudio |
| POST | `/api/web-search` | Búsqueda web (Tavily) |
| POST | `/api/glossary/generate` | Glosario inteligente |
| POST | `/api/process-pdf` | Procesamiento de PDFs |
| POST | `/api/ocr-image` | OCR de imágenes |

### Configuración IA Backend

```js
// server/config/apiClients.js — Pool de clientes OpenAI SDK
import { getOpenAICompatibleClient } from './apiClients.js';
const client = getOpenAICompatibleClient('deepseek');
const completion = await client.chat.completions.create({ model, messages });
```

---

## Flujo de Datos

### Análisis de Texto (Pre-Lectura)
```
Usuario carga texto → App.js → backend /api/analysis/text
  → preLectura.controller: detectWebSearchNeed() → generateSearchQueries()
  → webSearch.service (Tavily) → extractKeyFindings()
  → buildUnifiedPrompt() → DeepSeek API → parseAndStructureAnalysis()
  → Respuesta JSON → frontend muestra análisis
```

### Evaluación Criterial
```
Estudiante responde artefacto → servicio de evaluación (ej. tablaACD.service)
  → chatCompletion({ provider: 'deepseek' }) rápido (estructura)
  → chatCompletion({ provider: 'openai' }) profundo (opcional)
  → stripJsonFences() → combina evaluaciones → rubricScore → UI
```

### Chat Tutor
```
Usuario escribe mensaje → TutorCore → backend /api/chat/completion
  → responseCache check → DeepSeek/OpenAI → respuesta
  → onAssistantMessage() → useFollowUpQuestion heurístico → injectAssistant()
```

---

## Extensión Tutor: Unificación "Lectura Guiada"

Convergencia de "Solo Lectura" y "Lectura Interactiva" en un modelo único de acompañamiento pedagógico no evaluativo.

### Cambios Técnicos Clave
1. `TutorCore` acepta `onAssistantMessage(message, api)` y `injectAssistant(content)`.
2. Hook `useTutorPersistence` centraliza hidratación y guardado compacto (`[{r,c}]`).
3. Hook `useFollowUpQuestion` genera preguntas heurísticas (contrast detection, conceptos capitalizados).
4. Eliminación progresiva de gamificación para alinear con rol de tutor guía.

### Flujo Post-Respuesta
```
Usuario → sendPrompt() → backend responde → onAssistantMessage() → heurística follow-up → injectAssistant()
```

### Roadmap Resumido

| # | Tarea | Estado |
|---|-------|--------|
| 1 | TutorCore (onAssistantMessage + injectAssistant) | Done |
| 2 | useTutorPersistence | Done |
| 3 | useFollowUpQuestion | Done |
| 4 | Refactor LecturaInteractiva (remover puntuación) | Done |
| 5 | WebEnrichmentButton reutilizable | Done |
| 6 | ReadingWorkspace unificado | Done |
| 7 | Deprecar LecturaInteractiva | En progreso (feature flag) |
| 8-13 | Tests dedicados | Done |
| 14 | Feature flag desactivación legacy | Done |
| 15 | Paridad focus mode | Pendiente |
| 16 | Telemetría mínima | Pendiente |

### Estrategia de Retirada Legacy
`LecturaInteractiva` permanece disponible tras feature flag `REACT_APP_DISABLE_LEGACY_INTERACTIVE`. Se activará definitivamente tras completar paridad de focus mode.

### Tests Clave
- `ReadingWorkspace.actions.test.js` — reader-action → prompt tutor
- `ReadingWorkspace.smoke.test.js` — flujo notas + prompt + enriquecimiento
