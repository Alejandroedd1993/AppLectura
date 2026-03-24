/**
 * Lógica de decisión de búsqueda web para Pre-lectura.
 * Determina si un texto necesita enriquecimiento web y genera las queries apropiadas.
 */

import { parseBool as parseBooleanEnv } from '../utils/envUtils.js';

/**
 * Detecta si el texto requiere búsqueda web usando scoring ponderado.
 * @param {string} text - Texto a analizar
 * @param {object} metadata - Metadata del documento
 * @returns {{ needsWeb: boolean, confidence: number, reasons: string[], threshold: number, classroomMode: boolean, minIndicators: number, onlyWeakSignal: boolean, matches: number }}
 */
export function detectWebSearchNeed(text, metadata) {
  const classroomMode = parseBooleanEnv(process.env.PRELECTURA_WEB_CLASSROOM_MODE);

  const indicators = {
    recent_dates: /202[3-5]|2024|2025/gi.test(text),
    statistics: /\d+%|\d+\.\d+%/g.test(text),
    locations: /(Ecuador|Colombia|Perú|Argentina|Chile)/gi.test(text),
    news_genre: metadata.genero_textual === 'noticia',
    current_events: /(crisis|reforma|elecciones|pandemia)/gi.test(text)
  };

  const reasons = Object.entries(indicators)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  // Señales ponderadas: país/ubicación es una señal débil por sí sola.
  const weights = {
    recent_dates: 1,
    statistics: 1,
    locations: 0.25,
    news_genre: 1,
    current_events: 1
  };

  const maxWeight = Object.keys(indicators).reduce((sum, key) => sum + (weights[key] ?? 1), 0);
  const weightedScore = Object.keys(indicators).reduce((sum, key) => {
    if (!indicators[key]) return sum;
    return sum + (weights[key] ?? 1);
  }, 0) / maxWeight;

  const matches = reasons.length;

  // Nunca disparar solo por "locations" (beneficioso para modo aula y reduce coste).
  const onlyWeakSignal = reasons.length === 1 && reasons[0] === 'locations';

  // En "modo aula", evitamos falsos positivos exigiendo más señales.
  const minIndicators = classroomMode ? 2 : 1;

  const thresholdRaw = Number(process.env.PRELECTURA_WEB_SCORE_THRESHOLD);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : (classroomMode ? 0.7 : 0.4); // defaults más conservadores en aula

  const needsWeb = !onlyWeakSignal && weightedScore >= threshold && matches >= minIndicators;

  return {
    needsWeb,
    confidence: weightedScore,
    reasons,
    threshold,
    classroomMode,
    minIndicators,
    onlyWeakSignal,
    matches
  };
}

/**
 * Genera queries de búsqueda inteligentes basadas en temas detectados.
 * PRIVACIDAD: No copia frases del texto al proveedor web.
 * @param {string} text - Texto fuente
 * @param {string[]} reasons - Razones de necesidad web (de detectWebSearchNeed)
 * @returns {string[]}
 */
export function generateSearchQueries(text, reasons) {
  const queries = [];

  // PRIVACIDAD: No copiamos frases del texto al proveedor web.
  // En su lugar, detectamos temas genéricos (whitelist) + país + año, para evitar exfiltrar PII.
  const KNOWN_LOCATIONS = ['Ecuador', 'Colombia', 'Perú', 'Argentina', 'Chile'];
  const locationMatch = text.match(/\b(Ecuador|Colombia|Perú|Argentina|Chile)\b/i);
  const location = locationMatch ? locationMatch[0] : null;

  const year = new Date().getFullYear();

  const TOPIC_WHITELIST = [
    'pobreza',
    'desigualdad',
    'educación',
    'salud',
    'empleo',
    'inflación',
    'violencia',
    'migración',
    'corrupción',
    'elecciones',
    'reforma',
    'pandemia',
    'medio ambiente',
    'cambio climático',
    'derechos humanos'
  ];

  const lower = text.toLowerCase();
  const foundTopics = TOPIC_WHITELIST
    .filter((topic) => lower.includes(topic.toLowerCase()))
    .slice(0, 4);

  const topicPart = foundTopics.length > 0 ? foundTopics.join(' ') : 'contexto social';
  const placePart = location ? `${location}` : '';

  if (reasons.includes('recent_dates') || reasons.includes('current_events')) {
    queries.push(`${topicPart} ${placePart} noticias ${year} ${year - 1}`.trim());
  }

  if (reasons.includes('statistics')) {
    queries.push(`${topicPart} ${placePart} estadísticas datos oficiales ${year}`.trim());
  }

  if (reasons.includes('locations') && location) {
    queries.push(`${location} contexto actual indicadores ${year}`.trim());
  }

  // Fallback genérico si no hay razones suficientes
  if (queries.length === 0) {
    queries.push(`${topicPart} ${placePart} contexto y datos oficiales ${year}`.trim());
  }

  // De-duplicar y limitar longitud
  return Array.from(new Set(queries))
    .map((q) => q.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Extrae hallazgos clave de las fuentes web, ordenados por relevancia.
 * @param {Array<{score: number, snippet: string}>} sources
 * @returns {string[]}
 */
export function extractKeyFindings(sources) {
  return sources
    .sort((a, b) => b.score - a.score)
    .map(s => s.snippet)
    .filter(Boolean);
}

/**
 * Formatea la decisión de búsqueda web en metadata plana para la respuesta.
 * @param {object|null} searchDecision - Resultado de detectWebSearchNeed
 * @returns {object}
 */
export function buildWebDecisionMetadata(searchDecision) {
  if (!searchDecision || typeof searchDecision !== 'object') {
    return {
      web_decision_needs_web: false,
      web_decision_confidence: 0,
      web_decision_reasons: [],
      web_decision_threshold: null,
      web_decision_classroom_mode: false,
      web_decision_min_indicators: null,
      web_decision_only_weak_signal: null,
      web_decision_indicators_matched: 0
    };
  }

  return {
    web_decision_needs_web: !!searchDecision.needsWeb,
    web_decision_confidence:
      typeof searchDecision.confidence === 'number' && Number.isFinite(searchDecision.confidence)
        ? searchDecision.confidence
        : 0,
    web_decision_reasons: Array.isArray(searchDecision.reasons) ? searchDecision.reasons : [],
    web_decision_threshold:
      typeof searchDecision.threshold === 'number' && Number.isFinite(searchDecision.threshold)
        ? searchDecision.threshold
        : null,
    web_decision_classroom_mode: !!searchDecision.classroomMode,
    web_decision_min_indicators:
      typeof searchDecision.minIndicators === 'number' && Number.isFinite(searchDecision.minIndicators)
        ? searchDecision.minIndicators
        : null,
    web_decision_only_weak_signal:
      typeof searchDecision.onlyWeakSignal === 'boolean' ? searchDecision.onlyWeakSignal : null,
    web_decision_indicators_matched:
      typeof searchDecision.matches === 'number' && Number.isFinite(searchDecision.matches)
        ? searchDecision.matches
        : (Array.isArray(searchDecision.reasons) ? searchDecision.reasons.length : 0)
  };
}
