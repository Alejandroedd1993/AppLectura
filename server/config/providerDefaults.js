export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export function getDefaultGeminiModel() {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  return configured || DEFAULT_GEMINI_MODEL;
}

export function getDefaultDeepSeekModel() {
  const configured = String(process.env.DEEPSEEK_MODEL || '').trim();
  return configured || DEFAULT_DEEPSEEK_MODEL;
}

export function getDefaultDeepSeekBaseUrl() {
  const configured = String(process.env.DEEPSEEK_BASE_URL || '').trim().replace(/\/+$/, '');
  return configured || DEFAULT_DEEPSEEK_BASE_URL;
}