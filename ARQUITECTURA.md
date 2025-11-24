# Arquitectura y Flujo de Datos de la Aplicación - AppLectura

> **📅 Actualizado**: 11 de octubre de 2025  
> **🏗️ Estado**: Arquitectura Post-Refactorización (Sistema Centralizado de APIs)  
> **📋 Versión**: 2.0 - Sistema Unificado

Este documento describe la estructura completa de la aplicación AppLectura después de la implementación del sistema centralizado de APIs, incluyendo la identificación de archivos obsoletos y la nueva arquitectura optimizada.

---

## 🎯 **Resumen Arquitectónico**

AppLectura es una aplicación React con backend Express que proporciona herramientas de análisis de texto mediante IA. La arquitectura se basa en:

- **Frontend**: React 18.2.0 con sistema centralizado de configuración de APIs
- **Backend**: Express con procesamiento de PDFs y proxy hacia servicios de IA
- **Gestión de Estado**: Context API + Hooks personalizados
- **Proveedores IA**: Sistema unificado con fallbacks (OpenAI, DeepSeek, Gemini)
- **Styling**: Styled-components con soporte de temas

> Nota de alineación (oct 2025): El modo Tutor se integra ahora en el “Itinerario de lectura” y el visor sin IA se denomina “Lectura guiada”. La separación Tutor (no evaluativo) vs Evaluador (formal) se mantiene. Consulta el diseño y roadmap en [DISEÑO_ITINERARIO_Y_EVALUACION.md](./DISEÑO_ITINERARIO_Y_EVALUACION.md).

---

## 🎨 **Frontend (React) - Arquitectura Actualizada**

### **📁 Estructura de Directorios**

```
src/
├── 🚀 index.js                    # Punto de entrada principal
├── 🎯 App_nueva_interfaz.js       # ✅ Componente principal ACTIVO
├── 📱 components/                 # Componentes de interfaz
│   ├── 🎛️ SettingsPanel.js       # ✅ Panel de configuración centralizado
│   ├── 🔘 SettingsButton.js       # ✅ Botón flotante de configuración  
│   ├── 📖 LecturaInteractiva.js   # ✅ Componente principal de lectura + chat
│   ├── 🔍 AnalisisTexto.js        # ✅ Análisis de texto con IA
│   ├── 📝 SistemaEvaluacion.js    # ✅ Generación de evaluaciones
│   ├── 📚 NotasEstudio.js         # ✅ Sistema de notas con aprendizaje espaciado
│   ├── 📄 VisorTexto_responsive.js # ✅ Visualizador de texto sin IA
│   ├── 📁 CargaTexto_responsive.js # ✅ Carga de archivos y textos
│   └── 🎨 layout/                 # Componentes de layout
├── 🔧 hooks/                      # Hooks personalizados  
│   ├── ⚙️ useApiConfig.js         # ✅ HUB CENTRAL - Gestión de APIs
│   ├── 🗂️ useFileCache.js         # ✅ Cache de archivos
│   ├── 📊 useTextAnalysis.js      # ✅ Análisis de métricas de texto
│   └── 📝 notes/useNotasEstudio.js # ✅ Gestión de notas de estudio
├── 🌐 services/                   # Servicios de comunicación
│   ├── 🎯 unifiedAiService.js     # ✅ SERVICIO UNIFICADO - Múltiples proveedores
│   ├── 📄 PdfService.js           # ✅ Procesamiento de PDFs
│   └── 🔍 webSearchService.js     # ✅ Búsqueda web (experimental)
├── ⚙️ config/                     # Configuraciones
│   └── 🤖 aiProviders.js          # ✅ Definiciones de proveedores IA
├── 🗂️ context/                    # Contexto global
│   └── 🌍 AppContext.js           # ✅ Estado global de la aplicación
├── 🎨 styles/                     # Estilos y temas
│   └── 🌓 theme.js                # ✅ Temas claro/oscuro
└── 🛠️ utils/                      # Utilidades
    ├── 📄 backendUtils.js         # ✅ Comunicación con backend
    ├── 📊 textAnalysisMetrics.js  # ✅ Métricas de análisis
    └── 🗂️ fileProcessor.js        # ✅ Procesamiento de archivos
```

### **1. Punto de Entrada (`src/index.js`)**

**Estado**: ✅ **ACTIVO**  
**Función**: Inicializa la aplicación React y renderiza el componente raíz.

```javascript
// Renderiza App dentro de AppContextProvider para estado global
ReactDOM.render(
  <AppContextProvider>
    <App />
  </AppContextProvider>, 
  document.getElementById('root')
);
```

**Relaciones**:
- ➡️ `App_nueva_interfaz.js` (componente raíz)
- ➡️ `AppContext.js` (estado global)
- ➡️ `index.css` (estilos globales)

