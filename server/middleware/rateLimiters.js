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
 * Rate limiter para endpoints de análisis (costosos).
 * - Preferimos agrupar por usuario si llega Authorization: Bearer <token> (no se almacena el token; se hashea).
 * - Si no hay auth, se usa IP (por eso los umbrales por defecto son altos para evitar romper aulas con NAT).
 */
export const analysisLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.ANALYSIS_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.ANALYSIS_RATE_LIMIT_MAX, 120),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
    return getClientIp(req);
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs || 60 * 1000) / 1000);
    res.status(options.statusCode).json({
      error: 'Demasiadas solicitudes de análisis. Intenta de nuevo en un minuto.',
      retryAfter
    });
  }
});

/**
 * Rate limiter para chat/completion (costoso y potencialmente disparado por loops de UI).
 * - Si hay bearer token, agrupa por token hasheado.
 * - Si no hay auth, agrupa por IP (ojo con NAT en aulas; ajusta los env si hace falta).
 */
export const chatLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.CHAT_RATE_LIMIT_MAX, 200),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
    return getClientIp(req);
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs || 60 * 1000) / 1000);
    res.status(options.statusCode).json({
      error: 'Demasiadas solicitudes de chat. Espera unos segundos y reintenta.',
      retryAfter
    });
  }
});

/**
 * Rate limiter para generación de notas (costoso).
 */
export const notesLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.NOTES_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.NOTES_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
    return getClientIp(req);
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs || 60 * 1000) / 1000);
    res.status(options.statusCode).json({
      error: 'Demasiadas solicitudes para generar notas. Intenta de nuevo en un minuto.',
      retryAfter
    });
  }
});

/**
 * Rate limiter para búsqueda web (puede ser costosa por APIs externas y por /answer con IA).
 */
export const webSearchLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.WEB_SEARCH_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.WEB_SEARCH_RATE_LIMIT_MAX, 120),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
    return getClientIp(req);
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs || 60 * 1000) / 1000);
    res.status(options.statusCode).json({
      error: 'Demasiadas solicitudes de búsqueda web. Espera un momento y reintenta.',
      retryAfter
    });
  }
});

/**
 * Rate limiter para evaluaciones/assessment (costoso).
 * - Defaults conservadores (10/min) similares a los anteriores.
 * - Agrupa por Bearer token si existe; si no, por IP.
 */
export const assessmentLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.ASSESSMENT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.ASSESSMENT_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) return `bearer:${hashToken(token).slice(0, 32)}`;
    return getClientIp(req);
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil((options.windowMs || 60 * 1000) / 1000);
    res.status(options.statusCode).json({
      error: 'Demasiadas evaluaciones. Intenta de nuevo en un minuto.',
      retryAfter
    });
  }
});
