# 📝 Plan de Implementación: Ensayo Integrador Sumativo

## 🎯 Objetivos Principales

### Arquitectura de Evaluación Redefinida

```
┌─────────────────────────────────────────────────────────────┐
│                    ACTIVIDADES (FORMATIVAS)                  │
├─────────────────────────────────────────────────────────────┤
│ ✓ Resumen Académico          → rubrica1 (formativo)        │
│ ✓ Análisis Crítico Discurso  → rubrica2 (formativo)        │
│ ✓ Mapa de Actores            → rubrica3 (formativo)        │
│ ✓ Respuesta Argumentativa    → rubrica4 (formativo)        │
│ ✓ Bitácora Ética IA          → rubrica5 (formativo)        │
│ ✓ Modo Práctica 🎮           → Preguntas sin peso           │
└─────────────────────────────────────────────────────────────┘

                            ↓ PREREQUISITO

┌─────────────────────────────────────────────────────────────┐
│                   EVALUACIÓN (SUMATIVA)                      │
├─────────────────────────────────────────────────────────────┤
│ 📝 Ensayo Integrador de Literacidad Crítica                │
│                                                              │
│ • Prerequisito: 4/5 artefactos completados                  │
│   (Resumen + ACD + Mapa + Argumentación)                    │
│ • Estudiante elige 1 dimensión de 4 disponibles            │
│ • Ensayo único: 800-1200 palabras                           │
│ • Evaluación IA Dual: DeepSeek + OpenAI                     │
│ • 1 intento principal + 1 revisión opcional                 │
│ • Score sumativo reemplaza score formativo                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Decisiones Clave Actualizadas

### 1. Prerequisito: Completar TODOS los artefactos formativos

**Requisito obligatorio antes de acceder al ensayo:**

```javascript
PREREQUISITOS_ENSAYO = {
  required: [
    'ResumenAcademico',          // rubrica1
    'AnalisisCriticoDiscurso',   // rubrica2
    'MapaActores',               // rubrica3
    'RespuestaArgumentativa'     // rubrica4
  ],
  minScoreEach: 5.0,  // Cada artefacto debe tener al menos 5.0/10
  optional: [
    'BitacoraEticaIA'  // rubrica5 - NO requerida para el ensayo
  ]
}
```

**Justificación pedagógica:**
- ✅ Asegura que el estudiante practicó todas las dimensiones
- ✅ Garantiza base de conocimientos completa
- ✅ Los artefactos sirven de andamiaje para el ensayo final
- ✅ Permite integración transversal de aprendizajes

### 2. Dimensiones disponibles para el ensayo

**El estudiante puede elegir UNA de estas 4 dimensiones:**

| Dimensión | Rúbrica | ¿Disponible para Ensayo? |
|-----------|---------|--------------------------|
| 📚 Comprensión Analítica | rubrica1 | ✅ SÍ |
| 🔍 Análisis Crítico del Discurso | rubrica2 | ✅ SÍ |
| 🗺️ Contextualización Socio-Histórica | rubrica3 | ✅ SÍ |
| 💭 Argumentación y Contraargumento | rubrica4 | ✅ SÍ |
| 🤖 Metacognición Ética IA | rubrica5 | ❌ NO (solo formativo) |

**Nota:** Rubrica5 (Ética IA) queda como evaluación formativa únicamente, no tiene ensayo sumativo.

### 3. Evaluación IA Dual (DeepSeek + OpenAI)

**Proceso de evaluación:**

```javascript
EVALUACION_DUAL = {
  paso1: {
    evaluador: 'DeepSeek',
    modelo: 'deepseek-chat',
    temperatura: 0.3,
    peso: 50%,
    foco: 'Estructura, coherencia, uso de evidencias'
  },
  paso2: {
    evaluador: 'OpenAI',
    modelo: 'gpt-4o-mini',
    temperatura: 0.3,
    peso: 50%,
    foco: 'Profundidad conceptual, integración de artefactos'
  },
  paso3: {
    metodo: 'Promedio ponderado',
    transparencia: 'Muestra ambas evaluaciones al estudiante',
    output: {
      score: 'Promedio de ambos (0-10)',
      nivel: 'Promedio redondeado (1-4)',
      feedback: 'Combinación de ambos análisis'
    }
  }
}
```

**Ventajas de IA Dual:**
- ✅ Mayor objetividad (dos perspectivas)
- ✅ Reduce sesgos de un solo modelo
- ✅ Feedback más completo y balanceado
- ✅ Transparencia: el estudiante ve ambas evaluaciones

---

## 📊 Estructura de Datos: `rubricProgress` Redefinida

### Estructura completa por rúbrica

```javascript
rubricProgress = {
  rubrica1: {
    // ═══════════════════════════════════════════
    // EVALUACIÓN FORMATIVA (Artefactos + Práctica)
    // ═══════════════════════════════════════════
    formative: {
      scores: [
        { score: 7.5, artefacto: 'ResumenAcademico', timestamp: 1704700800000 },
        { score: 8.0, artefacto: 'PreguntaPractica', timestamp: 1704701000000 }
      ],
      average: 7.75,
      attempts: 2,
      artefactos: ['ResumenAcademico', 'PreguntaPractica'],
      lastUpdate: 1704701000000
    },
    
    // ═══════════════════════════════════════════
    // EVALUACIÓN SUMATIVA (Ensayo Integrador)
    // ═══════════════════════════════════════════
    summative: {
      score: 8.5,              // Score final del ensayo (0-10)
      nivel: 4,                // Nivel de la rúbrica (1-4)
      status: 'graded',        // 'pending' | 'submitted' | 'graded'
      submittedAt: 1704702000000,
      gradedAt: 1704702300000,
      
      // Contenido del ensayo
      essayContent: {
        text: "El ensayo completo...",
        wordCount: 1050,
        citationCount: 4,
        dimension: 'comprension_analitica'
      },
      
      // Feedback de IA Dual
      feedback: {
        deepseek: {
          score: 8.3,
          nivel: 4,
          fortalezas: ['Excelente uso de evidencias', 'Estructura clara'],
          debilidades: ['Podría profundizar en X'],
          feedback_estructura: "...",
          feedback_contenido: "..."
        },
        openai: {
          score: 8.7,
          nivel: 4,
          fortalezas: ['Integración magistral de artefactos'],
          debilidades: ['Cita Y necesita contexto'],
          feedback_estructura: "...",
          feedback_contenido: "..."
        },
        combined: {
          score: 8.5,
          nivel: 4,
          fortalezas: [...],
          debilidades: [...],
          recomendaciones: [...]
        }
      },
      
      // Metadata
      attemptsUsed: 1,      // 1 de 1 (o 1 de 2 si permitimos revisión)
      allowRevision: false  // Si puede reenviar una versión mejorada
    },
    
    // ═══════════════════════════════════════════
    // SCORE FINAL (Solo el sumativo cuenta)
    // ═══════════════════════════════════════════
    finalScore: 8.5,       // = summative.score cuando existe
    completionDate: 1704702000000,
    certified: true        // Si aprobó (score >= 6.0)
  },
  
  // Repetir estructura para rubrica2, rubrica3, rubrica4
  
  rubrica5: {
    // rubrica5 NO tiene campo summative (solo formativo)
    formative: { /* ... */ },
    summative: null,       // Explícitamente sin evaluación sumativa
    finalScore: null,
    completionDate: null,
    certified: false       // No genera certificación
  }
}
```

---

## 🏗️ Arquitectura de Archivos

### Árbol de archivos modificados/creados

```
src/
├── components/
│   ├── SistemaEvaluacion.js              ⚠️ REFACTORIZAR COMPLETO
│   │   └── Ahora solo renderiza <EnsayoIntegrador />
│   │
│   ├── evaluacion/                       📁 Módulo de evaluación sumativa
│   │   ├── EnsayoIntegrador.js           ✨ NUEVO (componente principal)
│   │   ├── EnsayoEditor.js               ✨ NUEVO (editor con validaciones)
│   │   ├── EnsayoGuidelines.js           ✨ NUEVO (guía por dimensión)
│   │   ├── EnsayoPrerequisites.js        ✨ NUEVO (verificador de artefactos)
│   │   ├── EnsayoDimensionSelector.js    ✨ NUEVO (selector 1 de 4)
│   │   ├── EssayFeedbackPanel.js         ✨ NUEVO (muestra IA dual)
│   │   ├── EnhancedDashboard.js          🔧 MODIFICAR (badges sumativo)
│   │   ├── AnalyticsPanel.js             🔧 MODIFICAR (separar F/S)
│   │   └── ExportPanel.js                🔧 MODIFICAR (incluir ensayo)
│   │
│   ├── actividades/                      📁 Artefactos formativos
│   │   ├── ModoPracticaGuiada.js         ✨ NUEVO (ex-preguntas)
│   │   ├── ResumenAcademico.js           🔧 MODIFICAR (usar updateFormativeScore)
│   │   ├── MapaActores.js                🔧 MODIFICAR (usar updateFormativeScore)
│   │   ├── RespuestaArgumentativa.js     🔧 MODIFICAR (usar updateFormativeScore)
│   │   └── BitacoraEticaIA.js            🔧 MODIFICAR (usar updateFormativeScore)
│   │
│   └── Actividades.js                    🔧 MODIFICAR (añadir tab Modo Práctica)
│
├── services/
│   ├── ensayoIntegrador.service.js       ✨ NUEVO (evaluación dual)
│   ├── prerequisitesValidator.js         ✨ NUEVO (validar 4 artefactos)
│   ├── rubricScoring.service.js          ✨ NUEVO (separar F/S)
│   ├── essayFormatValidator.js           ✨ NUEVO (800-1200 palabras)
│   └── evaluacionIntegral.service.js     🔧 MODIFICAR (solo formativo)
│
├── context/
│   └── AppContext.js                     🔧 MODIFICAR (nueva estructura)
│       ├── updateFormativeScore()        ✨ NUEVO método
│       ├── submitSummativeEssay()        ✨ NUEVO método
│       └── checkEssayPrerequisites()     ✨ NUEVO método
│
├── hooks/
│   ├── useEssayValidation.js             ✨ NUEVO (validaciones en vivo)
│   ├── usePrerequisitesCheck.js          ✨ NUEVO (verificar 4 artefactos)
│   └── useDualEvaluation.js              ✨ NUEVO (coordinar DS+OA)
│
└── __tests__/
    ├── ensayoIntegrador.test.js          ✨ NUEVO
    ├── prerequisitesValidator.test.js    ✨ NUEVO
    ├── rubricScoring.test.js             ✨ NUEVO
    ├── essayFormatValidator.test.js      ✨ NUEVO
    └── AppContext.test.js                🔧 ACTUALIZAR (nueva estructura)
