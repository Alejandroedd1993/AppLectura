import { useRef, useCallback, useEffect } from 'react';

function extractKeywords(text, max = 5) {
  try {
    const stop = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del', 'de', 'en', 'con', 'por', 'para', 'que', 'es', 'son', 'se', 'su', 'sus', 'como', 'más', 'muy', 'todo', 'toda', 'todos', 'todas', 'este', 'esta', 'estos', 'estas', 'eso', 'esa', 'ese', 'aqui', 'aquí', 'alli', 'allí', 'hacia', 'desde', 'entre', 'sobre', 'tambien', 'también', 'pero', 'aunque', 'sin', 'embargo', 'no', 'si', 'sí', 'ya', 'porque', 'cuando', 'donde', 'dónde', 'quien', 'quién', 'cual', 'cuál', 'cuales', 'cuáles', 'cuanto', 'cuánto', 'cuantos', 'cuántos', 'pues', 'entonces', 'ademas', 'además', 'igual', 'mismo', 'misma', 'mismas', 'mismos', 'cada', 'otros', 'otras', 'otro', 'otra', 'ser', 'estar', 'haber', 'tener', 'hacer', 'poder', 'decir', 'ver', 'ir'
    ]);
    const raw = (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z\sáéíóúñ]/gi, ' ');
    const tokens = raw.split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
    const freq = {};
    for (const token of tokens) freq[token] = (freq[token] || 0) + 1;
    const entries = Object.entries(freq).filter(([, c]) => c >= (tokens.length > 20 ? 2 : 1));
    return entries.sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w);
  } catch {
    return [];
  }
}

