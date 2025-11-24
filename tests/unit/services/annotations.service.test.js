import { AnnotationsService, simpleHash } from '../../../src/services/annotations.service';

// Mock simple localStorage for test env if not present
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k,v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };
}

describe('AnnotationsService', () => {
  const sampleText = 'Parrafo 1.\n\nParrafo 2.';
  const key = AnnotationsService.computeKeyFromText(sampleText);

  beforeEach(() => {
    AnnotationsService.clearAll(key);
  });

  test('computeKeyFromText genera clave estable', () => {
    const k1 = AnnotationsService.computeKeyFromText(sampleText);
    const k2 = AnnotationsService.computeKeyFromText(sampleText);
    expect(k1).toBe(k2);
    expect(k1).toMatch(/annotations:/);
  });

  test('addHighlight y toggleHighlight funcionan', () => {
    const res1 = AnnotationsService.toggleHighlight(key, 0);
    expect(res1.active).toBe(true);
    expect(AnnotationsService.listHighlights(key)).toHaveLength(1);
    const res2 = AnnotationsService.toggleHighlight(key, 0);
    expect(res2.active).toBe(false);
    expect(AnnotationsService.listHighlights(key)).toHaveLength(0);
  });

  test('addNote crea nota con contenido', () => {
    const note = AnnotationsService.addNote(key, { paragraphIndex: 1, text: 'Idea clave' });
    expect(note.kind).toBe('note');
    const notes = AnnotationsService.listNotes(key);
    expect(notes.map(n => n.text)).toContain('Idea clave');
  });

  test('addNote acepta meta adicional', () => {
    const note = AnnotationsService.addNote(key, { text: 'Con meta', meta: { posicion: { x: 10, y: 20 } } });
    expect(note.meta.posicion).toEqual({ x: 10, y: 20 });
  });

  test('updateAnnotation modifica nota', () => {
    const note = AnnotationsService.addNote(key, { text: 'Inicial' });
    const updated = AnnotationsService.updateAnnotation(key, note.id, { text: 'Actualizado' });
    expect(updated.text).toBe('Actualizado');
  });

  test('removeAnnotation elimina anotación', () => {
    const h = AnnotationsService.addHighlight(key, 0, 'Texto');
    const ok = AnnotationsService.removeAnnotation(key, h.id);
    expect(ok).toBe(true);
    expect(AnnotationsService.listHighlights(key)).toHaveLength(0);
  });

  test('persistencia en localStorage', () => {
    AnnotationsService.addHighlight(key, 1, 'Persistente');
    // Debe persistir tras debounce; forzamos flush
    AnnotationsService.flush(key);
    const stored = localStorage.getItem(key);
    expect(stored).toBeTruthy();
    // Crear nueva instancia lógica: forzamos limpiar cache interna
    AnnotationsService._cache.delete(key);
    const again = AnnotationsService.listHighlights(key);
    expect(again).toHaveLength(1);
  });

  test('subscribe notifica cambios', () => {
    const events = [];
    const unsub = AnnotationsService.subscribe(key, state => events.push(state.length));
    AnnotationsService.addNote(key, { text: 'N1' });
    AnnotationsService.addNote(key, { text: 'N2' });
    unsub();
    expect(events).toEqual([0,1,2]);
  });

  test('addAnchor y listAnchors filtran por tipo', () => {
    AnnotationsService.addAnchor(key, { paragraphIndex: 0, anchorType: 'question', refId: 'q1', data: { level: 'critico' } });
    AnnotationsService.addAnchor(key, { paragraphIndex: 1, anchorType: 'feedback', refId: 'f1', data: { score: 8 } });
    const allAnchors = AnnotationsService.listAnchors(key);
    expect(allAnchors).toHaveLength(2);
    const questions = AnnotationsService.listAnchors(key, { anchorType: 'question' });
    expect(questions).toHaveLength(1);
  });

  test('toExportBundle retorna estructura segmentada', () => {
    const bundle = AnnotationsService.toExportBundle(key);
    expect(bundle.version).toBeDefined();
    expect(Array.isArray(bundle.highlights)).toBe(true);
    expect(Array.isArray(bundle.notes)).toBe(true);
    expect(Array.isArray(bundle.anchors)).toBe(true);
  });
});
