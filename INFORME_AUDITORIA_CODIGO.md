## Auditoría técnica de código y mapa de la aplicación

### Objetivo
Evaluar duplicidades, módulos legacy, funciones/procesos repetidos y errores/riesgos de código. Incluye un mapa de módulos y conexiones principales.

---

## 1) Mapa de la aplicación

- **Frontend (`src/`)**
  - `components/`: UI principal (lectura, análisis, notas, tutor, PDF, layout)
    - `components/analisis/`: paneles y controles de análisis crítico
    - `components/notas/`: versión refactorizada del módulo de notas
    - `components/tutor/`: UI del tutor
    - `components/layout/`: navegación/tab/header
    - `components/lectura`: variantes de lector interactivo y PDF (`PDFViewer`)
  - `context/`: contextos de estado global (App, Pedagogía, Análisis)
  - `hooks/`: lógica de dominio (persistencia, rubricas, análisis, tutor, notas)
  - `services/`: orquestadores y servicios de IA, RAG, PDF, glosario, notas, exportación
  - `pedagogy/`: motores y artefactos pedagógicos (rubricas, prompts, progresión)
  - `utils/`: utilitarios transversales (cache, net, pdf, texto, validaciones)
  - `styles/`: tema/estilos
  - `config/`: proveedores IA

- **Backend (`server/`)**
  - `routes/`: rutas Express montadas en `index.js`
  - `controllers/`: controladores por dominio (analysis, notes, pdf, web-search, ocr, assessment)
  - `services/`: servicios (estrategias OpenAI/DeepSeek/Gemini, OCR, PDF, tabla)
  - `config/`: settings, clientes API
  - `middleware/`: performance
  - `validators/`: esquemas de validación

- **Conexión Frontend ↔ Backend**
  - Proxy en `package.json` -> `"proxy": "http://localhost:3001"`
  - Rutas montadas en backend:

```117:134:server/index.js
// Montaje de rutas API
app.use('/api', pdfRoutes);
app.use('/api/chat', chatCompletionRoutes);
app.use('/api/analysis', analisisRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/web-search', webSearchRoutes);
app.use('/api', ocrRoutes);
app.use('/api/assessment', assessmentRoutes);
```

---

## 2) Archivos legacy / duplicados y estado de uso

### 2.1 Backend (duplicación rutas/controladores de chat)

- Hay dos stacks para chat:
  - En uso: `routes/chat.completion.routes.js` + `controllers/chat.completion.controller.js`
  - Legacy: `routes/chatRoutes.js` + `controllers/chatController.js` (CommonJS)

Prueba de montaje real: el backend importa y monta SOLO `chat.completion.routes`.

```9:14:server/index.js
import chatCompletionRoutes from './routes/chat.completion.routes.js';
...
app.use('/api/chat', chatCompletionRoutes);
```

Rutas legacy detectadas (no montadas):

```1:13:server/routes/chatRoutes.js
import express from 'express';
import { generarPregunta, evaluarRespuesta } from '../controllers/chatController.js';
const router = express.Router();
router.post('/pregunta', generarPregunta);
router.post('/evaluacion', evaluarRespuesta);
export default router;
```

Controlador legacy (CommonJS + modelo obsoleto):

```3:11:server/controllers/chatController.js
const { OpenAI } = require('openai');
...
const generarPregunta = async (req, res) => {
```

→ Recomendación: eliminar `server/routes/chatRoutes.js` y `server/controllers/chatController.js` o mover a `legacy/`.


### 2.2 Frontend (componentes y servicios duplicados/legacy)

- `src/components/LecturaInteractiva_fixed.js` convive con `LecturaInteractiva_with_web.js` y el flujo actual (`ReadingWorkspace`, `VisorTexto*`). Si no se importa en ninguna parte, marcar para eliminación.
- `src/components/SistemaEvaluacion_clean.js` convive con `components/SistemaEvaluacion.js`.
- Respaldo residual: `src/VisorTexto_responsive.js.backup`.
- Análisis legacy no referenciado:

```1:1:src/components/analisis/LegacyAnalisisTexto.js
// Archivo legacy presente en árbol, sin referencias de import
```

- Duplicación módulo de notas (mixto español/inglés y refactorización):
  - `components/NotasEstudio.js` y `components/NotasEstudioNuevo.js` vs carpeta `components/notas/` con `NotasEstudioRefactorizado.js` y `index.js` que reexporta la versión refactorizada.

```1:8:src/components/notas/index.js
export { default as NotasEstudio } from './NotasEstudioRefactorizado';
```

→ Recomendación: consolidar a `components/notas/NotasEstudioRefactorizado.js` y retirar `NotasEstudio.js` y `NotasEstudioNuevo.js` si no se usan.

- Servicio de notas con duplicado de nombre:
  - `src/services/notes/OpenAINotesService.js` (implementado)
  - `src/services/notes/openaiService.js` (archivo vacío)

```1:1:src/services/notes/openaiService.js
// (vacío)
```

→ Recomendación: eliminar `openaiService.js` vacío.

- Contexto duplicado no usado: `context/AppContextUpgraded.js` no aparece en ninguna importación.
→ Recomendación: eliminar o archivar en `legacy/`.

---

## 3) Funciones/procesos repetidos o solapados

- Chat y evaluación: coexistencia de dos pipelines (legacy vs nuevo streaming/completion). Mantener solo `chat.completion.*`.
- Notas/estudio: componentes viejos y nuevos conviven; procesos de gestión de notas existen tanto en `components/NotasEstudio*.js` como en `components/notas` y `hooks/notes`. Consolidar en el paquete `components/notas` + `hooks/notes` + `services/notes`.
- Lectura/Visor: variantes `LecturaInteractiva_fixed` y `LecturaInteractiva_with_web` sugieren proceso duplicado de lectura interactiva. Verificar llamadas reales desde `ReadingWorkspace`.
- Contexto App duplicado (AppContext vs AppContextUpgraded) indica dos formas de construir el estado global.

Acciones sugeridas:
- Buscar importaciones reales y eliminar las variantes no usadas.
- Homogeneizar nombres en inglés o español dentro de cada dominio (p. ej., `notes` vs `notas`).

---

## 4) Errores y riesgos de código detectados

- Seguridad: clave API por defecto embebida para DeepSeek en backend.

```38:46:server/index.js
const config = {
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8',
    model: 'deepseek-chat'
  },
```

→ Riesgo crítico: eliminar el fallback con una clave estática y fallar si falta la env var.

- Mezcla de módulos (ESM vs CommonJS) en `server/controllers/chatController.js`.
→ Inconsistencia y potenciales errores si se reactiva; mantener todo ESM o eliminar legacy.

- CORS abierto en backend (`origin: '*'`).
→ Aceptable en desarrollo; restringir en producción.

- Servicio de Notas accede `localStorage` en servicio (acoplamiento a navegador):
→ Mover la inyección de API key a capa UI/config y pasarla por parámetro al servicio.

- Archivo vacío `src/services/notes/openaiService.js`.
→ Puede romper imports si alguien lo usa por error.

- Backups en árbol (`*.backup`) y variantes `_clean`/`_fixed` conviviendo con versiones activas.
→ Incrementan superficie de mantenimiento y riesgo de imports equivocados.

- `PDFViewer`: logging ruidoso y manejo de selección robusto, sin errores críticos detectados. Confirmado uso de capas de texto/anotación y scroll reset controlado.

```133:160:src/components/PDFViewer.js
console.log('📄 [PDFViewer] Renderizando con file:', ...);
<Document
  file={file}
  onLoadSuccess={handleDocumentLoadSuccess}
  onLoadError={handleDocumentLoadError}
>
  <Page
    key={`${pageNumber}-${scale}`}
    pageNumber={pageNumber}
    scale={scale}
    renderTextLayer
    renderAnnotationLayer
  />
</Document>
```

→ Sugerencia: reducir logs en producción y parametrizar `renderTextLayer`/`renderAnnotationLayer` si hubiera issues de performance.

---

## 5) Recomendaciones de limpieza y consolidación

1) Backend
- Eliminar `server/routes/chatRoutes.js` y `server/controllers/chatController.js`.
- Quitar fallback con clave DeepSeek en `server/index.js` y exigir env var.
- Restringir CORS por entorno.

2) Frontend
- Eliminar `src/services/notes/openaiService.js` vacío.
- Eliminar `src/VisorTexto_responsive.js.backup`.
- Retirar `components/LecturaInteractiva_fixed.js` y `components/SistemaEvaluacion_clean.js` si no existen imports reales.
- Retirar `components/analisis/LegacyAnalisisTexto.js` si no se usa.
- Consolidar módulo de Notas en `components/notas` + `hooks/notes` + `services/notes` y eliminar `NotasEstudio.js`/`NotasEstudioNuevo.js` si están obsoletos.
- Eliminar `context/AppContextUpgraded.js` si no tiene referencias.

3) Nomenclatura y estructura
- Unificar idioma por dominio (por ejemplo, `notes` para todo el módulo, o `notas`, pero no ambos).
- Crear carpeta `legacy/` si se desea conservar referencias históricas fuera del árbol activo.

4) Calidad/seguridad
- Evitar logs verbosos en componentes de alto render (e.g., `PDFViewer`).
- Inyectar claves/API en servicios vía parámetros/contexto, no `localStorage` desde la capa de servicio.

---

## 6) Próximos pasos sugeridos (ordenado)

- Backend: seguridad y rutas
  - Quitar clave DeepSeek embebida y legacy de chat.
  - Revisar `server/routes/*` para consistencia de nombres (`*.routes.js`).

- Frontend: poda y consolidación
  - Eliminar archivos vacíos/backup y variantes `_clean/_fixed` no usadas.
  - Consolidar módulo Notas y verificar imports reales desde `ReadingWorkspace`.
  - Unificar contexto de `AppContext` y retirar `AppContextUpgraded`.

