import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';
import {
  buildDistributionChartData,
  buildDistributionInsights,
  buildProgressChartModel,
  buildRadarChartData,
  compareSessionsByTimestamp,
  getSessionAttemptCount,
  getSessionAverageForRubrics,
  getSessionTimestamp,
  hasSessionScoreForRubrics
} from '../../../src/services/progressAnalyticsView';

describe('progressAnalyticsView', () => {
  test('usa progressSnapshot para la serie temporal aunque rubricProgress llegue vacio', () => {
    const rubricProgress = {
      rubrica1: {
        scores: [
          { score: 4, artefacto: 'ResumenAcademico', timestamp: 1 },
          { score: 6, artefacto: 'ResumenAcademico', timestamp: 2 }
        ],
        average: 5,
        artefactos: ['ResumenAcademico']
      }
    };

    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-chart',
      rubricProgress,
      activitiesProgress: {}
    });

    const model = buildProgressChartModel({
      rubricProgress: {},
      progressSnapshot: snapshot
    });

    expect(model.activeRubrics).toEqual(['rubrica1']);
    expect(model.chartData).toEqual([
      { attempt: 1, rubrica1: 4 },
      { attempt: 2, rubrica1: 6 }
    ]);
  });

  test('ordena la serie temporal por timestamp aunque los intentos legacy lleguen desordenados', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-chart-desordenado',
      rubricProgress: {
        rubrica1: {
          scores: [
            { score: 9, artefacto: 'ResumenAcademico', timestamp: 20 },
            { score: 5, artefacto: 'ResumenAcademico', timestamp: 10 }
          ],
          average: 7,
          artefactos: ['ResumenAcademico']
        }
      },
      activitiesProgress: {}
    });

    const model = buildProgressChartModel({
      rubricProgress: {},
      progressSnapshot: snapshot
    });

    expect(model.chartData).toEqual([
      { attempt: 1, rubrica1: 5 },
      { attempt: 2, rubrica1: 9 }
    ]);
  });

  test('usa progressSnapshot para radar y distribucion cuando la nota viene de override docente', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-override',
      rubricProgress: {},
      activitiesProgress: {
        'lectura-override': {
          artifacts: {
            resumenAcademico: {
              submitted: true,
              teacherOverrideScore: 9,
              attempts: 2,
              submittedAt: '2026-03-18T10:00:00.000Z'
            }
          }
        }
      }
    });

    const radarData = buildRadarChartData({
      rubricProgress: {},
      progressSnapshot: snapshot
    });
    const distributionData = buildDistributionChartData({
      rubricProgress: {},
      progressSnapshot: snapshot
    });

    expect(radarData).toEqual([
      expect.objectContaining({
        rubric: 'rubrica1',
        score: 9
      })
    ]);
    expect(distributionData).toEqual([
      expect.objectContaining({
        rubric: 'rubrica1',
        attempts: 2,
        average: 9,
        best: 9,
        last: 9
      })
    ]);
  });

  test('mantiene intentos pendientes en distribucion sin inventar notas en cero', () => {
    const distributionData = buildDistributionChartData({
      rubricProgress: {},
      progressSnapshot: {
        rubrics: [
          {
            rubricId: 'rubrica3',
            totalAttempts: 2,
            effectiveScore: 0,
            bestRecordedScore: 0,
            currentStatusLabel: 'Pendiente de revision',
            formativeScores: []
          }
        ]
      }
    });

    expect(distributionData).toEqual([
      expect.objectContaining({
        rubric: 'rubrica3',
        attempts: 2,
        average: null,
        best: null,
        last: null,
        hasScoreData: false,
        statusLabel: 'Pendiente de revision'
      })
    ]);
  });

  test('mantiene nota legacy sin inventar intentos cuando el snapshot no trae contador historico', () => {
    const distributionData = buildDistributionChartData({
      rubricProgress: {},
      progressSnapshot: {
        rubrics: [
          {
            rubricId: 'rubrica2',
            totalAttempts: 0,
            effectiveScore: 8,
            bestRecordedScore: 8,
            hasLegacyScoreOnlyEvidence: true,
            currentStatusLabel: 'Competente',
            formativeScores: []
          }
        ]
      }
    });

    expect(distributionData).toEqual([
      expect.objectContaining({
        rubric: 'rubrica2',
        attempts: 0,
        average: 8,
        best: 8,
        last: 8,
        hasScoreData: true,
        hasLegacyScoreOnlyEvidence: true
      })
    ]);
  });

  test('calcula insights de distribucion por intentos reales y no por orden de rubrica', () => {
    const insights = buildDistributionInsights([
      { name: 'Comprension', attempts: 1, average: 7, last: 7 },
      { name: 'ACD', attempts: 5, average: 8, last: 9 },
      { name: 'Contextualizacion', attempts: 0, average: null, last: null }
    ]);

    expect(insights).toContain('ACD es tu dimension mas practicada (5 intentos)');
    expect(insights).toContain('Considera practicar mas Contextualizacion (solo 0 intentos)');
  });

  test('calcula promedio historico con solo rubricas evaluadas y no penaliza faltantes como cero', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-promedio',
      rubricProgress: {
        rubrica1: {
          scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
          average: 8,
          artefactos: ['ResumenAcademico']
        },
        rubrica2: {
          scores: [{ score: 6, artefacto: 'TablaACD', timestamp: 2 }],
          average: 6,
          artefactos: ['TablaACD']
        }
      },
      activitiesProgress: {}
    });

    const average = getSessionAverageForRubrics({
      progressSnapshot: snapshot,
      rubricProgress: {}
    });

    expect(average).toBe(7);
  });

  test('cuenta intentos segun las rubricas filtradas y no usa el total global del snapshot', () => {
    const session = {
      progressSnapshot: buildProgressSnapshot({
        lectureId: 'lectura-intentos',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
            average: 8,
            artefactos: ['ResumenAcademico']
          },
          rubrica2: {
            scores: [
              { score: 5, artefacto: 'TablaACD', timestamp: 2 },
              { score: 7, artefacto: 'TablaACD', timestamp: 3 }
            ],
            average: 6,
            artefactos: ['TablaACD']
          }
        },
        activitiesProgress: {}
      }),
      rubricProgress: {}
    };

    expect(getSessionAttemptCount(session)).toBe(3);
    expect(getSessionAttemptCount(session, ['rubrica1'])).toBe(1);
    expect(getSessionAttemptCount(session, ['rubrica2'])).toBe(2);
  });

  test('no infla intentos de snapshots legacy cuando solo existe una nota sin historial detallado', () => {
    const session = {
      progressSnapshot: {
        summary: { totalAttempts: 0 },
        rubricsById: {
          rubrica4: {
            rubricId: 'rubrica4',
            totalAttempts: 0,
            effectiveScore: 7.5
          }
        }
      },
      rubricProgress: {}
    };

    expect(getSessionAttemptCount(session, ['rubrica4'])).toBe(0);
  });

  test('detecta cuando una sesion no tiene nota para la rubrica filtrada', () => {
    const session = {
      progressSnapshot: buildProgressSnapshot({
        lectureId: 'lectura-filtro',
        rubricProgress: {
          rubrica1: {
            scores: [{ score: 8, artefacto: 'ResumenAcademico', timestamp: 1 }],
            average: 8,
            artefactos: ['ResumenAcademico']
          }
        },
        activitiesProgress: {}
      }),
      rubricProgress: {}
    };

    expect(hasSessionScoreForRubrics(session, ['rubrica1'])).toBe(true);
    expect(hasSessionScoreForRubrics(session, ['rubrica3'])).toBe(false);
    expect(getSessionAverageForRubrics(session, ['rubrica3'])).toBe(0);
  });

  test('normaliza timestamps de sesion aunque lleguen como string o timestamp serializado', () => {
    expect(getSessionTimestamp({
      createdAt: '2026-03-18T10:30:00.000Z'
    })).toBe(Date.parse('2026-03-18T10:30:00.000Z'));

    expect(getSessionTimestamp({
      timestamp: { seconds: 1710844200 }
    })).toBe(1710844200 * 1000);

    expect(getSessionTimestamp({
      lastModified: 1710844300000
    })).toBe(1710844300000);
  });

  test('ordena sesiones sin fecha al final para no inventar cronologia en comparaciones', () => {
    const datedSession = { createdAt: '2026-03-18T10:30:00.000Z' };
    const undatedSession = {};

    expect(compareSessionsByTimestamp(datedSession, undatedSession)).toBeLessThan(0);
    expect(compareSessionsByTimestamp(undatedSession, datedSession)).toBeGreaterThan(0);
    expect(compareSessionsByTimestamp({}, {})).toBe(0);
  });
});
