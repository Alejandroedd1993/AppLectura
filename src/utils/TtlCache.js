/**
 * Caché en memoria con TTL y límite de entradas (LRU).
 * Reemplaza a `new Map()` donde se necesita evicción automática.
 */
export class TtlCache {
  /**
   * @param {object} opts
   * @param {number} opts.maxEntries - Máximo de entradas antes de evicción LRU (default 200)
   * @param {number} opts.ttlMs      - Tiempo de vida por entrada en ms (default 30 min)
   */
  constructor({ maxEntries = 200, ttlMs = 30 * 60 * 1000 } = {}) {
    this._map = new Map();
    this._maxEntries = maxEntries;
    this._ttlMs = ttlMs;
  }

  has(key) {
    if (!this._map.has(key)) return false;
    const entry = this._map.get(key);
    if (Date.now() > entry.expiresAt) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    if (!this.has(key)) return undefined;
    const entry = this._map.get(key);
    // Mover al final para orden LRU
    this._map.delete(key);
    this._map.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // Si ya existe, borrar para reciclarlo al final
    if (this._map.has(key)) this._map.delete(key);

    // Evictar si se excede el límite
    while (this._map.size >= this._maxEntries) {
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
    }

    this._map.set(key, { value, expiresAt: Date.now() + this._ttlMs });
  }

  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }

  keys() {
    return this._map.keys();
  }
}