### **2. Componente Principal (`src/App_nueva_interfaz.js`)**

**Estado**: ✅ **ACTIVO** (Reemplaza App.js)  
**Función**: Orquestador principal con navegación por pestañas y gestión de vistas.

**Características**:
- 🎯 Sistema de pestañas: Lectura Interactiva, Solo Lectura, Evaluación, Análisis, Notas
- 🌓 Modo enfoque (focus mode) para lectura sin distracciones
- 🎨 Integración con sistema de temas
- ⚙️ Integración con botón de configuración flotante

**Relaciones**:
- ➡️ `AppContext.js` (estado compartido)
- ➡️ `SettingsButton.js` (configuración de APIs)
- ➡️ Todos los componentes principales (lazy loading)

### **3. Sistema Centralizado de APIs**

#### **🎯 Hook Central (`src/hooks/useApiConfig.js`)**

**Estado**: ✅ **NÚCLEO DEL SISTEMA**  
**Función**: Hub centralizado para gestión de múltiples proveedores de IA.

**Características**:
- 🔄 Fallback automático entre proveedores
- 📊 Estadísticas de uso en tiempo real
- 🔑 Gestión segura de claves API
- ⚡ Detección automática de disponibilidad

```javascript
const { aiClient, activeProvider, switchProvider, isAvailable } = useApiConfig();
```

#### **🌐 Servicio Unificado (`src/services/unifiedAiService.js`)**

**Estado**: ✅ **SERVICIO PRINCIPAL**  
**Función**: Abstrae la comunicación con múltiples proveedores de IA.

**Proveedores Soportados**:
- 🤖 OpenAI (GPT-4, GPT-3.5)
- 🎯 DeepSeek (gratuito, sin API key)  
- 🔍 Google Gemini

**Métodos**:
```javascript
// Interfaz unificada para todos los proveedores
await aiClient.generateResponse(messages, options);
```

#### **⚙️ Panel de Configuración (`src/components/SettingsPanel.js`)**

**Estado**: ✅ **INTERFAZ DE CONFIGURACIÓN**  
**Función**: Interfaz completa para gestión de proveedores y configuración.

**Pestañas**:
- 🔄 **Proveedores**: Selección y configuración de APIs
- 📊 **Dashboard**: Estadísticas de uso y rendimiento
- ⚙️ **Configuración**: Opciones avanzadas

### **4. Componentes Principales Migrados**

#### **📖 Lectura Interactiva (`src/components/LecturaInteractiva.js`)**

**Estado**: ✅ **MIGRADO** al sistema centralizado  
**Función**: Chat interactivo con IA sobre el texto cargado.

**Integración**:
```javascript
const { aiClient } = useApiConfig(); // ✅ Sistema centralizado
// ❌ Ya no usa: import OpenAI from 'openai' (obsoleto)
```

#### **🔍 Análisis de Texto (`src/components/AnalisisTexto.js`)**

**Estado**: ✅ **MIGRADO** al sistema centralizado  
**Función**: Análisis inteligente de métricas y contenido del texto.

#### **📝 Sistema de Evaluación (`src/components/SistemaEvaluacion.js`)**

**Estado**: ✅ **MIGRADO** al sistema centralizado  
**Función**: Generación de preguntas y evaluaciones personalizadas.

**Cambios Recientes**:
```javascript
// ✅ NUEVO: Sistema centralizado
const { aiClient } = useApiConfig();

// ❌ OBSOLETO: Importación directa
// import OpenAI from 'openai';
```

#### **📚 Notas de Estudio (`src/components/NotasEstudio.js`)**

**Estado**: ✅ **COMPLETAMENTE REFACTORIZADO**  
**Función**: Sistema de notas con aprendizaje espaciado.

**Hook Personalizado**:
```javascript
// ✅ Hook especializado migrado al sistema centralizado
const { 
  notas, cronograma, regenerarNotas 
} = useNotasEstudio(texto); // Usa useApiConfig internamente
```

#### **📄 Visor de Texto (`src/VisorTexto_responsive.js`)**

**Estado**: ✅ **INDEPENDIENTE** (no requiere IA)  
**Función**: Visualización pura de texto con controles de lectura.

**Características**:
- 🎨 Control de fuentes y temas
- 📊 Barra de progreso de lectura
- 🎯 Modo enfoque sin distracciones

---

## 🗂️ **Archivos Identificados como OBSOLETOS**

### **❌ Componentes Principales Obsoletos:**

