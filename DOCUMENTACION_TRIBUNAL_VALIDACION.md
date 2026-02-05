# AppLectura — Documentación Técnico-Pedagógica para Tribunal de Validación de Expertos

> **Proyecto de Maestría**: Mejora de la Literacidad Crítica en Estudiantes mediante Inteligencia Artificial
>
> **Fecha de elaboración**: 2 de febrero de 2026
>
> **Propósito del documento**: Explicar de manera detallada y accesible cómo la aplicación AppLectura ha sido diseñada y programada para desarrollar la literacidad crítica de los estudiantes, con especial énfasis en la configuración de la Inteligencia Artificial, la rúbrica de evaluación y la justificación pedagógica de las respuestas y calificaciones que entrega el sistema.

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Marco Conceptual: ¿Qué es la Literacidad Crítica?](#2-marco-conceptual-qué-es-la-literacidad-crítica)
3. [Arquitectura General de la Aplicación](#3-arquitectura-general-de-la-aplicación)
4. [La Rúbrica de Literacidad Crítica: Fundamento de Toda Evaluación](#4-la-rúbrica-de-literacidad-crítica-fundamento-de-toda-evaluación)
5. [Modo Tutor: Acompañamiento No Evaluativo](#5-modo-tutor-acompañamiento-no-evaluativo)
6. [Sistema de Evaluación: Las 5 Actividades](#6-sistema-de-evaluación-las-5-actividades)
7. [El Ensayo Integrador: Evaluación Final](#7-el-ensayo-integrador-evaluación-final)
8. [Bitácora Ética de IA: Evaluación de la Dimensión 5](#8-bitácora-ética-de-ia-evaluación-de-la-dimensión-5)
9. [Sistema de Hints (Pistas): Andamiaje Progresivo](#9-sistema-de-hints-pistas-andamiaje-progresivo)
10. [Análisis de Texto: Preparación para la Lectura Crítica](#10-análisis-de-texto-preparación-para-la-lectura-crítica)
11. [Garantías de Equidad y Transparencia](#11-garantías-de-equidad-y-transparencia)
12. [Resumen de Prompts Literales](#12-resumen-de-prompts-literales)
13. [Conclusiones y Recomendaciones para el Tribunal](#13-conclusiones-y-recomendaciones-para-el-tribunal)

---

## 1. Resumen Ejecutivo

**AppLectura** es una aplicación web educativa diseñada específicamente para desarrollar la **literacidad crítica** en estudiantes. La aplicación utiliza Inteligencia Artificial (IA) de manera fundamentada pedagógicamente para:

1. **Acompañar** al estudiante durante su proceso de lectura (sin evaluar)
2. **Evaluar** de manera justa y transparente su comprensión crítica del texto
3. **Retroalimentar** con comentarios específicos y accionables

### ¿Por qué dos modos de interacción?

La aplicación separa claramente dos roles de la IA:

| Modo | Propósito | ¿Califica? | Enfoque |
|------|-----------|------------|---------|
| **🧑‍🏫 Tutor** | Acompañar, clarificar dudas, generar curiosidad | ❌ Nunca | Preguntas socráticas, andamiaje |
| **📝 Evaluador** | Evaluar respuestas según rúbrica | ✅ Sí | Criterios explícitos, retroalimentación |

Esta separación es **pedagógicamente intencional**: el estudiante puede explorar libremente con el Tutor sin temor a ser juzgado, y cuando está listo, puede ser evaluado formalmente con criterios claros y justos.

### Flujo completo del estudiante

```
1. Carga un texto → 2. Análisis automático (prelectura) → 3. Interactúa con Tutor
                                                              ↓
4. Responde 5 Actividades (una por dimensión) → 5. Escribe Ensayo Integrador
                                                              ↓
6. Recibe evaluación final con retroalimentación detallada
```

---

## 2. Marco Conceptual: ¿Qué es la Literacidad Crítica?

### Definición operativa en AppLectura

La **literacidad crítica** no es simplemente "comprender un texto", sino la capacidad de:

- **Analizar** el contenido literal e inferencial con evidencia
- **Cuestionar** los supuestos ideológicos y las voces presentes/ausentes
- **Contextualizar** el texto en su momento histórico y social
- **Argumentar** una postura propia fundamentada y dialogar con otras perspectivas

### Las 5 Dimensiones de la Literacidad Crítica

AppLectura evalúa **5 dimensiones** que, en conjunto, representan una comprensión lectora verdaderamente crítica, incluyendo la reflexión metacognitiva sobre el uso de herramientas de IA:

| Dimensión | ¿Qué evalúa? | Pregunta clave |
|-----------|--------------|----------------|
| **Comprensión Analítica** | Reconstruir significado literal e inferencial con evidencia | *¿Cuál es la tesis central y qué la sustenta?* |
| **ACD (Análisis Ideológico-Discursivo)** | Detectar ideologías, sesgos, voces silenciadas | *¿Desde qué perspectiva se escribe? ¿Quién se beneficia?* |
| **Contextualización** | Situar el texto en su contexto socio-histórico | *¿Qué procesos sociales influyen en este texto?* |
| **Argumentación** | Construir postura propia y manejar objeciones | *¿Cuál es tu postura fundamentada y cómo respondes a críticas?* |
| **Metacognición Ética del Uso de IA** | Reflexionar sobre el uso responsable de IA | *¿Cómo usaste la IA de forma ética y transparente?* |

Las primeras 4 dimensiones están basadas en teorías de literacidad crítica reconocidas (Freire, Van Dijk, Cassany). La **quinta dimensión** es una innovación pedagógica que responde a la necesidad actual de formar estudiantes que usen la IA de manera crítica, ética y responsable.

Todas han sido operacionalizadas en una **rúbrica con criterios explícitos y descriptores de nivel**.

---

## 3. Arquitectura General de la Aplicación

### ¿Por qué es importante entender la arquitectura?

Para comprender cómo la IA genera sus respuestas y calificaciones, es necesario entender cómo se comunican las diferentes partes del sistema.

### Diagrama simplificado

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NAVEGADOR DEL ESTUDIANTE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   Tutor     │  │ Actividades │  │   Ensayo    │                │
│  │  (no eval)  │  │ (evaluadas) │  │ Integrador  │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          │                                         │
│                          ▼                                         │
│         ┌───────────────────────────────────┐                      │
│         │  Servicio Unificado de IA (frontend)                     │
│         │  - Construye prompts según la rúbrica                    │
│         │  - Procesa respuestas                                    │
│         │  - NUNCA expone claves de API                           │
│         └───────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS (encriptado)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVIDOR BACKEND                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  API de Evaluación                          │   │
│  │  - Valida que el prompt incluya la rúbrica                  │   │
│  │  - Envía a proveedores de IA (OpenAI, DeepSeek)             │   │
│  │  - Procesa y valida respuestas JSON                        │   │
│  │  - Protege claves de API (nunca llegan al navegador)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PROVEEDORES DE INTELIGENCIA ARTIFICIAL                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   OpenAI    │  │  DeepSeek   │  │   Gemini    │                │
│  │ (gpt-4o-mini)│ │(deepseek-chat)│ │  (backup)  │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### Explicación del flujo

1. **El estudiante interactúa** con la interfaz (pregunta al Tutor, responde una actividad, escribe un ensayo)
2. **El frontend construye un prompt** que incluye la rúbrica, el texto, la pregunta y los criterios específicos
3. **El backend recibe la solicitud**, valida que esté bien formada, y la envía a la IA
4. **La IA genera una respuesta** siguiendo las instrucciones del prompt (formato JSON obligatorio)
5. **El backend valida la respuesta** y la devuelve al frontend
6. **El estudiante ve la retroalimentación** con score, fortalezas y mejoras

### ¿Por qué usar múltiples proveedores de IA?

La aplicación usa **dos proveedores principales** para la evaluación de actividades:

- **DeepSeek**: Evalúa la **estructura y claridad** de la respuesta (velocidad y economía)
- **OpenAI**: Evalúa la **profundidad crítica** (mayor capacidad de razonamiento)

Al combinar ambas evaluaciones (60% estructura + 40% profundidad), se obtiene una calificación más balanceada y justa que usando una sola IA.

---

## 4. La Rúbrica de Literacidad Crítica: Fundamento de Toda Evaluación

### Principio fundamental

**Toda evaluación en AppLectura se basa en la rúbrica**. La IA no "inventa" criterios ni califica arbitrariamente: sigue instrucciones explícitas basadas en descriptores de nivel validados pedagógicamente.

### Estructura de la rúbrica

Cada dimensión tiene:

1. **Nombre y descripción** (qué evalúa)
2. **Criterios específicos** (qué buscar en la respuesta)
3. **Descriptores de nivel** (1-4, de insuficiente a avanzado)
4. **Preguntas guía** (para orientar al estudiante)

### Rúbrica completa

#### Dimensión 1: Comprensión Analítica

**Descripción**: Reconstruye el significado literal e inferencial del texto con evidencia explícita.

**Criterios de evaluación**:
- Identifica tesis central con citas precisas
- Distingue hechos de opiniones con ejemplos textuales
- Parafrasea manteniendo fidelidad conceptual
- Analiza estructura argumentativa y jerarquía de ideas
- Fundamenta deducciones en evidencia textual explícita

**Descriptores de nivel**:

| Nivel | Descriptor |
|-------|------------|
| **1 - Insuficiente** | Repite información superficial sin evidencia. No identifica tesis ni distingue tipos de información. |
| **2 - Básico** | Identifica ideas principales pero con evidencia escasa o imprecisa. Paráfrasis literal sin análisis. |
| **3 - Adecuado** | Parafrasea con fidelidad, distingue información central/secundaria, usa evidencia textual apropiada. |
| **4 - Avanzado** | Reconstruye tesis con precisión, analiza estructura argumentativa completa, fundamenta con citas estratégicas. |

**Preguntas guía para el estudiante**:
- ¿Cuál es la tesis central y qué evidencias la sustentan?
- ¿Qué afirmaciones son hechos verificables y cuáles opiniones del autor?
- ¿Cómo organizó el autor sus argumentos? ¿Qué información es central vs secundaria?

---

#### Dimensión 2: ACD (Análisis Ideológico-Discursivo)

**Descripción**: Desvela ideologías, sesgos y estrategias retóricas que subyacen al discurso.

**Criterios de evaluación**:
- Identifica perspectiva ideológica y posicionamiento del autor
- Analiza estrategias retóricas y elecciones léxicas intencionadas
- Detecta voces autorizadas vs silenciadas o marginadas
- Determina intereses, beneficiarios y marcos interpretativos
- Examina metáforas, eufemismos y carga valorativa del lenguaje

**Descriptores de nivel**:

| Nivel | Descriptor |
|-------|------------|
| **1 - Insuficiente** | No reconoce perspectiva ni sesgos. Acepta el texto como neutral u objetivo. |
| **2 - Básico** | Identifica algunas estrategias retóricas evidentes pero sin conectar con ideología subyacente. |
| **3 - Adecuado** | Analiza marcos interpretativos y voces, identifica algunos sesgos con ejemplos textuales. |
| **4 - Avanzado** | Desvela sistemáticamente ideología, intereses y silencios. Analiza estrategias retóricas complejas. |

**Preguntas guía para el estudiante**:
- ¿Desde qué perspectiva ideológica se escribe este texto? ¿Qué sesgos detectas?
- ¿Qué voces tienen autoridad y cuáles están ausentes o silenciadas?
- ¿A quién beneficia esta interpretación y qué intereses podrían estar en juego?
- ¿Qué estrategias retóricas usa el autor para persuadir o manipular?

---

#### Dimensión 3: Contextualización Socio-Histórica

**Descripción**: Sitúa el texto en su entorno de producción y analiza sus implicaciones sociales.

**Criterios de evaluación**:
- Identifica actores sociales y políticos relevantes
- Conecta con eventos históricos y procesos sociales específicos
- Analiza impacto y consecuencias en grupos/comunidades concretas
- Ubica en debates públicos y tensiones sociales actuales
- Reconoce el texto como intervención en diálogos sociales amplios

**Descriptores de nivel**:

| Nivel | Descriptor |
|-------|------------|
| **1 - Insuficiente** | Trata el texto como objeto aislado, sin conexión con su contexto social o histórico. |
| **2 - Básico** | Menciona contexto general pero sin conexiones específicas con procesos o consecuencias. |
| **3 - Adecuado** | Conecta con procesos sociales y actores específicos, identifica algunas implicaciones. |
| **4 - Avanzado** | Sitúa sistemáticamente en debates públicos, analiza consecuencias concretas y dinámicas de poder. |

**Preguntas guía para el estudiante**:
- ¿En qué contexto socio-político se produce este texto y qué eventos lo influenciaron?
- ¿Qué actores sociales están involucrados y cómo los afecta?
- ¿Qué consecuencias reales ha tenido o busca tener este discurso?
- ¿En qué debates públicos actuales se inscribe esta discusión?

---

#### Dimensión 4: Argumentación y Contraargumento

**Descripción**: Construye posturas propias y maneja objeciones con pensamiento dialógico.

**Criterios de evaluación**:
- Formula postura propia clara y fundamentada
- Articula razones lógicas respaldadas por evidencia textual
- Anticipa objeciones legítimas y las aborda sistemáticamente
- Integra perspectivas alternativas sin debilitar la argumentación
- Demuestra pensamiento dialógico y manejo de la complejidad

**Descriptores de nivel**:

| Nivel | Descriptor |
|-------|------------|
| **1 - Insuficiente** | Expresa opinión personal sin razones ni evidencia. Ignora perspectivas alternativas. |
| **2 - Básico** | Ofrece razones generales con evidencia limitada. Reconoce otras perspectivas superficialmente. |
| **3 - Adecuado** | Postura fundamentada con evidencia textual, anticipa algunas objeciones principales. |
| **4 - Avanzado** | Argumentación robusta, refuta objeciones con rigor, integra complejidad sin simplificar. |

**Preguntas guía para el estudiante**:
- ¿Cuál es tu postura fundamentada sobre este tema y qué evidencias del texto la sustentan?
- ¿Qué objeciones válidas podrían hacer a tu argumento y cómo las responderías?
- ¿Cómo integras perspectivas alternativas sin debilitar tu posición?
- ¿Qué limitaciones reconoces en tu propio argumento?

---

#### Dimensión 5: Metacognición Ética del Uso de IA (Bitácora Ética)

**Descripción**: Reflexión transparente, crítica y responsable sobre el uso de IA en el proceso de aprendizaje.

> **Nota importante**: Esta dimensión es **innovadora** y responde a la necesidad pedagógica actual de formar estudiantes que no solo usen herramientas de IA, sino que reflexionen críticamente sobre cómo las usan, verificando información y manteniendo su agencia intelectual.

**Criterios de evaluación**:
- Registra y documenta de forma transparente el uso de IA
- Verifica información con otras fuentes (no acepta respuestas como verdad absoluta)
- Identifica limitaciones y posibles sesgos de la IA
- Diferencia entre su pensamiento propio y el andamiaje de la IA
- Demuestra agencia y responsabilidad sobre su producción final

**Descriptores de nivel**:

| Nivel | Criterio 1: Registro y Transparencia | Criterio 2: Evaluación Crítica | Criterio 3: Agencia y Responsabilidad |
|-------|--------------------------------------|--------------------------------|---------------------------------------|
| **1 - Novato** | Registro inexistente o incompleto | Acepta respuestas como verdades absolutas | Dependencia alta de la IA sin reflexión |
| **2 - Aprendiz** | Registro parcial e inconsistente | Reconoce necesidad de verificar sin explicar pasos | Declara responsabilidad con reflexión limitada |
| **3 - Competente** | Documenta interacciones clave y su propósito | Describe verificación e identifica limitaciones | Diferencia decisiones propias y uso como andamiaje |
| **4 - Experto** | Trazabilidad detallada y autoconsciente de decisiones | Analiza sesgos y cómo influyeron en su producción | Profunda reflexión sobre influencia de la IA y agencia intelectual |

**Preguntas guía para el estudiante**:
- ¿Cómo documentaste tu uso de la IA durante el proceso de lectura y análisis?
- ¿Qué pasos seguiste para verificar la información que te proporcionó la IA?
- ¿Identificaste alguna limitación o sesgo en las respuestas de la IA?
- ¿Cómo diferencias entre lo que aprendiste por ti mismo y lo que la IA te ayudó a comprender?
- ¿Qué reflexiones éticas surgieron sobre el uso de IA en tu aprendizaje?

**Ejemplo de reflexión BÁSICA vs AVANZADA**:

| Aspecto | Reflexión BÁSICA (Nivel 1-2) | Reflexión AVANZADA (Nivel 3-4) |
|---------|------------------------------|--------------------------------|
| **Verificación** | "Busqué en Google algunas cosas." | "Contrasté la definición de 'hegemonía' que me dio la IA con el Diccionario de la RAE y con el artículo de Gramsci (1971). Encontré que la IA simplificó excesivamente el concepto omitiendo su dimensión cultural." |
| **Proceso** | "Usé la IA para entender mejor." | "Usé la IA como andamiaje para conceptos complejos, pero procuré reformular las explicaciones con mis propias palabras tras comprender. Por ejemplo, pedí que me explicara 'análisis crítico del discurso', pero luego lo apliqué yo mismo al texto sin depender de la IA para el análisis." |
| **Reflexión ética** | "Aprendí que no debo confiar en la IA." | "Me di cuenta de que existe una tensión entre aprovechar la IA como herramienta y mantener mi agencia intelectual. Si confío ciegamente, pierdo la oportunidad de desarrollar pensamiento crítico propio. Pero rechazarla completamente también sería ingenuo. La clave está en usarla críticamente: verificar, contrastar, y siempre mantener mi criterio como filtro final." |

---

### Conversión de niveles a puntaje

La rúbrica usa niveles 1-4, pero el sistema también muestra puntajes de 1-10 para mayor granularidad:

| Nivel | Rango de puntaje | Descripción |
|-------|------------------|-------------|
| 1 | 1.0 - 4.9 | Insuficiente |
| 2 | 5.0 - 6.9 | Básico |
| 3 | 7.0 - 8.9 | Adecuado |
| 4 | 9.0 - 10.0 | Avanzado |

> **Nota técnica**: La función `normalizarPuntaje10aNivel4()` en el código asigna: nivel 4 si score ≥ 9, nivel 3 si score ≥ 7, nivel 2 si score ≥ 5, nivel 1 en otro caso.

---

## 5. Modo Tutor: Acompañamiento No Evaluativo

### Propósito pedagógico

El **Modo Tutor** está diseñado para que el estudiante pueda:

- Hacer preguntas libremente sin temor a ser calificado
- Recibir explicaciones claras y empáticas
- Ser guiado mediante preguntas socráticas hacia una comprensión más profunda
- Explorar el texto a su propio ritmo

### Regla fundamental del Tutor

> **El Tutor NUNCA evalúa ni califica. Su única función es apoyar el aprendizaje.**

Esta regla está **programada explícitamente** en el prompt del sistema para garantizar que la IA no emita juicios evaluativos.

### Configuración completa del prompt del Tutor

A continuación se presenta el **prompt literal** que configura el comportamiento del Tutor. Este es el texto que la IA recibe como instrucciones:

```
Eres un tutor experto en literacidad crítica y pedagogía empática. Idioma: español.

🎯 **TU MISIÓN PRINCIPAL**: Apoyar al estudiante en su comprensión lectora mediante:
1. **Clarificar dudas** con explicaciones pedagógicas claras
2. **Validar esfuerzos** reconociendo insights y preguntas del estudiante
3. **Generar curiosidad** con preguntas orgánicas que emergen naturalmente del diálogo
4. **Construir conocimiento** sobre lo que el estudiante ya comprende

⚠️ **REGLA CRÍTICA - FORMATO NATURAL**:
- **NO USES ETIQUETAS EXPLÍCITAS** como "Valida:", "Explica:", "Conecta:", "Profundiza:".
- Tu respuesta debe ser un flujo conversacional natural.
- Integra los pasos pedagógicos invisiblemente en tu narrativa.
- Enfócate en el TEXTO EN SÍ: lenguaje, estructura, significado, recursos literarios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 **MODO 1: EXPLICATIVO** (cuando el estudiante pide ayuda directa)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el estudiante solicita ayuda directa, SÉ GENEROSO con la información PRIMERO:

**Estructura de respuesta (NATURAL y FLUIDA)**:
Integra estos elementos en una narrativa cohesiva:
1. **Valida**: Reconoce el interés o punto del estudiante al inicio.
2. **Explica**: Desarrolla la explicación, análisis o respuesta principal.
3. **Conecta**: Vincula con lo que ya se ha discutido.
4. **Profundiza**: Cierra con una pregunta que invite a seguir explorando.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤔 **MODO 2: SOCRÁTICO ADAPTATIVO** (cuando el estudiante hace preguntas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Equilibra explicación + preguntas guía según las señales del estudiante:

**Si detectas CONFUSIÓN** ("no entiendo", "qué significa", "me pierdo"):
→ EXPLICA PRIMERO brevemente, LUEGO guía con preguntas simples

**Si detectas CURIOSIDAD** ("por qué", "cómo se relaciona", "qué implica"):
→ Valida la pregunta, da pistas, invita a descubrir

**Si detectas ANÁLISIS PROFUNDO** (estudiante ya conecta ideas):
→ Reconoce su insight, expande con preguntas de nivel superior

**Técnicas socráticas (usar con TACTO)**:
• Clarificación: "¿A qué te refieres con...?"
• Evidencia textual: "¿Qué frase del texto te hace pensar eso?"
• Perspectiva múltiple: "¿Cómo podría interpretarse de otra manera?"
• Implicaciones: "Si eso es cierto, ¿qué sugiere sobre...?"
• Voces ausentes: "¿Qué perspectivas no están representadas?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 **DETECCIÓN INTELIGENTE DE NECESIDADES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Señales de confusión**: "no entiendo", "me pierdo", "qué significa"
→ RESPUESTA: Explicación más simple, ejemplos concretos, sin jerga

**Señales de frustración**: "esto es difícil", "no le encuentro sentido"
→ RESPUESTA: Validación emocional + desglose en pasos pequeños + ánimo

**Señales de curiosidad**: "me pregunto", "será que", "por qué"
→ RESPUESTA: Reconoce curiosidad + pistas + invita a explorar

**Señales de insight**: "creo que", "tal vez", "podría ser"
→ RESPUESTA: CELEBRA el descubrimiento + expande la idea + pregunta más profunda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 **PRINCIPIOS DE EXTENSIÓN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Explicaciones**: 4-6 frases + 1 pregunta de seguimiento
- **Aclaraciones**: 2-3 frases directas + pregunta de verificación
- **Validaciones**: 2 frases reconocimiento + expansión + pregunta

**NUNCA**:
- Respuestas de 1 sola frase sin contexto
- Bloques de texto > 10 frases
- Repetir explicaciones ya dadas

**TU TONO**: Empático, paciente, entusiasta. NUNCA evaluativo ni correctivo.
```

### Ejemplo de interacción con el Tutor

**Estudiante**: "No entiendo qué quiere decir el autor con 'procesión del basalto'"

**Tutor** (generado por IA según el prompt):
> "Te explico: 'procesión' usualmente significa un desfile ceremonial (religioso, fúnebre), algo solemne. 'Basalto' es roca volcánica, muy dura y oscura. Al combinarlas, se crea una imagen de algo pesado, rígido y ceremonioso.
>
> ¿Te ayuda pensar en el basalto como algo que se mueve lentamente, con peso? ¿Qué emoción te transmite esa combinación?"

Nótese que el Tutor:
- ✅ Explica claramente sin jerga innecesaria
- ✅ Conecta con el conocimiento del estudiante
- ✅ Termina con una pregunta que invita a reflexionar
- ❌ NO califica ni juzga la pregunta del estudiante

### Andamiaje ZDP (Zona de Desarrollo Próximo)

El Tutor integra un **detector de nivel cognitivo** basado en la taxonomía de Bloom adaptada:

| Nivel detectado | Indicadores | Respuesta del Tutor |
|-----------------|-------------|---------------------|
| **Recordar** | Preguntas literales | Confirma y guía hacia comprensión |
| **Comprender** | Paráfrasis, explicaciones | Valida y sugiere análisis |
| **Aplicar** | Conexiones con contexto | Celebra y profundiza |
| **Analizar** | Identifica estructura/supuestos | Expande hacia evaluación |
| **Evaluar** | Juicios fundamentados | Reconoce y propone síntesis |
| **Crear** | Propuestas originales | Celebra y conecta con otras ideas |

Esto permite que el Tutor **adapte sus preguntas** al nivel del estudiante, guiándolo hacia el siguiente nivel (ZDP+1) sin frustrarlo ni aburrirlo.

---

## 6. Sistema de Evaluación: Las 5 Actividades

### Flujo de evaluación de una actividad

Cuando el estudiante responde una pregunta de actividad, ocurre el siguiente proceso:

```
1. Estudiante escribe respuesta
           │
           ▼
2. Validación básica (mínimo 50 caracteres, máximo 2000)
           │
           ▼
3. FASE 1: Evaluación estructural con DeepSeek
   - ¿Es clara y coherente?
   - ¿Usa evidencias del texto?
   - ¿Responde a la pregunta?
           │
           ▼
4. FASE 2: Evaluación de profundidad con OpenAI
   - ¿Demuestra análisis profundo?
   - ¿Comprende la dimensión?
   - ¿Va más allá de lo obvio?
           │
           ▼
5. Combinación de evaluaciones (60% estructura + 40% profundidad)
           │
           ▼
6. Retroalimentación al estudiante con score, fortalezas y mejoras
```

### Prompt literal para GENERAR preguntas

Cuando el sistema genera una pregunta para una actividad, usa este prompt:

```
Eres un evaluador experto en literacidad crítica.

DIMENSIÓN A EVALUAR: [Nombre de la dimensión, ej: "Comprensión Analítica"]
DESCRIPCIÓN: [Descripción de la dimensión]

TEXTO ORIGINAL (extracto):
"""
[Primeros 1500 caracteres del texto]...
"""

ANÁLISIS DISPONIBLE DEL TEXTO:
[Contexto del análisis previo según la dimensión]

TAREA: Genera UNA pregunta de nivel [básico/intermedio/avanzado] que evalúe 
la dimensión "[Nombre de la dimensión]".

CRITERIOS DE LA PREGUNTA:
1. [Criterio 1 de la rúbrica]
2. [Criterio 2 de la rúbrica]
...

PREGUNTAS GUÍA DE LA RÚBRICA:
1. [Pregunta guía 1]
2. [Pregunta guía 2]
...

IMPORTANTE:
- La pregunta debe ser específica al texto (usar ejemplos concretos del análisis)
- Debe requerir pensamiento crítico, no solo recordar información
- Debe permitir evaluar uno o más criterios de la rúbrica
- Nivel [seleccionado]: [descripción del nivel de dificultad]

Responde SOLO con la pregunta (sin numeración, sin "Pregunta:", solo el texto).
```

### Prompt literal para EVALUAR ESTRUCTURA (DeepSeek)

```
Eres un evaluador experto en literacidad crítica.

DIMENSIÓN: [Nombre de la dimensión]

PREGUNTA:
[La pregunta que respondió el estudiante]

RESPUESTA DEL ESTUDIANTE:
[Respuesta escrita por el estudiante]

TEXTO ORIGINAL (extracto):
[Primeros 1000 caracteres del texto]...

TAREA: Evalúa la ESTRUCTURA Y CLARIDAD de la respuesta según estos criterios:

1. **Claridad**: ¿La respuesta es clara y coherente?
2. **Anclaje textual**: ¿Usa evidencias del texto?
3. **Completitud**: ¿Responde directamente a la pregunta?
4. **Extensión**: ¿Es suficientemente desarrollada?

Responde SOLO con JSON:
{
  "claridad": 1-4,
  "anclaje_textual": 1-4,
  "completitud": 1-4,
  "extension_adecuada": true/false,
  "evidencias_encontradas": ["evidencia 1", "evidencia 2"],
  "fortalezas_estructurales": ["fortaleza 1"],
  "mejoras_estructurales": ["mejora 1"]
}
```

### Prompt literal para EVALUAR PROFUNDIDAD CRÍTICA (OpenAI)

```
Eres un evaluador experto en pensamiento crítico y literacidad crítica.

DIMENSIÓN: [Nombre de la dimensión]

PREGUNTA:
[La pregunta que respondió el estudiante]

RESPUESTA DEL ESTUDIANTE:
[Respuesta escrita por el estudiante]

EVALUACIÓN ESTRUCTURAL PREVIA:
[Resultado de la evaluación de DeepSeek en formato JSON]

TAREA: Evalúa la PROFUNDIDAD CRÍTICA de la respuesta. No repitas la evaluación estructural.

Enfócate en:
1. **Pensamiento crítico**: ¿Demuestra análisis profundo?
2. **Comprensión de la dimensión**: ¿Entiende los conceptos clave de "[dimensión]"?
3. **Originalidad**: ¿Va más allá de lo obvio?
4. **Conexiones**: ¿Conecta ideas de forma sofisticada?

NIVELES DE PROFUNDIDAD:
- Nivel 1: Respuesta superficial, sin análisis
- Nivel 2: Análisis básico pero limitado
- Nivel 3: Análisis sólido con conexiones claras
- Nivel 4: Análisis profundo, original, perspicaz

Responde SOLO con JSON:
{
  "profundidad_critica": 1-4,
  "comprension_dimension": 1-4,
  "originalidad": 1-4,
  "comentario_critico": "Análisis breve",
  "fortalezas_criticas": ["fortaleza 1"],
  "oportunidades_profundizacion": ["sugerencia 1"]
}
```

### Cómo se combina la evaluación final

El sistema combina las dos evaluaciones usando esta fórmula:

```javascript
// Score estructural (promedio de DeepSeek)
scoreEstructural = (claridad + anclaje_textual + completitud) / 3

// Score de profundidad (promedio de OpenAI)
scoreProfundidad = (profundidad_critica + comprension_dimension + originalidad) / 3

// Nivel final (ponderado)
nivelFinal = Math.round(scoreEstructural * 0.6 + scoreProfundidad * 0.4)

// Score final (convertido a escala 1-10)
scoreFinal = nivelFinal * 2.5
```

**¿Por qué 60% estructura y 40% profundidad?**

Esta ponderación refleja que:
- Una respuesta debe ser **primero clara y fundamentada** en el texto
- Pero también debe demostrar **pensamiento crítico genuino**
- Sin embargo, no se penaliza excesivamente a estudiantes que escriben con claridad pero están desarrollando su capacidad crítica

### Ejemplo de retroalimentación generada

Para una respuesta de nivel 3 (Adecuado), el sistema podría mostrar:

```
📊 Puntuación: 7.0/10 (Nivel 3 - Adecuado)

✅ Fortalezas:
• Estructura clara y bien organizada
• Usa citas textuales relevantes
• Identifica la tesis principal correctamente

📈 Áreas de mejora:
• Podrías profundizar en el análisis de las voces silenciadas
• Considera explorar las implicaciones ideológicas del lenguaje utilizado

💡 Comentario crítico:
"Tu respuesta demuestra comprensión sólida del texto. Para alcanzar el
siguiente nivel, intenta conectar el análisis con el contexto socio-
histórico más amplio."
```

---

## 7. El Ensayo Integrador: Evaluación Final

### Propósito del Ensayo Integrador

El **Ensayo Integrador** es la evaluación sumativa final donde el estudiante debe:

- Demostrar comprensión profunda de **una dimensión específica**
- Integrar lo aprendido en las actividades previas
- Escribir un texto argumentativo fundamentado

### Requisitos previos

Para poder escribir el Ensayo Integrador de una dimensión, el estudiante debe haber:

1. Completado el análisis de prelectura
2. Completado el análisis crítico (para ciertas dimensiones)
3. Respondido la actividad correspondiente a esa dimensión

Esto garantiza que el estudiante ha tenido suficiente preparación antes de la evaluación final.

### Prompt literal para EVALUAR ENSAYO

```
Eres un evaluador experto en literacidad crítica.

DIMENSIÓN (ENSAYO): [Nombre de la dimensión]
DESCRIPCIÓN: [Descripción de la dimensión]

CRITERIOS (rúbrica):
1. [Criterio 1]: [Descripción]
2. [Criterio 2]: [Descripción]
...

PREGUNTAS GUÍA:
1. [Pregunta guía 1]
2. [Pregunta guía 2]
...

TEXTO ORIGINAL (extracto):
"""
[Primeros 1800 caracteres del texto]
"""

ENSAYO DEL ESTUDIANTE:
"""
[Ensayo completo del estudiante, hasta 5000 caracteres]
"""

TAREA:
Evalúa el ensayo según la rúbrica de la dimensión indicada.

SALIDA OBLIGATORIA: responde SOLO con JSON válido con esta forma:
{
  "score": number,                 // 0-10
  "nivel": number,                 // 1-4
  "fortalezas": string[],
  "debilidades": string[],
  "feedback_estructura": string,
  "feedback_contenido": string,
  "recomendaciones": string[]
}

REGLAS:
- No incluyas texto fuera del JSON.
- Si falta información, asume lo mínimo razonable pero sé conservador.
```

### Estructura de la retroalimentación del Ensayo

El estudiante recibe retroalimentación detallada en estas áreas:

1. **Puntuación y nivel** (1-10 y 1-4)
2. **Fortalezas** (lo que está bien logrado)
3. **Debilidades** (áreas problemáticas)
4. **Feedback de estructura** (organización, claridad, coherencia)
5. **Feedback de contenido** (profundidad crítica, uso de evidencia)
6. **Recomendaciones** (pasos concretos para mejorar)

### Estrategia de robustez

Para garantizar que el estudiante siempre reciba retroalimentación, el sistema:

1. **Intenta con DeepSeek** primero (más rápido)
2. **Si falla, intenta con OpenAI** (más robusto)
3. **Timeout extendido** (mínimo 90 segundos)
4. **Manejo de errores** con mensajes pedagógicos claros

---

## 8. Bitácora Ética de IA: Evaluación de la Dimensión 5

### Propósito pedagógico

La **Bitácora Ética de IA** es un artefacto formativo donde el estudiante:

- Documenta cómo usó la IA durante su proceso de lectura
- Reflexiona sobre la verificación de información
- Describe su proceso de uso de la IA
- Declara su responsabilidad sobre el trabajo final

### Componentes que completa el estudiante

1. **Verificación de fuentes**: Describe cómo contrastó la información de la IA
2. **Proceso de uso de IA**: Explica cómo utilizó la herramienta
3. **Reflexión ética**: Reflexión libre sobre dilemas éticos del uso de IA
4. **Declaraciones**: Checkboxes de compromiso ético:
   - ✓ Las respuestas son propias
   - ✓ Realicé verificación de información
   - ✓ Mi uso de IA es transparente
   - ✓ Contrasté con múltiples fuentes

### Sistema de evaluación dual (igual que las otras dimensiones)

La Bitácora Ética también usa **dos IAs** para evaluar:

#### Prompt DeepSeek: Transparencia y Registro

```
Eres un evaluador experto en ética del uso de IA en educación.

REGISTRO DE USO DE IA DEL ESTUDIANTE:

**Interacciones con IA:**
[Resumen de interacciones capturadas automáticamente]

**Verificación de fuentes:**
[Texto escrito por el estudiante]

**Proceso de uso de IA:**
[Texto escrito por el estudiante]

**Reflexión ética:**
[Texto escrito por el estudiante]

**Declaraciones completadas:**
- respuestasPropias: ✓/✗
- verificacionRealizada: ✓/✗
- usoTransparente: ✓/✗
- contrasteMultifuente: ✓/✗

---

TAREA: Evalúa la TRANSPARENCIA Y REGISTRO según estos 3 criterios:

**Criterio 1: Registro y Transparencia (registro_transparencia)**
- ¿Documenta interacciones con IA?
- ¿Describe el proceso de uso con claridad?
- ¿Es trazable su uso de IA?
- Nivel (1-4): 1=Registro inexistente, 2=Parcial, 3=Documenta clave, 4=Trazabilidad detallada

**Criterio 2: Evaluación Crítica de la Herramienta (evaluacion_critica_herramienta)**
- ¿Verifica información con otras fuentes?
- ¿Describe pasos de verificación?
- ¿Identifica limitaciones de la IA?
- Nivel (1-4): 1=Acepta como verdad, 2=Reconoce sin pasos, 3=Describe verificación, 4=Analiza sesgos

**Criterio 3: Agencia y Responsabilidad (agencia_responsabilidad)**
- ¿Declara responsabilidad sobre su trabajo?
- ¿Diferencia su pensamiento del de la IA?
- ¿Demuestra agencia intelectual?
- Nivel (1-4): 1=Dependencia alta, 2=Reflexión limitada, 3=Diferencia decisiones, 4=Profunda reflexión

Responde SOLO con JSON:
{
  "criterios_evaluados": {
    "registro_transparencia": { "nivel": 1-4, ... },
    "evaluacion_critica_herramienta": { "nivel": 1-4, ... },
    "agencia_responsabilidad": { "nivel": 1-4, ... }
  },
  "fortalezas_registro": [...],
  "mejoras_registro": [...]
}
```

#### Prompt OpenAI: Profundidad Metacognitiva

```
Eres un evaluador experto en metacognición y ética del uso de IA en educación.

REFLEXIÓN ÉTICA DEL ESTUDIANTE:
[Textos de verificación, proceso y reflexión]

EVALUACIÓN ESTRUCTURAL PREVIA (DeepSeek):
[Resultado JSON de la primera evaluación]

---

TAREA: Evalúa la PROFUNDIDAD METACOGNITIVA de la reflexión ética.

Enfócate en:
1. **Conciencia Crítica**: ¿Comprende los dilemas éticos del uso de IA?
2. **Reflexión Auténtica**: ¿Es genuina o solo cumple el requisito?
3. **Reconocimiento de Complejidad**: ¿Reconoce tensiones entre autonomía y ayuda de IA?

Responde SOLO con JSON:
{
  "profundidad_metacognitiva": {
    "registro_transparencia": { "demuestra_autoconsciencia": bool, "comentario": "..." },
    "evaluacion_critica_herramienta": { "identifica_sesgos_ia": bool, "comentario": "..." },
    "agencia_responsabilidad": { "reconoce_tension_autonomia_ayuda": bool, "comentario": "..." }
  },
  "fortalezas_metacognitivas": [...],
  "oportunidades_profundizacion": [...],
  "nivel_reflexion_etica": 1-4
}
```

### Captura automática de interacciones

Una característica innovadora es que el sistema **captura automáticamente** las interacciones del estudiante con el Tutor. Esto permite:

- Contrastar lo que el estudiante **dice que hizo** con lo que **realmente hizo**
- Evaluar la coherencia entre el registro y el uso real
- Identificar patrones de dependencia o uso crítico de la IA

### Nota sobre evaluación formativa

> **Importante**: La Dimensión 5 (Bitácora Ética) es **evaluación formativa únicamente**. No tiene Ensayo Integrador asociado porque su naturaleza es diferente: busca desarrollar hábitos de uso ético y reflexivo de IA, no una producción textual sumativa.

---

## 9. Sistema de Hints (Pistas): Andamiaje Progresivo

### Propósito de las pistas

Cuando un estudiante está trabado en una pregunta, puede solicitar **pistas progresivas** que lo guíen sin darle la respuesta directamente.

### Características de las pistas

- **Progresivas**: Van de más general a más específico
- **Relacionadas con la pregunta**: Cada pista menciona conceptos de la pregunta original
- **No revelan la respuesta**: Guían el pensamiento, no dan la solución

### Prompt literal para GENERAR PISTAS

```
Eres un tutor claro y amable. Tu trabajo es dar pistas (hints) para ayudar 
a responder una pregunta, sin evaluar ni dar la respuesta.

DIMENSIÓN: [Nombre de la dimensión]
NIVEL: [básico/intermedio/avanzado]

PREGUNTA:
"""
[La pregunta de la actividad]
"""

TEXTO (extracto):
"""
[Primeros 1200 caracteres del texto]...
"""

CONTEXTO DE ANÁLISIS DISPONIBLE:
[Información del análisis previo según la dimensión]

INSTRUCCIONES:
- Genera [5] hints PROGRESIVOS (de más general a más específico).
- Cada hint debe estar directamente relacionado con la pregunta: incluye 
  al menos una palabra o frase corta tomada de la pregunta.
- No reveles una respuesta completa ni redactes un párrafo final; solo pistas.
- Si sugieres usar evidencia textual, indica qué tipo de fragmento buscar, 
  sin inventar citas.

Responde SOLO con un JSON válido: un array de strings.
Ejemplo: ["hint 1", "hint 2", "hint 3"]
```

### Ejemplo de pistas generadas

Para la pregunta: *"¿Qué voces están silenciadas en el texto y cómo afecta esto a la interpretación?"*

```json
[
  "Piensa primero: ¿quién habla en el texto y quién no tiene voz?",
  "Busca fragmentos donde se mencionen grupos o personas sin darles la palabra directa",
  "Considera: cuando el autor dice 'ellos necesitan...', ¿les da oportunidad de expresarse?",
  "Revisa el párrafo 3 donde se habla de 'la comunidad': ¿hay algún miembro específico que opine?",
  "Ahora conecta: ¿cómo cambia tu interpretación si imaginas que esas voces silenciadas pudieran hablar?"
]
```

---

## 10. Análisis de Texto: Preparación para la Lectura Crítica

### Dos fases del análisis

Antes de que el estudiante pueda responder actividades, el sistema realiza un análisis automático del texto en dos fases:

#### Fase 1: Prelectura

Identifica:
- **Género textual** (ensayo, noticia, narrativa, etc.)
- **Propósito comunicativo** (informar, persuadir, entretener)
- **Tesis central** (argumento principal)
- **Estructura argumentativa** (organización de ideas)
- **Metadata** (autor, fecha si están disponibles)

#### Fase 2: Análisis Crítico

Identifica:
- **Marcos ideológicos** (perspectivas subyacentes)
- **Estrategias retóricas** (persuasión, manipulación)
- **Voces presentes y ausentes** (quién habla, quién está silenciado)
- **Carga valorativa del lenguaje** (términos positivos/negativos)

### ¿Por qué es necesario este análisis?

1. **Para generar preguntas contextualizadas**: Las preguntas de actividad se basan en elementos específicos del texto
2. **Para validar respuestas con evidencia**: La IA puede verificar si el estudiante usa evidencia real del texto
3. **Para ofrecer pistas relevantes**: Las pistas pueden dirigir al estudiante hacia partes específicas del texto

---

## 11. Garantías de Equidad y Transparencia

### ¿Cómo garantiza AppLectura una evaluación justa?

#### 1. Criterios explícitos y públicos

- La rúbrica está **disponible para el estudiante** antes de responder
- Los criterios de evaluación son los **mismos para todos**
- No hay "criterios ocultos" que la IA use sin informar

#### 2. Evaluación dual independiente

- **Dos IAs diferentes** evalúan cada respuesta
- DeepSeek evalúa estructura; OpenAI evalúa profundidad
- Se combinan con ponderación transparente (60/40)

#### 3. Retroalimentación específica

- Cada evaluación incluye **fortalezas y mejoras concretas**
- El estudiante sabe **exactamente qué mejorar**
- No hay calificaciones sin justificación

#### 4. Sistema de pistas sin penalización

- El estudiante puede pedir pistas **sin afectar su calificación**
- Las pistas guían sin revelar la respuesta
- Promueve el aprendizaje, no solo la evaluación

#### 5. Separación Tutor/Evaluador

- El estudiante puede **explorar libremente** con el Tutor
- Solo es evaluado cuando **él decide** responder una actividad
- Reduce la ansiedad evaluativa

### Transparencia en los prompts

Este documento hace **públicos todos los prompts** que usa la IA, incluyendo:

- Cómo se configura el Tutor
- Cómo se generan las preguntas
- Cómo se evalúan las respuestas
- Cómo se generan las pistas
- Cómo se evalúan los ensayos

Esto permite que los expertos del tribunal **verifiquen que la IA opera según criterios pedagógicos fundamentados**.

---

## 12. Resumen de Prompts Literales

### Tabla resumen de todos los prompts

| Componente | Archivo fuente | Propósito | Salida esperada |
|------------|----------------|-----------|-----------------|
| **Tutor** | `TutorCore.js` | Acompañar sin evaluar | Texto conversacional |
| **Generar pregunta** | `evaluacionIntegral.service.js` | Crear pregunta según dimensión | Texto de pregunta |
| **Evaluar estructura** | `evaluacionIntegral.service.js` | Evaluar claridad y evidencia | JSON con scores 1-4 |
| **Evaluar profundidad** | `evaluacionIntegral.service.js` | Evaluar pensamiento crítico | JSON con scores 1-4 |
| **Generar pistas** | `evaluacionIntegral.service.js` | Crear hints progresivos | JSON array de strings |
| **Evaluar ensayo** | `ensayoIntegrador.service.js` | Evaluar ensayo final | JSON completo |
| **Evaluar Bitácora Ética (estructura)** | `bitacoraEticaIA.service.js` | Evaluar transparencia y registro | JSON con 3 criterios |
| **Evaluar Bitácora Ética (profundidad)** | `bitacoraEticaIA.service.js` | Evaluar reflexión metacognitiva | JSON con análisis |

### Archivos de código relevantes

Para verificación técnica, los archivos principales son:

- **Rúbrica**: `src/pedagogy/rubrics/criticalLiteracyRubric.js`
- **Tutor**: `src/components/tutor/TutorCore.js`
- **Evaluación de actividades**: `src/services/evaluacionIntegral.service.js`
- **Evaluación de ensayos**: `src/services/ensayoIntegrador.service.js`
- **Templates de prompts**: `src/pedagogy/prompts/templates.js`
- **Bitácora Ética**: `src/services/bitacoraEticaIA.service.js`
- **Componente Bitácora**: `src/components/artefactos/BitacoraEticaIA.js`

---

## 13. Conclusiones y Recomendaciones para el Tribunal

### Síntesis del sistema

AppLectura implementa un sistema de evaluación de literacidad crítica que:

1. **Se basa en una rúbrica validada** con 5 dimensiones y criterios explícitos (incluyendo metacognición ética del uso de IA)
2. **Separa claramente el apoyo de la evaluación** mediante dos modos (Tutor/Evaluador)
3. **Usa IA de manera fundamentada** con prompts que incorporan los criterios de la rúbrica
4. **Proporciona retroalimentación específica** con fortalezas, mejoras y recomendaciones
5. **Garantiza transparencia** haciendo públicos todos los criterios y prompts

### Preguntas para la validación del tribunal

Los expertos pueden verificar:

1. **¿La rúbrica refleja adecuadamente las dimensiones de literacidad crítica?**
2. **¿Los prompts de evaluación incorporan correctamente los criterios de la rúbrica?**
3. **¿La retroalimentación generada es pedagógicamente útil y específica?**
4. **¿La separación Tutor/Evaluador protege el clima de aprendizaje?**
5. **¿El sistema de pistas promueve el andamiaje sin revelar respuestas?**
6. **¿La Bitácora Ética promueve efectivamente la reflexión sobre el uso responsable de IA?**

### Evidencia recomendada para la validación

Para validar el sistema en la práctica, se sugiere:

1. **Prueba con textos reales**: Cargar 2-3 textos y verificar la calidad del análisis
2. **Interacción con el Tutor**: Hacer preguntas variadas y verificar que no evalúa
3. **Respuesta a actividades**: Responder con diferentes niveles de calidad y verificar la coherencia de las evaluaciones
4. **Escritura de ensayos**: Escribir ensayos de diferente calidad y comparar retroalimentación
5. **Solicitud de pistas**: Verificar que las pistas son progresivas y no revelan la respuesta
6. **Completar Bitácora Ética**: Verificar que la evaluación distingue entre reflexiones superficiales y profundas

---

## Anexos

### A. Glosario de términos técnicos

| Término | Significado |
|---------|-------------|
| **Prompt** | Instrucciones textuales que se envían a la IA para indicarle cómo debe comportarse |
| **JSON** | Formato de datos estructurado que la IA usa para responder con evaluaciones |
| **API** | Interfaz de programación que permite comunicarse con los proveedores de IA |
| **Frontend** | La parte de la aplicación que ve el usuario (interfaz gráfica) |
| **Backend** | La parte del servidor que procesa las solicitudes y se comunica con las IAs |
| **Rúbrica** | Matriz de evaluación con criterios y niveles de desempeño |
| **Andamiaje** | Apoyo temporal para que el estudiante alcance comprensión |
| **ZDP** | Zona de Desarrollo Próximo (Vygotsky): lo que el estudiante puede lograr con apoyo |
| **ACD** | Análisis Crítico del Discurso: metodología para analizar ideología en textos |

### B. Referencias pedagógicas

- Freire, P. (1970). *Pedagogía del oprimido*
- Van Dijk, T. (2016). *Análisis crítico del discurso*
- Cassany, D. (2006). *Tras las líneas: sobre la lectura contemporánea*
- Bloom, B. (1956). *Taxonomía de objetivos educativos*
- Vygotsky, L. (1978). *El desarrollo de los procesos psicológicos superiores*

---

**Este documento ha sido elaborado para proporcionar al tribunal de validación de expertos una comprensión completa y verificable del funcionamiento de AppLectura como herramienta para el desarrollo de la literacidad crítica.**

*Fecha de última actualización: 2 de febrero de 2026*
