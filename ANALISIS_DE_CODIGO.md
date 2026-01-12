# Registro de Análisis de Código - AppLectura

## 1. Análisis de `src/App.js` (Orquestador Principal)

### ✅ Puntos Fuertes
- **Arquitectura de Providers:** Jerarquía robusta (`ErrorBoundary` → `AuthProvider` → `AppContextProvider` → `PedagogyProvider`).
- **Optimización:** Uso correcto de `React.lazy` y `Suspense`.
- **Gestión de Roles:** Clara distinción entre vistas de Docente y Estudiante.

### ⚠️ Hallazgos y Deuda Técnica

#### 1. Race Condition en Análisis Automático
- **Ubicación:** `handleSelectText` (Línea ~499).
- **Problema:** Uso de `setTimeout` para esperar actualización de estado antes de llamar a `analyzeDocument`.
- **Riesgo:** Comportamiento impredecible en dispositivos lentos.
- **Solución Propuesta:** Pasar el contenido directamente a la función o usar `useEffect`.

#### 2. Código Muerto
- **Ubicación:** Línea ~538.
- **Detalle:** Variable `const pestanas = [];` declarada pero no utilizada.

#### 3. Gestión de Estado vs Eventos DOM
- **Problema:** Mezcla de estado de React (`focusMode`) con listeners de eventos imperativos (`window.addEventListener`).
- **Riesgo:** Desincronización de estado y dificultad de mantenimiento.

#### 4. Navegación (Falso Routing)
- **Detalle:** Uso de estado `vistaActiva` en lugar de rutas reales.
- **Impacto:** Imposibilidad de compartir enlaces directos a secciones específicas.

---

## 3. 📖 `src/components/ReadingWorkspace.js` y Tutor (Lectura Guiada)

### ✅ Puntos Fuertes
*   **Pedagogía Avanzada:** `TutorCore.js` implementa lógica de ZDP (Zona de Desarrollo Próximo) y detección de nivel Bloom.
*   **Rendimiento:** `VisorTexto_responsive.js` utiliza virtualización (`react-virtuoso`) para manejar textos largos eficientemente.
*   **Diseño Socrático:** El prompt del sistema está diseñado para guiar sin dar respuestas directas.

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 Alta | **Seguridad (XSS)** | `TutorDock.js` (L16-50) | Parser de Markdown manual basado en Regex. Propenso a errores y XSS. | Usar librería segura como `react-markdown` o `dompurify`. |
| 🟡 Media | **Mala Práctica (Bundling)** | `TutorCore.js` (L4-25) | Uso de `require` dentro de `try/catch` en módulo ES6. | Usar `import` estático y mockear en tests, o `React.lazy`. |
| 🟡 Media | **Estado "Esqueleto"** | `ReadingWorkspace.js` | Comentario indica que es un "Esqueleto" y no sustituye completamente la versión anterior. | Verificar paridad de funcionalidades con `LecturaInteractiva`. |
| 🟢 Baja | **Deuda Técnica (Wrapper)** | `VisorTexto.js` | Wrapper legacy para mantener compatibilidad con tests antiguos. | Actualizar tests y eliminar wrapper, usando `VisorTexto_responsive` directamente. |
| 🟢 Baja | **Accesibilidad** | `TutorDock.js` | El manejador de redimensionamiento no es accesible por teclado. | Implementar controles de teclado o botones de tamaño predefinido. |

---

## 4. 📥 `src/components/CargaTexto_responsive.js` (Ingesta de Datos)

### ✅ Puntos Fuertes
*   **Resiliencia:** Estrategia de fallback robusta para PDFs (Backend -> Fallback Local).
*   **UX:** Implementación clara de Drag & Drop y feedback visual.
*   **Seguridad:** Validaciones de tipo y tamaño de archivo antes del procesamiento.

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 Alta | **Duplicación de Lógica** | L330-380 | La lógica de fallback para procesar PDF se repite 3 veces casi idéntica. | Extraer a función auxiliar `analizarEstructura(file, text)`. |
| 🟡 Media | **Logs en Producción** | Todo el archivo | Exceso de `console.log` revelando flujo interno. | Implementar logger condicional que se silencie en producción. |
| 🟡 Media | **Responsabilidad Confusa** | `handleSubmit` | Llamada a `analyzeDocument` duplicada conceptualmente con `App.js`. | Unificar el disparador del análisis en un solo lugar (ej. en el Context al cambiar `texto`). |
| 🟢 Baja | **Redundancia de Estado** | `archivoFuente` vs `archivoSeleccionado` | Dos estados para datos del archivo que podrían unificarse. | Refactorizar a un solo objeto de estado. |

---

## 5. 🧠 `src/components/PreLectura.js` y Backend (Análisis Profundo)

