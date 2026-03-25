jest.mock('../../../server/services/notes.service.js', () => ({
  generarNotasConOpenAI: jest.fn(),
  generarNotasConDeepSeek: jest.fn(),
  generarNotasConGemini: jest.fn()
}));

import { generarNotasConOpenAI } from '../../../server/services/notes.service.js';
import { generarNotas } from '../../../server/controllers/notes.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('notes.controller', () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterAll(() => {
    if (originalOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  test('generarNotas responde 503 si el proveedor devuelve formato invalido', async () => {
    generarNotasConOpenAI.mockResolvedValue({ invalido: true });
    const req = { body: { texto: 'Texto suficiente para generar notas.', api: 'openai' } };
    const res = makeRes();

    await generarNotas(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Respuesta invalida del proveedor',
      mensaje: 'La respuesta del proveedor no tuvo el formato esperado.',
      codigo: 'INVALID_NOTES_RESPONSE'
    }));
  });

  test('generarNotas responde success envelope cuando el proveedor devuelve notas validas', async () => {
    generarNotasConOpenAI.mockResolvedValue({
      resumen: 'Resumen válido',
      notas: [{ titulo: 'Idea clave', contenido: 'Contenido válido' }],
      preguntas: ['¿Qué significa esto?'],
      tarjetas: [{ frente: 'Frente', reverso: 'Reverso' }]
    });
    const req = { body: { texto: 'Texto suficiente para generar notas.', api: 'openai' } };
    const res = makeRes();

    await generarNotas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: {
        resumen: 'Resumen válido',
        notas: [{ titulo: 'Idea clave', contenido: 'Contenido válido' }],
        preguntas: ['¿Qué significa esto?'],
        tarjetas: [{ frente: 'Frente', reverso: 'Reverso' }]
      }
    });
  });
});