# 📋 Plan de Mejora y Actualización - Pestaña Evaluación

**Fecha de creación**: 13 de noviembre de 2025  
**Componente principal**: `SistemaEvaluacion.js`  
**Estado**: 📝 Planificación

---

## 🎯 Objetivos Estratégicos

1. **Mejorar UX de validación de prerequisitos** (bloqueante → guía)
2. **Optimizar tiempos de espera** (>60s → <30s con feedback granular)
3. **Robustecer manejo de errores** (genérico → categorizado + retry)
4. **Completar accesibilidad** (WCAG 2.1 AA compliance)
5. **Actualizar persistencia** (arreglar hook roto)
6. **Migrar colores a theme system** (hardcoded → design tokens)

---

## 📊 Fases de Implementación

### **FASE 1: Fixes Críticos (Alta Prioridad)** ⚡
*Tiempo estimado: 3-4 horas*

#### **1.1 Refactor de Validación de Prerequisitos**
**Problema actual**: Error bloqueante que detiene flujo
```javascript
// ❌ Actual (agresivo)
if (!validacion.valido) {
  throw new Error(validacion.mensaje);
}

// ✅ Propuesta (guía)
if (!validacion.valido) {
  return <PrerequisitosChecklist 
    faltantes={validacion.faltantes}
    onNavigate={() => cambiarTab('analisis')}
  />;
}
```

**Archivos a modificar**:
- `src/services/evaluacionIntegral.service.js`: cambiar throw → return object
- `src/components/SistemaEvaluacion.js`: agregar `<PrerequisitosChecklist>`
- **Nuevo componente**: `src/components/evaluacion/PrerequisitosChecklist.js`

**Estructura del checklist**:
```javascript
<PrerequisitosPanel>
  <Title>📋 Prerequisitos Pedagógicos</Title>
  <Checklist>
    {items.map(item => (
      <CheckItem complete={item.done}>
        {item.done ? '✅' : '⏳'} {item.label}
        {!item.done && (
          <ActionButton onClick={item.action}>
            Completar →
          </ActionButton>
        )}
      </CheckItem>
    ))}
  </Checklist>
</PrerequisitosPanel>
```

---

#### **1.2 Error Handling Robusto + Retry Logic**

**Problema actual**: Un solo `catch` genérico sin diferenciar tipos de error

**Propuesta**: Categorización + fallbacks + retry automático
```javascript
// Nuevo error classifier
class EvaluationError extends Error {
  constructor(message, type, retryable = false) {
    super(message);
    this.type = type; // 'NETWORK' | 'TIMEOUT' | 'VALIDATION' | 'RATE_LIMIT'
    this.retryable = retryable;
  }
}

// Wrapper con retry
async function evaluarConRetry(payload, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await evaluarRespuesta(payload);
    } catch (error) {
      if (!error.retryable || attempt === maxRetries) throw error;
      await delay(1000 * (attempt + 1)); // exponential backoff
    }
  }
}
```

**Archivos a modificar**:
- `src/services/evaluacionIntegral.service.js`: agregar error classes + retry
- `src/components/SistemaEvaluacion.js`: manejar tipos de error específicos

**UI de errores**:
```javascript
{error && (
  <ErrorCard type={error.type}>
    <ErrorIcon>{getErrorIcon(error.type)}</ErrorIcon>
    <ErrorMessage>{error.message}</ErrorMessage>
    {error.retryable && (
      <RetryButton onClick={handleRetry}>
        🔄 Reintentar
      </RetryButton>
    )}
    {error.type === 'RATE_LIMIT' && (
      <WaitTimer countdown={error.retryAfter} />
    )}
  </ErrorCard>
)}
```

---

#### **1.3 Loading States Granulares**

**Problema actual**: Solo "Generando..." y "Evaluando..." (sin progreso visible)

**Propuesta**: Multi-step progress indicator
```javascript
const EVALUATION_STEPS = {
  VALIDATING: { label: 'Validando respuesta', duration: 1000 },
  DEEPSEEK_EVAL: { label: 'Evaluando estructura (DeepSeek)', duration: 15000 },
  OPENAI_EVAL: { label: 'Analizando profundidad (OpenAI)', duration: 20000 },
  COMBINING: { label: 'Combinando resultados', duration: 2000 }
};

// Component
<EvaluationProgress>
  {steps.map(step => (
    <ProgressStep 
      key={step.id}
      active={currentStep === step.id}
      complete={completedSteps.includes(step.id)}
    >
      <StepIcon>{step.icon}</StepIcon>
      <StepLabel>{step.label}</StepLabel>
      {currentStep === step.id && <Spinner />}
    </ProgressStep>
  ))}
  <EstimatedTime>~{remainingTime}s restantes</EstimatedTime>
</EvaluationProgress>
```

