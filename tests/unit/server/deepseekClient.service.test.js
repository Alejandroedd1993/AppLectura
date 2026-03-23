describe('deepseekClient.service', () => {
  const originalDeepseekApiKey = process.env.DEEPSEEK_API_KEY;
  const originalDeepseekModel = process.env.DEEPSEEK_MODEL;
  const originalDeepseekAllowedModels = process.env.DEEPSEEK_ALLOWED_MODELS;
  const originalDeepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;

  afterEach(() => {
    if (typeof originalDeepseekApiKey === 'undefined') {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalDeepseekApiKey;
    }

    if (typeof originalDeepseekModel === 'undefined') {
      delete process.env.DEEPSEEK_MODEL;
    } else {
      process.env.DEEPSEEK_MODEL = originalDeepseekModel;
    }

    if (typeof originalDeepseekAllowedModels === 'undefined') {
      delete process.env.DEEPSEEK_ALLOWED_MODELS;
    } else {
      process.env.DEEPSEEK_ALLOWED_MODELS = originalDeepseekAllowedModels;
    }

    if (typeof originalDeepseekBaseUrl === 'undefined') {
      delete process.env.DEEPSEEK_BASE_URL;
    } else {
      process.env.DEEPSEEK_BASE_URL = originalDeepseekBaseUrl;
    }

    jest.resetModules();
  });

  test('construye request compartido con defaults activos de DeepSeek', async () => {
    process.env.DEEPSEEK_API_KEY = 'secret-key';
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.DEEPSEEK_ALLOWED_MODELS;
    delete process.env.DEEPSEEK_BASE_URL;

    const { buildDeepSeekChatRequest } = await import('../../../server/services/deepseekClient.service.js');

    const request = buildDeepSeekChatRequest({
      messages: [{ role: 'user', content: 'hola' }],
      temperature: 0.2,
      maxTokens: 1200,
    });

    expect(request.url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(request.headers).toEqual({
      Authorization: 'Bearer secret-key',
      'Content-Type': 'application/json',
    });
    expect(request.selectedModel).toBe('deepseek-chat');
    expect(request.payload).toEqual({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hola' }],
      temperature: 0.2,
      max_tokens: 1200,
    });
  });

  test('ajusta el modelo solicitado a la allowlist de DeepSeek', async () => {
    process.env.DEEPSEEK_API_KEY = 'secret-key';
    process.env.DEEPSEEK_ALLOWED_MODELS = 'deepseek-chat';

    const { buildDeepSeekChatRequest } = await import('../../../server/services/deepseekClient.service.js');

    const request = buildDeepSeekChatRequest({
      messages: [{ role: 'user', content: 'hola' }],
      requestedModel: 'deepseek-reasoner',
    });

    expect(request.selectedModel).toBe('deepseek-chat');
    expect(request.payload.model).toBe('deepseek-chat');
  });

  test('extrae contenido del chat DeepSeek y falla si falta', async () => {
    const { parseDeepSeekChatContent } = await import('../../../server/services/deepseekClient.service.js');

    expect(parseDeepSeekChatContent({
      choices: [{ message: { content: '  respuesta  ' } }]
    }, { trim: true })).toBe('respuesta');

    expect(() => parseDeepSeekChatContent({ choices: [] })).toThrow('Respuesta vacía de DeepSeek API');
  });
});