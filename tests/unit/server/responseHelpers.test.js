import { sendError } from '../../../server/utils/responseHelpers.js';
import { errorHandler } from '../../../server/middleware/errorHandler.js';

/* ── sendError ─────────────────────────────────────── */

describe('responseHelpers — sendError', () => {
  function mockRes() {
    const res = { _status: null, _body: null };
    res.locals = {};
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    res.getHeader = (name) => (name === 'x-request-id' ? res._requestId : undefined);
    return res;
  }

  test('sends status and body with required fields', () => {
    const res = mockRes();
    sendError(res, 400, {
      error: 'Bad input',
      mensaje: 'Revisa los datos.',
      codigo: 'BAD_INPUT'
    });
    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      ok: false,
      error: 'Bad input',
      mensaje: 'Revisa los datos.',
      message: 'Revisa los datos.',
      codigo: 'BAD_INPUT',
      errorInfo: {
        code: 'BAD_INPUT',
        message: 'Revisa los datos.'
      }
    });
  });

  test('passes through extra fields', () => {
    const res = mockRes();
    sendError(res, 503, {
      error: 'No config',
      mensaje: 'Provider not configured.',
      codigo: 'NOT_CONFIGURED',
      requestId: 'req_123',
      details: { hint: 'set env' }
    });
    expect(res._status).toBe(503);
    expect(res._body.requestId).toBe('req_123');
    expect(res._body.details).toEqual({ hint: 'set env' });
    expect(res._body.error).toBe('No config');
    expect(res._body.errorInfo).toEqual({
      code: 'NOT_CONFIGURED',
      message: 'Provider not configured.',
      details: { hint: 'set env' }
    });
  });

  test('uses requestId from response context when not provided explicitly', () => {
    const res = mockRes();
    res.locals.requestId = 'req_auto_1';

    sendError(res, 429, {
      error: 'Rate limited',
      mensaje: 'Demasiadas solicitudes.',
      codigo: 'RATE_LIMIT'
    });

    expect(res._body.requestId).toBe('req_auto_1');
  });

  test('returns the res object for chaining', () => {
    const res = mockRes();
    const returned = sendError(res, 500, {
      error: 'err', mensaje: 'msg', codigo: 'CODE'
    });
    expect(returned).toBe(res);
  });
});

/* ── errorHandler ──────────────────────────────────── */

describe('errorHandler middleware', () => {
  function mockRes() {
    const res = { _status: null, _body: null, headersSent: false };
    res.locals = { requestId: 'req_middleware_1' };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    res.getHeader = (name) => (name === 'x-request-id' ? 'req_middleware_1' : undefined);
    return res;
  }
  const req = { originalUrl: '/test', method: 'GET' };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    console.error.mockRestore();
  });

  test('returns 500 with standard fields for generic error', () => {
    const res = mockRes();
    errorHandler(new Error('boom'), req, res, () => {});
    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({
      ok: false,
      error: 'INTERNAL_ERROR',
      mensaje: expect.any(String),
      message: expect.any(String),
      codigo: 'INTERNAL_ERROR',
      requestId: 'req_middleware_1',
      errorInfo: {
        code: 'INTERNAL_ERROR',
        message: expect.any(String)
      }
    });
  });

  test('uses error.statusCode and error.code when provided', () => {
    const res = mockRes();
    const err = new Error('not found');
    err.statusCode = 404;
    err.code = 'COURSE_NOT_FOUND';
    errorHandler(err, req, res, () => {});
    expect(res._status).toBe(404);
    expect(res._body.error).toBe('COURSE_NOT_FOUND');
    expect(res._body.codigo).toBe('COURSE_NOT_FOUND');
  });

  test('calls next if headers already sent', () => {
    const res = mockRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new Error('late');
    errorHandler(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res._status).toBeNull();
  });

  test('defaults to INTERNAL_ERROR when error.code is empty', () => {
    const res = mockRes();
    errorHandler({ message: 'oops', code: '' }, req, res, () => {});
    expect(res._body.codigo).toBe('INTERNAL_ERROR');
  });

  test('mensaje differs for 4xx vs 5xx', () => {
    const res4 = mockRes();
    const err4 = new Error('bad'); err4.statusCode = 400; err4.code = 'X';
    errorHandler(err4, req, res4, () => {});

    const res5 = mockRes();
    errorHandler(new Error('boom'), req, res5, () => {});

    expect(res4._body.mensaje).not.toBe(res5._body.mensaje);
  });
});
