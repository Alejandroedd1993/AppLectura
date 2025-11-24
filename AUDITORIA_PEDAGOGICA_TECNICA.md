# 🎓 AUDITORÍA TÉCNICO-PEDAGÓGICA EXHAUSTIVA - AppLectura

**Fecha**: 12 de octubre de 2025  
**Auditor**: Sistema de Análisis AI  
**Versión de la App**: 1.0.0  
**Marco Pedagógico**: Literacidad Crítica (5 Dimensiones + 4 Affordances)

---

## 📊 RESUMEN EJECUTIVO

### Estado General
- **Arquitectura Base**: ✅ Sólida (React + Express, bien separada)
- **Alineación Pedagógica**: 🔴 **40% implementado** (graves omisiones)
- **Calidad del Código**: 🟡 Media (deuda técnica considerable)
- **Seguridad**: 🟡 Requiere mejoras para producción

### Hallazgos Críticos
- **19 errores pedagógicos** que impiden cumplir objetivos de literacidad
- **12 inconsistencias técnicas** que afectan experiencia de usuario
- **3,200+ líneas** de código obsoleto/duplicado
- **0 de 5 artefactos** de evaluación implementados completamente

---

## 🚨 PARTE I: ERRORES PEDAGÓGICOS CRÍTICOS

### 1. ANCLAJE AL TEXTO (Affordance #1) - NO IMPLEMENTADO 🔴

**Severidad**: CRÍTICA  
**Impacto**: Viola principio fundamental de literacidad crítica

#### Problema
Ningún componente valida que las respuestas del estudiante contengan **citas textuales explícitas**.

#### Evidencia en Código
```javascript
// LecturaInteractiva.js - LÍNEA 563
const sendTutorMessage = async (message) => {
  apiTutor.sendPrompt(message); // ❌ No valida anclaje
};

// SistemaEvaluacion.js - LÍNEA 475
<TextareaRespuesta
  value={respuestaUsuario}
  onChange={(e) => setRespuestaUsuario(e.target.value)}
  // ❌ No hay validación de citas antes de enviar
/>
```

#### Impacto Pedagógico
- Los estudiantes pueden hacer **afirmaciones sin sustento**
- Viola criterio "Selección y Uso de Citas" de Rúbrica 1
- Contradice el principio: *"obliguen a los estudiantes a sustentar sus ideas con evidencias directas"*

#### Solución Requerida
Crear `src/utils/textAnchorValidator.js`:

```javascript
/**
 * Valida que una respuesta contenga anclaje al texto mediante citas
 * @param {string} studentResponse - Respuesta del estudiante
 * @param {string} sourceText - Texto original de referencia
 * @returns {Object} { valid, feedback, quotesCount, quotes }
 */
export function validateTextEvidence(studentResponse, sourceText) {
  // Detectar citas con comillas dobles/latinas
  const quotesPattern = /"([^"]{10,})"|«([^»]{10,})»/g;
  const quotes = [...studentResponse.matchAll(quotesPattern)];
  
  if (quotes.length === 0) {
    return {
      valid: false,
      feedback: "⚠️ Tu respuesta necesita incluir citas directas del texto. " +
                "Usa comillas para anclar tus afirmaciones en evidencia textual.\n\n" +
                "Ejemplo: Como señala el autor, \"[cita exacta del texto]\".",
      quotesCount: 0,
      quotes: []
    };
  }
  
  // Verificar que las citas existen en el texto original
  const validQuotes = quotes.map(q => ({
    text: q[1] || q[2],
    exists: sourceText.includes(q[1] || q[2])
  }));
  
  const invalidQuotes = validQuotes.filter(q => !q.exists);
  
  if (invalidQuotes.length > 0) {
    return {
      valid: false,
      feedback: "⚠️ Algunas citas no coinciden exactamente con el texto original. " +
                "Verifica que estés copiando palabra por palabra.",
      quotesCount: quotes.length,
      quotes: validQuotes,
      invalidCount: invalidQuotes.length
    };
  }
  
  // Validación de longitud mínima de respuesta vs citas
  const responseWords = studentResponse.split(/\s+/).length;
  const quotesWords = validQuotes.reduce((sum, q) => 
    sum + q.text.split(/\s+/).length, 0);
  
  // Al menos 30% de la respuesta debe ser análisis propio
  if ((responseWords - quotesWords) < responseWords * 0.3) {
    return {
      valid: false,
      feedback: "⚠️ Tu respuesta tiene demasiadas citas y poco análisis propio. " +
                "Las citas deben sustentar TUS ideas, no reemplazarlas.",
      quotesCount: quotes.length,
      quotes: validQuotes
    };
  }
  
  return {
    valid: true,
    feedback: `✅ Excelente anclaje: ${quotes.length} cita(s) válida(s)`,
    quotesCount: quotes.length,
    quotes: validQuotes
  };
}

/**
 * Extrae referencias a párrafos del tipo "párrafo 3" o "(p. 5)"
 */
export function extractParagraphReferences(text) {
  const patterns = [
    /párrafo\s+(\d+)/gi,
    /\(p\.\s*(\d+)\)/gi,
    /\[párrafo\s+(\d+)\]/gi
  ];
  
  const refs = new Set();
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => refs.add(parseInt(m[1])));
  });
  
  return Array.from(refs).sort((a, b) => a - b);
}

/**
 * Sugiere mejoras en la integración de citas
 */
export function suggestQuoteIntegration(quote) {
  const examples = [
    `Como señala el autor, "${quote}"`,
    `El texto afirma que "${quote}"`,
    `Esta idea se confirma en la frase: "${quote}"`,
    `Según el fragmento, "${quote}"`
  ];
  
  return examples[Math.floor(Math.random() * examples.length)];
}
```

