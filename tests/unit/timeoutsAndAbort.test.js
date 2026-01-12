/**
 * Tests unitarios ligeros para validar timeout y abort wiring (simulados)
 * Nota: Aquí probamos el contrato de fetchWithTimeout con un AbortController externo.
 */
import { fetchWithTimeout } from '../../src/utils/netUtils';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock fetch que nunca resuelve para probar timeout
    global.fetch = jest.fn(() => new Promise(() => {}));
  });
  
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('aborta por timeout', async () => {
    const p = fetchWithTimeout('/api/dummy', {}, 1000);
    
    // Avanzar el tiempo para disparar el timeout
    jest.advanceTimersByTime(1200);
    
    // Esperar a que se rechace
    await expect(p).rejects.toThrow(/Aborted/);
  });

  test('respeta AbortController externo', async () => {
    const controller = new AbortController();
    const p = fetchWithTimeout('/api/dummy', { signal: controller.signal }, 5000);
    
    // Abortar manualmente
    controller.abort();
    
    // Avanzar timers para procesar el evento
    jest.advanceTimersByTime(0);
    
    await expect(p).rejects.toThrow(/Aborted/);
  });
});
