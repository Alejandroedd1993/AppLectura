
import { settings } from '../../config/settings.js';

function parseAllowedModelsCsv(csv) {
  if (typeof csv !== 'string') return [];
  return csv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function pickAllowedModel(requested, allowed, fallback) {
  const list = Array.isArray(allowed) ? allowed : [];
  if (requested && list.includes(requested)) return requested;
  if (list.length) return list[0];
  return fallback;
}

/**
 * Estrategia de análisis de texto utilizando la API de DeepSeek (OpenAI-compatible).
 * @param {string} prompt - Prompt para enviar al modelo.
 * @param {{ system?: string, max_tokens?: number, temperature?: number }} [options]
 * @returns {Promise<string>} Contenido de respuesta (texto), normalmente JSON.
 */
export async function deepseekStrategy(prompt, options = {}) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada');
  }

  const baseUrl = String(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const allowedModels = (() => {
    const fromEnv = parseAllowedModelsCsv(process.env.DEEPSEEK_ALLOWED_MODELS);
    return fromEnv.length ? fromEnv : ['deepseek-chat'];
  })();

  const requestedModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const model = pickAllowedModel(requestedModel, allowedModels, 'deepseek-chat');

  const capFromEnv = Number.parseInt(process.env.ANALYSIS_DEEPSEEK_MAX_TOKENS_CAP || '', 10);
  const maxTokensCap = Number.isFinite(capFromEnv)
    ? Math.max(1, Math.min(capFromEnv, 4096))
    : 2048;

  const overrideMaxTokens = Number.parseInt(String(options?.max_tokens ?? ''), 10);
  const max_tokens = Number.isFinite(overrideMaxTokens)
    ? Math.max(1, Math.min(overrideMaxTokens, maxTokensCap))
    : maxTokensCap;

  const temperature = typeof options?.temperature === 'number' ? options.temperature : 0.3;

  const messages = options?.system
    ? [{ role: 'system', content: String(options.system) }, { role: 'user', content: prompt }]
    : [
        { role: 'system', content: 'Responde estrictamente en JSON válido con la estructura solicitada.' },
        { role: 'user', content: prompt },
      ];

  const timeoutMs = settings.deepseek?.timeout || 90000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error de DeepSeek API: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Respuesta vacía de DeepSeek API');
    return content;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Timeout en análisis con DeepSeek');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
