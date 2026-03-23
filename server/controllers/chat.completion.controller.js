import { getCachedResponse, setCachedResponse, getCacheStats } from '../utils/responseCache.js';
import { sendError } from '../utils/responseHelpers.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendValidationError } from '../utils/validationError.js';
import { parseBool } from '../utils/envUtils.js';
import { parseAllowedModels } from '../utils/modelUtils.js';
import { buildRequestId } from '../utils/requestContext.js';
import { getOpenAICompatibleClient } from '../config/apiClients.js';
import { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel, getDefaultGeminiModel } from '../config/providerDefaults.js';

// dotenv ya cargado en server/index.js al arranque

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
    const defaultGeminiModel = getDefaultGeminiModel();
    return {
      baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: defaultGeminiModel,
    };
  }
  if (resolved === 'deepseek') {
    return {
      baseURL: getDefaultDeepSeekBaseUrl(),
      apiKey: process.env.DEEPSEEK_API_KEY,
      defaultModel: getDefaultDeepSeekModel(),
    };
  }
  return null;
}

const DEFAULT_MAX_TOKENS = 4096;
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

// parseAllowedModels importado desde ../utils/modelUtils.js

function validateAndNormalizeMessages(messages) {
  const maxMessages = safeNumber(process.env.CHAT_MAX_MESSAGES, 50);
  // FIX #2: Raised from 10000 → 20000. Multiple frontend services (evaluación
  // integral, ensayo integrador, respuesta argumentativa, etc.) build user
  // prompts that embed text excerpts + student responses + prior AI feedback,
  // routinely reaching 10-15k chars.  The per-payload cap (maxTotalChars)
  // already guards against abuse; the per-message cap only needs to prevent
  // a single enormous field, not legitimate multi-field prompts.
  const maxMessageChars = safeNumber(process.env.CHAT_MAX_MESSAGE_CHARS, 20000);
  // FIX #1b: System messages carry the pedagogy prompt (>12k chars).
  // They need a higher cap than user/assistant messages.
  const maxSystemChars = safeNumber(process.env.CHAT_MAX_SYSTEM_CHARS, 30000);
  const maxTotalChars = safeNumber(process.env.CHAT_MAX_TOTAL_CHARS, 50000);

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ok: false,
      error: 'messages es requerido',
      mensaje: 'Debes enviar al menos un mensaje en la conversacion.',
      codigo: 'CHAT_MESSAGES_REQUIRED'
    };
  }
  if (messages.length > maxMessages) {
    return {
      ok: false,
      error: `Demasiados mensajes (max ${maxMessages})`,
      mensaje: `La conversacion excede el maximo permitido de ${maxMessages} mensajes.`,
      codigo: 'CHAT_MESSAGES_LIMIT_EXCEEDED'
    };
  }

  const normalized = [];
  let totalChars = 0;

  for (const item of messages) {
    const role = String(item?.role || '').trim().toLowerCase();
    const content = typeof item?.content === 'string' ? item.content : '';

    if (!ALLOWED_CHAT_ROLES.has(role)) {
      return {
        ok: false,
        error: `role invalido: ${item?.role ?? ''}`,
        mensaje: 'Cada mensaje debe usar un role permitido.',
        codigo: 'CHAT_INVALID_MESSAGE_ROLE'
      };
    }
    if (!content.trim()) {
      return {
        ok: false,
        error: 'content vacio no permitido',
        mensaje: 'Cada mensaje debe incluir contenido no vacio.',
        codigo: 'CHAT_EMPTY_MESSAGE_CONTENT'
      };
    }
    const effectiveMaxChars = role === 'system' ? maxSystemChars : maxMessageChars;
    if (content.length > effectiveMaxChars) {
      return {
        ok: false,
        error: `Mensaje demasiado largo (max ${effectiveMaxChars} chars)`,
        mensaje: 'Uno de los mensajes supera el tamano maximo permitido.',
        codigo: 'CHAT_MESSAGE_TOO_LONG'
      };
    }

    totalChars += content.length;
    if (totalChars > maxTotalChars) {
      return {
        ok: false,
        error: `Payload demasiado grande (max ${maxTotalChars} chars)`,
        mensaje: 'La suma total del contenido enviado excede el limite permitido.',
        codigo: 'CHAT_PAYLOAD_TOO_LARGE'
      };
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
      return sendValidationError(res, {
        error,
        mensaje: context.mensaje || 'Revisa los datos enviados antes de reintentar.',
        codigo: context.codigo || 'INVALID_CHAT_REQUEST',
        ...(context.allowed_models ? { allowed_models: context.allowed_models } : {}),
        requestId
      });
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
        mensaje: validatedMessages.mensaje,
        codigo: validatedMessages.codigo,
        provider,
        model: model || null,
        ...summarizeMessages(messages)
      });
    }
    const safeMessages = validatedMessages.messages;

    const cfg = getProviderConfig(provider);
    if (!cfg) {
      return reject400(`Proveedor no soportado: ${provider}`, {
        mensaje: 'El proveedor solicitado no es valido para chat completion.',
        codigo: 'UNSUPPORTED_CHAT_PROVIDER',
        provider,
        model: model || null,
        ...summarizeMessages(safeMessages)
      });
    }

    const configuredCap = safeNumber(process.env.CHAT_MAX_TOKENS_CAP, 8192);
    const resolvedMaxTokens = Math.min(Number(max_tokens || DEFAULT_MAX_TOKENS), configuredCap);
    const resolvedTemperature = Math.max(0, Math.min(2, safeNumber(temperature, 0.7)));
    const resolvedStream = stream === true;

    // Seguridad: usar SIEMPRE API key del servidor (Render), nunca desde cliente
    if (req.body && req.body.apiKey) {
      console.warn('⚠️ [chat/completion] apiKey recibida desde cliente e ignorada por política de seguridad');
    }
    if (!cfg.apiKey) {
      return sendError(res, 503, {
        error: `Proveedor ${provider} no configurado en servidor`,
        mensaje: 'El proveedor de IA solicitado no esta configurado en el servidor.',
        codigo: 'CHAT_PROVIDER_NOT_CONFIGURED',
        requestId
      });
    }

    const client = getOpenAICompatibleClient({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const selectedModel = model || cfg.defaultModel;

    if (provider === 'openai') {
      const allowed = parseAllowedModels(process.env.OPENAI_ALLOWED_MODELS, 'gpt-4o-mini');
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo OpenAI no permitido: ${selectedModel}`, provider, selectedModel });
        return sendValidationError(res, {
          error: `Modelo OpenAI no permitido: ${selectedModel}`,
          mensaje: 'El modelo solicitado no esta habilitado para OpenAI en este servidor.',
          codigo: 'OPENAI_MODEL_NOT_ALLOWED',
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    // Hardening: evitar que un cliente fuerce modelos no previstos (p.ej. deepseek-reasoner)
    if (provider === 'deepseek') {
      const allowed = parseAllowedModels(process.env.DEEPSEEK_ALLOWED_MODELS, getDefaultDeepSeekModel());
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo DeepSeek no permitido: ${selectedModel}`, provider, selectedModel });
        return sendValidationError(res, {
          error: `Modelo DeepSeek no permitido: ${selectedModel}`,
          mensaje: 'El modelo solicitado no esta habilitado para DeepSeek en este servidor.',
          codigo: 'DEEPSEEK_MODEL_NOT_ALLOWED',
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    if (provider === 'gemini') {
      const allowed = parseAllowedModels(process.env.GEMINI_ALLOWED_MODELS, getDefaultGeminiModel());
      if (!allowed.has(selectedModel)) {
        console.warn('⚠️ [chat/completion] 400', { requestId, error: `Modelo Gemini no permitido: ${selectedModel}`, provider, selectedModel });
        return sendValidationError(res, {
          error: `Modelo Gemini no permitido: ${selectedModel}`,
          mensaje: 'El modelo solicitado no esta habilitado para Gemini en este servidor.',
          codigo: 'GEMINI_MODEL_NOT_ALLOWED',
          allowed_models: Array.from(allowed),
          requestId
        });
      }
    }

    const logUsage = parseBool(process.env.CHAT_USAGE_LOG);
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
        res.write(`data: ${JSON.stringify({ reason: 'stop', cached: true, done: true })}\n\n`);
        return res.end();
      }
      return sendSuccess(res, {
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

        console.log('📊 [chat/completion] stream start', { ...requestTag, resolvedMaxTokens });

        let lastFinishReason = null;
        let lastPingTime = Date.now();
        const KEEPALIVE_INTERVAL_MS = 10000; // Ping cada 10s para evitar que proxies corten SSE

        for await (const part of streamResp) {
          if (clientClosed || res.writableEnded || res.destroyed) break;

          // SSE keepalive: enviar comentario periódico para evitar timeouts de proxy
          const now = Date.now();
          if (now - lastPingTime > KEEPALIVE_INTERVAL_MS) {
            lastPingTime = now;
            try { res.write(': keepalive\n\n'); } catch { clientClosed = true; break; }
          }

          const delta = part.choices?.[0]?.delta?.content || '';
          if (delta) {
            streamedContent += delta;
            lastPingTime = Date.now(); // Reset ping timer on real data
            try {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            } catch {
              clientClosed = true;
              break;
            }
          }
          const reason = part.choices?.[0]?.finish_reason;
          if (reason) {
            lastFinishReason = reason;
            try {
              res.write(`data: ${JSON.stringify({ reason })}\n\n`);
            } catch {
              clientClosed = true;
              break;
            }
          }
        }

        // Garantizar que SIEMPRE se envíe un evento de fin con la razón real.
        // Si el proveedor no envió finish_reason explícito, reportar 'unknown'.
        if (!clientClosed && !res.writableEnded && !res.destroyed) {
          const finalReason = lastFinishReason || 'unknown';
          try {
            res.write(`data: ${JSON.stringify({ done: true, reason: finalReason })}\n\n`);
          } catch { /* noop */ }
        }

        console.log('📊 [chat/completion] stream end', {
          ...requestTag,
          finish_reason: lastFinishReason || 'none',
          streamedChars: streamedContent.length,
          clientClosed,
          durationMs: Date.now() - startTime
        });

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
    return sendSuccess(res, {
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
    return sendError(res, status, {
      error: 'Error interno generando completion',
      mensaje: 'No se pudo completar la solicitud de chat en este momento.',
      codigo: 'CHAT_COMPLETION_ERROR',
      requestId
    });
  }
}

export function getChatCacheStats(req, res) {
  try {
    const stats = getCacheStats();
    return sendSuccess(res, stats);
  } catch (error) {
    console.error('❌ Error obteniendo cache stats:', error);
    return sendError(res, 500, {
      error: 'Error obteniendo estadisticas',
      mensaje: 'No se pudieron obtener las estadisticas del cache de chat.',
      codigo: 'CHAT_CACHE_STATS_ERROR'
    });
  }
}

