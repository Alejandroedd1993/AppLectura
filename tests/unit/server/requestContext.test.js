import { attachRequestContext, buildRequestId, getRequestIdFromResponse } from '../../../server/utils/requestContext.js';

function makeReq(headers = {}) {
  return {
    headers,
    get(name) {
      return headers[String(name).toLowerCase()];
    }
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    locals: {},
    headers: {},
    _jsonBody: null
  };

  res.setHeader = (name, value) => {
    res.headers[String(name).toLowerCase()] = value;
  };
  res.getHeader = (name) => res.headers[String(name).toLowerCase()];
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res._jsonBody = body;
    return res;
  };

  return res;
}

describe('requestContext utilities', () => {
  test('buildRequestId reuses inbound header when present', () => {
    const req = makeReq({ 'x-request-id': 'req_from_client' });
    expect(buildRequestId(req)).toBe('req_from_client');
  });

  test('buildRequestId reuses req.requestId when already assigned', () => {
    const req = makeReq();
    req.requestId = 'req_existing';
    expect(buildRequestId(req)).toBe('req_existing');
  });

  test('attachRequestContext sets requestId on req, res and error json bodies', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    attachRequestContext(req, res, next);

    expect(typeof req.requestId).toBe('string');
    expect(req.requestId).toMatch(/^req_/);
    expect(res.locals.requestId).toBe(req.requestId);
    expect(res.getHeader('x-request-id')).toBe(req.requestId);
    expect(next).toHaveBeenCalledTimes(1);

    res.status(500).json({ error: 'boom', mensaje: 'fallo', codigo: 'ERR' });

    expect(res._jsonBody).toEqual(expect.objectContaining({
      error: 'boom',
      codigo: 'ERR',
      requestId: req.requestId
    }));
  });

  test('attachRequestContext does not mutate success payloads', () => {
    const req = makeReq();
    const res = makeRes();

    attachRequestContext(req, res, () => {});
    res.status(200).json({ ok: true, data: { value: 1 } });

    expect(res._jsonBody).toEqual({ ok: true, data: { value: 1 } });
  });

  test('getRequestIdFromResponse resolves from locals or header', () => {
    const res = makeRes();
    res.locals.requestId = 'req_local';
    expect(getRequestIdFromResponse(res)).toBe('req_local');

    const otherRes = makeRes();
    otherRes.setHeader('x-request-id', 'req_header');
    expect(getRequestIdFromResponse(otherRes)).toBe('req_header');
  });
});