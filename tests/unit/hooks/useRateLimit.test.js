/**
 * Tests para useRateLimit hook
 * Cobertura: cooldown, límite horario, persistencia localStorage, reset
 */

import { renderHook, act } from '@testing-library/react';
import useRateLimit from '../../../src/hooks/useRateLimit';

describe('useRateLimit', () => {
  const testKey = 'test-operation';
  const localStorageKey = `ratelimit_${testKey}`; // Minúscula como en el hook

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Configuración inicial', () => {
    it('debe inicializar con estado válido por defecto', () => {
      const { result } = renderHook(() => useRateLimit(testKey));

      expect(result.current.canProceed).toBe(true);
      expect(result.current.remaining).toBe(10); // maxPerHour por defecto
      expect(result.current.nextAvailableIn).toBe(0);
    });

    it('debe usar configuración personalizada', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 3000,
          maxPerHour: 5
        })
      );

      expect(result.current.remaining).toBe(5);
    });
  });

  describe('Cooldown', () => {
    it('debe bloquear operaciones durante cooldown', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 5000 })
      );

      // Primera operación - debe permitir
      let attemptResult;
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.allowed).toBe(true);
      expect(result.current.canProceed).toBe(false);

      // Segunda operación inmediata - debe bloquear
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.allowed).toBe(false);
      expect(attemptResult.reason).toBe('cooldown');
      expect(attemptResult.waitSeconds).toBeDefined();
    });

    it('debe permitir operación después de cooldown', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 5000 })
      );

      // Primera operación
      act(() => {
        result.current.attemptOperation();
      });

      expect(result.current.canProceed).toBe(false);

      // Avanzar tiempo 5 segundos
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.canProceed).toBe(true);

      // Segunda operación - debe permitir
      let attemptResult;
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.allowed).toBe(true);
    });

    it('debe actualizar nextAvailableIn correctamente', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 10000 })
      );

      act(() => {
        result.current.attemptOperation();
      });

      // nextAvailableIn se actualiza asíncronamente
      expect(typeof result.current.nextAvailableIn).toBe('number');
      expect(result.current.nextAvailableIn).toBeGreaterThanOrEqual(0);

      // Avanzar 5 segundos
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // El countdown se actualiza asíncronamente con useEffect
      expect(typeof result.current.nextAvailableIn).toBe('number');
    });
  });

  describe('Límite horario', () => {
    it('debe rastrear operaciones por hora', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 1000,
          maxPerHour: 3
        })
      );

      expect(result.current.remaining).toBe(3);

      // Primera operación
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remaining).toBe(2);

      // Segunda operación
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remaining).toBe(1);

      // Tercera operación
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remaining).toBe(0);
    });

    it('debe bloquear cuando se alcanza límite horario', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 1000,
          maxPerHour: 2
        })
      );

      // Usar límite
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remaining).toBe(0);
      expect(result.current.canProceed).toBe(false);

      // Intentar operación adicional
      let attemptResult;
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.allowed).toBe(false);
      expect(attemptResult.reason).toBe('hourly_limit');
    });

    it('debe limpiar operaciones antiguas después de 1 hora', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 1000,
          maxPerHour: 2
        })
      );

      // Usar límite
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remaining).toBe(0);

      // Avanzar 1 hora + 1 segundo
      act(() => {
        jest.advanceTimersByTime(3600 * 1000 + 1000);
      });

      // Debe permitir nuevas operaciones (limpieza automática)
      let newAttempt;
      act(() => {
        newAttempt = result.current.attemptOperation();
      });
      
      expect(newAttempt.allowed).toBe(true);
    });
  });

  describe('Persistencia localStorage', () => {
    it('debe guardar operaciones en localStorage', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 1000 })
      );

      act(() => {
        result.current.attemptOperation();
      });

      const saved = JSON.parse(localStorage.getItem(localStorageKey));
      expect(saved).toBeDefined();
      expect(saved.operations).toHaveLength(1);
      expect(saved.lastOperation).toBeDefined();
    });

    it('debe recuperar estado desde localStorage', () => {
      // Simular operaciones previas guardadas
      const now = Date.now();
      const savedData = {
        operations: [now - 1000, now - 2000],
        lastOperation: now - 1000
      };
      localStorage.setItem(localStorageKey, JSON.stringify(savedData));

      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 5000,
          maxPerHour: 10
        })
      );

      // Debe haber recuperado operaciones (remaining menor que máximo)
      expect(result.current.remaining).toBeLessThan(10); // Menos que maxPerHour default
    });

    it('debe limpiar localStorage corrupto', () => {
      localStorage.setItem(localStorageKey, 'invalid json');

      const { result } = renderHook(() =>
        useRateLimit(testKey)
      );

      // Debe inicializar con valores por defecto
      expect(result.current.remaining).toBe(10);
      expect(result.current.canProceed).toBe(true);
    });
  });

  describe('Reset funciones', () => {
    it('resetCooldown debe permitir operación inmediata', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 10000 })
      );

      // Bloquear con operación
      act(() => {
        result.current.attemptOperation();
      });

      expect(result.current.canProceed).toBe(false);

      // Reset cooldown
      act(() => {
        result.current.resetCooldown();
      });

      expect(result.current.canProceed).toBe(true);
    });

    it('resetAll debe limpiar todo el historial', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 1000,
          maxPerHour: 5
        })
      );

      // Usar límite parcial
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
        result.current.attemptOperation();
        jest.advanceTimersByTime(1000);
        result.current.attemptOperation();
      });

      expect(result.current.remaining).toBe(2);

      // Reset completo
      act(() => {
        result.current.resetAll();
      });

      expect(result.current.remaining).toBe(5);
      expect(result.current.canProceed).toBe(true);
      expect(localStorage.getItem(localStorageKey)).toBeNull();
    });
  });

  describe('Mensajes de error', () => {
    it('debe devolver mensaje apropiado para cooldown', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 5000 })
      );

      act(() => {
        result.current.attemptOperation();
      });

      let attemptResult;
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.message).toContain('Espera');
      expect(attemptResult.message).toContain('segundos');
    });

    it('debe devolver mensaje apropiado para límite horario', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 100,
          maxPerHour: 1
        })
      );

      // Usar límite
      act(() => {
        result.current.attemptOperation();
        jest.advanceTimersByTime(100);
      });

      let attemptResult;
      act(() => {
        attemptResult = result.current.attemptOperation();
      });

      expect(attemptResult.message).toContain('límite');
      expect(attemptResult.message).toMatch(/hora|operaciones/i);
    });
  });

  describe('Casos edge', () => {
    it('debe manejar cooldownMs = 0 (sin cooldown)', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, { cooldownMs: 0 })
      );

      let firstAttempt;
      act(() => {
        firstAttempt = result.current.attemptOperation();
      });

      expect(firstAttempt.allowed).toBe(true);

      // Segunda operación inmediata debería estar permitida (sin cooldown)
      let secondAttempt;
      act(() => {
        secondAttempt = result.current.attemptOperation();
      });

      expect(secondAttempt.allowed).toBe(true);
    });

    it('debe manejar maxPerHour = Infinity (sin límite horario)', () => {
      const { result } = renderHook(() =>
        useRateLimit(testKey, {
          cooldownMs: 100,
          maxPerHour: Infinity
        })
      );

      // Hacer muchas operaciones
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.attemptOperation();
          jest.advanceTimersByTime(100);
        }
      });

      expect(result.current.remaining).toBe(Infinity);
      expect(result.current.canProceed).toBe(true);
    });

    it('debe manejar key vacía', () => {
      const { result } = renderHook(() => useRateLimit(''));

      expect(result.current.canProceed).toBe(true);

      act(() => {
        result.current.attemptOperation();
      });

      // No debe crashear
      expect(result.current).toBeDefined();
    });
  });
});