```

---

## 🔄 Flujo Completo del Estudiante

### Fase 1: Trabajo Formativo (Actividades)

```
1. ARTEFACTOS OBLIGATORIOS (4/4 requeridos)
   ├─ 📚 Completa Resumen Académico
   │  └─ Obtiene score formativo (ej: 7.5/10)
   │  └─ Se guarda en rubrica1.formative
   │
   ├─ 🔍 Completa Análisis Crítico del Discurso
   │  └─ Obtiene score formativo (ej: 8.0/10)
   │  └─ Se guarda en rubrica2.formative
   │
   ├─ 🗺️ Completa Mapa de Actores
   │  └─ Obtiene score formativo (ej: 7.0/10)
   │  └─ Se guarda en rubrica3.formative
   │
   └─ 💭 Completa Respuesta Argumentativa
      └─ Obtiene score formativo (ej: 8.5/10)
      └─ Se guarda en rubrica4.formative

2. ARTEFACTO OPCIONAL
   └─ 🤖 Bitácora Ética IA (NO requerido para ensayo)

3. MODO PRÁCTICA 🎮 (Opcional)
   └─ Preguntas contextualizadas sin peso
   └─ Feedback instantáneo
   └─ Preparación para el ensayo
```

### Fase 2: Evaluación Sumativa

```
4. ACCESO AL ENSAYO INTEGRADOR
   ├─ ✅ Sistema verifica prerequisitos:
   │  ├─ ¿ResumenAcademico completado? ✓
   │  ├─ ¿AnalisisCriticoDiscurso completado? ✓
   │  ├─ ¿MapaActores completado? ✓
   │  └─ ¿RespuestaArgumentativa completado? ✓
   │
   └─ 🎯 Si todos completados → Habilita "Ensayo Integrador"

