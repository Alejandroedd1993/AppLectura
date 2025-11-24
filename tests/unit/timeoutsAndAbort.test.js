/**
 * Tests unitarios ligeros para validar timeout y abort wiring (simulados)
 * Nota: Aquí probamos el contrato de fetchWithTimeout con un AbortController externo.
 */
import { fetchWithTimeout } from '../../src/utils/netUtils';

global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})); // never resolves

describe('fetchWithTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('aborta por timeout', async () => {
    const start = Date.now();
    const p = fetchWithTimeout('/api/dummy', {}, 1000);
    jest.advanceTimersByTime(1200);
    await expect(p).rejects.toThrow();
  });

  test('respeta AbortController externo', async () => {
    const controller = new AbortController();
    const p = fetchWithTimeout('/api/dummy', { signal: controller.signal }, 5000);
    controller.abort();
    await expect(p).rejects.toThrow();
  });
});
