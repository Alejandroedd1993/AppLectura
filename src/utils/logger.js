/**
 * Logger condicional para desarrollo/producción
 * 
 * En producción, solo se muestran errores críticos.
 * En desarrollo, se muestran todos los logs.
 * 
 * Uso:
 * import logger from './utils/logger';
 * logger.log('Debug info');
 * logger.warn('Advertencia');
 * logger.error('Error crítico');
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger que solo muestra logs en desarrollo
 * En producción, solo console.error está activo (para Sentry/analytics)
 */
const logger = {
  /**
   * Logs informativos (solo desarrollo)
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Advertencias (solo desarrollo)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Errores críticos (siempre activo, para monitoring)
   */
  error: (...args) => {
    console.error(...args);
    
    // TODO: Integrar con Sentry o Firebase Crashlytics
    // if (window.Sentry) {
    //   window.Sentry.captureException(args[0]);
    // }
  },

  /**
   * Debug detallado (solo desarrollo)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Información de grupo (solo desarrollo)
   */
  group: (...args) => {
    if (isDevelopment) {
      console.group(...args);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Tabla (solo desarrollo)
   */
  table: (...args) => {
    if (isDevelopment) {
      console.table(...args);
    }
  },

  /**
   * Timer (solo desarrollo)
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
};

export default logger;

// Export individual para imports destructurados
export const { log, warn, error, debug, group, groupEnd, table, time, timeEnd } = logger;
