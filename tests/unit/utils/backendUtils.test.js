import { checkBackendAvailability, processPdfWithBackend, getBackendUrl } from '../../../src/utils/backendUtils';

jest.mock('../../../src/utils/netUtils', () => ({
  fetchWithTimeout: jest.fn()
}));

import { fetchWithTimeout } from '../../../src/utils/netUtils';

describe('backendUtils', () => {
  beforeEach(() => jest.clearAllMocks());

  test('checkBackendAvailability devuelve true cuando ok', async () => {
    fetchWithTimeout.mockResolvedValue({ ok: true, status: 200 });
    await expect(checkBackendAvailability()).resolves.toBe(true);
  });

  test('checkBackendAvailability devuelve false en error', async () => {
    fetchWithTimeout.mockRejectedValue(new Error('fail'));
    await expect(checkBackendAvailability()).resolves.toBe(false);
  });

  test('processPdfWithBackend procesa respuesta exitosa', async () => {
    const file = new File(['dummy'], 'demo.pdf', { type: 'application/pdf' });
    fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'contenido extraído' })
    });
    await expect(processPdfWithBackend(file)).resolves.toBe('contenido extraído');
    expect(fetchWithTimeout).toHaveBeenCalled();
  });

  test('processPdfWithBackend lanza error si no ok', async () => {
    const file = new File(['dummy'], 'demo.pdf', { type: 'application/pdf' });
    fetchWithTimeout.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });
    await expect(processPdfWithBackend(file)).rejects.toThrow('boom');
  });

  test('getBackendUrl devuelve string', () => {
    expect(typeof getBackendUrl()).toBe('string');
  });
});
