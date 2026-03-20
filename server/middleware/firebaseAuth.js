import { getAdminApp } from '../config/firebaseAdmin.js';
import { sendError } from '../utils/responseHelpers.js';

let authBypassWarningLogged = false;
const REVOKED_CHECK_TIMEOUT_MS = 3000;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeTextLower(value) {
  return normalizeText(value).toLowerCase();
}

function getFirebaseErrorCode(error) {
  return normalizeText(error?.code || error?.errorInfo?.code);
}

function getFirebaseErrorMessage(error) {
  return normalizeText(error?.message || error?.errorInfo?.message);
}

function isRevokedTokenError(error) {
  const code = getFirebaseErrorCode(error);
  const message = normalizeTextLower(getFirebaseErrorMessage(error));

  return code === 'auth/id-token-revoked' ||
    message.includes('id token has been revoked') ||
    message.includes('token has been revoked') ||
    message.includes('refresh token has been revoked');
}

function isDisabledUserError(error) {
  const code = getFirebaseErrorCode(error);
  const message = normalizeTextLower(getFirebaseErrorMessage(error));

  return code === 'auth/user-disabled' ||
    message.includes('user record is disabled') ||
    message.includes('user account has been disabled');
}

function isExpiredTokenError(error) {
  const code = getFirebaseErrorCode(error);
  const message = normalizeTextLower(getFirebaseErrorMessage(error));

  return code === 'auth/id-token-expired' ||
    message.includes('token expired') ||
    message.includes('token has expired');
}

function decodeJwtPayload(token) {
  const parts = normalizeText(token).split('.');
  if (parts.length < 2 || !parts[1]) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function getTokenIssuedAtSeconds(decodedPayload) {
  const issuedAt = Number(decodedPayload?.iat);
  if (Number.isFinite(issuedAt) && issuedAt > 0) {
    return issuedAt;
  }

  const authTime = Number(decodedPayload?.auth_time);
  if (Number.isFinite(authTime) && authTime > 0) {
    return authTime;
  }

  return null;
}

function getTokensValidAfterSeconds(userRecord) {
  const rawValue = normalizeText(userRecord?.tokensValidAfterTime);
  if (!rawValue) return null;

  const milliseconds = Date.parse(rawValue);
  if (!Number.isFinite(milliseconds)) return null;

  return Math.floor(milliseconds / 1000);
}

async function inferAuthStateFromToken(token, { checkRevokedTokens }) {
  const decodedPayload = decodeJwtPayload(token);
  const uid = normalizeText(decodedPayload?.uid || decodedPayload?.user_id || decodedPayload?.sub);
  if (!uid) return null;

  try {
    const userRecord = await getAdminApp().auth().getUser(uid);

    if (userRecord?.disabled) {
      return 'disabled';
    }

    if (!checkRevokedTokens) {
      return null;
    }

    const tokenIssuedAtSeconds = getTokenIssuedAtSeconds(decodedPayload);
    const tokensValidAfterSeconds = getTokensValidAfterSeconds(userRecord);

    if (
      Number.isFinite(tokenIssuedAtSeconds) &&
      Number.isFinite(tokensValidAfterSeconds) &&
      tokenIssuedAtSeconds < tokensValidAfterSeconds
    ) {
      return 'revoked';
    }

    return null;
  } catch {
    return null;
  }
}

const parseBearerToken = (req) => {
  const auth = req.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

function isTrueLike(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function shouldEnforceFirebaseAuth() {
  // Explicit override always wins
  if (process.env.ENFORCE_FIREBASE_AUTH != null) {
    return isTrueLike(process.env.ENFORCE_FIREBASE_AUTH);
  }
  // If NODE_ENV is explicitly production, enforce by default
  const envName = String(process.env.NODE_ENV || '').trim().toLowerCase();
  return envName === 'production';
}

function shouldCheckRevokedTokens() {
  return isTrueLike(process.env.FIREBASE_CHECK_REVOKED_TOKENS);
}

function isTimeoutError(error) {
  const code = normalizeTextLower(error?.code || '');
  const message = normalizeTextLower(getFirebaseErrorMessage(error) || error?.message || '');

  return code === 'auth/revocation-check-timeout' ||
    message.includes('revocation check timeout') ||
    message.includes('operation timed out') ||
    message.includes('timed out');
}

async function verifyIdTokenWithTimeout(authApi, token, timeoutMs) {
  return await Promise.race([
    authApi.verifyIdToken(token, true),
    new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        const error = new Error(`Firebase revocation check timeout after ${timeoutMs}ms`);
        error.code = 'auth/revocation-check-timeout';
        reject(error);
      }, timeoutMs);

      timeout.unref?.();
    })
  ]);
}

