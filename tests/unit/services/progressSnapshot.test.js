import { buildProgressSnapshot } from '../../../src/services/progressSnapshot';

describe('progressSnapshot', () => {
  test('no mezcla artefactos de otra lectura cuando existe progreso scopeado por texto', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-actual',
      rubricProgress: {},
      activitiesProgress: {
        'lectura-actual': {
          artifacts: {}
        },
        'lectura-ajena': {
          artifacts: {
            resumenAcademico: {
              submitted: true,
              score: 9,
              attempts: 1,
              submittedAt: '2026-03-18T10:00:00.000Z'
            }
          }
        }
      }
    });

    expect(snapshot.rubricsById.rubrica1.started).toBe(false);
    expect(snapshot.rubricsById.rubrica1.effectiveScore).toBe(0);
    expect(snapshot.summary.coverageCount).toBe(0);
  });

  test('mantiene compatibilidad con estructura legacy en raiz cuando no hay scope por lectura', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-legacy',
      rubricProgress: {},
      activitiesProgress: {
        artifacts: {
          resumenAcademico: {
            submitted: true,
            score: 7.5,
            attempts: 1,
            submittedAt: '2026-03-18T11:00:00.000Z'
          }
        }
      }
    });

    expect(snapshot.rubricsById.rubrica1.started).toBe(true);
    expect(snapshot.rubricsById.rubrica1.effectiveScore).toBe(7.5);
    expect(snapshot.summary.coverageCount).toBe(1);
  });
});
