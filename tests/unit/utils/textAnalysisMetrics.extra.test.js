import { estimarTiemposProcesamiento, identificarConceptosClave, analizarLegibilidad, calcularDensidadLexica, obtenerEstadisticasTexto } from '../../../src/utils/textAnalysisMetrics';

const textoLargo = 'Este es un texto de prueba suficientemente largo para activar los cálculos. Tiene varias oraciones. Y también repite palabras como aprendizaje aprendizaje aprendizaje y tecnología tecnología avanzada.';

describe('textAnalysisMetrics extras', () => {
  test('estimarTiemposProcesamiento calcula ramas por api y tamaño', () => {
    const r1 = estimarTiemposProcesamiento({ tamañoArchivo: 10 * 1024 * 1024 });
    expect(r1.archivo).toBeGreaterThanOrEqual(1);

    const r2 = estimarTiemposProcesamiento({ texto: 'a'.repeat(50000), api: 'openai' });
    expect(r2.analisis).toBeGreaterThan(0);

    const r3 = estimarTiemposProcesamiento({ texto: 'a'.repeat(50000), api: 'gemini' });
    expect(r3.analisis).toBeGreaterThan(0);

    const r4 = estimarTiemposProcesamiento({ texto: 'a'.repeat(50000), api: 'basico' });
    expect(r4.analisis).toBeGreaterThan(0);

    const r5 = estimarTiemposProcesamiento({ texto: 'a'.repeat(50000) }); // default
    expect(r5.analisis).toBeGreaterThan(0);
  });

  test('identificarConceptosClave retorna términos', () => {
    const conceptos = identificarConceptosClave(textoLargo);
    expect(Array.isArray(conceptos)).toBe(true);
    expect(conceptos.length).toBeGreaterThan(0);
  });

  test('analizarLegibilidad retorna índice y descripción', () => {
    const res = analizarLegibilidad(textoLargo);
    expect(typeof res.indice).toBe('number');
    expect(typeof res.descripcion).toBe('string');
  });

  test('calcularDensidadLexica retorna un número en [0,1]', () => {
    const d = calcularDensidadLexica(textoLargo);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });

  test('obtenerEstadisticasTexto retorna objeto con métricas', () => {
    const stats = obtenerEstadisticasTexto(textoLargo);
    expect(stats.caracteres).toBeGreaterThan(0);
    expect(stats.palabras).toBeGreaterThan(0);
    expect(stats.oraciones).toBeGreaterThan(0);
    expect(stats.tiempoLectura).toBeGreaterThan(0);
  });
});
