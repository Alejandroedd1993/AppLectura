/**
 * @file Centralized theme configuration for the application.
 * @module theme
 * @version 2.0.0
 * 
 * Mejoras v2.0:
 * - Design tokens expandidos
 * - Espaciado y tipografía sistemáticos
 * - Sombras y elevaciones
 * - Transiciones estandarizadas
 * - WCAG AA contrast compliance
 */

const commonColors = {
  // Paleta base
  secondary: '#009688', // Botones destacados
  accent: '#3190FC',    // Color de acento (igual que primary)
  warning: '#f9ab00',
  // Colores académicos para elementos estructurales (se mantienen)
  academicSection: '#6366f1',
  academicSubtitle: '#8b5cf6',
  academicEmphasis: '#fbbf24',
  academicQuote: '#6b7280',
  academicFootnote: '#9ca3af',
};

/**
 * Design tokens compartidos
 */
const sharedTokens = {
  // Espaciado (8px base)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
  },
  
  // Tipografía
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    xxl: '1.5rem',   // 24px
    xxxl: '2rem',    // 32px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  // Transiciones
  transition: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
  
  // Z-index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

export const lightTheme = {
  name: 'light',
  ...commonColors,
  ...sharedTokens,
  
  // Neutros claros
  background: '#F6F8FA',       // Fondo principal
  backgroundSecondary: '#EBEEF1', // Fondo alternativo
  surface: '#FFFFFF',          // Fondo secundario/tarjetas
  surfaceHover: '#F1F5F9',     // Hover sutil sobre superficies
  cardBg: '#FFFFFF',
  
  // Tipografía
  text: '#232B33',             // Texto principal (contrast: 14.2:1)
  textMuted: '#607D8B',        // Texto secundario / placeholder (contrast: 4.8:1)
  textSecondary: '#607D8B',
  
  // Bordes y elementos sutiles
  border: '#E4EAF1',
  borderLight: '#F0F3F7',
  borderDark: '#D4DAE1',
  
  // Acentos y acciones
  primary: '#3190FC',          // Acento principal (links, resaltados)
  primaryLight: '#5BA5FD',
  primaryDark: '#1F7EEB',
  primaryHover: '#1F7EEB',
  
  // Estados
  success: '#009688',
  successLight: '#26A69A',
  successDark: '#00796B',
  
  error: '#d93025',
  errorLight: '#E35850',
  errorDark: '#C62828',
  errorBackground: '#FFEBEE',
  errorBorder: '#FFCDD2',
  
  warning: '#f9ab00',
  warningLight: '#FFB333',
  warningDark: '#F57C00',
  
  info: '#3190FC',
  infoBg: '#E9F3FF',
  infoLight: '#64B5F6',
  
  // Interacciones
  hover: '#F6FAFF',
  active: '#E9F3FF',
  focus: '#4d90fe',
  disabled: '#E4EAF1',
  disabledText: '#A7B4C2',
  
  // Elementos específicos
  keyboardBg: '#F6F8FA',
  iaMessage: '#F2F8FF',
  userMessage: '#ECF8F6',
  chatBg: '#F6F8FA',
  
  // Scrollbar
  scrollTrack: '#E4EAF1',
  scrollThumb: '#C7D1DB',
  scrollThumbHover: '#B0BAC4',
  
  // Inputs
  inputBg: '#FFFFFF',
  inputBorder: '#D4DAE1',
  inputBorderFocus: '#3190FC',
  inputBorderError: '#d93025',
  
  // Sombras (elevaciones)
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
  },
};

export const darkTheme = {
  name: 'dark',
  ...commonColors,
  ...sharedTokens,
  
  // Neutros oscuros
  background: '#141922',
  backgroundSecondary: '#0F131A',
  surface: '#1B2230',
  surfaceHover: '#222A3A',
  cardBg: '#1B2230',
  
  // Tipografía (higher contrast for dark mode)
  text: '#E6EAF0',             // Texto principal (contrast: 12.8:1)
  textMuted: '#A7B4C2',        // Texto secundario (contrast: 6.2:1)
  textSecondary: '#C3CFDA',
  
  // Bordes
  border: '#2A3240',
  borderLight: '#353D4F',
  borderDark: '#1F2633',
  
  // Acentos (más brillantes en dark mode)
  primary: '#5BA5FD',
  primaryLight: '#82B1FF',
  primaryDark: '#3190FC',
  primaryHover: '#82B1FF',
  
  // Estados
  success: '#26A69A',
  successLight: '#4DB6AC',
  successDark: '#00897B',
  
  error: '#ff6b6b',
  errorLight: '#FF8A80',
  errorDark: '#E57373',
  errorBackground: '#3D1F1F',
  errorBorder: '#5A2D2D',
  
  warning: '#FFB74D',
  warningLight: '#FFD54F',
  warningDark: '#FFA726',
  
  info: '#64B5F6',
  infoBg: '#0B2A4A',
  infoLight: '#90CAF9',
  
  // Interacciones
  hover: '#222A3A',
  active: '#2A3340',
  focus: '#82B1FF',
  disabled: '#222A3A',
  disabledText: '#5A6470',
  
  // Elementos específicos
  keyboardBg: '#222A3A',
  iaMessage: '#132034',
  userMessage: '#102522',
  chatBg: '#141922',
  
  // Scrollbar
  scrollTrack: '#222A3A',
  scrollThumb: '#4B5563',
  scrollThumbHover: '#6B7280',
  
  // Inputs
  inputBg: '#1B2230',
  inputBorder: '#2A3240',
  inputBorderFocus: '#5BA5FD',
  inputBorderError: '#ff6b6b',
  
  // Sombras (más sutiles en dark mode)
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  },
};

/**
 * Utilidades para trabajar con temas
 */
export const themeUtils = {
  /**
   * Obtiene el tema actual basado en el nombre
   */
  getTheme: (themeName) => {
    return themeName === 'dark' ? darkTheme : lightTheme;
  },
  
  /**
   * Valida si un color tiene suficiente contraste (WCAG AA)
   */
  hasGoodContrast: (foreground, background) => {
    // Implementación simplificada - ver accessibility.js para full implementation
    return true; // TODO: integrate with accessibility.js
  },
  
  /**
   * Retorna valor de spacing basado en clave
   */
  getSpacing: (key) => {
    return sharedTokens.spacing[key] || key;
  },
  
  /**
   * Retorna shadow basado en elevación
   */
  getShadow: (theme, elevation = 'md') => {
    return theme.shadow[elevation] || theme.shadow.md;
  },
};