/**
 * Tests para useKeyboardShortcuts hook
 * Cobertura: normalización, detección, exclusión de inputs, trigger manual
 */

import { renderHook, act } from '@testing-library/react';
import useKeyboardShortcuts from '../../../src/hooks/useKeyboardShortcuts';

// Helper para crear KeyboardEvents con target correcto
const createKeyboardEvent = (type, options) => {
  const event = new KeyboardEvent(type, { bubbles: true, ...options });
  Object.defineProperty(event, 'target', { value: document.body, writable: false });
  return event;
};

describe('useKeyboardShortcuts', () => {
  let mockHandler;

  beforeEach(() => {
    mockHandler = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Normalización de teclas', () => {
    it('debe normalizar Ctrl+S correctamente', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('debe normalizar Ctrl+Enter correctamente', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+enter': mockHandler })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 'Enter',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('debe normalizar Escape correctamente', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'escape': mockHandler })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('debe normalizar Shift+Ctrl+A correctamente', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+shift+a': mockHandler })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Prevención de acciones por defecto', () => {
    it('debe prevenir acción por defecto cuando preventDefault=true', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { preventDefault: true })
      );

      const event = createKeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('no debe prevenir acción por defecto cuando preventDefault=false', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { preventDefault: false })
      );

      const event = createKeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Exclusión de inputs', () => {
    it('debe ignorar eventos en input cuando excludeInputs=true', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { excludeInputs: true })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: input, writable: false });
        input.dispatchEvent(event);
      });

      expect(mockHandler).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('debe ignorar eventos en textarea cuando excludeInputs=true', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { excludeInputs: true })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: textarea, writable: false });
        textarea.dispatchEvent(event);
      });

      expect(mockHandler).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('debe ejecutar eventos en input cuando excludeInputs=false', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { excludeInputs: false })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      document.body.removeChild(input);
    });
  });

  describe('Estado enabled', () => {
    it('no debe ejecutar shortcuts cuando enabled=false', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { enabled: false })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe ejecutar shortcuts cuando enabled=true', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler }, { enabled: true })
      );

      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Prevención de múltiples ejecuciones', () => {
    it('no debe ejecutar múltiples veces al mantener tecla presionada', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      // Primera vez - debe ejecutar
      act(() => {
        const event1 = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true,
          repeat: false
        });
        window.dispatchEvent(event1);
      });

      // Segunda vez sin keyup - NO debe ejecutar
      act(() => {
        const event2 = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true,
          repeat: true
        });
        window.dispatchEvent(event2);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('debe permitir re-ejecución después de keyup', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      // Primera ejecución
      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event);
      });

      // Keyup
      act(() => {
        const eventUp = createKeyboardEvent('keyup', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(eventUp);
      });

      // Segunda ejecución - debe permitir
      act(() => {
        const event2 = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        window.dispatchEvent(event2);
      });

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Trigger manual', () => {
    it('debe poder ejecutar shortcut manualmente con trigger()', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      act(() => {
        result.current.trigger('ctrl+s');
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith({
        type: 'manual',
        combination: 'ctrl+s'
      });
    });

    it('trigger() no debe hacer nada si la combinación no existe', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      act(() => {
        result.current.trigger('ctrl+x');
      });

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('getRegisteredShortcuts', () => {
    it('debe devolver lista de shortcuts registrados', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({
          'ctrl+s': mockHandler,
          'ctrl+enter': mockHandler,
          'escape': mockHandler
        })
      );

      const shortcuts = result.current.getRegisteredShortcuts();

      expect(shortcuts).toEqual(['ctrl+s', 'ctrl+enter', 'escape']);
    });
  });

  describe('Múltiples shortcuts', () => {
    it('debe manejar múltiples shortcuts diferentes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      const { result } = renderHook(() =>
        useKeyboardShortcuts({
          'ctrl+s': handler1,
          'ctrl+enter': handler2,
          'escape': handler3
        })
      );

      // Ejecutar Ctrl+S
      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: document.body, writable: false });
        window.dispatchEvent(event);
      });

      // Ejecutar Escape
      act(() => {
        const event = createKeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: document.body, writable: false });
        window.dispatchEvent(event);
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Limpieza', () => {
    it('debe limpiar event listeners al desmontar', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({ 'ctrl+s': mockHandler })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
