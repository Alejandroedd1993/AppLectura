import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Configuración de proveedores
const PROVIDERS = {
  openai: {
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },
  deepseek: {
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  gemini: {
    baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: process.env.GEMINI_API_KEY,
    defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
};

const DEFAULT_MAX_TOKENS = 1024;

export async function createChatCompletion(req, res) {
  try {
    const {
      provider = 'deepseek',
      model,
      messages,
      temperature = 0.7,
      max_tokens = 400,
      apiKey,
      stream = false,
    } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages es requerido' });
    }

    const cfg = PROVIDERS[provider];
    if (!cfg) return res.status(400).json({ error: `Proveedor no soportado: ${provider}` });

    const resolvedMaxTokens = Math.min(Number(max_tokens || DEFAULT_MAX_TOKENS), 2048);

    // Resolver API key efectiva
    let effectiveApiKey = apiKey || cfg.apiKey;
    if (provider === 'deepseek' && !effectiveApiKey) {
      effectiveApiKey = process.env.DEEPSEEK_API_KEY || 'demo';
    }
    if (!effectiveApiKey && (provider === 'openai' || provider === 'gemini')) {
      return res.status(400).json({ error: `Falta API key para proveedor ${provider}. Agrégala en la configuración (⚙️).` });
    }

    const client = new OpenAI({ apiKey: effectiveApiKey, baseURL: cfg.baseURL });
    const selectedModel = model || cfg.defaultModel;

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const streamResp = await client.chat.completions.create({
        model: selectedModel,
        messages,
        temperature,
        max_tokens: resolvedMaxTokens,
        stream: true,
      });

      for await (const part of streamResp) {
        const delta = part.choices?.[0]?.delta?.content || '';
        if (delta) res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        const reason = part.choices?.[0]?.finish_reason;
        if (reason) res.write(`event: done\ndata: ${JSON.stringify({ reason })}\n\n`);
      }
      return res.end();
    }

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages,
      temperature,
      max_tokens: resolvedMaxTokens,
      stream: false,
    });

    const choice = completion.choices?.[0];
    return res.json({
      content: choice?.message?.content || '',
      finish_reason: choice?.finish_reason || 'stop',
      usage: completion.usage,
    });
  } catch (error) {
    console.error('❌ Error en createChatCompletion:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Error interno generando completion' });
  }
}