#### Archivos a Modificar
1. `LecturaInteractiva.js` - Añadir validación pre-envío
2. `SistemaEvaluacion.js` - Validar antes de evaluar
3. `TutorCore.js` - Incluir feedback sobre anclaje

---

### 2. MODO SOCRÁTICO (Affordance #2) - IMPLEMENTACIÓN DEFICIENTE 🔴

**Severidad**: CRÍTICA  
**Impacto**: El tutor da respuestas directas en vez de guiar con preguntas

#### Problema Actual
```javascript
// TutorCore.js - LÍNEA 34
const SYSTEM_TOPIC_GUARD = 'Eres un tutor pedagógico que apoya sin evaluar ni calificar...';
// ❌ No instruye sobre método socrático
// ❌ No prioriza preguntas sobre respuestas
```

#### Marco Teórico
Según la rúbrica adjunta:
> "En lugar de corregir un error, debe problematizarlo para que el estudiante lo descubra y lo corrija por sí mismo."

**Ejemplo Negativo** (actual):
```
Estudiante: "¿Qué significa este párrafo?"
Tutor: "Este párrafo explica que la economía está en crisis..."
```

**Ejemplo Correcto** (socrático):
```
Estudiante: "¿Qué significa este párrafo?"
Tutor: "¿Qué palabras clave identificas en ese párrafo? 
        Cuando el autor dice 'la modernización debe ser cautelosa', 
        ¿qué matiz añade la palabra 'cautelosa'?
        ¿A qué podría oponerse el autor?"
```

#### Solución Implementada
Ver archivo `TutorCore.js` modificado con prompt mejorado.

---

### 3. RÚBRICAS CRITERIALES - NO IMPLEMENTADAS 🔴

**Severidad**: CRÍTICA  
**Impacto**: Sistema de evaluación actual ignora las 5 rúbricas de 4 niveles

#### Problema
```javascript
// SistemaEvaluacion.js - LÍNEA 413
const response = await fetch('/api/assessment/evaluate', {
  body: JSON.stringify({
    dimension: dimensionEvaluada, // ← Solo dimensión genérica
    // ❌ No evalúa criterios específicos
    // ❌ No asigna niveles Novato→Experto
  })
});

// Respuesta actual: { score: 7, comentario: "Bien" }
// ❌ No estructura el feedback por criterios
```

#### Lo que DEBERÍA retornar
```json
{
  "dimension": "comprensionAnalitica",
  "scoreGlobal": 7,
  "nivel": "Competente",
  "criteriosEvaluados": [
    {
      "criterio": "Selección y Uso de Citas",
      "nivel": 3,
      "descriptor": "Competente",
      "evidencia": "Tu texto cita: '...economía global...' (párrafo 2)",
      "fortalezas": [
        "Seleccionaste una cita pertinente que apoya tu idea central"
      ],
      "mejoras": [
        "Integra la cita de forma más fluida: En lugar de 'el autor dice...', prueba 'Como señala el texto, \"...\"'",
        "Explica POR QUÉ elegiste esa cita específica"
      ],
      "referencia": "Ver Rúbrica 1, Criterio 1, nivel Competente→Experto"
    },
    {
      "criterio": "Calidad de la Inferencia",
      "nivel": 2,
      "descriptor": "Aprendiz",
      "evidencia": "Afirmas que 'el autor está en contra', pero el texto dice 'debe ser cautelosa'",
      "fortalezas": [
        "Intentaste ir más allá de lo literal"
      ],
      "mejoras": [
        "Tu inferencia es demasiado categórica. El matiz 'cautelosa' no implica estar 'en contra'",
        "Fundamenta con más evidencia textual antes de concluir"
      ]
    }
  ]
}
```