5. SELECCIÓN DE DIMENSIÓN
   ├─ Estudiante elige su dimensión más fuerte:
   │  ├─ 📚 Comprensión Analítica (avg: 7.5)
   │  ├─ 🔍 ACD (avg: 8.0)
   │  ├─ 🗺️ Contextualización (avg: 7.0)
   │  └─ 💭 Argumentación (avg: 8.5) ← ELIGE ESTA
   │
   └─ Sistema carga rúbrica correspondiente

6. ESCRITURA DEL ENSAYO
   ├─ Editor con validaciones en vivo:
   │  ├─ Contador de palabras (800-1200)
   │  ├─ Detector de citas (mínimo 3)
   │  ├─ Verificador de referencias a artefactos
   │  └─ Indicador de completitud
   │
   └─ Guía contextual según dimensión elegida

7. EVALUACIÓN IA DUAL
   ├─ Paso 1: DeepSeek evalúa (30 seg)
   │  └─ Score: 8.3/10, Nivel: 4/4
   │
   ├─ Paso 2: OpenAI evalúa (30 seg)
   │  └─ Score: 8.7/10, Nivel: 4/4
   │
   └─ Paso 3: Combinación
      └─ Score final: 8.5/10, Nivel: 4/4

8. RESULTADOS
   ├─ Panel muestra ambas evaluaciones
   ├─ Feedback detallado de ambos modelos
   ├─ Score sumativo reemplaza score formativo
   └─ rubrica4.finalScore = 8.5