**Archivos a modificar**:
- **Nuevo componente**: `src/components/evaluacion/EvaluationProgress.js`
- `src/components/SistemaEvaluacion.js`: integrar progress tracker
- `src/services/evaluacionIntegral.service.js`: emitir eventos de progreso

---

#### **1.4 Arreglar Persistencia (useActivityPersistence)**

**Problema actual**: Hook nunca rehidrata al montar

**Propuesta**: Fix del hook + autoguardado
```javascript
// src/hooks/useActivityPersistence.js (arreglado)
useEffect(() => {
  if (!enabled || !persistenceKey) return;
  
  // 🆕 REHIDRATAR AL MONTAR
  const saved = localStorage.getItem(persistenceKey);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      onRehydrate?.(data);
    } catch (e) {
      console.error('Error rehidratando:', e);
    }
  }
}, [enabled, persistenceKey]); // Solo al montar

// 🆕 AUTOGUARDADO CADA 30s
useEffect(() => {
  if (!enabled) return;
  
  const interval = setInterval(() => {
    const data = {
      student_answers: studentAnswers,
      ai_feedbacks: aiFeedbacks,
      timestamp: Date.now()
    };
    localStorage.setItem(persistenceKey, JSON.stringify(data));
  }, 30000);
  
  return () => clearInterval(interval);
}, [enabled, studentAnswers, aiFeedbacks]);
```

**Archivos a modificar**:
- `src/hooks/useActivityPersistence.js`: agregar effects faltantes
- `src/components/SistemaEvaluacion.js`: verificar que `onRehydrate` esté implementado

---

### **FASE 2: Mejoras UX (Media Prioridad)** 🎨
*Tiempo estimado: 2-3 horas*

#### **2.1 Accesibilidad WCAG 2.1 AA**

**Cambios a implementar**:
```javascript
// Cards de dimensión
<DimensionCard
  role="radio"
  aria-checked={dimensionSeleccionada === dim.id}
  aria-label={`${dim.nombre}: ${dim.descripcion}`}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setDimensionSeleccionada(dim.id);
    }
  }}
>

// Textarea con contexto
<Textarea
  aria-label="Tu respuesta a la pregunta de evaluación"
  aria-describedby="char-count feedback-hint"
  aria-invalid={respuesta.length < 50}
/>
<CharCount id="char-count" role="status" aria-live="polite">
  {respuesta.length} caracteres
</CharCount>

// Feedback section
<FeedbackCard 
  role="article"
  aria-labelledby="feedback-title"
>
  <h3 id="feedback-title">Evaluación Criterial</h3>
  <section aria-labelledby="strengths-title">
    <h4 id="strengths-title">Fortalezas</h4>
    ...
  </section>
</FeedbackCard>
```

**Archivos a modificar**:
- `src/components/SistemaEvaluacion.js`: agregar ARIA attributes
- **Nuevo**: `src/styles/evaluacion-a11y.css` (focus indicators, contrast fixes)

---

#### **2.2 Migrar Colores a Theme System**

**Problema actual**: Hardcoded colors en múltiples lugares
```javascript
// ❌ Actual
if (score >= 8.6) return '#8b5cf6';
if (score >= 5.6) return '#10b981';

// ✅ Propuesto
const getScoreColor = (score, theme) => {
  if (score >= 8.6) return theme.evaluation.excellent;
  if (score >= 5.6) return theme.evaluation.good;
  if (score >= 2.6) return theme.evaluation.fair;
  return theme.evaluation.poor;
};
```

**Actualizar theme.js**:
```javascript
export const evaluationTheme = {
  excellent: { light: '#8b5cf6', dark: '#a78bfa' },
  good: { light: '#10b981', dark: '#34d399' },
  fair: { light: '#f59e0b', dark: '#fbbf24' },
  poor: { light: '#ef4444', dark: '#f87171' }
};
```

**Archivos a modificar**:
- `src/styles/theme.js`: agregar `evaluationTheme`
- `src/components/SistemaEvaluacion.js`: usar theme colors
- `src/components/evaluacion/DashboardRubricas.js`: mismo cambio

---

#### **2.3 Mobile-First Responsive Design**

**Problema actual**: Cards de 200px mínimo → apretado en móviles

**Propuesta**:
```javascript
// Dimensiones grid
const DimensionesGrid = styled.div`
  display: grid;
  gap: 1rem;
  
  /* Mobile: 1 columna */
  grid-template-columns: 1fr;
  
  /* Tablet: 2 columnas */
  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Desktop: auto-fit con min 220px */
  @media (min-width: 992px) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
