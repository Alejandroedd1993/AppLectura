import { AnnotationsService } from '../../src/services/annotations.service';
import { StudyItemsService } from '../../src/services/studyItems.service';
import { createAssessmentBridge } from '../../src/pedagogy/assessment/assessmentBridge';
import { feedbackToStudyItems, normalizeFeedbackInput } from '../../src/pedagogy/feedback/feedbackModel';

// Polyfill localStorage si es necesario
if (typeof global.localStorage === 'undefined') {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k,v) => store.set(k,String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

function buildEvaluationData() {
  return {
    name: 'comprensionAnalitica',
    score: 6,
    summary: 'Respuesta adecuada pero superficial en conexiones.',
    strengths: [ { criterion: 'Identificación', text: 'Reconoce ideas principales.' } ],
    improvements: [ { criterion: 'Profundidad', action: 'Agregar análisis de implicaciones culturales.' } ],
    evidence: [ { quote: 'La educación crítica fomenta justicia social', paragraph: 0 } ]
  };
}

beforeEach(() => {
  AnnotationsService._reset && AnnotationsService._reset();
  StudyItemsService._reset && StudyItemsService._reset();
});

describe('Flujo Evaluación → Feedback → Anchors → StudyItems', () => {
  test('crea anchor de feedback y persiste study items derivados', () => {
    const texto = 'Parrafo 1.\n\nParrafo 2.';
    const bridge = createAssessmentBridge(texto);
    const evalData = buildEvaluationData();

    // Simular construcción de feedback post-evaluación (como en SistemaEvaluacion)
    const rawFeedback = {
      dimension: evalData.name,
      score: evalData.score,
      summary: evalData.summary,
      strengths: evalData.strengths,
      improvements: evalData.improvements,
      evidence: evalData.evidence
    };
    const normalized = normalizeFeedbackInput(rawFeedback);
    const anchor = bridge.registerFeedback(0, normalized);
    expect(anchor).toBeTruthy();
    const items = feedbackToStudyItems(normalized);
    expect(items.length).toBeGreaterThan(0);

    // Persistir
    const key = StudyItemsService.computeKeyFromText(texto);
    const added = StudyItemsService.addItems(key, items);
    expect(added.length).toBe(items.length);
    const due = StudyItemsService.getDue(key, new Date());
    expect(due.length).toBeGreaterThan(0);
  });
});
