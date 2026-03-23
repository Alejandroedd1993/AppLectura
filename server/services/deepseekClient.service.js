import { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel } from '../config/providerDefaults.js';
import { parseAllowedModels, pickAllowedModel } from '../utils/modelUtils.js';

export function buildDeepSeekChatRequest({
  messages,
  requestedModel,
  temperature = 0.3,
  maxTokens,
  apiKey = process.env.DEEPSEEK_API_KEY,
} = {}) {
  const resolvedApiKey = String(apiKey || '').trim();
  if (!resolvedApiKey) {
    throw new Error('DEEPSEEK_API_KEY no configurada');
  }

  const fallbackModel = getDefaultDeepSeekModel();
  const allowedModels = parseAllowedModels(process.env.DEEPSEEK_ALLOWED_MODELS, fallbackModel);
  const selectedModel = pickAllowedModel({
    requested: requestedModel || fallbackModel,
    allowed: allowedModels,
    fallback: fallbackModel,
  });

  const payload = {
    model: selectedModel,
    messages,
    temperature,
  };

  if (Number.isFinite(maxTokens)) {
    payload.max_tokens = maxTokens;
  }

  return {
    url: `${getDefaultDeepSeekBaseUrl()}/chat/completions`,
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      'Content-Type': 'application/json',
    },
    payload,
    selectedModel,
  };
}

export function parseDeepSeekChatContent(data, {
  emptyMessage = 'Respuesta vacía de DeepSeek API',
  trim = false,
} = {}) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(emptyMessage);
  }

  return trim ? content.trim() : content;
}