```

---

## 🧪 Validaciones del Ensayo

### 1. Validación de Formato (Pre-evaluación)

```javascript
VALIDACIONES_FORMATO = {
  wordCount: {
    min: 800,
    max: 1200,
    error: "Debe tener entre 800 y 1200 palabras"
  },
  
  citations: {
    min: 3,
    pattern: /"([^"]{10,})"/g,
    error: "Debe incluir al menos 3 citas textuales del texto original"
  },
  
  artifactReferences: {
    required: true,
    pattern: /\b(resumen|mapa|análisis|respuesta|artefacto)\b/gi,
    error: "Debe hacer referencia a tus artefactos formativos previos"
  },
  
  structure: {
    minParagraphs: 5,
    error: "Debe tener al menos 5 párrafos bien estructurados"
  }
}
```

### 2. Validación de Prerequisites (Pre-acceso)

```javascript
VALIDACIONES_PREREQUISITOS = {
  check: (rubricProgress) => {
    const required = [
      'rubrica1.formative.artefactos', // debe incluir 'ResumenAcademico'
      'rubrica2.formative.artefactos', // debe incluir 'AnalisisCriticoDiscurso'
      'rubrica3.formative.artefactos', // debe incluir 'MapaActores'
      'rubrica4.formative.artefactos'  // debe incluir 'RespuestaArgumentativa'
    ];
    
    const scores = [
      rubricProgress.rubrica1.formative.average,
      rubricProgress.rubrica2.formative.average,
      rubricProgress.rubrica3.formative.average,
      rubricProgress.rubrica4.formative.average
    ];
    
    return {
      allCompleted: required.every(path => checkPath(rubricProgress, path)),
      allPassingScore: scores.every(score => score >= 5.0),
      details: {
        completed: required.map(path => checkPath(rubricProgress, path)),
        scores: scores
      }
    };
  }
}
```

---

## 🎨 UI/UX del Ensayo Integrador

### Pantalla 1: Verificación de Prerequisites

```
┌──────────────────────────────────────────────────────────┐
│  📝 Ensayo Integrador de Literacidad Crítica            │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  Antes de comenzar, verifica que hayas completado:       │
│                                                           │
│  ✅ Resumen Académico                    Score: 7.5/10  │
│  ✅ Análisis Crítico del Discurso        Score: 8.0/10  │
│  ✅ Mapa de Actores                      Score: 7.0/10  │
│  ✅ Respuesta Argumentativa              Score: 8.5/10  │
│                                                           │
│  🎉 ¡Excelente! Estás listo para tu evaluación sumativa │
│                                                           │
│  [ Continuar al Ensayo → ]                               │
└──────────────────────────────────────────────────────────┘
```

### Pantalla 2: Selección de Dimensión

```
┌──────────────────────────────────────────────────────────┐
│  🎯 Selecciona la dimensión para tu ensayo               │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  Solo puedes elegir UNA dimensión. Elige tu fortaleza:  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📚 Comprensión Analítica              Avg: 7.5/10  │ │
│  │ "Demuestra tu capacidad de análisis textual..."    │ │
│  │ [ Elegir esta dimensión ]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🔍 Análisis Crítico del Discurso      Avg: 8.0/10  │ │
│  │ "Analiza ideologías y poder en el discurso..."     │ │
│  │ [ Elegir esta dimensión ]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🗺️ Contextualización                   Avg: 7.0/10  │ │
│  │ "Sitúa el texto en su contexto histórico..."       │ │
│  │ [ Elegir esta dimensión ]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 💭 Argumentación ⭐ RECOMENDADA        Avg: 8.5/10  │ │
│  │ "Construye argumentos sólidos y refutaciones..."   │ │
│  │ [ Elegir esta dimensión ]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Pantalla 3: Editor del Ensayo

