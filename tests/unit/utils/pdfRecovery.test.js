import fetchMock from 'jest-fetch-mock';
import { recoverPdfBlobWithFallback } from '../../../src/utils/pdfRecovery';

jest.mock('firebase/storage', () => ({
  ref: jest.fn(() => ({ path: 'mock-path' })),
  getBlob: jest.fn(),
}));

jest.mock('../../../src/firebase/config', () => ({
  storage: { bucket: 'test-bucket' },
}));

import { ref as storageRef, getBlob as firebaseGetBlob } from 'firebase/storage';

describe('pdfRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
  });

  test('retorna null cuando fileURL no es válido', async () => {
    await expect(recoverPdfBlobWithFallback('')).resolves.toBeNull();
    await expect(recoverPdfBlobWithFallback(null)).resolves.toBeNull();
    expect(firebaseGetBlob).not.toHaveBeenCalled();
  });

  test('usa Firebase SDK cuando getBlob devuelve blob válido', async () => {
    const blob = new Blob([new Uint8Array(800)], { type: 'application/pdf' });
    firebaseGetBlob.mockResolvedValue(blob);

    const result = await recoverPdfBlobWithFallback(
      'https://firebasestorage.googleapis.com/v0/b/test/o/users%2Fabc%2Fdemo.pdf?alt=media&token=x'
    );

    expect(storageRef).toHaveBeenCalled();
    expect(firebaseGetBlob).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ blob, method: 'sdk' });
  });

  test('cae a fetch directo cuando SDK falla', async () => {
    const blob = new Blob([new Uint8Array(900)], { type: 'application/pdf' });
    firebaseGetBlob.mockRejectedValue(new Error('sdk fail'));
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      blob: async () => blob,
    }));

    const result = await recoverPdfBlobWithFallback(
      'https://firebasestorage.googleapis.com/v0/b/test/o/users%2Fabc%2Fdemo.pdf?alt=media&token=x'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ blob, method: 'direct' });
  });

  test('cae a proxy backend cuando directo falla', async () => {
    const blob = new Blob([new Uint8Array(950)], { type: 'application/pdf' });
    firebaseGetBlob.mockRejectedValue(new Error('sdk fail'));
    fetchMock
      .mockImplementationOnce(async () => {
        throw new Error('cors fail');
      })
      .mockImplementationOnce(async () => ({
        ok: true,
        blob: async () => blob,
      }));

    const result = await recoverPdfBlobWithFallback(
      'https://firebasestorage.googleapis.com/v0/b/test/o/users%2Fabc%2Fdemo.pdf?alt=media&token=x',
      { backendBaseUrl: 'http://localhost:3001' }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/storage/proxy?url=');
    expect(result).toEqual({ blob, method: 'proxy' });
  });

  test('retorna null cuando todos los métodos fallan', async () => {
    firebaseGetBlob.mockRejectedValue(new Error('sdk fail'));
    fetchMock
      .mockImplementationOnce(async () => ({ ok: false }))
      .mockImplementationOnce(async () => ({ ok: false }));

    const result = await recoverPdfBlobWithFallback(
      'https://firebasestorage.googleapis.com/v0/b/test/o/users%2Fabc%2Fdemo.pdf?alt=media&token=x'
    );

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('lanza AbortError cuando signal ya viene abortada', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      recoverPdfBlobWithFallback(
        'https://firebasestorage.googleapis.com/v0/b/test/o/users%2Fabc%2Fdemo.pdf?alt=media&token=x',
        { signal: controller.signal }
      )
    ).rejects.toHaveProperty('name', 'AbortError');
  });
});