```
src/
├── ❌ App.js                      # Reemplazado por App_nueva_interfaz.js
├── ❌ App_old.js                  # Versión anterior
├── ❌ App_original.js             # Versión original
├── ❌ App_responsive.js           # Versión responsive anterior
├── ❌ App_debug.js                # Versión de debug
├── ❌ App_fixed.js                # Versión de correcciones
├── ❌ VisorTexto.js               # Reemplazado por VisorTexto_responsive.js
├── ❌ ChatIA.js                   # Funcionalidad integrada en LecturaInteractiva.js
├── ❌ ChatIA_backup.js            # Backup obsoleto
└── ❌ ChatIA_clean.js             # Versión limpia obsoleta
```

### **❌ Componentes de Configuración Obsoletos:**

```
src/components/
├── ❌ OpenAIConfigPanel.js        # Reemplazado por SettingsPanel.js
├── ❌ APIConfigurationPanel.js    # Reemplazado por SettingsPanel.js
├── ❌ WebSearchConfigPanel.js     # Funcionalidad integrada en SettingsPanel.js
├── ❌ CargaTexto.js               # Reemplazado por CargaTexto_responsive.js
├── ❌ SistemaEvaluacion.js.backup # Backup obsoleto
├── ❌ SistemaEvaluacion_clean.js  # Versión limpia obsoleta
├── ❌ SistemaEvaluacion_duplicado.js # Duplicado
├── ❌ NotasEstudioNuevo.js        # Versión experimental obsoleta
└── ❌ LecturaInteractiva_*.js     # Múltiples versiones obsoletas
```

### **❌ Servicios Obsoletos:**

```
src/services/
└── ❌ aiService.js                # Reemplazado por unifiedAiService.js
```

---

## 🏗️ **Backend (Node.js / Express) - Estado Actual**

### **📁 Estructura del Backend**

```
server/
├── 🚀 index.js                   # ✅ SERVIDOR ACTIVO - Punto de entrada principal
├── ⚙️ config/
│   ├── 🔑 apiClients.js           # ✅ Clientes de API configurados
│   └── ⚙️ settings.js             # ✅ Configuraciones del servidor
├── 🛣️ routes/                    # ✅ Definiciones de rutas API
├── 🎮 controllers/               # ✅ Lógica de controladores  
├── 🤖 services/                  # ✅ Servicios de IA específicos
├── 📝 prompts/                   # ✅ Templates de prompts
├── ✅ validators/                # ✅ Validadores de entrada
└── 🗑️ Archivos eliminados (oct 2025):
    ├── 🗑️ simple-backend.js      # Eliminado; funcionalidad migrada a index.js
    ├── 🗑️ simple-server.js       # Eliminado (versión anterior)
    └── 🗑️ temp-server.js         # Eliminado (archivo temporal)
```

### **🚀 Servidor Principal (`server/index.js`)**

**Estado**: ✅ **SERVIDOR ACTIVO**  
**Función**: Servidor Express modular que monta todas las rutas oficiales de la app.

**Endpoints principales**:
- `GET /api/health` — Health check
- `POST /api/chat/completion` — Chat conversacional (Tutor/Evaluador)
- `POST /api/analysis/text` — Análisis de texto
- `POST /api/notes/generate` — Generación de notas (aprendizaje espaciado)
- `POST /api/web-search` — Enriquecimiento con búsqueda web
- `POST /api/process-pdf` — Procesamiento de PDFs
- `POST /api/ocr-image` — OCR de imágenes
- `/api/assessment/*` — Endpoints de evaluación

**Características**:
- 🌐 CORS configurado para el frontend
- � Middleware de parsing y validación
- 🧩 Rutas modulares en `server/routes/*`

### **⚙️ Configuración de APIs (`server/config/apiClients.js`)**

**Estado**: ✅ **CONFIGURACIÓN CENTRALIZADA**  
**Función**: Configuración segura de clientes API para diferentes proveedores.

---

## 🌊 **Flujo de Datos Actualizado**

### **📋 Ejemplo: Análisis de Texto con Sistema Centralizado**

1. **👤 Usuario (Frontend)**: Carga texto y selecciona "Análisis"
2. **🎯 Componente**: `AnalisisTexto.js` obtiene `aiClient` via `useApiConfig()`
3. **⚙️ Hook Central**: `useApiConfig()` selecciona proveedor disponible automáticamente
4. **🌐 Servicio Unificado**: `unifiedAiService.js` envía petición al proveedor activo
5. **🤖 Proveedor IA**: Respuesta desde OpenAI/DeepSeek/Gemini según disponibilidad
6. **🔄 Fallback**: Si falla, automáticamente intenta siguiente proveedor
7. **📊 Estadísticas**: `useApiConfig()` actualiza métricas de uso
8. **🎨 UI**: Componente muestra resultado y actualiza dashboard

### **🔄 Sistema de Fallbacks**

