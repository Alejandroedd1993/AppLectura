const mockGetAdminApp = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('../../../server/config/firebaseAdmin.js', () => ({
  getAdminApp: (...args) => mockGetAdminApp(...args)
}));

import { requireFirebaseAuth } from '../../../server/middleware/firebaseAuth.js';

function makeReq(authHeader) {
  return {
    auth: undefined,
    get: jest.fn((headerName) => {
      if (String(headerName).toLowerCase() === 'authorization') return authHeader;
      return undefined;
    })
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('firebaseAuth middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ENFORCE_FIREBASE_AUTH;
    process.env.NODE_ENV = 'test';
    mockGetAdminApp.mockReturnValue({
      auth: () => ({ verifyIdToken: mockVerifyIdToken })
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('omite autenticacion cuando ENFORCE_FIREBASE_AUTH=false', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'false';
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockGetAdminApp).not.toHaveBeenCalled();
  });

  test('responde 401 si falta bearer token', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'AUTH_TOKEN_REQUIRED'
    }));
  });

  test('responde 503 si Firebase Admin no esta configurado', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    mockGetAdminApp.mockImplementation(() => {
      const error = new Error('Could not load the default credentials');
      error.code = 'app/invalid-credential';
      throw error;
    });

    const req = makeReq('Bearer token-demo');
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'FIREBASE_ADMIN_NOT_CONFIGURED'
    }));
  });

  test('responde 401 si verifyIdToken falla', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    mockVerifyIdToken.mockRejectedValue(new Error('token expired'));

    const req = makeReq('Bearer token-demo');
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_AUTH_TOKEN'
    }));
  });

  test('responde 401 si Firebase indica token revocado', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    const revokedError = new Error('revoked');
    revokedError.code = 'auth/id-token-revoked';
    mockVerifyIdToken.mockRejectedValue(revokedError);

    const req = makeReq('Bearer token-demo');
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'AUTH_TOKEN_REVOKED'
    }));
  });

  test('responde 403 si Firebase indica usuario deshabilitado', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    const disabledError = new Error('disabled');
    disabledError.code = 'auth/user-disabled';
    mockVerifyIdToken.mockRejectedValue(disabledError);

    const req = makeReq('Bearer token-demo');
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'AUTH_USER_DISABLED'
    }));
  });

  test('inyecta req.auth y continua cuando verifyIdToken es valido', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      role: 'student'
    });

    const req = makeReq('Bearer token-demo');
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toEqual({
      uid: 'user-123',
      token: expect.objectContaining({ uid: 'user-123', email: 'user@example.com' })
    });
  });
});