# AppLectura — Asistente de Lectura y Comprensión Potenciado por Inteligencia Artificial

## Documento Descriptivo para Evaluación por Expertos

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Plataforma:** [https://applectura-cb058.web.app](https://applectura-cb058.web.app)

---

## Tabla de Contenidos

1. [Presentación General](#1-presentación-general)
2. [Fundamento Pedagógico](#2-fundamento-pedagógico)
3. [Arquitectura Tecnológica](#3-arquitectura-tecnológica)
4. [Roles de Usuario](#4-roles-de-usuario)
5. [Flujo del Estudiante](#5-flujo-del-estudiante)
6. [Módulo 1 — Lectura Guiada y Tutor IA](#6-módulo-1--lectura-guiada-y-tutor-ia)
7. [Módulo 2 — Análisis del Texto](#7-módulo-2--análisis-del-texto)
8. [Módulo 3 — Actividades](#8-módulo-3--actividades)
9. [Módulo 4 — Notas de Estudio](#9-módulo-4--notas-de-estudio)
10. [Módulo 5 — Evaluación](#10-módulo-5--evaluación)
11. [Sistema de Recompensas y Gamificación](#11-sistema-de-recompensas-y-gamificación)
12. [Panel Docente](#12-panel-docente)
13. [Inteligencia Artificial — Arquitectura y Proveedores](#13-inteligencia-artificial--arquitectura-y-proveedores)
14. [Accesibilidad, Rendimiento y Experiencia de Usuario](#14-accesibilidad-rendimiento-y-experiencia-de-usuario)
15. [Infraestructura y Despliegue](#15-infraestructura-y-despliegue)
16. [Resumen de Funcionalidades](#16-resumen-de-funcionalidades)

---

## 1. Presentación General

**AppLectura** es una aplicación web educativa diseñada para fortalecer las competencias de comprensión lectora y pensamiento crítico en contextos académicos. La plataforma integra inteligencia artificial generativa como herramienta pedagógica, operando bajo el principio de *human on the loop*, donde la IA actúa como mediadora del aprendizaje mientras el docente mantiene supervisión y control sobre el proceso evaluativo.

La aplicación está orientada a estudiantes de educación superior y ofrece un recorrido pedagógico estructurado que va desde la lectura guiada hasta la evaluación formal, pasando por el análisis textual profundo, la producción de artefactos de aprendizaje y la práctica deliberada.

### Propósito Central

Transformar la lectura académica de un acto pasivo a un proceso activo de construcción de conocimiento, mediante:

- **Acompañamiento inteligente** no evaluativo durante la lectura (Tutor IA)
- **Análisis multidimensional** del texto desde distintas perspectivas críticas
- **Producción guiada** de artefactos académicos con retroalimentación inmediata
- **Evaluación criterial** basada en una rúbrica de literacidad crítica
- **Supervisión docente** con métricas granulares y capacidad de intervención

---

## 2. Fundamento Pedagógico

AppLectura se sustenta en un marco teórico que integra múltiples enfoques pedagógicos:

### 2.1 Taxonomía de Bloom Revisada

El sistema clasifica las interacciones del estudiante en seis niveles cognitivos progresivos:

| Nivel | Categoría | Descripción | Puntos |
|-------|-----------|-------------|--------|
| 1 | Recordar | Recuperación de información textual | 2 |
| 2 | Comprender | Explicación e interpretación | 4 |
| 3 | Aplicar | Uso del conocimiento en contextos nuevos | 8 |
| 4 | Analizar | Descomposición y relación de elementos | 15 |
| 5 | Evaluar (ACD) | Juicio crítico y análisis del discurso | 25 |
| 6 | Crear | Producción original e integración | 40 |

Un detector integrado en el tutor IA identifica automáticamente el nivel cognitivo de las preguntas del estudiante y sugiere andamiaje hacia el nivel inmediato superior (ZDP+1), siguiendo el principio vigotskiano de la Zona de Desarrollo Próximo.

### 2.2 Análisis Crítico del Discurso (ACD)

La plataforma incorpora un motor de análisis discursivo que guía al estudiante en la identificación de:

- Marcos ideológicos y posicionamientos del autor
- Estrategias retóricas y recursos argumentativos
- Voces presentes y silenciadas en el texto
- Relaciones de poder implícitas en el discurso

### 2.3 Rúbrica de Literacidad Crítica

La evaluación se estructura en torno a cinco dimensiones, cada una con criterios específicos y cuatro niveles de desempeño (Insuficiente, Básico, Adecuado, Avanzado):

| Dimensión | Competencia Evaluada |
|-----------|---------------------|
| **Comprensión Analítica** | Capacidad de identificar estructura, tesis, argumentos y relaciones textuales |
| **Análisis Ideológico-Discursivo (ACD)** | Identificación de recursos discursivos, sesgos y posicionamientos |
| **Contextualización Socio-histórica** | Relación del texto con su contexto de producción y actores sociales |
| **Argumentación y Contraargumento** | Construcción de posiciones fundamentadas con evidencia textual |
| **Ética IA y Metacognición** | Reflexión sobre el propio proceso de aprendizaje y el uso ético de la IA |

### 2.4 Método Socrático

El tutor IA implementa un enfoque socrático: no proporciona respuestas directas, sino que formula preguntas que guían al estudiante hacia la construcción autónoma del conocimiento. Cada respuesta del tutor incluye una pregunta de seguimiento que invita a profundizar.

### 2.5 Detección Emocional

El sistema detecta señales emocionales en las interacciones del estudiante — confusión, frustración, curiosidad, insight — y adapta su respuesta pedagógica en consecuencia, ofreciendo mayor andamiaje cuando detecta dificultad o ampliando el desafío cuando detecta dominio.

---

## 3. Arquitectura Tecnológica

### 3.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  React 18.2 · styled-components · framer-motion         │
│  react-virtuoso · recharts · jsPDF · xlsx                │
│  Firebase Auth · Firestore (offline) · Firebase Storage  │
├─────────────────────────────────────────────────────────┤
│                    BACKEND                              │
│  Express.js · Node.js                                    │
│  pdf-parse · OCR · Mammoth (DOCX)                        │
│  SSE Streaming · Zod Validation · Rate Limiting          │
├─────────────────────────────────────────────────────────┤
│              PROVEEDORES IA                              │
│  OpenAI (GPT-4o-mini) · DeepSeek · Google Gemini         │
├─────────────────────────────────────────────────────────┤
│           BÚSQUEDA WEB                                   │
│  Tavily · Serper · Bing (con fallback encadenado)        │
├─────────────────────────────────────────────────────────┤
│              INFRAESTRUCTURA                             │
│  Firebase Hosting (frontend) · Render (backend)          │
│  Firestore (base de datos) · Firebase Storage (archivos) │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Decisiones Técnicas Clave

- **Persistencia offline**: Firestore con IndexedDB permite que la aplicación funcione sin conexión, sincronizando datos cuando se restaura la conectividad.
- **Virtualización de textos**: Los textos extensos (más de 400 párrafos) se renderizan con virtualización para mantener fluidez en la interfaz.
- **Streaming en tiempo real**: Las respuestas del tutor IA se transmiten mediante Server-Sent Events (SSE), mostrando la respuesta progresivamente al estudiante.
- **Merge inteligente de sesiones**: Algoritmo de resolución de conflictos cuando el estudiante trabaja desde múltiples dispositivos, priorizando la versión con mayor progreso.
- **Multi-proveedor IA con fallback**: Si un proveedor falla, el sistema redirige automáticamente a otro, garantizando disponibilidad continua.

---

## 4. Roles de Usuario

### 4.1 Estudiante

El estudiante accede a la plataforma y puede operar en dos modalidades:

- **Análisis libre**: Carga textos propios (PDF, TXT, DOCX) y utiliza todas las herramientas de la plataforma sin necesidad de estar inscrito en un curso. Ideal para estudio autónomo.
- **Curso asignado**: Se une a un curso mediante un código de acceso proporcionado por el docente. Accede a lecturas preconfiguradas y su progreso es visible para el docente.

### 4.2 Docente

El docente gestiona cursos, sube textos, asigna lecturas, monitorea el progreso de sus estudiantes y puede intervenir en el proceso evaluativo. Opera desde un panel de gestión dedicado con acceso a métricas en tiempo real.

### 4.3 Autenticación

- Registro e inicio de sesión con **correo electrónico y contraseña**
- Inicio de sesión con **Google**
- Recuperación de contraseña por correo electrónico
- Limpieza automática de datos locales al cambiar de usuario (prevención de contaminación de datos)

---

## 5. Flujo del Estudiante

El recorrido pedagógico del estudiante sigue una secuencia intencionada:

```
┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│   Ingreso    │────▶│  Dashboard    │────▶│  Selección   │
│  (Login)     │     │  Estudiante   │     │  de Lectura  │
└──────────────┘     └───────────────┘     └──────┬──────┘
                                                   │
                     ┌─────────────────────────────▼──────────────────────────────┐
                     │              RECORRIDO PEDAGÓGICO (5 Pestañas)             │
                     │                                                            │
                     │  ① Lectura    ② Análisis    ③ Actividades                  │
                     │     Guiada       del Texto      ├─ Preparación (MCQ)       │
                     │     + Tutor IA   (4 fases)      ├─ Práctica (opcional)     │
                     │                                  └─ 5 Artefactos           │
                     │                                                            │
                     │  ④ Notas de Estudio              ⑤ Evaluación              │
                     │     + Repetición Espaciada           Criterial (5 dim.)    │
                     └────────────────────────────────────────────────────────────┘
```

### Dashboard del Estudiante

Al ingresar, el estudiante encuentra:

- **Encabezado** con su nombre, puntos acumulados, racha diaria y logros
- **Análisis libre**: Sección para cargar textos propios y analizarlos sin restricciones
- **Unirse a un curso**: Campo para ingresar el código de acceso proporcionado por el docente
- **Mis cursos**: Lista de cursos inscritos con lecturas asignadas y porcentaje de progreso por texto
- **Historial de sesiones**: Acceso a "partidas guardadas" con posibilidad de continuar donde se dejó (*Smart Resume*)

---

## 6. Módulo 1 — Lectura Guiada y Tutor IA

### 6.1 Visor de Texto

El visor de lectura es el espacio central de la aplicación. Presenta el texto con las siguientes funcionalidades:

- **Barra de metadatos (MetaBar)**: Muestra conteo de párrafos, palabras y tiempo estimado de lectura
- **Control de tamaño de fuente**: Ajustable de 12px a 22px para adaptarse a las necesidades del lector
- **Detección inteligente de estructura**: Identifica automáticamente títulos (h1, h2, h3) y organiza visualmente los párrafos
- **Buscador interno**: Permite buscar términos dentro del texto con navegación entre coincidencias
- **Selección contextual**: Al seleccionar un fragmento de texto, aparece un menú con acciones:
  - *Explicar*: Envía el fragmento al tutor para obtener una explicación
  - *Guardar cita*: Almacena la selección como cita para uso posterior en artefactos
  - *Notas*: Asocia una anotación personal al fragmento
  - *Copiar*: Copia el texto al portapapeles
- **Modo enfoque**: Oculta la navegación y elementos secundarios para una lectura sin distracciones
- **Tracking de tiempo de lectura**: Registra el tiempo efectivo dedicado a la lectura

### 6.2 Tutor IA

El tutor es un asistente conversacional no evaluativo que acompaña al estudiante durante la lectura:

- **Método socrático**: Responde con preguntas orientadoras en lugar de respuestas directas, promoviendo la construcción autónoma del conocimiento
- **Consciencia contextual**: Tiene acceso al texto cargado y puede referirse a secciones específicas
- **Detección de nivel Bloom**: Identifica automáticamente el nivel cognitivo de las preguntas del estudiante y sugiere progresión
- **Zona de Desarrollo Próximo**: Ofrece andamiaje adaptado al nivel actual del estudiante, empujando hacia el nivel inmediato superior
- **Detección emocional**: Reconoce señales de confusión, frustración, curiosidad o insight y adapta su tono y profundidad
- **Búsqueda web integrada**: El estudiante puede activar la función "🌐 Con Web" para enriquecer las respuestas del tutor con información actualizada de internet (utiliza Tavily, Serper o Bing con fallback encadenado)
- **Streaming en tiempo real**: Las respuestas se muestran progresivamente mediante SSE, evitando esperas prolongadas
- **Configuraciones ajustables**:
  - *Longitud de respuesta*: Controla cuán extensas son las respuestas del tutor
  - *Creatividad*: Ajusta el parámetro de temperatura del modelo IA
  - *Seguimiento de preguntas*: Activa o desactiva las preguntas de seguimiento automáticas
- **Persistencia de conversación**: El historial del chat se preserva por sesión de lectura y puede recuperarse al volver al texto
- **Filtro de contenido**: Sistema automático de detección de lenguaje inapropiado

### 6.3 Panel Expandible

El tutor se presenta como un panel lateral (o inferior en móvil) que puede:
- Expandirse a pantalla completa para conversaciones extensas
- Contraerse para priorizar la lectura del texto
- Redimensionarse según preferencia del usuario

---

## 7. Módulo 2 — Análisis del Texto

La segunda pestaña proporciona un análisis académico profundo del texto en cuatro fases progresivas:

### 7.1 Fases de Análisis

| Fase | Nombre | Enfoque |
|------|--------|---------|
| I | **Contextualización** | Identifica el género textual, la audiencia, el propósito comunicativo y el contexto de producción |
| II | **Contenido y Argumentación** | Analiza la organización del texto, la tesis central, los argumentos principales y la evidencia utilizada |
| III | **Análisis Formal y Lingüístico** | Examina estructura formal, recursos retóricos, estrategias discursivas y elementos lingüísticos |
| IV | **Análisis Ideológico-Discursivo (ACD)** | Examina sesgos, perspectivas, voces silenciadas, relaciones de poder e implicaciones ideológicas |

### 7.2 Características del Módulo

- **Generación automática con IA**: El análisis se genera al cargar el texto, utilizando el proveedor IA configurado
- **Glosario dinámico**: Los términos técnicos y especializados aparecen como elementos clickeables. Al hacer clic, se despliega una definición generada por IA y almacenada en caché (24 horas)
- **Secciones colapsables**: Cada fase puede expandirse o contraerse individualmente, con opción de expandir/contraer todas
- **Exportación a PDF**: Los resultados del análisis pueden descargarse como documento PDF formateado
- **Caché inteligente**: Los análisis se almacenan para evitar regeneración innecesaria, con migración automática de formatos legacy
- **Estrategias de análisis**: El backend soporta diferentes estrategias (inteligente, alternada, debate) que determinan cómo los proveedores IA colaboran en el análisis
- **Fallback sin IA**: En caso de fallo de todos los proveedores, un servicio básico genera un análisis estructural del texto sin IA

---

## 8. Módulo 3 — Actividades

El módulo de actividades constituye el núcleo formativo de la aplicación, organizado en tres secciones secuenciales:

### 8.1 Preparación (Checkpoint)

Antes de acceder a los artefactos, el estudiante debe completar una fase de preparación que verifica la lectura del texto:

- **Preguntas de opción múltiple**: Generadas automáticamente por IA a partir del contenido del texto, verifican comprensión literal e inferencial
- **Preguntas abiertas de contextualización**: El estudiante debe demostrar comprensión del contexto del texto con respuestas escritas, evaluadas por IA
- **Desbloqueo progresivo**: Solo al completar satisfactoriamente la preparación se habilitan los artefactos de aprendizaje

### 8.2 Práctica Guiada (Opcional)

Un espacio no calificado donde el estudiante puede ejercitar antes de enfrentar los artefactos formales:

- **Tres niveles de dificultad**: Fácil, Intermedio y Difícil, con complejidad cognitiva creciente
- **Cinco dimensiones disponibles**: El estudiante elige en qué dimensión desea practicar
- **Retroalimentación inmediata**: La IA evalúa la respuesta y ofrece orientación sin asignar calificación formal
- **Puntos de bonificación**: Aunque no es calificado, la práctica otorga puntos en el sistema de recompensas como incentivo
- **Historial de práctica**: Se registran los intentos para que el estudiante pueda ver su evolución

### 8.3 Artefactos de Aprendizaje (5 Dimensiones)

Cada dimensión de la rúbrica de literacidad crítica tiene un artefacto académico asociado:

| # | Dimensión | Artefacto | Descripción |
|---|-----------|-----------|-------------|
| 1 | Comprensión Analítica | **Resumen Académico** | El estudiante redacta un resumen que demuestre comprensión estructural y temática del texto, identificando tesis, argumentos y conclusiones |
| 2 | Análisis Ideológico-Discursivo (ACD) | **Tabla ACD** | Identificación sistemática de recursos retóricos, posicionamientos ideológicos, sesgos y estrategias argumentativas del autor |
| 3 | Contextualización | **Mapa de Actores** | Representación de los actores sociales involucrados, sus relaciones, intereses y el contexto socio-histórico del texto |
| 4 | Argumentación | **Respuesta Argumentativa** | Construcción de una posición fundamentada con evidencia textual, incluyendo contraargumentos y réplicas |
| 5 | Ética IA y Metacognición | **Bitácora Ética IA** | Reflexión sobre el uso ético de la IA en el proceso de aprendizaje y metacognición sobre el propio proceso lector |

### 8.4 Características de los Artefactos

Cada artefacto comparte un diseño consistente:

- **Área de escritura** con guías contextuales y preguntas orientadoras específicas de cada dimensión
- **Panel de citas textuales**: Acceso a las citas guardadas durante la lectura para fundamentar la escritura con evidencia
- **Auto-guardado**: Los borradores se guardan automáticamente para prevenir pérdida de trabajo
- **Evaluación dual IA**: Los artefactos son evaluados por dos proveedores IA independientes con prompts criteriales específicos, generando una evaluación más robusta
- **Retroalimentación estructurada**: Cada evaluación incluye:
  - Puntuación (escala 1-10, normalizada a nivel 1-4)
  - Fortalezas identificadas
  - Áreas de mejora
  - Siguientes pasos sugeridos
- **Historial de intentos**: Se preservan todos los envíos del estudiante con sus respectivas evaluaciones
- **Rate limiting**: Control de frecuencia de envíos para prevenir abuso
- **Atajos de teclado**: Para escritura eficiente dentro del editor
- **Banner de override docente**: Cuando el docente ha intervenido en la calificación, se muestra un indicador visual

### 8.5 Sección de Progreso

- **Dashboard visual**: Panel con el estado de cada dimensión (no iniciado, en progreso, completado)
- **Recomendaciones**: El sistema marca las dimensiones donde el estudiante tiene mayor oportunidad de mejora
- **Exportación**: Posibilidad de descargar el progreso completo en formato PDF o Excel
- **Reset de progreso**: Opción de reiniciar con confirmación explícita

---

## 9. Módulo 4 — Notas de Estudio

### 9.1 Generación con IA

El sistema genera notas de estudio personalizadas a partir del texto cargado:

- **Configuración personalizable**:
  - Tipo de texto (narrativo, argumentativo, expositivo, etc.)
  - Duración de estudio deseada
  - Número de tarjetas a generar
  - Nivel académico del estudiante
- **Contexto enriquecido**: Las notas incorporan información del análisis previo y las interacciones del estudiante para mayor relevancia
- **Multi-proveedor**: Generación mediante OpenAI, DeepSeek o Gemini con fallback automático

### 9.2 Repetición Espaciada (Algoritmo SM-2)

La plataforma implementa el algoritmo SM-2 (SuperMemo 2) para optimizar la retención a largo plazo:

- **Intervalos crecientes**: Las tarjetas se presentan con espaciamiento progresivo basado en la calidad de la respuesta del estudiante
- **Escala de calidad 0-5**: El estudiante autoevalúa cuánto recuerda, lo cual ajusta el próximo intervalo
- **Cronograma de repaso**: 6 sesiones escalonadas desde repaso inmediato hasta 30 días
- **Factor de facilidad adaptativo**: Cada tarjeta ajusta dinámicamente su intervalo según el rendimiento histórico (mínimo 1.3)
- **Items de repaso**: Panel con tarjetas pendientes de revisión, marcables como completadas

---

## 10. Módulo 5 — Evaluación

### 10.1 Evaluación Criterial

La evaluación formal opera bajo el paradigma criterial, no normativo:

- **Generación de preguntas por IA**: Preguntas abiertas alineadas con cada dimensión de la rúbrica
- **Evaluación automatizada**: La respuesta del estudiante es evaluada por IA con criterios específicos
- **Feedback multidimensional**: Para cada dimensión se reporta:
  - Puntuación 1-10 normalizada a nivel 1-4
  - Fortalezas
  - Áreas de mejora
  - Pasos siguientes

### 10.2 Dashboard de Rúbricas

Panel visual que muestra el progreso acumulado del estudiante en cada dimensión de la rúbrica de literacidad crítica, permitiendo identificar fortalezas y áreas de oportunidad.

### 10.3 Ensayo Integrador

Evaluación sumativa que requiere que el estudiante integre las cinco dimensiones en una producción textual cohesiva, demostrando su capacidad de síntesis y pensamiento crítico.

### 10.4 Prerrequisitos

Un checklist verifica que el estudiante haya completado las fases previas antes de acceder a la evaluación formal, garantizando un recorrido pedagógico completo.

---

## 11. Sistema de Recompensas y Gamificación

### 11.1 Puntos Exponenciales

El sistema de puntos está alineado con la taxonomía de Bloom, incentivando interacciones de mayor complejidad cognitiva:

| Nivel Bloom | Puntos | Ejemplo de Acción |
|-------------|--------|-------------------|
| Recordar | 2 | Pregunta literal sobre el texto |
| Comprender | 4 | Solicitar explicación de un concepto |
| Aplicar | 8 | Conectar el texto con un caso real |
| Analizar | 15 | Descomponer la argumentación del autor |
| Evaluar | 25 | Emitir juicio crítico fundamentado |
| Crear | 40 | Proponer una perspectiva original |

### 11.2 Eventos Recompensados (37 tipos)

Se otorgan puntos por una variedad de acciones pedagógicas:

- Preguntas al tutor clasificadas por nivel Bloom
- Análisis crítico del discurso
- Completar evaluaciones
- Guardar citas y anotaciones
- Activar búsqueda web
- Completar actividades y artefactos
- Práctica deliberada en los tres niveles
- Completar el checkpoint de preparación

### 11.3 Racha Diaria

Un sistema de multiplicadores recompensa la consistencia:

| Días Consecutivos | Multiplicador |
|-------------------|---------------|
| 3 días | +20% |
| 7 días | +50% |
| 14 días | +100% |
| 21 días | +150% |
| 30 días | +200% |

### 11.4 Logros (Achievements)

Hitos pedagógicos que reconocen avances significativos:

- **Dimensión Desbloqueada** (40 pts): Completar una dimensión de la rúbrica
- **⭐ Excelencia Crítica** (100 pts): Obtener la máxima calificación en un artefacto
- Otros hitos relacionados con consistencia, exploración y profundidad

### 11.5 Protección Anti-farming

- **Límite diario** por tipo de evento para evitar acumulación artificial
- **Deduplicación**: No se otorgan puntos duplicados por la misma acción
- **Cooldowns**: Períodos mínimos entre acciones recompensadas del mismo tipo

### 11.6 Interfaz de Recompensas

- **Encabezado global**: Muestra puntos totales, racha actual con emoji dinámico y badge de logros
- **Panel de analíticas**: Vista detallada con distribución de puntos, estadísticas por categoría y progreso temporal

---

## 12. Panel Docente

### 12.1 Gestión de Cursos

- **Crear cursos** con nombre, período académico y descripción
- **Código de acceso único**: Se genera automáticamente un código alfanumérico de 6 caracteres (sin caracteres ambiguos) que los estudiantes usan para inscribirse
- **Aprobación de estudiantes**: Configurable como automática o manual
- **Configuración de ponderación**: El docente define el peso de la evaluación formativa vs. sumativa (por defecto 70%/30%)
- **Eliminación de cursos** con confirmación

### 12.2 Gestión de Textos

- **Subir documentos**: Soporte para PDF, TXT y DOCX con metadata (título, autor, género textual)
- **Procesamiento inteligente**: Los PDFs se procesan con extracción de texto y OCR como fallback para documentos escaneados
- **Asignar lecturas a cursos**: Con fecha límite y notas opcionales para los estudiantes
- **Habilitar/deshabilitar lecturas** sin eliminarlas

### 12.3 Monitoreo de Estudiantes

- **Dashboard de métricas**: Vista agregada del progreso por curso y por lectura
- **Vista expandida por estudiante**: Detalle individual con:
  - Estado de cada artefacto (no iniciado, en progreso, completado)
  - Puntuaciones obtenidas por dimensión
  - Tiempo dedicado a la lectura
  - Historial de intentos por artefacto
- **Métricas en tiempo real**: Las actualizaciones de progreso se reflejan inmediatamente gracias a suscripciones en tiempo real de Firestore

### 12.4 Intervención Docente (Human on the Loop)

- **Override de calificación**: El docente puede modificar cualquier calificación asignada por la IA, añadiendo un comentario explicativo y la razón del cambio. La calificación del docente prevalece sobre la de la IA
- **Reset de artefactos**: Posibilidad de reiniciar un artefacto específico o todos los artefactos de un estudiante, otorgando una nueva oportunidad
- **Comentarios**: Canal de comunicación directa con el estudiante sobre su desempeño

### 12.5 Exportación

- Exportación de resultados y métricas del curso
- Vista de actividad detallada por estudiante

---

## 13. Inteligencia Artificial — Arquitectura y Proveedores

### 13.1 Proveedores Integrados

| Proveedor | Modelo Principal | Usos |
|-----------|-----------------|------|
| **OpenAI** | GPT-4o-mini | Chat, evaluación, notas, análisis |
| **DeepSeek** | deepseek-chat | Chat, evaluación, análisis |
| **Google Gemini** | gemini-2.0-flash | Análisis, notas |

### 13.2 Estrategia de Resiliencia

- **Fallback encadenado**: Si un proveedor falla, el sistema redirige automáticamente al siguiente
- **Retry con backoff exponencial**: Reintentos automáticos con intervalos crecientes ante errores temporales
- **Caché de respuestas**: Las respuestas del chat se almacenan en caché para evitar llamadas duplicadas
- **Validación de esquemas (Zod)**: Las respuestas de la IA se validan contra esquemas estructurados para garantizar formato correcto

### 13.3 Búsqueda Web

La funcionalidad de búsqueda web permite enriquecer las respuestas del tutor con información actualizada:

| Proveedor | Prioridad | Descripción |
|-----------|-----------|-------------|
| **Tavily** | 1ª opción | Motor de búsqueda optimizado para IA |
| **Serper** | 2ª opción | API de Google Search |
| **Bing** | 3ª opción | API de Microsoft Bing |
| **Simulada** | Fallback | Respuesta básica sin búsqueda real |

Los resultados se normalizan (título, URL, snippet, score de relevancia) y se inyectan como contexto en el prompt del tutor.

### 13.4 Modos de IA

La aplicación implementa dos modos claramente diferenciados:

- **Modo Tutor** (no evaluativo): Acompaña, guía y sugiere sin calificar. Usa método socrático y se adapta al nivel del estudiante
- **Modo Evaluador** (criterial): Evalúa formalmente las respuestas del estudiante contra la rúbrica de literacidad crítica, asignando puntuaciones y retroalimentación estructurada

---

## 14. Accesibilidad, Rendimiento y Experiencia de Usuario

### 14.1 Diseño Responsivo

- **Breakpoints adaptativos**: 640px (móvil), 768px (tablet), 1200px (escritorio)
- **Touch targets**: Mínimo 44px para elementos interactivos en dispositivos táctiles
- **Safe area**: Compatibilidad con notch y barra inferior de dispositivos móviles
- **Altura dinámica**: Uso de `100dvh` para altura real en navegadores móviles

### 14.2 Rendimiento

- **Lazy loading**: Todos los módulos principales se cargan bajo demanda
- **React.memo**: Memoización de componentes para evitar re-renderizados innecesarios
- **Virtualización**: Textos extensos renderizan solo los párrafos visibles
- **Separación de contexto**: El estado global distingue valores estables (callbacks) de valores dinámicos (datos) para minimizar propagación de actualizaciones

### 14.3 Modo Oscuro / Claro

- **Tema completo**: Paleta de colores, sombras, contrastes y elementos semánticos para ambos modos
- **Persistencia**: La preferencia se guarda en localStorage con fallback a la preferencia del sistema operativo
- **Contraste WCAG AA**: Ratio mínimo de 4.8:1 para texto secundario

### 14.4 Experiencia de Usuario

- **Animaciones con framer-motion**: Transiciones fluidas entre estados y componentes
- **Respeto por `prefers-reduced-motion`**: Las animaciones se desactivan para usuarios que lo soliciten
- **Auto-guardado**: Todos los borradores se preservan automáticamente
- **Indicadores de estado**: Feedback visual claro para carga, éxito, error y progreso
- **Sidebar colapsable**: Panel lateral de carga de texto que se oculta automáticamente en pantallas pequeñas

---

## 15. Infraestructura y Despliegue

### 15.1 Frontend

- **Hosting**: Firebase Hosting con CDN global
- **Dominio**: applectura-cb058.web.app
- **Build**: Create React App con configuración personalizada

### 15.2 Backend

- **Hosting**: Render (servicio web)
- **Puerto**: 3001
- **CORS**: Configuración dinámica para localhost, Firebase Hosting y Render
- **Rate limiting**: Protección contra abuso de endpoints

### 15.3 Base de Datos (Firestore)

Colecciones principales:

| Colección | Propósito |
|-----------|-----------|
| `users` | Datos de usuario (nombre, rol, email) |
| ↳ `users/{uid}/sessions` | Sesiones de trabajo con estado completo (subcolección) |
| ↳ `users/{uid}/draftBackups` | Respaldos de borradores de artefactos (subcolección) |
| `textos` | Textos subidos por docentes con metadata |
| `courses` | Cursos con código, lecturas asignadas, configuración |
| ↳ `courses/{id}/students` | Estudiantes inscritos en el curso (subcolección) |
| `courseCodes` | Mapeo de código → ID de curso (lookup rápido) |
| `students` | Relación estudiante-curso con progreso |
| ↳ `students/{id}/progress` | Progreso detallado por texto (subcolección) |
| `evaluaciones` | Evaluaciones almacenadas |
| `active_sessions` | Sesiones activas en tiempo real |

### 15.4 Almacenamiento

- **Firebase Storage**: Para documentos PDF, TXT y DOCX subidos por docentes
- **Límites**: 50MB máximo por archivo
- **Formatos**: .pdf, .txt, .docx

### 15.5 Seguridad

- **Reglas de Firestore**: Control de acceso por rol y propiedad del documento
- **Autenticación obligatoria**: Todas las rutas protegidas requieren sesión activa
- **Limpieza de datos**: Al cerrar sesión o cambiar de usuario, se eliminan datos sensibles del almacenamiento local
- **Filtro de contenido**: Detección automática de lenguaje inapropiado en las interacciones con el tutor

---

## 16. Resumen de Funcionalidades

### Funcionalidades del Estudiante

| Categoría | Funcionalidad |
|-----------|--------------|
| **Lectura** | Visor de texto con estructura inteligente, control de fuente, modo enfoque, buscador interno, tracking de tiempo |
| **Interacción Textual** | Selección contextual (explicar, citar, anotar, copiar), glosario dinámico |
| **Tutor IA** | Chat socrático no-evaluativo, búsqueda web, detección de Bloom, ZDP+1, detección emocional, streaming |
| **Análisis** | Análisis en 4 fases (contextualización, contenido, formal-lingüístico, ideológico-discursivo ACD), exportación PDF |
| **Actividades** | Checkpoint MCQ, práctica en 3 niveles, 5 artefactos con evaluación dual IA |
| **Notas** | Generación IA personalizable, repetición espaciada SM-2, cronograma de repaso |
| **Evaluación** | Evaluación criterial por dimensión, dashboard de rúbrica, ensayo integrador |
| **Gamificación** | Puntos Bloom, racha diaria, logros, analíticas de progreso |
| **Gestión** | Inscripción a cursos, historial de sesiones, Smart Resume, análisis libre |

### Funcionalidades del Docente

| Categoría | Funcionalidad |
|-----------|--------------|
| **Cursos** | Crear, configurar, eliminar cursos con código de acceso único |
| **Textos** | Subir PDF/TXT/DOCX, asignar a cursos con fecha límite |
| **Estudiantes** | Aprobar inscripciones, monitorear progreso, eliminar |
| **Métricas** | Dashboard en tiempo real, vista por curso y por estudiante |
| **Intervención** | Override de calificación, reset de artefactos, comentarios |
| **Configuración** | Ponderación formativa/sumativa, auto-approve |

### Capacidades Técnicas

| Categoría | Capacidad |
|-----------|-----------|
| **IA** | Multi-proveedor (OpenAI, DeepSeek, Gemini) con fallback |
| **Búsqueda** | Web search integrado (Tavily, Serper, Bing) |
| **Documentos** | PDF (con OCR), TXT, DOCX |
| **Offline** | Persistencia Firestore con IndexedDB |
| **Rendimiento** | Virtualización, lazy loading, memoización |
| **Responsive** | Diseño adaptativo para móvil, tablet y escritorio |
| **Temas** | Modo oscuro/claro con persistencia |
| **Datos** | Sync en tiempo real, merge inteligente, exportación PDF/Excel |
| **Seguridad** | Auth Firebase, reglas Firestore, rate limiting, filtro de contenido |

---

*AppLectura — Donde la inteligencia artificial se pone al servicio de la lectura crítica.*
