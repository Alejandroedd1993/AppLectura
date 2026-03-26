import { CircuitBreaker, CircuitBreakerOpenError } from '../../../server/utils/circuitBreaker.js';

describe('circuitBreaker utility', () => {
  test('abre el circuito al alcanzar el threshold y rechaza llamadas posteriores', async () => {
    const breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 2,
      resetTimeoutMs: 20,
    });

    await expect(breaker.execute(async () => {
      const error = new Error('fetch failed');
      error.code = 'ECONNRESET';
      throw error;
    })).rejects.toThrow('fetch failed');

    await expect(breaker.execute(async () => {
      const error = new Error('fetch failed');
      error.code = 'ECONNRESET';
      throw error;
    })).rejects.toThrow('fetch failed');

    await expect(breaker.execute(async () => 'ok')).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  test('pasa a half-open tras el timeout y se resetea al recuperarse', async () => {
    const breaker = new CircuitBreaker('test-half-open', {
      failureThreshold: 1,
      resetTimeoutMs: 10,
    });

    await expect(breaker.execute(async () => {
      throw new Error('timeout');
    })).rejects.toThrow('timeout');

    await new Promise((resolve) => setTimeout(resolve, 15));

    await expect(breaker.execute(async () => 'recovered')).resolves.toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
  });
});