- Validación
  - Ejecutar pruebas e2e básicas de lectura/análisis/notas.
  - Revisar bundle con `npm run analyze` para asegurar que legacy no entra al build.

---

## 7) Anexos (referencias rápidas)

- Rutas montadas en backend: ver bloque en `server/index.js` (arriba).
- Reexport de Notas refactorizado:

```1:8:src/components/notas/index.js
export { default as NotasEstudio } from './NotasEstudioRefactorizado';
```

- Archivo vacío a eliminar:

```1:1:src/services/notes/openaiService.js
// (vacío)
```

- Legacy chat (no montado):

```1:13:server/routes/chatRoutes.js
// ver sección 2.1
```

---

## 9) Análisis Detallado: Pestaña "Lectura Guiada"

### 9.1) Arquitectura del Componente Principal

**Archivo principal:** `src/components/ReadingWorkspace.js`

**Propósito:** Unificar la experiencia de lectura interactiva con acompañamiento del tutor IA. Actúa como orquestador central que coordina:
- Visor de texto/PDF (`VisorTextoResponsive`)
- Tutor inteligente (`TutorDock` + `TutorCore`)
- Panel de notas (`NotesPanelDock`)
- Enriquecimiento web (`WebEnrichmentButton`)
- Integración pedagógica (Bloom, ACD, Progresión)

### 9.2) Dependencias y Conexiones

#### A) Contextos Globales
1. **AppContext** (`src/context/AppContext.js`)
   - Lee: `texto`, `modoOscuro`, `setTexto`
   - El texto viene del componente `CargaTexto` (sidebar izquierdo)
   - Sincronización: cuando cambia `texto`, se actualiza el visor y el tutor

2. **PedagogyContext** (`src/context/PedagogyContext.js`)
   - Lee: `hasPedagogyProvider` (verifica si hay provider disponible)
   - Usa: `BloomLevelIndicator`, `CriticalProgressionPanel`, `ACDAnalysisPanel`
   - Solo se muestran si `hasPedagogyProvider === true`

#### B) Componentes Integrados
1. **VisorTextoResponsive** (`src/VisorTexto_responsive.js`)
   - Responsabilidad: Renderizar texto/PDF con selección, zoom, búsqueda
   - Emite eventos: `reader-action` cuando el usuario selecciona texto y elige acción
   - Props recibidas: `texto` (desde AppContext)

2. **TutorDock** (`src/components/tutor/TutorDock.js`)
   - Responsabilidad: Panel lateral del tutor IA (expandible/colapsable)
   - Estado controlado por ReadingWorkspace: `showTutor`, `tutorExpanded`
   - Recibe: `followUps`, `expanded`, `onToggleExpand`
   - Emite eventos: `tutor-ready` (cuando está montado), `tutor-width-change` (cuando cambia tamaño)

3. **NotesPanelDock** (`src/components/notes/NotesPanelDock.js`)
   - Responsabilidad: Panel flotante de notas de estudio
   - Estado: `showNotes` (controlado por ReadingWorkspace)
   - API: `notesApi` (proporcionado por `useNotesWorkspaceAdapter`)

4. **WebEnrichmentButton** (`src/components/chat/WebEnrichmentButton.js`)
   - Responsabilidad: Buscar contexto web y enriquecer el prompt antes de enviar al tutor
   - Props: `query`, `contextBuilder`, `onEnriched`
   - Integración: Al hacer clic, busca en web y luego emite evento `tutor-external-prompt` con prompt enriquecido

### 9.3) Sistema de Eventos (CustomEvents)

**Flujo de comunicación descentralizado mediante eventos del DOM:**

#### Eventos Emitidos por ReadingWorkspace:
1. **`tutor-external-prompt`** (detail: `{ prompt, action, fragment, fullText }`)
   - Cuándo: Cuando el usuario envía prompt directo o cuando hay acción pendiente del visor
   - Escuchado por: `TutorDock` → `TutorCore`

2. **`visor-focus-mode`** (detail: `{ active }`)
   - Cuándo: Al cambiar modo enfoque (toggle botón)
   - Escuchado por: `App.js` (para ocultar sidebar/header)

#### Eventos Escuchados por ReadingWorkspace:
1. **`reader-action`** (detail: `{ action, text, fragment, fullText, from, page }`)
   - Emitido por: `VisorTextoResponsive` (cuando usuario selecciona texto y elige acción)
   - Handler: Procesa acciones `explain`, `summarize`, `question`, `notes`
   - Lógica:
     - Si acción es `notes`: Abre panel de notas directamente (sin activar tutor)
     - Si acción es `explain/summarize/question`:
       - Si tutor ya está abierto: Emite `tutor-external-prompt` inmediatamente
       - Si tutor está cerrado: Guarda acción en `pendingPromptRef`, abre tutor, espera `tutor-ready`

2. **`tutor-ready`** (sin detail)
   - Emitido por: `TutorDock` (cuando se monta y está listo)
   - Handler: Si hay `pendingPromptRef`, envía `tutor-external-prompt` con la acción pendiente
   - Fallbacks: `requestAnimationFrame` y `setTimeout(120ms)` para casos donde el evento se pierde

3. **`tutor-width-change`** (detail: `{ width }`)
   - Emitido por: `TutorDock` (cuando se redimensiona el panel)
   - Handler: Actualiza `tutorWidth` para ajustar `paddingRight` del área de lectura

### 9.4) Hooks Personalizados Utilizados

1. **`useReaderActions`** (`src/hooks/useReaderActions.js`)
   - Escucha: `reader-action` globalmente
   - Normaliza acciones (español → inglés): `explicar` → `explain`, `resumir` → `summarize`
   - Anti-duplicado: Hash + debounce de 250ms
   - Callback: `onPrompt({ action, fragment, prompt })`
   - Nota: Ignora acción `notes` (manejada directamente por ReadingWorkspace)

2. **`useNotesWorkspaceAdapter`** (`src/hooks/useNotesWorkspaceAdapter.js`)
   - Adaptador sobre `useAnnotations`
   - Expone API estable: `createNote`, `removeNote`, `updateNote`, `exportNotes`
   - Ordena notas por fecha (más recientes primero)

### 9.5) Flujo de Funcionamiento Completo

#### Escenario 1: Usuario selecciona texto y elige "Explicar"

```
1. Usuario selecciona texto en VisorTextoResponsive
   ↓
2. VisorTextoResponsive muestra toolbar con botones (Explicar, Resumir, etc.)
   ↓
3. Usuario hace clic en "Explicar"
   ↓
4. VisorTextoResponsive emite: window.dispatchEvent('reader-action', { action: 'explain', text: '...' })
   ↓
5. ReadingWorkspace escucha 'reader-action' (línea 381-482)
   ↓
6a. Si tutor está ABIERTO (showTutor === true):
    → Emite inmediatamente: 'tutor-external-prompt' con prompt formateado
    → TutorDock recibe y envía a TutorCore
    → TutorCore llama backend `/api/chat/completion`
    → Respuesta se muestra en TutorDock
   
6b. Si tutor está CERRADO (showTutor === false):
    → Guarda acción en pendingPromptRef.current = { prompt, action, fragment }
    → setShowTutor(true) y setTutorExpanded(true)
    → Espera evento 'tutor-ready' de TutorDock
    → Cuando recibe 'tutor-ready': Envía 'tutor-external-prompt' con acción pendiente
    → TutorDock procesa y muestra respuesta
```

#### Escenario 2: Usuario escribe pregunta en PromptBar

```
1. Usuario escribe en PromptBar (bottom fixed)
   ↓
2. Usuario hace clic en "Enviar" o puede usar "Con Web"
   ↓
3a. Si usa "Con Web":
    → WebEnrichmentButton ejecuta búsqueda web (Tavily/DuckDuckGo)
    → Construye prompt enriquecido con resultados
    → Llama onEnriched(promptEnriquecido)
    → ReadingWorkspace emite 'tutor-external-prompt' con prompt enriquecido
    
3b. Si usa "Enviar" directo:
    → ReadingWorkspace.enviaPromptDirecto() emite 'tutor-external-prompt'
    → TutorDock recibe y procesa
```

#### Escenario 3: Usuario activa acción "Notas"

```
1. Usuario selecciona texto y elige "Notas"
   ↓
2. VisorTextoResponsive emite: 'reader-action' con action: 'notes'
   ↓
3. ReadingWorkspace recibe (línea 389-398)
   ↓
4. NO activa tutor, directamente:
   → setShowNotes(true) → Abre NotesPanelDock
   → notesApi.createNote(text, { createdAt, kind: 'note' })
   → Nota se guarda en localStorage (vía useAnnotations)
```

### 9.6) Integración con TutorCore

**TutorCore** (`src/components/tutor/TutorCore.js`) es el núcleo del tutor:

- Mantiene historial de mensajes (máx 40, FIFO)
- Gestiona llamadas al backend: `/api/chat/completion`
- Sistema de prompts inteligentes:
  - `SYSTEM_TOPIC_GUARD`: Instrucciones pedagógicas (no inventar metadatos, enfoque en texto)
  - `SYSTEM_ANTI_REDUNDANCY`: Evita repetir preguntas ya hechas
- Detección inteligente de necesidades: confusión, frustración, curiosidad, insight
- Guard anti-off-topic: Valida que las preguntas sean sobre el texto (overlap < 5%)
- Integración pedagógica: Detecta nivel Bloom, registra puntos (rewards)

**Flujo de comunicación ReadingWorkspace ↔ TutorCore:**

```
ReadingWorkspace (o VisorTextoResponsive)
  ↓ emite 'tutor-external-prompt'
TutorDock escucha
  ↓ llama api.sendAction(action, fragment, { fullText })
TutorCore construye mensajes con contexto
  ↓ llama callBackendWith(messagesArr)
Backend: /api/chat/completion
  ↓ respuesta JSON
TutorCore procesa y añade mensaje assistant
  ↓ notifica onMessagesChange
TutorDock renderiza mensaje en UI
```

### 9.7) Ajuste Dinámico del Layout

