describe('providerDefaults', () => {
  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalDeepseekModel = process.env.DEEPSEEK_MODEL;
  const originalDeepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;

  afterEach(() => {
    if (typeof originalGeminiModel === 'undefined') {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = originalGeminiModel;
    }

    if (typeof originalDeepseekModel === 'undefined') {
      delete process.env.DEEPSEEK_MODEL;
    } else {
      process.env.DEEPSEEK_MODEL = originalDeepseekModel;
    }

    if (typeof originalDeepseekBaseUrl === 'undefined') {
      delete process.env.DEEPSEEK_BASE_URL;
    } else {
      process.env.DEEPSEEK_BASE_URL = originalDeepseekBaseUrl;
    }

    jest.resetModules();
  });

  test('usa un default unico de Gemini cuando no hay variable configurada', async () => {
    delete process.env.GEMINI_MODEL;

    const { DEFAULT_GEMINI_MODEL, getDefaultGeminiModel } = await import('../../../server/config/providerDefaults.js');

    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-1.5-flash');
    expect(getDefaultGeminiModel()).toBe('gemini-1.5-flash');
  });

  test('respeta GEMINI_MODEL cuando viene configurado', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.0-flash';

    const { getDefaultGeminiModel } = await import('../../../server/config/providerDefaults.js');

    expect(getDefaultGeminiModel()).toBe('gemini-2.0-flash');
  });

  test('usa defaults unicos de DeepSeek cuando no hay variables configuradas', async () => {
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.DEEPSEEK_BASE_URL;

    const {
      DEFAULT_DEEPSEEK_BASE_URL,
      DEFAULT_DEEPSEEK_MODEL,
      getDefaultDeepSeekBaseUrl,
      getDefaultDeepSeekModel,
    } = await import('../../../server/config/providerDefaults.js');

    expect(DEFAULT_DEEPSEEK_MODEL).toBe('deepseek-chat');
    expect(DEFAULT_DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com/v1');
    expect(getDefaultDeepSeekModel()).toBe('deepseek-chat');
    expect(getDefaultDeepSeekBaseUrl()).toBe('https://api.deepseek.com/v1');
  });

  test('normaliza overrides configurados para DeepSeek', async () => {
    process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
    process.env.DEEPSEEK_BASE_URL = 'https://custom.deepseek.local/v1/';

    const { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel } = await import('../../../server/config/providerDefaults.js');

    expect(getDefaultDeepSeekModel()).toBe('deepseek-reasoner');
    expect(getDefaultDeepSeekBaseUrl()).toBe('https://custom.deepseek.local/v1');
  });
});