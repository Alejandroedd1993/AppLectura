import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCachedResponse, setCachedResponse, getCacheStats } from '../utils/responseCache.js';

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
const ALLOWED_CHAT_ROLES = new Set(['system', 'user', 'assistant']);

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

function buildRequestId(req) {
  const headerId = String(req.get('x-request-id') || req.get('x-correlation-id') || '').trim();
  if (headerId) return headerId;
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

function validateAndNormalizeMessages(messages) {
  const maxMessages = safeNumber(process.env.CHAT_MAX_MESSAGES, 50);
  const maxMessageChars = safeNumber(process.env.CHAT_MAX_MESSAGE_CHARS, 10000);
  const maxTotalChars = safeNumber(process.env.CHAT_MAX_TOTAL_CHARS, 50000);

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages es requerido' };
  }
  if (messages.length > maxMessages) {
    return { ok: false, error: `Demasiados mensajes (máx ${maxMessages})` };
  }

  const normalized = [];
  let totalChars = 0;

  for (const item of messages) {
    const role = String(item?.role || '').trim().toLowerCase();
    const content = typeof item?.content === 'string' ? item.content : '';

    if (!ALLOWED_CHAT_ROLES.has(role)) {
      return { ok: false, error: `role inválido: ${item?.role ?? ''}` };
    }
    if (!content.trim()) {
      return { ok: false, error: 'content vacío no permitido' };
    }
    if (content.length > maxMessageChars) {
      return { ok: false, error: `Mensaje demasiado largo (máx ${maxMessageChars} chars)` };
    }

    totalChars += content.length;
    if (totalChars > maxTotalChars) {
      return { ok: false, error: `Payload demasiado grande (máx ${maxTotalChars} chars)` };
    }

    normalized.push({ role, content });
  }

  return { ok: true, messages: normalized };
}

