// Servicio unificado para llamadas de IA (chat y análisis)
// Centraliza provider/model, timeouts, y manejo de errores

import { fetchWithTimeout } from '../utils/netUtils';
import { buildBackendEndpoint, getFirebaseAuthHeader } from '../utils/backendRequest';
import { CHAT_TIMEOUT_MS, NETWORK_TIMEOUT_MS } from '../constants/timeoutConstants';

const defaultModels = {
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-pro'
};

/**
 * Llama al endpoint unificado de chat/completion del backend
 * @param {Object} opts
 * @param {Array} opts.messages - [{ role, content }]
 * @param {String} [opts.provider='deepseek'] - 'deepseek' | 'openai' | 'gemini'
 * @param {String} [opts.model] - opcional, auto por provider si no se pasa
 * @param {Number} [opts.temperature=0.7]
 * @param {Number} [opts.max_tokens=800]
 * @param {AbortSignal} [opts.signal]
 * @param {Number} [opts.timeoutMs=30000]
 * @returns {Promise<Object>} JSON de respuesta del backend (estilo OpenAI)
 */
// Límite defensivo por mensaje (debe estar por debajo del backend maxMessageChars=20000)
const MAX_MSG_CHARS = 18000;
const TRUNCATION_SUFFIX = '\n\n[contenido truncado automáticamente por límite técnico]';
const DEFAULT_ERROR_MESSAGE = 'No se pudo completar la solicitud.';

function capMessages(msgs) {
  if (!Array.isArray(msgs)) return msgs;
  return msgs.map(m => {
    if (!m?.content || typeof m.content !== 'string') return m;
    if (m.role === 'system' || m.content.length <= MAX_MSG_CHARS) return m;
    return { ...m, content: m.content.slice(0, MAX_MSG_CHARS - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX };
  });
}

function sanitizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export function normalizeBackendErrorPayload(payload, options = {}) {
  const { status, fallbackMessage = DEFAULT_ERROR_MESSAGE } = options;
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const backendError = sanitizeText(safePayload.error);
  const explicitMessage = sanitizeText(safePayload.mensaje);
  const legacyMessage = sanitizeText(safePayload.message);
  const responseCode = sanitizeText(safePayload.codigo) || sanitizeText(safePayload.code);
  const requestId = sanitizeText(safePayload.requestId);

  return {
    status,
    code: responseCode || undefined,
    backendError: backendError || undefined,
    message: explicitMessage || backendError || legacyMessage || fallbackMessage,
    requestId: requestId || undefined,
    payload: safePayload
  };
}

export async function buildBackendError(response, options = {}) {
  const { fallbackMessage = DEFAULT_ERROR_MESSAGE } = options;
  const rawText = await response.text().catch(() => '');
  let parsedPayload = null;

  if (rawText) {
    try {
      parsedPayload = JSON.parse(rawText);
    } catch {
      parsedPayload = null;
    }
  }

  const normalized = parsedPayload
    ? normalizeBackendErrorPayload(parsedPayload, { status: response.status, fallbackMessage })
    : {
        status: response.status,
        code: undefined,
        backendError: undefined,
        message: sanitizeText(rawText) || fallbackMessage,
        requestId: undefined,
        payload: undefined
      };

  const error = new Error(normalized.message);
  error.status = normalized.status;
  error.code = normalized.code;
  error.backendError = normalized.backendError;
  error.requestId = normalized.requestId;
  error.payload = normalized.payload;
  return error;
}

export async function chatCompletion({
  messages,
  provider = 'deepseek',
  model,
  temperature = 0.7,
  max_tokens = 800,
  response_format,
  signal,
  timeoutMs = CHAT_TIMEOUT_MS  // 🆕 A5 FIX: Usar constante unificada
}) {
  const url = buildBackendEndpoint('/api/chat/completion');
  const payload = {
    provider,
    model: model || defaultModels[provider] || defaultModels.openai,
    messages: capMessages(messages),
    temperature,
    max_tokens,
    ...(response_format ? { response_format } : {})
  };

  const doRequest = async (bodyPayload) => {
    const authHeader = await getFirebaseAuthHeader();
    return fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(bodyPayload),
      signal
    }, timeoutMs);
  };

  const res = await doRequest(payload);

  if (!res.ok) {
    throw await buildBackendError(res, {
      fallbackMessage: 'No se pudo completar la solicitud de chat.'
    });
  }
  return res.json();
}

/**
 * Llama al endpoint de análisis de texto del backend
 * @param {Object} opts
 * @param {String} opts.texto
 * @param {String} [opts.api='deepseek'] - proveedor lógico del backend
 * @param {Object} [opts.extra] - campos adicionales a enviar
 * @param {AbortSignal} [opts.signal]
 * @param {Number} [opts.timeoutMs=20000]
 * @returns {Promise<Object>} JSON de análisis
 */
export async function analyzeText({ texto, api = 'deepseek', extra = {}, signal, timeoutMs = NETWORK_TIMEOUT_MS }) {  // 🆕 A5 FIX
  const url = buildBackendEndpoint('/api/analysis/text');
  const authHeader = await getFirebaseAuthHeader();
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ texto, api, ...extra }),
    signal
  }, timeoutMs);
  if (!res.ok) {
    throw await buildBackendError(res, {
      fallbackMessage: 'No se pudo completar el analisis del texto.'
    });
  }
  return res.json();
}

/**
 * Extrae el contenido de texto estándar de una respuesta estilo OpenAI o backend simplificado
 * @param {Object} json
 * @returns {String|undefined}
 */
export function extractContent(json) {
  // Formato OpenAI estándar
  if (json?.choices?.[0]?.message?.content) {
    return json.choices[0].message.content;
  }

  // Formato simplificado del backend (retorna directamente { content: "..." })
  if (json?.content) {
    return json.content;
  }

  // Otros formatos posibles
  if (json?.message) {
    return json.message;
  }

  if (json?.result) {
    return json.result;
  }

  return undefined;
}

/**
 * Intenta parsear JSON desde un string, eliminando code fences si existen
 * @param {String} content
 * @returns {any}
 */
export function parseJSONFromContent(content) {
  if (typeof content !== 'string') return null;
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { }
    }
    return null;
  }
}

export default {
  chatCompletion,
  analyzeText,
  extractContent,
  parseJSONFromContent
};
