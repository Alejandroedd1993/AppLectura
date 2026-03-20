
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

// dotenv ya cargado en server/index.js al arranque

let cachedOpenAI = null;
let cachedGemini = null;
const openAICompatibleClients = new Map();

function normalizeBaseURL(baseURL) {
  const value = String(baseURL || '').trim();
  return value ? value.replace(/\/+$/, '') : undefined;
}

export function getOpenAICompatibleClient({ apiKey, baseURL, timeout } = {}) {
  const resolvedApiKey = String(apiKey || '').trim();
  if (!resolvedApiKey) {
    throw new Error('OPENAI_COMPATIBLE_API_KEY no configurada en el entorno.');
  }

  const resolvedBaseURL = normalizeBaseURL(baseURL);
  const resolvedTimeout = Number.isFinite(timeout) ? timeout : undefined;
  const cacheKey = JSON.stringify({
    apiKey: resolvedApiKey,
    baseURL: resolvedBaseURL || null,
    timeout: resolvedTimeout ?? null,
  });

  if (openAICompatibleClients.has(cacheKey)) {
    return openAICompatibleClients.get(cacheKey);
  }

  const client = new OpenAI({
    apiKey: resolvedApiKey,
    ...(resolvedBaseURL ? { baseURL: resolvedBaseURL } : {}),
    ...(resolvedTimeout ? { timeout: resolvedTimeout } : {}),
  });

  openAICompatibleClients.set(cacheKey, client);
  return client;
}

export function getOpenAI() {
  if (cachedOpenAI) return cachedOpenAI;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('OPENAI_API_KEY no configurada en el entorno (Render Environment).');
  }

  const openaiTimeoutMs = Number.parseInt(process.env.OPENAI_TIMEOUT || '', 10);
  cachedOpenAI = getOpenAICompatibleClient({
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
