// feedbackModel.js
// Modelo estructurado de feedback criterial para literacidad crítica.
// Objetivo: unificar formato para consumo por UI, anclaje textual, estudio espaciado y registro histórico.
// Versionado: permitir futuras migraciones (modelVersion incrementará si cambia el esquema público).

import { RUBRIC, normalizeDimensionInput, summarizeEvaluation } from '../rubrics/criticalLiteracyRubric.js';
// Reutilizamos scheduler para derivar items de repaso a partir del feedback (aprendizaje espaciado)
import { createStudyItem } from '../spaced/scheduler';

export const FEEDBACK_MODEL_VERSION = 1;

/**
 * Estructura objetivo (simplificada):
 * {
 *   modelVersion: 1,
 *   dimension: 'comprensionAnalitica',
 *   score10: 7,
 *   level4: 3,
 *   levelDescriptor: 'Adecuado: ...',
 *   summary: '...',
 *   strengths: [{ criterion, text }],
 *   improvements: [{ criterion, action }],
 *   probingQuestions: [{ question, purpose }],
 *   praxisSuggestions: [{ action, scope }],
 *   evidence: [{ quote, paragraph }],
 *   rubricCriteria: [...string],
 *   timestamp: number
 * }
 */

function mapCriterion(criterion, fallbackPrefix = 'Criterio') {
  if (!criterion) return `${fallbackPrefix}`;
  return String(criterion).trim();
}

function pickRubricCriteria(dimension) {
  const dimKey = normalizeDimensionInput(dimension);
  return RUBRIC.dimensiones[dimKey]?.criterios?.slice() || [];
}

export function normalizeEvidence(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean).slice(0, 10).map(e => {
    if (typeof e === 'string') {
      return { quote: e.slice(0, 280), paragraph: null };
    }
    const quote = String(e.quote || e.text || '').slice(0, 280);
    const paragraph = Number.isInteger(e.paragraph) ? e.paragraph : (Number.isInteger(e.parrafo) ? e.parrafo : null);
    return { quote, paragraph };
  });
}

export function summarizeDimensionScore({ dimension, score }) {
  if (dimension && typeof score === 'number') {
    const evalObj = summarizeEvaluation({ dimension, score, strengths: [], improvements: [], evidence: [], summary: '' });
    if (evalObj.valid) {
      return { level4: evalObj.level, levelDescriptor: evalObj.descriptor };
    }
  }
  return { level4: null, levelDescriptor: '' };
}

export function normalizeFeedbackInput(raw = {}) {
  if (raw.modelVersion === FEEDBACK_MODEL_VERSION) return raw; // ya normalizado

  const dimension = normalizeDimensionInput(raw.dimension || raw.dim || 'comprensionAnalitica');
  const score10 = typeof raw.score === 'number' ? raw.score : (typeof raw.score10 === 'number' ? raw.score10 : null);
  const { level4, levelDescriptor } = summarizeDimensionScore({ dimension, score: score10 });

  const rubricCriteria = pickRubricCriteria(dimension);

  const strengths = (raw.strengths || raw.puntos_fuertes || [])
    .filter(Boolean)
    .slice(0, 8)
    .map(s => ({ criterion: mapCriterion(s.criterion || s.criterio || (typeof s === 'string' ? s : ''), 'Fortaleza'), text: typeof s === 'string' ? s : (s.text || s.descripcion || '') }));

  const improvements = (raw.improvements || raw.areas_crecimiento || raw.sugerencias || [])
    .filter(Boolean)
    .slice(0, 8)
    .map(it => ({ criterion: mapCriterion(it.criterion || it.criterio || (typeof it === 'string' ? it : ''), 'Mejora'), action: typeof it === 'string' ? it : (it.action || it.accion || it.text || '') }));

  const probingQuestions = (raw.probingQuestions || raw.preguntas_profundizacion || [])
    .filter(Boolean)
    .slice(0, 6)
    .map(q => ({ question: typeof q === 'string' ? q : (q.question || q.text || ''), purpose: (q.purpose || q.objetivo || '').slice(0,120) }));

  const praxisSuggestions = (raw.praxisSuggestions || raw.sugerencias_praxis || [])
    .filter(Boolean)
    .slice(0, 6)
    .map(p => ({ action: typeof p === 'string' ? p : (p.action || p.text || ''), scope: (p.scope || p.ambito || '') }));

  const evidence = normalizeEvidence(raw.evidence || raw.evidencia || raw.citas);

  const summary = String(raw.summary || raw.resumen || raw.overview || '').slice(0, 1200);

  return {
    modelVersion: FEEDBACK_MODEL_VERSION,
    dimension,
    score10: score10 == null ? undefined : score10,
    level4,
    levelDescriptor,
    summary,
    strengths,
    improvements,
    probingQuestions,
    praxisSuggestions,
    evidence,
    rubricCriteria,
    timestamp: Date.now()
  };
}

