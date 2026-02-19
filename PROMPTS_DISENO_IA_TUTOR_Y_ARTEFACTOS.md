# AppLectura — Diseño de Prompts de IA

### Tutor socrático + Artefactos pedagógicos

| | |
|---|---|
| **Fecha** | 5 de febrero de 2026 |
| **Última validación contra código** | 17 de febrero de 2026 |
| **Audiencia** | Expertos evaluadores en pedagogía |

---

Este documento explica cómo están diseñados los **prompts** (instrucciones escritas) que guían las respuestas de la IA en AppLectura. Se distinguen dos familias:

| Familia | Función | ¿Califica? |
|---|---|:---:|
| **Tutor socrático** | Acompaña, clarifica, pregunta, andamia | No |
| **Artefactos pedagógicos** | Genera preguntas, pistas y evaluación criterial | Sí |

> **Lectura rápida para expertos (2 min)**
>
> 1. La IA **no responde "libremente"**: responde según un diseño pedagógico explícito.
> 2. En **Tutor**, acompaña, explica y pregunta — nunca califica.
> 3. En **Práctica**, evalúa con criterios y rúbrica.
> 4. En **Ensayo final**, aplica evaluación estructurada con retroalimentación accionable.
> 5. La diferencia entre respuestas se debe al **modo pedagógico activado**, no a improvisación del modelo.

---

## 1 · Principios generales de diseño

Estos principios aplican a **todos** los prompts del sistema.

### 1.1 Separación de modos

| Modo | Estilo | Restricción clave |
|---|---|---|
| **Tutor** | Lenguaje natural, conversación, andamiaje | Prohíbe la evaluación |
| **Evaluador** | Instrucciones explícitas, criterios, rúbrica | Salida obligatoria en formato estructurado |

El estudiante recibe apoyo sin sentir que está siendo calificado; la evaluación ocurre solo en flujos diseñados para ello.

### 1.2 Control de formato de salida

Los prompts evaluativos fuerzan el formato con dos capas:

1. **Instrucción en el prompt**: "Responde SOLO con JSON válido."
2. **Validación posterior**: el sistema normaliza la salida para que la retroalimentación llegue legible y utilizable en aula.

### 1.3 Anclaje en evidencia (*grounding*)

Cada prompt incluye:

- **Extractos del texto original** (recortados por costo y latencia).
- **Contexto del análisis previo** (metadata, tesis, voces, marcos ideológicos) cuando existe.

Así se privilegia que la IA trabaje con el material de lectura y no "alucine" fuera del texto.

### 1.4 Truncado deliberado

| Tarea | Extracto máximo |
|---|---|
| Generación de pregunta | ~1 500 caracteres |
| Evaluación de respuesta | ~1 000 caracteres |
| Ensayo integrador | ~1 800 car. (texto) + ~5 000 (ensayo) |

El recorte reduce costos, tiempos y evita inestabilidad del prompt por exceso de contexto.

### 1.5 Configuración en producción

La configuración de proveedores se resuelve en el servidor (Render), no en el navegador del estudiante. **La conducta pedagógica depende del prompt y del modo activo, no de ajustes manuales del usuario.**

---

## 2 · Tutor socrático — Diseño del prompt conversacional

> Implementación: [src/components/tutor/TutorCore.js](src/components/tutor/TutorCore.js)

El tutor funciona como conversación guiada con **tres capas** de mensaje:

| Capa | Contenido |
|---|---|
| **System** | Reglas pedagógicas: misión, tono, restricciones |
| **History** | Conversación previa condensada |
| **User** | Pregunta del estudiante o acción con fragmento |

### 2.1 System prompt: "Topic guard" + naturalidad

El núcleo es un bloque extenso que define:

- **Misión pedagógica** — clarificar, validar, generar curiosidad, construir sobre comprensión previa.
- **Tono** — empático, paciente, entusiasta por las preguntas.
- **Formato natural** — prohíbe etiquetas mecánicas y obliga a un flujo conversacional.

> **Idea clave**: la pedagogía es **implícita** (se nota en el estilo), no una lista de instrucciones visibles al estudiante.

Extracto representativo:

```text
REGLA CRÍTICA - FORMATO NATURAL:
- NO USES ETIQUETAS EXPLÍCITAS como "Valida:", "Explica:", "Conecta:", "Profundiza:".
- Tu respuesta debe ser un flujo conversacional natural.
- Integra los pasos pedagógicos invisiblemente en tu narrativa.
- Enfócate en el TEXTO EN SÍ...
```

### 2.2 Dos sub-modos: explicativo vs socrático

| Sub-modo | Se activa cuando… | Comportamiento |
|---|---|---|
| **Explicativo** | El estudiante pide ayuda directa | Valida → explica → conecta → cierra con máx. 1 pregunta |
| **Socrático adaptativo** | El estudiante pregunta o explora | Equilibra explicación breve + preguntas guía con técnicas socráticas |

