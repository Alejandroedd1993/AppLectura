import { evaluateAnswer, evaluateComprehensive } from '../../../server/controllers/assessment.controller.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeReq(body, completeImpl) {
  return {
    body,
    app: {
      get: jest.fn((key) => {
        if (key !== 'aiClient') return undefined;
        return { complete: completeImpl };
      })
    }
  };
}

describe('assessment.controller provider response semantics', () => {
  test('evaluateAnswer responde 503 si el proveedor devuelve JSON invalido', async () => {
    const req = makeReq({
      texto: 'x'.repeat(80),
      respuesta: 'y'.repeat(30),
      dimension: 'comprensionAnalitica'
    }, jest.fn().mockResolvedValue('no-es-json'));
    const res = makeRes();

    await evaluateAnswer(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      valid: false,
      degraded: true,
      codigo: 'ASSESSMENT_INVALID_PROVIDER_RESPONSE'
    }));
  });

  test('evaluateComprehensive responde 503 si la respuesta del proveedor es incompleta', async () => {
    const req = makeReq({
      texto: 'x'.repeat(250),
      respuesta: 'y'.repeat(120)
    }, jest.fn().mockResolvedValue(JSON.stringify({ evaluaciones: [{ dimension: 'acd' }] })));
    const res = makeRes();

    await evaluateComprehensive(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      valid: false,
      degraded: true,
      codigo: 'COMPREHENSIVE_ASSESSMENT_INCOMPLETE_PROVIDER_RESPONSE'
    }));
  });
});