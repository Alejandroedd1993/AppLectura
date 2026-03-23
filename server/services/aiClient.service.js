import { getOpenAICompatibleClient } from '../config/apiClients.js';
import { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel } from '../config/providerDefaults.js';

export function getEvaluationProviderConfig(provider) {
  const resolvedProvider = String(provider || '').trim().toLowerCase();

  if (resolvedProvider === 'openai') {
    return {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    };
  }

  return {
    provider: 'deepseek',
    baseURL: getDefaultDeepSeekBaseUrl(),
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: getDefaultDeepSeekModel(),
  };
}

function buildResponseFormat(responseFormat, provider) {
  if (responseFormat?.type !== 'json_object') {
    return undefined;
  }

  if (responseFormat.schema && provider === 'openai') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'evaluation',
        schema: responseFormat.schema,
        strict: false,
      },
    };
  }

  return { type: 'json_object' };
}

export function createEvaluationAIClient({ clientFactory = getOpenAICompatibleClient } = {}) {
  return {
    async complete({ provider = 'deepseek', prompt, response_format, max_tokens = 2500 }) {
      const selectedConfig = getEvaluationProviderConfig(provider);
      const client = clientFactory({
        baseURL: selectedConfig.baseURL,
        apiKey: selectedConfig.apiKey,
      });
      const resolvedFormat = buildResponseFormat(response_format, selectedConfig.provider);

      try {
        console.log(`🤖 [aiClient] Usando ${selectedConfig.provider} con modelo ${selectedConfig.model}, max_tokens: ${max_tokens}`);

        const completion = await client.chat.completions.create({
          model: selectedConfig.model,
          messages: [
            { role: 'system', content: 'Eres un evaluador experto en literacidad crítica. Siempre respondes en español.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens,
          ...(resolvedFormat ? { response_format: resolvedFormat } : {}),
        });

        const content = completion.choices?.[0]?.message?.content;
        console.log(`✅ [aiClient] Respuesta recibida: ${content?.length || 0} caracteres`);

        return content;
      } catch (error) {
        console.error(`❌ [aiClient] Error con ${selectedConfig.provider}:`, error.message);
        throw error;
      }
    },
  };
}