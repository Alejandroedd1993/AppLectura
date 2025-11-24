import { AnnotationsService } from '../../src/services/annotations.service';
import { createAssessmentBridge } from '../../src/pedagogy/assessment/assessmentBridge';
import { normalizeFeedbackInput, feedbackToStudyItems } from '../../src/pedagogy/feedback/feedbackModel';

// Helper para crear texto base
function buildText() {
  return `Parrafo 1 sobre análisis crítico.

Parrafo 2 con más ideas.`;
}

// Asegurar limpieza entre tests
beforeEach(() => {
  AnnotationsService._reset && AnnotationsService._reset();
});

describe('Integración Feedback → Anchor → StudyItems', () => {
  test('registra feedback normalizado como anchor y genera study items', () => {
    const texto = buildText();
    const bridge = createAssessmentBridge(texto);

    // Simular feedback heterogéneo (no normalizado) de dimensión comprensionAnalitica
    const rawFeedback = {
      dimension: 'Comprension Analitica', // pruebas de normalización
      score: 7,
      summary: 'Buen análisis con oportunidades de profundización.',
      strengths: [
        { criterion: 'Identificación de ideas clave', text: 'Detecta ideas centrales con claridad.' }
      ],
      improvements: [
        { criterion: 'Profundidad interpretativa', action: 'Explicar con mayor detalle las implicaciones sociales.' },
        { criterion: 'Conexiones', action: 'Relacionar el argumento con ejemplos contemporáneos.' }
      ],
      probingQuestions: [ '¿Qué presuposiciones subyacentes no se cuestionan?' ],
      evidence: [ { quote: 'La inteligencia artificial está transformando la educación', paragraph: 0 } ]
    };

    // Registrar anchor de feedback
    const anchor = bridge.registerFeedback(0, rawFeedback);
    expect(anchor).toBeTruthy();
    expect(anchor.kind).toBe('anchor');
  expect(anchor.meta.anchorType).toBe('feedback');
  expect(anchor.meta.data.dimension).toBe('comprensionAnalitica');
  expect(anchor.meta.data.score10).toBe(7);
  expect(anchor.meta.data.level4).toBeDefined();

    // Obtener bundle y verificar indexado por párrafo
    const bundle = bridge.getBundle();
    expect(bundle.anchors.length).toBe(1);
    expect(bundle.byParagraph['0'].anchors.length).toBe(1);

    // Generar study items a partir del feedback
  const studyItems = feedbackToStudyItems(anchor.meta.data);
    expect(Array.isArray(studyItems)).toBe(true);
    expect(studyItems.length).toBeGreaterThan(0);
    expect(studyItems.length).toBeLessThanOrEqual(3);
    // Cada item contiene content (acción de mejora) y metadatos de dimensión
    studyItems.forEach(item => {
      expect(item.content).toBeTruthy();
      expect(item.dimension).toBe('comprensionAnalitica');
      expect(item.anchor).toBeTruthy();
      expect(item.anchor.type).toBe('feedback-improvement');
    });
  });

  test('feedback ya normalizado pasa intacto y respeta modelVersion', () => {
    const texto = buildText();
    const bridge = createAssessmentBridge(texto);

    const normalized = normalizeFeedbackInput({
      modelVersion: 1,
      dimension: 'comprensionAnalitica',
      score10: 5,
      level4: 2,
      levelDescriptor: 'Básico',
      summary: 'Resumen previo',
      strengths: [],
      improvements: [{ criterion: 'Claridad', action: 'Definir términos clave.' }],
      probingQuestions: [],
      praxisSuggestions: [],
      evidence: [],
      rubricCriteria: [],
      timestamp: Date.now()
    });

    const anchor = bridge.registerFeedback(1, normalized);
  expect(anchor.meta.data.modelVersion).toBe(1);
  expect(anchor.meta.data.score10).toBe(5);
  const items = feedbackToStudyItems(anchor.meta.data);
    expect(items[0].content).toMatch(/Definir términos/);
  });
});