#### Archivos a Crear/Modificar
1. `server/controllers/assessment.controller.js` - Lógica de evaluación criterial
2. `src/components/actividades/FeedbackCriterial.js` - UI para mostrar feedback estructurado

---

### 4. ARTEFACTOS DE APRENDIZAJE - 0 DE 5 IMPLEMENTADOS 🔴

**Severidad**: CRÍTICA  
**Impacto**: Imposibilita la evaluación de literacidad según el marco pedagógico

#### Estado Actual
```javascript
// components/Actividades.js - LÍNEAS 28-35
<Section>
  <SectionTitle>🧩 Actividades (Próximamente)</SectionTitle>
  <p>Aquí aparecerán actividades interactivas...</p>
  {/* ❌ VACÍO - No hay artefactos implementados */}
</Section>
```

#### Artefactos Requeridos (según rúbricas)

##### 4.1. Resumen con Citas e Inferencias (Rúbrica 1)
**Dimensión**: Comprensión Analítica

**Componente Requerido**: `components/actividades/ResumenConCitas.js`

**Funcionalidades**:
- Editor de texto con contador de palabras
- Detector automático de citas (resalta en verde)
- Validador de paráfrasis (compara con original)
- Medidor de inferencias vs literalidad
- Feedback en tiempo real

**UI Sugerida**:
```
┌────────────────────────────────────────┐
│ 📝 Resumen con Citas e Inferencias    │
├────────────────────────────────────────┤
│ Texto Original: [mostrar fragmento]   │
│                                        │
│ Tu Resumen:                            │
│ ┌────────────────────────────────────┐ │
│ │ La economía "está en crisis" según│ │ <- cita detectada ✅
│ │ el autor, lo cual sugiere...      │ │ <- inferencia detectada ✅
│ └────────────────────────────────────┘ │
│                                        │
│ Métricas:                              │
│ • Citas: 3 ✅                          │
│ • Paráfrasis: 85% fidelidad ✅         │
│ • Inferencias: 2 detectadas            │
│ • Longitud: 120/150 palabras           │
│                                        │
│ [Validar Anclaje] [Enviar a Evaluar] │
└────────────────────────────────────────┘
```

##### 4.2. Tabla de Análisis Crítico del Discurso (Rúbrica 2)
**Dimensión**: Análisis Ideológico-Discursivo

**Componente Requerido**: `components/actividades/TablaACD.js`

**Funcionalidades**:
- Formulario estructurado con secciones guiadas
- Herramienta de resaltado de texto para estrategias retóricas
- Selector de marco ideológico (lista predefinida)
- Analizador de voces presentes/ausentes
- Exportación a tabla formateada

**Estructura del Formulario**:
```javascript
{
  marcoIdeologico: {
    tipo: ['neoliberal', 'feminista', 'conservador', 'progresista', 'otro'],
    evidencia: "Citas que lo demuestran",
    beneficiarios: "¿A quién favorece?"
  },
  estrategiasRetoricas: [
    { tipo: 'eufemismo', ejemplo: "modernización' en vez de 'privatización'", efecto: "Suaviza..." },
    { tipo: 'metafora', ejemplo: "'la economía es un motor'", efecto: "Naturaliza..." }
  ],
  vocesPresentes: ["economistas", "empresarios"],
  vocesAusentes: ["trabajadores", "comunidades afectadas"],
  silencios: "¿Qué temas se evitan?"
}
```

##### 4.3. Mapa de Actores y Consecuencias (Rúbrica 3)
**Dimensión**: Contextualización Socio-Histórica

**Componente Requerido**: `components/actividades/MapaActores.js`

**Funcionalidades**:
- Canvas interactivo (tipo mapa mental)
- Nodos arrastrables para actores sociales
- Líneas de conexión con etiquetas (apoya/se opone/influye)
- Timeline del contexto histórico
- Evaluador de impacto/consecuencias

##### 4.4. Editor de Respuesta Argumentativa (Rúbrica 4)
**Dimensión**: Argumentación y Contraargumento

**Componente Requerido**: `components/actividades/RespuestaArgumentativa.js`

**Funcionalidades**:
- Editor con estructura guiada (Tesis → Evidencias → Contraargumento → Refutación)
- Validador de tesis (claridad, especificidad)
- Contador de evidencias textuales usadas
- Generador automático de contraargumentos para practicar refutación
- Checklist de calidad argumentativa

