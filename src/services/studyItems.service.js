/**
 * StudyItemsService
 * Persistencia ligera y reactiva para items de estudio (aprendizaje espaciado) derivados del feedback.
 * Inspirado en AnnotationsService (estructura y patrón de suscripción / persistencia con debounce).
 *
 * Modelo de item (baseline scheduler.createStudyItem):
 * {
 *   itemId: string,
 *   content: string,
 *   dimension: string,
 *   anchor: { type, criterion, dimension, createdAt } | null,
 *   interval: number,
 *   repetition: number,
 *   ef: number,
 *   dueDate: ISOString,
 *   isActive: boolean,
 *   reviewCount: number,
 *   averageQuality: number,
 *   lastQuality: number|null
 * }
 */

// Scheduler (CommonJS) para reutilizar lógica SM-2
// eslint-disable-next-line
const { scheduleNext, getDueItems, updateStudyItem, validateQuality, createStudyItem } = require('../pedagogy/spaced/scheduler');

const SCHEMA_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 150;

function safeParse(json) { try { return JSON.parse(json); } catch { return null; } }

function simpleHash(str) { // pequeño hash no-cripto
  let h = 0, i = 0, len = str.length;
  while (i < len) { h = (h << 5) - h + str.charCodeAt(i++) | 0; }
  return (h >>> 0).toString(36);
}

function buildStorageKey(textHash) {
  return `studyitems:${textHash}:v${SCHEMA_VERSION}`;
}

class StudyItemsServiceImpl {
  constructor() {
    this._cache = new Map(); // storageKey -> { items: [], dirty: false }
    this._subscribers = new Map(); // storageKey -> Set<fn>
    this._persistTimers = new Map(); // storageKey -> timeout
  }

  _reset() { // solo tests
    this._persistTimers.forEach(id => clearTimeout(id));
    this._persistTimers.clear();
    this._cache.clear();
    this._subscribers.clear();
  }

  computeKeyFromText(text) {
    if (!text || !text.trim()) return null;
    return buildStorageKey(simpleHash(text));
  }

  _ensureEntry(storageKey) {
    if (!this._cache.has(storageKey)) {
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
      console.warn('[StudyItemsService] Persistencia fallida, manteniendo en memoria.', e);
    }
  }

  _schedulePersist(storageKey) {
    if (this._persistTimers.has(storageKey)) return;
    const id = setTimeout(() => {
      this._persistTimers.delete(storageKey);
      this._persistNow(storageKey);
    }, PERSIST_DEBOUNCE_MS);
    this._persistTimers.set(storageKey, id);
  }

  _markDirty(storageKey) {
    const entry = this._cache.get(storageKey);
    if (!entry) return;
    entry.dirty = true;
    this._schedulePersist(storageKey);
  }

  _emit(storageKey) {
    const subs = this._subscribers.get(storageKey);
    if (subs) {
      const snapshot = this.list(storageKey);
      subs.forEach(fn => { try { fn(snapshot); } catch {} });
    }
  }

  subscribe(storageKey, fn) {
    if (!storageKey || typeof fn !== 'function') return () => {};
    if (!this._subscribers.has(storageKey)) this._subscribers.set(storageKey, new Set());
    this._subscribers.get(storageKey).add(fn);
    fn(this.list(storageKey));
    return () => {
      const set = this._subscribers.get(storageKey);
      if (set) { set.delete(fn); if (!set.size) this._subscribers.delete(storageKey); }
    };
  }

  list(storageKey) {
    const entry = this._ensureEntry(storageKey);
    return entry.items.map(it => ({ ...it }));
  }

  addItems(storageKey, items = []) {
    if (!storageKey || !Array.isArray(items) || !items.length) return [];
    const entry = this._ensureEntry(storageKey);
    // Evitar duplicados simples por content + dimension
    const existing = new Set(entry.items.map(i => `${i.content}::${i.dimension}`));
    const added = [];
    for (const it of items) {
      const sig = `${it.content}::${it.dimension}`;
      if (existing.has(sig)) continue;
      entry.items.push(it);
      existing.add(sig);
      added.push(it);
    }
    if (added.length) {
      this._markDirty(storageKey);
      this._emit(storageKey);
    }
    return added;
  }

  updateItem(storageKey, itemId, quality) {
    const entry = this._ensureEntry(storageKey);
    const idx = entry.items.findIndex(i => i.itemId === itemId);
    if (idx === -1) return null;
    try { validateQuality(quality); } catch { return null; }
    // Programar siguiente intervalo
    const scheduled = scheduleNext(entry.items[idx], quality);
    const updated = updateStudyItem(scheduled, quality, { dueDate: scheduled.dueDate });
    entry.items[idx] = updated;
    this._markDirty(storageKey);
    this._emit(storageKey);
    return updated;
  }

  getDue(storageKey, referenceDate = new Date()) {
    const entry = this._ensureEntry(storageKey);
    return getDueItems(entry.items, referenceDate);
  }

  flush(storageKey) {
    if (this._persistTimers.has(storageKey)) {
      clearTimeout(this._persistTimers.get(storageKey));
      this._persistTimers.delete(storageKey);
    }
    this._persistNow(storageKey);
  }
}

export const StudyItemsService = new StudyItemsServiceImpl();
export default StudyItemsService;