**Problema resuelto:** Cuando el tutor se expande, el área de lectura se reduce demasiado.

**Solución implementada:**
- ReadingWorkspace escucha `tutor-width-change` (línea 356-365)
- Actualiza estado `tutorWidth` cuando TutorDock se redimensiona
- Aplica `paddingRight` dinámico al `ContentArea`:

```501:504:src/components/ReadingWorkspace.js
<ContentArea style={{
  paddingRight: (showTutor && tutorExpanded) ? `${tutorWidth + 20}px` : undefined,
  transition: 'padding-right 0.3s ease'
}}>
```

**Nota:** Esta solución debería funcionar, pero el problema reportado sugiere que:
1. El evento `tutor-width-change` podría no estar emitiéndose correctamente
2. O el `tutorWidth` inicial (420px) es demasiado grande
3. O los controles de zoom del visor no están adaptándose al nuevo ancho

### 9.8) Problemas Identificados y Pendientes

1. **Tutor no reacciona al texto:**
   - Posible causa: El contexto `fullText` no se está pasando correctamente a TutorCore
   - Verificar: Línea 422 en TutorDock (`api.setContext({ fullText: texto })`)
   - Verificar: Que `texto` en AppContext tenga valor cuando se carga documento

2. **Zoom no funciona cuando tutor está expandido:**
   - Los controles de zoom están en `VisorTexto_responsive.js` (líneas 885-887 para PDF)
   - El problema puede ser que el visor no recalcula dimensiones cuando cambia `paddingRight`
   - Solución sugerida: Añadir `useEffect` en VisorTextoResponsive que escuche cambios de ancho del contenedor

3. **Selección azul no sigue al texto:**
   - El componente `SelectionToolbar` en VisorTextoResponsive usa posiciones fijas (`position: fixed`)
   - Cuando el área de lectura cambia de ancho, las coordenadas `x, y` pueden quedar desalineadas
   - Solución sugerida: Recalcular posición usando `getBoundingClientRect` después de cambios de layout

### 9.9) Diagrama de Conexiones

```
┌─────────────────────────────────────────────────────────────┐
│                     App.js (Router)                          │
│  case 'lectura-guiada': return <ReadingWorkspace />          │
└──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ReadingWorkspace (Orquestador)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Estado: showTutor, tutorExpanded, tutorWidth        │   │
│  │         showNotes, prompt, focusMode                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ TopBar: Botones "Modo Enfoque" y "Mostrar Tutor"    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ContentArea (paddingRight dinámico)                   │   │
│  │  ├─ VisorTextoResponsive (texto desde AppContext)    │   │
│  │  │   └─ Emite: 'reader-action'                        │   │
│  │  │                                                    │   │
│  │  ├─ PromptBar (bottom fixed)                         │   │
│  │  │   ├─ PromptInput                                   │   │
│  │  │   ├─ WebEnrichmentButton                          │   │
│  │  │   │   └─ Hook: useWebSearchTutor                   │   │
│  │  │   └─ SendBtn → Emite: 'tutor-external-prompt'     │   │
│  │  │                                                    │   │
│  │  ├─ TutorDock (si showTutor === true)                 │   │
│  │  │   ├─ TutorCore (núcleo IA)                         │   │
│  │  │   │   └─ Backend: /api/chat/completion             │   │
│  │  │   ├─ Paneles pedagógicos (si hasPedagogyProvider)  │   │
│  │  │   │   ├─ BloomLevelIndicator                       │   │
│  │  │   │   ├─ CriticalProgressionPanel                   │   │
│  │  │   │   └─ ACDAnalysisPanel                          │   │
│  │  │   └─ Emite: 'tutor-ready', 'tutor-width-change'    │   │
│  │  │                                                    │   │
│  │  └─ NotesPanelDock (si showNotes === true)            │   │
│  │      └─ API: notesApi (useNotesWorkspaceAdapter)      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hooks:                                                │   │
│  │  ├─ useReaderActions → Escucha 'reader-action'       │   │
│  │  ├─ useNotesWorkspaceAdapter → API de notas          │   │
│  │  └─ buildReadingWorkspaceContext (utils)               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Contextos globales
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AppContext: { texto, modoOscuro, archivoActual, ... }      │
│  PedagogyContext: { zdpDetector, rewards, ... }              │
└─────────────────────────────────────────────────────────────┘
```

### 9.10) Resumen de Conexiones Clave

| Componente | Conexión con | Tipo | Descripción |
|------------|--------------|------|-------------|
| ReadingWorkspace | AppContext | Leer | Obtiene `texto`, `modoOscuro` |
| ReadingWorkspace | VisorTextoResponsive | Renderizar | Monta visor pasando `texto` |
| ReadingWorkspace | TutorDock | Renderizar/Condicional | Monta si `showTutor === true` |
| ReadingWorkspace | NotesPanelDock | Renderizar/Condicional | Monta si `showNotes === true` |
| ReadingWorkspace | WebEnrichmentButton | Renderizar | Botón en PromptBar |
| VisorTextoResponsive | ReadingWorkspace | Evento | Emite `reader-action` |
| TutorDock | ReadingWorkspace | Evento | Emite `tutor-ready`, `tutor-width-change` |
| TutorDock | ReadingWorkspace | Evento | Escucha `tutor-external-prompt` |
| TutorCore | Backend | HTTP | POST `/api/chat/completion` |
| useReaderActions | Window | Evento | Escucha `reader-action` globalmente |
| useNotesWorkspaceAdapter | useAnnotations | Hook | Adaptador sobre sistema de anotaciones |

---

## 10) Análisis Detallado: Pestaña "Análisis del Texto" (Pre-lectura)

### 10.1) Arquitectura del Componente Principal

**Archivo principal:** `src/components/PreLectura.js`

**Propósito:** Presentar un análisis académico estructurado del documento (previo a la lectura guiada), incluyendo:
- Contextualización (género textual, propósito comunicativo, tipología)
- Análisis de contenido y argumentación (tesis, hipótesis, tipos de argumentación)
- Análisis formal y lingüístico (estructura, registro, figuras retóricas)
- Análisis ideológico-discursivo (ACD): voces representadas/silenciadas, ideología subyacente
- Fuentes web consultadas (si hubo enriquecimiento RAG)
- Glosario dinámico con términos clickeables

### 10.2) Dependencias y Conexiones

#### A) Contextos Globales
1. **AppContext** (`src/context/AppContext.js`)
   - Lee: `texto`, `modoOscuro`, `loading`, `completeAnalysis`
   - `completeAnalysis` es la estructura completa que contiene `prelecture`, `critical` y `metadata`
   - Determina estado de carga: `isLoading = loading || (texto && !completeAnalysis)`

#### B) Orquestador del Análisis
**`src/services/textAnalysisOrchestrator.js`** - Componente crítico que genera los datos:

```44:88:src/services/textAnalysisOrchestrator.js
export async function performFullAnalysis(text, options = {}) {
  // FASE 1: Enriquecimiento RAG (si necesario)
  const enrichment = await enrichWithWebContext(text, options.metadata || {});
  
  // FASE 2: Construcción de prompt unificado
  const prompt = buildUnifiedAnalysisPrompt(text, enrichment);
  
  // FASE 3: Análisis con IA (UNA SOLA LLAMADA)
  const response = await chatCompletion({ provider: 'deepseek', ... });
  
  // FASE 4: Parseo y estructuración
  const parsedAnalysis = parseUnifiedAnalysis(content);
  
  // FASE 5: Estructuración final para ambas pestañas
  return {
    prelecture: { metadata, argumentation, linguistics, web_sources, web_summary },
    critical: { contexto_critico: { ... } },
    metadata: { analysis_timestamp, processing_time_ms, web_enriched, ... }
  };
}
```

**Características clave:**
- Integra enriquecimiento web automático (RAG) cuando detecta necesidad de contexto
- Una única llamada a IA para ambos análisis (Pre-lectura + Crítico)
- Sistema de fallback si hay error en el análisis
- Genera `document_id` único basado en hash del texto

#### C) Servicios Usados por PreLectura
1. **`services/glossaryService.generateGlossary(texto)`**
   - Genera glosario dinámico de términos clave
   - Se ejecuta automáticamente cuando hay `completeAnalysis` y `texto.length > 200`

2. **`services/termDefinitionService.fetchTermDefinition(term, texto)`**
   - Obtiene definición detallada de un término específico
   - Usado cuando el usuario hace clic en un término

3. **`services/pdfGlossaryService.downloadGlossaryAsPDF(glossary, titlePreview)`**
   - Exporta glosario como PDF descargable

4. **`utils/exportUtils.exportarResultados(completeAnalysis, 'prelectura')`**
   - Exporta análisis completo (JSON o archivo)

#### D) Componentes Integrados
1. **`GlossaryPanel`** (`src/components/analisis/GlossaryPanel.js`)
   - Renderiza lista de términos del glosario
   - Permite exportar a PDF
   - Llama `onTermClick` cuando se selecciona un término

2. **`TermDefinitionModal`** (`src/components/analisis/TermDefinitionModal.js`)
   - Modal que muestra definición detallada del término seleccionado
   - Recibe `term`, `definition`, `loading`, `onClose`

3. **`NextStepCard`** (`src/components/common/NextStepCard.js`)
   - Card pedagógico que sugiere siguiente paso (ir a Actividades)
   - Integración con flujo pedagógico del sistema

### 10.3) Estructura de Datos Consumida

PreLectura consume `completeAnalysis.prelecture` con la siguiente estructura:

