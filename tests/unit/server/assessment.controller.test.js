import { bulkEvaluate, evaluateAnswer, evaluateComprehensive } from '../../../server/controllers/assessment.controller.js';

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

  test('evaluateAnswer returns {ok:true, data} on successful evaluation', async () => {
    const aiResult = JSON.stringify({
      dimension: 'comprensionAnalitica',
      scoreGlobal: 8,
      nivel: 3,
      criteriosEvaluados: [{ criterio: 'c1', nivel: 3, evidencia: [], fortalezas: [], mejoras: [] }],
      resumenDimension: 'Buen análisis',
      siguientesPasos: ['Profundizar']
    });
    const req = makeReq({
      texto: 'x'.repeat(80),
      respuesta: 'y'.repeat(30),
      dimension: 'comprensionAnalitica'
    }, jest.fn().mockResolvedValue(aiResult));
    const res = makeRes();

    await evaluateAnswer(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          valid: true,
          dimension: 'comprensionAnalitica',
          scoreGlobal: 8
        })
      })
    );
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
    expect(res.json.mock.calls[0][0].evaluaciones).toBeUndefined();
  });

  test('bulkEvaluate procesa en lotes de 3, preserva orden y limita concurrencia', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const complete = jest.fn().mockImplementation(async ({ prompt }) => {
      const itemId = Number(String(prompt).match(/respuesta-(\d+)/)?.[1] || '0');

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10 * (4 - ((itemId % 3) || 3))));
      inFlight -= 1;

      return JSON.stringify({
        dimension: 'comprensionAnalitica',
        scoreGlobal: itemId,
        nivel: 3,
        criteriosEvaluados: []
      });
    });

    const req = makeReq({
      items: Array.from({ length: 5 }, (_, index) => ({
        texto: 'x'.repeat(80),
        respuesta: `respuesta-${index + 1}`.padEnd(30, 'z'),
        dimension: 'comprensionAnalitica',
        provider: 'openai'
      }))
    }, complete);
    const res = makeRes();

    await bulkEvaluate(req, res);

    expect(maxInFlight).toBeLessThanOrEqual(3);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        totalItems: 5,
        successCount: 5,
        failureCount: 0
      })
    }));
    expect(payload.data.results).toHaveLength(5);
    expect(payload.data.results.map((entry) => entry.data.scoreGlobal)).toEqual([1, 2, 3, 4, 5]);
  });
});