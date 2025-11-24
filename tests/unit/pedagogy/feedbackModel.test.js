import { normalizeFeedbackInput, feedbackToStudyItems, mergeFeedback } from '../../../src/pedagogy/feedback/feedbackModel';

describe('feedbackModel', () => {
  test('normalizeFeedbackInput mapea campos básicos y limita tamaños', () => {
    const raw = {
      dimension: 'Comprensión Analítica',
      score: 7,
      strengths: [ 'Identifica tesis central con citas precisas', 'Otra fortaleza' ],
      improvements: [ { action: 'Añadir más evidencia en la segunda idea' }, 'Clarificar postura propia' ],
      probingQuestions: [ '¿Qué evidencia falta?', '¿Qué voces están ausentes?' ],
      praxisSuggestions: [ 'Investigar actores sociales implicados' ],
      evidence: [ { quote: 'Texto citado', paragraph: 1 } ],
      summary: 'Buen avance, necesita mayor profundización en evidencias.'
    };
    const norm = normalizeFeedbackInput(raw);
    expect(norm.dimension).toBe('comprensionAnalitica');
    expect(norm.level4).toBeGreaterThan(0);
    expect(norm.strengths.length).toBe(2);
    expect(norm.improvements.length).toBe(2);
    expect(norm.probingQuestions.length).toBe(2);
    expect(norm.praxisSuggestions.length).toBe(1);
    expect(norm.evidence.length).toBe(1);
    expect(norm.rubricCriteria.length).toBeGreaterThan(0);
  });

  test('feedbackToStudyItems genera máximo 3 items', () => {
    const fb = normalizeFeedbackInput({
      dimension: 'argumentacion',
      improvements: [ 'Expandir contraargumento A', 'Agregar cita a postura', 'Anticipar objeción X', 'Redactar conclusión más dialógica' ]
    });
    const items = feedbackToStudyItems(fb);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0].dimension).toBe('argumentacion');
  });

  test('mergeFeedback combina y evita duplicados', () => {
    const f1 = normalizeFeedbackInput({ dimension: 'acd', strengths: ['Analiza voces'], improvements: ['Profundizar metáforas'] });
    const f2 = normalizeFeedbackInput({ dimension: 'acd', strengths: ['Analiza voces','Detecta sesgos'], improvements: ['Profundizar metáforas','Conectar marcos ideológicos'] });
    const merged = mergeFeedback([f1,f2]);
    expect(merged.dimension).toBe('acd');
    expect(merged.strengths.length).toBe(2); // sin duplicados
    expect(merged.improvements.length).toBe(2);
  });
});
