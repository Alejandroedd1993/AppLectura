/**
 * Tests para preLecturaWebDecision.service.js
 * Valida detección de necesidad web, generación de queries, hallazgos y metadata.
 */

import {
  detectWebSearchNeed,
  generateSearchQueries,
  extractKeyFindings,
  buildWebDecisionMetadata,
} from '../../../server/services/preLecturaWebDecision.service.js';

/* ─── helpers ─── */
const envBackup = { ...process.env };
afterEach(() => {
  process.env = { ...envBackup };
});

/* ─── detectWebSearchNeed ─── */
describe('detectWebSearchNeed', () => {
  test('devuelve needsWeb=false para texto sin indicadores', () => {
    const result = detectWebSearchNeed('Este es un texto genérico sin fechas ni lugares.', {});
    expect(result.needsWeb).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  test('detecta fechas recientes como indicador', () => {
    const result = detectWebSearchNeed('La reforma de 2024 cambió las reglas.', {});
    expect(result.reasons).toContain('recent_dates');
    expect(result.needsWeb).toBe(true);
  });

  test('detecta estadísticas como indicador', () => {
    const result = detectWebSearchNeed('El 45.3% de la población vive en pobreza según datos recientes.', {});
    expect(result.reasons).toContain('statistics');
  });

  test('detecta ubicaciones como indicador (señal débil)', () => {
    const result = detectWebSearchNeed('La situación en Ecuador es preocupante.', {});
    expect(result.reasons).toContain('locations');
    // Solo locations es señal débil → no dispara web
    expect(result.onlyWeakSignal).toBe(true);
    expect(result.needsWeb).toBe(false);
  });

  test('detecta género noticia en metadata', () => {
    const result = detectWebSearchNeed('Texto de prueba.', { genero_textual: 'noticia' });
    expect(result.reasons).toContain('news_genre');
  });

  test('detecta eventos actuales', () => {
    const result = detectWebSearchNeed('La crisis económica afecta a millones.', {});
    expect(result.reasons).toContain('current_events');
  });

  test('múltiples indicadores elevan confidence', () => {
    const text = 'En 2024, la crisis en Ecuador dejó un 30% de desempleo tras las elecciones.';
    const result = detectWebSearchNeed(text, {});
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.needsWeb).toBe(true);
  });

  test('modo aula exige más indicadores', () => {
    process.env.PRELECTURA_WEB_CLASSROOM_MODE = 'true';
    const text = 'La reforma de 2024 fue importante.';
    const result = detectWebSearchNeed(text, {});
    expect(result.classroomMode).toBe(true);
    expect(result.minIndicators).toBe(2);
    // Solo 1 indicador (recent_dates) → no pasa minIndicators=2
    expect(result.needsWeb).toBe(false);
  });

  test('umbral personalizable por env', () => {
    process.env.PRELECTURA_WEB_SCORE_THRESHOLD = '0.99';
    const text = 'En 2024(crisis) Ecuador 30% elecciones pandemia';
    const result = detectWebSearchNeed(text, {});
    expect(result.threshold).toBe(0.99);
    // Aunque tiene varios indicadores, el threshold 0.99 es demasiado alto
  });
});

/* ─── generateSearchQueries ─── */
describe('generateSearchQueries', () => {
  test('genera query de noticias para recent_dates', () => {
    const queries = generateSearchQueries(
      'La pobreza en Ecuador es preocupante.',
      ['recent_dates']
    );
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0]).toMatch(/pobreza/i);
    expect(queries[0]).toMatch(/Ecuador/i);
    expect(queries[0]).toMatch(/noticias/i);
  });

  test('genera query de estadísticas para statistics', () => {
    const queries = generateSearchQueries(
      'La inflación impacta la salud pública.',
      ['statistics']
    );
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0]).toMatch(/estadísticas/i);
  });

  test('genera query de contexto para locations', () => {
    const queries = generateSearchQueries(
      'Una situación en Colombia.',
      ['locations']
    );
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0]).toMatch(/Colombia/i);
  });

  test('genera fallback genérico sin razones suficientes', () => {
    const queries = generateSearchQueries(
      'Un texto sin temas reconocibles.',
      []
    );
    expect(queries.length).toBe(1);
    expect(queries[0]).toMatch(/contexto social/i);
  });

  test('de-duplica queries', () => {
    const queries = generateSearchQueries(
      'La crisis y la reforma en Ecuador causaron pandemia.',
      ['recent_dates', 'current_events']
    );
    const unique = new Set(queries);
    expect(queries.length).toBe(unique.size);
  });

  test('limita a máximo 5 queries', () => {
    const queries = generateSearchQueries(
      'pobreza educación salud empleo inflación corrupción reforma pandemia en Ecuador',
      ['recent_dates', 'statistics', 'locations', 'current_events']
    );
    expect(queries.length).toBeLessThanOrEqual(5);
  });
});