### ✅ Puntos Fuertes
*   **Robustez (Backend):** Implementación de `tryRepairJSON` basada en pila para recuperar respuestas JSON truncadas de la IA.
*   **Optimización (Frontend):** Caché en `localStorage` para el glosario generado, reduciendo llamadas a API.
*   **Debug:** Sistema de logging dedicado en backend (`debug_analysis.log`).

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 Alta | **Bloqueo de Event Loop** | `preLectura.controller.js` | Uso de `fs.appendFileSync` (síncrono) para logs en cada request. | Usar `fs.appendFile` o librería de logging asíncrona (`winston`). |
| 🟡 Media | **Código Mock en Prod** | `src/components/AnalisisTexto.js` | Archivo que contiene solo un componente Mock de tests. | Eliminar archivo o mover a `__mocks__`. |
| 🟡 Media | **Duplicación de Utilidad** | `preLectura.controller.js` | Lógica de reparación JSON hardcodeada en el controlador. | Extraer a `server/utils/jsonRepair.js` para reutilizar en otros controladores. |
| 🟢 Baja | **Hashing Débil** | `PreLectura.js` (L47) | Uso de `btoa` para generar keys de caché. | Usar función de hash simple (DJB2) o `crypto.subtle`. |

---

## 6. 🎯 `src/components/Actividades.js` y Artefactos (El Núcleo Pedagógico)

### 🏗️ Arquitectura y Flujo de Trabajo
El módulo de actividades implementa un flujo secuencial estricto: **Preparación (Bloqueante) → Artefactos Académicos → Progreso**.

#### 1. Mecanismo de Bloqueo ("Preparación")
*   **Implementación:** `Actividades.js` verifica `preparacionCompletada` (derivado de `AppContext`).
*   **Seguridad:** Un `useEffect` redirige forzosamente a la pestaña 'preparacion' si se intenta acceder a otros artefactos sin cumplir el requisito.
*   **Comunicación:** Depende del evento del DOM `exercises-completed` para desbloquear.
    *   ⚠️ **Riesgo:** El uso de eventos del DOM (`window.dispatchEvent`) para comunicación entre componentes React hermanos es un anti-patrón frágil. Debería usarse una función del Contexto (`markPreparationAsComplete`).

#### 2. Análisis de Artefactos Específicos

| Artefacto | Propósito | Estado Técnico | Hallazgos |
| :--- | :--- | :--- | :--- |
| **Preparación** | Prerrequisito de desbloqueo. | `PreguntasPersonalizadas.js` | Combina MCQ y Síntesis. La lógica de completitud es opaca (depende de eventos internos). |
| **Resumen Académico** | Rúbrica 1: Comprensión. | `ResumenAcademico.js` | ✅ Buen uso de `sessionStorage` para backups. ✅ Atajos de teclado (`Ctrl+S`). ⚠️ Duplicación de lógica de persistencia. |
| **Tabla ACD** | Rúbrica 2: Análisis Discurso. | `TablaACD.js` | ✅ Accesibilidad avanzada. ⚠️ Código visual (Styled Components) duplicado con otros artefactos. |
| **Mapa de Actores** | Rúbrica 3: Contextualización. | `MapaActores.js` | ⚠️ Copia casi exacta de TablaACD. Falta soporte de teclado que sí tiene la Tabla. |
| **Respuesta Arg.** | Rúbrica 4: Argumentación. | `RespuestaArgumentativa.js` | ⚠️ Mismo problema de duplicación de código (DRY). |
| **Bitácora Ética** | Rúbrica 5: Metacognición. | `BitacoraEticaIA.js` | ✅ Innovador: Rastrea interacciones con el tutor. ⚠️ Dependencia frágil de eventos `window` para el log. |

### ⚠️ Deuda Técnica Crítica en esta Sección

#### 1. Violación Masiva de DRY (Don't Repeat Yourself)
*   **Problema:** `TablaACD`, `MapaActores` y `RespuestaArgumentativa` comparten +80% de código (estilos, layout, lógica de guías).
*   **Solución:** Crear un componente `ActivityShell` o `ArtefactoLayout` que encapsule el Header, las Guías Desplegables y el Feedback, recibiendo el contenido específico como `children`.

#### 2. Inconsistencia en Persistencia
*   **Problema:** `ResumenAcademico` usa `sessionStorage` explícitamente para borradores, mientras otros artefactos confían ciegamente en `useActivityPersistence`.
*   **Riesgo:** Experiencia de usuario inconsistente. Si recargo en el Resumen, se guarda. Si recargo en el Mapa de Actores, podría perder datos si el hook no sincronizó a tiempo.

#### 3. Gestión de Estado por Eventos
*   **Problema:** `Actividades.js` escucha `exercises-completed` y `progress-synced-from-cloud`.
*   **Mejora:** Centralizar toda esta lógica en `PedagogyContext` y exponer estados reactivos simples (`isUnlocked`, `progress`).

---

## 7. 📝 `src/components/notas/NotasEstudioRefactorizado.js` (Notas de Estudio)

### ✅ Puntos Fuertes
*   **Refactorización Exitosa:** Wrapper limpio que delega al componente refactorizado.
*   **Integración de Fases:** Aprovecha `completeAnalysis` para generar notas más ricas.
*   **Backend Agnóstico:** Soporta OpenAI, DeepSeek y Gemini con validación Zod.

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🟡 Media | **Estilos en Línea** | `NotasEstudioRefactorizado.js` (L80-150) | Uso de objetos `style={{}}` en lugar de `styled-components`. | Migrar a `styled-components` para consistencia. |
| 🟡 Media | **Uso de `window.innerWidth`** | Renderizado (L95, L115) | Detección de ancho directamente en render, causa parpadeos. | Usar hook `useWindowSize` o media queries CSS. |