`;

// Botones táctiles
const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    flex-direction: column;
    
    button {
      width: 100%;
      min-height: 48px; /* Touch target size */
    }
  }
`;
```

**Archivos a modificar**:
- `src/components/SistemaEvaluacion.js`: ajustar breakpoints
- `src/components/evaluacion/DashboardRubricas.js`: mismo cambio

---

### **FASE 3: Features Avanzadas (Baja Prioridad)** 🚀
*Tiempo estimado: 4-5 horas*

#### **3.1 Dashboard Expandible con Detalles**

**Propuesta**: Modal con historial de scores + gráfica
```javascript
<RubricCard onClick={() => setExpandedRubric(rubricId)}>
  ...
</RubricCard>

<Modal isOpen={expandedRubric} onClose={() => setExpandedRubric(null)}>
  <RubricDetailView>
    <Header>
      <Icon>{rubric.icon}</Icon>
      <Title>{rubric.name}</Title>
      <CloseButton />
    </Header>
    
    <ScoreChart data={rubric.scores} />
    
    <HistoryTimeline>
      {rubric.scores.map(entry => (
        <TimelineEntry>
          <Date>{formatDate(entry.timestamp)}</Date>
          <Score>{entry.score}/10</Score>
          <Source>{entry.artefacto}</Source>
        </TimelineEntry>
      ))}
    </HistoryTimeline>
    
    <Stats>
      <Stat label="Mejor score" value={maxScore} />
      <Stat label="Promedio" value={avgScore} />
      <Stat label="Intentos" value={totalAttempts} />
    </Stats>
  </RubricDetailView>
</Modal>
```

**Archivos a crear**:
- **Nuevo componente**: `src/components/evaluacion/RubricDetailModal.js`
- **Nuevo componente**: `src/components/evaluacion/ScoreChart.js` (con recharts)

---

#### **3.2 Configurabilidad de Ponderaciones**

**Problema actual**: 60/40 hardcoded

**Propuesta**: Settings panel
```javascript
// Nuevo contexto
const EvaluationSettingsContext = createContext();

const defaultSettings = {
  structureWeight: 0.6,
  depthWeight: 0.4,
  minCharacters: 50,
  maxCharacters: 2000,
  aiProvider: 'dual' // 'dual' | 'deepseek' | 'openai'
};

// UI
<SettingsPanel>
  <Setting>
    <Label>Peso de estructura</Label>
    <Slider 
      value={structureWeight} 
      onChange={setStructureWeight}
      min={0}
      max={1}
      step={0.1}
    />
    <Value>{(structureWeight * 100).toFixed(0)}%</Value>
  </Setting>
</SettingsPanel>
```

**Archivos a crear**:
- **Nuevo contexto**: `src/context/EvaluationSettingsContext.js`
- **Nuevo componente**: `src/components/evaluacion/SettingsPanel.js`

---

#### **3.3 Telemetría y Analytics**

**Propuesta**: Tracking de uso por dimensión
```javascript
// Nuevo servicio
class EvaluationAnalytics {
  trackQuestionGenerated(dimension, level) {
    const event = {
      type: 'QUESTION_GENERATED',
      dimension,
      level,
      timestamp: Date.now()
    };
    this.log(event);
  }
  
  trackEvaluationCompleted(dimension, score, duration) {
    const event = {
      type: 'EVALUATION_COMPLETED',
      dimension,
      score,
      duration,
      timestamp: Date.now()
    };
    this.log(event);
  }
  