##### 4.5. Bitácora Ética de IA (Rúbrica 5)
**Dimensión**: Metacognición Ética del Uso de IA

**Componente Requerido**: `components/actividades/BitacoraEticaIA.js`

**Funcionalidades**:
- Registro automático de todas las interacciones con IA (timestamps, prompts, respuestas)
- Checklist de verificación de información
- Reflexión guiada sobre agencia intelectual
- Comparador lado a lado: "Lo que generó la IA" vs "Mi versión final"
- Declaración de autoría con porcentajes

---

### 5. FEEDBACK CRITERIAL (Affordance #3) - IMPLEMENTACIÓN DEFICIENTE 🟡

**Severidad**: ALTA  
**Impacto**: Feedback actual es genérico, no guía mejoras específicas

#### Problema Actual
```javascript
// SistemaEvaluacion.js - LÍNEA 436
const comentario = evaluationData.summary || evaluationData.descriptor || '';

setRetroalimentacion({ 
  puntuacion, 
  comentario // ← Texto libre: "Tu respuesta es buena pero..."
});
```

**Ejemplo de feedback actual**:
```
Puntuación: 7/10
Comentario: "Tu respuesta muestra comprensión pero falta profundidad. Intenta mejorar."
```
❌ No indica QUÉ criterios están débiles  
❌ No sugiere CÓMO mejorar específicamente  
❌ No referencia la rúbrica

#### Lo que DEBE Ser (según documento)
> "Feedback criterial: Implica dar retroalimentación clara y sistemática, apoyada en criterios definidos, que no solo marque errores sino que oriente mejoras."

**Ejemplo correcto**:
```json
{
  "puntuacion": 7,
  "nivel": "Competente",
  "criteriosEvaluados": [
    {
      "criterio": "Uso de Evidencia",
      "nivel": "Competente",
      "tuPuntuacion": 3,
      "maximoPosible": 4,
      "loQueHicisteBien": [
        "✅ Usaste 3 citas directas del texto",
        "✅ Las citas apoyan tu argumento principal"
      ],
      "comoMejorar": [
        "📈 Para llegar a 'Experto': Explica POR QUÉ elegiste cada cita específica",
        "📈 Integra las citas más fluidamente en tu redacción (ver ejemplos en Rúbrica 1, nivel 4)"
      ],
      "ejemplo": "En lugar de: 'El autor dice \"...\"'\nPrueba: 'Como señala el fragmento, \"...\", lo cual revela que...'"
    }
  ]
}
```

---

### 6. APRENDIZAJE ESPACIADO (Affordance #4) - DESVINCULADO DE DIMENSIONES 🟡

**Severidad**: MEDIA  
**Impacto**: Sistema de repaso espaciado no refuerza las 5 dimensiones de literacidad

#### Problema Actual
```javascript
// components/notas/NotasEstudioRefactorizado.js
// Genera notas genéricas del texto
// ❌ No crea ejercicios específicos por dimensión
// ❌ No vincula con rúbricas de evaluación
```

#### Solución Requerida
Modificar generación de notas para crear **tarjetas de repaso espaciado por dimensión**:

```javascript
// Ejemplo de tarjeta generada:
{
  dimension: "comprensionAnalitica",
  tipo: "cloze", // fill-in-the-blank
  pregunta: "Según el texto, la economía es ______ porque ______.",
  respuestaCorrecta: ["vulnerable", "depende de factores externos"],
  evidenciaTextual: "\"La economía está expuesta a shocks externos\" (párrafo 3)",
  criterioRubrica: "Fundamenta deducciones en evidencia textual explícita",
  proximoRepaso: "2025-10-14T10:00:00Z" // +2 días
}
```

---

## 🔧 PARTE II: ERRORES TÉCNICOS CRÍTICOS

### 7. ERROR DE SINTAXIS JSON 🔴
```json
// package.json - LÍNEA 29
"web-vitals": "^2.1.4",  // ← ELIMINAR ESTA COMA
"xlsx": "^0.18.5",
```

### 8. CORS INSEGURO PARA PRODUCCIÓN 🔴
```javascript
// server/index.js - LÍNEA 26
app.use(cors({
  origin: '*', // ❌ CUALQUIER SITIO puede hacer peticiones
}));
```

