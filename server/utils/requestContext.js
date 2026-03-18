import crypto from 'crypto';

export function buildRequestId(req) {
  const existingRequestId = typeof req?.requestId === 'string' ? req.requestId.trim() : '';
  if (existingRequestId) return existingRequestId;

  const headerId = String(req?.get?.('x-request-id') || req?.get?.('x-correlation-id') || '').trim();
  if (headerId) return headerId;

  return `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

export function getRequestIdFromResponse(res) {
  const localRequestId = typeof res?.locals?.requestId === 'string' ? res.locals.requestId.trim() : '';
  if (localRequestId) return localRequestId;

  const headerValue = typeof res?.getHeader === 'function' ? res.getHeader('x-request-id') : undefined;
  const headerRequestId = String(headerValue || '').trim();
  return headerRequestId || undefined;
}

export function attachRequestContext(req, res, next) {
  const requestId = buildRequestId(req);

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      !Object.prototype.hasOwnProperty.call(body, 'requestId')
    ) {
      return originalJson({ ...body, requestId });
    }

    return originalJson(body);
  };

  next();
}

export default attachRequestContext;