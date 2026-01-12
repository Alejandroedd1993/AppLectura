// src/services/rubricProgressV2.js

const RUBRICS = ['rubrica1', 'rubrica2', 'rubrica3', 'rubrica4', 'rubrica5'];

export const REQUIRED_ARTEFACTS_FOR_ESSAY = [
  { rubricId: 'rubrica1', artefacto: 'ResumenAcademico' },
  { rubricId: 'rubrica2', artefacto: 'AnalisisCriticoDiscurso' },
  { rubricId: 'rubrica3', artefacto: 'MapaActores' },
  { rubricId: 'rubrica4', artefacto: 'RespuestaArgumentativa' }
];

export function createEmptySummative() {
  return {
    score: null,
    nivel: null,
    status: 'pending', // 'pending' | 'submitted' | 'graded'
    submittedAt: null,
    gradedAt: null,
    essayContent: null,
    feedback: null,
    attemptsUsed: 0,
    allowRevision: false
  };
}

export function createEmptyFormative() {
  return {
    scores: [],
    average: 0,
    attempts: 0,
    lastUpdate: null,
    artefactos: []
  };
}

export function createEmptyRubricaV2({ includeSummative }) {
  const formative = createEmptyFormative();
  const summative = includeSummative ? createEmptySummative() : null;

  // Compatibilidad: mantener campos legacy a nivel raíz
  return {
    scores: [],
    average: 0,
    lastUpdate: null,
    artefactos: [],

    formative,
    summative,

    finalScore: null,
    completionDate: null,
    certified: false
  };
}

export function createEmptyRubricProgressV2() {
  return {
    rubrica1: createEmptyRubricaV2({ includeSummative: true }),
    rubrica2: createEmptyRubricaV2({ includeSummative: true }),
    rubrica3: createEmptyRubricaV2({ includeSummative: true }),
    rubrica4: createEmptyRubricaV2({ includeSummative: true }),
    rubrica5: createEmptyRubricaV2({ includeSummative: false })
  };
}

export function isRubricProgressV2(progress) {
  if (!progress || typeof progress !== 'object') return false;
  const sample = progress.rubrica1 || progress.rubrica2;
  return !!(sample && typeof sample === 'object' && sample.formative);
}

function normalizeScoreEntry(entry) {
  if (entry == null) return null;
  if (typeof entry === 'number') {
    return { score: Number(entry), artefacto: 'Legacy', timestamp: Date.now() };
  }
  if (typeof entry === 'object') {
    const score = Number(entry.score ?? entry.value ?? 0);
    const artefacto = entry.artefacto || entry.source || entry.type || 'Legacy';
    const timestamp = Number(entry.timestamp || Date.now());
    return { ...entry, score, artefacto, timestamp };
  }
  return null;
}

export function migrateRubricProgressToV2(oldProgress) {
  const empty = createEmptyRubricProgressV2();
  const next = { ...empty };

  if (!oldProgress || typeof oldProgress !== 'object') return next;

  for (const rubricId of RUBRICS) {
    const oldRubrica = oldProgress[rubricId];
    if (!oldRubrica || typeof oldRubrica !== 'object') continue;

    const includeSummative = rubricId !== 'rubrica5';
    const base = createEmptyRubricaV2({ includeSummative });

    const normalizedScores = Array.isArray(oldRubrica.scores)
      ? oldRubrica.scores.map(normalizeScoreEntry).filter(Boolean)
      : [];

    const last3 = normalizedScores.slice(-3);
    const computedAvg = last3.length
      ? last3.reduce((sum, s) => sum + Number(s.score || 0), 0) / last3.length
      : 0;

    const average = Number(oldRubrica.average ?? computedAvg) || 0;
    const lastUpdate = oldRubrica.lastUpdate || (normalizedScores[normalizedScores.length - 1]?.timestamp ?? null);
    const artefactos = Array.isArray(oldRubrica.artefactos)
      ? oldRubrica.artefactos
      : Array.from(new Set(normalizedScores.map(s => s.artefacto).filter(Boolean)));

    const formative = {
      scores: normalizedScores,
      average: Math.round(average * 10) / 10,
      attempts: normalizedScores.length,
      lastUpdate: lastUpdate || null,
      artefactos
    };

    next[rubricId] = {
      ...base,
      // legacy
      scores: formative.scores,
      average: formative.average,
      lastUpdate: formative.lastUpdate,
      artefactos: formative.artefactos,
      // v2
      formative
    };
  }

  return next;
}

