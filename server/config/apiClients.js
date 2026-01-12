
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let cachedOpenAI = null;
let cachedGemini = null;

export function getOpenAI() {
  if (cachedOpenAI) return cachedOpenAI;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('OPENAI_API_KEY no configurada en el entorno (Render Environment).');
  }

  const openaiTimeoutMs = Number.parseInt(process.env.OPENAI_TIMEOUT || '', 10);
  cachedOpenAI = new OpenAI({
    apiKey: String(apiKey).trim(),
    timeout: Number.isFinite(openaiTimeoutMs) ? openaiTimeoutMs : 45000,
  });

  return cachedOpenAI;
}

export function getGemini() {
  if (cachedGemini) return cachedGemini;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) return null;
  cachedGemini = new GoogleGenerativeAI(String(apiKey).trim());
  return cachedGemini;
}
