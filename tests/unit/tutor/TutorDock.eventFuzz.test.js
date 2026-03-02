import React from 'react';
import { render, waitFor } from '@testing-library/react';
import TutorDock from '../../../src/components/tutor/TutorDock';
import { AppContext } from '../../../src/context/AppContext';
import { generateTextHash } from '../../../src/utils/cache';
import baseline from './fuzz-baseline.json';

const mockApi = {
  messages: [],
  loading: false,
  setContext: jest.fn(),
  loadMessages: jest.fn(),
  cancelPending: jest.fn(),
  clear: jest.fn(),
  sendPrompt: jest.fn(() => Promise.resolve()),
  sendAction: jest.fn(() => Promise.resolve()),
  generateSessionSummary: jest.fn(() => Promise.resolve()),
  regenerateLastResponse: jest.fn(() => Promise.resolve()),
};

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: null }),
}));

jest.mock('../../../src/components/tutor/TutorCore', () => ({
  __esModule: true,
  default: ({ children }) => children(mockApi),
}));

function dispatchStorageLikeEvent({ key, newValue }) {
  const ev = new Event('storage');
  Object.defineProperty(ev, 'storageArea', { value: localStorage });
  Object.defineProperty(ev, 'key', { value: key });
  Object.defineProperty(ev, 'newValue', { value: newValue });
  window.dispatchEvent(ev);
}

function getStorageKeyFor(texto, courseScope = 'course-fuzz') {
  const textHash = generateTextHash(texto, 'tutor');
  return `tutorHistorial:guest:${courseScope}:${textHash}`;
}

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stddev(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, value) => {
    const d = value - m;
    return acc + d * d;
  }, 0) / values.length;
  return Math.sqrt(variance);
}