```
┌──────────────────────────────────────────────────────────┐
│  ✍️ Ensayo: Argumentación y Contraargumento              │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  📊 Progreso:  [████████░░] 800 / 1200 palabras         │
│  📎 Citas:     [██░░░░░░░░] 2 / 3 mínimo                │
│  🔗 Referencias: ✅ Detectadas                            │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 💡 Guía para tu ensayo:                            │ │
│  │                                                     │ │
│  │ • Desarrolla una tesis argumentativa clara         │ │
│  │ • Usa evidencias de tu Respuesta Argumentativa    │ │
│  │ • Integra conceptos del Resumen y Mapa de Actores │ │
│  │ • Incluye al menos 3 citas del texto original     │ │
│  │ • Demuestra integración transversal               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │ [Aquí el estudiante escribe su ensayo...]          │ │
│  │                                                     │ │
│  │ "En mi análisis previo del Mapa de Actores,       │ │
│  │ identifiqué que la autora construye su argumento  │ │
│  │ sobre la 'cultura del sacrificio' mediante..."     │ │
│  │                                                     │ │
│  │ Como señala el texto: "la mente no es una         │ │
│  │ máquina, sino un jardín", lo cual refuerza...     │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ⚠️ Tienes 1 intento para este ensayo                   │
│  💾 Se guarda automáticamente cada 30 segundos           │
│                                                           │
│  [ ✅ Enviar Ensayo para Evaluación IA Dual ]           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Pantalla 4: Evaluación en Progreso

```
┌──────────────────────────────────────────────────────────┐
│  ⏳ Evaluando tu ensayo con IA Dual...                   │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  ✅ Validación de formato completada                     │
│  ⏳ Evaluación con DeepSeek...              [████░░░░░] │
│  ⏸️ Evaluación con OpenAI...                 [░░░░░░░░░] │
│  ⏸️ Combinando resultados...                 [░░░░░░░░░] │
│                                                           │
│  Tiempo estimado: ~60 segundos                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Pantalla 5: Resultados (IA Dual)

```
┌──────────────────────────────────────────────────────────┐
│  🎉 Evaluación Completada                                │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  📊 Tu Puntuación Final: 8.5 / 10                        │
│  🏆 Nivel Alcanzado: 4 / 4 (Avanzado)                    │
│  ✅ Estado: APROBADO                                      │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  🤖 Evaluación de DeepSeek:                              │
│  Puntuación: 8.3/10                                      │
│                                                           │
│  ✅ Fortalezas:                                           │
│  • Excelente uso de evidencias textuales                 │
│  • Estructura argumentativa clara y coherente            │
│  • Integración efectiva de artefactos previos            │
│                                                           │
│  🔸 Áreas de mejora:                                      │
│  • La contextualización histórica podría profundizarse   │
│  • Considerar contraargumentos más complejos             │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  🧠 Evaluación de OpenAI:                                │
│  Puntuación: 8.7/10                                      │
│                                                           │
│  ✅ Fortalezas:                                           │
│  • Integración magistral de múltiples dimensiones        │
│  • Reflexión metacognitiva sobre el proceso              │
│  • Citas bien contextualizadas y analizadas              │
│                                                           │
│  🔸 Áreas de mejora:                                      │
│  • La cita sobre "jardín vs máquina" necesita más análisis│
│  • Algunos párrafos podrían ser más concisos            │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  💡 Recomendaciones Combinadas:                          │
│  • Continúa practicando la integración transversal       │
│  • Tu dominio de la argumentación es sobresaliente       │
│  • Considera profundizar en análisis contextual          │
│                                                           │
│  [ 📥 Descargar Reporte PDF ]  [ 📊 Ver Dashboard ]     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Migración de Datos Existentes

### Script de migración para usuarios actuales

```javascript
// migrations/migrateRubricProgress.js

export function migrateToNewStructure(oldRubricProgress) {
  const newStructure = {};
  
  Object.keys(oldRubricProgress).forEach(rubricId => {
    const old = oldRubricProgress[rubricId];
    
    // Convertir scores antiguos a formato formativo
    const formativeScores = (old.scores || []).map(score => ({
      score: typeof score === 'object' ? score.score : score,
      artefacto: typeof score === 'object' ? score.artefacto : 'Legacy',
      timestamp: typeof score === 'object' ? score.timestamp : Date.now()
    }));
    
    newStructure[rubricId] = {
      formative: {
        scores: formativeScores,
        average: old.average || 0,
        attempts: formativeScores.length,
        artefactos: old.artefactos || [],
        lastUpdate: old.lastUpdate || Date.now()
      },
      summative: rubricId === 'rubrica5' ? null : {
        score: null,
        nivel: null,
        status: 'pending',
        submittedAt: null,
        gradedAt: null,
        essayContent: null,
        feedback: null,
        attemptsUsed: 0,
        allowRevision: false
      },
      finalScore: null,
      completionDate: null,
      certified: false
    };
  });
  
  return newStructure;
}

