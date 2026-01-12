import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function getProviderConfig(provider) {
  const resolved = String(provider || '').trim();
  if (resolved === 'openai') {
    return {
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  if (resolved === 'gemini') {
    return {
      baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }
  if (resolved === 'deepseek') {
    return {
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
      defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
  }
  return null;
}

const DEFAULT_MAX_TOKENS = 1200;

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function summarizeMessages(messages) {
  if (!Array.isArray(messages)) return { count: 0, totalChars: 0, maxMessageChars: 0 };
  let totalChars = 0;
  let maxMessageChars = 0;
  for (const m of messages) {
    const c = typeof m?.content === 'string' ? m.content : '';
    totalChars += c.length;
    if (c.length > maxMessageChars) maxMessageChars = c.length;
  }
  return { count: messages.length, totalChars, maxMessageChars };
}

function parseAllowedModels(envValue, fallbackCsv) {
  const raw = String(envValue || '').trim();
  const csv = raw || fallbackCsv;
  return new Set(
    String(csv)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

export async function createChatCompletion(req, res) {
  try {
    const {
      provider = 'deepseek',
      model,
      messages,
      temperature = 0.7,
      max_tokens = 1200,
      apiKey,
      stream = false,
    } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages es requerido' });
    }

    const cfg = getProviderConfig(provider);
    if (!cfg) return res.status(400).json({ error: `Proveedor no soportado: ${provider}` });

    const configuredCap = safeNumber(process.env.CHAT_MAX_TOKENS_CAP, 4096);
    const resolvedMaxTokens = Math.min(Number(max_tokens || DEFAULT_MAX_TOKENS), configuredCap);

    // Resolver API key efectiva (SIN fallbacks inseguros)
    const effectiveApiKey = apiKey || cfg.apiKey;
    if (!effectiveApiKey) {
      return res.status(400).json({
        error: `Falta API key para proveedor ${provider}. Configúrala en el servidor (.env) o envíala desde el cliente.`
      });
    }

    const client = new OpenAI({ apiKey: effectiveApiKey, baseURL: cfg.baseURL });
    const selectedModel = model || cfg.defaultModel;

    if (provider === 'openai') {
      const allowed = parseAllowedModels(process.env.OPENAI_ALLOWED_MODELS, 'gpt-4o-mini');
      if (!allowed.has(selectedModel)) {
        return res.status(400).json({
          error: `Modelo OpenAI no permitido: ${selectedModel}`,
          allowed_models: Array.from(allowed)
        });
      }
    }

    // Hardening: evitar que un cliente fuerce modelos no previstos (p.ej. deepseek-reasoner)
    if (provider === 'deepseek') {
      const allowed = parseAllowedModels(process.env.DEEPSEEK_ALLOWED_MODELS, 'deepseek-chat');
      if (!allowed.has(selectedModel)) {
        return res.status(400).json({
          error: `Modelo DeepSeek no permitido: ${selectedModel}`,
          allowed_models: Array.from(allowed)
        });
      }
    }

    const logUsage = String(process.env.CHAT_USAGE_LOG || '').trim().toLowerCase() === 'true';
    const messageStats = summarizeMessages(messages);
    const requestTag = {
      provider,
      model: selectedModel,
      stream: !!stream,
      temperature,
      max_tokens: resolvedMaxTokens,
      msg_count: messageStats.count,
      msg_total_chars: messageStats.totalChars,
      msg_max_chars: messageStats.maxMessageChars,
      ip: req.ip,
      ua: req.get('user-agent') || ''
    };

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

      if (logUsage) {
        console.log('📊 [chat/completion] stream start', requestTag);
      }

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

    if (logUsage) {
      console.log('📊 [chat/completion] usage', {
        ...requestTag,
        usage: completion.usage || null
      });
    }

    const choice = completion.choices?.[0];
    return res.json({
      provider,
      model: selectedModel,
      max_tokens: resolvedMaxTokens,
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
