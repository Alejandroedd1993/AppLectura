/**
 * usePracticeHistory — Persistencia y consulta de intentos de práctica guiada.
 *
 * Almacena en localStorage un log de cada intento:
 *   { id, timestamp, dimension, difficulty, question, answer, score, nivel,
 *     hintsUsed, timeSpentMs, feedback: { fortaleza, mejora, criterios },
 *     isCrossChallenge, reflection }
 *
 * Provee estadísticas derivadas: racha, tendencia, mejores/peores criterios,
 * y helpers que alimentan la adaptación de dificultad y la visualización
 * de progreso.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// ─── Constantes ─────────────────────────────────────────────────────
const STORAGE_KEY = 'practiceHistory';
const MAX_ENTRIES = 200; // Límite total para no saturar localStorage
const MAX_PER_DIMENSION = 50;

// ─── Helpers puros ──────────────────────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries) {
  try {
    // Truncar si excede el límite global
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[usePracticeHistory] Error guardando en localStorage:', e);
  }
}

function generateId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Calcula tendencia de scores recientes.
 * @param {number[]} scores — últimos N scores (más antiguo primero)
 * @returns {'improving'|'stable'|'declining'}
 */
function computeTrend(scores) {
  if (scores.length < 3) return 'stable';
  const recent = scores.slice(-5);
  const firstHalf = recent.slice(0, Math.ceil(recent.length / 2));
  const secondHalf = recent.slice(Math.ceil(recent.length / 2));
  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;
  if (diff >= 1.0) return 'improving';
  if (diff <= -1.0) return 'declining';
  return 'stable';
}

/**
 * Calcula racha actual (intentos consecutivos con score ≥ umbral).
 */
function computeStreak(entries, threshold = 6) {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if ((entries[i].score ?? 0) >= threshold) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Identifica los criterios más fuertes y más débiles.
 * Agrupa los últimos N intentos y promedia cada criterio.
 */
function computeCriteriaInsights(entries, last = 10) {
  const recent = entries.slice(-last);
  const sums = {};
  const counts = {};

  for (const entry of recent) {
    const criterios = entry.feedback?.criterios;
    if (!criterios || typeof criterios !== 'object') continue;
    for (const [key, val] of Object.entries(criterios)) {
      const n = Number(val);
      if (!Number.isFinite(n)) continue;
      sums[key] = (sums[key] || 0) + n;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const avgs = Object.entries(sums).map(([key, sum]) => ({
    key,
    avg: Math.round((sum / counts[key]) * 10) / 10
  }));

  avgs.sort((a, b) => a.avg - b.avg);

  return {
    weakest: avgs.slice(0, 2),
    strongest: avgs.slice(-2).reverse(),
    all: avgs
  };
}

/**
 * Sugiere dificultad basándose en desempeño reciente.
 * @returns {'easy'|'medium'|'hard'}
 */
function suggestDifficulty(entries) {
  if (entries.length < 2) return 'easy';
  const recent = entries.slice(-5);
  const avgScore = recent.reduce((s, e) => s + (e.score ?? 0), 0) / recent.length;
  if (avgScore >= 8) return 'hard';
  if (avgScore >= 5.5) return 'medium';
  return 'easy';
}

// ─── Hook ───────────────────────────────────────────────────────────

export default function usePracticeHistory(dimensionFilter) {
  const [entries, setEntries] = useState(loadFromStorage);
  const sessionStartRef = useRef(null);

  // Re-sync from storage on mount (por si otra pestaña escribió)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY) setEntries(loadFromStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ─── Entradas filtradas por dimensión ─────────────────────────────
  const filtered = useMemo(() => {
    if (!dimensionFilter) return entries;
    return entries.filter((e) => e.dimension === dimensionFilter);
  }, [entries, dimensionFilter]);

  // ─── Estadísticas derivadas ───────────────────────────────────────
  const stats = useMemo(() => {
    const scores = filtered.map((e) => e.score).filter(Number.isFinite);
    const total = filtered.length;
    const avgScore = total > 0
      ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
      : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const trend = computeTrend(scores);
    const streak = computeStreak(filtered);
    const criteria = computeCriteriaInsights(filtered);
    const suggested = suggestDifficulty(filtered);
    const lastAttempt = filtered.length > 0 ? filtered[filtered.length - 1] : null;

    // Sesiones por dificultad
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const e of filtered) {
      const d = e.difficulty || 'medium';
      byDifficulty[d] = (byDifficulty[d] || 0) + 1;
    }

    // Cross-challenges completados
    const crossChallenges = filtered.filter((e) => e.isCrossChallenge).length;

    return {
      total,
      avgScore,
      bestScore,
      trend,
      streak,
      criteria,
      suggestedDifficulty: suggested,
      lastAttempt,
      byDifficulty,
      crossChallenges
    };
  }, [filtered]);

  // ─── Acciones ─────────────────────────────────────────────────────

  /** Marca el inicio de un intento (para medir tiempo). */
  const startAttempt = useCallback(() => {
    sessionStartRef.current = Date.now();
  }, []);

  /**
   * Registra un intento completado.
   * @param {object} data
   * @param {string} data.dimension
   * @param {string} data.difficulty
   * @param {string} data.question
   * @param {string} data.answer
   * @param {number} data.score
   * @param {number} data.nivel
   * @param {number} data.hintsUsed
   * @param {boolean} data.isCrossChallenge
   * @param {object} data.feedbackSummary — { fortaleza, mejora, criterios }
   */
  const recordAttempt = useCallback((data) => {
    const now = Date.now();
    const timeSpentMs = sessionStartRef.current
      ? now - sessionStartRef.current
      : null;

    const entry = {
      id: generateId(),
      timestamp: now,
      dimension: data.dimension || null,
      difficulty: data.difficulty || 'medium',
      question: (data.question || '').slice(0, 500),
      answer: (data.answer || '').slice(0, 800),
      score: Number(data.score) || 0,
      nivel: Number(data.nivel) || 0,
      hintsUsed: Number(data.hintsUsed) || 0,
      isCrossChallenge: Boolean(data.isCrossChallenge),
      timeSpentMs,
      feedback: {
        fortaleza: (data.feedbackSummary?.fortaleza || '').slice(0, 300),
        mejora: (data.feedbackSummary?.mejora || '').slice(0, 300),
        criterios: data.feedbackSummary?.criterios || null
      },
      reflection: null // se llena después con addReflection
    };

    setEntries((prev) => {
      // Limitar por dimensión para evitar sesgo en estadísticas
      const others = prev.filter((e) => e.dimension !== entry.dimension);
      const same = prev.filter((e) => e.dimension === entry.dimension);
      const trimmed = same.slice(-(MAX_PER_DIMENSION - 1));
      const next = [...others, ...trimmed, entry];
      saveToStorage(next);
      return next;
    });

    sessionStartRef.current = null;
    return entry.id;
  }, []);

  /**
   * Agrega reflexión metacognitiva a un intento existente.
   * @param {string} attemptId
   * @param {string} reflectionText
   */
  const addReflection = useCallback((attemptId, reflectionText) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === attemptId
          ? { ...e, reflection: (reflectionText || '').slice(0, 500) }
          : e
      );
      saveToStorage(next);
      return next;
    });
  }, []);

  /**
   * Últimos N intentos (para renderizar historial).
   */
  const recentAttempts = useMemo(() => {
    return filtered.slice(-10).reverse(); // más reciente primero
  }, [filtered]);

  return {
    entries: filtered,
    stats,
    recentAttempts,
    startAttempt,
    recordAttempt,
    addReflection
  };
}