```javascript
prelecture: {
  // FASE I: Contextualización
  metadata: {
    genero_textual: string,
    proposito_comunicativo: string,
    tipologia_textual: string,
    autor: string | null,
    fecha_texto: string | null,
    web_enriched: boolean
  },
  
  // FASE II: Contenido y Argumentación
  argumentation: {
    tesis_central: string,
    hipotesis_secundarias: string[],
    tipo_argumentacion: string,
    tipo_razonamiento: string | null,
    argumentos_principales: Array<{
      argumento: string,
      tipo?: string,
      solidez?: 'alta' | 'media' | 'baja'
    }>
  },
  
  // FASE III: Análisis Formal y Lingüístico
  linguistics: {
    tipo_estructura: string,
    coherencia_cohesion: string | null,
    registro_linguistico: string,
    nivel_complejidad: 'Básico' | 'Intermedio' | 'Avanzado',
    figuras_retoricas: Array<string | { tipo: string, ejemplo?: string }>
  },
  
  // Fuentes web (si aplica)
  web_sources: Array<{ title: string, snippet: string, url: string }>,
  web_summary: string | null
}
```

Además, consume `completeAnalysis.critical.contexto_critico` para la **Fase IV (ACD)**:
- `voces_representadas`: string[]
- `voces_silenciadas`: string[]
- `ideologia_subyacente`: string | null
- `contraste_web`: { texto_actualizado, datos_verificados, contexto_web_adicional } | null

### 10.4) Estados Locales y Efectos

```javascript
// Estados del componente
const [glossary, setGlossary] = useState([]);  // Términos del glosario
const [loadingGlossary, setLoadingGlossary] = useState(false);
const [selectedTerm, setSelectedTerm] = useState(null);  // Término seleccionado para modal
const [termDefinition, setTermDefinition] = useState(null);  // Definición del término
const [loadingTermDefinition, setLoadingTermDefinition] = useState(false);
```

**Efectos clave:**
1. **Generación automática de glosario:**
```99:103:src/components/PreLectura.js
useEffect(() => {
  if (completeAnalysis && texto.length > 200) {
    generateGlossaryAsync();
  }
}, [completeAnalysis, generateGlossaryAsync]);
```

2. **Estado de carga:** Muestra pantalla de carga con pasos animados cuando `isLoading === true`

3. **Estado vacío:** Muestra mensaje si no hay `texto` o `completeAnalysis.prelecture`

### 10.5) Flujo de Funcionamiento Completo

```
1. Usuario carga texto en CargaTexto (sidebar)
   ↓
2. AppContext.texto se actualiza
   ↓
3. Se dispara análisis (textAnalysisOrchestrator.performFullAnalysis)
   - Enriquecimiento RAG si es necesario
   - Construcción de prompt unificado
   - Llamada única a IA (DeepSeek)
   - Parseo JSON y estructuración
   ↓
4. AppContext.completeAnalysis se actualiza con resultado
   ↓
5. PreLectura detecta completeAnalysis y texto
   ↓
6. Efecto dispara generateGlossaryAsync() (si texto.length > 200)
   ↓
7. Renderiza 4 fases + glosario:
   - Fase I: Metadata (género, propósito, tipología)
   - Fase II: Argumentación (tesis, hipótesis, argumentos)
   - Fase III: Lingüístico (estructura, registro, figuras retóricas)
   - Fase IV: ACD (voces, ideología) - solo si hay datos
   - Glosario: Lista de términos clickeables
   ↓
8. Usuario interactúa:
   - Click en término → Modal con definición
   - Click "Exportar glosario" → Descarga PDF
   - Click "Exportar análisis" → Descarga archivo completo
```

### 10.6) Integración con Sistema de Análisis

**Punto crítico:** PreLectura es un componente de **presentación** que consume datos ya procesados por `textAnalysisOrchestrator`. 

**No ejecuta análisis directamente** - depende de que otro componente (probablemente `CargaTexto` o un hook) ejecute `performFullAnalysis` y actualice `AppContext.completeAnalysis`.

**Verificación sugerida:**
- Confirmar que cuando se carga texto, se ejecuta automáticamente `performFullAnalysis`
- Verificar que `AppContext.completeAnalysis` se actualiza correctamente tras el análisis
- Validar que el `document_id` en metadata corresponde al texto actual (para evitar mostrar análisis obsoleto)

### 10.7) Posibles Mejoras Identificadas (Priorizadas)

#### 🔴 Alta Prioridad (Performance y UX)

1. **Cache de glosario:**
   - **Problema:** Glosario se regenera cada vez que se vuelve a la pestaña, incluso si el texto no cambió
   - **Solución:** Cachear `generateGlossary(texto)` usando hash del documento (`document_id` de metadata)
   - **Implementación:** Usar `useMemo` con dependencia de `completeAnalysis.metadata.document_id`

2. **Debounce en generación de glosario:**
   - **Problema:** Si el usuario cambia entre pestañas rápidamente, puede disparar múltiples generaciones
   - **Solución:** Debounce de 500ms en `generateGlossaryAsync`

3. **Manejo de errores por sección:**
   - **Problema:** Si una sección falla (ej. web sources), se muestra vacía sin explicación
   - **Solución:** Mostrar mensaje específico por sección: "Fuentes web no disponibles" vs "Análisis completo"

4. **Validación de `document_id`:**
   - **Problema:** Si el usuario carga texto nuevo, podría mostrar análisis del texto anterior
   - **Solución:** Comparar `completeAnalysis.metadata.document_id` con hash del texto actual y mostrar banner si no coinciden

#### 🟡 Media Prioridad (Integración y Pedagógica)

5. **Botones "Enviar al Tutor" en secciones clave:**
   - **Ubicaciones sugeridas:**
     - Junto a "Tesis Central" → Enviar tesis al tutor para discusión
     - En cada "Argumento Principal" → Enviar argumento específico
     - En cada "Figura Retórica" → Enviar ejemplo al tutor
   - **Implementación:** Emitir evento `reader-action` con `action: 'explain'` y el fragmento correspondiente
   - **Beneficio:** Conectar Pre-lectura con Lectura Guiada de forma pedagógica

6. **Navegación rápida (índice de secciones):**
   - **Implementación:** Sticky sidebar o tabs internos que permitan saltar a Fase I, II, III, IV, Fuentes Web
   - **Beneficio:** En textos con análisis extenso, facilita navegación

7. **Sincronización con Lectura Guiada:**
   - **Implementación:** Al hacer clic en término del glosario, abrir automáticamente Lectura Guiada con el término seleccionado
   - **Evento sugerido:** `window.dispatchEvent('navigate-to-lectura', { term, action: 'explain' })`

#### 🟢 Baja Prioridad (Refinamiento)

8. **Lazy loading de componentes pesados:**
   - **Objetivos:** `GlossaryPanel`, `TermDefinitionModal`, lista de fuentes web
   - **Implementación:** `React.lazy()` + `Suspense` alrededor de estos componentes

9. **Memoización de listas grandes:**
   - **Objetivos:** Lista de argumentos principales, figuras retóricas, voces
   - **Implementación:** `React.memo` en componentes de lista y `useMemo` para arrays transformados

10. **Accesibilidad mejorada:**
    - Agregar roles ARIA: `role="region"` para cada sección (Fase I-IV)
    - Encabezados semánticos: Asegurar jerarquía `<h2>` → `<h3>`
    - Foco gestionado: Al abrir `TermDefinitionModal`, guardar foco anterior y restaurarlo al cerrar

11. **Internacionalización:**
    - Extraer todas las etiquetas hardcodeadas a diccionario
    - Preparar estructura para soporte ES/EN

12. **Tipado JSDoc:**
    - Documentar estructura de `prelecture`, `critical`, `metadata` con JSDoc
    - Beneficio: Autocompletado mejorado y detección temprana de errores

13. **Extracción de estilos comunes:**
    - Crear `components/common/ACDCard.js` para reusar estilos de tarjetas ACD
    - Crear `components/common/AnalysisSection.js` para secciones reutilizables
    - Beneficio: Consistencia visual y mantenibilidad

14. **Banner de error si análisis falló:**
    - **Condición:** `completeAnalysis.metadata.error === true`
    - **Mensaje:** "El análisis no se pudo completar. Algunas secciones pueden estar incompletas. Intenta recargar el texto."
    - **Acción:** Botón "Reanalizar" que vuelva a ejecutar `performFullAnalysis`

### 10.8) Riesgos Detectados

1. **Performance en textos muy largos:**
   - Glosario sin límite puede crecer desproporcionadamente
   - **Mitigación:** Limitar glosario a top-50 términos más relevantes, o implementar paginación

2. **Dependencia de conectividad:**
   - `fetchTermDefinition` y fuentes web requieren conexión
   - **Mitigación:** Mostrar estado "modo offline" si falla fetch, permitir usar definiciones en caché

3. **Desalineación de datos:**
   - Si `critical.contexto_critico` está vacío pero PreLectura intenta mostrar Fase IV
   - **Mitigación:** Validación condicional estricta antes de renderizar cada sección

4. **Análisis obsoleto:**
   - Si el usuario carga texto nuevo muy rápido, podría mostrar análisis del anterior
   - **Mitigación:** Comparar `document_id` con hash actual del texto antes de renderizar

### 10.9) Diagrama de Conexiones

```
┌─────────────────────────────────────────────────────────────┐
│                     App.js (Router)                          │
│  case 'prelectura': return <PreLectura />                   │
└──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PreLectura (Componente Presentación)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Lee: AppContext.completeAnalysis, texto, modoOscuro  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Estados Locales:                                      │   │
│  │  - glossary, loadingGlossary                         │   │
│  │  - selectedTerm, termDefinition                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Renderizado (4 Fases + Glosario):                   │   │
│  │  ├─ Fase I: Metadata (género, propósito)           │   │
│  │  ├─ Fase II: Argumentación (tesis, argumentos)      │   │
│  │  ├─ Fase III: Lingüístico (estructura, figuras)    │   │
│  │  ├─ Fase IV: ACD (voces, ideología)                │   │
│  │  ├─ Fuentes Web (si web_sources.length > 0)        │   │
│  │  └─ GlossaryPanel                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Interacciones:                                        │   │
│  │  ├─ Click término → TermDefinitionModal               │   │
│  │  ├─ Exportar glosario → PDF                           │   │
│  │  └─ Exportar análisis → Archivo JSON                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Depende de
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AppContext.completeAnalysis                                 │
│  (Generado por textAnalysisOrchestrator.performFullAnalysis)│
│                                                              │
│  Estructura:                                                 │
│  - prelecture: { metadata, argumentation, linguistics, ... }│
│  - critical: { contexto_critico: { ... } }                  │
│  - metadata: { document_id, analysis_timestamp, ... }        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Generado por
                            ▼
┌─────────────────────────────────────────────────────────────┐
│       textAnalysisOrchestrator.performFullAnalysis()         │
│                                                              │
│  Flujo:                                                      │
│  1. enrichWithWebContext() → Enriquecimiento RAG           │
│  2. buildUnifiedAnalysisPrompt() → Prompt unificado         │
│  3. chatCompletion({ provider: 'deepseek' }) → IA          │
│  4. parseUnifiedAnalysis() → Parseo JSON                    │
│  5. return { prelecture, critical, metadata }                │
└─────────────────────────────────────────────────────────────┘
```

