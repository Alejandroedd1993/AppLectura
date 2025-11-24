// Servicio unificado para llamadas de IA (chat y análisis)
// Centraliza provider/model, timeouts, y manejo de errores

import { fetchWithTimeout } from '../utils/netUtils';
import { getBackendUrl } from '../utils/backendUtils';

const defaultModels = {
  openai: 'gpt-3.5-turbo',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-pro'
};

/**
 * Llama al endpoint unificado de chat/completion del backend
 * @param {Object} opts
 * @param {Array} opts.messages - [{ role, content }]
 * @param {String} [opts.provider='deepseek'] - 'deepseek' | 'openai' | 'gemini'
 * @param {String} [opts.model] - opcional, auto por provider si no se pasa
 * @param {String} [opts.apiKey] - opcional, se envía solo si se define
 * @param {Number} [opts.temperature=0.7]
 * @param {Number} [opts.max_tokens=800]
 * @param {AbortSignal} [opts.signal]
 * @param {Number} [opts.timeoutMs=30000]
 * @returns {Promise<Object>} JSON de respuesta del backend (estilo OpenAI)
 */
export async function chatCompletion({
  messages,
  provider = 'deepseek',
  model,
  apiKey,
  temperature = 0.7,
  max_tokens = 800,
  signal,
  timeoutMs = 45000  // Aumentado a 45s para llamadas complejas (antes 30s)
}) {
  const url = `${getBackendUrl()}/api/chat/completion`;
  const payload = {
    provider,
    model: model || defaultModels[provider] || defaultModels.openai,
    messages,
    temperature,
    max_tokens,
    ...(apiKey ? { apiKey } : {})
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  }, timeoutMs);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
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
export async function analyzeText({ texto, api = 'deepseek', extra = {}, signal, timeoutMs = 20000 }) {
  const url = `${getBackendUrl()}/api/analysis/text`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, api, ...extra }),
    signal
  }, timeoutMs);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
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
      try { return JSON.parse(match[0]); } catch {}
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
