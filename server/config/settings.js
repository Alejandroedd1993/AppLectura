
import dotenv from 'dotenv';

dotenv.config();

export const settings = {
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeout: parseInt(process.env.OPENAI_TIMEOUT, 10) || 90000 // 90 segundos para textos largos
  },
  gemini: {
    model: process.env.GEMINI_MODEL || 'gemini-1.0-pro'
  },
  deepseek: {
    timeout: 90000 // 90 segundos para DeepSeek
  }
};
