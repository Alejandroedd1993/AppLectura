import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';
import { calculateDetailedStats } from '../../../src/services/analyticsService';

describe('analyticsService with progressSnapshot', () => {
  test('usa el snapshot unificado para resumen aunque rubricProgress no tenga scores formativos', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-1',
      rubricProgress: {},
      activitiesProgress: {
        'lectura-1': {
          artifacts: {
            resumenAcademico: {
              submitted: true,
              score: 9,
              attempts: 1,
              submittedAt: '2026-03-18T12:00:00.000Z'
            }
          }
        }
      }
    });

    const stats = calculateDetailedStats({}, snapshot);

    expect(stats.summary.totalRubrics).toBe(5);
    expect(stats.summary.evaluatedRubrics).toBe(1);
    expect(stats.summary.totalAttempts).toBe(1);
    expect(stats.summary.averageScore).toBe(9);
    expect(stats.summary.medianScore).toBe(9);
    expect(stats.summary.hasMedianData).toBe(true);
    expect(stats.trends.consistencyScore).toBe(0);
    expect(stats.trends.hasConsistencyData).toBe(false);
    expect(stats.performance.strengths).toEqual([
      expect.objectContaining({
        rubricId: 'rubrica1',
        rubricLabel: 'Comprension Analitica',
        score: 9
      })
    ]);
  });

  test('con snapshot mantiene tendencia e indicadores de mejora cuando hay historial formativo suficiente', () => {
    const rubricProgress = {
      rubrica1: {
        scores: [
          { score: 2, artefacto: 'ResumenAcademico', timestamp: 1 },
          { score: 4, artefacto: 'ResumenAcademico', timestamp: 2 },
          { score: 6, artefacto: 'ResumenAcademico', timestamp: 3 },
          { score: 8, artefacto: 'ResumenAcademico', timestamp: 4 }
        ],
        average: 5,
        artefactos: ['ResumenAcademico']
      }
    };

    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-2',
      rubricProgress,
      activitiesProgress: {}
    });

    const stats = calculateDetailedStats(rubricProgress, snapshot);

    expect(stats.trends.hasSufficientData).toBe(true);
    expect(stats.trends.overallTrend).toBe('improving');
    expect(stats.performance.improving).toEqual([
      expect.objectContaining({
        rubricId: 'rubrica1'
      })
    ]);
  });

  test('incluye scores snapshot-only en mediana y consistencia aunque ya existan formativas', () => {
    const rubricProgress = {
      rubrica1: {
        scores: [
          { score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }
        ],
        average: 8,
        artefactos: ['ResumenAcademico']
      }
    };

    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-mixta',
      rubricProgress,
      activitiesProgress: {
        'lectura-mixta': {
          artifacts: {
            tablaACD: {
              submitted: true,
              teacherOverrideScore: 10,
              attempts: 1,
              submittedAt: '2026-03-19T10:00:00.000Z'
            }
          }
        }
      }
    });

    const stats = calculateDetailedStats(rubricProgress, snapshot);

    expect(stats.summary.evaluatedRubrics).toBe(2);
    expect(stats.summary.averageScore).toBe(9);
    expect(stats.summary.medianScore).toBe(9);
    expect(stats.trends.hasConsistencyData).toBe(true);
  });
});
