/**
 * AnnotationsService
 * Unifica gestión de resaltados y notas vinculadas a un texto segmentado.
 * Objetivos:
 *  - Fuente única de verdad (Single Source) para highlights & notes.
 *  - Persistencia basada en hash de contenido + versión de segmentación.
 *  - API inmutable externa (no exponer estructuras internas mutables).
 *  - Preparado para extender a anchors semánticos (ej. preguntas socráticas).
 *
 * Modelo de datos:
 *  annotation = {
 *    id: string,
 *    kind: 'highlight' | 'note',
 *    paragraphIndex?: number, // obligatorio para highlight; opcional para note si se asocia a rango
 *    range?: { start: number, end: number }, // offsets sobre texto completo (futuro)
 *    text?: string,          // texto capturado (highlight) o contenido de nota
 *    meta?: { createdAt: number, updatedAt: number, source?: string }
 *  }
 *
 * Persistencia:
 *  localStorage key pattern: annotations:<hashTexto>:v1
 *  (futuro) IndexedDB si volumen > threshold
 */

// Versión de esquema para facilitar migraciones futuras
const SCHEMA_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 120; // coalescing de escrituras rápidas (toggles sucesivos)

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

// Pequeño hash no criptográfico (coincide con patrón ya usado en segmentTextService si existe)
export function simpleHash(str) {
  let h = 0, i = 0, len = str.length;
  while (i < len) { h = (h << 5) - h + str.charCodeAt(i++) | 0; }
  return (h >>> 0).toString(36);
}

function buildStorageKey(textHash) {
  return `annotations:${textHash}:v${SCHEMA_VERSION}`;
}

class AnnotationsServiceImpl {
  constructor() {
    this._cache = new Map(); // clave = storageKey, valor = { items: [], dirty: false }
    this._subscribers = new Map(); // clave = storageKey, valor = Set<fn>
    this._persistTimers = new Map(); // clave = storageKey, valor = timeout id
  }

  // SOLO para entorno de pruebas: limpia completamente el estado interno
  _reset() {
    this._persistTimers.forEach(id => clearTimeout(id));
    this._persistTimers.clear();
    this._cache.clear();
    this._subscribers.clear();
  }

