// src/utils/accessibility.js

/**
 * Utilidades de accesibilidad para mejorar UX
 */

/**
 * Genera ID único para asociar labels con inputs (aria-labelledby)
 */
let idCounter = 0;
export function generateUniqueId(prefix = 'a11y') {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Anuncia mensaje a screen readers sin renderizar visualmente
 * @param {string} message - Mensaje a anunciar
 * @param {string} priority - 'polite' | 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  // Crear live region temporal
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.textContent = message;

  document.body.appendChild(liveRegion);

  // Remover después de que screen reader lo lea
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Mueve focus a elemento específico con manejo de errores
 * @param {string|HTMLElement} target - Selector CSS o elemento
 * @param {Object} options - Opciones de configuración
 */
export function moveFocusTo(target, options = {}) {
  const {
    preventScroll = false,
    delay = 0,
    onError = null
  } = options;

  setTimeout(() => {
    try {
      const element = typeof target === 'string' 
        ? document.querySelector(target)
        : target;

      if (element && typeof element.focus === 'function') {
        element.focus({ preventScroll });
      } else if (onError) {
        onError(new Error(`Element not focusable: ${target}`));
      }
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.warn('Focus error:', error);
      }
    }
  }, delay);
}

/**
 * Trap focus dentro de un contenedor (para modales)
 * @param {HTMLElement} container - Contenedor del modal
 * @returns {Function} - Función cleanup para remover trap
 */
export function trapFocus(container) {
  if (!container) return () => {};

  const focusableSelector = 
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])';

  const focusableElements = container.querySelectorAll(focusableSelector);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus primer elemento
  if (firstElement) {
    firstElement.focus();
  }

  // Cleanup
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Detecta si el usuario prefiere reducir movimiento
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calcula contraste entre dos colores (WCAG)
 * @param {string} color1 - Color en formato hex
 * @param {string} color2 - Color en formato hex
 * @returns {number} - Ratio de contraste
 */
export function getContrastRatio(color1, color2) {
  const getLuminance = (hex) => {
    // Remover #
    hex = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calcular luminancia relativa
    const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verifica si el contraste cumple WCAG AA
 * @param {string} color1 - Color de texto
 * @param {string} color2 - Color de fondo
 * @param {string} size - 'normal' | 'large'
 * @returns {Object} - { pass: boolean, ratio: number, level: string }
 */
export function checkWCAGContrast(color1, color2, size = 'normal') {
  const ratio = getContrastRatio(color1, color2);
  
  // WCAG AA requirements:
  // - Normal text: 4.5:1
  // - Large text (18pt/14pt bold): 3:1
  const minRatio = size === 'large' ? 3 : 4.5;
  const minRatioAAA = size === 'large' ? 4.5 : 7;
  
  return {
    pass: ratio >= minRatio,
    ratio: ratio.toFixed(2),
    level: ratio >= minRatioAAA ? 'AAA' : ratio >= minRatio ? 'AA' : 'Fail'
  };
}

/**
 * Genera atributos ARIA para componentes complejos
 */
export const ariaHelpers = {
  /**
   * Atributos para progress bar
   */
  progressBar: (current, max, label) => ({
    role: 'progressbar',
    'aria-valuenow': current,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label
  }),

  /**
   * Atributos para botón de toggle
   */
  toggleButton: (pressed, label) => ({
    role: 'button',
    'aria-pressed': pressed,
    'aria-label': label,
    tabIndex: 0
  }),

  /**
   * Atributos para tabs
   */
  tab: (selected, controls, id) => ({
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': controls,
    id: id,
    tabIndex: selected ? 0 : -1
  }),

  /**
   * Atributos para tab panel
   */
  tabPanel: (labelledBy, id) => ({
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
    id: id,
    tabIndex: 0
  }),

  /**
   * Atributos para alert
   */
  alert: (type = 'info') => ({
    role: 'alert',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
    'aria-atomic': 'true'
  }),

  /**
   * Atributos para modal/dialog
   */
  dialog: (labelledBy, describedBy) => ({
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy
  })
};

/**
 * Hook React para anuncios a screen reader
 */
export function useScreenReaderAnnounce() {
  return useCallback((message, priority = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);
}

/**
 * Valida accesibilidad de un formulario
 * @param {HTMLFormElement} form - Formulario a validar
 * @returns {Array} - Array de issues encontrados
 */
export function validateFormAccessibility(form) {
  const issues = [];

  // Verificar que todos los inputs tengan labels
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const hasLabel = input.labels && input.labels.length > 0;
    const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push({
        type: 'missing-label',
        element: input,
        message: `Input sin label: ${input.name || input.id || 'sin identificador'}`
      });
    }
  });

  // Verificar que botones tengan texto accesible
  const buttons = form.querySelectorAll('button');
  buttons.forEach(button => {
    const hasText = button.textContent.trim().length > 0;
    const hasAriaLabel = button.hasAttribute('aria-label');
    
    if (!hasText && !hasAriaLabel) {
      issues.push({
        type: 'missing-button-text',
        element: button,
        message: 'Botón sin texto o aria-label'
      });
    }
  });

  return issues;
}
