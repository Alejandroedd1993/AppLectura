import { parseBool } from '../../../server/utils/envUtils.js';

describe('envUtils — parseBool', () => {
  test.each([
    ['true', true],
    ['TRUE', true],
    ['True', true],
    ['1', true],
    ['yes', true],
    ['YES', true],
    ['on', true],
    ['ON', true],
  ])('reconoce %s como true', (input, expected) => {
    expect(parseBool(input)).toBe(expected);
  });

  test.each([
    ['false', false],
    ['0', false],
    ['no', false],
    ['off', false],
    ['random', false],
    ['', false],
  ])('reconoce %s como false', (input, expected) => {
    expect(parseBool(input)).toBe(expected);
  });

  test('retorna fallback cuando el valor está vacío', () => {
    expect(parseBool(undefined, true)).toBe(true);
    expect(parseBool(null, true)).toBe(true);
    expect(parseBool('', true)).toBe(true);
    expect(parseBool('  ', true)).toBe(true);
  });

  test('fallback por defecto es false', () => {
    expect(parseBool(undefined)).toBe(false);
    expect(parseBool(null)).toBe(false);
  });

  test('trata booleanos nativos correctamente', () => {
    expect(parseBool(true)).toBe(true);
    expect(parseBool(false)).toBe(false);
  });
});
