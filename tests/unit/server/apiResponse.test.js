import { buildErrorPayload, buildSuccessPayload, sendErrorResponse, sendSuccess } from '../../../server/utils/apiResponse.js';

describe('apiResponse util', () => {
  function mockRes() {
    const res = { _status: null, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  test('buildSuccessPayload envuelve data con ok=true', () => {
    expect(buildSuccessPayload({ hola: 'mundo' })).toEqual({
      ok: true,
      data: { hola: 'mundo' }
    });
  });

  test('buildSuccessPayload preserva extras', () => {
    expect(buildSuccessPayload({ total: 2 }, { meta: { page: 1 } })).toEqual({
      ok: true,
      data: { total: 2 },
      meta: { page: 1 }
    });
  });

  test('sendSuccess responde con status 200 por defecto', () => {
    const res = mockRes();

    sendSuccess(res, { status: 'ok' });

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      ok: true,
      data: { status: 'ok' }
    });
  });

  test('sendSuccess permite status y extras', () => {
    const res = mockRes();

    sendSuccess(res, { id: 'job_1' }, { queued: true }, 202);

    expect(res._status).toBe(202);
    expect(res._body).toEqual({
      ok: true,
      data: { id: 'job_1' },
      queued: true
    });
  });

  test('buildErrorPayload crea envelope transicional con ok=false y errorInfo', () => {
    expect(buildErrorPayload({
      error: 'Bad input',
      mensaje: 'Revisa los datos.',
      codigo: 'BAD_INPUT',
      details: { field: 'texto' }
    })).toEqual({
      ok: false,
      error: 'Bad input',
      mensaje: 'Revisa los datos.',
      message: 'Revisa los datos.',
      codigo: 'BAD_INPUT',
      details: { field: 'texto' },
      errorInfo: {
        code: 'BAD_INPUT',
        message: 'Revisa los datos.',
        details: { field: 'texto' }
      }
    });
  });

  test('sendErrorResponse responde con payload de error estandarizado', () => {
    const res = mockRes();

    sendErrorResponse(res, 400, {
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
});