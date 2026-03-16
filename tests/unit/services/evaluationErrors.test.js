import {
  ERROR_TYPES,
  createEvaluationError,
  detectErrorType,
  getUserFriendlyMessage,
  isRetryable
} from '../../../src/services/evaluationErrors';

describe('evaluationErrors', () => {
  test('clasifica errores de configuracion del servicio como no reintentables', () => {
    const error = new Error('Servicio no disponible');
    error.code = 'ASSESSMENT_SERVICE_UNAVAILABLE';
    error.status = 503;

    expect(detectErrorType(error)).toBe(ERROR_TYPES.SERVICE_CONFIGURATION);
    expect(isRetryable(ERROR_TYPES.SERVICE_CONFIGURATION)).toBe(false);

    const evaluationError = createEvaluationError(error);
    expect(evaluationError.type).toBe(ERROR_TYPES.SERVICE_CONFIGURATION);
    expect(evaluationError.retryable).toBe(false);
  });

  test('mantiene los errores 5xx genericos como reintentables', () => {
    const error = new Error('HTTP 502');
    error.status = 502;

    expect(detectErrorType(error)).toBe(ERROR_TYPES.API_ERROR);
    expect(isRetryable(ERROR_TYPES.API_ERROR)).toBe(true);
  });

  test('expone un mensaje amigable especifico para configuracion de servicio', () => {
    const friendly = getUserFriendlyMessage(ERROR_TYPES.SERVICE_CONFIGURATION);

    expect(friendly).toEqual(expect.objectContaining({
      title: expect.stringContaining('Servicio no disponible'),
      message: expect.stringContaining('configuración pendiente del servidor')
    }));
  });
});