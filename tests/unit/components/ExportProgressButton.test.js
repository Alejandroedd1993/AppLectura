import { buildCsvRows, CSV_HEADERS } from '../../../src/components/actividades/ExportProgressButton';

describe('ExportProgressButton helpers', () => {
  test('no genera Invalid Date cuando un intento legacy no trae timestamp', () => {
    const rows = buildCsvRows({
      rubrics: [
        {
          rubricId: 'rubrica1',
          artifactName: 'Resumen Academico',
          formativeScores: [{ score: 7 }],
          lastActivityAt: Date.parse('2026-03-20T10:00:00.000Z'),
          currentStatusLabel: 'Competente',
          effectiveScore: 7,
          totalAttempts: 1,
          scoreBand: { rank: 3 },
          badgeLabel: 'Competente',
          started: true,
          isPendingReview: false,
          summativeAttempted: false,
          artifactData: null
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].sortTime).toBe(Date.parse('2026-03-20T10:00:00.000Z'));
    expect(rows[0].values[0]).not.toContain('Invalid Date');
  });

  test('explica en el CSV cuando existe nota legacy sin historial de intentos', () => {
    const rows = buildCsvRows({
      rubrics: [
        {
          rubricId: 'rubrica3',
          artifactName: 'Mapa de Actores',
          formativeScores: [],
          lastActivityAt: null,
          currentStatusLabel: 'Competente',
          effectiveScore: 6.5,
          totalAttempts: 0,
          hasLegacyScoreOnlyEvidence: true,
          scoreBand: { rank: 3 },
          badgeLabel: 'Competente',
          started: true,
          isPendingReview: false,
          summativeAttempted: false,
          artifactData: null
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].values[6]).toBe('Sin registro legacy');
  });

  test('usa la metadata canonica del snapshot cuando falta artifactName explicito', () => {
    const rows = buildCsvRows({
      rubrics: [
        {
          rubricId: 'rubrica2',
          formativeScores: [{ score: 8.5, timestamp: '2026-03-20T10:00:00.000Z' }],
          lastActivityAt: Date.parse('2026-03-20T10:00:00.000Z'),
          currentStatusLabel: 'Experto',
          effectiveScore: 8.5,
          totalAttempts: 1,
          scoreBand: { rank: 4 },
          badgeLabel: 'Experto',
          started: true,
          isPendingReview: false,
          summativeAttempted: false,
          artifactData: null
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].values[1]).toBe('Tabla ACD');
  });

  test('aclara en el encabezado cuando la ultima columna puede contener un registro legacy', () => {
    expect(CSV_HEADERS[6]).toBe('Intento o registro');
  });
});
