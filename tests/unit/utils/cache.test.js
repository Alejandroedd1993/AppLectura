import { generateTextHash } from '../../../src/utils/cache';

describe('cache utils', () => {
  test('generateTextHash conserva formato legacy estable', () => {
    const text = 'Inicio ' + 'bloque '.repeat(600) + ' cierre';
    const first = generateTextHash(text, 'tutor');
    const second = generateTextHash(text, 'tutor');

    expect(first).toBe(second);
    expect(first).toMatch(new RegExp(`^tutor_-?\\d+_${text.length}_\\d+_\\d+$`));
  });

  test('generateTextHash devuelve marcador empty para texto vacio', () => {
    expect(generateTextHash('', 'tutor')).toBe('tutor_empty');
  });
});