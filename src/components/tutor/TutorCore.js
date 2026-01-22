import React, { useState, useCallback, useRef, useEffect } from 'react';

// FASE 2: Integración pedagógica - ZDP Detector + Rewards
let zdpDetector = null;
let rewards = null;
try {
  // Importación dinámica para evitar errores en tests sin PedagogyContext
  const PedagogyContext = require('../../context/PedagogyContext');
  if (PedagogyContext.useZDPDetector && PedagogyContext.useRewards) {
    // Hook wrapper para uso dentro de componentes
    const useZDPIntegration = () => {
      try {
        const zdp = PedagogyContext.useZDPDetector();
        const rew = PedagogyContext.useRewards();
        return { zdp, rew };
      } catch {
        return { zdp: null, rew: null };
      }
    };
    // Exportar para uso en el componente
    React.useZDPIntegration = useZDPIntegration;
  }
} catch (e) {
  console.log('[TutorCore] PedagogyContext no disponible (entorno de test)');
}

/**
 * Núcleo simple de tutor no evaluativo.
 * Mantiene una pequeña conversación (FIFO acotado) y resuelve prompts vía backend.
 * Se mantiene deliberadamente ligero para reutilizarlo en distintos docks/paneles.
 * 
 * FASE 2 - INTEGRACIÓN PEDAGÓGICA:
 * - Detecta nivel Bloom automáticamente en cada pregunta
 * - Registra puntos según calidad cognitiva
 * - Genera andamiaje ZDP+1 con preguntas socráticas
 * 
 * Props:
 *  - initialMessages: [{role, content}] para hidratar historial previo (no IDs externos)
 *  - onMessagesChange: callback(messages) para persistencia externa (se invoca tras cada mutación)
 *  - maxMessages: límite FIFO de mensajes retenidos (default 40, alineado con persistencia en LecturaInteractiva)
 *  - backendUrl: URL del backend (default: http://localhost:3001)
 */
