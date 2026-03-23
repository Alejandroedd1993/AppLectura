import { tryRepairJSON } from '../../../server/services/jsonRepair.service.js';

describe('jsonRepair.service', () => {
  test('parsea JSON válido sin modificarlo', () => {
    expect(tryRepairJSON('{"ok":true,"items":[1,2]}')).toEqual({ ok: true, items: [1, 2] });
  });

  test('remueve fences markdown antes de parsear', () => {
    const payload = '```json\n{"titulo":"Prueba","items":[1]}\n```';

    expect(tryRepairJSON(payload)).toEqual({ titulo: 'Prueba', items: [1] });
  });

  test('repara JSON truncado cerrando estructuras abiertas', () => {
    const payload = '{"titulo":"Prueba","items":[{"id":1,"texto":"hola"}';

    expect(tryRepairJSON(payload)).toEqual({
      titulo: 'Prueba',
      items: [{ id: 1, texto: 'hola' }]
    });
  });

  test('devuelve null cuando la reparación no es posible', () => {
    expect(tryRepairJSON('{titulo: sin comillas')).toBeNull();
    expect(tryRepairJSON('')).toBeNull();
  });
});