function isFirebaseAdminConfigurationError(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();

  return code === 'app/no-app' ||
    code === 'app/invalid-credential' ||
    message.includes('Could not load the default credentials') ||
    message.includes('Firebase Admin no inicializado') ||
    message.includes('FIREBASE_SERVICE_ACCOUNT_') ||
    message.includes('Service account object must contain') ||
    message.includes('Failed to parse private key');
}

export async function requireFirebaseAuth(req, res, next) {
  try {
    if (!shouldEnforceFirebaseAuth()) {
      if (!authBypassWarningLogged) {
        authBypassWarningLogged = true;
        console.warn('[auth] Firebase auth deshabilitada por configuración. Verifica ENFORCE_FIREBASE_AUTH en producción.');
      }
      return next();
    }

    const token = parseBearerToken(req);
    if (!token) {
      return sendError(res, 401, {
        error: 'Authorization Bearer token requerido',
        mensaje: 'Inicia sesion para acceder a este recurso.',
        codigo: 'AUTH_TOKEN_REQUIRED'
      });
    }

    const adminAuth = getAdminApp().auth();
    const checkRevokedTokens = shouldCheckRevokedTokens();
    let decodedToken;
    try {
      decodedToken = checkRevokedTokens
        ? await verifyIdTokenWithTimeout(adminAuth, token, REVOKED_CHECK_TIMEOUT_MS)
        : await adminAuth.verifyIdToken(token, false);
    } catch (verifyError) {
      // If revocation check fails or hangs for infra reasons, retry without it
      if (checkRevokedTokens &&
          !isTimeoutError(verifyError) &&
          !isRevokedTokenError(verifyError) &&
          !isExpiredTokenError(verifyError) &&
          !isDisabledUserError(verifyError) &&
          !isFirebaseAdminConfigurationError(verifyError)) {
        try {
          decodedToken = await adminAuth.verifyIdToken(token, false);
          console.warn('[auth] Revocation check failed, used basic JWT verification:', verifyError.message);
        } catch (fallbackError) {
          throw fallbackError;
        }
      } else if (checkRevokedTokens && isTimeoutError(verifyError)) {
        decodedToken = await adminAuth.verifyIdToken(token, false);
        console.warn('[auth] Revocation check timed out, used basic JWT verification.');
      } else {
        throw verifyError;
      }
    }

    req.auth = {
      uid: decodedToken.uid,
      token: decodedToken
    };

    return next();
  } catch (error) {
    if (isFirebaseAdminConfigurationError(error)) {
      console.error('[auth] Firebase Admin no configurado correctamente:', error);
      return sendError(res, 503, {
        error: 'Servicio de autenticacion no disponible',
        mensaje: 'Firebase Admin no esta configurado correctamente en el servidor.',
        codigo: 'FIREBASE_ADMIN_NOT_CONFIGURED'
      });
    }

    if (isRevokedTokenError(error)) {
      return sendError(res, 401, {
        error: 'Token revocado',
        mensaje: 'La sesion fue revocada. Vuelve a iniciar sesion.',
        codigo: 'AUTH_TOKEN_REVOKED'
      });
    }

    if (isDisabledUserError(error)) {
      return sendError(res, 403, {
        error: 'Usuario deshabilitado',
        mensaje: 'La cuenta asociada a este token esta deshabilitada.',
        codigo: 'AUTH_USER_DISABLED'
      });
    }

    const inferredAuthState = isExpiredTokenError(error)
      ? null
      : await inferAuthStateFromToken(parseBearerToken(req), {
          checkRevokedTokens: shouldCheckRevokedTokens()
        });

    if (inferredAuthState === 'revoked') {
      return sendError(res, 401, {
        error: 'Token revocado',
        mensaje: 'La sesion fue revocada. Vuelve a iniciar sesion.',
        codigo: 'AUTH_TOKEN_REVOKED'
      });
    }

    if (inferredAuthState === 'disabled') {
      return sendError(res, 403, {
        error: 'Usuario deshabilitado',
        mensaje: 'La cuenta asociada a este token esta deshabilitada.',
        codigo: 'AUTH_USER_DISABLED'
      });
    }

    return sendError(res, 401, {
      error: 'Token no válido',
      mensaje: 'El token de autenticacion es invalido o expiro.',
      codigo: 'INVALID_AUTH_TOKEN'
    });
  }
}