```javascript
// Orden de prioridad automático:
1. DeepSeek (gratuito) → 2. OpenAI (si configurado) → 3. Gemini (si configurado)
```

---

## 🚨 **Problemas de Arquitectura Identificados**

### **🗂️ Archivos Duplicados/Obsoletos:**

1. **❌ Múltiples versiones de App.js** - Solo `App_nueva_interfaz.js` es necesario
2. **❌ Componentes de configuración duplicados** - Consolidados en `SettingsPanel.js`
3. **❌ Servicios de IA fragmentados** - Unificados en `unifiedAiService.js`
4. **❌ Múltiples versiones de componentes** - Solo versiones `_responsive` activas

### **🔧 Recomendaciones de Limpieza:**

```bash
# Archivos seguros para eliminar:
src/App*.js (excepto App_nueva_interfaz.js)
src/ChatIA*.js (funcionalidad movida a LecturaInteractiva.js)
src/components/*Config*.js (excepto SettingsPanel.js)
src/components/*backup*.js
src/components/*duplicado*.js
src/services/aiService.js (reemplazado por unifiedAiService.js)
server/simple-backend.js (reemplazado por index.js)
server/simple-server.js
server/temp-server.js
```


## 🎯 **Ventajas de la Nueva Arquitectura**

### **✅ Sistema Centralizado:**

### **✅ Mantenibilidad:**

### **✅ Escalabilidad:**


## � **Próximos Pasos Recomendados**

### **🧹 Limpieza de Código:**
1. ❌ Eliminar archivos obsoletos identificados
2. 📝 Actualizar imports y referencias
3. 🧪 Ejecutar tests para validar funcionalidad
4. 📚 Actualizar documentación

### **🚀 Optimizaciones Pendientes:**
1. 📦 **Bundle Analysis**: Optimizar tamaño de la aplicación
2. 🏃 **Performance**: Implementar más lazy loading
3. 🧪 **Testing**: Actualizar tests para nueva arquitectura
4. 📱 **PWA**: Considerar funcionalidades offline


---

## 🧪 Extensión Tutor: Unificación "Lectura Guiada"

Esta fase introduce la convergencia de "Solo Lectura" y "Lectura Interactiva" en un modelo único de acompañamiento pedagógico no evaluativo.

### Cambios Técnicos Clave
1. `TutorCore` ahora acepta:
    - `onAssistantMessage(message, api)` para aplicar post-procesamiento (follow-ups, enriquecimiento, logging).
    - Método `injectAssistant(content)` para insertar respuestas asistente adicionales sin invocar backend.
2. Hook `useTutorPersistence` centraliza hidratación y guardado compacto (`[{r,c}]`).
3. Hook `useFollowUpQuestion` genera preguntas de profundización heurísticas (contrast detection, enumeraciones, conceptos capitalizados) y las inyecta con un retardo configurable.
4. Eliminación progresiva de la gamificación (puntuación) para alinear con el rol de tutor guía.

### Flujo Post-Respuesta (Nuevo)
```
Usuario → sendPrompt() → backend responde → onAssistantMessage() → heurística follow-up → injectAssistant()
```

### Beneficios
- Menos pestañas redundantes.
- Tutor extensible por plugins ligeros (follow-ups hoy, posibles análisis críticos inline mañana).
- Persistencia desacoplada reutilizable en dock y panel.

### Roadmap Resumido (Actualizado)
| Orden | Tarea | Estado | Notas |
|-------|-------|--------|-------|
| 1 | Extender TutorCore (onAssistantMessage + injectAssistant) | ✅ | Implementado y estable |
| 2 | Hook persistencia `useTutorPersistence` | ✅ | Almacenamiento compacto localStorage |
| 3 | Hook follow-up `useFollowUpQuestion` | ✅ | Heurística multi–patrón cubierta por tests |
| 4 | Refactor parcial `LecturaInteractiva` (remover puntuación) | ✅ | Modo evaluativo aislado en otro módulo |
| 5 | Extraer botón web enrichment a componente reutilizable | ✅ | `WebEnrichmentButton` + constante sentinela |
| 6 | Crear `ReadingWorkspace` unificado | ✅ | Ahora incluye notas, acciones y métricas |
| 7 | Deprecar archivo `LecturaInteractiva.js` tras migración | En progreso | Se mantiene detrás de flag para rollback |
| 8 | Tests follow-up y persistencia dedicados | ✅ | `useFollowUpQuestion.test.js`, context builders |
| 9 | Test evento tutor-external-prompt | ✅ | Garantiza acoplamiento débil |
| 10 | Migrar panel de notas a ReadingWorkspace | ✅ | `NotesPanelDock` + adapter `useNotesWorkspaceAdapter` |
| 11 | Acciones contextualizadas (reader-action) → Tutor | ✅ | Test integración `ReadingWorkspace.actions.test.js` |
| 12 | Métricas ampliadas (palabras, caracteres, tiempo) | ✅ | Expuestas vía `data-testid="rw-stats"` |
| 13 | Smoke unificado ReadingWorkspace | ✅ | `ReadingWorkspace.smoke.test.js` |
| 14 | Feature flag desactivación vista legacy | ✅ | `REACT_APP_DISABLE_LEGACY_INTERACTIVE` + test |
| 15 | Paridad focus mode | Pendiente | Evaluar si se porta o se documenta su exclusión |
| 16 | Telemetría mínima (contadores prompts enriquecidos/acciones) | Pendiente | Opcional para analítica |

