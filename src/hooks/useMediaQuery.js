// src/hooks/useMediaQuery.js

import { useState, useEffect } from 'react';

/**
 * Breakpoints estándar para responsive design
 */
export const BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
};

/**
 * Media queries predefinidas
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.sm})`,
  tablet: `(min-width: ${BREAKPOINTS.sm}) and (max-width: ${BREAKPOINTS.lg})`,
  desktop: `(min-width: ${BREAKPOINTS.lg})`,
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)',
};

/**
 * Hook para detectar media queries
 * @param {string} query - Media query a evaluar
 * @returns {boolean} - Si la media query coincide
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Setear valor inicial
    setMatches(mediaQuery.matches);

    // Listener para cambios
    const handler = (event) => setMatches(event.matches);
    
    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } 
    // Fallback para navegadores antiguos
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}

/**
 * Hook para detectar si es dispositivo móvil
 */
export function useIsMobile() {
  return useMediaQuery(MEDIA_QUERIES.mobile);
}

/**
 * Hook para detectar si es tablet
 */
export function useIsTablet() {
  return useMediaQuery(MEDIA_QUERIES.tablet);
}

/**
 * Hook para detectar si es desktop
 */
export function useIsDesktop() {
  return useMediaQuery(MEDIA_QUERIES.desktop);
}

/**
 * Hook para detectar si es dispositivo táctil
 */
export function useIsTouchDevice() {
  return useMediaQuery(MEDIA_QUERIES.touch);
}

/**
 * Hook combinado que retorna objeto con todos los breakpoints
 */
export function useResponsive() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const isTouchDevice = useIsTouchDevice();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isSmallScreen: isMobile,
    isMediumScreen: isTablet,
    isLargeScreen: isDesktop,
  };
}