function hasQuestionNearEnd(text) {
  const normalized = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return false;
  const tail = normalized.slice(-280);
  return /\?\s*['"”’)\]»….!,:;\s]*$/u.test(tail) || /¿[^?]{6,}\?/u.test(tail);
}

/**
 * Genera preguntas de seguimiento heurísticas para fomentar metacognición.
 * Heurística inicial minimalista (sin llamada a modelo):
 *  - Ignorar respuestas cortas (<150 chars)
 *  - Detectar contraste ("sin embargo|pero|no obstante") -> preguntar por causas
 *  - Detectar enumeraciones -> pedir relación/priorización
 *  - Extraer términos capitalizados para relaciones conceptuales
 */
function generateFollowUp(responseText, context = {}) {
  if (!responseText || responseText.length < 150) return null;
  const convoContext = `${responseText}\n${context?.lastUserMessage || ''}\n${context?.fragment || ''}`;
  const keywords = extractKeywords(convoContext, 4);
  const topic = keywords[0] || '';

  // Contexto literario simple: evita preguntas genéricas de "implicaciones prácticas"
  const literary = /(poema|poético|verso|estrofa|rima|metáfora|símbolo|imaginería|voz lírica)/i.test(responseText);
  if (literary) {
    const meta = /(metáfora|símbolo|imagen|ritmo|rima)/i.test(responseText) ? 'metáforas o símbolos' : 'imágenes y recursos expresivos';
    return `En clave literaria, ¿qué ${meta} te llamaron más la atención y cómo conectan con la idea central del fragmento?`;
  }
  const contrast = /(sin embargo|pero|no obstante)/i.test(responseText);
  if (contrast) return '¿Qué factores podrían explicar el contraste que se menciona?';

  const enumeracion = /(\b1\b|•|-\s)/.test(responseText) || /\b(primero|segundo|tercero)\b/i.test(responseText);
  if (enumeracion) {
    if (topic) return `Entre los puntos mencionados sobre ${topic}, ¿cuál consideras más relevante y por qué?`;
    return 'Entre los puntos mencionados, ¿cuál consideras más relevante y por qué?';
  }

  // Extraer posibles conceptos (evitar verbos/adjetivos comunes y palabras banales)
  const rawCaps = responseText.match(/\b[A-ZÁÉÍÓÚ][a-záéíóú]{3,}\b/g) || [];
  const stoplist = new Set(['El','La','Los','Las','Un','Una','Y','De','Del','Con','Para','Como','Esto','Esa','Ese','Esta','Así','Puede','Podría','Muestra','Refleja','Se','Es','Fue']);
  const conceptos = [...new Set(rawCaps.filter(w => !stoplist.has(w)))];
  if (conceptos.length >= 2) {
    const a = conceptos[0];
    const b = conceptos.find(x => x !== a) || conceptos[0];
    if (a && b && a !== b) {
      return `¿Cómo se relacionan ${a} y ${b} en el contexto del fragmento?`;
    }
  }
  // H12 FIX: Fallback contextualizado en lugar de pregunta genérica
  if (topic) return `¿Qué parte de esta explicación sobre ${topic} te resulta más relevante para entender el texto?`;
  return '¿Qué parte de esta explicación te resulta más relevante para entender el texto?';
}

/**
 * Hook que se integra con TutorCore vía prop onAssistantMessage.
 * Devuelve callback para pasar como onAssistantMessage y autoinyectar follow-up.
 */
// P3 FIX: Constantes fuera del hook para evitar recreación
const STOP_PREFIX = '🤔 Pregunta para profundizar:';
const COOLDOWN_MS = 30000; // máx 1 follow-up cada 30s

export default function useFollowUpQuestion(options = {}) {
  const { enabled = true, injectDelayMs = 250 } = options;
  const lastMessageRef = useRef(0);
  const lastInjectedAtRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // P3 FIX: Memoizar handler para estabilizar onAssistantMessage pasado a TutorCore
  const handler = useCallback((assistantMsg, api) => {
    if (!enabled || !assistantMsg || assistantMsg.role !== 'assistant') return;
    const content = assistantMsg.content || '';
    // No reaccionar a nuestros propios follow-ups ni a respuestas que ya cierran
    // con pregunta natural del tutor (evita duplicados como "Tu turno").
    if (content.startsWith(STOP_PREFIX) || hasQuestionNearEnd(content)) return;
    // Evitar generar follow-up para mensajes de error
    if (/⚠️/u.test(content)) return;
    // Evitar spam si llegan múltiples en ráfaga (stream futuro)
    const now = Date.now();
    if (now - lastMessageRef.current < 150) return;
    lastMessageRef.current = now;
    // Cooldown global para no encadenar preguntas
    if (now - lastInjectedAtRef.current < COOLDOWN_MS) return;

    // Contexto del último action/fragment para personalizar la pregunta
    let follow = null;
    try {
      const ctx = api?.getContext?.();
      const frag = ctx?.lastAction?.fragment?.trim();
      const full = ctx?.lastAction?.fullText || '';
      const messages = Array.isArray(api?.messages) ? api.messages : [];
      const lastUserMessage = [...messages].reverse().find((m) => m?.role === 'user')?.content || '';

      follow = generateFollowUp(content, { lastUserMessage, fragment: frag, fullText: full });

      // Extraer 3-5 palabras clave simples del contexto (muy barato)
      const kws = extractKeywords(frag || full, 5);
      if (follow && (frag || kws.length)) {
        const foco = frag ? 'este fragmento' : 'el texto';
        const tag = kws.length ? ` (pista: ${kws.slice(0,3).join(', ')})` : '';
        follow = follow.replace('¿Cómo se relacionan', `En ${foco}, ¿cómo se relacionan`).replace('en el contexto del fragmento', `dentro de ${foco}`);
        // Si quedó muy genérica, anclar suavemente
        if (/implicaciones prácticas/i.test(follow)) {
          follow = `Pensando en ${foco}${tag}, ${follow[0].toLowerCase()+follow.slice(1)}`;
        }
      }
    } catch { /* noop */ }
    if (!follow) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        api?.injectAssistant(STOP_PREFIX + ' ' + follow);
        lastInjectedAtRef.current = Date.now();
      } catch { /* noop */ }
      timeoutRef.current = null;
    }, injectDelayMs);
  }, [enabled, injectDelayMs]);

  return { onAssistantMessage: handler };
}

export { generateFollowUp };