export async function createChatCompletion(req, res) {
  try {
    const requestId = buildRequestId(req);
    res.setHeader('x-request-id', requestId);

    const reject400 = (error, context = {}) => {
      console.warn('⚠️ [chat/completion] 400', { requestId, error, ...context });
      return res.status(400).json({ error, requestId });
    };

    const {
      provider = 'deepseek',
      model,
      messages,
      temperature = 0.7,
      max_tokens = 1200,
      stream = false,
      response_format,
    } = req.body || {};

    const validatedMessages = validateAndNormalizeMessages(messages);
    if (!validatedMessages.ok) {
      return reject400(validatedMessages.error, {
        provider,
        model: model || null,
        ...summarizeMessages(messages)
      });
    }
    const safeMessages = validatedMessages.messages;

    const cfg = getProviderConfig(provider);
    if (!cfg) {
      return reject400(`Proveedor no soportado: ${provider}`, {
        provider,
        model: model || null,
        ...summarizeMessages(safeMessages)
      });
    }

    const configuredCap = safeNumber(process.env.CHAT_MAX_TOKENS_CAP, 4096);
    const resolvedMaxTokens = Math.min(Number(max_tokens || DEFAULT_MAX_TOKENS), configuredCap);
    const resolvedTemperature = Math.max(0, Math.min(2, safeNumber(temperature, 0.7)));
    const resolvedStream = stream === true;

    // Seguridad: usar SIEMPRE API key del servidor (Render), nunca desde cliente
    if (req.body && req.body.apiKey) {
      console.warn('⚠️ [chat/completion] apiKey recibida desde cliente e ignorada por política de seguridad');
    }
    if (!cfg.apiKey) {
      return res.status(503).json({
        error: `Proveedor ${provider} no configurado en servidor`,
        requestId
      });
    }

    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const selectedModel = model || cfg.defaultModel;

    if (provider === 'openai') {
      const allowed = parseAllowedModels(process.env.OPENAI_ALLOWED_MODELS, 'gpt-4o-mini');
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo OpenAI no permitido: ${selectedModel}`, provider, selectedModel });
        return res.status(400).json({
          error: `Modelo OpenAI no permitido: ${selectedModel}`,
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    // Hardening: evitar que un cliente fuerce modelos no previstos (p.ej. deepseek-reasoner)
    if (provider === 'deepseek') {
      const allowed = parseAllowedModels(process.env.DEEPSEEK_ALLOWED_MODELS, 'deepseek-chat');
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo DeepSeek no permitido: ${selectedModel}`, provider, selectedModel });
        return res.status(400).json({
          error: `Modelo DeepSeek no permitido: ${selectedModel}`,
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    if (provider === 'gemini') {
      const allowed = parseAllowedModels(process.env.GEMINI_ALLOWED_MODELS, 'gemini-1.5-flash');
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo Gemini no permitido: ${selectedModel}`, provider, selectedModel });
        return res.status(400).json({
          error: `Modelo Gemini no permitido: ${selectedModel}`,
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    const logUsage = String(process.env.CHAT_USAGE_LOG || '').trim().toLowerCase() === 'true';
    const messageStats = summarizeMessages(safeMessages);
    const requestTag = {
      provider,
      model: selectedModel,
      stream: resolvedStream,
      temperature: resolvedTemperature,
      max_tokens: resolvedMaxTokens,
      msg_count: messageStats.count,
      msg_total_chars: messageStats.totalChars,
      msg_max_chars: messageStats.maxMessageChars,
      ip: req.ip,
      ua: req.get('user-agent') || ''
    };

    // 🚀 CACHE CHECK: buscar respuesta cacheada antes de llamar a la API
    const cachedContent = getCachedResponse(safeMessages, resolvedTemperature, provider, selectedModel);
    if (cachedContent) {
      if (logUsage) {
        console.log('⚡ [chat/completion] CACHE HIT', { ...requestTag, cached: true, stream: resolvedStream });
      }
      if (resolvedStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const chunkSize = 50;
        for (let i = 0; i < cachedContent.length; i += chunkSize) {
          const chunk = cachedContent.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ content: chunk, cached: true })}\n\n`);
        }
        res.write(`event: done\ndata: ${JSON.stringify({ reason: 'stop', cached: true })}\n\n`);
        return res.end();
      }
      return res.json({
        provider,
        model: selectedModel,
        max_tokens: resolvedMaxTokens,
        content: cachedContent,
        finish_reason: 'stop',
        cached: true,
        usage: { cached: true }
      });
    }

    const startTime = Date.now();

    if (resolvedStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      let clientClosed = false;
      const onClientClose = () => { clientClosed = true; };
      req.on('close', onClientClose);

      let streamedContent = '';
      try {
        const streamResp = await client.chat.completions.create({
          model: selectedModel,
          messages: safeMessages,
          temperature: resolvedTemperature,
          max_tokens: resolvedMaxTokens,
          stream: true,
        });

        if (logUsage) {
          console.log('📊 [chat/completion] stream start', requestTag);
        }

        for await (const part of streamResp) {
          if (clientClosed || res.writableEnded || res.destroyed) break;

          const delta = part.choices?.[0]?.delta?.content || '';
          if (delta) {
            streamedContent += delta;
            try {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            } catch {
              clientClosed = true;
              break;
            }
          }
          const reason = part.choices?.[0]?.finish_reason;
          if (reason) {
            try {
              res.write(`event: done\ndata: ${JSON.stringify({ reason })}\n\n`);
            } catch {
              clientClosed = true;
              break;
            }
          }
        }

        const latencyMs = Date.now() - startTime;
        if (!clientClosed && streamedContent.length > 10) {
          setCachedResponse(safeMessages, resolvedTemperature, streamedContent, latencyMs, provider, selectedModel);
        }

        if (!res.writableEnded && !res.destroyed) {
          return res.end();
        }
        return;
      } finally {
        req.off('close', onClientClose);
      }
    }

    const completion = await client.chat.completions.create({
      model: selectedModel,
      messages: safeMessages,
      temperature: resolvedTemperature,
      max_tokens: resolvedMaxTokens,
      stream: false,
      ...(response_format?.type === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
    });

    const latencyMs = Date.now() - startTime;

    if (logUsage) {
      console.log('📊 [chat/completion] usage', {
        ...requestTag,
        latencyMs,
        usage: completion.usage || null
      });
    }

    const choice = completion.choices?.[0];
    const content = choice?.message?.content || '';

    if (content.length > 10) {
      setCachedResponse(safeMessages, resolvedTemperature, content, latencyMs, provider, selectedModel);
    }
    return res.json({
      provider,
      model: selectedModel,
      max_tokens: resolvedMaxTokens,
      content,
      finish_reason: choice?.finish_reason || 'stop',
      usage: completion.usage,
      latencyMs
    });
  } catch (error) {
    const requestId = String(res.getHeader('x-request-id') || '').trim() || 'unknown';
    console.error('❌ Error en createChatCompletion:', { requestId, error });
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Error interno generando completion',
      requestId
    });
  }
}

export function getChatCacheStats(req, res) {
  try {
    const stats = getCacheStats();
    return res.json(stats);
  } catch (error) {
    console.error('❌ Error obteniendo cache stats:', error);
    return res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
}