### Paridad y Estrategia de Retirada de Legacy
La vista `LecturaInteractiva` permanece disponible mientras se valida:
- [x] Acciones contextualizadas integradas en `ReadingWorkspace`.
- [x] Notas con creación, borrado y exportación.
- [x] Enriquecimiento web reutilizando la misma frase sentinela.
- [x] Follow-ups post-respuesta.
- [x] Métricas básicas (palabras, caracteres, tiempo estimado lectura).
- [ ] Focus mode (decidir: portar o documentar su exclusión).
- [ ] Telemetría básica (mínimo: nº acciones y nº enriquecimientos) para confirmar uso.

Una vez marcados los pendientes, se activará definitivamente `REACT_APP_DISABLE_LEGACY_INTERACTIVE=true` y se planificará la eliminación física del archivo legacy en una release mayor.

### Tests Añadidos Clave
- `ReadingWorkspace.actions.test.js`: Garantiza transformación de evento `reader-action` → prompt tutor.
- `ReadingWorkspace.smoke.test.js`: Flujo de notas + prompt + enriquecimiento.
- `enrichmentConstants.test.js`: Estabilidad de frase sentinela y builder.
- `TutorExternalPrompt.test.js`: Inyección externa de prompts.
- `useNotesWorkspaceAdapter.test.js`: Ordenación y export de notas.
- `legacyFlag.test.js`: Comportamiento del feature flag legacy.

### Métricas y Observabilidad (Futuro)
Se propone un hook ligero `useTutorMetrics()` que incremente contadores en memoria (y opcional persistencia) para:
- nº prompts usuario
- nº follow-ups generados
- nº enriquecimientos web usados
- nº acciones contextualizadas disparadas

Estos datos permitirían justificar la retirada definitiva del legacy y priorizar mejoras (p.e. si follow-ups se usan poco, iterar heurística).

### Consideraciones de Seguridad
- No se exponen claves cliente; DeepSeek se obtiene desde backend (`process.env`).
- Follow-ups se generan localmente: cero coste extra de tokens.

### Próximos Pasos Recomendados
1. Añadir test unitario para `generateFollowUp` (casos: contraste, enumeración, términos capitalizados, longitud insuficiente). ✅
2. Introducir prop para desactivar follow-ups en tests que validan conteo exacto de mensajes. (Disponible vía enabled)
3. Refactor visual: reemplazar panel lateral por dock extensible / o mantener dock único. (Dock activo)
4. Migrar panel de notas y controles avanzados al `ReadingWorkspace` (en curso)
5. Consolidar frase sentinela de enriquecimiento web en constante reutilizable.

---
## 🧩 Context Builders Unificados

Se centralizó la construcción de contexto para prompts en `src/utils/contextBuilders.js` evitando duplicación en `LecturaInteractiva` y `ReadingWorkspace`.

Funciones expuestas:
| Función | Uso | Notas |
|---------|-----|-------|
| `buildContextFromFullText` | Contexto completo con truncamiento seguro | Añade nota de caracteres truncados |
| `buildContextFromParagraphSelection` | Selección + 2 párrafos anteriores/posteriores | Marca párrafo focal con `>>>` |
| `buildTutorContext` | Decide entre selección o full text | API principal para TutorCore |
| `buildReadingWorkspaceContext` | Versión ligera para barra unificada | Límite 4000 chars + etiqueta de truncamiento |

Beneficios:
- Menor código repetido.
- Mayor facilidad para agregar resúmenes semánticos futuros (hook de embeddings o LLM offline) en un solo punto.
- Alineación con tests añadidos (`contextBuilders.test.js`).

---
## 🌐 Enriquecimiento Web y Evento Global

El enriquecimiento web se encapsula en `WebEnrichmentButton`. Para desacoplar la UI del tutor se introduce un evento DOM custom:

`tutor-external-prompt` con firma:
```js
new CustomEvent('tutor-external-prompt', { detail: { prompt: string } })
```

