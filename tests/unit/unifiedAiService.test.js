/**
 * Tests unitarios básicos para unifiedAiService helpers
 */
import { parseJSONFromContent, extractContent } from '../../src/services/unifiedAiService';

describe('unifiedAiService helpers', () => {
  test('extractContent retorna el contenido del primer choice', () => {
    const json = {
      choices: [
        { message: { content: 'Hola mundo' } }
      ]
    };
    expect(extractContent(json)).toBe('Hola mundo');
  });

  test('parseJSONFromContent parsea JSON simple', () => {
    const input = '{"a":1,"b":"x"}';
    expect(parseJSONFromContent(input)).toEqual({ a: 1, b: 'x' });
  });

  test('parseJSONFromContent elimina code fences ```json', () => {
    const input = '```json\n{\n  "ok": true\n}\n```';
    expect(parseJSONFromContent(input)).toEqual({ ok: true });
  });

  test('parseJSONFromContent intenta extraer el primer objeto JSON si hay ruido', () => {
    const input = 'texto antes {"k":42} texto después';
    expect(parseJSONFromContent(input)).toEqual({ k: 42 });
  });

  test('parseJSONFromContent retorna null cuando no hay JSON válido', () => {
    const input = 'sin json aquí';
    expect(parseJSONFromContent(input)).toBeNull();
  });
});
