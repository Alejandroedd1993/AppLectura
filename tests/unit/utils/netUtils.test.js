import {
  createAbortControllerWithTimeout,
  genId,
  hashText,
  fetchWithTimeout,
  fetchWithRetry,
  retryAsync
} from '../../../src/utils/netUtils';

describe('netUtils', () => {
  test('genId produce un string y fallback cuando no hay crypto', () => {
    const oldCrypto = global.crypto;
    // Simular ausencia de crypto
    // eslint-disable-next-line no-global-assign
    global.crypto = undefined;
    const id = genId();
    expect(typeof id).toBe('string');
    expect(id.startsWith('id_')).toBe(true);
    global.crypto = oldCrypto;
  });

  test('hashText es determinista y cambia con el input', () => {
    const h1 = hashText('abc');
    const h2 = hashText('abc');
    const h3 = hashText('abcd');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{8}$/);
  });

  test('fetchWithTimeout aborta por timeout', async () => {
    const realFetch = global.fetch;
    global.fetch = jest.fn(() => new Promise(() => {})); // nunca resuelve

    await expect(fetchWithTimeout('http://x', {}, 10)).rejects.toHaveProperty('name', 'AbortError');

    global.fetch = realFetch;
  });

  test('fetchWithTimeout respeta AbortSignal externo', async () => {
    const realFetch = global.fetch;
    global.fetch = jest.fn(() => new Promise(() => {}));
    const controller = new AbortController();
    const p = fetchWithTimeout('http://x', { signal: controller.signal }, 1000);
    controller.abort();
    await expect(p).rejects.toHaveProperty('name', 'AbortError');
    global.fetch = realFetch;
  });

  test('retryAsync reintenta errores reintentables y luego resuelve', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    await expect(retryAsync(operation, { retries: 1, initialDelayMs: 0 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('fetchWithRetry no reintenta AbortError', async () => {
    const realFetch = global.fetch;
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(fetchWithRetry('http://x', {}, { retries: 2, initialDelayMs: 0 })).rejects.toHaveProperty('name', 'AbortError');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    global.fetch = realFetch;
  });

  test('fetchWithRetry reintenta fallo de red y conserva la respuesta', async () => {
    const realFetch = global.fetch;
    const response = { ok: true, json: jest.fn() };
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(response);

    await expect(fetchWithRetry('http://x', {}, { retries: 1, initialDelayMs: 0 })).resolves.toBe(response);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    global.fetch = realFetch;
  });

  test('createAbortControllerWithTimeout aborta al vencer el timeout', async () => {
    jest.useFakeTimers();

    const onTimeout = jest.fn();
    const abortControl = createAbortControllerWithTimeout({ timeoutMs: 25, onTimeout });

    jest.advanceTimersByTime(30);

    expect(abortControl.signal.aborted).toBe(true);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    abortControl.cleanup();
    jest.useRealTimers();
  });

  test('createAbortControllerWithTimeout propaga abort externo', () => {
    const externalController = new AbortController();
    const abortControl = createAbortControllerWithTimeout({ signal: externalController.signal });

    externalController.abort();

    expect(abortControl.signal.aborted).toBe(true);
    abortControl.cleanup();
  });
});
