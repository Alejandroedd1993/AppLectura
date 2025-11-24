import { genId, hashText, fetchWithTimeout } from '../../../src/utils/netUtils';

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
});
