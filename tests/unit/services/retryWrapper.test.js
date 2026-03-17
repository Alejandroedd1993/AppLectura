import { withRetry } from '../../../src/services/retryWrapper';

describe('retryWrapper', () => {
  test('withRetry reintenta errores reintentables y resuelve en un intento posterior', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    await expect(withRetry(operation, { maxAttempts: 2, baseDelay: 0 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('withRetry no reintenta errores no reintentables', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new Error('La respuesta debe tener al menos 50 caracteres'));

    await expect(withRetry(operation, { maxAttempts: 3, baseDelay: 0 })).rejects.toMatchObject({
      name: 'EvaluationError',
      type: 'input_too_short',
      retryable: false
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});