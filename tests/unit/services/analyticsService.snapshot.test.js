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
    expect(stats.performance.strengths).toEqual([
      expect.objectContaining({
        rubricId: 'rubrica1',
        score: 9
      })
    ]);
  });
});
