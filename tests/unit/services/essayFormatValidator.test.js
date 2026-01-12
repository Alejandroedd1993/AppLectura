import { validateEssayFormat } from '../../../src/services/essayFormatValidator';

describe('essayFormatValidator.validateEssayFormat', () => {
  test('rechaza ensayo corto', () => {
    const essay = 'palabra '.repeat(700);
    const result = validateEssayFormat(essay);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/800/);
  });

  test('rechaza ensayo sin citas', () => {
    const essay = `${'palabra '.repeat(900)}\n\n${'palabra '.repeat(200)}\n\n${'palabra '.repeat(200)}\n\n${'palabra '.repeat(200)}\n\n${'palabra '.repeat(200)}\n\nresumen`;
    const result = validateEssayFormat(essay);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/citas/i);
  });

  test('acepta ensayo válido (heurístico)', () => {
    const essay = [
      'En mi resumen previo analicé la tesis principal del texto.',
      '"Primera cita del texto original con suficiente longitud"',
      'Ahora conecto esa idea con mi mapa de actores y sus tensiones.',
      '"Segunda cita del texto original con suficiente longitud"',
      'Propongo un contraargumento basado en evidencia textual.',
      '"Tercera cita del texto original con suficiente longitud"'
    ].join('\n\n');

    const result = validateEssayFormat(essay);
    // El texto del test es corto, así que bajamos minWords solo aquí.
    const relaxed = validateEssayFormat(essay, { minWords: 50, maxWords: 2000 });

    expect(relaxed.valid).toBe(true);
    expect(relaxed.stats.citationCount).toBeGreaterThanOrEqual(3);
    expect(relaxed.stats.paragraphCount).toBeGreaterThanOrEqual(5);
  });

  // 🆕 Hallazgo 2: Test para comillas angulares «...»
  test('cuenta comillas angulares «...» como citas válidas', () => {
    const essay = [
      'En mi resumen previo analicé la tesis principal.',
      '«Primera cita con comillas angulares suficientemente larga»',
      'Desarrollo de la idea con mapa de actores.',
      '«Segunda cita con comillas angulares suficientemente larga»',
      'Contraargumento basado en evidencia.',
      '«Tercera cita con comillas angulares suficientemente larga»'
    ].join('\n\n');

    // Relajar todas las otras validaciones para enfocarnos en citationCount
    const relaxed = validateEssayFormat(essay, {
      minWords: 1,
      maxWords: 10000,
      minParagraphs: 1,
      requireArtifactReferences: false
    });

    expect(relaxed.stats.citationCount).toBe(3);
    expect(relaxed.valid).toBe(true);
  });

  test('cuenta mezcla de comillas dobles y angulares', () => {
    const essay = [
      'Análisis del texto con referencia al resumen.',
      '"Primera cita con comillas dobles suficientemente larga"',
      'Conexión con el mapa de actores.',
      '«Segunda cita con comillas angulares suficientemente larga»',
      'Argumentación final.',
      '"Tercera cita con comillas dobles suficientemente larga"'
    ].join('\n\n');

    // Relajar todas las otras validaciones para enfocarnos en citationCount
    const relaxed = validateEssayFormat(essay, {
      minWords: 1,
      maxWords: 10000,
      minParagraphs: 1,
      requireArtifactReferences: false
    });

    expect(relaxed.stats.citationCount).toBe(3);
    expect(relaxed.valid).toBe(true);
  });
});
