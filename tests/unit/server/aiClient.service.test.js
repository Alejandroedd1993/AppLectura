import { createEvaluationAIClient, getEvaluationProviderConfig } from '../../../server/services/aiClient.service.js';

describe('aiClient.service', () => {
  const mockCreate = jest.fn();
  const mockGetOpenAICompatibleClient = jest.fn();

  beforeEach(() => {
    mockCreate.mockReset();
    mockGetOpenAICompatibleClient.mockReset();
    mockGetOpenAICompatibleClient.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));
  });

  test('usa DeepSeek como fallback de provider', () => {
    expect(getEvaluationProviderConfig()).toEqual(expect.objectContaining({
      provider: 'deepseek',
      model: 'deepseek-chat',
    }));
    expect(getEvaluationProviderConfig('desconocido')).toEqual(expect.objectContaining({
      provider: 'deepseek',
      model: 'deepseek-chat',
    }));
  });

  test('construye completion con json_schema para openai cuando llega schema', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
    });

    const aiClient = createEvaluationAIClient({ clientFactory: mockGetOpenAICompatibleClient });
    const content = await aiClient.complete({
      provider: 'openai',
      prompt: 'Evalua esto',
      max_tokens: 1500,
      response_format: {
        type: 'json_object',
        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    });

    expect(content).toBe('{"ok":true}');
    expect(mockGetOpenAICompatibleClient).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.openai.com/v1',
    }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      response_format: expect.objectContaining({
        type: 'json_schema',
      }),
    }));
  });
});