### 10.10) Resumen de Conexiones Clave

| Componente | Conexión con | Tipo | Descripción |
|------------|--------------|------|-------------|
| PreLectura | AppContext | Leer | Obtiene `completeAnalysis`, `texto`, `modoOscuro` |
| PreLectura | GlossaryPanel | Renderizar | Muestra glosario y maneja clicks en términos |
| PreLectura | TermDefinitionModal | Renderizar/Condicional | Modal que muestra definición (si `selectedTerm !== null`) |
| PreLectura | glossaryService | Llamada | `generateGlossary(texto)` genera términos |
| PreLectura | termDefinitionService | Llamada | `fetchTermDefinition(term, texto)` obtiene definición |
| PreLectura | pdfGlossaryService | Llamada | `downloadGlossaryAsPDF()` exporta glosario |
| PreLectura | exportUtils | Llamada | `exportarResultados()` exporta análisis completo |
| textAnalysisOrchestrator | AppContext | Escribir | Actualiza `completeAnalysis` (no directamente desde PreLectura) |
| textAnalysisOrchestrator | ragEnrichmentService | Llamada | Enriquecimiento web automático |
| textAnalysisOrchestrator | unifiedAiService | Llamada | Llamada única a IA (DeepSeek) |

### 10.11) Checklist de Validación

- [ ] Verificar que `completeAnalysis` se genera automáticamente al cargar texto
- [ ] Confirmar que `document_id` en metadata corresponde al texto actual
- [ ] Validar que Fase IV (ACD) solo se muestra si hay datos en `critical.contexto_critico`
- [ ] Verificar que glosario no se regenera innecesariamente al cambiar de pestaña
- [ ] Confirmar que modal de términos funciona correctamente con términos especiales (caracteres UTF-8)
- [ ] Validar que exportación de PDF y análisis completo funcionan en diferentes navegadores

---

## 11) Análisis Detallado: Pestaña "Actividades"

### 11.1) Arquitectura del Componente Principal

**Archivo principal:** `src/components/Actividades.js`

**Propósito:** Proveer ejercicios prácticos con feedback formativo a partir del análisis crítico previo, y mostrar progresión pedagógica (Bloom/dimensiones críticas).

### 11.2) Dependencias y Conexiones

- Lee de `AppContext`: `texto`, `completeAnalysis`, `modoOscuro`.
- Requiere que exista `completeAnalysis.critical`; si no, muestra estado “Análisis en proceso”.
- Componentes integrados:
  - `PreguntasPersonalizadas` (`src/components/actividades/PreguntasPersonalizadas.js`) → ejercicios guiados con feedback.
  - `CriticalProgressionPanel` (`src/components/pedagogy/CriticalProgressionPanel.js`) → panel de progresión.
  - `NextStepCard` → guía pedagógica al siguiente paso (“Evaluación”).

### 11.3) Estructura de la UI y Navegación Interna

- Tabs internos controlados por estado `activeSection`:
  - `preguntas`: renderiza `PreguntasPersonalizadas` y un `NextStepCard` para ir a “Evaluación”.
  - `aplicacion` (placeholder): lista de actividades de aplicación (próximamente).
  - `progreso`: muestra `CriticalProgressionPanel` y bloque “Estadísticas” (placeholder).

Estados vacíos/previos:
- Si no hay `texto`: mensaje de “No hay texto cargado”.
- Si no hay `completeAnalysis` o falta `critical`: “Análisis en proceso”.

### 11.4) Flujo Funcional Resumido

1) Carga de texto → Pre-lectura genera `completeAnalysis` → se habilitan actividades.
2) Usuario entra a Actividades:
   - En “Ejercicios Guiados”: trabaja con `PreguntasPersonalizadas` (feedback formativo).
   - En “Mi Progreso”: consulta su progresión crítica (`CriticalProgressionPanel`).
3) Guía pedagógica sugiere avanzar a “Evaluación”.

### 11.5) Puntos Fuertes

- Estados vacíos claros y dependencias explícitas del análisis previo.
- Separación de secciones (práctica, aplicación, progreso) con navegación simple.
- Integración pedagógica consistente (progresión + guía al siguiente paso).

### 11.6) Mejoras Propuestas

#### 🔴 Alta Prioridad
- Sincronización con Tutor: añadir acciones “Enviar al Tutor” desde cada ítem de `PreguntasPersonalizadas` para discutir respuestas (evento `reader-action`).
- Persistencia de resultados: almacenar intentos y feedback por `document_id` (de `completeAnalysis.metadata`) para continuidad entre sesiones.
- Métricas en tiempo real: exponer conteo de intentos, aciertos por dimensión, tiempo dedicado; base para “Estadísticas”.

#### 🟡 Media Prioridad
- Navegación pedagógica automática: cuando el usuario complete un set mínimo en “Ejercicios Guiados”, mostrar CTA para pasar a “Evaluación”.
- Rubricado formativo: mostrar pista de la dimensión crítica asociada a cada ejercicio (chips/etiquetas), enlazado a `CriticalProgressionPanel`.
- Exportación de actividades: permitir exportar progreso de ejercicios en JSON/CSV para revisión docente.

#### 🟢 Baja Prioridad
- Guardado local y en nube (si hay backend) de resultados para portabilidad.
- Accesibilidad: navegación por teclado en tabs y foco al cambiar de sección; roles ARIA.
- i18n: extraer etiquetas a diccionario común.

### 11.7) Riesgos y Mitigaciones

- Dependencia de `completeAnalysis.critical`: si el análisis falla, las actividades no se habilitan.
  - Mitigación: ofrecer "Reanalizar" y/o un set mínimo de ejercicios offline.
- Placeholders ("Aplicación", "Estadísticas"): evitar navegación a secciones vacías; mostrar roadmap o CTA claros.
- ~~Pérdida de trabajo: sin persistencia, el usuario puede perder respuestas al recargar.~~
  - ✅ **RESUELTO**: Implementado sistema robusto de persistencia (ver sección 11.9).

### 11.8) Checklist de Implementación

- [ ] Agregar botón "Enviar al Tutor" en ejercicios → emitir `reader-action` con fragmento/pregunta.
- [x] **COMPLETADO**: Persistir resultados por `document_id` (localStorage con límites y TTL).
- [x] **COMPLETADO**: Exponer métricas en tiempo real (progreso, distribución de evaluaciones, chips visuales).
- [ ] Añadir CTA automático hacia "Evaluación" cuando se alcance umbral de práctica.
- [ ] Mejorar accesibilidad de tabs e i18n de etiquetas.

### 11.9) ✅ Implementación Completada: Persistencia de Resultados

**Fecha:** 29 de octubre de 2025  
**Documento:** `IMPLEMENTACION_PERSISTENCIA_ACTIVIDADES.md`

#### Archivos creados:
- `src/hooks/useActivityPersistence.js`: Hook especializado con versionado, TTL (30 días), límite (15 docs), índice centralizado.

#### Archivos modificados:
- `src/components/actividades/PreguntasPersonalizadas.js`: Integración completa del nuevo hook, UI de métricas (modal, chips, botones de gestión).

#### Funcionalidades implementadas:

1. **Persistencia robusta por `document_id`**:
   - Reemplaza hash de texto (vulnerable a colisiones)
   - Guardado automático con debounce de 1s
   - Rehidratación al cambiar documento

2. **Métricas en tiempo real**:
   - Progreso general (%)
   - Preguntas respondidas vs total
   - Feedbacks recibidos
   - Distribución de evaluaciones (Excelente/Buena/En desarrollo/Necesita orientación)

3. **UI enriquecida**:
   - Botón de métricas con badge en vivo
   - Barra de progreso dinámica
   - Chips de evaluación con códigos de color
   - Modal de métricas detalladas con animaciones
   - Botón de limpieza con confirmación

4. **Exportación mejorada**:
   - JSON con métricas completas
   - Metadatos enriquecidos por pregunta (etapa, nivel crítico, dimensión)

5. **Gestión de almacenamiento**:
   - Límite de 15 documentos
   - TTL de 30 días
   - Poda automática de documentos antiguos/expirados

#### Próximos pasos recomendados:
- Backend opcional para sincronización cross-device
- Analíticas avanzadas (tiempo por pregunta, evolución temporal)
- Integración con Tutor (botón "Enviar al Tutor" desde ejercicios)

---

## 12) Análisis de Alineación Pedagógica

**Fecha:** 29 de octubre de 2025  
**Documento analizado:** `Rubricas_Guia_Evaluacion_Literacidad_IA.md`  
**Informe completo:** `ANALISIS_RUBRICAS_PEDAGOGICAS.md`

### Resumen Ejecutivo

Se ha analizado la alineación entre el marco pedagógico oficial (5 rúbricas de evaluación de artefactos de aprendizaje) y la implementación actual de AppLectura.

**Porcentaje de Alineación:** **40%** (4/10 ítems críticos completos)

### Fortalezas Identificadas

