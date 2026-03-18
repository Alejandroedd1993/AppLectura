/**
 * Standardized error response helper.
 *
 * Every error response MUST include at minimum:
 *   { error, mensaje, codigo }
 *
 * Extra fields (details, requestId, query, …) are spread as-is.
 */
export function sendError(res, status, { error, mensaje, codigo, ...extras }) {
  return res.status(status).json({ error, mensaje, codigo, ...extras });
}