---

## 8. ✅ `src/components/SistemaEvaluacion.js` (Evaluación Final)

### ✅ Puntos Fuertes
*   **Accesibilidad:** Uso explícito de `announceToScreenReader`, `SkipNavigation`.
*   **Resiliencia:** Implementa `generarConRetry` y `evaluarConRetry` para reintentos automáticos.
*   **Feedback Visual:** Sistema de colores semánticos basado en puntuación.

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 Alta | **God Component** | `SistemaEvaluacion.js` (1157 líneas) | Archivo demasiado grande, difícil de mantener. | Extraer lógica a `useEvaluationSystem` hook y dividir UI. |
| 🟡 Media | **Dashboards Duplicados** | `DashboardRubricas.js` + `EnhancedDashboard` | Dos componentes con nombres similares. | Verificar cuál es el "bueno" y eliminar el otro. |
| 🟡 Media | **Umbrales Hardcodeados** | `DashboardRubricas.js` (L33, L55, L80) | Colores de puntuación (8.6, 5.6, 2.6) repetidos 3 veces. | Centralizar en `src/config/gradingScale.js`. |

---

## 9. 🎮 Sistema de Gamificación (`rewardsEngine.js`)

### ✅ Puntos Fuertes
*   **Alineación Pedagógica:** Puntos basados en Taxonomía de Bloom y ACD.
*   **Incentivos de Hábito:** Multiplicadores por racha diaria.
*   **Logros:** Hitos pedagógicos claros ("Pensador Crítico", "Maestro ACD").

### ⚠️ Hallazgos y Deuda Técnica

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| 🟡 Media | **Instancia Global en `window`** | `PedagogyContext.js` (L32) | `window.__rewardsEngine` es manipulable desde consola del navegador. | Aceptar como sistema de honor o mover validación a Cloud Functions. |
| 🟡 Media | **Validación Solo en Cliente** | `rewardsEngine.js` | Todo el cálculo de puntos ocurre en el cliente. | Documentar como limitación o implementar verificación server-side. |

---

## 10. 🔥 Sincronización Firebase vs LocalStorage (CRÍTICO)

### 🏗️ Arquitectura Actual
La aplicación mantiene **TRES sistemas de almacenamiento** que compiten:
1. **`localStorage`** - Usado en `AppContext.js` para rubricProgress, savedCitations, activitiesProgress.
2. **`sessionStorage`** - Usado en artefactos para borradores temporales.
3. **Firebase Firestore** - Persistencia cloud vía `firestore.js` y `sessionManager.js`.

### ✅ Puntos Fuertes (Validados)
*   **Listener de Sincronización Implementado:** `AppContext.js` (L1480) usa `subscribeToStudentProgress` para escuchar cambios de Firestore en tiempo real.
*   **Merge Inteligente (Parcial):** Estrategia "score más alto gana, timestamp como desempate" implementada en el listener.
*   **Validación de Sesiones:** `sessionValidator.js` sanitiza sesiones antes de guardar.

### ⚠️ Hallazgos Críticos (Validados)

| Prioridad | Problema | Ubicación | Descripción | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| ✅ Resuelto | **~~Merge de Scores Incorrecto~~** | `firestore.js` + `AppContext.js` | ~~El merge reemplazaba rúbricas completas por timestamp, perdiendo historial de scores.~~ | ✅ Implementado merge que CONCATENA scores únicos por timestamp y recalcula promedio. |
| ✅ Resuelto | **~~Dos SessionManagers Confusos~~** | `firebase/sessionManager.js` + `services/sessionManager.js` | ~~Nombres casi idénticos causaban confusión.~~ | ✅ Agregados bloques JSDoc extensos que explican propósito, diferencias y uso típico de cada uno. |
| 🟡 Media | **Heartbeat Costoso** | `firebase/sessionManager.js` (L155) | Escritura cada 30 segundos por usuario activo. Con 40 estudiantes = 80 escrituras/minuto. | Aumentar intervalo a 60-120s o usar Realtime Database para presencia. |
| 🟡 Media | **Migración Legacy Desactivada** | `services/sessionManager.js` (L65) | Código de migración de datos antiguos está comentado. Usuarios pre-actualización pueden haber perdido datos. | Rehabilitar con detección segura de usuario o documentar como breaking change. |
| 🟡 Media | **Inconsistencia Local vs Cloud** | `AppContext.js` | `rubricProgress` se inicializa desde localStorage, pero el listener de Firestore puede traer datos diferentes segundos después. | Mostrar indicador de "Sincronizando..." mientras se resuelve. |

### 🔄 Flujo de Datos Actual (Diagrama)
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   localStorage  │◄────►│   React State   │◄────►│    Firestore    │
│  (Inmediato)    │      │   (AppContext)  │      │  (Async Cloud)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │   useEffect: Load      │  subscribeToStudent    │
        ├───────────────────────►│  Progress (L1480)      │
        │                        │◄───────────────────────┤
        │   useEffect: Save      │  saveStudentProgress   │
        │◄───────────────────────┤  (debounced 2s)        │
        │                        ├───────────────────────►│
        │                        │                        │