El tutor así evita la rigidez: explica cuando hay confusión, pregunta cuando hay disposición a descubrir.

### 2.3 Memoria pedagógica (anti-redundancia)

Un bloque adicional instruye al tutor a:

- No repetir preguntas ya formuladas.
- Reconocer lo discutido y **profundizar** en vez de iterar.
- Progresar: comprensión → análisis → síntesis/evaluación.

Esto evita el "loop" típico de chatbots.

### 2.4 Acciones predefinidas

El tutor ofrece acciones rápidas que **no cambian el system prompt base**, sino que añaden directivas cortas coherentes:

| Acción | Directiva resumida |
|---|---|
| **Explicar** | Validar + explicar + conectar + 1 pregunta; sin etiquetas |
| **Resumir** | 3–4 frases fluidas + pregunta opcional |
| **Profundizar** | Análisis profundo + pregunta de síntesis |
| **Preguntar** | 2–3 preguntas abiertas (sin estilo "examen") |

### 2.5 Anclaje al fragmento seleccionado

Para cada acción, el mensaje del usuario se construye con:

- **Fragmento seleccionado** por el estudiante.
- **Contexto adicional** (texto completo truncado), si existe.

Esto **ancla** la respuesta a lo que el estudiante está leyendo en ese momento.

### 2.6 Micro-prompts adaptativos

Antes de enviar el mensaje, el sistema detecta señales emocionales y cognitivas del estudiante, y agrega una guía contextual breve:

| Señal detectada | Ajuste del tutor |
|---|---|
| Confusión | 2–3 frases simples + pregunta de verificación |
| Frustración | Validación emocional + pasos pequeños |
| Curiosidad | Pistas (sin respuesta total) + pregunta abierta |
| Insight | Celebrar + conectar + pregunta de nivel superior |

Esto permite adaptar el estilo **sin cambiar la misión global**.

### 2.7 Regla de "preguntas orgánicas"

El system prompt incluye una regla específica:

- **Nunca** preguntar sobre palabras que salieron del propio tutor.
- Preguntar **solo** sobre el texto original y lo que el estudiante aporta.

Esto evita interacciones artificiales del tipo "¿cómo se relaciona la palabra X con…?" cuando X la dijo el tutor.

---

## 3 · Artefactos pedagógicos — Preguntas, pistas y evaluación

> Implementación: [src/services/evaluacionIntegral.service.js](src/services/evaluacionIntegral.service.js)

Estos prompts persiguen tres objetivos:

1. **Estandarizar** entradas y salidas (formato consistente).
2. **Conectar** con la rúbrica real (criterios y preguntas guía inyectados en el prompt).
3. **Permitir trazabilidad**: evidencias, fortalezas y mejoras como listas explícitas.

### 3.1 Generación de preguntas

El prompt se autodefine como "evaluador experto en literacidad crítica" e incluye:

- La **dimensión** (nombre + descripción).
- **Criterios y preguntas guía** de la rúbrica.
- **Extracto del texto** + contexto del análisis, si existe.
- Restricción: "Responde SOLO con la pregunta, sin prefijo 'Pregunta:'."

> La pregunta no es genérica: nace de la dimensión y del análisis del texto.

### 3.2 Generación de pistas (*hints*)

Diseñada como apoyo **no evaluativo**:

- Rol: "tutor claro y amable".
- Regla: "sin evaluar ni dar la respuesta".
- **Progresividad**: de general a específico, en formato de lista escalonada.

### 3.3 Evaluación de respuesta — Doble fase

> **Nota pedagógica**: la evaluación se separa en dos fases para no confundir "escribir ordenado" con "pensar críticamente".

#### Fase 1 → Estructura y claridad

| Criterio | Pregunta orientadora |
|---|---|
| Claridad | ¿Se entiende la respuesta? |
| Anclaje textual | ¿Cita o refiere el texto original? |
| Completitud | ¿Aborda lo que pide la pregunta? |
| Extensión | ¿Tiene desarrollo suficiente? |

Salida: niveles 1–4 + evidencias + fortalezas/mejoras.

> Esta fase asegura que la respuesta sea comprensible y pertinente **antes** de exigir complejidad crítica.

#### Fase 2 → Profundidad crítica

| Criterio | Pregunta orientadora |
|---|---|
| Pensamiento crítico | ¿Cuestiona, analiza, infiere? |
| Comprensión de la dimensión | ¿Entiende qué se le pide? |
| Originalidad | ¿Aporta perspectiva propia? |
| Conexiones | ¿Relaciona con otros conceptos? |

El prompt recibe la evaluación de la Fase 1 con instrucción explícita: **"No repitas la evaluación estructural."** Así la segunda fase aporta valor propio (profundidad).

