import { TtlCache } from '../../../src/utils/TtlCache';

describe('TtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('expulsa entradas expiradas de size y keys', () => {
    const cache = new TtlCache({ maxEntries: 10, ttlMs: 1000 });

    cache.set('a', 1);
    cache.set('b', 2);

    jest.advanceTimersByTime(1001);

    expect(cache.size).toBe(0);
    expect(Array.from(cache.keys())).toEqual([]);
  });

  test('conserva el orden LRU al hacer get', () => {
    const cache = new TtlCache({ maxEntries: 2, ttlMs: 5000 });

    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);

    cache.set('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });
});