```

### 📋 Recomendación de Refactorización
1. **Fuente de Verdad Única:** Tratar Firestore como la fuente de verdad. localStorage solo como caché offline.
2. ✅ **~~Merge de Scores:~~** ~~Cambiar `saveStudentProgress` para concatenar scores con `arrayUnion` de Firestore.~~ → **IMPLEMENTADO:** Ahora concatena scores únicos por timestamp tanto en `firestore.js` como en el listener de `AppContext.js`.
3. ✅ **~~Renombrar SessionManagers:~~** ~~Distinguir claramente entre autenticación y sesiones de trabajo.~~ → **IMPLEMENTADO:** Agregados bloques JSDoc extensos con propósito, diferencias, estructura de datos y uso típico en cada archivo.
4. ✅ **~~Progreso Visible para Docente:~~** ~~Fix de sincronización entre estudiante y dashboard del docente.~~ → **IMPLEMENTADO:** (7 dic 2025) `saveStudentProgress` ahora preserva `sourceCourseId`, calcula campos esperados por `getCourseMetrics` (`porcentaje`, `score`, `estado`), y usa `currentTextoId` en lugar de `global_progress`.
5. ✅ **~~Smart Resume de Análisis:~~** ~~Caché del análisis al volver a "Mis Cursos".~~ → **IMPLEMENTADO:** (7 dic 2025) Sistema de búsqueda exhaustiva con 3 estrategias, propagación correcta de `textoId` desde curso, y restauración de `currentTextoId` en sesiones.
6. **Indicador de Sincronización:** Mostrar estado de sync en la UI para que el usuario sepa si sus datos están seguros.
7. **Optimizar Heartbeat:** Considerar aumentar intervalo de 30s a 60-90s para reducir costos de Firebase (actualmente ~4,800 escrituras/hora con 40 usuarios).

---

## 11. 🔗 ANÁLISIS INTEGRAL: Cadena Completa de Actividades y su Relación con el Sistema

### 📊 Arquitectura del Flujo Pedagógico

La sección "Actividades" implementa un flujo secuencial bloqueante con 7 eslabones interconectados:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE ACTIVIDADES - CADENA COMPLETA                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌───────────────────────────────────────────────────────────────┐
│   ANÁLISIS  │───►│                     PREPARACIÓN (GATE)                        │
│   PREVIO    │    │  ┌─────────────┐    ┌──────────────────┐                      │
│ completeAna │    │  │ MCQExercise │───►│SynthesisQuestions│──── 🔓 DESBLOQUEA ──►│
│ lysis.meta  │    │  │ (5 MCQ)     │    │ (2 reflexiones)  │                      │
│ data.docId  │    │  │ ≥60% pass   │    │ 100-150 palabras │                      │
└─────────────┘    │  └─────────────┘    └──────────────────┘                      │
                   └───────────────────────────────────────────────────────────────┘
                                              │
                   ┌──────────────────────────┴──────────────────────────┐
                   ▼                                                      ▼
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                         ARTEFACTOS FORMALES (5 RÚBRICAS)                     │
    │                                                                              │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
    │  │ 📚 Resumen      │  │ 🔍 Tabla ACD    │  │ 🗺️ Mapa Actores │              │
    │  │ Académico       │  │ Análisis del    │  │ Contextualiza-  │              │
    │  │ RÚBRICA 1       │  │ Discurso        │  │ ción Social     │              │
    │  │ 1490 líneas     │  │ RÚBRICA 2       │  │ RÚBRICA 3       │              │
    │  └───────┬─────────┘  │ 1404 líneas     │  │ 1316 líneas     │              │
    │          │            └───────┬─────────┘  └───────┬─────────┘              │
    │          │                    │                    │                        │
    │  ┌───────▼─────────┐  ┌───────▼─────────┐          │                        │
    │  │ 💭 Respuesta    │  │ 🤖 Bitácora     │◄─────────┘                        │
    │  │ Argumentativa   │  │ Ética IA        │                                   │
    │  │ RÚBRICA 4       │  │ RÚBRICA 5       │                                   │
    │  │ ~1300 líneas    │  │ 1408 líneas     │                                   │
    │  └───────┬─────────┘  └───────┬─────────┘                                   │
    │          │                    │                                             │
    └──────────┴────────────────────┴─────────────────────────────────────────────┘
                                    │
                                    ▼
                   ┌────────────────────────────────────┐
                   │  📊 MI PROGRESO (ProgressStats)   │
                   │  - Dashboard de rúbricas          │
                   │  - Exportación CSV/JSON           │
                   │  - Reset de progreso              │
                   └────────────────────────────────────┘
```

---

### 🔍 ESLABÓN 1: Preparación (Gate de Desbloqueo)

#### Componentes Involucrados
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `PreguntasPersonalizadas.js` | 522 | Orquestador de la preparación |
| `MCQExercise.js` | 513 | 5 preguntas opción múltiple (Bloom 1-3) |
| `SynthesisQuestions.js` | 429 | 2 preguntas de síntesis (100-150 palabras) |

