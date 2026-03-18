import { parseAllowedModels, pickAllowedModel } from '../../../server/utils/modelUtils.js';

describe('modelUtils', () => {
  describe('parseAllowedModels', () => {
    test('parsea CSV con trim', () => {
      const result = parseAllowedModels(' gpt-4o-mini , gpt-4o , gpt-3.5-turbo ');
      expect(result).toEqual(new Set(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']));
    });

    test('usa fallback cuando envValue está vacío', () => {
      expect(parseAllowedModels('', 'deepseek-chat')).toEqual(new Set(['deepseek-chat']));
      expect(parseAllowedModels(undefined, 'deepseek-chat')).toEqual(new Set(['deepseek-chat']));
      expect(parseAllowedModels(null, 'deepseek-chat')).toEqual(new Set(['deepseek-chat']));
    });

    test('retorna Set vacío si no hay ni envValue ni fallback', () => {
      expect(parseAllowedModels('')).toEqual(new Set());
    });

    test('ignora elementos vacíos entre comas', () => {
      expect(parseAllowedModels('a,,b, ,c')).toEqual(new Set(['a', 'b', 'c']));
    });
  });

  describe('pickAllowedModel', () => {
    const allowed = new Set(['gpt-4o-mini', 'gpt-4o']);

    test('devuelve requested si está en allowed', () => {
      expect(pickAllowedModel({ requested: 'gpt-4o', allowed, fallback: 'gpt-4o-mini' })).toBe('gpt-4o');
    });

    test('devuelve fallback si requested no está en allowed', () => {
      expect(pickAllowedModel({ requested: 'gpt-3.5-turbo', allowed, fallback: 'gpt-4o-mini' })).toBe('gpt-4o-mini');
    });

    test('devuelve primer elemento de allowed si ni requested ni fallback coinciden', () => {
      expect(pickAllowedModel({ requested: 'invalid', allowed, fallback: 'also-invalid' })).toBe('gpt-4o-mini');
    });

    test('devuelve requested si allowed está vacío', () => {
      expect(pickAllowedModel({ requested: 'any-model', allowed: new Set(), fallback: 'fb' })).toBe('any-model');
    });

    test('devuelve fallback si requested y allowed están vacíos', () => {
      expect(pickAllowedModel({ requested: '', allowed: new Set(), fallback: 'fb' })).toBe('fb');
    });
  });
});