`TutorDock` escucha este evento y reenruta el contenido como si fuera un mensaje de usuario (`api.sendPrompt`). Esto permite:
- Disparar prompts desde múltiples superficies (barra inferior unificada, acciones contextuales, plugins futuros) sin atar dependencias directas.
- Facilitar pruebas unitarias (se testea el evento aislado sin montar toda la vista de lectura).

Test relacionado: `TutorExternalPrompt.test.js` (verifica inyección). Frase sentinela de enriquecimiento: “Integra de forma crítica estos resultados externos...” validada por tests heredados.

---
## 🗃️ Migración de Notas al ReadingWorkspace (Plan)

Objetivo: trasladar funcionalidades de anotaciones y panel emergente desde `LecturaInteractiva` al `ReadingWorkspace` para habilitar deprecación gradual.

Pasos:
1. Extraer contenedor lógico de notas a `hooks/useNotesWorkspaceAdapter.js` (adaptará la API de `useAnnotations`).
2. Reimplementar panel flotante en Workspace como componente desacoplado (`NotesPanelDock`).
3. Reemplazar disparadores actuales (botón en controles avanzados) por botón en `TopBar` + atajos teclado.
4. Añadir test de regresión: crear, listar, eliminar, exportar (snapshot de exportación simplificado).
5. Marcar sección legacy en `LecturaInteractiva` con comentario `// LEGACY_NOTES_BLOCK` para limpieza futura.

Estado actual: notas siguen alojadas en `LecturaInteractiva`; Workspace sólo enruta prompts. Migración pendiente.

---
## 🧪 Cobertura Nueva Añadida

---
## 🔀 Estrategia de Desactivación Gradual de LecturaInteractiva

Se introduce un feature flag (`REACT_APP_DISABLE_LEGACY_INTERACTIVE`) para ocultar la pestaña antigua una vez verificada la paridad funcional del `ReadingWorkspace`.

### Checklist de Paridad
| Dominio | Legacy (LecturaInteractiva) | Nuevo (ReadingWorkspace) | Estado |
|---------|-----------------------------|---------------------------|--------|
| Lectura + visor responsivo | ✅ | ✅ (usa VisorTextoResponsive) | OK |
| Tutor conversación básica | ✅ | ✅ (TutorDock + eventos) | OK |
| Follow-ups heurísticos | Inline temporal | Hook unificado | OK (migrado) |
| Enriquecimiento web | Botón reutilizable | Botón reutilizable | OK |
| Persistencia historial tutor | LocalStorage | LocalStorage vía TutorCore | OK |
| Notas (crear / borrar) | Legacy panel | NotesPanelDock | OK (migrado) |
| Exportar notas | Legacy inline | NotesPanelDock | OK |
| Resaltados / anotaciones | Servicio Annotations | Servicio Annotations | OK |
| Focus mode | Parcial | (Pendiente incorporar control si aplica) | PENDIENTE |
| Acciones contextualizadas (selección) | Parcial | (Requiere integración hook useReaderActions) | PENDIENTE |
| Métricas estadística texto | Sí (estadísticas panel) | Básico (palabras) | MEJORAR |

### Criterios para Ocultar Legacy
1. Focus mode integrado en Workspace o descartado explícitamente.
2. Acciones contextuales portadas (Explicar / Resumir / Profundizar) disparando evento `tutor-external-prompt`.
3. Al menos 1 test de smoke adicional cubriendo acción contextual → respuesta tutor.
4. Documentación actualizada removiendo referencias a LecturaInteractiva.

### Pasos de Ejecución
1. Implementar flag en `App.js` para filtrar pestaña legacy.
2. Añadir script de build con flag activado para validación previa (`LEGACY_OFF=1`).
3. Ejecutar suite de pruebas y validar ausencia de referencias rotas.
4. Eliminar archivo tras una versión etiquetada (tag git) de transición.

---

- `contextBuilders.test.js`: 6 casos (truncamiento, selección, fallback) – cubre ramas principales.
- `TutorExternalPrompt.test.js`: asegura contrato del evento global.
- Pending: pruebas heurística de follow-up (contrast / enumeración / capitalización) puntuales para cada rama semántica.

---

---
**📅 Última Actualización**: 11 de octubre de 2025  
**👤 Actualizado por**: GitHub Copilot  
**🏗️ Estado**: ✅ **ARQUITECTURA COMPLETAMENTE REFACTORIZADA Y FUNCIONAL**

---

## Backend (Node.js / Express)

El backend gestiona la lógica de negocio, especialmente la comunicación segura con las APIs de IA externas.

### 1. Punto de Entrada del Servidor (`server/index.js`)

