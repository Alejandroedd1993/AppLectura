import { adaptDeepAnalysis, buildFallbackQuestions, buildFallbackAnalysis, buildFormativeFeedbackPrompt, buildCriterionFeedbackPrompt } from '../../src/utils/analysisAdapters';

describe('analysisAdapters utilidades', () => {
  test('adaptDeepAnalysis transforma estructura profunda', () => {
    const raw = {
      resumen_ejecutivo: { total_preguntas: 2 },
      analisis_critico_consolidado: { temas_principales: ['tema1','tema2'] },
      texto_analizado: { genero_detectado: 'ensayo', complejidad_critica: 'alta' },
      preguntas_contextualizadas: [
        { pregunta: '¿Q1?', dimension_critica: 'literal', nivel_critico: 2 },
        { pregunta: '¿Q2?', dimension_critica: 'critica', nivel_critico: 4 }
      ]
    };
    const { analysis, questions } = adaptDeepAnalysis(raw);
    expect(analysis.temas_principales).toEqual(['tema1','tema2']);
    expect(questions).toHaveLength(2);
    expect(questions[0].pregunta).toBe('¿Q1?');
  });

  test('buildFallbackQuestions retorna 5 preguntas ordenadas', () => {
    const qs = buildFallbackQuestions();
    expect(qs).toHaveLength(5);
    expect(qs[0].etapa).toBe('literal');
  });

  test('buildFallbackAnalysis genera resumen con temas', () => {
    const a = buildFallbackAnalysis({ temasPrincipales: ['X','Y'], generoTextual: 'artículo', complejidadCritica: 'media' });
    expect(a.resumen).toMatch(/X, Y/);
  });

  test('buildFormativeFeedbackPrompt incluye niveles y campos clave', () => {
    const prompt = buildFormativeFeedbackPrompt({
      dimensionId: 'inferencial',
      dimensionDef: { label: 'Comprensión Inferencial', levels: [ { id: 'incipiente', descriptor: 'desc A'} ] },
      question: '¿Qué implica el concepto?',
      answer: 'Implica una relación causal.',
      textSlice: 'El texto dice que...' 
    });
    expect(prompt).toMatch(/dimension/);
    expect(prompt).toMatch(/incipiente/);
    expect(prompt).toMatch(/Respuesta estudiante/);
  });

  test('buildCriterionFeedbackPrompt genera prompt con dimension y criterio y escala v2', () => {
    const dimension = { id: 'argumentacion_contraargumento', label: 'Argumentación y Contraargumento' };
    const criterion = {
      id: 'uso_evidencia',
      label: 'Uso de evidencia',
      levels: {
        novato: 'Opiniones sin sustento.',
        aprendiz: 'Evidencia superficial sin análisis.',
        competente: 'Evidencia pertinente explicada lógicamente.',
        experto: 'Evidencia integrada estratégicamente para construir profundidad.'
      }
    };
    const prompt = buildCriterionFeedbackPrompt({
      dimension,
      criterion,
      answer: 'Cito dos párrafos y explico cómo apoyan mi tesis.',
      question: '¿Cómo sustentas tu postura con evidencia del texto?',
      textSlice: 'El autor presenta datos y ejemplos...'
    });
    expect(prompt).toMatch(/Argumentación y Contraargumento/);
    expect(prompt).toMatch(/Uso de evidencia/);
    expect(prompt).toMatch(/novato/);
    expect(prompt).toMatch(/experto/);
    expect(prompt).toMatch(/EXCLUSIVAMENTE un JSON válido/);
  });
});
