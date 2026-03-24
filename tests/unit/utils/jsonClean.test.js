import { stripJsonFences } from '../../../src/utils/jsonClean';

describe('jsonClean', () => {
  test('preserva arrays JSON envueltos en code fences', () => {
    const raw = '```json\n[{"id":1},{"id":2}]\n```';

    expect(stripJsonFences(raw)).toBe('[{"id":1},{"id":2}]');
  });

  test('extrae arrays aunque contengan objetos internos', () => {
    const raw = 'Respuesta:\n[{"criterio":"a"},{"criterio":"b"}]\nFin';

    expect(stripJsonFences(raw)).toBe('[{"criterio":"a"},{"criterio":"b"}]');
  });

  test('mantiene objetos JSON cuando el primer bloque es un objeto', () => {
    const raw = '```json\n{"ok":true,"items":[1,2]}\n```';

    expect(stripJsonFences(raw)).toBe('{"ok":true,"items":[1,2]}');
  });
});