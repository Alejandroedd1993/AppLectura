import { ErrorCodes } from '../constants/errorCodes.js';

export function buildSuccessPayload(data, extra = {}) {
  return {
    ok: true,
    data,
    ...extra
  };
}

export function buildErrorPayload({
  error,
  mensaje,
  codigo,
  details,
  requestId,
  ...extra
}) {
  const safeCode = typeof codigo === 'string' && codigo.trim() ? codigo.trim() : ErrorCodes.INTERNAL_ERROR;
  const safeMessage = typeof mensaje === 'string' && mensaje.trim()
    ? mensaje.trim()
    : 'No se pudo completar la solicitud.';
  const safeLegacyError = typeof error === 'string' && error.trim() ? error.trim() : safeCode;

  return {
    ok: false,
    error: safeLegacyError,
    mensaje: safeMessage,
    message: safeMessage,
    codigo: safeCode,
    ...(details !== undefined ? { details } : {}),
    ...(requestId ? { requestId } : {}),
    errorInfo: {
      code: safeCode,
      message: safeMessage,
      ...(details !== undefined ? { details } : {})
    },
    ...extra
  };
}

export function sendSuccess(res, data, extra = {}, status = 200) {
  return res.status(status).json(buildSuccessPayload(data, extra));
}

export function sendErrorResponse(res, status, payload) {
  return res.status(status).json(buildErrorPayload(payload));
}