// Uso en AppContext
useEffect(() => {
  const storedProgress = localStorage.getItem('rubricProgress');
  if (storedProgress) {
    try {
      const parsed = JSON.parse(storedProgress);
      
      // Detectar si es estructura vieja (no tiene formative/summative)
      const isOldStructure = !parsed.rubrica1?.formative;
      
      if (isOldStructure) {
        console.log('🔄 Migrando rubricProgress a nueva estructura...');
        const migrated = migrateToNewStructure(parsed);
        setRubricProgress(migrated);
        localStorage.setItem('rubricProgress', JSON.stringify(migrated));
        console.log('✅ Migración completada');
      } else {
        setRubricProgress(parsed);
      }
    } catch (err) {
      console.error('Error migrando datos:', err);
    }
  }
}, []);
```

---

## 🧪 Plan de Testing

### Tests unitarios

```javascript
// 1. Test de validación de prerequisites
describe('prerequisitesValidator', () => {
  test('requiere los 4 artefactos obligatorios', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 7.5 }},
      rubrica2: { formative: { artefactos: [], average: 0 }}, // ❌ Falta
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 }},
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 }}
    };
    
    const result = checkEssayPrerequisites(progress);
    expect(result.canAccess).toBe(false);
    expect(result.missingArtifacts).toContain('AnalisisCriticoDiscurso');
  });
  
  test('permite acceso cuando todos están completados', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 7.5 }},
      rubrica2: { formative: { artefactos: ['AnalisisCriticoDiscurso'], average: 8.0 }},
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 }},
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 }}
    };
    
    const result = checkEssayPrerequisites(progress);
    expect(result.canAccess).toBe(true);
    expect(result.missingArtifacts).toHaveLength(0);
  });
});

// 2. Test de validación de formato
describe('essayFormatValidator', () => {
  test('rechaza ensayo corto', () => {
    const shortEssay = 'palabra '.repeat(700);
    const result = validateEssayFormat(shortEssay);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('800 palabras');
  });
  
  test('rechaza ensayo sin citas', () => {
    const noCitations = 'palabra '.repeat(900);
    const result = validateEssayFormat(noCitations);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('3 citas'));
  });
  
  test('acepta ensayo válido', () => {
    const validEssay = `
      ${'palabra '.repeat(900)}
      "Primera cita del texto original"
      "Segunda cita importante"
      "Tercera cita necesaria"
      En mi resumen previo analicé...
    `;
    const result = validateEssayFormat(validEssay);
    expect(result.valid).toBe(true);
  });
});