✅ Sistema de rúbricas criteriales implementado (`criticalLiteracy.rubric.json`)  
✅ Las 5 dimensiones de literacidad crítica definidas correctamente  
✅ Escala de 4 niveles (Novato → Experto) mapeada  
✅ Backend de evaluación criterial funcional  
✅ Feedback formativo implementado en Actividades

### Brechas Críticas

🔴 **Artefactos de aprendizaje:** Solo 1 de 5 implementado
- Falta: Resumen Académico formal
- Falta: Tabla de Análisis Crítico del Discurso (ACD)
- Falta: Mapa de Actores y Consecuencias
- Falta: Respuesta Argumentativa estructurada
- Parcial: Bitácora Ética IA (componente existe, sin evaluación)

🔴 **Principios de IA pedagógica:**
- Anclaje al texto: Solo en evaluación formal, no en tutor
- Modo Socrático: Inconsistente (a veces da respuestas directas)
- Transparencia: IA no comunica limitaciones
- Docente en el Circuito: No implementado (no hay interfaz docente)

### Plan de Acción Recomendado

#### Fase 1: Artefactos Faltantes (2-3 semanas)
1. Crear `ResumenAcademico.js` con validación de ≥2 citas
2. Crear `TablaACD.js` para análisis ideológico-discursivo
3. Crear `RespuestaArgumentativa.js` con estructura de tesis/evidencia/contraargumento
4. Crear `MapaActores.js` para contextualización socio-histórica
5. Añadir evaluación criterial a `BitacoraEticaIA.js`

#### Fase 2: Reforzar Principios de IA (3 días)
1. Integrar validador de anclaje en `TutorCore.js`
2. Prompt obligatorio de Modo Socrático (≥2 preguntas por respuesta)
3. Mensajes de incertidumbre en casos ambiguos

#### Fase 3: Docente en el Circuito (opcional, 2 semanas)
1. Panel de revisión pedagógica
2. Backend multiusuario con autenticación
3. Edición de feedback generado por IA

### Documentos de Referencia

- Análisis completo: `ANALISIS_RUBRICAS_PEDAGOGICAS.md`
- Marco pedagógico: `Rubricas_Guia_Evaluacion_Literacidad_IA.md`
- Rúbricas implementadas: `src/pedagogy/rubrics/criticalLiteracy.json`
- Backend evaluador: `server/prompts/evaluationPrompts.js`

### 12.1) ✅ Artefacto 1 Implementado: Resumen Académico

**Fecha:** 29 de octubre de 2025  
**Documento:** `IMPLEMENTACION_RESUMEN_ACADEMICO.md`  
**Estado:** Completado

Se ha implementado el primer artefacto de evaluación según Rúbrica 1 (Comprensión Analítica) con estrategia dual de IAs.

#### Archivos creados:
- `src/services/resumenAcademico.service.js` - Evaluación dual (DeepSeek + OpenAI)
- `src/components/artefactos/ResumenAcademico.js` - Componente React completo

#### Archivos modificados:
- `src/components/Actividades.js` - Integración con nueva tab "Resumen Académico"

#### Características implementadas:
1. **Validación robusta**: ≥2 citas obligatorias, verificación en texto original
2. **Evaluación dual**: DeepSeek (estructura) + OpenAI (inferencias)
3. **Feedback criterial**: 5 criterios con niveles 1-4, evidencias textuales
4. **Persistencia**: Guardado automático por `document_id`
5. **UI pedagógica**: Guía colapsable, contador en tiempo real, validación visual

#### Próximo paso:
Implementar Artefacto 2: Tabla de Análisis Crítico del Discurso (Rúbrica 2)

---

Fin del informe.

---

## 8) Mapa de Pestañas (UI principal)

- Definición de pestañas en `src/App.js`:

```303:310:src/App.js
const pestanasFixed = [
  { id: 'lectura-guiada', label: 'Lectura Guiada', icon: '🧠' },
  { id: 'prelectura', label: 'Análisis del Texto', icon: '📖' },
  { id: 'actividades', label: 'Actividades', icon: '🎯' },
  { id: 'notas', label: 'Notas de Estudio', icon: '📝' },
  { id: 'evaluacion', label: 'Evaluación', icon: '✅' },
  { id: 'bitacora-etica', label: 'Bitácora Ética IA', icon: '🤖' }
];
```

- Render de la barra de pestañas (componente): `src/components/layout/TabNavigation_responsive.js`
  - Prop `tabs` recibe `pestanasFixed`
  - Prop `onTabChange` conmuta `vistaActiva`

- Enrutamiento de cada pestaña (switch en `src/App.js`):

```319:356:src/App.js
switch (vistaActiva) {
  case 'lectura-guiada':     return <ReadingWorkspace />;
  case 'prelectura':         return <PreLectura />;
  case 'evaluacion':         return <SistemaEvaluacion />;
  case 'actividades':        return <Actividades />;
  case 'notas':              return <NotasEstudio />;
  case 'bitacora-etica':     return <BitacoraEticaIA />;
  default:                   return <div>Vista no encontrada</div>;
}
```

- Mapeo pestaña → archivo componente
  - Lectura Guiada → `src/components/ReadingWorkspace.js`
  - Análisis del Texto → `src/components/PreLectura.js`
  - Actividades → `src/components/Actividades.js`
  - Notas de Estudio → `src/components/notas/NotasEstudioRefactorizado.js` (entrada `NotasEstudio`), legacy convive: `src/components/NotasEstudio.js`, `src/components/NotasEstudioNuevo.js`
  - Evaluación → `src/components/SistemaEvaluacion.js`
  - Bitácora Ética IA → `src/components/BitacoraEticaIA.js`

- Checklist de depuración de pestañas
  - Verificar que `NotasEstudio` reexporte la versión refactorizada y que no haya imports a `NotasEstudio.js` o `NotasEstudioNuevo.js`.
  - Confirmar que no se importe `SistemaEvaluacion_clean.js` desde ninguna parte.
  - Asegurar consistencia de ids en `pestanasFixed` con los casos del `switch (vistaActiva)`.
  - Validar que `TabNavigation_responsive` reciba `disabled` y `compact` según modo enfoque.

---

## 12.2. Artefacto 2 Implementado: Tabla de Análisis Crítico del Discurso (ACD)

**Fecha de implementación:** 29 de octubre de 2025  
**Rúbrica:** 2 - Análisis Ideológico-Discursivo  
**Estado:** ✅ Completado

### Resumen

Se ha implementado el segundo artefacto pedagógico: **Tabla de Análisis Crítico del Discurso (ACD)**, que permite al estudiante identificar marcos ideológicos, estrategias retóricas y voces presentes/silenciadas, recibiendo evaluación criterial con estrategia dual (DeepSeek + OpenAI).

### Arquitectura y Diferenciación

**Relación con ACDAnalysisPanel existente:**

| Aspecto | ACDAnalysisPanel | TablaACD (nuevo) |
|---------|------------------|-------------------|
| **Ubicación** | Lectura Guiada (TutorDock) | Actividades > Tab "Análisis del Discurso" |
| **Propósito** | Herramienta de apoyo (andamiaje) | Artefacto de evaluación formativa |
| **Interacción** | PASIVA - IA analiza, estudiante observa | ACTIVA - Estudiante construye análisis |
| **Evaluación** | NO evalúa al estudiante | SÍ - Rúbrica 2 con 3 criterios |
| **Pedagogía** | Mostrar modelo de análisis | Practicar y demostrar capacidad analítica |

**NO hay duplicación:** Ambos componentes son complementarios en un flujo pedagógico coherente:
1. Estudiante ve análisis automático (ACDAnalysisPanel) como **modelo**
2. Luego crea su propio análisis (TablaACD) como **práctica evaluada**
3. Recibe feedback criterial de SU análisis

### Archivos Creados

#### 1. `src/services/tablaACD.service.js` (370 líneas)

**Función principal:** `evaluateTablaACD({ text, marcoIdeologico, estrategiasRetoricas, vocesPresentes, vocesSilenciadas })`

**Estrategia de evaluación dual:**

```
FASE 1: DeepSeek (precisión estructural)
├─ ¿Marco coherente con el texto?
├─ ¿Estrategias correctamente identificadas?
├─ ¿Voces precisas?
└─ → Nivel 1-4 por criterio

FASE 2: OpenAI (profundidad crítica)
├─ ¿Conecta marco con beneficiarios?
├─ ¿Explica poder persuasivo de estrategias?
├─ ¿Analiza impacto de silencios?
└─ → Ajusta niveles según profundidad

FASE 3: Combinar feedback
├─ Nivel global (promedio + ajuste)
├─ Fortalezas por criterio
├─ Mejoras específicas
└─ Evidencias textuales
```

**Criterios evaluados:**
1. **marco_ideologico**: Identificación del marco ideológico
2. **estrategias_retoricas**: Análisis de estrategias retóricas
3. **voces_silencios**: Reconocimiento de voces y silencios

**Parámetros:**
- DeepSeek: temp=0.2, max_tokens=1500, timeout=30s, JSON
- OpenAI: temp=0.3, max_tokens=1800, timeout=45s, JSON

#### 2. `src/components/artefactos/TablaACD.js` (730 líneas)

**Componente React con formulario estructurado**

**Secciones:**
1. **Guía Pedagógica** (colapsable)
   - Preguntas guía de la Rúbrica 2
   - Ejemplos de análisis crítico

2. **Formulario de Análisis**
   - Marco Ideológico (textarea, mín. 10 caracteres)
   - Estrategias Retóricas (textarea, mín. 20 caracteres)
   - Voces Presentes (input)
   - Voces Silenciadas (input)

3. **Validación en tiempo real**
   - Mensajes progresivos según completitud
   - Botón habilitado solo cuando es válido

4. **Feedback Criterial**
   - Nivel global (1-4)
   - Card por criterio con:
     - Nivel específico
     - Fortalezas (✓)
     - Mejoras (→)
   - Botón "Nuevo Intento"

