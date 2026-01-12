import { validateEssayPrerequisites } from '../../../src/services/prerequisitesValidator';

describe('prerequisitesValidator.validateEssayPrerequisites', () => {
  test('bloquea si falta algún artefacto obligatorio', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 7.5 } },
      rubrica2: { formative: { artefactos: [], average: 8.0 } },
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 } },
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 } },
      rubrica5: { formative: { artefactos: ['BitacoraEticaIA'], average: 9.0 } }
    };

    const result = validateEssayPrerequisites(progress);
    expect(result.canAccess).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  test('bloquea si no cumple minScoreEach', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 4.9 } },
      rubrica2: { formative: { artefactos: ['AnalisisCriticoDiscurso'], average: 8.0 } },
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 } },
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 } }
    };

    const result = validateEssayPrerequisites(progress, { minScoreEach: 5.0 });
    expect(result.canAccess).toBe(false);
    expect(result.allPassingScore).toBe(false);
  });

  test('permite acceso cuando están los 4 artefactos y puntajes mínimos', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 7.5 } },
      rubrica2: { formative: { artefactos: ['AnalisisCriticoDiscurso'], average: 8.0 } },
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 } },
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 } }
    };

    const result = validateEssayPrerequisites(progress);
    expect(result.canAccess).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.allPassingScore).toBe(true);
  });

  test('acepta TablaACD como equivalente a AnalisisCriticoDiscurso (compatibilidad)', () => {
    const progress = {
      rubrica1: { formative: { artefactos: ['ResumenAcademico'], average: 7.5 } },
      rubrica2: { formative: { artefactos: ['TablaACD'], average: 8.0 } },
      rubrica3: { formative: { artefactos: ['MapaActores'], average: 7.0 } },
      rubrica4: { formative: { artefactos: ['RespuestaArgumentativa'], average: 8.5 } }
    };

    const result = validateEssayPrerequisites(progress);
    expect(result.canAccess).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