export function normalizeRubricProgress(progress) {
  if (!progress || typeof progress !== 'object') return createEmptyRubricProgressV2();

  if (!isRubricProgressV2(progress)) {
    return migrateRubricProgressToV2(progress);
  }

  // Ya es v2: asegurar que existen rubricas base y compatibilidad legacy
  const empty = createEmptyRubricProgressV2();
  const next = { ...empty };

  for (const rubricId of RUBRICS) {
    const includeSummative = rubricId !== 'rubrica5';
    const base = createEmptyRubricaV2({ includeSummative });
    const current = progress[rubricId];

    if (!current || typeof current !== 'object') {
      next[rubricId] = base;
      continue;
    }

    const formativeRaw = current.formative && typeof current.formative === 'object' ? current.formative : {};

    const normalizedScores = Array.isArray(formativeRaw.scores)
      ? formativeRaw.scores.map(normalizeScoreEntry).filter(Boolean)
      : (Array.isArray(current.scores) ? current.scores.map(normalizeScoreEntry).filter(Boolean) : []);

    const average = Number(formativeRaw.average ?? current.average ?? 0) || 0;
    const lastUpdate = formativeRaw.lastUpdate ?? current.lastUpdate ?? null;
    const artefactos = Array.isArray(formativeRaw.artefactos)
      ? formativeRaw.artefactos
      : (Array.isArray(current.artefactos) ? current.artefactos : []);

    const formative = {
      ...createEmptyFormative(),
      ...formativeRaw,
      scores: normalizedScores,
      average: Math.round(average * 10) / 10,
      attempts: Number(formativeRaw.attempts ?? normalizedScores.length) || normalizedScores.length,
      lastUpdate,
      artefactos
    };

    const summative = includeSummative
      ? (current.summative && typeof current.summative === 'object' ? { ...createEmptySummative(), ...current.summative } : createEmptySummative())
      : null;

    next[rubricId] = {
      ...base,
      ...current,
      // legacy mirror
      scores: formative.scores,
      average: formative.average,
      lastUpdate: formative.lastUpdate,
      artefactos: formative.artefactos,
      formative,
      summative
    };
  }

  return next;
}

/**
 * Verifica prerequisitos para el Ensayo Integrador.
 * @param {object} rubricProgress - Progreso de rúbricas (puede estar ya normalizado o no)
 * @param {object} [options]
 * @param {boolean} [options.skipNormalize=false] - Si true, asume que rubricProgress ya está normalizado
 */
export function checkEssayPrerequisitesFromProgress(rubricProgress, options = {}) {
  // 🆕 FIX: Evitar doble normalización si ya viene normalizado
  const normalized = options.skipNormalize 
    ? rubricProgress 
    : normalizeRubricProgress(rubricProgress);

  const hasRequiredArtefacto = (artefactos, requiredArtefacto) => {
    if (!Array.isArray(artefactos)) return false;
    if (artefactos.includes(requiredArtefacto)) return true;

    // Compatibilidad: la rúbrica2 (ACD) históricamente se registró como 'TablaACD'
    if (requiredArtefacto === 'AnalisisCriticoDiscurso') {
      return artefactos.includes('TablaACD') || artefactos.includes('tablaACD');
    }

    return false;
  };

  const missing = [];
  const details = [];

  for (const req of REQUIRED_ARTEFACTS_FOR_ESSAY) {
    const rubrica = normalized[req.rubricId];
    const artefactos = rubrica?.formative?.artefactos || rubrica?.artefactos || [];
    const ok = hasRequiredArtefacto(artefactos, req.artefacto);

    details.push({
      rubricId: req.rubricId,
      requiredArtefacto: req.artefacto,
      completed: ok
    });

    if (!ok) missing.push(req);
  }

  return {
    canAccess: missing.length === 0,
    missing,
    details
  };
}
