// src/services/retryWrapper.js
import { createEvaluationError } from './evaluationErrors';
import { retryAsync } from '../utils/netUtils';
import logger from '../utils/logger';
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
  let attemptStarted = 0;

  try {
    const result = await retryAsync(
      async () => {
        attemptStarted += 1;

        if (onProgress) {
          onProgress({
            type: 'attempt',
            attempt: attemptStarted,
            maxAttempts: config.maxAttempts,
            message: attemptStarted === 1
              ? 'Procesando solicitud...'
              : `Reintentando (${attemptStarted}/${config.maxAttempts})...`
          });
        }

        return Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout después de ${config.timeoutPerAttempt}ms`)),
              config.timeoutPerAttempt
            )
          )
        ]);
      },
      {
        retries: Math.max(0, config.maxAttempts - 1),
        initialDelayMs: config.baseDelay,
        backoffMultiplier: config.backoffMultiplier,
        getDelayMs: (attempt) => Math.min(calculateBackoffDelay(attempt), config.maxDelay),
        shouldRetry: (error, attempt) => {
          const evaluationError = createEvaluationError(error);
          lastError = evaluationError;

          logger.warn(`❌ Intento ${attempt}/${config.maxAttempts} falló:`, {
            type: evaluationError.type,
            message: evaluationError.message,
            retryable: evaluationError.retryable
          });

          if (!evaluationError.retryable) {
            if (onProgress) {
              onProgress({
                type: 'error',
                error: evaluationError,
                message: 'Error no reintentable'
              });
            }
            return false;
          }

          return attempt < config.maxAttempts;
        },
        onRetry: (_error, meta) => {
          if (onProgress) {
            onProgress({
              type: 'retry',
              attempt: meta.attempt,
              maxAttempts: config.maxAttempts,
              delay: meta.delayMs,
              message: `Reintentando en ${Math.round(meta.delayMs / 1000)}s...`
            });
          }
        }
      }
    );

    if (onProgress) {
      onProgress({
        type: 'success',
        attempt: attemptStarted,
        message: 'Operación completada exitosamente'
      });
    }

    return result;
  } catch (error) {
    const evaluationError = error instanceof Error && error.name === 'EvaluationError'
      ? error
      : (lastError || createEvaluationError(error));

    if (onProgress && evaluationError.retryable) {
      onProgress({
        type: 'error',
        error: evaluationError,
        message: `Falló después de ${attemptStarted || config.maxAttempts} intentos`
      });
    }

    throw evaluationError;
  }
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
