describe('providerDefaults', () => {
  const originalGeminiModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    if (typeof originalGeminiModel === 'undefined') {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = originalGeminiModel;
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
});