#### Flujo de Datos
```javascript
// Origen de las preguntas (del análisis previo)
const mcqQuestions = completeAnalysis?.critical?.mcqQuestions || [];
const synthesisQuestions = completeAnalysis?.critical?.synthesisQuestions || [];

// Verificación de estado de preparación
const preparacionCompletada = documentId 
    ? activitiesProgress?.[documentId]?.preparation?.completed || false
    : false;
```

#### ⚠️ Problema: Dependencia de Análisis Previo
*   **Hallazgo:** Si `completeAnalysis.critical.mcqQuestions` está vacío (error del análisis IA), la preparación queda inoperativa.
*   **Ubicación:** `PreguntasPersonalizadas.js` L331-350
*   **Impacto:** Usuario ve "No se generaron preguntas de preparación" sin alternativa.
*   **Solución Propuesta:** Implementar generación bajo demanda con botón "Regenerar Preguntas".

#### ⚠️ Problema: Eventos DOM para Comunicación
```javascript
// PreguntasPersonalizadas.js L269
window.dispatchEvent(new CustomEvent('exercises-completed', {
  detail: { mcqResults, synthesisAnswers: answers }
}));

// Actividades.js L318 (receptor)
window.addEventListener('exercises-completed', handleExercisesCompleted);
```
*   **Problema:** Comunicación entre componentes React hermanos vía `window.dispatchEvent` es anti-patrón frágil.
*   **Riesgo:** Si el listener no está montado cuando se dispara el evento, se pierde.
*   **Solución:** Usar `markPreparationProgress(documentId, { completed: true })` directamente desde `PreguntasPersonalizadas`.

---

### 🔍 ESLABONES 2-6: Artefactos Formales (Las 5 Rúbricas)

#### Mapeo de Artefactos a Rúbricas
| Pestaña | Componente | Rúbrica | Dimensión de Literacidad Crítica |
|---------|------------|---------|----------------------------------|
| Resumen Académico | `ResumenAcademico.js` | `rubrica1` | Comprensión Analítica |
| Análisis del Discurso | `TablaACD.js` | `rubrica2` | Análisis Crítico del Discurso |
| Mapa de Actores | `MapaActores.js` | `rubrica3` | Contextualización Socio-Histórica |
| Respuesta Argumentativa | `RespuestaArgumentativa.js` | `rubrica4` | Producción Argumentativa |
| Bitácora Ética IA | `BitacoraEticaIA.js` | `rubrica5` | Metacognición Ética |

#### Flujo de Evaluación (Común a todos)
```javascript
// 1. Usuario escribe/completa artefacto
// 2. Click en "Evaluar"
const handleEvaluar = async () => {
    const result = await evaluarResumenAcademico({ resumen, textoOriginal: texto });
    
    // 3. Actualizar progreso de rúbrica en contexto global
    updateRubricScore('rubrica1', {
        score: result.scoreGlobal,
        nivel: result.nivel,
        artefacto: 'ResumenAcademico',
        criterios: result.criteriosEvaluados
    });
    
    // 4. Registrar recompensas (gamificación)
    rewards.recordEvent('EVALUATION_SUBMITTED', { artefacto: 'ResumenAcademico', score: result.scoreGlobal });
};
```

#### 🔄 Flujo de Sincronización con Firebase
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Artefacto        │     │ AppContext       │     │ Firebase         │
│ (ej: Resumen)    │     │                  │     │ Firestore        │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │ updateRubricScore()    │                        │
         ├───────────────────────►│                        │
         │                        │                        │
         │                        │ setRubricProgress()    │
         │                        │ (actualiza state)      │
         │                        │                        │
         │                        │ useEffect trigger      │
         │                        │ localStorage.setItem() │
         │                        │                        │
         │                        │ 'artifact-evaluated'   │
         │                        │ event dispatched       │
         │                        │                        │
         │                        │ syncRubricProgress     │
         │                        │ ToFirestore()          │
         │                        ├───────────────────────►│
         │                        │                        │
         │                        │ saveStudentProgress()  │
         │                        │ (merge inteligente)    │
         │                        │                        │
```

#### ⚠️ Problema Crítico: Duplicación de Código entre Artefactos

**Análisis de Similitud de Código:**
| Artefacto | Styled Components | Guía Desplegable | Lógica de Validación | Rate Limiting | Persistencia |
|-----------|-------------------|------------------|---------------------|---------------|--------------|
| TablaACD | 35 componentes | ✅ Idéntica | Similar | Propio | useActivityPersistence |
| MapaActores | 33 componentes | ✅ Idéntica | Similar | Propio | useActivityPersistence |
| RespuestaArg | 31 componentes | ✅ Idéntica | Similar | Propio | useActivityPersistence |

**Código Duplicado Identificado:**
```javascript
// Aparece IDÉNTICO en TablaACD.js, MapaActores.js, RespuestaArgumentativa.js
const GuideSection = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const GuideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`;
// ... +20 componentes más idénticos
```