// 3. Test de evaluación dual
describe('dualEvaluation', () => {
  test('combina scores de DeepSeek y OpenAI correctamente', async () => {
    const mockDeepSeek = { score: 8.3, nivel: 4 };
    const mockOpenAI = { score: 8.7, nivel: 4 };
    
    const result = await evaluateEssayDual(mockEssay, mockDimension);
    
    expect(result.score).toBe(8.5); // Promedio de 8.3 y 8.7
    expect(result.nivel).toBe(4);
    expect(result.evaluators.deepseek).toEqual(mockDeepSeek);
    expect(result.evaluators.openai).toEqual(mockOpenAI);
  });
});
```

### Tests de integración

```javascript
// 4. Test de flujo completo
describe('Essay Integration Flow', () => {
  test('flujo completo desde prerequisitos hasta evaluación', async () => {
    // 1. Setup: Usuario con 4 artefactos completados
    const user = createTestUser();
    await completeAllArtifacts(user);
    
    // 2. Verificar acceso al ensayo
    const canAccess = checkEssayPrerequisites(user.rubricProgress);
    expect(canAccess.canAccess).toBe(true);
    
    // 3. Seleccionar dimensión
    const selectedDimension = 'argumentacion';
    
    // 4. Escribir ensayo válido
    const essay = generateValidEssay(1000);
    
    // 5. Validar formato
    const formatCheck = validateEssayFormat(essay);
    expect(formatCheck.valid).toBe(true);
    
    // 6. Enviar a evaluación dual
    const evaluation = await evaluateEssayDual(essay, selectedDimension);
    expect(evaluation.score).toBeGreaterThan(0);
    expect(evaluation.score).toBeLessThanOrEqual(10);
    
    // 7. Guardar resultado
    submitSummativeEssay('rubrica4', evaluation);
    
    // 8. Verificar que finalScore se actualizó
    expect(user.rubricProgress.rubrica4.finalScore).toBe(evaluation.score);
  });
});
```

---

## 📅 Cronograma de Implementación (5 días)

### **DÍA 1: Fundamentos de datos**
```
□ Modificar estructura emptyRubricProgress en AppContext
□ Crear updateFormativeScore()
□ Crear submitSummativeEssay()
□ Crear checkEssayPrerequisites()
□ Script de migración de datos
□ Tests unitarios de AppContext
```

### **DÍA 2: Servicios de validación**
```
□ Crear prerequisitesValidator.js
□ Crear essayFormatValidator.js
□ Crear ensayoIntegrador.service.js (evaluación dual)
□ Tests unitarios de servicios
```

### **DÍA 3: Componentes UI (Parte 1)**
```
□ Crear EnsayoIntegrador.js (shell)
□ Crear EnsayoDimensionSelector.js
□ Crear EnsayoPrerequisites.js
□ Crear EnsayoGuidelines.js
```

### **DÍA 4: Componentes UI (Parte 2)**
```
□ Crear EnsayoEditor.js
□ Crear EssayFeedbackPanel.js
□ Modificar SistemaEvaluacion.js para renderizar EnsayoIntegrador
□ Crear ModoPracticaGuiada.js
□ Modificar Actividades.js (añadir tab Práctica)
```

### **DÍA 5: Integración y tests**
```
□ Modificar todos los artefactos para usar updateFormativeScore
□ Actualizar EnhancedDashboard.js
□ Actualizar AnalyticsPanel.js
□ Tests de integración completos
□ Pruebas manuales de flujo end-to-end
□ Documentación final
```

---

## ⚠️ Consideraciones Críticas

### 1. Análisis Crítico del Discurso (rubrica2)
**PROBLEMA:** Este artefacto NO está implementado actualmente.

**SOLUCIONES:**
- **Opción A (Rápida):** Deshabilitar temporalmente esta dimensión del selector de ensayo
- **Opción B (Recomendada):** Implementar el artefacto antes del ensayo
- **Opción C (Provisional):** Permitir ensayo sin este prerequisito durante transición

### 2. Retrocompatibilidad
- Usuarios existentes con datos en formato viejo deben migrar automáticamente
- El script de migración debe ejecutarse en el primer useEffect de AppContext
- Backup de localStorage antes de migrar

### 3. Sincronización con Firebase
```javascript
// Asegurar que la nueva estructura se guarda correctamente
const syncToFirebase = async (rubricProgress) => {
  await updateDoc(doc(db, 'students', userId), {
    'progress.rubricProgress': rubricProgress,
    'progress.lastUpdate': Date.now()
  });
};
```

### 4. Manejo de intentos
**Decisión pendiente:** ¿Permitir revisión del ensayo?
- **Opción A:** 1 intento único (más riguroso)
- **Opción B:** 1 intento + 1 revisión opcional (más pedagógico)

---

## 📊 Métricas de Éxito

### KPIs para evaluar la implementación

1. **Tasa de completitud:**
   - % de estudiantes que completan los 4 artefactos
   - Target: > 80%

2. **Calidad de ensayos:**
   - Score promedio de ensayos: Target > 7.0
   - % de ensayos con Nivel 4: Target > 30%

3. **Consistencia de IA Dual:**
   - Diferencia promedio entre DeepSeek y OpenAI: Target < 1.5 puntos

4. **Integración de artefactos:**
   - % de ensayos que referencian artefactos previos: Target > 90%

5. **Tiempo de evaluación:**
   - Tiempo promedio de evaluación dual: Target < 90 segundos

---

## 🎓 Alineación Pedagógica

### Taxonomía de Bloom Revisada

```
ACTIVIDADES (FORMATIVAS):
├─ Aplicar      → Usar conceptos en artefactos
├─ Analizar     → Descomponer textos en dimensiones
└─ Evaluar      → Juzgar calidad de propias producciones

