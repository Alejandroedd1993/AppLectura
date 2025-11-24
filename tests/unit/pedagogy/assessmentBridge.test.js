import { createAssessmentBridge } from '../../../src/pedagogy/assessment/assessmentBridge';
import { AnnotationsService } from '../../../src/services/annotations.service';

function sampleText() { return 'Párrafo uno.\nPárrafo dos con más contenido.'; }

describe('AssessmentBridge', () => {
  test('getBundle incluye índices por párrafo', () => {
    const text = sampleText();
    const bridge = createAssessmentBridge(text);
    const key = bridge.key;
    // Añadir highlight y nota
    AnnotationsService.addHighlight(key, 0, 'Párrafo uno');
    AnnotationsService.addNote(key, { paragraphIndex: 1, text: 'Nota en p2' });
    AnnotationsService.flush(key);
    const bundle = bridge.getBundle();
    expect(bundle.highlights.length).toBe(1);
    expect(bundle.notes.length).toBe(1);
    expect(bundle.byParagraph[0].highlights.length).toBe(1);
    expect(bundle.byParagraph[1].notes.length).toBe(1);
  });

  test('registerSocraticQuestions registra anchors tipo question', () => {
    const text = sampleText();
    const bridge = createAssessmentBridge(text);
    const added = bridge.registerSocraticQuestions(0, [ { question: '¿Qué idea?', dimension: 'comprension' } ]);
    AnnotationsService.flush(bridge.key);
    expect(added.length).toBe(1);
    const bundle = bridge.getBundle();
    const questionAnchors = bundle.anchors.filter(a => a.meta.anchorType === 'question');
    expect(questionAnchors.length).toBe(1);
  });

  test('registerFeedback normaliza y registra anchor feedback', () => {
    const text = sampleText();
    const bridge = createAssessmentBridge(text);
    bridge.registerFeedback(1, { summary: 'Bien estructurado', score: 8, dimension: 'comprensionAnalitica' });
    AnnotationsService.flush(bridge.key);
    const bundle = bridge.getBundle();
    const feedbackAnchors = bundle.anchors.filter(a => a.meta.anchorType === 'feedback');
    expect(feedbackAnchors.length).toBe(1);
    const data = feedbackAnchors[0].meta.data;
    expect(data.score10).toBe(8);
    expect(data.level4).toBeGreaterThan(0);
    expect(data.dimension).toBe('comprensionAnalitica');
  });

  test('buildAssessmentItem crea item inmutable', () => {
    const text = sampleText();
    const bridge = createAssessmentBridge(text);
    const item = bridge.buildAssessmentItem({ paragraphIndex:0, prompt: 'Resume', expected: 'Resumen', rubricDimension: 'comprension' });
    expect(item.id).toBeTruthy();
    expect(Object.isFrozen(item)).toBe(true);
  });
});
