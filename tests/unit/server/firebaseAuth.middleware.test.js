const mockGetAdminApp = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../../../server/config/firebaseAdmin.js', () => ({
  getAdminApp: (...args) => mockGetAdminApp(...args)
}));

import { requireFirebaseAuth } from '../../../server/middleware/firebaseAuth.js';

function buildToken(payload = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

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
    delete process.env.FIREBASE_CHECK_REVOKED_TOKENS;
    process.env.NODE_ENV = 'test';
    mockGetAdminApp.mockReturnValue({
      auth: () => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser })
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

  test('infiere token revocado cuando Firebase devuelve error generico pero el usuario tiene tokens invalidados', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    process.env.FIREBASE_CHECK_REVOKED_TOKENS = 'true';

    mockVerifyIdToken.mockRejectedValue(new Error('Token no valido'));
    mockGetUser.mockResolvedValue({
      uid: 'user-123',
      disabled: false,
      tokensValidAfterTime: '2026-03-11T12:10:00.000Z'
    });

    const req = makeReq(`Bearer ${buildToken({ uid: 'user-123', iat: 1773230400 })}`);
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalledWith('user-123');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'AUTH_TOKEN_REVOKED'
    }));
  });

  test('infiere usuario deshabilitado cuando Firebase devuelve error generico y el usuario esta deshabilitado', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';

    mockVerifyIdToken.mockRejectedValue(new Error('Token no valido'));
    mockGetUser.mockResolvedValue({
      uid: 'user-123',
      disabled: true,
      tokensValidAfterTime: '2026-03-11T12:10:00.000Z'
    });

    const req = makeReq(`Bearer ${buildToken({ uid: 'user-123', iat: 1773236400 })}`);
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalledWith('user-123');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'AUTH_USER_DISABLED'
    }));
  });

  test('no reclasifica como revocado cuando Firebase reporta token expirado', async () => {
    process.env.ENFORCE_FIREBASE_AUTH = 'true';
    process.env.FIREBASE_CHECK_REVOKED_TOKENS = 'true';

    const expiredError = new Error('Firebase ID token has expired');
    expiredError.code = 'auth/id-token-expired';
    mockVerifyIdToken.mockRejectedValue(expiredError);

    const req = makeReq(`Bearer ${buildToken({ uid: 'user-123', iat: 1773230400 })}`);
    const res = makeRes();
    const next = jest.fn();

    await requireFirebaseAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'INVALID_AUTH_TOKEN'
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