#### Combinación de resultados

| Componente | Peso | Escala |
|---|---|---|
| Score estructural | **60 %** | 1–4 (promedio de claridad, anclaje, completitud) |
| Score profundidad | **40 %** | 1–4 (promedio de profundidad, comprensión, originalidad) |
| **Nivel final** | | Redondeo ponderado → escala 0–10 |

La salida final incluye: fortalezas/mejoras combinadas, evidencias y detalles por sub-criterio.

---

## 4 · Ensayo integrador — Evaluación con rúbrica completa

> Implementación: [src/services/ensayoIntegrador.service.js](src/services/ensayoIntegrador.service.js)

El prompt del ensayo se construye con:

- **Dimensión** + descripción.
- **Criterios y preguntas guía** de la rúbrica.
- **Extracto del texto** + el ensayo del estudiante.
- **Salida obligatoria** en formato estructurado para retroalimentación clara y comparable.

El sistema añade una instrucción de sistema separada ("Responde estrictamente en JSON") y aplica limpieza previa del texto para mejorar estabilidad.

---

## 5 · Bitácora Ética de IA — Doble mirada

> Implementación: [src/services/bitacoraEticaIA.service.js](src/services/bitacoraEticaIA.service.js)

El diseño es deliberadamente **dual** para evitar confundir una bitácora "bien escrita" con una reflexión realmente crítica:

| Evaluador | Foco | Pregunta central |
|---|---|---|
| **Transparencia** | Registro, trazabilidad, verificación, agencia | ¿Está documentado el uso de IA? |
| **Profundidad** | Calidad metacognitiva de la reflexión ética | ¿Es reflexión auténtica o solo cumplimiento? |

### 5.1 Evaluador de Transparencia

El prompt incorpora:

- Resumen de interacciones tutor–estudiante (conteo + ejemplos).
- Verificación de fuentes, proceso de uso, reflexión ética.
- Declaraciones tipo checklist.

Evalúa **3 criterios** con descriptores de nivel. Privilegia la evidencia de registro como base mínima de ética académica.

### 5.2 Evaluador de Profundidad

El prompt:

- Recibe la evaluación previa de transparencia (para no repetir).
- Da ejemplos explícitos de reflexión básica vs avanzada.
- Evalúa calidad reflexiva (no solo "cumplimiento").

### 5.3 Fusión de resultados

| Paso | Detalle |
|---|---|
| **Base** | Niveles por criterio del evaluador de transparencia |
| **Ajuste cualitativo** | Fortalezas/mejoras del evaluador de profundidad |
| **Nivel global** | Promedio de criterios con ajuste parcial hacia el nivel metacognitivo |
| **Descriptores** | Se añaden de la rúbrica para interpretación pedagógica |

---

## 6 · Controles defensivos para estabilidad

Aunque el documento se centra en prompts, hay decisiones "de envoltura" que los hacen confiables:

| Control | Propósito |
|---|---|
| **Validación de formato** | Si la salida no viene limpia, el sistema la normaliza |
| **Respuesta de respaldo** | Si falla una evaluación, la experiencia no se rompe |
| **Tiempos diferenciados** | Chat breve vs evaluación extensa |
| **Reglas de extensión** | Se evita evaluar respuestas demasiado cortas o largas |

---

## 7 · Mapa de prompts — Dónde vive cada uno

| Componente | Prompts que contiene | Archivo |
|---|---|---|
| **Tutor socrático** | System prompt, anti-redundancia, acciones, micro-prompts | [TutorCore.js](src/components/tutor/TutorCore.js) |
| **Actividades** | Pregunta, hints, evaluación estructura/profundidad, combinación 60/40 | [evaluacionIntegral.service.js](src/services/evaluacionIntegral.service.js) |
| **Ensayo integrador** | Prompt con rúbrica + formato estricto + limpieza | [ensayoIntegrador.service.js](src/services/ensayoIntegrador.service.js) |
| **Bitácora ética IA** | Prompts duales (transparencia + profundidad) + fusión | [bitacoraEticaIA.service.js](src/services/bitacoraEticaIA.service.js) |

---

## 8 · Equidad y anti-sesgo en los prompts

Se añade un bloque explícito de **equidad/anti-sesgo** en todos los prompts, con estos objetivos:

- Reducir estereotipos y lenguaje discriminatorio.
- Evitar inferencias no justificadas sobre identidad.
- Evitar "normalizar" perspectivas europeas/occidentales como únicas.
- Permitir el análisis crítico de discursos discriminatorios **sin reproducirlos como válidos**.

### 8.1 Patrón reutilizable: "Bias Safety Guard"

En lugar de esperar que el modelo sea neutral, se fuerza por prompt:

