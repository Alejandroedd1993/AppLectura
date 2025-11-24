/**
 * @file Sistema de Design Tokens para AppLectura
 * @description Tokens de diseño centralizados para mantener consistencia visual
 * @version 1.0.0
 */

/**
 * Sistema de espaciado basado en múltiplos de 4px
 * Proporciona consistencia en márgenes, padding y gaps
 */
export const spacing = {
  xs: '4px',      // Espaciado mínimo entre elementos relacionados
  sm: '8px',      // Elementos muy cercanos
  md: '16px',     // Espaciado estándar entre elementos
  lg: '24px',     // Separación entre secciones
  xl: '32px',     // Separación entre grupos principales
  xxl: '48px',    // Espaciado máximo para separación dramática
  
  // Alias semánticos
  compact: '8px',
  element: '12px',
  subsection: '20px',
  section: '28px'
};

/**
 * Escala tipográfica basada en Major Third (1.25)
 * Proporciona jerarquía visual clara
 */
export const fontSize = {
  xs: '0.64rem',    // 10.24px - Etiquetas muy pequeñas
  sm: '0.8rem',     // 12.8px  - Texto auxiliar, ayuda
  base: '1rem',     // 16px    - Texto normal (base)
  md: '1.125rem',   // 18px    - Texto ligeramente destacado
  lg: '1.25rem',    // 20px    - Subtítulos, destacados
  xl: '1.563rem',   // 25px    - Subsecciones importantes
  '2xl': '1.953rem',// 31.25px - Secciones principales
  '3xl': '2.441rem',// 39px    - Título principal
  '4xl': '3.052rem' // 48.8px  - Hero text (uso especial)
};

/**
 * Pesos de fuente
 */
export const fontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800
};

/**
 * Alturas de línea para diferentes contextos
 */
export const lineHeight = {
  tight: 1.2,      // Títulos, encabezados
  snug: 1.375,     // Subtítulos
  normal: 1.5,     // Texto normal
  relaxed: 1.7,    // Lectura extensa
  loose: 2         // Espaciado máximo
};

/**
 * Espaciado de letras
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em'
};

/**
 * Radios de borde
 */
export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px'  // Círculo perfecto
};

/**
 * Anchos de borde
 */
export const borderWidth = {
  none: '0',
  thin: '1px',
  normal: '2px',
  thick: '4px',
  heavy: '8px'
};

/**
 * Sombras
 */
export const boxShadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
};

/**
 * Duraciones de transición
 */
export const transitionDuration = {
  fastest: '75ms',
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
  slower: '600ms',
  slowest: '1000ms'
};

/**
 * Funciones de timing para transiciones
 */
export const transitionTiming = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Curvas personalizadas
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

/**
 * Transiciones completas combinadas
 */
export const transition = {
  fastest: `${transitionDuration.fastest} ${transitionTiming.ease}`,
  fast: `${transitionDuration.fast} ${transitionTiming.ease}`,
  normal: `${transitionDuration.normal} ${transitionTiming.ease}`,
  slow: `${transitionDuration.slow} ${transitionTiming.ease}`,
  
  // Transiciones específicas
  color: `color ${transitionDuration.fast} ${transitionTiming.ease}`,
  background: `background-color ${transitionDuration.normal} ${transitionTiming.ease}`,
  transform: `transform ${transitionDuration.normal} ${transitionTiming.smooth}`,
  all: `all ${transitionDuration.normal} ${transitionTiming.ease}`
};

/**
 * Z-index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};

/**
 * Breakpoints para responsive design
 */
export const breakpoints = {
  xs: '320px',    // Móviles pequeños
  sm: '640px',    // Móviles
  md: '768px',    // Tablets
  lg: '1024px',   // Desktop
  xl: '1280px',   // Desktop grande
  '2xl': '1536px' // Desktop extra grande
};

/**
 * Contenedor max-widths
 */
export const containerWidth = {
  sm: '640px',
  md: '768px',
  lg: '900px',   // Óptimo para lectura
  xl: '1024px',
  full: '100%'
};

/**
 * Opacidad
 */
export const opacity = {
  disabled: 0.4,
  inactive: 0.6,
  subtle: 0.7,
  hover: 0.8,
  active: 1
};

/**
 * Helper: Obtener tamaño responsive
 */
export const getResponsiveValue = (mobile, tablet, desktop) => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  
  if (width < 768) return mobile;
  if (width < 1024) return tablet || mobile;
  return desktop || tablet || mobile;
};

/**
 * Helper: Generar sombra con color custom
 */
export const generateShadow = (size = 'md', color = 'rgba(0, 0, 0, 0.1)') => {
  const shadows = {
    sm: `0 1px 2px 0 ${color}`,
    md: `0 4px 6px -1px ${color}, 0 2px 4px -2px ${color}`,
    lg: `0 10px 15px -3px ${color}, 0 4px 6px -4px ${color}`,
    xl: `0 20px 25px -5px ${color}, 0 8px 10px -6px ${color}`
  };
  
  return shadows[size] || shadows.md;
};

/**
 * Helper: Crear transición custom
 */
export const createTransition = (
  property = 'all', 
  duration = transitionDuration.normal, 
  timing = transitionTiming.ease
) => {
  return `${property} ${duration} ${timing}`;
};

/**
 * Configuración de tipografía por componente
 */
export const typography = {
  heading1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight
  },
  heading2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight
  },
  heading3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal
  },
  heading4: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal
  },
  heading5: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase'
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide
  },
  button: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide
  }
};

/**
 * Configuración de componentes comunes
 */
export const components = {
  button: {
    borderRadius: borderRadius.md,
    minHeight: '44px',  // Accesibilidad touch
    paddingSm: `${spacing.sm} ${spacing.md}`,
    paddingMd: `${spacing.md} ${spacing.lg}`,
    paddingLg: `${spacing.lg} ${spacing.xl}`,
    transition: transition.normal
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadow: boxShadow.md
  },
  input: {
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    borderWidth: borderWidth.thin,
    minHeight: '44px'
  },
  badge: {
    borderRadius: borderRadius.full,
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold
  }
};

// Export por defecto con todos los tokens
export default {
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  borderRadius,
  borderWidth,
  boxShadow,
  transitionDuration,
  transitionTiming,
  transition,
  zIndex,
  breakpoints,
  containerWidth,
  opacity,
  typography,
  components,
  
  // Helpers
  getResponsiveValue,
  generateShadow,
  createTransition
};
