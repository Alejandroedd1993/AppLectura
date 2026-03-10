import { getAdminApp } from '../config/firebaseAdmin.js';

let authBypassWarningLogged = false;

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
  const envName = String(process.env.NODE_ENV || '').trim().toLowerCase();
  const isLocalLikeEnv = envName === 'development' || envName === 'test';
  return isTrueLike(process.env.ENFORCE_FIREBASE_AUTH ?? (isLocalLikeEnv ? 'false' : 'true'));
}

function shouldCheckRevokedTokens() {
  return isTrueLike(process.env.FIREBASE_CHECK_REVOKED_TOKENS);
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
      return res.status(401).json({
        error: 'Authorization Bearer token requerido',
        mensaje: 'Inicia sesion para acceder a este recurso.',
        codigo: 'AUTH_TOKEN_REQUIRED'
      });
    }

    const decodedToken = await getAdminApp().auth().verifyIdToken(token, shouldCheckRevokedTokens());

    req.auth = {
      uid: decodedToken.uid,
      token: decodedToken
    };

    return next();
  } catch (error) {
    if (isFirebaseAdminConfigurationError(error)) {
      console.error('[auth] Firebase Admin no configurado correctamente:', error);
      return res.status(503).json({
        error: 'Servicio de autenticacion no disponible',
        mensaje: 'Firebase Admin no esta configurado correctamente en el servidor.',
        codigo: 'FIREBASE_ADMIN_NOT_CONFIGURED'
      });
    }

    if (String(error?.code || '').trim() === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Token revocado',
        mensaje: 'La sesion fue revocada. Vuelve a iniciar sesion.',
        codigo: 'AUTH_TOKEN_REVOKED'
      });
    }

    if (String(error?.code || '').trim() === 'auth/user-disabled') {
      return res.status(403).json({
        error: 'Usuario deshabilitado',
        mensaje: 'La cuenta asociada a este token esta deshabilitada.',
        codigo: 'AUTH_USER_DISABLED'
      });
    }

    return res.status(401).json({
      error: 'Token no válido',
      mensaje: 'El token de autenticacion es invalido o expiro.',
      codigo: 'INVALID_AUTH_TOKEN'
    });
  }
}

export default requireFirebaseAuth;
