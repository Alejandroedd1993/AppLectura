
import { settings } from '../../config/settings.js';
import { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel } from '../../config/providerDefaults.js';
import { parseAllowedModels, pickAllowedModel } from '../../utils/modelUtils.js';

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

  const baseUrl = getDefaultDeepSeekBaseUrl();
  const url = `${baseUrl}/chat/completions`;

  const fallbackModel = getDefaultDeepSeekModel();
  const allowedModels = parseAllowedModels(process.env.DEEPSEEK_ALLOWED_MODELS, fallbackModel);
  const requestedModel = fallbackModel;
  const model = pickAllowedModel({
    requested: requestedModel,
    allowed: allowedModels,
    fallback: fallbackModel,
  });

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
