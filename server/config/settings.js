
// dotenv ya cargado en server/index.js al arranque

import { getDefaultGeminiModel } from './providerDefaults.js';

export const settings = {
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeout: parseInt(process.env.OPENAI_TIMEOUT, 10) || 90000 // 90 segundos para textos largos
  },
  gemini: {
    model: getDefaultGeminiModel()
  },
  deepseek: {
    timeout: 90000 // 90 segundos para DeepSeek
  }
};
