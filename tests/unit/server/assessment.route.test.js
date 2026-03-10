jest.mock('../../../server/controllers/assessment.controller.js', () => ({
  evaluateAnswer: jest.fn(),
  evaluateComprehensive: jest.fn(),
  bulkEvaluate: jest.fn()
}));

jest.mock('../../../server/middleware/rateLimiters.js', () => ({
  assessmentLimiter: (req, res, next) => next()
}));

jest.mock('../../../server/middleware/firebaseAuth.js', () => ({
  requireFirebaseAuth: (req, res, next) => next()
}));

import { validateAssessmentInput, validateComprehensiveInput } from '../../../server/routes/assessment.route.js';

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('assessment.route validators', () => {
  test('validateAssessmentInput responde 400 si req.body no existe', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    validateAssessmentInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_ASSESSMENT_TEXT',
      mensaje: expect.any(String),
      field: 'texto'
    }));
  });

  test('validateAssessmentInput sanitiza campos validos', () => {
    const req = {
      body: {
        texto: 'a'.repeat(80),
        respuesta: 'b'.repeat(40),
        dimension: ' ComprensionAnalitica '
      }
    };
    const res = makeRes();
    const next = jest.fn();

    validateAssessmentInput(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.dimension).toBe('comprensionanalitica');
  });

  test('validateComprehensiveInput responde 400 si req.body no existe', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    validateComprehensiveInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_COMPREHENSIVE_TEXT',
      mensaje: expect.any(String),
      field: 'texto'
    }));
  });
});