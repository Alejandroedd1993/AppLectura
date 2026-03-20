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

  test('expone bestRecordedScore considerando override o sumativo si superan la mejor formativa', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-score-max',
      rubricProgress: {
        rubrica1: {
          scores: [
            { score: 7, artefacto: 'ResumenAcademico', timestamp: 1 }
          ],
          average: 7,
          artefactos: ['ResumenAcademico']
        }
      },
      activitiesProgress: {
        'lectura-score-max': {
          artifacts: {
            resumenAcademico: {
              submitted: true,
              teacherOverrideScore: 9,
              attempts: 1,
              submittedAt: '2026-03-18T15:00:00.000Z'
            }
          }
        }
      }
    });

    expect(snapshot.rubricsById.rubrica1.effectiveScore).toBe(9);
    expect(snapshot.rubricsById.rubrica1.bestFormativeScore).toBe(7);
    expect(snapshot.rubricsById.rubrica1.bestRecordedScore).toBe(9);
  });

  test('ordena intentos formativos por timestamp antes de decidir la ultima evidencia', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-desordenada',
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

    expect(snapshot.rubricsById.rubrica1.formativeScores.map((entry) => entry.score)).toEqual([5, 9]);
    expect(snapshot.rubricsById.rubrica1.effectiveScore).toBe(9);
    expect(snapshot.rubricsById.rubrica1.lastActivityAt).toBe(20);
  });

  test('trata un promedio legacy como evidencia valida aunque no existan scores detallados', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-legacy-average',
      rubricProgress: {
        rubrica3: {
          average: 6.5,
          artefactos: ['MapaActores']
        }
      },
      activitiesProgress: {}
    });

    expect(snapshot.rubricsById.rubrica3.started).toBe(true);
    expect(snapshot.rubricsById.rubrica3.evaluated).toBe(true);
    expect(snapshot.rubricsById.rubrica3.effectiveScore).toBe(6.5);
    expect(snapshot.rubricsById.rubrica3.totalAttempts).toBe(1);
    expect(snapshot.hasData).toBe(true);
    expect(snapshot.summary.coverageCount).toBe(1);
  });

  test('usa una etapa de cobertura completa con foco de mejora cuando aun hay dimensiones debiles', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-balance',
      rubricProgress: {
        rubrica1: { scores: [{ score: 8.5, artefacto: 'ResumenAcademico', timestamp: 1 }], average: 8.5, artefactos: ['ResumenAcademico'] },
        rubrica2: { scores: [{ score: 10, artefacto: 'TablaACD', timestamp: 2 }], average: 10, artefactos: ['TablaACD'] },
        rubrica3: { scores: [{ score: 5, artefacto: 'MapaActores', timestamp: 3 }], average: 5, artefactos: ['MapaActores'] },
        rubrica4: { scores: [{ score: 7.5, artefacto: 'RespuestaArgumentativa', timestamp: 4 }], average: 7.5, artefactos: ['RespuestaArgumentativa'] },
        rubrica5: { scores: [{ score: 7.5, artefacto: 'BitacoraEticaIA', timestamp: 5 }], average: 7.5, artefactos: ['BitacoraEticaIA'] }
      },
      activitiesProgress: {}
    });

    expect(snapshot.summary.coverageCount).toBe(5);
    expect(snapshot.summary.weakCount).toBe(1);
    expect(snapshot.stage.id).toBe('balanced-focus');
    expect(snapshot.stage.label).toBe('Cobertura completa con foco de mejora');
  });

  test('el mejor puntaje del resumen usa el maximo historico y no solo la nota vigente', () => {
    const snapshot = buildProgressSnapshot({
      lectureId: 'lectura-best-summary',
      rubricProgress: {
        rubrica1: {
          scores: [
            { score: 9, artefacto: 'ResumenAcademico', timestamp: 1 },
            { score: 7, artefacto: 'ResumenAcademico', timestamp: 2 }
          ],
          average: 7,
          artefactos: ['ResumenAcademico']
        },
        rubrica2: {
          scores: [
            { score: 8, artefacto: 'TablaACD', timestamp: 3 }
          ],
          average: 8,
          artefactos: ['TablaACD']
        }
      },
      activitiesProgress: {}
    });

    expect(snapshot.rubricsById.rubrica1.effectiveScore).toBe(7);
    expect(snapshot.rubricsById.rubrica1.bestRecordedScore).toBe(9);
    expect(snapshot.summary.bestScore).toBe(9);
  });
});
