jest.mock('../../../server/controllers/preLectura.controller.js', () => ({
  analyzePreLecture: jest.fn()
}));

jest.mock('../../../server/controllers/glossary.controller.js', () => ({
  generateGlossary: jest.fn()
}));

jest.mock('../../../server/controllers/webSearch.controller.js', () => ({
  __esModule: true,
  default: {
    buscarWeb: jest.fn(),
    responderBusquedaIA: jest.fn()
  }
}));

jest.mock('../../../server/middleware/rateLimiters.js', () => ({
  analysisLimiter: (req, res, next) => next(),
  webSearchLimiter: (req, res, next) => next(),
  storageProxyLimiter: (req, res, next) => next()
}));

jest.mock('../../../server/middleware/firebaseAuth.js', () => ({
  requireFirebaseAuth: (req, res, next) => next()
}));

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('remaining route validators', () => {
  test('validatePreLectureInput responde 400 con text insuficiente', async () => {
    const { validatePreLectureInput } = await import('../../../server/routes/analisis.routes.js');
    const req = { body: { text: 'corto' } };
    const res = makeRes();
    const next = jest.fn();

    validatePreLectureInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_PRELECTURA_REQUEST',
      field: 'text'
    }));
  });

  test('validateGlossaryInput sanitiza maxTerms', async () => {
    const { validateGlossaryInput } = await import('../../../server/routes/analisis.routes.js');
    const req = { body: { text: 'x'.repeat(250), maxTerms: '8' } };
    const res = makeRes();
    const next = jest.fn();

    validateGlossaryInput(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.maxTerms).toBe(8);
  });

  test('validateWebSearchInput responde 400 si falta query', async () => {
    const { validateWebSearchInput } = await import('../../../server/routes/webSearch.routes.js');
    const req = { body: {} };
    const res = makeRes();
    const next = jest.fn();

    validateWebSearchInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_WEB_SEARCH_REQUEST',
      field: 'query'
    }));
  });

  test('validateStorageProxyQuery toma query string y llama next', async () => {
    const { validateStorageProxyQuery } = await import('../../../server/routes/storage.routes.js');
    const req = { query: { url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/file.pdf' } };
    const res = makeRes();
    const next = jest.fn();

    validateStorageProxyQuery(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.url).toBe('https://firebasestorage.googleapis.com/v0/b/demo/o/file.pdf');
  });

  test('validateAdminCleanupEnqueueInput responde 400 si falta studentUid', async () => {
    const { validateAdminCleanupEnqueueInput } = await import('../../../server/routes/adminCleanup.routes.js');
    const req = { body: { courseId: 'course-1' } };
    const res = makeRes();
    const next = jest.fn();

    validateAdminCleanupEnqueueInput(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_ADMIN_CLEANUP_REQUEST',
      field: 'studentUid'
    }));
  });

  test('validateAdminCleanupRunPendingInput normaliza maxJobs desde query', async () => {
    const { validateAdminCleanupRunPendingInput } = await import('../../../server/routes/adminCleanup.routes.js');
    const req = { body: {}, query: { maxJobs: '15' } };
    const res = makeRes();
    const next = jest.fn();

    validateAdminCleanupRunPendingInput(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.maxJobs).toBe(15);
  });
});