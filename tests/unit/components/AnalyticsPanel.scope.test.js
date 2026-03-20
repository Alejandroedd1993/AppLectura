import { withinCurrentScope } from '../../../src/components/evaluacion/AnalyticsPanel';

describe('AnalyticsPanel scope helpers', () => {
  test('excluye sesiones legacy sin textoId cuando ya existe una lectura actual', () => {
    expect(withinCurrentScope({
      sourceCourseId: 'curso-1',
      progressSnapshot: { hasData: true }
    }, 'lectura-actual', 'curso-1')).toBe(false);
  });

  test('mantiene sesiones cuyo texto y curso coinciden con el scope actual', () => {
    expect(withinCurrentScope({
      currentTextoId: 'lectura-actual',
      sourceCourseId: 'curso-1',
      progressSnapshot: { hasData: true }
    }, 'lectura-actual', 'curso-1')).toBe(true);
  });
});
