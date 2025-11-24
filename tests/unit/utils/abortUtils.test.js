// Test para abortUtils.js - Utilidades de AbortController
import {
  createSafeAbortController,
  getSafeSignal,
  createAbortCleanup
} from '../../../src/utils/abortUtils';

describe('abortUtils', () => {
  // Limpiar mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSafeAbortController', () => {
    it('debe crear un AbortController válido', () => {
      const mockRef = { current: null };
      const context = 'test-context';

      createSafeAbortController(mockRef, context);

      expect(mockRef.current).toBeInstanceOf(AbortController);
      expect(mockRef.current.signal).toBeDefined();
    });

    it('debe abortar el controller anterior si existe', () => {
      const mockRef = { current: null };
      const context = 'test-context';

      // Crear primer controller
      createSafeAbortController(mockRef, context);
      const firstController = mockRef.current;
      const abortSpy = jest.spyOn(firstController, 'abort');

      // Crear segundo controller
      createSafeAbortController(mockRef, context);

      expect(abortSpy).toHaveBeenCalled();
      expect(mockRef.current).not.toBe(firstController);
      expect(mockRef.current).toBeInstanceOf(AbortController);
    });

    it('debe manejar referencias null sin error', () => {
      expect(() => {
        createSafeAbortController(null, 'test-context');
      }).not.toThrow();
    });

    it('debe manejar referencias undefined sin error', () => {
      expect(() => {
        createSafeAbortController(undefined, 'test-context');
      }).not.toThrow();
    });
  });

  describe('getSafeSignal', () => {
    it('debe retornar el signal del AbortController', () => {
      const mockRef = { current: new AbortController() };
      
      const signal = getSafeSignal(mockRef);

      expect(signal).toBe(mockRef.current.signal);
    });

    it('debe retornar undefined para referencia null', () => {
      const signal = getSafeSignal(null);

      expect(signal).toBeUndefined();
    });

    it('debe retornar undefined para referencia undefined', () => {
      const signal = getSafeSignal(undefined);

      expect(signal).toBeUndefined();
    });

    it('debe retornar undefined para referencia con current null', () => {
      const mockRef = { current: null };
      
      const signal = getSafeSignal(mockRef);

      expect(signal).toBeUndefined();
    });
  });

  describe('createAbortCleanup', () => {
    it('debe retornar una función de limpieza', () => {
      const mockRef = { current: new AbortController() };
      
      const cleanup = createAbortCleanup(mockRef, 'test-context');

      expect(typeof cleanup).toBe('function');
    });

    it('debe abortar el controller y limpiar la referencia', () => {
      const controller = new AbortController();
      const mockRef = { current: controller };
      const abortSpy = jest.spyOn(controller, 'abort');
      
      const cleanup = createAbortCleanup(mockRef, 'test-context');
      cleanup();

      expect(abortSpy).toHaveBeenCalled();
      expect(mockRef.current).toBeNull();
    });

    it('debe manejar referencias null sin error', () => {
      const cleanup = createAbortCleanup(null, 'test-context');
      
      expect(() => cleanup()).not.toThrow();
    });

    it('debe manejar referencias con current null sin error', () => {
      const mockRef = { current: null };
      const cleanup = createAbortCleanup(mockRef, 'test-context');
      
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Integración', () => {
    it('debe trabajar correctamente en un flujo completo', () => {
      const mockRef = { current: null };
      const context = 'integration-test';

      // Crear controller
      createSafeAbortController(mockRef, context);
      expect(mockRef.current).toBeInstanceOf(AbortController);

      // Obtener signal
      const signal = getSafeSignal(mockRef);
      expect(signal).toBeDefined();
      expect(signal.aborted).toBe(false);

      // Crear función de limpieza
      const cleanup = createAbortCleanup(mockRef, context);
      
      // Ejecutar limpieza
      cleanup();
      expect(mockRef.current).toBeNull();
      expect(signal.aborted).toBe(true);
    });

    it('debe manejar múltiples controllers en secuencia', () => {
      const mockRef = { current: null };
      const context = 'sequence-test';

      // Crear y limpiar múltiples controllers
      for (let i = 0; i < 3; i++) {
        createSafeAbortController(mockRef, `${context}-${i}`);
        expect(mockRef.current).toBeInstanceOf(AbortController);
        
        const cleanup = createAbortCleanup(mockRef, `${context}-${i}`);
        cleanup();
        
        expect(mockRef.current).toBeNull();
      }
    });
  });

  describe('Casos extremos', () => {
    it('debe manejar AbortController ya abortado', () => {
      const controller = new AbortController();
      controller.abort();
      const mockRef = { current: controller };

      expect(() => {
        createAbortCleanup(mockRef, 'aborted-test')();
      }).not.toThrow();
    });

    it('debe manejar referencias con estructura incorrecta', () => {
      const invalidRef = { notCurrent: 'invalid' };

      expect(() => {
        createSafeAbortController(invalidRef, 'invalid-test');
        getSafeSignal(invalidRef);
        createAbortCleanup(invalidRef, 'invalid-test')();
      }).not.toThrow();
    });
  });
});