*   **Deuda Técnica:** ~800 líneas de código duplicado entre los 3 artefactos.
*   **Solución:** Crear `src/components/artefactos/ArtefactoLayout.js` que encapsule:
    - Header con título y descripción
    - Guía desplegable
    - Contenedor de formulario
    - Panel de feedback/evaluación
    - Botones de acción comunes

---

### 🔍 ESLABÓN 7: Mi Progreso (Dashboard Final)

#### Componentes Involucrados
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `ProgressStats.js` | 436 | Visualización de progreso por rúbrica |
| `DashboardRubricas.js` | ~300 | Dashboard visual con navegación |
| `ExportProgressButton.js` | ~200 | Exportación CSV/JSON |

#### Flujo de Datos del Dashboard
```javascript
// ProgressStats.js - Lectura del rubricProgress
const stats = useMemo(() => {
    Object.entries(ARTEFACTO_CONFIG).forEach(([rubricId, config]) => {
        const data = rubricProgress[rubricId];
        if (data && data.scores && data.scores.length > 0) {
            const lastScore = data.scores[data.scores.length - 1];
            const highestScore = Math.max(...data.scores.map(s => s.score));
            // ... calcular métricas
        }
    });
}, [rubricProgress]);
```

#### ✅ RESUELTO: Ahora incluye las 5 Rúbricas
```javascript
// ProgressStats.js L215-235 (ACTUALIZADO)
const ARTEFACTO_CONFIG = {
  rubrica1: { name: 'Resumen Académico', icon: '📝', color: '#3190FC' },
  rubrica2: { name: 'Tabla ACD', icon: '📊', color: '#009688' },
  rubrica3: { name: 'Mapa de Actores', icon: '🗺️', color: '#FF9800' },
  rubrica4: { name: 'Respuesta Argumentativa', icon: '💭', color: '#E91E63' },
  rubrica5: { name: 'Bitácora Ética IA', icon: '🤖', color: '#9C27B0' }  // ✅ AGREGADO
};

// Cálculos actualizados:
const overallProgress = (totalCompleted / 5) * 100;  // Antes era /4
// UI: "X/5 dimensiones completadas"
```
*   ✅ **Impacto:** Bitácora Ética IA ahora aparece en el dashboard de progreso.
*   ✅ **Estado:** Completamente integrada con el flujo de `updateRubricScore('rubrica5', ...)`

---

### 🗄️ Persistencia y Firebase: Puntos de Integración

#### 1. Preparación → activitiesProgress (AppContext)
```javascript
// Guardado en PreguntasPersonalizadas.js L261
markPreparationProgress(documentId, {
  completed: true,
  mcqPassed: mcqResults?.passed || false,
  mcqResults,
  synthesisAnswers: answers
});

// Estructura en Firebase/localStorage:
activitiesProgress: {
  [documentId]: {
    preparation: {
      completed: true,
      mcqPassed: true,
      mcqResults: { correct: 4, total: 5, percentage: 80, passed: true },
      synthesisAnswers: { q1: "...", q2: "..." },
      updatedAt: 1733580000000
    }
  }
}
```

#### 2. Artefactos → rubricProgress (AppContext)
```javascript
// Guardado en cada artefacto
updateRubricScore('rubrica1', {
  score: 8.5,
  nivel: 4,
  artefacto: 'ResumenAcademico',
  criterios: { comprension: 9, sintesis: 8, citas: 8.5 }
});

// Estructura en Firebase/localStorage:
rubricProgress: {
  rubrica1: {
    scores: [
      { score: 7.2, nivel: 3, artefacto: 'ResumenAcademico', timestamp: 1733500000000 },
      { score: 8.5, nivel: 4, artefacto: 'ResumenAcademico', timestamp: 1733580000000 }
    ],
    average: 7.85,
    lastUpdate: 1733580000000,
    artefactos: ['ResumenAcademico']
  },
  // ... rubrica2-5
}
```

#### 3. Borradores → useActivityPersistence (localStorage + sessionStorage)
```javascript
// Cada artefacto usa este hook
const persistence = useActivityPersistence(documentId, {
  enabled: !!documentId,
  studentAnswers: { resumen },  // Texto del estudiante
  aiFeedbacks: { evaluacion },  // Feedback de IA
  onRehydrate: (data) => {
    // Restaurar estado al montar el componente
    if (data.student_answers?.resumen) setResumen(data.student_answers.resumen);
  }
});
```

---

### ⚠️ MATRIZ DE HALLAZGOS CONSOLIDADOS