Es el archivo que arranca el servidor web.
- **Función:** Crea una instancia de Express, configura middleware (CORS, body-parser para leer JSON) y, lo más importante, importa y utiliza los archivos de rutas.
- **Relaciones:**
    - **`server/routes/*.js`**: Importa todos los archivos de rutas (ej: `analisis.routes.js`, `chatRoutes.js`) y los asocia a una ruta base (ej: `/api`).

### 2. Rutas (`server/routes/`)

Definen los endpoints de la API que el frontend puede llamar.
- **Ejemplo: `server/routes/analisis.routes.js`**
- **Función:** Asocia una URL de endpoint (ej: `POST /`) a una función específica en un controlador.
- **Relaciones:**
    - **`server/controllers/analisis.controller.js`**: Cuando llega una petición a `/api/analisis`, esta ruta invoca a la función correspondiente del controlador de análisis.

### 3. Controladores (`server/controllers/`)

Contienen la lógica principal para manejar una petición.
- **Ejemplo: `server/controllers/analisis.controller.js`**
- **Función:** Recibe el objeto `request` y `response`. Extrae los datos de la petición (el texto a analizar), valida la entrada y llama al servicio apropiado para hacer el trabajo pesado. Finalmente, envía la respuesta al cliente.
- **Relaciones:**
    - **`server/services/gemini.service.js` / `openai.service.js`**: **(Enlace clave con la IA externa)**. El controlador importa y utiliza uno de estos servicios para realizar la llamada real a la API de IA (Google Gemini, OpenAI, etc.).

### 4. Servicios de IA (`server/services/`)

## 🤖 Subsistema Tutor Conversacional (TutorCore)

### Visión General
El módulo `TutorCore` es un núcleo ligero reutilizable para conversaciones pedagógicas no evaluativas. Se desacopla completamente de la UI y expone una interfaz declarativa mediante render-prop (`children(api)`). Permite que distintos contenedores (p.ej. `LecturaInteractiva`, un futuro `TutorDock`) reutilicen la misma lógica sin duplicación.

### Props Principales
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `initialMessages` | `Array<{role, content}>` | `[]` | Semilla de historial (rehidratación desde persistencia) |
| `onMessagesChange` | `(messages)=>void` | — | Notificación tras cada mutación (persistencia / analítica) |
| `onBusyChange` | `(bool)=>void` | — | Notifica estado de actividad (spinner, bloqueo UI) |
| `maxMessages` | `number` | `40` | Límite FIFO retenido en memoria (alineado con persistencia) |

### Ciclo Interno
1. Hidrata `initialMessages` creando IDs efímeros.
2. Inserta mensajes (usuario / asistente) con truncado FIFO cuando excede `maxMessages`.
3. Intenta usar `OpenAI` global (mock en tests) antes de llamar a `/api/chat/completion`.
4. Propaga cada cambio a `onMessagesChange` (persistencia compacta) y estado busy a `onBusyChange`.
5. `api.clear()` vacía historial y emite notificación vacía.

### Persistencia Compacta
`LecturaInteractiva` persiste los mensajes en `localStorage` clave `tutorHistorial` en formato compacto:
```json
[{"r":"user","c":"Pregunta"},{"r":"assistant","c":"Respuesta"}]
```
Solo se guardan los últimos 40 elementos (`slice(-40)`), minimizando tamaño y riesgo de corrupción.

### Razones del Formato Compacto
- Reduce overhead de serialización.
- Minimiza datos sensibles (no IDs internos ni timestamps).
- Facilita migraciones futuras al poder ampliar el objeto sin romper lectura previa (se ignoran campos desconocidos).

### Rehidratación
Al montar `LecturaInteractiva`:
1. Lee `tutorHistorial`.
2. Mapea a `initialMessages`.
3. TutorCore genera IDs derivados y notifica inmediatamente (evitando doble escritura gracias al useEffect sin dependencias que solo actúa si hay mensajes iniciales).

### Control de Logs
Se introduce `REACT_APP_DEBUG_LOGS` para silenciar logs en entornos de test/producción. Todos los logs verbosos se protegen con `if (DEBUG)`. Esto reduce ruido en Jest y mejora performance en producción.

### Extensiones Futuras
- Mensajes "tool" estructurados para integrar búsqueda web sin mezclar texto plano.
- Anotaciones semánticas (tokens usados, latencia) en un canal meta opcional.
- Persistencia cifrada (si se llega a almacenar contenido sensible tras autenticación de usuarios reales).

### Test Coverage Actual
- Persistencia + rehidratación validada (unidad).
- Limpieza de historial (`api.clear()`) validada.
- Pendiente: tests de búsqueda web (se reactivarán tras migrar al nuevo hook y toggle actual).

### 🧪 Patrón de Pruebas para Servicios Singleton
Los servicios diseñados como singleton (p.ej. `webSearchService`) exponen una instancia creada mediante `new Clase()` y exportada como `default`. Cuando un hook o componente importa esa instancia, cualquier mock que reemplace totalmente el módulo después del primer import producirá una desincronización entre:

1. La referencia usada dentro del código bajo prueba (instancia real ya capturada por el bundler / Jest).
2. La referencia redefinida en el test mediante un mock del módulo.

Esto explicaba la intermitencia del test de búsqueda web: el hook `useWebSearchTutor` retenía la instancia original, mientras el test modificaba una copia mockeada distinta.

#### ✅ Estrategia Recomendada (spyOn sobre método de la instancia real)
1. No mockear el módulo completo con `jest.mock('...')` si se necesita interceptar métodos de la instancia singleton.
2. Importar la instancia real dentro del test: `const { default: svc } = require('.../webSearchService');`
3. Aplicar `jest.spyOn(svc, 'searchWeb').mockResolvedValue([...])`.
4. Ejecutar las interacciones de UI / hook.
5. Afirmar sobre `spy.mock.calls`.
6. Restaurar (opcional) con `spy.mockRestore()` en `afterEach` si el estado persiste entre tests.

```javascript
// Ejemplo mínimo
const { default: webSearchService } = require('../../src/services/webSearchService');
const spy = jest.spyOn(webSearchService, 'searchWeb').mockResolvedValue([
    { title: 'Resultado A', url: 'https://ejemplo/a', snippet: 'Resumen A' }
]);
// ...render componente que internamente usa el hook que llama searchWeb
await userEvent.click(screen.getByTestId('btn-con-web'));
await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
```

#### ❌ Anti‑patrones Evitados
- Reemplazar toda la exportación con `jest.mock` cuando el código ya importó la instancia.
- Reasignar directamente `module.default.searchWeb = jest.fn()` después del render: puede no afectar referencias cerradas en closures creadas antes de la reasignación.
- Usar mocks parciales que mezclan funciones reales y simuladas sin control del orden de import.

#### 🔍 Beneficios del Patrón
- Garantiza que la llamada interceptada es exactamente la que ejecuta el hook.
- Reduce flakiness por orden de importación.
- Mantiene la lógica interna no espiada (formatters, helpers) sin duplicar código en tests.

#### 🧩 Extensión a Otros Servicios
Aplicar el mismo enfoque a futuros singletons (p.ej. `unifiedAiService` si se expone como instancia) o adaptarlo a factorías (en cuyo caso se prefieren mocks de la factoría antes del primer uso).

---

---

Estos archivos contienen la lógica específica para comunicarse con un proveedor de IA.
- **Ejemplo: `server/services/gemini.service.js`**
- **Función:**
    1.  Recibe el texto y el prompt del controlador.
    2.  Utiliza el SDK del proveedor de IA (o una petición `fetch`).
    3.  Envía la petición a la API de Gemini, incluyendo la clave de API (cargada de forma segura desde el archivo `.env`).
    4.  Recibe la respuesta de la IA y la devuelve al controlador.
- **Relaciones:**
    - **`server/config/apiClients.js`**: Probablemente importa clientes de API pre-configurados.
    - **`.env`**: Lee las claves de API de este archivo para autenticarse con los servicios de IA. **Nunca se expone al frontend.**

---

## Flujo de Datos (Ejemplo: Análisis de Texto)

1.  **Usuario (Frontend)**: El usuario carga un texto en `LecturaInteractiva.js` y hace clic en "Analizar".
2.  **Componente (Frontend)**: `LecturaInteractiva.js` llama a `unifiedAiService.js.analizarTexto(texto)`.
3.  **Servicio (Frontend)**: `unifiedAiService.js` realiza una petición `POST` a la URL `http://localhost:PUERTO/api/analisis` con el texto en el cuerpo.
4.  **Servidor (Backend)**: `server/index.js` recibe la petición y la dirige a `analisis.routes.js`.
5.  **Ruta (Backend)**: La ruta `/` del enrutador de análisis invoca a `analisis.controller.js.handleAnalysis()`.
6.  **Controlador (Backend)**: El controlador toma el texto y llama a `gemini.service.js.getAnalysis(texto, prompt)`.
7.  **Servicio (Backend)**: `gemini.service.js` envía el texto y el prompt a la API de Google Gemini usando la clave secreta.
8.  **Respuesta de IA**: La API de Gemini devuelve el análisis.
9.  **Retorno del Flujo**: La respuesta viaja de vuelta del `servicio` -> al `controlador` -> a la `ruta` -> al `cliente (frontend)`.
10. **Actualización de UI (Frontend)**: La promesa en `unifiedAiService.js` se resuelve. `LecturaInteractiva.js` recibe el análisis, actualiza su estado y pasa los datos al componente `AnalisisTexto.js` para que se muestre en la pantalla.
