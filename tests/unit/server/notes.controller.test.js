jest.mock('../../../server/services/notes.service.js', () => ({
  generarNotasConOpenAI: jest.fn(),
  generarNotasConDeepSeek: jest.fn(),
  generarNotasConGemini: jest.fn()
}));

import { generarNotas } from '../../../server/controllers/notes.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('notes.controller', () => {
  test('generarNotas responde 400 semantico si texto falta o es vacio', async () => {
    const req = { body: {} };
    const res = makeRes();

    await generarNotas(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Texto vacio',
      mensaje: 'Proporciona texto para generar notas',
      codigo: 'EMPTY_NOTES_TEXT'
    }));
  });
});