  getStats() {
    const events = this.getEvents();
    return {
      totalEvaluations: events.filter(e => e.type === 'EVALUATION_COMPLETED').length,
      avgScore: this.calculateAverage(events),
      avgDuration: this.calculateAvgDuration(events),
      byDimension: this.groupByDimension(events)
    };
  }
}
```

**Archivos a crear**:
- **Nuevo servicio**: `src/services/evaluationAnalytics.js`
- **Nuevo componente**: `src/components/evaluacion/AnalyticsPanel.js`

---

## 📅 Cronograma Propuesto

| Fase | Tareas | Prioridad | Tiempo | Dependencias |
|------|--------|-----------|--------|--------------|
| **1.1** | Refactor prerequisitos | 🔴 Alta | 1h | - |
| **1.2** | Error handling + retry | 🔴 Alta | 1.5h | - |
| **1.3** | Loading states granulares | 🔴 Alta | 1h | - |
| **1.4** | Fix persistencia | 🔴 Alta | 0.5h | - |
| **2.1** | Accesibilidad WCAG | 🟡 Media | 2h | 1.1, 1.2, 1.3 |
| **2.2** | Migrar a theme system | 🟡 Media | 1h | - |
| **2.3** | Responsive mobile | 🟡 Media | 1h | - |
| **3.1** | Dashboard expandible | 🟢 Baja | 3h | recharts install |
| **3.2** | Settings configurables | 🟢 Baja | 2h | Nuevo contexto |
| **3.3** | Telemetría | 🟢 Baja | 2h | Analytics service |

**Total estimado**: 15-18 horas de desarrollo

---

## 🧪 Testing Strategy

### **Tests a actualizar/crear**:

1. **Unit tests** (Jest):
   - `evaluacionIntegral.service.test.js`: validarPrerequisitos, retry logic, error classification
   - `useActivityPersistence.test.js`: rehidratación, autoguardado
   - `EvaluationProgress.test.js`: cambios de estado

2. **Integration tests**:
   - `SistemaEvaluacion.integration.test.js`: flujo completo con mock de APIs
   - Prerequisitos → Pregunta → Respuesta → Evaluación → Dashboard update

3. **E2E tests** (Playwright):
   - `evaluation-flow.spec.js`: user journey completo
   - `accessibility.spec.js`: WCAG compliance con axe-core

4. **Visual regression** (Percy/Chromatic):
   - Screenshots de todos los estados (loading, error, feedback)

---

## 📦 Dependencias Nuevas

```json
{
  "dependencies": {
    "recharts": "^2.10.0",  // Para gráficas en dashboard expandible
    "date-fns": "^2.30.0"   // Para formateo de fechas en timeline
  },
  "devDependencies": {
    "@axe-core/react": "^4.8.0",  // Testing de accesibilidad
    "jest-axe": "^8.0.0"
  }
}
```

---

## 🚀 Plan de Deploy

1. **Branch strategy**: `feature/evaluation-improvements`
2. **PR checklist**:
   - ✅ Tests actualizados (>80% coverage)
   - ✅ Accesibilidad validada (axe-core)
   - ✅ Mobile testeado en dispositivos reales
   - ✅ Performance benchmark (no degradación)
   - ✅ Documentación actualizada

3. **Rollout gradual**:
   - Fase 1 (críticos) → deploy inmediato
   - Fase 2 (UX) → deploy después de QA
   - Fase 3 (features) → feature flags para A/B testing

---

## 📊 Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tiempo promedio de evaluación | 60-75s | <30s |
| Tasa de error | ~15% | <5% |
| Score de accesibilidad (Lighthouse) | 65 | >90 |
| Usuarios que completan evaluación | ~60% | >85% |
| NPS (satisfacción) | 6/10 | 8/10 |

---

## 📝 Notas de Implementación

### **Priorización de Tareas**

- **CRÍTICO (hacer primero)**: 1.1, 1.2, 1.4 (desbloquean flujo básico)
- **IMPORTANTE (seguir)**: 1.3, 2.1, 2.2 (mejoran experiencia significativamente)
- **NICE TO HAVE**: 2.3, 3.1, 3.2, 3.3 (features adicionales)

### **Consideraciones Técnicas**

1. **Backward compatibility**: Asegurar que cambios en `evaluacionIntegral.service.js` no rompan artefactos que lo usan
2. **Performance**: Medir impacto de progress events en tiempo de evaluación
3. **Mobile testing**: Probar en dispositivos reales (iOS Safari, Android Chrome)
4. **Accesibilidad**: Validar con screen readers reales (NVDA, JAWS, VoiceOver)

### **Dependencias entre Componentes**

```
SistemaEvaluacion.js
├─ evaluacionIntegral.service.js (backend logic)
├─ DashboardRubricas.js (shared con Actividades)
├─ criticalLiteracyRubric.js (fuente de verdad pedagógica)
├─ AppContext (rubricProgress, updateRubricScore)
└─ useActivityPersistence (persistencia local)
```

### **Puntos de Integración Críticos**

- **DIMENSION_MAP**: No modificar estructura (usado en Actividades)
- **rubricProgress**: Schema compatible con sesiones
- **updateRubricScore**: Interface estable para artefactos
- **app-change-tab**: Evento global para navegación

---

## ✅ Checklist de Aceptación

### **Fase 1**
- [ ] Prerequisitos muestran checklist en lugar de error
- [ ] Errores categorizados con retry automático
- [ ] Progress bar muestra pasos de evaluación
- [ ] Respuestas se rehidratan al recargar página

### **Fase 2**
- [ ] Lighthouse accessibility score >90
- [ ] Todos los colores usan theme system
- [ ] UI funcional en móviles <400px width

### **Fase 3**
- [ ] Dashboard muestra gráfica de progreso
- [ ] Settings permiten ajustar ponderaciones
- [ ] Analytics panel muestra estadísticas

---

**Última actualización**: 13 de noviembre de 2025  
**Responsable**: Equipo de desarrollo AppLectura  
**Revisión**: Pendiente
