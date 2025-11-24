/**
 * Utilidades para manejar AbortController de manera segura
 * y evitar errores de runtime en la consola del navegador
 */

/**
 * Aborta un AbortController de manera segura
 * @param {AbortController} controller - El controller a abortar
 * @param {string} context - Contexto opcional para logging
 */
export const safeAbort = (controller, context = 'Unknown') => {
  if (!controller) return;
  
  try {
    // Solo abortar si no está ya abortado
    if (!controller.signal.aborted) {
      controller.abort();
    }
  } catch (error) {
    console.warn(`Error al abortar controlador (${context}):`, error);
  }
};

/**
 * Crea un AbortController y lo asigna a una referencia de manera segura
 * @param {React.MutableRefObject} controllerRef - Referencia donde guardar el controller
 * @param {string} context - Contexto opcional para logging
 * @returns {AbortController} El nuevo controller creado
 */
export const createSafeAbortController = (controllerRef, context = 'Unknown') => {
  // Verificar que la referencia es válida
  if (!controllerRef || typeof controllerRef !== 'object') {
    console.warn(`Referencia inválida en createSafeAbortController (${context})`);
    return null;
  }

  try {
    // Abortar controller anterior si existe
    if (controllerRef.current) {
      safeAbort(controllerRef.current, `${context} - Previous`);
    }
    
    // Crear nuevo controller
    controllerRef.current = new AbortController();
    return controllerRef.current;
  } catch (error) {
    console.error(`Error creando AbortController (${context}):`, error);
    return null;
  }
};

/**
 * Hook useEffect para cleanup de AbortController
 * @param {React.MutableRefObject} controllerRef - Referencia del controller
 * @param {string} context - Contexto opcional para logging
 * @returns {Function} Función de cleanup para useEffect
 */
export const createAbortCleanup = (controllerRef, context = 'Component') => {
  return () => {
    // Verificar que la referencia es válida
    if (!controllerRef || typeof controllerRef !== 'object') {
      return; // Salir silenciosamente para referencias inválidas
    }

    // Abortar y limpiar
    if (controllerRef.current) {
      safeAbort(controllerRef.current, `${context} - Cleanup`);
      controllerRef.current = null;
    }
  };
};

/**
 * Obtiene el signal de un AbortController de manera segura
 * @param {React.MutableRefObject} controllerRef - Referencia del controller
 * @returns {AbortSignal|undefined} El signal del controller o undefined
 */
export const getSafeSignal = (controllerRef) => {
  // Verificar que la referencia es válida
  if (!controllerRef || typeof controllerRef !== 'object') {
    return undefined;
  }
  
  return controllerRef.current?.signal;
};

/**
 * Verifica si un AbortController está disponible y no abortado
 * @param {React.MutableRefObject} controllerRef - Referencia del controller
 * @returns {boolean} True si el controller está disponible y no abortado
 */
export const isControllerActive = (controllerRef) => {
  if (!controllerRef || typeof controllerRef !== 'object') {
    return false;
  }
  
  return controllerRef.current && !controllerRef.current.signal.aborted;
};