| # | Prioridad | Componente | Problema | Impacto | Solución |
|---|-----------|------------|----------|---------|----------|
| 1 | 🔴 Alta | PreguntasPersonalizadas | Dependencia de MCQ/Síntesis del análisis | Si falla análisis, se bloquea flujo | Botón "Regenerar Preguntas" |
| 2 | 🔴 Alta | TablaACD/MapaActores/RespuestaArg | ~800 líneas duplicadas | Mantenimiento costoso | Crear `ArtefactoLayout.js` |
| 3 | ✅ Resuelto | ProgressStats | ~~Falta rubrica5 en config~~ | ~~Bitácora no aparece en progreso~~ | ✅ Agregado rubrica5 con icono 🤖 y color #9C27B0 |
| 4 | 🟡 Media | Actividades↔Preparación | Comunicación por eventos DOM | Evento puede perderse | Usar función de contexto directa |
| 5 | ✅ Resuelto | BitacoraEticaIA | ~~Ubicación inconsistente~~ | ~~En `/components/` en vez de `/artefactos/`~~ | ✅ Movido a `/artefactos/BitacoraEticaIA.js` |
| 6 | 🟡 Media | Todos los artefactos | Rate limiting propio en cada uno | Duplicación de lógica | Extraer hook `useEvaluationRateLimit` |
| 7 | 🟢 Baja | Actividades.js | Lazy loading con Suspense individual | Cada artefacto tiene su Spinner | Usar Suspense padre con fallback global |
| 8 | 🟢 Baja | ResumenAcademico | sessionStorage backup redundante | Ya tiene useActivityPersistence | Eliminar backup manual |

---

### 📋 RECOMENDACIONES DE REFACTORIZACIÓN PRIORIZADAS

#### Fase 1: Correcciones Críticas (Inmediato) ✅ COMPLETADA
1. ✅ **Agregar rubrica5 a ProgressStats.js** - Completado (icono 🤖, color #9C27B0, cálculos actualizados a /5)
2. ✅ **Mover BitacoraEticaIA.js a /artefactos/** - Completado (imports actualizados en Actividades.js y rutas internas)

#### Fase 2: Arquitectura (Corto Plazo)
1. **Crear `ArtefactoLayout.js`** - Componente base que reciba:
   ```jsx
   <ArtefactoLayout
     title="Resumen Académico"
     icon="📚"
     color="#3190FC"
     rubricId="rubrica1"
     guideQuestions={[...]}
     evaluationService={evaluarResumenAcademico}
   >
     {/* Contenido específico del artefacto */}
     <ResumenForm onSubmit={handleSubmit} />
   </ArtefactoLayout>
   ```

2. **Extraer hooks comunes:**
   - `useEvaluationRateLimit(artifactId)` - Rate limiting unificado
   - `useArtifactPersistence(documentId, rubricId)` - Persistencia con sync automático

#### Fase 3: Comunicación (Mediano Plazo)
1. **Eliminar eventos DOM** y usar funciones de contexto:
   ```javascript
   // En vez de window.dispatchEvent
   const { markPreparationComplete, notifyArtifactEvaluated } = useContext(AppContext);
   markPreparationComplete(documentId);
   ```

2. **Unificar estado de progreso** en `PedagogyContext`:
   ```javascript
   const { isPreparationComplete, rubricProgress, overallProgress } = usePedagogy();
   ```

---

## 12. 🔧 FIXES IMPLEMENTADOS: Flujo Estudiante-Docente (7 Diciembre 2025)

### 🎯 Problemas Críticos Resueltos

#### Problema 1: Progreso de Estudiantes No Visible para Docente ✅ RESUELTO

**Causa Raíz Identificada:**
- `saveStudentProgress` guardaba en `students/{uid}/progress/{textoId}` pero **sin** `sourceCourseId`
- `getCourseMetrics` buscaba documentos con `where('sourceCourseId', '==', courseId)`
- Los documentos nunca coincidían porque faltaba el campo de búsqueda

**Solución Implementada (firestore.js L313-340):**
```javascript
// 🆕 CRÍTICO: Preservar sourceCourseId si existe en documento original
...(existingData.sourceCourseId && { sourceCourseId: existingData.sourceCourseId }),

// 🆕 CRÍTICO: Calcular campos que espera getCourseMetrics
score: promedio_global,           // Alias para compatibilidad
ultimaPuntuacion: promedio_global, // Alias legacy
porcentaje,                        // Calculado de rúbricas completadas
progress: porcentaje,              // Alias
avancePorcentaje: porcentaje,     // Alias legacy
estado,                            // 'completed', 'in-progress', 'pending'
```

**Impacto:**
- ✅ Dashboard del docente ahora muestra correctamente el progreso de estudiantes
- ✅ Métricas del curso calculan promedios reales basados en rúbricas completadas
- ✅ Estados de completitud reflejan el avance real (pending → in-progress → completed)

---

#### Problema 2: Análisis No Se Cachea al Volver a "Mis Cursos" ✅ RESUELTO

**Causa Raíz Identificada:**
- El `textoId` del curso no se propagaba correctamente al crear sesiones
- Sistema Smart Resume buscaba sesiones con mapeo inconsistente
- `restoreSession` no restauraba el `currentTextoId`

**Solución Implementada (3 partes):**

**Parte A: Propagación de textoId (TextoSelector.js L392)**
```javascript
onSelectText(contenido, { 
  id: docSnap.id, 
  textoId: textoLite.textoId, // 🆕 ID del curso propagado
  ...docData, 
  archivoInfo 
});
```

**Parte B: Smart Resume Mejorado (TextoSelector.js L295-340)**
```javascript
// Estrategia 1: Mapa precargado (rápido)
existingSession = localSessionsMap[textoLite.textoId];

