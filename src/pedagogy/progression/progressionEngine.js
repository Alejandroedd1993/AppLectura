// Sistema de progresión de Literacidad Crítica
// Gestiona el desbloqueo secuencial y criterios mínimos por dimensión.

export const SEQUENCE = [
  'comprensionAnalitica',
  'acd',
  'contextualizacion',
  'argumentacion'
];

// Criterios por dimensión: puntaje mínimo (1-10) y evidencia mínima (nº citas)
export const CRITERIA = {
  comprensionAnalitica: { minScore: 6, minEvidence: 2, minAttempts: 1 },
  acd: { minScore: 6.5, minEvidence: 2, minAttempts: 1 },
  contextualizacion: { minScore: 7, minEvidence: 2, minAttempts: 1 },
  argumentacion: { minScore: 7.5, minEvidence: 3, minAttempts: 1 }
};

// Estado base
function initialState() {
  return {
    current: SEQUENCE[0],
    unlocked: new Set([SEQUENCE[0]]),
    completed: {}, // dimensionKey -> { attempts, scores:[], evidence:[], lastUpdated }
    sequence: SEQUENCE.slice()
  };
}

function loadState(storageProvider) {
  try {
    const raw = storageProvider?.getItem('criticalProgression');
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    // Reconstruir Set
    if (parsed.unlocked) parsed.unlocked = new Set(parsed.unlocked);
    return parsed;
  } catch {
    return initialState();
  }
}

function persistState(state, storageProvider) {
  try {
    const serializable = {
      ...state,
      unlocked: Array.from(state.unlocked)
    };
    storageProvider?.setItem('criticalProgression', JSON.stringify(serializable));
  } catch {
    // Silenciar errores de persistencia
  }
}

function average(arr, lastN = 2) {
  if (!Array.isArray(arr) || !arr.length) return 0;
  const slice = arr.slice(-lastN);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function meetsCriteria(dimension, scores = [], evidences = []) {
  const c = CRITERIA[dimension] || CRITERIA.comprensionAnalitica;
  if (!scores.length) return false;
  const lastScore = scores[scores.length - 1];
  const avgRecent = average(scores, 2);
  const evidenceCount = evidences[evidences.length - 1] ?? 0;
  // Desbloqueo si último >= minScore y evidencia suficiente o promedio reciente >= minScore
  return (
    (lastScore >= c.minScore && evidenceCount >= c.minEvidence) ||
    avgRecent >= c.minScore
  ) && scores.length >= c.minAttempts;
}

function getNextDimension(current) {
  const idx = SEQUENCE.indexOf(current);
  if (idx === -1) return null;
  return SEQUENCE[idx + 1] || null;
}

function snapshot(state) {
  return {
    current: state.current,
    unlocked: Array.from(state.unlocked),
    sequence: state.sequence.slice(),
    completed: state.completed
  };
}

// API principal
export function createProgressionEngine(storageProvider = (typeof window !== 'undefined' ? window.localStorage : null)) {
  let state = loadState(storageProvider);

  function recordEvaluation({ dimension, score, evidenceCount = 0 }) {
    if (!dimension || !SEQUENCE.includes(dimension)) return snapshot(state);
    if (typeof score !== 'number' || Number.isNaN(score)) return snapshot(state);

    const entry = state.completed[dimension] || { attempts: 0, scores: [], evidence: [], lastUpdated: null };
    entry.attempts += 1;
    entry.scores.push(score);
    entry.evidence.push(evidenceCount);
    entry.lastUpdated = Date.now();
    state.completed[dimension] = entry;

    // Intentar desbloquear siguiente
    if (meetsCriteria(dimension, entry.scores, entry.evidence)) {
      const next = getNextDimension(dimension);
      if (next && !state.unlocked.has(next)) {
        state.unlocked.add(next);
        // Mantener current en la siguiente dimensión si la actual ya cumple criterios
        if (state.current === dimension) {
          state.current = next;
        }
      }
    }

    persistState(state, storageProvider);
    return snapshot(state);
  }

  function setCurrent(dimension) {
    if (SEQUENCE.includes(dimension) && state.unlocked.has(dimension)) {
      state.current = dimension;
      persistState(state, storageProvider);
    }
    return snapshot(state);
  }

  function resetProgress() {
    state = initialState();
    persistState(state, storageProvider);
    return snapshot(state);
  }

  function getDimensionStatus(dimension) {
    const entry = state.completed[dimension];
    return {
      dimension,
      unlocked: state.unlocked.has(dimension),
      ...entry
    };
  }

  return {
    getState: () => snapshot(state),
    recordEvaluation,
    setCurrent,
    resetProgress,
    getDimensionStatus,
    sequence: SEQUENCE.slice(),
    criteria: { ...CRITERIA }
  };
}

export default {
  createProgressionEngine,
  CRITERIA,
  SEQUENCE
};