**Features:**
- ✅ Persistencia con `useActivityPersistence`
- ✅ Validación: ≥1 marco, ≥2 estrategias, ≥1 voz
- ✅ Loading states con spinner animado
- ✅ Animaciones con Framer Motion
- ✅ Tema adaptativo (modo oscuro)
- ✅ Responsive

### Archivos Modificados

#### 1. `src/components/Actividades.js`

**Cambios:**
- Import de `TablaACD`
- Nueva tab "🔍 Análisis del Discurso" (segunda posición)
- Renderizado condicional: `activeSection === 'tabla-acd'`
- `NextStepCard` actualizado:
  - Resumen → Análisis del Discurso
  - Análisis del Discurso → Ejercicios Guiados

**Orden actual de tabs:**
1. 📚 Resumen Académico (Rúbrica 1)
2. 🔍 Análisis del Discurso (Rúbrica 2) ✅ NUEVO
3. 📝 Ejercicios Guiados
4. 🎯 Aplicación Práctica
5. 📊 Mi Progreso

### Rúbrica 2: Niveles de Desempeño

| Nivel | Descriptor | Score |
|-------|------------|-------|
| 1 | **Insuficiente**: No reconoce perspectiva ni sesgos | 1-2.5 |
| 2 | **Básico**: Identifica estrategias sin conectar con ideología | 2.6-5.5 |
| 3 | **Adecuado**: Analiza marcos y voces con ejemplos | 5.6-8.5 |
| 4 | **Avanzado**: Desvela sistemáticamente ideología e intereses | 8.6-10 |

### Flujo Pedagógico Integrado

```
1. LECTURA GUIADA
   └─ ACDAnalysisPanel muestra análisis automático (modelo)
   
2. ACTIVIDADES
   ├─ Resumen Académico (Rúbrica 1) ✅
   ├─ Tabla ACD (Rúbrica 2) ✅ NUEVO
   ├─ Ejercicios Guiados
   └─ Mi Progreso
   
3. EVALUACIÓN
   └─ Certificación sumativa
```

### Beneficios

**Pedagógicos:**
- ✅ Completa Rúbrica 2 del marco de literacidad crítica
- ✅ Complementa ACDAnalysisPanel sin duplicación
- ✅ Feedback formativo específico por criterio
- ✅ Guía pedagógica integrada

**Técnicos:**
- ✅ Evaluación dual aprovecha fortalezas de cada IA
- ✅ Persistencia robusta por `document_id`
- ✅ Validación en tiempo real
- ✅ Arquitectura escalable

**Usuario:**
- ✅ Feedback detallado sin ambigüedades
- ✅ Proceso guiado paso a paso
- ✅ Progreso guardado automáticamente
- ✅ Interfaz intuitiva

### Documentación

Ver: `IMPLEMENTACION_TABLA_ACD.md` para detalles completos, incluyendo:
- Arquitectura detallada
- Ejemplos de evaluación (superficial vs profundo)
- Escenarios de prueba
- Métricas de implementación

### Estado de Artefactos Pedagógicos

- [x] **Artefacto 1**: Resumen Académico (Rúbrica 1) ✅
- [x] **Artefacto 2**: Tabla ACD (Rúbrica 2) ✅
- [x] **Artefacto 3**: Mapa de Actores (Rúbrica 3) ✅
- [ ] **Artefacto 4**: Respuesta Argumentativa (Rúbrica 4)
- [ ] **Artefacto 5**: Bitácora Ética IA - Evaluación (Rúbrica 5)

**Progreso:** 3/5 artefactos completados (60%)

---

## 12.3. Artefacto 3 Implementado: Mapa de Actores y Consecuencias

**Fecha de implementación:** 29 de octubre de 2025  
**Rúbrica:** 3 - Contextualización Socio-Histórica  
**Estado:** ✅ Completado

### Resumen

Se ha implementado el tercer artefacto pedagógico: **Mapa de Actores y Consecuencias**, que permite al estudiante situar un texto en su contexto socio-histórico, identificar actores relevantes, analizar conexiones e intereses, y evaluar consecuencias sociales, recibiendo evaluación criterial con estrategia dual (DeepSeek + OpenAI).

### Archivos Creados

#### 1. `src/services/mapaActores.service.js` (420 líneas)

**Función principal:** `evaluateMapaActores({ text, actores, contextoHistorico, conexiones, consecuencias })`

**Estrategia de evaluación dual:**

```
FASE 1: DeepSeek (precisión contextual)
├─ ¿Actores relevantes para el texto?
├─ ¿Contexto histórico preciso?
├─ ¿Conexiones coherentes?
└─ → Nivel 1-4 por criterio

FASE 2: OpenAI (profundidad socio-histórica)
├─ ¿Conecta con procesos amplios?
├─ ¿Analiza dinámicas de poder?
├─ ¿Distingue corto vs largo plazo?
└─ → Ajusta niveles según profundidad

FASE 3: Combinar feedback
├─ Nivel global (promedio + ajuste)
├─ Fortalezas por criterio
└─ Mejoras específicas
```

**Criterios evaluados:**
1. **actores_contexto**: Identificación de actores y contexto
2. **conexiones_intereses**: Análisis de conexiones e intereses
3. **impacto_consecuencias**: Evaluación de impacto y consecuencias

#### 2. `src/components/artefactos/MapaActores.js` (790 líneas)

**Componente React con formulario en 4 secciones:**

1. **Actores Sociales y Políticos** (mín. 20 caracteres)
2. **Contexto Histórico/Social** (mín. 15 caracteres)
3. **Conexiones e Intereses** (mín. 20 caracteres)
4. **Consecuencias e Impacto** (mín. 20 caracteres)

**Features:**
- ✅ Persistencia con `useActivityPersistence`
- ✅ Validación progresiva
- ✅ Hints pedagógicos por campo
- ✅ Feedback criterial detallado

### Archivos Modificados

#### 1. `src/components/Actividades.js`

**Cambios:**
- Import de `MapaActores`
- Nueva tab "🗺️ Mapa de Actores" (tercera posición)
- `NextStepCard` desde Tabla ACD → Mapa de Actores

**Orden actual de tabs:**
1. 📚 Resumen Académico (Rúbrica 1) ✅
2. 🔍 Análisis del Discurso (Rúbrica 2) ✅
3. 🗺️ Mapa de Actores (Rúbrica 3) ✅ NUEVO
4. 📝 Ejercicios Guiados
5. 🎯 Aplicación Práctica
6. 📊 Mi Progreso

### Rúbrica 3: Niveles de Desempeño

| Nivel | Descriptor | Score |
|-------|------------|-------|
| 1 | **Insuficiente**: Texto como objeto aislado, sin contexto | 1-2.5 |
| 2 | **Básico**: Contexto general sin conexiones específicas | 2.6-5.5 |
| 3 | **Adecuado**: Conecta con procesos sociales específicos | 5.6-8.5 |
| 4 | **Avanzado**: Sitúa sistemáticamente, analiza dinámicas de poder | 8.6-10 |

### Valor Pedagógico

Este artefacto desarrolla **pensamiento socio-histórico**:
- ✅ Sitúa el texto en su contexto (vs lectura descontextualizada)
- ✅ Identifica actores estructurales (no solo obvios)
- ✅ Analiza relaciones de poder (no solo formales)
- ✅ Evalúa consecuencias reales (conexión con praxis social)

### Documentación

Ver: `IMPLEMENTACION_MAPA_ACTORES.md` para detalles completos, incluyendo:
- Ejemplos de análisis (superficial vs profundo)
- Escenarios de prueba
- Comparación con otros artefactos

---



## 12.4. Artefacto 4 Implementado: Respuesta Argumentativa 

**R�brica:** 4 - Argumentaci�n y Contraargumento
**Estado:**  Completado
**Archivos:** respuestaArgumentativa.service.js, RespuestaArgumentativa.js

Ver documentaci�n completa en: IMPLEMENTACION_RESPUESTA_ARGUMENTATIVA.md

**Criterios evaluados:
1. solidez_tesis - Claridad, especificidad, originalidad
2. uso_evidencia - Anclaje textual, pertinencia, explicaci�n
3. manejo_contraargumento - Relevancia y refutaci�n dial�gica

**Validaci�n:** 20 car (tesis), 30 car (evidencias/refutaci�n), 20 car (contraargumento)

---

## 12.5. Artefacto 5 Implementado: Bit�cora �tica de IA 

**R�brica:** 5 - Metacognici�n �tica del Uso de IA
**Estado:**  Completado (Componente existente mejorado)
**Archivos:** bitacoraEticaIA.service.js, BitacoraEticaIA.js (modificado)

Ver documentaci�n completa en: IMPLEMENTACION_BITACORA_ETICA_IA.md

**Criterios evaluados:**
1. registro_transparencia - Documentaci�n de interacciones
2. evaluacion_critica_herramienta - Verificaci�n y limitaciones
3. agencia_responsabilidad - Autor�a y agencia intelectual

**Validaci�n:** 50 car por reflexi�n, 2 declaraciones

**Caracter�sticas �nicas:**
- Registro autom�tico de interacciones con tutor IA
- Doble evaluaci�n (0-10 autom�tica + 1-4 criterial dual)
- Exportaci�n JSON completa
- Detecci�n de reflexi�n aut�ntica vs superficial

---

## 13. RESUMEN FINAL: MARCO PEDAG�GICO COMPLETO 

###  Estado de Artefactos (5/5 COMPLETADOS)

| # | Artefacto | R�brica | Estado |
|---|-----------|---------|--------|
| 1 | Resumen Acad�mico | Comprensi�n Anal�tica |  COMPLETADO |
| 2 | Tabla ACD | An�lisis Ideol�gico-Discursivo |  COMPLETADO |
| 3 | Mapa de Actores | Contextualizaci�n Socio-Hist�rica |  COMPLETADO |
| 4 | Respuesta Argumentativa | Argumentaci�n y Contraargumento |  COMPLETADO |
| 5 | Bit�cora �tica IA | Metacognici�n �tica del Uso de IA |  COMPLETADO |

