export function buildValidationErrorPayload({
  error,
  mensaje,
  codigo,
  details,
  ...extra
}) {
  return {
    error,
    mensaje,
    codigo,
    ...(details !== undefined ? { details } : {}),
    ...extra
  };
}

export function sendValidationError(res, payload) {
  return res.status(400).json(buildValidationErrorPayload(payload));
}