describe('TutorDock event fuzz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('soporta tormenta extrema (6000 eventos, 10 semillas) con métricas por semilla sin romper invariantes de concurrencia', async () => {
    const texts = [
      'Texto fuzz A con contexto educativo.',
      'Texto fuzz B con análisis literario.',
      'Texto fuzz C con lectura crítica.'
    ];

    let currentIndex = 0;
    const makeValue = (texto, index) => ({
      texto,
      setTexto: () => {},
      currentTextoId: `lectura-fuzz-${index}`,
      sourceCourseId: 'course-fuzz',
    });

    const { rerender } = render(
      <AppContext.Provider value={makeValue(texts[currentIndex], currentIndex)}>
        <TutorDock followUps={false} />
      </AppContext.Provider>
    );

    const payloadPool = [
      [{ r: 'assistant', c: 'R1' }],
      [{ r: 'assistant', c: 'R2' }, { r: 'user', c: 'U2' }],
      [{ r: 'user', c: 'R3' }],
      [{ r: 'assistant', c: 'R4' }, { r: 'assistant', c: 'R4b' }],
      [{ r: 'assistant', c: 'R5' }],
    ];

    const eventStats = {
      externalPrompt: 0,
      storage: 0,
      rerender: 0,
      readerAction: 0,
    };

    const seedStats = {};

    const runSeed = (seed, eventsPerSeed = 600) => {
      const rand = mulberry32(seed);
      seedStats[seed] = { externalPrompt: 0, storage: 0, rerender: 0, readerAction: 0 };
      for (let i = 0; i < eventsPerSeed; i++) {
        const op = Math.floor(rand() * 4);

        if (op === 0) {
          eventStats.externalPrompt += 1;
          seedStats[seed].externalPrompt += 1;
          window.dispatchEvent(new CustomEvent('tutor-external-prompt', {
            detail: { prompt: `Pregunta fuzz ${seed}-${i}` }
          }));
        } else if (op === 1) {
          eventStats.storage += 1;
          seedStats[seed].storage += 1;
          const key = getStorageKeyFor(texts[currentIndex]);
          const payload = payloadPool[Math.floor(rand() * payloadPool.length)];
          dispatchStorageLikeEvent({ key, newValue: JSON.stringify(payload) });
        } else if (op === 2) {
          eventStats.rerender += 1;
          seedStats[seed].rerender += 1;
          currentIndex = Math.floor(rand() * texts.length);
          rerender(
            <AppContext.Provider value={makeValue(texts[currentIndex], currentIndex)}>
              <TutorDock followUps={false} />
            </AppContext.Provider>
          );
        } else {
          eventStats.readerAction += 1;
          seedStats[seed].readerAction += 1;
          window.dispatchEvent(new CustomEvent('reader-action', {
            detail: {
              action: i % 2 === 0 ? 'explain' : 'summarize',
              text: `Fragmento fuzz ${seed}-${i} con contenido suficientemente largo para pasar validaciones.`
            }
          }));
        }
      }
    };

    const seeds = [20260301, 20260302, 20260303, 20260304, 20260305, 20260306, 20260307, 20260308, 20260309, 20260310];
    seeds.forEach((seed) => runSeed(seed, 600));

    const totalEvents = eventStats.externalPrompt + eventStats.storage + eventStats.rerender + eventStats.readerAction;
    expect(totalEvents).toBe(6000);
    expect(eventStats.externalPrompt).toBeGreaterThan(0);
    expect(eventStats.storage).toBeGreaterThan(0);
    expect(eventStats.rerender).toBeGreaterThan(0);
    expect(eventStats.readerAction).toBeGreaterThan(0);

    // Métricas por semilla para detectar outliers deterministas.
    seeds.forEach((seed) => {
      const s = seedStats[seed];
      const perSeedTotal = s.externalPrompt + s.storage + s.rerender + s.readerAction;
      expect(perSeedTotal).toBe(600);
      const nonZeroTypes = [s.externalPrompt, s.storage, s.rerender, s.readerAction].filter(v => v > 0).length;
      expect(nonZeroTypes).toBeGreaterThanOrEqual(3);
    });

    // Detección automática de outliers por semilla (z-score).
    // Objetivo: detectar patrones extraños si una semilla produce un reparto
    // muy desbalanceado respecto a las demás.
    const eventTypes = ['externalPrompt', 'storage', 'rerender', 'readerAction'];
    const outlierStats = {};
    const driftStats = {};

    eventTypes.forEach((eventType) => {
      const values = seeds.map((seed) => seedStats[seed][eventType]);
      const m = mean(values);
      const s = stddev(values);
      const zScores = values.map((value) => (s > 0 ? Math.abs((value - m) / s) : 0));
      const maxZ = Math.max(...zScores);

      outlierStats[eventType] = {
        mean: Number(m.toFixed(3)),
        stddev: Number(s.toFixed(3)),
        maxZ: Number(maxZ.toFixed(3))
      };

      // Umbral conservador para evitar flaky tests y aun así detectar anomalías reales.
      expect(maxZ).toBeLessThan(baseline.thresholds.maxZScore);

      // Validación contra baseline histórica: detectar deriva en distribución.
      const bl = baseline.eventStats[eventType];
      if (bl) {
        const meanDrift = bl.mean > 0 ? Math.abs(m - bl.mean) / bl.mean * 100 : 0;
        const stddevDrift = bl.stddev > 0 ? Math.abs(s - bl.stddev) / bl.stddev * 100 : 0;
        driftStats[eventType] = {
          meanDrift: Number(meanDrift.toFixed(2)),
          stddevDrift: Number(stddevDrift.toFixed(2))
        };
        expect(meanDrift).toBeLessThan(baseline.thresholds.maxMeanDriftPercent);
        expect(stddevDrift).toBeLessThan(baseline.thresholds.maxStddevDriftPercent);
      }
    });

    await waitFor(() => {
      expect(mockApi.cancelPending.mock.calls.length).toBeGreaterThanOrEqual(mockApi.loadMessages.mock.calls.length);
    });

    expect(mockApi.cancelPending.mock.calls.length).toBeGreaterThan(10);
    expect(mockApi.loadMessages.mock.calls.length).toBeGreaterThan(10);
    expect(mockApi.sendPrompt).toHaveBeenCalled();
    expect(mockApi.sendAction).toHaveBeenCalled();
    expect(mockApi.setContext).toHaveBeenCalled();

    // Métrica de salida útil para auditoría forense reproducible.
    // eslint-disable-next-line no-console
    console.log('[fuzz-metrics]', {
      seeds,
      totalEvents,
      eventStats,
      seedStats,
      outlierStats,
      driftStats,
      cancelPendingCalls: mockApi.cancelPending.mock.calls.length,
      loadMessagesCalls: mockApi.loadMessages.mock.calls.length,
      sendPromptCalls: mockApi.sendPrompt.mock.calls.length,
      sendActionCalls: mockApi.sendAction.mock.calls.length,
    });
  });
});