ENSAYO (SUMATIVO):
├─ Evaluar      → Juzgar argumentos del texto original
└─ Crear        → Sintetizar nueva producción integradora
```

### Evaluación Auténtica
- El ensayo simula escritura académica universitaria real
- Los artefactos son andamiaje (scaffolding) progresivo
- IA Dual proporciona feedback multi-perspectiva (como revisión por pares)

---

## 🚀 Estado y próximos pasos

**Estado actual (8 ene 2026):** Implementación + correcciones + mejoras UX (A) + endurecimiento para producción (B) completados y validados con suite de tests.

1. **Validar este plan con stakeholders**
2. **Decidir sobre rubrica2 (ACD):**
  - ¿Implementar ahora?
  - ¿Posponer?
  - ¿Hacer opcional?
3. **(Opcional) Smoke test manual end-to-end**
4. **(Opcional) Preparar checklist de despliegue/operación**

---

**Última actualización:** 8 de enero de 2026  
**Autor:** Sistema de IA  
**Versión:** 2.0 (Con IA Dual y prerequisito de 4 artefactos)

---

## 🧾 Registro de hallazgos técnicos (post-implementación)

Fecha: 8 de enero de 2026

### Hallazgos menores (sin impacto funcional) ✅ CORREGIDOS

1. **Doble normalización de `rubricProgress`:** ✅ CORREGIDO
  - ~~`validateEssayPrerequisites()` normaliza, y `checkEssayPrerequisitesFromProgress()` también normaliza internamente.~~
  - **Solución aplicada (8 ene 2026):** se agregó opción `skipNormalize` y se evitó normalizar dos veces.

2. **Detección de citas en formato:** ✅ CORREGIDO
  - ~~`validateEssayFormat()` cuenta solo comillas dobles (`"...")`.~~
  - **Solución aplicada (8 ene 2026):** se soporta también `«…»` para el conteo de citas.

3. **Cobertura de tests para divergencia entre evaluadores:** ✅ CORREGIDO
  - ~~Faltaba un test donde DeepSeek y OpenAI entreguen puntajes muy distintos.~~
  - **Solución aplicada (8 ene 2026):** se agregó test de divergencia y se ajustaron fixtures para mantener la suite verde.

### Hallazgos de robustez (recomendado antes de producción) ✅ IMPLEMENTADOS

4. **Estrategia dual sin degradación parcial:** ✅ CORREGIDO
  - ~~`evaluateEssayDual()` usa `Promise.all`; si un proveedor falla, falla todo.~~
  - **Solución aplicada (8 ene 2026):** Ahora usa `Promise.allSettled` y retorna evaluación parcial si al menos uno responde.
  - Se agregó `partial: true` y `failedProviders` en el resultado cuando aplica.
  - La UI muestra InfoBox de advertencia cuando la evaluación fue parcial.

5. **Timeout/cancelación y control de fallos:** ✅ IMPLEMENTADO
  - **Solución aplicada (8 ene 2026):** timeout global con `AbortController` y clasificación de errores (timeout/red/proveedor/parseo).

6. **Validación y sanitización de entradas:** ✅ IMPLEMENTADO
  - **Solución aplicada (8 ene 2026):** validación de mínimos (texto base/ensayo/dimensión) + sanitización (caracteres de control, saltos de línea, límites de longitud).

7. **Errores tipados + mensajes amigables al usuario:** ✅ IMPLEMENTADO
  - **Solución aplicada (8 ene 2026):** `EssayEvaluationError` con `code` + `userMessage` para UI.

### Observación de tests preexistentes

5. **Suite de tests:**
  - ~~Existe un fallo preexistente en `src/App.test.js` (mocks UI).~~ ✅ CORREGIDO anteriormente.

---

## 🔧 Correcciones aplicadas (8 ene 2026)

### 1. `allowRevision` nunca se activaba ✅ CORREGIDO

**Problema:** El flag `allowRevision` siempre era `false` porque no había lógica para activarlo automáticamente tras el primer intento exitoso.

**Solución en `AppContext.js` → `submitSummativeEssay`:**
```javascript
// 🆕 FIX: Activar revisión automáticamente tras primer intento exitoso
const shouldEnableRevision = 
  essayData.allowRevision !== undefined 
    ? Boolean(essayData.allowRevision)
    : (nextAttemptsUsed === 1 && score != null) || Boolean(current.summative?.allowRevision);
```

**Comportamiento actual:**
- Primer intento con score válido → `allowRevision = true` automáticamente
- Se puede sobrescribir explícitamente pasando `allowRevision: false`
- Revisión disponible: `maxAttempts = 2` (1 original + 1 revisión)

### 2. No se informaba al usuario de evaluación parcial ✅ CORREGIDO

**Problema:** Si un proveedor de IA fallaba, el usuario no sabía que la evaluación fue con un solo modelo.

**Solución en `EnsayoIntegrador.js`:**
- Se agregó estado `partialEvaluation` para trackear si la evaluación fue parcial
- Se muestra InfoBox con advertencia visual cuando `partial === true`
- Se lista qué proveedor(es) fallaron

**UI resultante:**
```
⚠️ Evaluación parcial: Uno de los evaluadores IA no respondió (openai). 
El puntaje se calculó con el evaluador disponible.
```

---

## ✅ Paso C: Documentación y cierre (8 ene 2026)

- Se actualizó este plan para reflejar el estado real: hallazgos menores corregidos, mejoras A (UX) completadas y mejoras B (producción) implementadas.
- Estado de verificación: suite de tests en verde (según ejecución local del 8 ene 2026).

### Resumen de mejoras A (UX) ✅ COMPLETADO

- Editor: estadísticas en vivo (palabras/citas/párrafos) y tips contextuales.
- Evaluación: indicador de progreso por fases (validating/evaluating/combining).
- Feedback: panel enriquecido (score card, secciones claras, nivel descriptivo).

### Resumen de mejoras B (Producción) ✅ COMPLETADO

- Servicio: errores tipados, logging estructurado, timeouts/cancelación.
- Seguridad/robustez: validación y sanitización de entradas.