/**
 * Convierte un feedback normalizado en una lista de items de estudio (1 por mejora prioritaria).
 * Aplica heurística: máximo 3 items, prioriza mejoras con acciones más largas (asumiendo más específicas).
 */
export function feedbackToStudyItems(feedback) {
  const fb = normalizeFeedbackInput(feedback); // idempotente
  const base = fb.improvements
    .slice()
    .sort((a,b) => (b.action?.length||0) - (a.action?.length||0))
    .slice(0,3);
  return base.map(impr => createStudyItem({
    content: impr.action,
    dimension: fb.dimension,
    anchor: {
      type: 'feedback-improvement',
      criterion: impr.criterion,
      dimension: fb.dimension,
      createdAt: fb.timestamp
    }
  }));
}

/**
 * Funde múltiples feedback parciales (misma dimensión) en uno: conserva última summary, concatena listas limitando tamaño.
 */
export function mergeFeedback(feedbackList = []) {
  const normals = feedbackList.map(normalizeFeedbackInput).filter(Boolean);
  if (!normals.length) return null;
  const dimension = normals[0].dimension;
  const merged = {
    modelVersion: FEEDBACK_MODEL_VERSION,
    dimension,
    score10: normals.map(f=>f.score10).filter(x=> typeof x === 'number').slice(-1)[0],
    level4: normals.map(f=>f.level4).slice(-1)[0],
    levelDescriptor: normals.map(f=>f.levelDescriptor).slice(-1)[0],
    summary: normals.map(f=>f.summary).slice(-1)[0] || '',
    strengths: [],
    improvements: [],
    probingQuestions: [],
    praxisSuggestions: [],
    evidence: [],
    rubricCriteria: pickRubricCriteria(dimension),
    timestamp: Date.now()
  };
  const pushUnique = (arr, target, key) => {
    for (const item of arr) {
      const signature = key ? item[key] : JSON.stringify(item);
      if (!target.some(t => (key ? t[key] : JSON.stringify(t)) === signature)) {
        target.push(item);
      }
    }
  };
  normals.forEach(f => {
    pushUnique(f.strengths, merged.strengths, 'text');
    pushUnique(f.improvements, merged.improvements, 'action');
    pushUnique(f.probingQuestions, merged.probingQuestions, 'question');
    pushUnique(f.praxisSuggestions, merged.praxisSuggestions, 'action');
    pushUnique(f.evidence, merged.evidence, 'quote');
  });
  // Limitar tamaños
  merged.strengths = merged.strengths.slice(0,10);
  merged.improvements = merged.improvements.slice(0,10);
  merged.probingQuestions = merged.probingQuestions.slice(0,8);
  merged.praxisSuggestions = merged.praxisSuggestions.slice(0,8);
  merged.evidence = merged.evidence.slice(0,12);
  return merged;
}

export default {
  FEEDBACK_MODEL_VERSION,
  normalizeFeedbackInput,
  feedbackToStudyItems,
  mergeFeedback,
  normalizeEvidence
};
