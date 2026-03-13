// src/services/evaluationErrors.js

/**
 * Clase base para errores de evaluación
 */
export class EvaluationError extends Error {
  constructor(message, type, retryable = false, details = {}) {
    super(message);
    this.name = 'EvaluationError';
    this.type = type;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Tipos de errores de evaluación
 */
export const ERROR_TYPES = {
  // Errores de validación (no reintentar)
  VALIDATION: 'validation',
  PREREQUISITE: 'prerequisite',
  INPUT_TOO_SHORT: 'input_too_short',
  INPUT_TOO_LONG: 'input_too_long',
  
  // Errores de red/API (reintentar)
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
  API_ERROR: 'api_error',
  
  // Errores de procesamiento (reintentar con límite)
  PARSING: 'parsing',
  INVALID_RESPONSE: 'invalid_response',
  
  // Errores del sistema
  UNKNOWN: 'unknown'
};

/**
 * Mensajes de error amigables para el usuario
 */
export const ERROR_MESSAGES = {
  [ERROR_TYPES.VALIDATION]: {
    title: '⚠️ Error de validación',
    message: 'Hay un problema con los datos proporcionados.',
    action: 'Por favor, verifica tu respuesta e intenta nuevamente.'
  },
  [ERROR_TYPES.PREREQUISITE]: {
    title: '📋 Prerequisitos incompletos',
    message: 'Necesitas completar algunos pasos previos.',
    action: 'Completa los artefactos indicados antes de continuar.'
  },
  [ERROR_TYPES.INPUT_TOO_SHORT]: {
    title: '✏️ Respuesta muy corta',
    message: 'Tu respuesta debe tener al menos 50 caracteres.',
    action: 'Desarrolla más tu respuesta con ejemplos y explicaciones.'
  },
  [ERROR_TYPES.INPUT_TOO_LONG]: {
    title: '📏 Respuesta muy larga',
    message: 'Tu respuesta no debe exceder 2000 caracteres.',
    action: 'Resume tu respuesta manteniendo las ideas principales.'
  },
  [ERROR_TYPES.NETWORK]: {
    title: '🌐 Error de conexión',
    message: 'No se pudo conectar con el servidor.',
    action: 'Verifica tu conexión a internet e intenta nuevamente.'
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: '⏱️ Tiempo de espera agotado',
    message: 'La operación tardó demasiado en completarse.',
    action: 'El servidor está ocupado. Intenta nuevamente en unos momentos.'
  },
  [ERROR_TYPES.RATE_LIMIT]: {
    title: '🚦 Límite de solicitudes alcanzado',
    message: 'Has realizado muchas solicitudes en poco tiempo.',
    action: 'Espera 1-2 minutos antes de intentar nuevamente.'
  },
  [ERROR_TYPES.API_ERROR]: {
    title: '⚙️ Error del servidor',
    message: 'El servidor encontró un problema al procesar tu solicitud.',
    action: 'Nuestro equipo ha sido notificado. Intenta nuevamente más tarde.'
  },
  [ERROR_TYPES.PARSING]: {
    title: '📄 Error de procesamiento',
    message: 'No se pudo interpretar la respuesta del servidor.',
    action: 'Intenta nuevamente. Si persiste, contacta soporte.'
  },
  [ERROR_TYPES.INVALID_RESPONSE]: {
    title: '❌ Respuesta inválida',
    message: 'El servidor envió una respuesta con formato incorrecto.',
    action: 'Intenta nuevamente. Si persiste, contacta soporte.'
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: '🔧 Error inesperado',
    message: 'Ocurrió un error que no pudimos identificar.',
    action: 'Intenta nuevamente. Si persiste, contacta soporte.'
  }
};

/**
 * Detecta el tipo de error basándose en el error original
 */
export function detectErrorType(error) {
  const status = Number.isFinite(error?.status) ? error.status : 0;
  const code = String(error?.code || '').trim();

  // Errores de validación
  if (error.message?.includes('al menos 50 caracteres')) {
    return ERROR_TYPES.INPUT_TOO_SHORT;
  }
  if (error.message?.includes('no debe exceder 2000 caracteres')) {
    return ERROR_TYPES.INPUT_TOO_LONG;
  }
  if (error.message?.includes('Dimensión no encontrada')) {
    return ERROR_TYPES.VALIDATION;
  }
  
  // Errores de prerequisitos
  if (error.message?.includes('prerequisitos') || error.message?.includes('completar')) {
    return ERROR_TYPES.PREREQUISITE;
  }
  
  // Errores de red
  if (error.message?.includes('ECONNREFUSED') || 
      error.message?.includes('Network') ||
      error.message?.includes('fetch failed')) {
    return ERROR_TYPES.NETWORK;
  }
  
  // Timeouts
  if (error.message?.includes('timeout') || 
      error.message?.includes('timed out') ||
      error.code === 'ETIMEDOUT') {
    return ERROR_TYPES.TIMEOUT;
  }
  
  // Rate limiting
  if (status === 429 ||
      error.message?.includes('429') || 
      error.message?.includes('rate limit') ||
      error.message?.includes('Too Many Requests')) {
    return ERROR_TYPES.RATE_LIMIT;
  }
  
  // Errores de API
  if (status >= 500 ||
      code === 'AI_PROVIDER_NOT_CONFIGURED' ||
      code === 'ASSESSMENT_SERVICE_UNAVAILABLE' ||
      error.message?.includes('500') || 
      error.message?.includes('502') ||
      error.message?.includes('503') ||
      error.message?.includes('API error')) {
    return ERROR_TYPES.API_ERROR;
  }
  
  // Errores de parsing
  if (error.message?.includes('JSON') || 
      error.message?.includes('parse') ||
      error instanceof SyntaxError) {
    return ERROR_TYPES.PARSING;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

/**
 * Determina si un error es reintentable
 */
export function isRetryable(errorType) {
  const retryableTypes = [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.RATE_LIMIT,
    ERROR_TYPES.API_ERROR,
    ERROR_TYPES.PARSING,
    ERROR_TYPES.INVALID_RESPONSE
  ];
  
  return retryableTypes.includes(errorType);
}

/**
 * Obtiene mensaje amigable para el usuario
 */
export function getUserFriendlyMessage(errorType) {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
}

/**
 * Crea un EvaluationError a partir de un error genérico
 */
export function createEvaluationError(error) {
  if (error instanceof EvaluationError) {
    return error;
  }
  
  const type = detectErrorType(error);
  const retryable = isRetryable(type);
  
  return new EvaluationError(
    error.message || 'Error desconocido',
    type,
    retryable,
    {
      originalError: error.name,
      stack: error.stack?.substring(0, 500)
    }
  );
}
