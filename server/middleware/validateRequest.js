import ErrorCodes from '../constants/errorCodes.js';
import { sendValidationError } from '../utils/validationError.js';

export function zodIssuesToDetails(error) {
  return Array.isArray(error?.issues)
    ? error.issues.map((issue) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : '',
        message: issue.message,
        code: issue.code
      }))
    : [];
}

export function validateRequest(schema, options = {}) {
  return (req, res, next) => {
    const source = options.source === 'query' ? 'query' : 'body';
    const parsed = schema.safeParse(req[source] ?? {});

    if (!parsed.success) {
      const details = zodIssuesToDetails(parsed.error);
      const firstDetail = details[0] || null;
      const payload = options.buildErrorPayload
        ? options.buildErrorPayload({ req, details, error: parsed.error })
        : {
            error: 'Solicitud invalida',
            mensaje: firstDetail?.message || 'Revisa los datos enviados antes de reintentar.',
            codigo: ErrorCodes.VALIDATION_FAILED,
            ...(firstDetail?.path ? { field: firstDetail.path } : {}),
            details
          };

      return sendValidationError(res, payload);
    }

    req[source] = {
      ...(req[source] || {}),
      ...parsed.data
    };

    return next();
  };
}

export default validateRequest;