// Estrategia 2: Búsqueda por título (fallback)
existingSession = localSessionsMap[textoLite.titulo];

// Estrategia 3: Búsqueda exhaustiva con múltiples ubicaciones
const sessionTextoId = 
  s.text?.metadata?.id || 
  s.text?.textoId || 
  s.textMetadata?.id ||
  s.currentTextoId; // Nueva ubicación
```

**Parte C: Restauración de currentTextoId (sessionManager.js L502-508)**
```javascript
// 🆕 Restaurar ID del texto para coherencia con curso
if (session.text?.metadata?.id && contextSetters.setCurrentTextoId) {
  contextSetters.setCurrentTextoId(session.text.metadata.id);
}
```

**Impacto:**
- ✅ Estudiantes que vuelven a una lectura NO esperan 1-2 minutos nuevamente
- ✅ El análisis IA se recupera de la sesión guardada automáticamente
- ✅ Progreso y borradores de artefactos se restauran instantáneamente

---

#### Problema 3: syncRubricProgressToFirestore Usaba Siempre 'global_progress' ✅ RESUELTO

**Solución Implementada (AppContext.js L550):**
```javascript
// 🆕 CRÍTICO: Usar el ID del texto actual para que el docente pueda verlo
// Si no hay texto actual, se usa 'global_progress' (fallback)
const targetTextoId = currentTextoId || 'global_progress';

await saveGlobalProgress(progressData, { textoId: targetTextoId });
```

**Impacto:**
- ✅ Progreso de rúbricas se guarda en el documento correcto del curso
- ✅ Dashboard del docente puede leer el progreso con la query de `sourceCourseId`
- ✅ Mantiene compatibilidad con análisis libres (usa 'global_progress' si no hay curso)

---

### 📊 Flujo Completo Corregido: Estudiante → Firestore → Docente

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ESTUDIANTE: Completa Artefacto (ej: Resumen Académico - Rúbrica 1)     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                    updateRubricScore('rubrica1', {...})
                                 │
                                 ▼
                    ┌────────────────────────────────┐
                    │ AppContext.setRubricProgress() │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼──────────────────────────────────┐
                    │ event 'artifact-evaluated' dispatched        │
                    │ → syncRubricProgressToFirestore('rubrica1')  │
                    └────────────┬──────────────────────────────────┘
                                 │
                    ┌────────────▼──────────────────────────────────┐
                    │ saveGlobalProgress({                          │
                    │   rubricProgress: { rubrica1: {...} }         │
                    │ }, { textoId: currentTextoId })  ✅ NO 'global'│
                    └────────────┬──────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────────────────┐
                    │ firestore.saveStudentProgress()            │
                    │ Path: students/{uid}/progress/{textoId} ✅ │
                    │                                            │
                    │ Datos guardados:                           │
                    │ - sourceCourseId: "curso_123" ✅ PRESERVADO│
                    │ - rubricProgress: { rubrica1: {...} }      │
                    │ - porcentaje: 20 (1/5 rúbricas) ✅ NUEVO   │
                    │ - score: 8.5 (promedio_global) ✅ NUEVO    │
                    │ - estado: "in-progress" ✅ NUEVO           │
                    └────────────┬──────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────────────────┐
                    │ DOCENTE: Abre Dashboard del Curso          │
                    │ getCourseMetrics(courseId)                 │
                    └────────────┬──────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────────────────┐
                    │ Query Firestore:                            │
                    │ where('sourceCourseId', '==', courseId) ✅  │
                    │                                             │
                    │ ✅ ENCUENTRA documentos porque ahora SÍ     │
                    │    tienen sourceCourseId preservado         │
                    └────────────┬──────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────────────────┐
                    │ Dashboard Muestra:                          │
                    │ - Estudiante: Marco Alencastro             │
                    │ - Progreso: 20% (1/5 rúbricas)             │
                    │ - Puntuación: 8.5/10                       │
                    │ - Estado: En Progreso                      │
                    └─────────────────────────────────────────────┘
```

---

### 🧪 Validación de Fixes

**Para verificar que todo funciona:**

1. **Como Estudiante:**
   ```javascript
   // En consola del navegador después de completar un artefacto:
   const uid = firebase.auth().currentUser.uid;
   const textoId = window.__appContext?.currentTextoId;
   
   firebase.firestore()
     .collection('students').doc(uid)
     .collection('progress').doc(textoId)
     .get()
     .then(doc => {
       console.log('Progreso guardado:', doc.data());
       // Verificar que tenga: sourceCourseId, porcentaje, score, estado
     });
   ```

2. **Como Docente:**
   ```javascript
   // Verificar que getCourseMetrics encuentra estudiantes:
   const courseId = 'ID_DEL_CURSO';
   getCourseMetrics(courseId).then(metrics => {
     console.log('Estudiantes encontrados:', metrics.estudiantes.length);
     console.log('Resumen:', metrics.resumen);
   });
   ```

3. **Smart Resume:**
   - Estudiante completa lectura y análisis (espera 1-2 min)
   - Vuelve a "Mis Cursos"
   - Hace clic en "Continuar" en la misma lectura
   - ✅ Debería cargar instantáneamente sin análisis nuevo

---


