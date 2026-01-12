// src/services/prerequisitesValidator.js

import {
  checkEssayPrerequisitesFromProgress,
  normalizeRubricProgress
} from './rubricProgressV2';

/**
 * Valida si el estudiante puede acceder al Ensayo Integrador.
 * Regla: debe haber completado los 4 artefactos obligatorios (por rúbrica) y
 * además cumplir un mínimo de puntaje formativo por dimensión.
 *
 * @param {object} rubricProgress
 * @param {object} [options]
 * @param {number} [options.minScoreEach=5.0]
 */
export function validateEssayPrerequisites(rubricProgress, options = {}) {
  const minScoreEach = Number.isFinite(options.minScoreEach) ? Number(options.minScoreEach) : 5.0;
  const normalized = normalizeRubricProgress(rubricProgress);

  // 🆕 FIX: Pasar skipNormalize=true para evitar doble normalización
  const base = checkEssayPrerequisitesFromProgress(normalized, { skipNormalize: true });

  const scores = (base.details || []).map((d) => {
    const avg = Number(normalized?.[d.rubricId]?.formative?.average ?? normalized?.[d.rubricId]?.average ?? 0) || 0;
    const passing = avg >= minScoreEach;
    return { ...d, average: avg, passing };
  });

  const allPassingScore = scores.every(s => s.passing);

  return {
    ...base,
    minScoreEach,
    allPassingScore,
    canAccess: Boolean(base.canAccess && allPassingScore),
    scores
  };
}

export default {
  validateEssayPrerequisites
};
