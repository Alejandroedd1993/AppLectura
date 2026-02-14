import crypto from 'crypto';

const GOOGLE_SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

let certsCache = {
  certs: null,
  expiresAt: 0
};

const toBase64 = (base64Url) => {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), '=');
  return padded.replace(/-/g, '+').replace(/_/g, '/');
};

const decodeJsonPart = (part) => {
  const raw = Buffer.from(toBase64(part), 'base64').toString('utf8');
  return JSON.parse(raw);
};

const parseBearerToken = (req) => {
  const auth = req.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const parseMaxAgeMs = (cacheControlHeader) => {
  const m = String(cacheControlHeader || '').match(/max-age=(\d+)/i);
  if (!m) return ONE_HOUR_MS;
  const seconds = Number(m[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return ONE_HOUR_MS;
  return seconds * 1000;
};

const getProjectId = () =>
  String(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    ''
  ).trim();

async function getGoogleCerts() {
  const now = Date.now();
  if (certsCache.certs && now < certsCache.expiresAt) {
    return certsCache.certs;
  }

  const response = await fetch(GOOGLE_SECURETOKEN_CERTS_URL);
  if (!response.ok) {
    throw new Error(`No se pudieron obtener certificados de Google (${response.status})`);
  }

  const certs = await response.json();
  const cacheControl = response.headers.get('cache-control');
  const maxAgeMs = parseMaxAgeMs(cacheControl);
  certsCache = {
    certs,
    expiresAt: now + Math.max(maxAgeMs - FIVE_MIN_MS, FIVE_MIN_MS)
  };

  return certs;
}

function verifyJwtSignature(unsignedToken, signaturePart, certPem) {
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(unsignedToken);
  verifier.end();
  const signature = Buffer.from(toBase64(signaturePart), 'base64');
  return verifier.verify(certPem, signature);
}

function validateTokenClaims(payload, projectId) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIss = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) throw new Error('Token con aud inválido');
  if (payload.iss !== expectedIss) throw new Error('Token con iss inválido');
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Token con sub inválido');
  }
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSec) {
    throw new Error('Token expirado');
  }
  if (!Number.isFinite(payload.iat) || payload.iat > nowSec + 60) {
    throw new Error('Token con iat inválido');
  }
}

export async function requireFirebaseAuth(req, res, next) {
  try {
    const enforce = String(
      process.env.ENFORCE_FIREBASE_AUTH ||
      (process.env.NODE_ENV === 'production' ? 'true' : 'false')
    ).toLowerCase() === 'true';

    if (!enforce) {
      return next();
    }

    const projectId = getProjectId();
    if (!projectId) {
      return res.status(500).json({
        error: 'FIREBASE_PROJECT_ID no está configurado en el backend'
      });
    }

    const token = parseBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization Bearer token requerido' });
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Token JWT inválido' });
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJsonPart(encodedHeader);
    const payload = decodeJsonPart(encodedPayload);

    if (header.alg !== 'RS256' || !header.kid) {
      return res.status(401).json({ error: 'Token con encabezado inválido' });
    }

    validateTokenClaims(payload, projectId);

    const certs = await getGoogleCerts();
    const certPem = certs[header.kid];
    if (!certPem) {
      return res.status(401).json({ error: 'kid de token no reconocido' });
    }

    const isValidSignature = verifyJwtSignature(`${encodedHeader}.${encodedPayload}`, encodedSignature, certPem);
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Firma de token inválida' });
    }

    req.auth = {
      uid: payload.user_id || payload.sub,
      token: payload
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token no válido', details: error.message });
  }
}
