jest.mock('../../../server/services/analisis.service.js', () => ({
  analizarTexto: jest.fn()
}));
jest.mock('../../../server/services/basic.service.js', () => ({
  analizarTextoBasico: jest.fn()
}));
jest.mock('../../../server/validators/schemas.js', () => ({
  analysisSchema: {
    safeParse: jest.fn()
  }
}));

import { analizarTexto as analizarTextoService } from '../../../server/services/analisis.service.js';
import { analysisSchema } from '../../../server/validators/schemas.js';
import { analizarTexto } from '../../../server/controllers/analisis.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('analisis.controller success envelope', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns {ok:true, data} on successful validated analysis', async () => {
    const analysisResult = {
      resumen: 'Test summary',
      ideasPrincipales: ['idea1'],
      temas: ['tema1']
    };
    analizarTextoService.mockResolvedValue(analysisResult);
    analysisSchema.safeParse.mockReturnValue({
      success: true,
      data: analysisResult
    });

    const req = { body: { texto: 'x'.repeat(100), api: 'smart' } };
    const res = makeRes();

    await analizarTexto(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: analysisResult
      })
    );
  });

  test('returns {ok:true, data} on Zod fallback path', async () => {
    analizarTextoService.mockResolvedValue({ resumen: 'partial' });
    analysisSchema.safeParse.mockReturnValue({
      success: false,
      error: { flatten: () => ({}) }
    });

    const req = { body: { texto: 'x'.repeat(100), api: 'smart' } };
    const res = makeRes();

    await analizarTexto(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({ resumen: 'partial' })
      })
    );
  });

  test('returns 400 for empty text', async () => {
    const req = { body: { texto: '' } };
    const res = makeRes();

    await analizarTexto(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
