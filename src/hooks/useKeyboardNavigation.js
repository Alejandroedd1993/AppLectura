// src/hooks/useKeyboardNavigation.js

import { useEffect, useCallback } from 'react';

/**
 * Hook para navegación por teclado en componentes interactivos
 * @param {Object} options - Configuración de navegación
 * @returns {Object} - Funciones helper para accesibilidad
 */
export default function useKeyboardNavigation(options = {}) {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    enabled = true,
    preventDefaults = true
  } = options;

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    const handlers = {
      'Enter': onEnter,
      'Escape': onEscape,
      'ArrowUp': onArrowUp,
      'ArrowDown': onArrowDown,
      'ArrowLeft': onArrowLeft,
      'ArrowRight': onArrowRight,
      'Tab': onTab
    };

    const handler = handlers[event.key];
    
    if (handler) {
      if (preventDefaults) {
        event.preventDefault();
      }
      handler(event);
    }
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, preventDefaults]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    handleKeyDown
  };
}

/**
 * Hook para gestión de focus en listas navegables
 * @param {Array} items - Array de items
 * @param {Object} options - Opciones de configuración
 */
export function useFocusManager(items = [], options = {}) {
  const { 
    initialIndex = 0,
    loop = true,
    onSelect
  } = options;

  const [focusedIndex, setFocusedIndex] = React.useState(initialIndex);

  const focusNext = useCallback(() => {
    setFocusedIndex(current => {
      if (current >= items.length - 1) {
        return loop ? 0 : current;
      }
      return current + 1;
    });
  }, [items.length, loop]);

  const focusPrevious = useCallback(() => {
    setFocusedIndex(current => {
      if (current <= 0) {
        return loop ? items.length - 1 : current;
      }
      return current - 1;
    });
  }, [items.length, loop]);

  const selectCurrent = useCallback(() => {
    if (onSelect && items[focusedIndex]) {
      onSelect(items[focusedIndex], focusedIndex);
    }
  }, [focusedIndex, items, onSelect]);

  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEnter: selectCurrent,
    enabled: items.length > 0
  });

  return {
    focusedIndex,
    setFocusedIndex,
    focusNext,
    focusPrevious,
    selectCurrent
  };
}