export default function TutorCore({ onBusyChange, onMessagesChange, onAssistantMessage, initialMessages = [], children, maxMessages = 40, backendUrl = 'http://localhost:3001' }) {
  // ✨ FASE 2: Integrar hooks pedagógicos
  const pedagogyIntegration = React.useZDPIntegration ? React.useZDPIntegration() : { zdp: null, rew: null };
  zdpDetector = pedagogyIntegration.zdp;
  rewards = pedagogyIntegration.rew;
  const [messages, setMessages] = useState(() => {
    if (!Array.isArray(initialMessages)) return [];
    return initialMessages.map((m, i) => ({
      id: Date.now() + '-init-' + i,
      role: m.role || 'assistant',
      content: m.content || ''
    })).filter(m => m.content);
  }); // {id, role, content}
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastUserHashRef = useRef(null);
  const lastUserTsRef = useRef(0);
  const lastActionInfoRef = useRef(null); // { action, fragment, fullText }
  const lastAssistantContentRef = useRef('');
  const _didContextHintRef = useRef(false);

  // MEJORA PEDAGÓGICA: Sistema de tutor inteligente, empático y adaptable
  // Enfoque: APOYO (no evaluación), CLARIFICACIÓN de dudas, PREGUNTAS ORGÁNICAS para profundizar

  const SYSTEM_TOPIC_GUARD = `Eres un tutor experto en literacidad crítica y pedagogía empática. Idioma: español.

🎯 **TU MISIÓN PRINCIPAL**: Apoyar al estudiante en su comprensión lectora mediante:
1. **Clarificar dudas** con explicaciones pedagógicas claras
2. **Validar esfuerzos** reconociendo insights y preguntas del estudiante
3. **Generar curiosidad** con preguntas orgánicas que emergen naturalmente del diálogo
4. **Construir conocimiento** sobre lo que el estudiante ya comprende

⚠️ **REGLA CRÍTICA - FORMATO NATURAL**:
- **NO USES ETIQUETAS EXPLÍCITAS** como "Valida:", "Explica:", "Conecta:", "Profundiza:".
- Tu respuesta debe ser un flujo conversacional natural.
- Integra los pasos pedagógicos (validar, explicar, conectar) invisiblemente en tu narrativa.
- Enfócate en el TEXTO EN SÍ: lenguaje, estructura, significado, recursos literarios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 **MODO 1: EXPLICATIVO** (acciones 'explain', 'summarize', 'deep')
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el estudiante solicita ayuda directa, SÉ GENEROSO con la información PRIMERO:

**Estructura de respuesta (NATURAL y FLUIDA)**:
Integra estos elementos en una narrativa cohesiva (SIN usar etiquetas como "Valida:" o "Explica:"):
1. **Valida**: Reconoce el interés o punto del estudiante al inicio.
2. **Explica**: Desarrolla la explicación, análisis o respuesta principal.
3. **Conecta**: Vincula con lo que ya se ha discutido.
4. **Profundiza**: Cierra con una pregunta que invite a seguir explorando naturalmente.

**Ejemplo CORRECTO (acción 'explain')**:
Estudiante: [Selecciona "islas dispersa procesión del basalto"]
Tutor: "Es un fragmento con una carga poética muy fuerte. Fíjate cómo al combinar imágenes fragmentadas como 'islas dispersas' con 'procesión del basalto', se crea una atmósfera de solemnidad fría. El basalto, siendo roca volcánica, aporta esa dureza que contrasta con la idea de movimiento. Me recuerda a lo que decíamos antes sobre el aislamiento. Si tuvieras que describir la emoción que te transmiten estas imágenes con una palabra, ¿cuál sería?"

**Ejemplo de VALIDACIÓN de insight del estudiante**:
Estudiante: "Creo que el autor usa el basalto para mostrar dureza emocional"
Tutor: "¡Exacto! Es una lectura muy aguda. El basalto funciona perfectamente como metáfora de esa dureza emocional rígida. ¿Ves alguna otra palabra en el fragmento que refuerce esa misma sensación?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤔 **MODO 2: SOCRÁTICO ADAPTATIVO** (preguntas del estudiante)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando el estudiante hace preguntas, EQUILIBRA explicación + preguntas guía:

**Si detectas CONFUSIÓN** ("no entiendo", "qué significa", "me pierdo"):
→ EXPLICA PRIMERO brevemente, LUEGO guía con preguntas simples

**Si detectas CURIOSIDAD** ("por qué", "cómo se relaciona", "qué implica"):
→ Valida la pregunta, da pistas, invita a descubrir mediante preguntas

**Si detectas ANÁLISIS PROFUNDO** (estudiante ya conecta ideas):
→ Reconoce su insight, expande con preguntas de nivel superior (síntesis, evaluación)

**Técnicas socráticas (usar con TACTO)**:
• Clarificación: "¿A qué te refieres con...?" (solo si realmente hay ambigüedad)
• Evidencia textual: "¿Qué frase del texto te hace pensar eso?"
• Perspectiva múltiple: "¿Cómo podría interpretarse de otra manera?"
• Implicaciones: "Si eso es cierto, ¿qué sugiere sobre...?"
• Voces ausentes: "¿Qué perspectivas no están representadas?"

**Ejemplo (pregunta con confusión)**:
Estudiante: "No entiendo qué quiere decir 'procesión del basalto'"
Tutor: "Te explico: 'procesión' usualmente significa un desfile ceremonial (religioso, fúnebre), algo solemne. 'Basalto' es roca volcánica, muy dura y oscura. Al combinarlas, se crea una imagen de algo pesado, rígido y ceremonioso. 

¿Te ayuda pensar en el basalto como algo que se mueve lentamente, con peso?"

**Ejemplo (pregunta analítica)**:
Estudiante: "¿El texto critica la modernización o la defiende?"
Tutor: "Excelente pregunta crítica. Busquemos pistas juntos:
• ¿Qué adjetivos usa para describir la modernización? ¿Son positivos, negativos, neutrales?
• Cuando dice 'debe ser cautelosa', ¿eso sugiere apoyo total o reservas?
• ¿Hay momentos donde contraste modernización con algo más?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **GENERACIÓN DE PREGUNTAS ORGÁNICAS**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tus preguntas deben sentirse como **continuación natural** del diálogo, NO como cuestionario.

⚠️ **REGLA CRÍTICA - CONTEXTO DE PREGUNTAS**:
- NUNCA hagas preguntas sobre palabras de TUS propios mensajes anteriores
- SOLO pregunta sobre el TEXTO ORIGINAL que el estudiante está leyendo
- Si mencionas "Parece que..." en tu respuesta, NO preguntes "¿cómo se relaciona Parece?"
- Enfócate en conceptos, ideas, temas del fragmento ORIGINAL, no de tu explicación

✅ **HACER**:
- Preguntas que emergen del punto que acabas de explicar
- Preguntas sobre CONCEPTOS del texto original
- Preguntas abiertas que invitan a explorar (no tienen respuesta "correcta" única)
- Preguntas que dan opciones: "¿Ves esto como X o más bien como Y?"
- Preguntas de SÍNTESIS: "¿Cómo conectarías esto con...?"

❌ **EVITAR**:
- Listas de 3-4 preguntas seguidas sin contexto
- Preguntas que parecen examen ("¿Cuál es el tema principal?")
- Preguntas sobre palabras que TÚ usaste en tu respuesta
- Preguntas redundantes que ya se respondieron
- Preguntas sin relación con lo que el estudiante dijo
- Preguntas sobre transiciones o conectores genéricos ("¿cómo se relacionan X y Y?" cuando X e Y son palabras tuyas)

**Ejemplo NATURAL**:
[Después de explicar metáfora sobre "basalto frío"]
"Si tuvieras que elegir un adjetivo para el tono emocional de este fragmento, ¿cuál sería?"

**Ejemplo CORRECTO (sobre el texto)**:
[Fragmento menciona "hijo" y "nombre"]
"¿Por qué crees que el acto de nombrar tiene tanta importancia en este fragmento?"

**Ejemplo INCORRECTO (evitar)**:
[Tu mensaje dice "Parece que tu mensaje... ¿Quieres volver..."]
❌ "¿Cómo se relacionan Parece y Quieres dentro de este fragmento?" (estas palabras son TUYAS, no del fragmento)

**Si no tienes pregunta natural que hacer**: Termina con una invitación abierta simple:
"¿Hay algo más del fragmento que te llame la atención?"
"¿Qué parte del texto te genera más preguntas?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 **DETECCIÓN INTELIGENTE DE NECESIDADES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adapta tu respuesta según señales del estudiante:

**Señales de confusión**: "no entiendo", "me pierdo", "qué significa", "???"
→ RESPUESTA: Explicación más simple, ejemplos concretos, sin jerga

**Señales de frustración**: "esto es difícil", "no le encuentro sentido", "complicado"
→ RESPUESTA: Validación emocional + desglose en pasos pequeños + ánimo

**Señales de curiosidad**: "me pregunto", "será que", "por qué", "cómo"
→ RESPUESTA: Reconoce curiosidad + pistas + invita a explorar

**Señales de insight**: "creo que", "tal vez", "podría ser", conexiones propias
→ RESPUESTA: CELEBRA el descubrimiento + expande la idea + pregunta más profunda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 **PRINCIPIOS DE EXTENSIÓN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Explicaciones**: 4-6 frases + 1 pregunta de seguimiento
- **Aclaraciones**: 2-3 frases directas + pregunta de verificación
- **Validaciones**: 2 frases reconocimiento + expansión + pregunta profundización
- **Respuestas socráticas**: Breve contexto (1-2 frases) + 2-3 preguntas guía

**NUNCA**:
- Respuestas de 1 sola frase sin contexto (parece desinterés)
- Bloques de texto > 10 frases (abruma al estudiante)
- Repetir explicaciones ya dadas (frustra)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TU TONO**: Empático, paciente, entusiasta por las preguntas del estudiante. NUNCA evaluativo ni correctivo. Siempre constructivo.`;

  const SYSTEM_ANTI_REDUNDANCY = `Ten en cuenta el historial para evitar repetir preguntas ya hechas. Si el estudiante pide algo ya discutido, reconócelo y profundiza:
  
"Antes mencionaste [X]. Ahora que también observas [Y], ¿cómo crees que se conectan?"
"Interesante que vuelvas a este punto. ¿Ves algo nuevo ahora que no notaste antes?"

**MEMORIA DE CONVERSACIÓN**: 
- Si el estudiante menciona una idea previa, refiérela explícitamente
- Si ya explicaste un concepto, construye SOBRE eso (no lo repitas)
- Si el estudiante mostró confusión antes y ahora entiende, reconoce su progreso: "Veo que ahora lo captas mejor..."

**PROGRESIÓN NATURAL**:
- Primeras interacciones: Preguntas básicas de comprensión
- Interacciones medias: Preguntas de análisis y conexión
- Interacciones avanzadas: Preguntas de síntesis y evaluación crítica`;

  // Notificar una sola vez cuando haya mensajes iniciales rehidratados.
  const didNotifyInitialRef = useRef(false);
  useEffect(() => {
    if (didNotifyInitialRef.current) return;
    if (!messages.length || !onMessagesChange) return;
    didNotifyInitialRef.current = true;
    try { onMessagesChange(messages); } catch (e) { /* noop */ }
  }, [messages.length, onMessagesChange]);

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev, msg];
      if (next.length > maxMessages) next.splice(0, next.length - maxMessages);
      // Notificar cambios (shallow) para persistencia externa
      try { onMessagesChange?.(next); } catch (e) { /* noop */ }
      return next;
    });
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      lastAssistantContentRef.current = msg.content;
    }
  }, [maxMessages, onMessagesChange]);

  // 🌊 Streaming: actualizar contenido de un mensaje existente
  const updateMessage = useCallback((msgId, newContent, notify = false, updateLastRef = true) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], content: newContent };
      if (notify) {
        try { onMessagesChange?.(next); } catch (e) { /* noop */ }
      }
      return next;
    });
    if (updateLastRef) {
      lastAssistantContentRef.current = newContent;
    }
  }, [onMessagesChange]);

  // 📝 HISTORIAL INTELIGENTE: Genera resumen de conversación cuando hay muchos mensajes
  const generateConversationSummary = useCallback((messageHistory) => {
    if (messageHistory.length < 6) return null; // No resumir si hay pocos mensajes

    const userMessages = messageHistory.filter(m => m.role === 'user').slice(0, 5); // Primeras 5 preguntas
    const topics = new Set();
    const questions = [];

    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      // Extraer temas/keywords (palabras > 4 caracteres que aparecen varias veces)
      const words = content.split(/\s+/).filter(w => w.length > 4);
      words.forEach(w => {
        if (words.filter(x => x === w).length > 1) {
          topics.add(w);
        }
      });

      // Extraer preguntas principales (primeras 80 caracteres de cada mensaje de usuario)
      if (msg.content.length > 0) {
        questions.push(msg.content.slice(0, 80).replace(/\n/g, ' '));
      }
    });

    if (topics.size === 0 && questions.length === 0) return null;

    const topicsArray = Array.from(topics).slice(0, 5);
    const summary = `**Resumen de la conversación hasta ahora:**
- El estudiante ha hecho ${userMessages.length} preguntas principales.
${topicsArray.length > 0 ? `- Temas explorados: ${topicsArray.join(', ')}` : ''}
${questions.length > 0 ? `- Preguntas principales: ${questions.slice(0, 3).map((q, i) => `${i + 1}. "${q}..."`).join(' ')}` : ''}

Usa este contexto para evitar repetir explicaciones ya dadas y construir sobre lo que ya se ha discutido.`;

    return summary;
  }, []);

  // Construir historial condensado para enviar al backend (evitar prompts sin contexto)
  const getCondensedHistory = useCallback((limit = 8, maxCharsPerMsg = 300, includeSummary = true) => {
    // Si hay muchos mensajes y no hemos incluido resumen recientemente, generarlo
    const shouldIncludeSummary = includeSummary && messages.length > 10;
    const summary = shouldIncludeSummary ? generateConversationSummary(messages) : null;

    // Tomar los últimos N mensajes (excluye mensajes de error internos que comienzan con ⚠️)
    const recent = messages.slice(-limit).filter(m => typeof m?.content === 'string' && !m.content.startsWith('⚠️'));

    const historyItems = recent.map(m => ({
      role: m.role === 'assistant' || m.role === 'user' ? m.role : 'user',
      content: (m.content.length > maxCharsPerMsg ? (m.content.slice(0, maxCharsPerMsg) + '…') : m.content)
    }));

    // Si hay resumen, agregarlo como mensaje de sistema adicional (se manejará en callBackend)
    return {
      items: historyItems,
      summary: summary
    };
  }, [messages, generateConversationSummary]);

  // 🕐 TIMEOUT Y RETRY: Lógica mejorada para llamadas al backend
  const TIMEOUT_MS = 45000; // 45 segundos para dar margen a respuestas largas o lentas
  const MAX_RETRIES = 2;

  const callBackendWith = useCallback(async (messagesArr, retries = 0) => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    onBusyChange?.(true);

    // Crear AbortController con timeout
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    }, TIMEOUT_MS);

    try {
      // Intentar usar OpenAI global (tests / entorno con mock) antes de ir al backend
      const OpenAIClass = (typeof globalThis !== 'undefined' ? globalThis.OpenAI : undefined);
      if (OpenAIClass) {
        try {
          const client = new OpenAIClass();
          const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messagesArr
          });
          clearTimeout(timeoutId);

          if (myRequestId !== requestIdRef.current) return;
          let content = completion?.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';

          // 🔍 Validación post-respuesta
          const ctx = lastActionInfoRef.current || {};
          const previousMessages = messages.filter(m => m.role === 'assistant').slice(-3);
          const validation = validateResponse(content, {
            fragment: ctx.fragment || '',
            fullText: ctx.fullText || '',
            previousAssistantMessages: previousMessages.map(m => m.content)
          });

          // 🔇 REGENERACIÓN AUTOMÁTICA DESHABILITADA (causaba respuestas duplicadas)
          // Si la validación falla, solo loguear pero no regenerar
          if (!validation.isValid && validation.errors?.length > 0) {
            console.log('ℹ️ [TutorCore] Validación con observaciones (no regenerando):', validation.errors);
          }

          // Filtro anti-eco: evitar repetir lo mismo que el último assistant
          content = filterEchoIfNeeded(lastAssistantContentRef.current, content);
          const msg = { id: Date.now() + '-assistant', role: 'assistant', content };

          if (myRequestId !== requestIdRef.current) return;
          addMessage(msg);
          try { onAssistantMessage?.(msg, apiRef.current); } catch { /* noop */ }
          return; // Evitar continuar al fetch backend
        } catch (e) {
          console.warn('[TutorCore] Fallback a backend tras error OpenAI global:', e?.message);
        }
      }

      // Llamada al backend con timeout y temperatura
      const ctx = lastActionInfoRef.current || {};
      const temperature = ctx.temperature || 0.7; // Default 0.7 si no se especifica

      const res = await fetch(`${backendUrl}/api/chat/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesArr,
          temperature: temperature,
          max_tokens: 800,
          stream: true
        }),
        signal: abortRef.current.signal
      });

      if (myRequestId !== requestIdRef.current) return;

      if (!res.ok) {
        clearTimeout(timeoutId);
        const errorText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errorText || 'Respuesta no OK'}`);
      }

      // 🌊 Crear mensaje placeholder y actualizarlo mientras llega el stream
      const prevAssistantContent = lastAssistantContentRef.current;
      const streamingMsgId = Date.now() + '-assistant-stream';
      addMessage({ id: streamingMsgId, role: 'assistant', content: '▌' });
      // Evitar que el placeholder altere el filtro anti-eco
      lastAssistantContentRef.current = prevAssistantContent;

      let content = '';
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamActive = true;

      while (streamActive) {
        const { done, value } = await reader.read();
        if (done) {
          streamActive = false;
          break;
        }
        if (myRequestId !== requestIdRef.current) {
          reader.cancel();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) {
                content += json.content;
                updateMessage(streamingMsgId, content + '▌', false, false);
              }
            } catch { /* noop */ }
          }
        }
      }

      clearTimeout(timeoutId);
      if (myRequestId !== requestIdRef.current) return;

      content = content.trim() || 'Sin respuesta.';

      // 🔍 VALIDACIÓN POST-RESPUESTA (reutilizando ctx declarado arriba)
      const previousMessages = messages.filter(m => m.role === 'assistant').slice(-3);
      const validation = validateResponse(content, {
        fragment: ctx.fragment || '',
        fullText: ctx.fullText || '',
        previousAssistantMessages: previousMessages.map(m => m.content)
      });

      // 🔇 REGENERACIÓN AUTOMÁTICA DESHABILITADA (causaba respuestas duplicadas y lentitud)
      // Si la validación falla, solo loguear pero no regenerar
      if (!validation.isValid && validation.errors?.length > 0) {
        console.log('ℹ️ [TutorCore] Validación con observaciones (no regenerando):', validation.errors);
      }

      // Filtro anti-eco y actualización final
      content = filterEchoIfNeeded(prevAssistantContent, content);
      updateMessage(streamingMsgId, content, true, true);

      if (myRequestId !== requestIdRef.current) return;
      try { onAssistantMessage?.({ id: streamingMsgId, role: 'assistant', content }, apiRef.current); } catch { /* noop */ }

    } catch (e) {
      clearTimeout(timeoutId);

      // Ignorar AbortError (cancelación intencional de peticiones anteriores)
      if (e.name === 'AbortError') {
        console.log('ℹ️ [TutorCore] Petición cancelada (AbortError), ignorando');
        return; // No mostrar error al usuario
      }

      // 🔄 RETRY LOGIC: Reintentar si es error de red/timeout y no hemos alcanzado el máximo
      const isRetryableError =
        e.message?.includes('Failed to fetch') ||
        e.message?.includes('NetworkError') ||
        e.message?.includes('timeout') ||
        (e.message?.includes('HTTP') && parseInt(e.message.match(/HTTP (\d+)/)?.[1] || '0') >= 500);

      if (isRetryableError && retries < MAX_RETRIES) {
        console.log(`🔄 [TutorCore] Reintentando... (${retries + 1}/${MAX_RETRIES})`);
        // Esperar un poco antes de reintentar (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        await callBackendWith(messagesArr, retries + 1);
        return;
      }

      // Si llegamos aquí, es un error no recuperable o se agotaron los reintentos
      const httpStatus = parseInt(e.message?.match(/HTTP (\d+)/)?.[1] || '0');
      const errorMessage = isRetryableError && retries >= MAX_RETRIES
        ? '⚠️ El servidor tardó demasiado en responder. Por favor, intenta nuevamente.'
        : e.message?.includes('timeout') || e.name === 'TimeoutError'
          ? '⚠️ La solicitud tardó demasiado. Por favor, intenta nuevamente.'
          : httpStatus === 402
            ? '⚠️ El proveedor de IA rechazó la solicitud por saldo/crédito insuficiente (HTTP 402). Revisa tu API key o el saldo del proveedor.'
            : (httpStatus === 401 || httpStatus === 403)
              ? '⚠️ No autorizado (HTTP 401/403). Revisa tu API key/permisos del proveedor de IA en ⚙️.'
              : e.message?.includes('HTTP 5')
                ? '⚠️ Error del servidor. Por favor, intenta más tarde.'
                : e.message?.includes('HTTP 4')
                  ? '⚠️ Error en la solicitud. Por favor, verifica tu conexión.'
                  : '⚠️ Error obteniendo respuesta del tutor. Por favor, intenta nuevamente.';

      const errMsg = { id: Date.now() + '-error', role: 'assistant', content: errorMessage };

      if (myRequestId !== requestIdRef.current) return;
      addMessage(errMsg);
      try { onAssistantMessage?.(errMsg, apiRef.current); } catch { /* noop */ }
      console.warn('[TutorCore] Error:', e);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
        onBusyChange?.(false);
      }
    }
  }, [addMessage, onBusyChange, messages]);

  const callBackend = useCallback(async (prompt, contextualGuidance = '') => {
    const historyData = getCondensedHistory();
    const history = Array.isArray(historyData) ? historyData : historyData.items;
    const summary = Array.isArray(historyData) ? null : historyData.summary;

    // Adjuntar contexto de lectura si está disponible
    const ctx = lastActionInfoRef.current || {};
    const contextSnippet = buildContextSnippet(ctx);
    const lengthInstruction = buildLengthInstruction(ctx.lengthMode, prompt);
    const creativityInstruction = buildCreativityInstruction(ctx.temperature);

    // Construir contenido del system prompt con resumen si está disponible
    let systemContent = SYSTEM_TOPIC_GUARD + ' ' + SYSTEM_ANTI_REDUNDANCY;
    if (summary) {
      systemContent += '\n\n' + summary;
    }
    if (lengthInstruction) {
      systemContent += ' ' + lengthInstruction;
    }
    if (creativityInstruction) {
      systemContent += '\n\n' + creativityInstruction;
    }
    if (contextualGuidance) {
      systemContent += contextualGuidance;
    }

    // 🌐 Agregar contexto de búsqueda web si está disponible
    if (ctx.webEnrichment) {
      systemContent += '\n\n' + ctx.webEnrichment;
      // Limpiar webEnrichment después de usarlo (solo para esta petición)
      delete ctx.webEnrichment;
    }

    const messagesArr = [
      { role: 'system', content: systemContent },
      ...history,
      ...(contextSnippet ? [{ role: 'user', content: contextSnippet }] : []),
      { role: 'user', content: prompt }
    ];

    return callBackendWith(messagesArr);
  }, [callBackendWith, getCondensedHistory]);

  // Referencia mut able para exponer API dentro de callbacks de onAssistantMessage
  const apiRef = useRef(null);

  const api = apiRef.current = {
    messages,
    loading,
    getContext: () => ({ lastAction: lastActionInfoRef.current }),
    setContext: (ctx = {}) => {
      try {
        const prev = lastActionInfoRef.current || {};
        lastActionInfoRef.current = { ...prev, ...ctx };
      } catch { /* noop */ }
    },
    loadMessages: (arr) => {
      try {
        if (!Array.isArray(arr)) return;
        const mapped = arr.map((m, i) => ({ id: Date.now() + '-load-' + i, role: m.role || m.r || 'assistant', content: m.content || m.c || '' })).filter(m => m.content);
        setMessages(mapped);
        try { onMessagesChange?.(mapped); } catch { /* noop */ }
      } catch { /* noop */ }
    },
    sendPrompt: (prompt) => {
      // Anti-duplicado: evitar reenvío del mismo prompt de usuario en ráfaga (<500ms)
      const now = Date.now();
      const hash = (prompt || '').trim().slice(0, 140);
      if (hash && lastUserHashRef.current === hash && (now - lastUserTsRef.current < 500)) {
        return Promise.resolve();
      }
      lastUserHashRef.current = hash;
      lastUserTsRef.current = now;

      // 🤖 LOGGING PARA BITÁCORA ÉTICA IA
      try {
        const currentLectureId = lastActionInfoRef.current?.lectureId || 'global';

        const interactionLog = {
          timestamp: new Date().toISOString(),
          lectureId: currentLectureId,
          question: prompt,
          context: lastActionInfoRef.current?.fragment || '',
          bloomLevel: null, // Se actualizará después de detección
          tutorMode: lastActionInfoRef.current?.action || 'general'
        };

        // Emitir evento para que BitacoraEticaIA lo capture
        window.dispatchEvent(new CustomEvent('tutor-interaction-logged', {
          detail: interactionLog
        }));
      } catch (e) {
        console.warn('[TutorCore] Error logging interaction:', e);
      }

      // ✨ FASE 2: Detectar nivel Bloom automáticamente
      let bloomDetection = null;
      if (zdpDetector) {
        try {
          bloomDetection = zdpDetector.detectLevel(prompt);
          console.log('🧠 Nivel Bloom detectado:', bloomDetection);

          // Registrar puntos según nivel cognitivo
          if (rewards && bloomDetection?.current) {
            const eventType = `QUESTION_BLOOM_${bloomDetection.current.id}`;
            const result = rewards.recordEvent(eventType, {
              bloomLevel: bloomDetection.current.id,
              question: prompt.substring(0, 100),
              confidence: bloomDetection.confidence
            });
            console.log('🎮 Puntos registrados:', result);
          }
        } catch (e) {
          console.warn('[TutorCore] Error en detección Bloom:', e);
        }
      }

      // 🧠 DETECCIÓN INTELIGENTE DE NECESIDADES DEL ESTUDIANTE
      const studentNeeds = detectStudentNeeds(prompt);

      // Construir instrucción contextual según necesidades
      let contextualGuidance = '';
      if (studentNeeds.confusion) {
        contextualGuidance = '\n\n🆘 AJUSTE: El estudiante muestra confusión. Responde con explicación simple y concreta (2-3 frases), sin jerga. Usa ejemplos si ayuda. Termina con pregunta de verificación: "¿Esto te ayuda a entenderlo mejor?"';
      } else if (studentNeeds.frustration) {
        contextualGuidance = '\n\n💪 AJUSTE: El estudiante muestra frustración. PRIMERO valida emocionalmente: "Entiendo que puede ser complejo...". LUEGO desglosa en pasos pequeños. Termina con ánimo: "Vamos paso a paso, lo estás haciendo bien."';
      } else if (studentNeeds.curiosity) {
        contextualGuidance = '\n\n✨ AJUSTE: El estudiante muestra curiosidad genuina. Reconócelo: "Interesante pregunta..." o "Me gusta tu curiosidad...". Da pistas en lugar de respuesta completa. Invita a explorar con pregunta abierta.';
      } else if (studentNeeds.insight) {
        contextualGuidance = '\n\n🎯 AJUSTE: El estudiante mostró un insight valioso. CELEBRA su descubrimiento: "¡Exacto!" o "Has captado algo importante...". Expande la idea conectándola con conceptos más profundos. Pregunta de nivel superior (síntesis/evaluación).';
      }
      // Off-topic guard ESTRICTO: SOLO activar cuando el usuario claramente pregunta sobre algo totalmente diferente
      try {
        const frag = (lastActionInfoRef.current?.fragment || '').toString().trim();
        const fullText = (lastActionInfoRef.current?.fullText || '').toString().trim();
        const p = (prompt || '').toString().toLowerCase();

        // NUEVO: Considerar TANTO fragmento como texto completo para validación
        const contextText = fullText || frag;

        // Si no hay contexto de lectura cargado, permitir cualquier pregunta
        if (!contextText) {
          console.log('ℹ️ [TutorCore] Sin contexto de lectura, permitiendo pregunta libre');
          // Continuar sin restricción
        } else {
          // Whitelist AMPLIADA: intenciones pedagógicas válidas que SIEMPRE deben pasar
          const validIntents = [
            // Intenciones analíticas generales
            /(qu[eé]\s+significa|qu[eé]\s+quiere\s+decir|explica|explicar|aclarar)/i,
            /(c[oó]mo\s+se\s+relaciona|por\s+qu[eé]|qu[eé]\s+implica)/i,
            /(cu[aá]l\s+es\s+el\s+(tema|sentido|significado|mensaje))/i,
            // Intenciones de comprensión
            /(de\s+qu[eé]\s+trata|resumen|resume|idea\s+principal)/i,
            /(entiendo\s+que|creo\s+que|parece\s+que|tal\s+vez)/i,
            // Referencias explícitas al texto
            /(en\s+el\s+(texto|fragmento|p[aá]rrafo)|este\s+(texto|fragmento))/i,
            /(el\s+autor|dice|menciona|plantea|sugiere)/i,
            // Meta-análisis textual
            /(lenguaje|estilo|recurso|met[aá]fora|imagen|s[ií]mbolo)/i,
            // Dudas y confusión (siempre válidas)
            /(no\s+entiendo|no\s+comprendo|duda|confus)/i,
            // Preguntas de profundización (siempre válidas)
            /(profundiza|m[aá]s\s+sobre|detalla|amplia)/i
          ];

          const hasValidIntent = validIntents.some(pattern => pattern.test(p));

          // Conversación establecida: deshabilitar guard después de 2 mensajes (antes 3)
          const userMsgCount = messages.filter(m => m.role === 'user').length;
          const conversationEstablished = userMsgCount >= 2;

          // CRITERIO ESTRICTO: Solo bloquear si:
          // 1. NO tiene intención válida
          // 2. NO hay conversación establecida
          // 3. Overlap EXTREMADAMENTE bajo (< 5%, antes 25%)
          // 4. Pregunta es sobre tema CLARAMENTE diferente (detección mejorada)

          if (!hasValidIntent && !conversationEstablished) {
            const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z\sáéíóúñ]/gi, ' ').replace(/\s+/g, ' ').trim();
            const promptTokens = norm(p).split(' ').filter(w => w.length > 2); // Reducido de 3 a 2 para mayor tolerancia
            const contextTokens = norm(contextText).split(' ').filter(w => w.length > 2);
            const contextSet = new Set(contextTokens);

            let overlap = 0;
            for (const token of promptTokens) {
              if (contextSet.has(token)) overlap++;
            }

            const ratio = promptTokens.length ? overlap / promptTokens.length : 1; // Default 1 (permitir)

            console.log(`📊 [TutorCore] Análisis off-topic: overlap ${(ratio * 100).toFixed(1)}% (${overlap}/${promptTokens.length} tokens)`);

            // UMBRAL MUY BAJO: solo bloquear si < 5% de overlap (extremadamente diferente)
            if (ratio < 0.05 && promptTokens.length >= 5) {
              console.warn('⚠️ [TutorCore] Pregunta posiblemente off-topic detectada');
              const steer = 'Parece que tu pregunta podría estar sobre un tema diferente al texto que estamos analizando. Si quieres discutir este texto, puedo ayudarte. Si prefieres cambiar de tema, podemos hacerlo también. ¿En qué te gustaría que te ayude?';
              addMessage({ id: Date.now() + '-assistant-steer', role: 'assistant', content: steer });
              try { onAssistantMessage?.({ role: 'assistant', content: steer }, apiRef.current); } catch { /* noop */ }
              return Promise.resolve();
            } else {
              console.log('✅ [TutorCore] Pregunta válida, permitiendo');
            }
          } else {
            console.log('✅ [TutorCore] Pregunta con intención válida o conversación establecida, permitiendo');
          }
        }
      } catch (e) {
        console.warn('[TutorCore] Error en validación off-topic:', e);
        // En caso de error, permitir la pregunta (fail-safe)
      }
      addMessage({ id: Date.now() + '-user', role: 'user', content: prompt });
      // Antes se mostraba un mensaje meta indicando el uso del texto cargado.
      // Se elimina para evitar ruido: siempre se asume el texto cargado como contexto.
      return callBackend(prompt, contextualGuidance);
    },
    sendAction: async (action, fragment, opts = {}) => {
      // Conservar contexto previo (p.ej., lengthMode, fullText ya seteado)
      const prev = lastActionInfoRef.current || {};
      lastActionInfoRef.current = { ...prev, action, fragment, fullText: opts.fullText || prev.fullText || '' };
      const frag = (fragment || '').trim();
      const fullText = (opts.fullText || '').toString();

      // No mostramos un prompt-instrucción al usuario; opcionalmente podríamos registrar una marca mínima.
      // addMessage({ id: now + '-user-action', role: 'user', content: `(${action}) ${preview}` });

      // Instrucciones específicas por acción (mejoradas con enfoque pedagógico natural)
      let actionDirectives = '';
      switch (action) {
        case 'explain':
        case 'explain|explicar':
          actionDirectives = 'USAR MODO EXPLICATIVO: Valida el fragmento seleccionado. Luego explica claramente (tipo de texto, tema, recursos) de forma fluida. Conecta con ideas previas. Cierra con MÁXIMO 1 pregunta natural. ⚠️ IMPORTANTE: No uses etiquetas como "Valida:" o "Explica:". Escribe un párrafo cohesivo.';
          break;
        case 'summarize':
          actionDirectives = 'USAR MODO EXPLICATIVO: Resume ideas clave en 3-4 frases fluidas. Luego invita a reflexionar con una pregunta opcional. ⚠️ Mantenlo natural, sin etiquetas ni listas rígidas.';
          break;
        case 'deep':
          actionDirectives = 'USAR MODO EXPLICATIVO PROFUNDO: Analiza implicaciones y conecta conceptos. Usa un tono conversacional experto pero accesible. Cierra con pregunta de síntesis. ⚠️ Escribe como un párrafo continuo, sin etiquetas explícitas.';
          break;
        case 'question':
          actionDirectives = 'USAR MODO SOCRÁTICO: Genera 2-3 preguntas abiertas que guíen al descubrimiento de forma natural. Evita parecer un examen. Intégralas en una conversación.';
          break;
        default:
          actionDirectives = 'Ayuda pedagógica empática. Responde de manera natural y fluida, sin usar etiquetas en tu respuesta.';
      }

      // 🌐 INTEGRACIÓN WEB SEARCH: Enriquecer con Tavily para 'explain' y 'deep'
      // Feature flag: deshabilitar temporalmente si causa problemas
      const ENABLE_WEB_ENRICHMENT = false; // Cambiar a true cuando funcione correctamente

      let webEnrichment = '';
      if (ENABLE_WEB_ENRICHMENT && ['explain', 'explain|explicar', 'deep'].includes(action)) {
        try {
          console.log('🌐 [TutorCore] Intentando enriquecimiento web con Tavily...');
          const searchQuery = frag.length > 100 ? frag.substring(0, 100) : frag;

          // Crear timeout manual compatible con todos los navegadores
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch('/api/web-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `${searchQuery} contexto educativo verificado`,
                maxResults: 3
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();

              if (data.resultados && data.resultados.length > 0) {
                console.log(`✅ [TutorCore] Enriquecido con ${data.resultados.length} fuentes (${data.api_utilizada})`);

                const fuentesTexto = data.resultados.map((r, i) => `
[Fuente ${i + 1}]: ${r.titulo}
${r.contenidoCompleto ? r.contenidoCompleto.substring(0, 400) : r.resumen}
URL: ${r.url}
                `.trim()).join('\n\n');

                webEnrichment = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 INFORMACIÓN CONTEXTUAL DE FUENTES VERIFICADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${fuentesTexto}

⚠️ **INSTRUCCIONES DE USO**:
- Usa esta información SOLO si enriquece la comprensión del fragmento
- Si hay datos contradictorios con el texto del estudiante, menciónalo
- Cita fuentes al final usando [1], [2], [3]
- NO reemplaces el análisis del texto original con esta información
- Integra naturalmente, no como "según la fuente..."
`;
              } else {
                console.log('ℹ️ [TutorCore] Sin resultados web relevantes');
              }
            } else {
              console.warn('⚠️ [TutorCore] Error en búsqueda web:', response.status);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            // Error específico de fetch (timeout, red, etc.)
            if (fetchError.name === 'AbortError') {
              console.warn('⚠️ [TutorCore] Timeout en búsqueda web (5s)');
            } else {
              console.warn('⚠️ [TutorCore] Error en fetch de búsqueda web:', fetchError.message);
            }
          }
        } catch (error) {
          // Fallback silencioso: continuar sin enriquecimiento web
          console.warn('⚠️ [TutorCore] Error general enriqueciendo con web:', error.message);
        }
      }

      const contextSnippet = fullText ? (fullText.length > 1200 ? fullText.slice(0, 1200) + '…' : fullText) : '';
      const userContent = `Fragmento seleccionado: "${frag}"${contextSnippet ? `\n\nContexto adicional (truncado):\n${contextSnippet}` : ''}${webEnrichment}`;
      const systemContent = `${SYSTEM_TOPIC_GUARD} ${actionDirectives}`;

      const historyData = getCondensedHistory();
      const history = Array.isArray(historyData) ? historyData : historyData.items;
      const summary = Array.isArray(historyData) ? null : historyData.summary;
      const lengthInstruction = buildLengthInstruction((lastActionInfoRef.current || {}).lengthMode, action);
      const creativityInstruction = buildCreativityInstruction((lastActionInfoRef.current || {}).temperature);

      // Construir system content con resumen si está disponible
      let finalSystemContent = systemContent + ' ' + SYSTEM_ANTI_REDUNDANCY;
      if (summary) {
        finalSystemContent += '\n\n' + summary;
      }
      if (lengthInstruction) {
        finalSystemContent += ' ' + lengthInstruction;
      }
      if (creativityInstruction) {
        finalSystemContent += '\n\n' + creativityInstruction;
      }

      const messagesArr = [
        { role: 'system', content: finalSystemContent },
        ...history,
        { role: 'user', content: userContent }
      ];
      return callBackendWith(messagesArr);
    },
    injectAssistant: (content) => {
      const msg = { id: Date.now() + '-assistant-fup', role: 'assistant', content };
      addMessage(msg);
      try { onAssistantMessage?.(msg, apiRef.current); } catch { /* noop */ }
      return msg;
    },
    cancelPending: () => {
      // Invalida cualquier petición en curso sin modificar/persistir mensajes.
      // Útil al cambiar de texto para evitar que respuestas tardías contaminen el historial.
      requestIdRef.current += 1;
      try { abortRef.current?.abort(); } catch { /* noop */ }
      abortRef.current = null;
      setLoading(false);
      try { onBusyChange?.(false); } catch { /* noop */ }
    },
    clear: () => {
      // Si hay una petición en curso, abortarla para evitar respuestas tardías
      // que repueblen el chat tras limpiar o al cambiar de texto.
      requestIdRef.current += 1;
      try { abortRef.current?.abort(); } catch { /* noop */ }
      abortRef.current = null;
      setLoading(false);
      try { onBusyChange?.(false); } catch { /* noop */ }
      setMessages([]);
      try { onMessagesChange?.([]); } catch (e) { /* noop */ }
    }
  };

  // 🧠 Detección inteligente de necesidades del estudiante (MEJORADA)
  function detectStudentNeeds(prompt) {
    const p = (prompt || '').toLowerCase();

    // Patrones de confusión (EXPANDIDOS con variaciones regionales y jerga estudiantil)
    const confusionPatterns = [
      /no entiendo/i,
      /no comprendo/i,
      /no comprend/i, // Variante común de error de tipeo
      /qu[eé] significa/i,
      /qu[eé] quiere decir/i,
      /qu[eé] quieres decir/i, // Variante común
      /me pierdo/i,
      /no capto/i,
      /no cacho/i, // Jerga chilena
      /no pillo/i, // Jerga española/rioplatense
      /no s[eé] qu[eé]/i,
      /no s[eé] que/i, // Sin tilde
      /confuso/i,
      /confundid[oa]/i,
      /me confund/i,
      /complicado/i,
      /muy complicad/i,
      /dif[ií]cil/i,
      /muy dif[ií]cil/i,
      /es dif[ií]cil/i,
      /\?\?\?+/,
      /no me queda claro/i,
      /no me queda/i,
      /no tengo claro/i,
      /no lo veo claro/i,
      /no lo pillo/i, // Jerga
      /estoy perdid[oa]/i,
      /me perd[ií]/i,
      /no le veo sentido/i,
      /no tiene sentido/i,
      /no me cuadra/i, // Expresión coloquial
      /estoy bloquead[oa]/i,
      /no me sale/i
    ];

    // Patrones de frustración (EXPANDIDOS)
    const frustrationPatterns = [
      /esto es dif[ií]cil/i,
      /no le encuentro sentido/i,
      /muy complicado/i,
      /súper complicad/i,
      /imposible/i,
      /es imposible/i,
      /no puedo/i,
      /no puedo más/i,
      /ya no puedo/i,
      /ya intent[eé]/i,
      /ya lo intent[eé]/i,
      /no veo c[oó]mo/i,
      /frustrante/i,
      /frustrad[oa]/i,
      /me frustra/i,
      /esto me frustra/i,
      /no me sale/i,
      /no me da/i, // "No me da la cabeza"
      /estoy hart[oa]/i,
      /ya me cans[eé]/i,
      /no puedo más/i,
      /tirar la toalla/i, // Expresión idiomática
      /me rindo/i,
      /rendirme/i,
      /no puedo con esto/i,
      /no doy m[aá]s/i
    ];

    // Patrones de curiosidad (EXPANDIDOS con más variaciones)
    const curiosityPatterns = [
      /me pregunto/i,
      /me estoy preguntando/i,
      /ser[aá] que/i,
      /será que/i, // Sin tilde
      /por qu[eé]/i,
      /porque/i, // Sin espacio
      /por qué razón/i,
      /c[oó]mo/i,
      /de qué manera/i,
      /de qué forma/i,
      /qu[eé] pasa si/i,
      /y si/i,
      /cu[aá]l ser[ií]a/i,
      /interesante/i,
      /es interesante/i,
      /muy interesante/i,
      /curioso/i,
      /qué curioso/i,
      /quisiera saber/i,
      /me gustaría saber/i,
      /tengo curiosidad/i,
      /me da curiosidad/i,
      /me llama la atención/i,
      /qué pasaría si/i,
      /cómo funcionaría/i,
      /cuál sería el resultado/i,
      /investigar/i,
      /explorar/i,
      /profundizar/i,
      /saber más/i,
      /conocer más/i
    ];

    // Patrones de insight (EXPANDIDOS - estudiante está conectando ideas)
    const insightPatterns = [
      /creo que/i,
      /pienso que/i,
      /me parece que/i,
      /opino que/i,
      /considero que/i,
      /tal vez/i,
      /quizá/i,
      /quizás/i,
      /podr[ií]a ser/i,
      /podría ser/i,
      /esto se relaciona con/i,
      /esto me recuerda/i,
      /me recuerda a/i,
      /similar a/i,
      /parecido a/i,
      /se parece a/i,
      /conecta con/i,
      /está conectado con/i,
      /entiendo que/i,
      /ahora entiendo/i,
      /ah[aá],?\s/i, // "Ah!"
      /¡ah!/i,
      /ya veo/i,
      /ahora veo/i,
      /tiene sentido/i,
      /ahora tiene sentido/i,
      /¡claro!/i,
      /exacto/i,
      /eso es/i,
      /tiene lógica/i,
      /es lógico/i,
      /como si/i,
      /analogía/i,
      /comparar/i,
      /comparando/i,
      /igual que/i,
      /lo mismo que/i,
      /es como/i,
      /equivalente a/i
    ];

    // Detección con scoring (múltiples matches aumentan confianza)
    const getScore = (patterns) => {
      return patterns.reduce((score, pattern) => {
        return score + (pattern.test(p) ? 1 : 0);
      }, 0);
    };

    const confusionScore = getScore(confusionPatterns);
    const frustrationScore = getScore(frustrationPatterns);
    const curiosityScore = getScore(curiosityPatterns);
    const insightScore = getScore(insightPatterns);

    // Retornar con scores para mayor precisión
    return {
      confusion: confusionScore > 0,
      frustration: frustrationScore > 0,
      curiosity: curiosityScore > 0,
      insight: insightScore > 0,
      // Scores adicionales para ajuste fino (futuro uso)
      _scores: {
        confusion: confusionScore,
        frustration: frustrationScore,
        curiosity: curiosityScore,
        insight: insightScore
      }
    };
  }

  // 🔍 VALIDACIÓN POST-RESPUESTA: Detecta errores comunes del modelo LLM
  /**
   * Valida que la respuesta del tutor no contenga errores críticos:
   * 1. No inventa metadatos (autor, título, fecha) que no están en el texto
   * 2. No pregunta sobre palabras de sus propios mensajes anteriores
   * @param {string} response - Respuesta del asistente
   * @param {Object} context - { fragment, fullText, previousAssistantMessages }
   * @returns {Object} { isValid, errors, correctedResponse }
   */
  function validateResponse(response, context = {}) {
    const { fragment = '', fullText = '', previousAssistantMessages: _previousAssistantMessages = [] } = context;
    const errors = [];

    if (!response || typeof response !== 'string') {
      return { isValid: false, errors: ['Respuesta vacía o inválida'], correctedResponse: null };
    }

    const _responseLower = response.toLowerCase();
    const textContext = (fullText || fragment || '').toLowerCase();

    // 1. VALIDAR METADATOS INVENTADOS
    // Buscar menciones de autor/título/fecha que no están en el texto
    const metadataPatterns = {
      autor: [
        /el autor (?:se llama|es|llamado|de nombre|llamada)\s+["']?([^"']+?)["']?[\s.]/i,
        /según (?:el )?autor[:\s]+([^.]+?)[.]/i,
        /autor[:\s]+([^.]+?)[.]/i
      ],
      titulo: [
        /el (?:título|libro|texto|obra) (?:se llama|es|llamado|titulado)\s+["']([^"']+?)["']/i,
        /titulado\s+["']([^"']+?)["']/i,
        /(?:libro|obra|texto|poema) (?:titulado|llamado)\s+["']([^"']+?)["']/i
      ],
      fecha: [
        /\b(?:en|de|del año|año)\s+(\d{4})\b/i,
        /\b(?:escrito|publicado|publicada)\s+(?:en|el año|año)\s+(\d{4})\b/i
      ]
    };

    // Extraer todas las menciones potenciales
    const foundMetadata = {};
    for (const [type, patterns] of Object.entries(metadataPatterns)) {
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          const mentioned = match[1].trim();
          // Verificar si está en el texto original
          if (mentioned.length > 2 && !textContext.includes(mentioned.toLowerCase())) {
            if (!foundMetadata[type]) foundMetadata[type] = [];
            foundMetadata[type].push(mentioned);
          }
        }
      }
    }

    // Si se encontró metadata inventado, agregar error
    for (const [type, mentions] of Object.entries(foundMetadata)) {
      if (mentions.length > 0) {
        errors.push(`Menciona ${type} "${mentions[0]}" que no está en el texto original`);
      }
    }

    // 2. VALIDAR PREGUNTAS SOBRE PALABRAS DEL TUTOR
    // Extraer todas las preguntas de la respuesta
    const questionMatches = response.match(/[¿?]\s*([^¿?.]+?)[?.]/g) || [];

    for (const questionMatch of questionMatches) {
      const question = questionMatch.replace(/[¿?]/g, '').trim().toLowerCase();

      // Buscar palabras comunes del tutor en la pregunta
      const tutorWords = ['parece', 'comentamos', 'quieres', 'mencioné', 'dije', 'explicé', 'antes dije'];
      const foundTutorWords = tutorWords.filter(word => question.includes(word));

      // Verificar si pregunta sobre palabras del tutor que no están en el texto original
      if (foundTutorWords.length > 0) {
        // Extraer palabras clave de la pregunta que podrían ser del tutor
        const questionWords = question.split(/\s+/).filter(w => w.length > 3);
        const wordsNotInText = questionWords.filter(w =>
          !textContext.includes(w) &&
          foundTutorWords.some(tw => question.includes(tw))
        );

        if (wordsNotInText.length > 0) {
          errors.push(`Pregunta sobre palabras del tutor ("${foundTutorWords[0]}") que no están en el texto original`);
        }
      }

      // Verificar patrones problemáticos específicos
      const problematicPatterns = [
        /cómo se relacionan?\s+(["']?\w+["']?)\s+y\s+(["']?\w+["']?)\s+en\s+(?:este|el)\s+fragmento/i,
        /qué\s+significa\s+(["']?\w+["']?)\s+en\s+este\s+fragmento/i
      ];

      for (const pattern of problematicPatterns) {
        const match = question.match(pattern);
        if (match) {
          // Extraer palabras mencionadas en la pregunta
          const mentionedWords = match.slice(1).filter(Boolean);
          // Verificar si alguna palabra no está en el texto original
          const invalidWords = mentionedWords.filter(w => {
            const cleanWord = w.replace(/["']/g, '').toLowerCase();
            return cleanWord.length > 2 && !textContext.includes(cleanWord);
          });

          if (invalidWords.length > 0 && !textContext.includes(invalidWords[0].toLowerCase())) {
            errors.push(`Pregunta sobre palabra "${invalidWords[0]}" que no está en el fragmento original`);
          }
        }
      }
    }

    // 3. CONSTRUIR RESPUESTA CORREGIDA SI HAY ERRORES
    let correctedResponse = null;
    if (errors.length > 0) {
      // Crear prompt de corrección para regenerar
      correctedResponse = {
        needsRegeneration: true,
        errors,
        correctionPrompt: `La respuesta anterior tenía estos problemas:
${errors.map(e => `- ${e}`).join('\n')}

Por favor, corrige la respuesta evitando estos errores. Enfócate solo en el texto que el estudiante está leyendo, sin mencionar información que no esté explícitamente en el texto.`
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      correctedResponse
    };
  }

  // Utilidades internas
  function tokenizeForSimilarity(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z\sáéíóúñ]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
  }

  function jaccard(aTokens, bTokens) {
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const union = a.size + b.size - inter || 1;
    return inter / union;
  }

  function filterEchoIfNeeded(prevContent, newContent) {
    try {
      const MIN_KEEP_LENGTH = 200;
      const MAX_SHRINK_RATIO = 0.6;
      const prevT = tokenizeForSimilarity(prevContent);
      const newT = tokenizeForSimilarity(newContent);
      if (prevT.length >= 15 && newT.length >= 15) { // Reducido de 20 a 15 para captar más casos
        const jac = jaccard(prevT, newT);
        // Umbral bajado de 75% a 65% para captar más redundancias
        if (jac >= 0.65) {
          // Construir una versión condensada con frases nuevas
          const prevSent = new Set(splitSentences(prevContent).map(s => s.trim().toLowerCase()));
          const cand = splitSentences(newContent).filter(s => !prevSent.has(s.trim().toLowerCase()));
          const condensed = cand.slice(0, 3).join(' ');
          if (condensed && condensed.length > 20) { // Asegurar que haya contenido suficiente
            const candidate = 'Como comentamos antes, en resumen: ' + condensed;
            if (newContent.length > MIN_KEEP_LENGTH && candidate.length < newContent.length * MAX_SHRINK_RATIO) {
              return newContent;
            }
            return candidate;
          }
          const fallback = 'Como comentamos antes, ¿quieres que profundice en algún aspecto concreto del fragmento?';
          if (newContent.length > MIN_KEEP_LENGTH && fallback.length < newContent.length * MAX_SHRINK_RATIO) {
            return newContent;
          }
          return fallback;
        }
      }
    } catch { /* noop */ }
    return newContent;
  }

  function splitSentences(text) {
    return (text || '')
      .split(/(?<=[.!?\u00BF\u00A1?!])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function buildContextSnippet(ctx = {}) {
    const frag = (ctx.fragment || '').toString().trim();
    const full = (ctx.fullText || '').toString();
    const contextSnippet = full ? (full.length > 1200 ? full.slice(0, 1200) + '…' : full) : '';
    if (!frag && !contextSnippet) return '';
    return `Contexto de lectura${frag ? ' (fragmento)' : ''}: ${frag ? '"' + frag + '"' : ''}${contextSnippet ? `\n\nContexto adicional (truncado):\n${contextSnippet}` : ''}`;
  }

  function buildLengthInstruction(mode, prompt) {
    try {
      const m = (mode || 'auto').toLowerCase();
      if (m === 'breve') return 'Responde de forma MUY concisa y directa (máximo 2-3 frases). Evita adornos innecesarios.';
      if (m === 'media') return 'Responde con una extensión equilibrada (4-6 frases). Explica lo necesario sin extenderte demasiado.';
      if (m === 'detallada') return 'Responde de forma detallada y rica en contenido (hasta 8-10 frases). USA VIÑETAS o listas numeradas para estructurar tu respuesta si es útil. Incluye EJEMPLOS concretos del texto para ilustrar tus puntos.';

      // Auto: heurística mejorada
      const p = (prompt || '').toLowerCase();
      if (/lista|enumera|cuáles son|ejemplos/.test(p)) return 'Usa listas o viñetas para mayor claridad.';
      if (/resume|resumen|de qué trata|idea principal/.test(p)) return 'Responde de forma concisa y directa.';
      if (/explica|por qué|cómo|analiza|relación/.test(p)) return 'Responde con detalle explicativo, usando el texto como soporte.';
      return '';
    } catch { return ''; }
  }

  function buildCreativityInstruction(temp) {
    try {
      const t = parseFloat(temp);
      // Rango 0.0 - 1.0 (aprox)
      if (t <= 0.4) return 'TONO: Objetivo, analítico y preciso. Cíñete estrictamente a la evidencia del texto. Evita metáforas o lenguaje florido.';
      if (t >= 0.9) return 'TONO: Inspirador, dinámico y creativo. Usa metáforas pedagógicas y conecta ideas de forma imaginativa para facilitar la comprensión. Muestra entusiasmo.';
      // Default ~0.7
      return 'TONO: Pedagógico, claro y empático. Equilibra el análisis riguroso con una explicación accesible y cálida.';
    } catch { return ''; }
  }

  return children(api);
}
