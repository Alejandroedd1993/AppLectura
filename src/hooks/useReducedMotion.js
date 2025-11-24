/**
 * @file Utilidad para manejar preferencias de movimiento reducido
 * @module useReducedMotion
 */

import { useState, useEffect } from 'react';

/**
 * Hook para detectar preferencia de movimiento reducido
 * @returns {boolean} true si el usuario prefiere movimiento reducido
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listener para cambios dinámicos
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  return prefersReducedMotion;
};

/**
 * Helper para obtener duración de animación basada en preferencias
 * @param {string} duration - Duración normal (ej: '0.3s', '1s')
 * @returns {string} Duración ajustada o '0.01ms' si prefiere movimiento reducido
 */
export const getAnimationDuration = (duration) => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReduced ? '0.01ms' : duration;
};

/**
 * Helper para obtener iteraciones de animación
 * @param {string|number} count - Número de iteraciones ('infinite' o número)
 * @returns {string|number} 1 si prefiere movimiento reducido, valor original si no
 */
export const getAnimationCount = (count) => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReduced ? 1 : count;
};

export default useReducedMotion;
