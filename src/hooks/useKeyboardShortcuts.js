/**
 * useKeyboardShortcuts
 * 
 * Hook personalizado para gestionar atajos de teclado globales
 * Mejora la productividad de usuarios avanzados
 * 
 * @param {Object} shortcuts - Mapa de combinaciones de teclas y callbacks
 * @param {Object} options - Configuración opcional
 * @returns {Object} - Estado y métodos del hook
 * 
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': handleSave,
 *   'ctrl+enter': handleSubmit,
 *   'escape': handleClose
 * }, { enabled: true });
 */

import { useEffect, useCallback, useRef } from 'react';

const useKeyboardShortcuts = (shortcuts = {}, options = {}) => {
  const {
    enabled = true,
    preventDefault = true,
    excludeInputs = true,
    debug = false
  } = options;

  const shortcutsRef = useRef(shortcuts);
  const triggeredRef = useRef(new Set());

  // Actualizar referencia cuando cambien los shortcuts
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  /**
   * Normaliza la combinación de teclas a formato estándar
   */
  const normalizeKey = useCallback((event) => {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    
    // Normalizar nombre de tecla
    const key = event.key.toLowerCase();
    
    // Mapeo de teclas especiales
    const keyMap = {
      'enter': 'enter',
      'escape': 'escape',
      'esc': 'escape',
      ' ': 'space',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right'
    };
    
    const normalizedKey = keyMap[key] || key;
    parts.push(normalizedKey);
    
    return parts.join('+');
  }, []);

  /**
   * Verifica si el elemento activo es un input/textarea
   */
  const isInputElement = useCallback((element) => {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isContentEditable = element.contentEditable === 'true';
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isContentEditable
    );
  }, []);

  /**
   * Maneja el evento keydown
   */
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Excluir inputs si está configurado
    if (excludeInputs && isInputElement(event.target)) {
      return;
    }

    const combination = normalizeKey(event);
    const handler = shortcutsRef.current[combination];

    if (debug) {
      console.log('[useKeyboardShortcuts] Key combination:', combination);
    }

    if (handler && typeof handler === 'function') {
      // Prevenir acción por defecto si está configurado
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Evitar múltiples ejecuciones por mantener tecla presionada
      if (!triggeredRef.current.has(combination)) {
        triggeredRef.current.add(combination);
        
        try {
          handler(event);
        } catch (error) {
          console.error('[useKeyboardShortcuts] Error executing handler:', error);
        }
      }
    }
  }, [enabled, excludeInputs, preventDefault, isInputElement, normalizeKey, debug]);

  /**
   * Maneja el evento keyup para resetear el estado
   */
  const handleKeyUp = useCallback((event) => {
    const combination = normalizeKey(event);
    triggeredRef.current.delete(combination);
  }, [normalizeKey]);

  // Registrar event listeners
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  /**
   * Método para ejecutar manualmente un shortcut
   */
  const trigger = useCallback((combination) => {
    const handler = shortcutsRef.current[combination];
    if (handler && typeof handler === 'function') {
      handler({ type: 'manual', combination });
    }
  }, []);

  /**
   * Obtener lista de atajos registrados
   */
  const getRegisteredShortcuts = useCallback(() => {
    return Object.keys(shortcutsRef.current);
  }, []);

  return {
    trigger,
    getRegisteredShortcuts,
    enabled
  };
};

export default useKeyboardShortcuts;
