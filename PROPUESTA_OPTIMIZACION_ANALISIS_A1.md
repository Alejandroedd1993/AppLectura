# 🚀 PROPUESTA: Optimización de Análisis Lento (A1)

**Problema:** POST a `/api/analysis/prelecture` tarda 100+ segundos  
**Fecha:** 12 de diciembre de 2025  
**Prioridad:** 🟠 MODERADA

---

## 📊 Diagnóstico

### Flujo actual
```
Frontend → Backend → DeepSeek API → Backend → Frontend
    │         │           │            │          │
    └─────────┴───────────┴────────────┴──────────┘
                    ~100 segundos
```

### Causas identificadas
1. **Prompt extenso:** ~4000 caracteres + texto del usuario (hasta 15K tokens)
2. **DeepSeek latencia:** 30-120s dependiendo de carga del servidor
3. **RAG enrichment:** Consultas web adicionales antes del análisis
4. **Sin caché:** Cada análisis se procesa desde cero

---

## ✅ SOLUCIÓN RECOMENDADA: Análisis en Dos Fases

### Concepto
Dividir el análisis en **fase rápida** (inmediata) + **fase profunda** (background).

### Implementación

#### Fase 1: Análisis Básico Local (0-3 segundos)
```javascript
// Frontend: src/context/AppContext.js
const analyzeDocument = async (text) => {
  // FASE 1: Análisis básico inmediato
  const basicAnalysis = generateBasicAnalysis(text);
  setCompleteAnalysis(basicAnalysis);
  setLoading(false); // Usuario puede interactuar
  
  // FASE 2: Enriquecimiento en background
  fetchDeepAnalysis(text).then(fullAnalysis => {
    setCompleteAnalysis(prev => mergeAnalysis(prev, fullAnalysis));
  });
};
```

#### Fase 2: Análisis Profundo en Background (30-120 segundos)
```javascript
// El usuario ya ve resultados básicos mientras DeepSeek procesa
const fetchDeepAnalysis = async (text) => {
  const response = await fetch(`${BACKEND_URL}/api/analysis/prelecture`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  return response.json();
};
```

### Análisis Básico Local
```javascript
// Nuevo: src/services/basicAnalysisService.js
export function generateBasicAnalysis(text) {
  return {
    prelecture: {
      metadata: {
        genero_textual: detectGenre(text),      // Heurísticas locales
        tipologia_textual: detectTypology(text),
        nivel_complejidad: calculateComplexity(text),
        web_enriched: false
      },
      argumentation: {
        tesis_central: extractFirstParagraph(text),
        tipo_argumentacion: 'Pendiente análisis profundo...'
      },
      linguistics: {
        registro_linguistico: detectRegister(text),
        figuras_retoricas: []
      }
    },
    metadata: {
      document_id: generateDocId(text),
      analysis_timestamp: new Date().toISOString(),
      provider: 'basic-local',
      _isPreliminary: true  // Indica que es análisis parcial
    }
  };
}
```

### UI de Transición
```javascript
// PreLectura.js: Mostrar banner cuando análisis es preliminar
{completeAnalysis._isPreliminary && (
  <PreliminaryBanner>
    ⏳ Análisis preliminar mostrado. 
    Análisis profundo en progreso...
  </PreliminaryBanner>
)}
```

---

## 📈 Beneficios

| Métrica | Antes | Después |
|---------|-------|---------|
| Tiempo a primera vista | 100s+ | **3s** |
| Experiencia de usuario | Espera frustrante | Interacción inmediata |
| Análisis completo | 100s | 100s (sin cambio, pero en background) |

---

## 🔧 Archivos a Modificar

### Frontend (AppLectura)
1. **`src/services/basicAnalysisService.js`** — [NUEVO] Heurísticas locales
2. **`src/context/AppContext.js`** — Dividir `analyzeDocument` en dos fases
3. **`src/components/PreLectura.js`** — Banner de "análisis preliminar"

### Backend (Opcional)
4. **Caché Redis** — Almacenar análisis por hash de texto
5. **Optimizar prompt** — Reducir tokens enviados a DeepSeek

---

## 🎯 Plan de Implementación

| Paso | Descripción | Esfuerzo |
|------|-------------|----------|
| 1 | Crear `basicAnalysisService.js` con heurísticas | 2h |
| 2 | Modificar `analyzeDocument` para dos fases | 1h |
| 3 | Agregar banner de análisis preliminar | 30min |
| 4 | Función `mergeAnalysis` para combinar resultados | 1h |
| 5 | Testing y ajustes | 1h |

**Total estimado:** ~5.5 horas

---

## 💡 Alternativas Consideradas

| Opción | Pros | Contras | Viabilidad |
|--------|------|---------|------------|
| **Dos fases** | Sin cambios backend, UX inmediata | Análisis parcial inicial | ✅ ALTA |
| Streaming SSE | Progreso real | Requiere backend | 🟡 MEDIA |
| Caché Redis | Análisis instantáneo (2da vez) | Requiere Redis | 🟡 MEDIA |
| Cambiar a GPT-4o | Más rápido (~30s) | Costo mayor | 🔴 BAJA |

---

## ⚠️ Consideraciones

1. **Análisis preliminar no es tan profundo** — Las heurísticas locales no reemplazan DeepSeek
2. **Merge de análisis** — Debe manejar casos donde el usuario ya interactuó
3. **Indicador visual** — Claramente comunicar que el análisis está incompleto

---

## 📝 Próximos Pasos

1. ✅ Documentar propuesta (este documento)
2. ⬜ Aprobar enfoque con stakeholders
3. ⬜ Implementar `basicAnalysisService.js`
4. ⬜ Modificar flujo de `analyzeDocument`
5. ⬜ Testing con textos reales