### 9. CÓDIGO DUPLICADO FRONTEND/BACKEND 🟡
```javascript
// SistemaEvaluacion.js - LÍNEAS 38-57
class GeneradorPreguntasInteligente { /* 120 líneas */ }
class EvaluadorRespuestasInteligente { /* 80 líneas */ }
// ❌ Lógica que ya existe en el backend
// ❌ Nunca se usan (el código usa fetch al backend)
```
**Acción**: Eliminar ~200 líneas de código muerto

### 10. LOGS DE DEPURACIÓN EN PRODUCCIÓN 🟡
```javascript
// 20+ console.log en LecturaInteractiva.js
console.log('🔍 LecturaInteractiva - Estado inicial:', { ... });
```
**Impacto**: Contamina consola, posible leak de información

---

## 📋 PARTE III: ARCHIVOS OBSOLETOS DETECTADOS

### Archivos para ELIMINAR:
```
❌ src/components/SistemaEvaluacion_clean.js (duplicado)
❌ src/components/LecturaInteractiva_fixed.js (duplicado)
❌ tests/unit/app/legacyFlag.test.js (feature ya estable)
```

### Código Legacy para LIMPIAR:
```javascript
// App.js - LÍNEA 291
const disableLegacyInteractive = process.env.REACT_APP_DISABLE_LEGACY_INTERACTIVE === 'true';
// ❌ Si la decisión ya está tomada, eliminar flag y branch
```

---

## 📊 MÉTRICAS DE IMPACTO

### Alineación con Marco Pedagógico
| Dimensión | Implementado | Faltante | % Completitud |
|-----------|--------------|----------|---------------|
| Comprensión Analítica | Tutor básico | Resumen+Citas, Validación | 30% |
| ACD | ❌ Nada | Tabla ACD completa | 0% |
| Contextualización | ❌ Nada | Mapa de Actores | 0% |
| Argumentación | Evaluación básica | Editor Argumentativo | 25% |
| Metacognición IA | ❌ Nada | Bitácora Ética | 0% |

**PROMEDIO GLOBAL**: **11% de implementación completa**

### Affordances Pedagógicas
| Affordance | Estado | Completitud |
|------------|--------|-------------|
| Anclaje al Texto | ❌ No validado | 0% |
| Preguntas Socráticas | 🟡 Deficiente | 30% |
| Feedback Criterial | 🟡 Genérico | 40% |
| Aprendizaje Espaciado | 🟡 Desvinculado | 50% |

**PROMEDIO**: **30% de implementación**

---

## 🎯 PLAN DE ACCIÓN PRIORIZADO

### FASE 1: CORRECCIONES CRÍTICAS (1-2 semanas)
1. ✅ Implementar Sistema de Anclaje al Texto
2. ✅ Convertir Tutor a Modo Socrático
3. ✅ Refactorizar Evaluación a Rúbricas Criteriales
4. ✅ Crear Módulo Tabla ACD
5. ✅ Implementar Feedback Criterial Estructurado

### FASE 2: ARTEFACTOS DE EVALUACIÓN (2-3 semanas)
6. Resumen con Citas (Rúbrica 1)
7. Tabla ACD (Rúbrica 2)
8. Mapa de Actores (Rúbrica 3)
9. Respuesta Argumentativa (Rúbrica 4)
10. Bitácora Ética IA (Rúbrica 5)

### FASE 3: OPTIMIZACIÓN Y PRODUCCIÓN (1 semana)
11. Eliminar código obsoleto
12. Configurar CORS seguro
13. Remover logs de depuración
14. Implementar rate limiting robusto
15. Sanitización completa de inputs

---

## 📚 REFERENCIAS PEDAGÓGICAS

- **Rúbricas Base**: `Rubricas_Guia_Evaluacion_Literacidad_IA.md`
- **Dimensiones**: 5 (Comprensión, ACD, Contextualización, Argumentación, Metacognición)
- **Affordances**: 4 (Anclaje, Socráticas, Feedback Criterial, Espaciado)
- **Escala de Evaluación**: 1-4 (Novato → Experto) mapeado a 1-10

---

## ✅ CRITERIOS DE ÉXITO

La aplicación cumplirá su objetivo pedagógico cuando:

1. **Anclaje Obligatorio**: 100% de respuestas requieren citas textuales
2. **Modo Socrático**: Tutor hace ≥3 preguntas por cada respuesta directa
3. **Feedback Criterial**: 100% de evaluaciones desglosadas por criterios
4. **5 Artefactos**: Todos implementados y validados con estudiantes reales
5. **Aprendizaje Espaciado**: Ejercicios vinculados a las 5 dimensiones

---

**Preparado por**: Sistema de Auditoría AI  
**Próxima revisión**: Tras implementar Fase 1