###  Orden de Tabs en Actividades.js

1.  **Resumen Acad�mico** (R�brica 1)
2.  **An�lisis del Discurso** (R�brica 2)
3.  **Mapa de Actores** (R�brica 3)
4.  **Respuesta Argumentativa** (R�brica 4)
5.  **Bit�cora �tica IA** (R�brica 5)
6.  **Ejercicios Guiados** (Legacy)
7.  **Aplicaci�n Pr�ctica** (Legacy)
8.  **Mi Progreso** (Legacy)

###  Estrategia Dual AI Implementada

**Todos los artefactos usan evaluaci�n dual:**

| Proveedor | Enfoque | Temperatura | Tokens |
|-----------|---------|-------------|--------|
| **DeepSeek** | Validaci�n estructural/t�cnica | 0.2 | 1500 |
| **OpenAI** | Profundidad cr�tica/metacognitiva | 0.3 | 1800 |

**Ventajas:**
- DeepSeek: R�pido, econ�mico, preciso para validaci�n t�cnica
- OpenAI: Sofisticado, matizado, excelente para pensamiento cr�tico
- Combinaci�n: Balance costo/calidad, redundancia para robustez

###  Persistencia Robusta

**Hook unificado:** useActivityPersistence

 Guarda por document_id (no por hash de texto)
 TTL de 30 d�as
 L�mite de 15 documentos
 Rehidrataci�n autom�tica
 M�tricas en tiempo real

###  Principios Pedag�gicos Aplicados

| Principio | Estado | Ubicaci�n |
|-----------|--------|-----------|
| **Anclaje en Evidencia** |  Parcial | DeepSeek valida citas en cada artefacto |
| **Modo Socr�tico** |  Parcial | Hints pedag�gicos, faltan preguntas reflexivas |
| **Transparencia** |  Completo | Muestra fuentes (DeepSeek + OpenAI) |
| **Criterial** |  Completo | Niveles 1-4 con descriptores de r�brica |
| **Docente en el Circuito** |  Pendiente | Dashboard de intervenci�n no implementado |

###  Tareas Pendientes (Principios de Evaluaci�n IA)

Si se desea completar el marco al 100%:

1. **Validador de Anclaje en TutorCore:**
 - Rechazar respuestas sin citas textuales
 - Obligar a estudiante a proveer evidencias

2. **Modo Socr�tico Reforzado:**
 - Prompt debe incluir 2 preguntas reflexivas
 - No dar respuestas directas, guiar con preguntas

3. **Transparencia de Razonamiento:**
 - Mostrar proceso de razonamiento de la IA
 - Explicar por qu� lleg� a cada conclusi�n

4. **Docente en el Circuito:**
 - Dashboard para ver progreso de estudiantes
 - Alertas para intervenci�n pedag�gica
 - Hist�rico de evaluaciones

---

**Fecha de finalizaci�n de artefactos:** 29 de octubre de 2025
**Artefactos completados:** 5/5 (100%)
**Principios de evaluaci�n:** 3/5 (60%)

 **�TODOS LOS ARTEFACTOS PEDAG�GICOS EST�N IMPLEMENTADOS!**

---

## 14. ARQUITECTURA MULTI-TENANCY: FIREBASE + AUTENTICACI�N 

**Estado:**  Implementado (Fase 1 y 2 completas)
**Fecha de implementaci�n:** 30 de octubre de 2025

###  Resumen de la Implementaci�n

Se ha implementado una **arquitectura completa de autenticaci�n y persistencia** usando Firebase, preparando la aplicaci�n para escalar a m�ltiples usuarios (estudiantes y docentes) con roles diferenciados.

###  Componentes Implementados

#### 1. Firebase Core (src/firebase/)

| Archivo | Descripci�n | Funciones Clave |
|---------|-------------|----------------|
| config.js | Configuraci�n de Firebase | Inicializa uth, db, storage |
| uth.js | Autenticaci�n completa | egisterWithEmail, loginWithEmail, loginWithGoogle, logout |
| irestore.js | Helpers de Firestore | uploadTexto, saveStudentProgress, subscribeToStudentProgress |

#### 2. Autenticaci�n y Contexto

| Archivo | Descripci�n | Export Principal |
|---------|-------------|-----------------|
| context/AuthContext.js | Contexto de usuario autenticado | AuthProvider, useAuth() |
| components/auth/Login.js | UI de login | Email/Password + Google SSO |
| components/auth/Register.js | UI de registro | Con selector de rol |
| outes/PrivateRoute.js | Protecci�n de rutas | EstudianteRoute, DocenteRoute |

#### 3. Persistencia en la Nube

| Archivo | Descripci�n | Reemplaza |
|---------|-------------|-----------|
| hooks/useFirestorePersistence.js | Sincronizaci�n autom�tica con Firestore | useActivityPersistence (localStorage) |

#### 4. Seguridad

| Archivo | Descripci�n |
|---------|-------------|
| irestore.rules | Reglas de seguridad de Firestore con control de acceso por rol |

###  Modelo de Datos

#### Colecciones Firestore

`
users/{uid}
 role: " estudiante\ | \docente\
 nombre, email
 docenteAsignado (solo estudiantes)
 institucion (solo docentes)

textos/{textoId}
 titulo, autor, genero, complejidad
 docenteUid
 asignadoA: [estudiante_uid, ...]
 fileURL (PDF en Storage)
 completeAnalysis (pre-guardado)

students/{uid}/progress/{textoId}
 rubrica1: { score, nivel, artefacto, criterios }
 rubrica2, rubrica3, rubrica4, rubrica5
 promedio_global
 ultima_actividad

evaluaciones/{evalId}
 estudianteUid, textoId
 pregunta, respuesta
 score, nivel, fortalezas, mejoras
 deepseek_score, openai_score
`

### Flujos de Trabajo

#### Estudiante:
1. Login /login
2. Redirigido a /estudiante/textos
3. Ve textos asignados por docente
4. Selecciona texto /estudiante/lectura/:textoId
5. Completa actividades (Resumen, ACD, etc.)
6. Progreso se guarda autom�ticamente en Firestore
7. Sincronizaci�n en tiempo real entre dispositivos

#### Docente (Fase 3 - Pendiente):
1. Login /docente/dashboard
2. Sube textos (PDF)
3. Asigna textos a estudiantes
4. Ve progreso en tiempo real
5. Exporta reportes (CSV/PDF)

### Ventajas de la Nueva Arquitectura

| Ventaja | Descripci�n |
|---------|-------------|
| **Multi-dispositivo** | Estudiante puede continuar en cualquier dispositivo |
| **Real-time** | Cambios se reflejan instant�neamente |
| **Escalable** | Soporta miles de usuarios con Firebase |
| **Backup autom�tico** | Datos en la nube + backup en localStorage |
| **Seguridad robusta** | Reglas de Firestore basadas en roles |
| **Sin servidor propio** | Firebase maneja autenticaci�n y base de datos |

### Costos Estimados

| Servicio | Plan | L�mites | Costo |
|----------|------|---------|-------|
| Firebase | Spark (Gratis) | 50k lecturas/d�a | **/mes** |
| Railway | Developer | 500 hrs/mes | **/mes** |
| DeepSeek API | Pay-as-go | .14/1M tokens | **-10/mes** |

**Total:** **-10/mes** para 50-100 estudiantes activos.

### Seguridad Implementada

#### Reglas de Firestore:

 **Usuarios:** Solo pueden leer/escribir su propio perfil
 **Textos:** Docentes solo ven sus textos, estudiantes solo los asignados
 **Progreso:** Estudiantes solo escriben su progreso, docentes solo leen
 **Evaluaciones:** Inmutables despu�s de creadas
 **Default:** Denegar todo lo dem�s

### Pr�ximos Pasos (Fase 3)

Para completar la arquitectura multi-tenancy:

1. **Integrar AuthProvider en App.js**
 - Envolver toda la app con <AuthProvider>
 - Definir rutas protegidas con EstudianteRoute y DocenteRoute

2. **Migrar ubricProgress en AppContext.js**
 - Usar subscribeToStudentProgress para sincronizaci�n real-time
 - Guardar con saveStudentProgress en lugar de localStorage

3. **Crear componentes de Docente:**
 - DocenteDashboard.js - Panel principal
 - UploadTexto.js - Subir PDFs
 - AssignTexto.js - Asignar textos a estudiantes
 - ProgressDashboard.js - Ver progreso de estudiantes

4. **Crear componente de Estudiante:**
 - TextoSelector.js - Seleccionar texto asignado

5. **Configurar Firebase:**
 - Seguir FIREBASE_SETUP.md paso a paso
 - Desplegar reglas de seguridad
 - Deploy en Firebase Hosting

6. **Configurar Backend:**
 - Deploy en Railway.app o Render.com
 - Actualizar CORS para permitir dominio de Firebase
 - Remover API key hardcodeada (seguridad)

### Documentaci�n Creada

| Documento | Descripci�n |
|-----------|-------------|
| FIREBASE_SETUP.md | Gu�a completa paso a paso (10 secciones) |
| ARQUITECTURA_FIREBASE_COMPLETA.md | Resumen t�cnico + integraci�n con c�digo existente |
| .env.example | Template de variables de entorno |
| irestore.rules | Reglas de seguridad listas para deploy |

### Advertencias Importantes

1. **API Key hardcodeada:** Remover sk-0632e6fd405b41f3bd4db539bb60b3e8 de server/index.js (l�nea 40) antes de subir a producci�n.

2. **CORS:** Actualizar CORS en el backend para solo permitir dominio de Firebase Hosting.

3. **Rate Limiting:** Implementar express-rate-limit en el backend para evitar abuso.

4. **.env en .gitignore:** Asegurar que .env nunca se suba a GitHub.

---

** Arquitectura Firebase completa y lista para desplegar.**
** Consulta FIREBASE_SETUP.md para empezar la configuraci�n.**