  _ensureEntry(storageKey) {
    if (!this._cache.has(storageKey)) {
      // Cargar de localStorage si existe
      let data = [];
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = safeParse(raw);
            if (parsed && Array.isArray(parsed.items)) data = parsed.items;
        }
      }
      this._cache.set(storageKey, { items: data, dirty: false });
    }
    return this._cache.get(storageKey);
  }

  _persistNow(storageKey) {
    const entry = this._cache.get(storageKey);
    if (!entry || !entry.dirty) return;
    try {
      const payload = JSON.stringify({ version: SCHEMA_VERSION, items: entry.items });
      localStorage.setItem(storageKey, payload);
      entry.dirty = false;
    } catch (e) {
      console.warn('[AnnotationsService] Persistencia fallida, manteniendo en memoria.', e);
    }
  }

  _schedulePersist(storageKey) {
    if (this._persistTimers.has(storageKey)) return; // ya hay timer
    const id = setTimeout(() => {
      this._persistTimers.delete(storageKey);
      this._persistNow(storageKey);
    }, PERSIST_DEBOUNCE_MS);
    this._persistTimers.set(storageKey, id);
  }

  _markDirtyAndSchedule(storageKey) {
    const entry = this._cache.get(storageKey);
    if (!entry) return;
    entry.dirty = true;
    this._schedulePersist(storageKey);
  }

  _emit(storageKey) {
    const subs = this._subscribers.get(storageKey);
    if (subs) {
      const snapshot = this.listByStorageKey(storageKey);
      subs.forEach(fn => { try { fn(snapshot); } catch {} });
    }
  }

  _makeId() { return Math.random().toString(36).slice(2, 10); }

  // API pública -----------------------------------------------------------

  computeKeyFromText(text) {
    if (!text || !text.trim()) return null;
    return buildStorageKey(simpleHash(text));
  }

  subscribe(storageKey, fn) {
    if (!storageKey || typeof fn !== 'function') return () => {};
    if (!this._subscribers.has(storageKey)) this._subscribers.set(storageKey, new Set());
    this._subscribers.get(storageKey).add(fn);
    // Emitir estado inicial
    fn(this.listByStorageKey(storageKey));
    return () => {
      const set = this._subscribers.get(storageKey);
      if (set) { set.delete(fn); if (!set.size) this._subscribers.delete(storageKey); }
    };
  }

  listByStorageKey(storageKey) {
    const entry = this._ensureEntry(storageKey);
    // Devolver copia inmutable
    return entry.items.map(item => ({ ...item, meta: { ...item.meta } }));
  }

  listHighlights(storageKey) {
    return this.listByStorageKey(storageKey).filter(a => a.kind === 'highlight');
  }

  listNotes(storageKey) {
    return this.listByStorageKey(storageKey).filter(a => a.kind === 'note');
  }

  addHighlight(storageKey, paragraphIndex, text, source='manual') {
    if (paragraphIndex == null) throw new Error('paragraphIndex requerido');
    const entry = this._ensureEntry(storageKey);
    const now = Date.now();
    const annotation = {
      id: this._makeId(),
      kind: 'highlight',
      paragraphIndex,
      text: text || undefined,
      meta: { createdAt: now, updatedAt: now, source }
    };
    entry.items.push(annotation);
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
    return annotation;
  }

  toggleHighlight(storageKey, paragraphIndex, source='manual') {
    const entry = this._ensureEntry(storageKey);
    const existingIdx = entry.items.findIndex(a => a.kind === 'highlight' && a.paragraphIndex === paragraphIndex);
    if (existingIdx >= 0) {
      const [removed] = entry.items.splice(existingIdx, 1);
      this._markDirtyAndSchedule(storageKey);
      this._emit(storageKey);
      return { removed, active: false };
    } else {
      const added = this.addHighlight(storageKey, paragraphIndex, undefined, source);
      return { added, active: true };
    }
  }

  addNote(storageKey, { paragraphIndex=null, text='', source='manual', meta: extraMeta } = {}) {
    const entry = this._ensureEntry(storageKey);
    const now = Date.now();
    const annotation = {
      id: this._makeId(),
      kind: 'note',
      paragraphIndex: paragraphIndex == null ? undefined : paragraphIndex,
      text,
      meta: { createdAt: now, updatedAt: now, source, ...(extraMeta || {}) }
    };
    entry.items.push(annotation);
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
    return annotation;
  }

  updateAnnotation(storageKey, id, patch) {
    const entry = this._ensureEntry(storageKey);
    const idx = entry.items.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const now = Date.now();
    const current = entry.items[idx];
    const updated = { ...current, ...patch, meta: { ...current.meta, updatedAt: now } };
    entry.items[idx] = updated;
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
    return updated;
  }

  removeAnnotation(storageKey, id) {
    const entry = this._ensureEntry(storageKey);
    const idx = entry.items.findIndex(a => a.id === id);
    if (idx === -1) return false;
    entry.items.splice(idx, 1);
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
    return true;
  }

  clearAll(storageKey) {
    const entry = this._ensureEntry(storageKey);
    entry.items = [];
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
  }

  // ------------------ Anchors (preguntas / feedback / conceptos) ------------------
  addAnchor(storageKey, { paragraphIndex, anchorType, refId, data, source='auto' }) {
    if (paragraphIndex == null) throw new Error('paragraphIndex requerido para anchor');
    const entry = this._ensureEntry(storageKey);
    const now = Date.now();
    const annotation = {
      id: this._makeId(),
      kind: 'anchor',
      paragraphIndex,
      text: undefined,
      meta: { createdAt: now, updatedAt: now, source, anchorType, refId, data }
    };
    entry.items.push(annotation);
    this._markDirtyAndSchedule(storageKey);
    this._emit(storageKey);
    return annotation;
  }

  listAnchors(storageKey, filter = {}) {
    const { anchorType } = filter;
    return this.listByStorageKey(storageKey).filter(a => a.kind === 'anchor' && (!anchorType || a.meta?.anchorType === anchorType));
  }

  toExportBundle(storageKey) {
    const all = this.listByStorageKey(storageKey);
    return {
      version: SCHEMA_VERSION,
      highlights: all.filter(a => a.kind === 'highlight'),
      notes: all.filter(a => a.kind === 'note'),
      anchors: all.filter(a => a.kind === 'anchor')
    };
  }

  flush(storageKey) {
    // Forzar persistencia inmediata (para tests)
    if (this._persistTimers.has(storageKey)) {
      clearTimeout(this._persistTimers.get(storageKey));
      this._persistTimers.delete(storageKey);
    }
    this._persistNow(storageKey);
  }
}

export const AnnotationsService = new AnnotationsServiceImpl();
export default AnnotationsService;
