/**
 * Standardized error response helper.
 *
 * Every error response MUST include at minimum:
 *   { error, mensaje, codigo }
 *
 * Extra fields (details, requestId, query, …) are spread as-is.
 */
import { getRequestIdFromResponse } from './requestContext.js';

export function sendError(res, status, { error, mensaje, codigo, ...extras }) {
  const requestId = extras.requestId || getRequestIdFromResponse(res);
  return res.status(status).json({
    error,
    mensaje,
    codigo,
    ...extras,
    ...(requestId ? { requestId } : {})
  });
}
