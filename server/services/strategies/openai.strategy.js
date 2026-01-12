
import { getOpenAI } from '../../config/apiClients.js';
import { settings } from '../../config/settings.js';

/**
 * Estrategia de análisis de texto utilizando la API de OpenAI.
 * @param {string} prompt - El prompt para enviar a la API.
 * @param {{ system?: string, max_tokens?: number, temperature?: number }} [options] - Opciones opcionales.
 * @returns {Promise<string>} El contenido del mensaje de respuesta de la API.
 * @throws {Error} Si la solicitud a la API falla.
 */
export async function openaiStrategy(prompt, options = {}) {
  const openai = getOpenAI();

  const parseAllowedModelsCsv = (csv) => {
    if (typeof csv !== 'string') return [];
    return csv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const allowedModels = (() => {
    const fromEnv = parseAllowedModelsCsv(process.env.OPENAI_ALLOWED_MODELS);
    return fromEnv.length ? fromEnv : ['gpt-4o-mini'];
  })();

  const requestedModel = settings.openai.model;
  const model = allowedModels.includes(requestedModel) ? requestedModel : allowedModels[0];

  const capFromEnv = Number.parseInt(process.env.ANALYSIS_OPENAI_MAX_TOKENS_CAP || '', 10);
  const maxTokensCap = Number.isFinite(capFromEnv)
    ? Math.max(1, Math.min(capFromEnv, 4096))
    : 2048;

  const overrideMaxTokens = Number.parseInt(String(options?.max_tokens ?? ''), 10);
  const max_tokens = Number.isFinite(overrideMaxTokens)
    ? Math.max(1, Math.min(overrideMaxTokens, maxTokensCap))
    : maxTokensCap;

  const temperature = typeof options?.temperature === 'number' ? options.temperature : 0.7;

  const messages = options?.system
    ? [{ role: 'system', content: String(options.system) }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const completion = await openai.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" }, // Clave para asegurar la respuesta en JSON
    temperature,
    max_tokens,
  });
  return completion.choices[0].message.content;
}
