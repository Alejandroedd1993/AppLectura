import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

// express-rate-limit v6+ no exporta ipKeyGenerator; usamos req.ip directamente
// (Express normaliza IPv6 cuando trust proxy está activo)
const getClientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

const toPositiveInt = (value, fallback) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : fallback;
};

const getBearerToken = (req) => {
  const authHeader = req.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 20 ? token : null;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Factory para rate limiters con keyGenerator por Bearer token (hasheado) o IP.
 * @param {string} envPrefix - Prefijo de variables de entorno (e.g. 'ANALYSIS' busca ANALYSIS_RATE_LIMIT_WINDOW_MS y ANALYSIS_RATE_LIMIT_MAX).
 * @param {object} opts
 * @param {number} opts.defaultMax - Máximo de requests por ventana (default).
 * @param {string} opts.errorMessage - Mensaje de error para 429.
 * @param {number} [opts.defaultWindowMs=60000] - Ventana por defecto en ms.
 */
function createLimiter(envPrefix, { defaultMax, errorMessage, defaultWindowMs = 60 * 1000 }) {
  return rateLimit({
    windowMs: toPositiveInt(process.env[`${envPrefix}_RATE_LIMIT_WINDOW_MS`], defaultWindowMs),
    max: toPositiveInt(process.env[`${envPrefix}_RATE_LIMIT_MAX`], defaultMax),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const token = getBearerToken(req);
      if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
      return getClientIp(req);
    },
    handler: (req, res, next, options) => {
      const retryAfter = Math.ceil((options.windowMs || defaultWindowMs) / 1000);
      res.status(options.statusCode).json({
        error: errorMessage,
        retryAfter
      });
    }
  });
}

export const analysisLimiter = createLimiter('ANALYSIS', {
  defaultMax: 120,
  errorMessage: 'Demasiadas solicitudes de análisis. Intenta de nuevo en un minuto.'
});

export const chatLimiter = createLimiter('CHAT', {
  defaultMax: 200,
  errorMessage: 'Demasiadas solicitudes de chat. Espera unos segundos y reintenta.'
});

export const notesLimiter = createLimiter('NOTES', {
  defaultMax: 60,
  errorMessage: 'Demasiadas solicitudes para generar notas. Intenta de nuevo en un minuto.'
});

export const webSearchLimiter = createLimiter('WEB_SEARCH', {
  defaultMax: 120,
  errorMessage: 'Demasiadas solicitudes de búsqueda web. Espera un momento y reintenta.'
});

export const assessmentLimiter = createLimiter('ASSESSMENT', {
  defaultMax: 10,
  errorMessage: 'Demasiadas evaluaciones. Intenta de nuevo en un minuto.'
});

export const uploadLimiter = createLimiter('UPLOAD', {
  defaultMax: 30,
  errorMessage: 'Demasiadas cargas de archivo. Espera un momento y reintenta.'
});

export const storageProxyLimiter = createLimiter('STORAGE_PROXY', {
  defaultMax: 120,
  errorMessage: 'Demasiadas solicitudes al proxy de storage. Espera e intenta de nuevo.'
});
