import { getRequestIdFromResponse } from './requestContext.js';

export function buildValidationErrorPayload({
  error,
  mensaje,
  codigo,
  details,
  requestId,
  ...extra
}) {
  return {
    error,
    mensaje,
    codigo,
    ...(details !== undefined ? { details } : {}),
    ...(requestId ? { requestId } : {}),
    ...extra
  };
}

export function sendValidationError(res, payload) {
  return res.status(400).json(buildValidationErrorPayload({
    ...payload,
    requestId: payload?.requestId || getRequestIdFromResponse(res)
  }));
}
