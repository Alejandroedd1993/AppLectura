export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export function getDefaultGeminiModel() {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  return configured || DEFAULT_GEMINI_MODEL;
}