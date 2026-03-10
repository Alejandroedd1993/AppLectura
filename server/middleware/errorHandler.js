export function errorHandler(error, req, res, next) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const code = typeof error?.code === 'string' && error.code ? error.code : 'INTERNAL_ERROR';

  console.error('❌ [errorHandler] Unhandled error:', {
    path: req?.originalUrl,
    method: req?.method,
    code,
    message: error?.message,
    stack: error?.stack
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(statusCode).json({
    error: code,
    mensaje: statusCode >= 500
      ? 'Ocurrió un error interno procesando la solicitud.'
      : 'No se pudo completar la solicitud.'
  });
}

export default errorHandler;