| Tipo de regla | Ejemplo |
|---|---|
| **Prohibiciones** | No usar estereotipos ni suposiciones de identidad |
| **Conducta esperada** | Si hay discriminación: analizar críticamente, contextualizar, no amplificar |
| **Equidad evaluativa** | No penalizar dialectos; evaluar razonamiento y evidencia |

Bloque representativo:

```text
EQUIDAD Y NO DISCRIMINACIÓN (OBLIGATORIO):
- No uses estereotipos, lenguaje racista/sexista ni generalizaciones sobre grupos.
- No hagas suposiciones sobre identidad (raza/etnia, género, nacionalidad,
  religión, orientación sexual, discapacidad, clase social).
- Evita eurocentrismo: reconoce pluralidad cultural y contextual.
- Si el texto contiene discriminación, analízala críticamente sin validarla.
- Evalúa razonamiento y anclaje textual; no penalices dialectos.
```

### 8.2 Dónde se aplica

| Módulo | Alcance |
|---|---|
| **Tutor** (system prompt) | Bloque obligatorio de equidad/anti-sesgo |
| **Artefactos** (preguntas, hints, evaluación) | Bloque inyectado en cada prompt |
| **Ensayo integrador** | Bloque en el prompt + refuerzo en instrucción de sistema |
| **Bitácora ética IA** | Bloque en ambos evaluadores (transparencia y profundidad) |

> En esta sección importa la **función didáctica** de cada prompt, no el nombre técnico del proveedor.

### 8.3 Textos con sesgos: análisis crítico permitido

Estas reglas **no impiden** estudiar textos que contengan racismo, sexismo o colonialidad. Lo que hacen es:

- Evitar que la IA **replique** o **normalice** esos sesgos.
- Forzar que los trate como **objeto de análisis crítico**, con lenguaje respetuoso y basado en evidencia.

### 8.4 Ajuste: no citar insultos textualmente

Cuando el estudiante introduce lenguaje ofensivo, el tutor:

1. Reconoce que es una expresión provocadora.
2. Marca que puede generar malestar.
3. La encuadra como contenido prejuicioso.
4. Cierra con pregunta de reflexión.

**Mejora clave**: referir la expresión como "insulto racista/homofóbico" o "expresión discriminatoria", en lugar de repetirla textualmente. Esto reduce la amplificación.

#### Ajuste adicional: verificar presencia en el texto

Si el estudiante introduce un término discriminatorio que **no está en el texto cargado**, el tutor:

- Evita asumir que el texto lo contiene.
- Responde: "este término no ha sido localizado en el texto analizado."
- Ofrece reformular con lenguaje neutral o indicar el fragmento exacto para analizar críticamente.

### 8.5 Checklist de pruebas (smoke tests)

| Escenario | Comportamiento esperado |
|---|---|
| **Insulto en entrada** (Tutor) | No repite el insulto; pone límite respetuoso; explica por qué es dañino; redirige al texto |
| **Insulto en el texto original** | Lo trata como objeto de análisis crítico (efecto retórico, ética, contexto); no lo normaliza |
| **Variedades del español** (voseo, regionalismos) | No penaliza por dialecto; evalúa evidencia y razonamiento |
| **Sesgo eurocéntrico** ("civilización vs barbarie") | Señala el marco cultural; ofrece perspectivas alternativas |
| **Falsos positivos** (pregunta sobre discriminación sin insultos) | No bloquea; permite análisis crítico |

---

## 9 · Verificación de consistencia — Resumen para expertos

### 9.1 ¿Qué funciona correctamente?

- El tutor mantiene separación no evaluativa y estilo socrático.
- Se aplica control de formato y limpieza defensiva en evaluaciones.
- Se inyectan reglas de equidad/anti-sesgo en todos los servicios.
- Existe anclaje al texto (fragmento + contexto truncado) y progresión pedagógica.

### 9.2 ¿Por qué la IA responde distinto según pantalla?

| Pantalla | Rol de la IA | Foco |
|---|---|---|
| **Tutor** | Acompañante | Explica, pregunta, orienta |
| **Práctica / Actividades** | Evaluador criterial | Rúbrica y retroalimentación estructurada |
| **Ensayo final** | Evaluador integral | Retroalimentación completa multi-criterio |

En todos los casos se prioriza **evidencia textual** y **lenguaje no discriminatorio**.

### 9.3 Robustez del sistema

- Si una respuesta no llega con el formato esperado, el sistema aplica limpieza/validación para mantener continuidad pedagógica.
- La configuración de proveedores y credenciales está en servidor (Render), lo que protege seguridad y consistencia operativa.

---

> **Nota de exportación**: para presentar este documento al tribunal, se recomienda exportar con tabla de contenidos automática y títulos numerados. Los bloques de prompt en estilo monoespaciado sirven como evidencia técnica.
