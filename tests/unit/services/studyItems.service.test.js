import { StudyItemsService } from '../../../src/services/studyItems.service';

// Polyfill básico de localStorage para entorno Jest si no existe
if (typeof global.localStorage === 'undefined') {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

describe('StudyItemsService', () => {
  const texto = 'Parrafo único para hashing.';
  let key;

  beforeEach(() => {
    StudyItemsService._reset && StudyItemsService._reset();
    key = StudyItemsService.computeKeyFromText(texto);
  });

  test('computeKeyFromText devuelve key estable', () => {
    const k2 = StudyItemsService.computeKeyFromText(texto);
    expect(key).toBeTruthy();
    expect(k2).toBe(key);
  });

  test('addItems agrega evitando duplicados por content+dimension', () => {
    const items = [
      { itemId: 'a1', content: 'Explicar implicaciones', dimension: 'comprensionAnalitica', interval:0, repetition:0, ef:2.5, dueDate:new Date().toISOString(), isActive:true, reviewCount:0, averageQuality:0, lastQuality:null },
      { itemId: 'a2', content: 'Explicar implicaciones', dimension: 'comprensionAnalitica', interval:0, repetition:0, ef:2.5, dueDate:new Date().toISOString(), isActive:true, reviewCount:0, averageQuality:0, lastQuality:null }
    ];
    const added = StudyItemsService.addItems(key, items);
    expect(added.length).toBe(1);
    const list = StudyItemsService.list(key);
    expect(list.length).toBe(1);
  });

  test('updateItem reprograma intervalo y guarda review metadata', () => {
    const base = { itemId: 'a3', content: 'Relacionar argumentos', dimension: 'comprensionAnalitica', interval:0, repetition:0, ef:2.5, dueDate:new Date().toISOString(), isActive:true, reviewCount:0, averageQuality:0, lastQuality:null };
    StudyItemsService.addItems(key, [base]);
    const updated = StudyItemsService.updateItem(key, 'a3', 4);
    expect(updated).toBeTruthy();
    expect(updated.repetition).toBeGreaterThanOrEqual(1);
    expect(updated.reviewCount).toBe(1);
    expect(updated.lastQuality).toBe(4);
    const list = StudyItemsService.list(key);
    expect(list[0].reviewCount).toBe(1);
  });

  test('getDue retorna items con dueDate vencido', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    StudyItemsService.addItems(key, [
      { itemId: 'due1', content: 'Ejemplo pasado', dimension: 'comprensionAnalitica', interval:0, repetition:0, ef:2.5, dueDate: pastDate, isActive:true, reviewCount:0, averageQuality:0, lastQuality:null },
      { itemId: 'due2', content: 'Ejemplo futuro', dimension: 'comprensionAnalitica', interval:0, repetition:0, ef:2.5, dueDate: futureDate, isActive:true, reviewCount:0, averageQuality:0, lastQuality:null }
    ]);
    const due = StudyItemsService.getDue(key, new Date());
    expect(due.map(i=>i.itemId)).toContain('due1');
    expect(due.map(i=>i.itemId)).not.toContain('due2');
  });
});
