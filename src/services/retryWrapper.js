// src/services/retryWrapper.js
import { createEvaluationError, ERROR_TYPES } from './evaluationErrors';

/**
 * Configuración de reintentos
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2, // Exponencial: 1s, 2s, 4s
  timeoutPerAttempt: 30000 // 30 segundos por intento
};

/**
 * Calcula el delay para el próximo reintento con backoff exponencial
 */
function calculateBackoffDelay(attemptNumber) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  
  // Agregar jitter aleatorio (±25%) para evitar thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper para ejecutar funciones con retry automático
 * @param {Function} fn - Función asíncrona a ejecutar
 * @param {Object} options - Opciones de configuración
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise} - Resultado de la función
 */
export async function withRetry(fn, options = {}, onProgress = null) {
  const config = {
    ...RETRY_CONFIG,
    ...options
  };

  let lastError = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Notificar progreso: intento iniciado
      if (onProgress) {
        onProgress({
          type: 'attempt',
          attempt,
          maxAttempts: config.maxAttempts,
          message: attempt === 1 
            ? 'Procesando solicitud...' 
            : `Reintentando (${attempt}/${config.maxAttempts})...`
        });
      }

      // Ejecutar función con timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(
            () => reject(new Error(`Timeout después de ${config.timeoutPerAttempt}ms`)),
            config.timeoutPerAttempt
          )
        )
      ]);

      // ✅ Éxito
      if (onProgress) {
        onProgress({
          type: 'success',
          attempt,
          message: 'Operación completada exitosamente'
        });
      }

      return result;

    } catch (error) {
      // Convertir a EvaluationError
      const evaluationError = createEvaluationError(error);
      lastError = evaluationError;

      console.warn(`❌ Intento ${attempt}/${config.maxAttempts} falló:`, {
        type: evaluationError.type,
        message: evaluationError.message,
        retryable: evaluationError.retryable
      });

      // Si el error NO es reintentable, lanzar inmediatamente
      if (!evaluationError.retryable) {
        if (onProgress) {
          onProgress({
            type: 'error',
            error: evaluationError,
            message: 'Error no reintentable'
          });
        }
        throw evaluationError;
      }

      // Si es el último intento, lanzar error
      if (attempt === config.maxAttempts) {
        if (onProgress) {
          onProgress({
            type: 'error',
            error: evaluationError,
            message: `Falló después de ${attempt} intentos`
          });
        }
        throw evaluationError;
      }

      // Calcular delay para próximo intento
      const delay = calculateBackoffDelay(attempt);
      
      // Notificar progreso: esperando para reintentar
      if (onProgress) {
        onProgress({
          type: 'retry',
          attempt,
          maxAttempts: config.maxAttempts,
          delay,
          message: `Reintentando en ${Math.round(delay / 1000)}s...`
        });
      }

      // Esperar antes de reintentar
      await sleep(delay);
    }
  }

  // No debería llegar aquí, pero por seguridad
  throw lastError;
}

/**
 * Wrapper específico para evaluación de respuestas
 */
export async function evaluarConRetry(evaluacionFn, params, onProgress = null) {
  return withRetry(
    () => evaluacionFn(params),
    {
      maxAttempts: 3,
      baseDelay: 2000, // Evaluación puede tardar más
      timeoutPerAttempt: 45000 // 45s por intento (evaluación dual AI)
    },
    onProgress
  );
}

/**
 * Wrapper específico para generación de preguntas
 */
export async function generarConRetry(generacionFn, params, onProgress = null) {
  return withRetry(
    () => generacionFn(params),
    {
      maxAttempts: 3,
      baseDelay: 1000,
      timeoutPerAttempt: 30000 // 30s por intento
    },
    onProgress
  );
}

export { RETRY_CONFIG };
