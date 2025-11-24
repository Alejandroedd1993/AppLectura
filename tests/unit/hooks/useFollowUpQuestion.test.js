import { generateFollowUp } from '../../../src/hooks/useFollowUpQuestion';

/**
 * Test directo de la heurística generateFollowUp para garantizar ramas.
 */

describe('generateFollowUp heurística', () => {
  test('retorna null si texto corto', () => {
    expect(generateFollowUp('Muy corto.')).toBeNull();
  });

  test('detecta contraste', () => {
    const txt = 'Este es un texto suficientemente largo con varias ideas, sin embargo existen matices importantes que considerar para el análisis pedagógico y contextual.';
    const res = generateFollowUp(txt);
    expect(res).toMatch(/factores/);
  });

  test('detecta enumeración', () => {
    const txt = 'Contenido extenso que lista elementos: 1 causa principal, 2 efectos derivados y 3 implicaciones futuras para un marco educativo sostenible y reflexivo.';
    const res = generateFollowUp(txt);
    expect(res).toMatch(/más relevante/);
  });

  test('detecta términos capitalizados (conceptos)', () => {
    const txt = 'Este párrafo describe Innovación transversal apoyada en Metodologías que fomentan el Aprendizaje Significativo dentro de contextos educativos prolongados para reflexión.';
    const res = generateFollowUp(txt);
    expect(res).toMatch(/Cómo se relacionan/);
  });

  test('fallback genérico', () => {
    const base = 'A'.repeat(160); // texto largo sin patrones especiales
    const res = generateFollowUp(base);
    expect(res).toMatch(/implicaciones prácticas/);
  });
});
