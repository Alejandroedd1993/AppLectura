// AssessmentBridge
// Conecta AnnotationsService (highlights, notes, anchors) con lógica de evaluación y banco de items.
// Objetivos v1:
//  - Exponer snapshot exportable (bundle) + utilidades de indexado rápido por párrafo.
//  - Registrar preguntas generadas (socraticas) como anchors (anchorType='question').
//  - Registrar feedback evaluativo como anchors (anchorType='feedback').
//  - Proveer función buildAssessmentItem para crear estructura evaluable reutilizable.
//  - Mantener inmutable el bundle retornado.

import { AnnotationsService } from '../../services/annotations.service';
import { normalizeFeedbackInput } from '../feedback/feedbackModel';

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const k of Object.keys(obj)) deepFreeze(obj[k]);
  }
  return obj;
}

export function createAssessmentBridge(text) {
  const key = AnnotationsService.computeKeyFromText(text);
  if (!key) throw new Error('Texto inválido para AssessmentBridge');

  function getBundle() {
    const bundle = AnnotationsService.toExportBundle(key);
    // Index por párrafo
    const byParagraph = {};
    for (const item of [...bundle.highlights, ...bundle.notes, ...bundle.anchors]) {
      const p = item.paragraphIndex;
      if (p == null) continue;
      if (!byParagraph[p]) byParagraph[p] = { highlights: [], notes: [], anchors: [] };
      if (item.kind === 'highlight') byParagraph[p].highlights.push(item);
      else if (item.kind === 'note') byParagraph[p].notes.push(item);
      else if (item.kind === 'anchor') byParagraph[p].anchors.push(item);
    }
    return deepFreeze({ ...bundle, byParagraph });
  }

  function registerSocraticQuestions(paragraphIndex, questions = []) {
    if (!Array.isArray(questions) || !questions.length) return [];
    return questions.map(q => AnnotationsService.addAnchor(key, {
      paragraphIndex,
      anchorType: 'question',
      refId: q.id || undefined,
      data: { question: q.question || q.anchoredQuestion || q, dimension: q.dimension }
    }));
  }

  function registerFeedback(paragraphIndex, feedback) {
    if (!feedback) return null;
    const normalized = normalizeFeedbackInput(feedback);
    return AnnotationsService.addAnchor(key, {
      paragraphIndex,
      anchorType: 'feedback',
      refId: normalized.id || feedback.id || undefined,
      data: normalized
    });
  }

  function buildAssessmentItem({ paragraphIndex, prompt, expected, rubricDimension, meta = {} }) {
    const id = Math.random().toString(36).slice(2, 10);
    return deepFreeze({
      id,
      paragraphIndex,
      prompt,
      expected,
      rubricDimension,
      createdAt: Date.now(),
      meta
    });
  }

  return {
    key,
    getBundle,
    registerSocraticQuestions,
    registerFeedback,
    buildAssessmentItem
  };
}

export default createAssessmentBridge;