/* ─── extractKeyFindings ─── */
describe('extractKeyFindings', () => {
  test('ordena por score descendente y extrae snippets', () => {
    const sources = [
      { score: 0.5, snippet: 'Bajo score' },
      { score: 0.9, snippet: 'Alto score' },
      { score: 0.7, snippet: 'Medio score' },
    ];
    const findings = extractKeyFindings(sources);
    expect(findings).toEqual(['Alto score', 'Medio score', 'Bajo score']);
  });

  test('filtra snippets vacíos o falsy', () => {
    const sources = [
      { score: 0.9, snippet: 'Válido' },
      { score: 0.8, snippet: '' },
      { score: 0.7, snippet: null },
      { score: 0.6, snippet: undefined },
    ];
    const findings = extractKeyFindings(sources);
    expect(findings).toEqual(['Válido']);
  });

  test('devuelve array vacío para fuentes vacías', () => {
    expect(extractKeyFindings([])).toEqual([]);
  });
});

/* ─── buildWebDecisionMetadata ─── */
describe('buildWebDecisionMetadata', () => {
  test('devuelve defaults para null', () => {
    const meta = buildWebDecisionMetadata(null);
    expect(meta.web_decision_needs_web).toBe(false);
    expect(meta.web_decision_confidence).toBe(0);
    expect(meta.web_decision_reasons).toEqual([]);
  });

  test('devuelve defaults para undefined', () => {
    const meta = buildWebDecisionMetadata(undefined);
    expect(meta.web_decision_needs_web).toBe(false);
  });

  test('mapea correctamente una decisión positiva', () => {
    const decision = {
      needsWeb: true,
      confidence: 0.85,
      reasons: ['recent_dates', 'statistics'],
      threshold: 0.4,
      classroomMode: false,
      minIndicators: 1,
      onlyWeakSignal: false,
      matches: 2
    };
    const meta = buildWebDecisionMetadata(decision);
    expect(meta.web_decision_needs_web).toBe(true);
    expect(meta.web_decision_confidence).toBe(0.85);
    expect(meta.web_decision_reasons).toEqual(['recent_dates', 'statistics']);
    expect(meta.web_decision_threshold).toBe(0.4);
    expect(meta.web_decision_classroom_mode).toBe(false);
    expect(meta.web_decision_min_indicators).toBe(1);
    expect(meta.web_decision_only_weak_signal).toBe(false);
    expect(meta.web_decision_indicators_matched).toBe(2);
  });

  test('maneja campos faltantes sin crash', () => {
    const meta = buildWebDecisionMetadata({});
    expect(meta.web_decision_needs_web).toBe(false);
    expect(meta.web_decision_confidence).toBe(0);
    expect(meta.web_decision_reasons).toEqual([]);
    expect(meta.web_decision_threshold).toBeNull();
    expect(meta.web_decision_indicators_matched).toBe(0);
  });
});
