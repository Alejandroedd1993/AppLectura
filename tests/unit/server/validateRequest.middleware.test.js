import { z } from 'zod';
import { validateRequest } from '../../../server/middleware/validateRequest.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('validateRequest middleware', () => {
  test('sanitiza req.body y llama next cuando el schema es valido', () => {
    const middleware = validateRequest(z.object({
      texto: z.string().trim().min(1),
      cantidad: z.coerce.number().int().positive()
    }));
    const req = { body: { texto: '  hola  ', cantidad: '2', extra: true } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ texto: 'hola', cantidad: 2, extra: true });
  });

  test('responde 400 con details cuando el schema es invalido', () => {
    const middleware = validateRequest(z.object({
      texto: z.string().trim().min(3, 'Texto demasiado corto')
    }));
    const req = { body: { texto: ' x ' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'VALIDATION_FAILED',
      field: 'texto',
      details: [
        expect.objectContaining({
          path: 'texto',
          message: 'Texto demasiado corto'
        })
      ]
    }));
  });
});