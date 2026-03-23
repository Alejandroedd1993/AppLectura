
import { settings } from '../../config/settings.js';
import { buildDeepSeekChatRequest, parseDeepSeekChatContent } from '../deepseekClient.service.js';

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

  const deepseekRequest = buildDeepSeekChatRequest({
    messages,
    temperature,
    maxTokens: max_tokens,
  });

  const timeoutMs = settings.deepseek?.timeout || 90000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(deepseekRequest.url, {
      method: 'POST',
      headers: deepseekRequest.headers,
      body: JSON.stringify(deepseekRequest.payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error de DeepSeek API: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json();
    return parseDeepSeekChatContent(data);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Timeout en análisis con DeepSeek');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
