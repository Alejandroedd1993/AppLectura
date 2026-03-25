import { getOpenAI, getGemini } from '../config/apiClients.js';
import { buildDeepSeekChatRequest, parseDeepSeekChatContent } from './deepseekClient.service.js';
import { settings } from '../config/settings.js';
import { limitItems, truncateText } from '../utils/textLimits.js';

const notesSystemPrompt = `Eres un asistente que genera notas de estudio a partir de un texto dado. Devuelve exclusivamente un JSON válido con esta forma:
{
  "resumen": "string",
  "notas": [ { "titulo": "string", "contenido": "string" } ],
  "preguntas": ["string", "string"],
  "tarjetas": [ { "frente": "string", "reverso": "string" } ]
}`;

// 🆕 FASE 3: Mapeo de nivel académico a instrucciones de complejidad
const NIVEL_INSTRUCCIONES = {
  secundaria: 'Usa lenguaje simple y directo. Explica conceptos básicos sin asumir conocimiento previo. Enfócate en ideas principales.',
  pregrado: 'Usa terminología académica apropiada. Profundiza en conceptos clave y relaciones entre ideas. Nivel universitario inicial.',
  posgrado: 'Asume conocimiento avanzado. Analiza críticamente, conecta con teorías y debates académicos. Nivel de maestría.',
  doctorado: 'Nivel experto. Enfócate en matices epistemológicos, metodológicos y contribuciones al campo. Rigor académico máximo.'
};

const normalizarNumeroTarjetas = (valor) => {
  const num = Number(valor);
  if (!Number.isFinite(num)) return null;
  return Math.min(10, Math.max(3, Math.round(num)));
};

export async function generarNotasConOpenAI(texto, contexto = null, nivelAcademico = 'pregrado', tipoTexto = 'auto', numeroTarjetas = undefined) {
  const openai = getOpenAI();

  // ✅ Construir prompt enriquecido con contexto del análisis
  let prompt = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad según nivel académico
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    prompt += `\n\n📚 NIVEL ACADÉMICO: ${nivelAcademico.toUpperCase()}`;
    prompt += `\n${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }

  if (tipoTexto && tipoTexto !== 'auto') {
    prompt += `\n\n🧭 TIPO DE TEXTO: ${String(tipoTexto).toUpperCase()}`;
  }
  
  if (contexto) {
    prompt += `\n\nCONTEXTO DEL ANÁLISIS ACADÉMICO:`;
    if (contexto.genero) prompt += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) prompt += `\n- Tesis central: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) prompt += `\n- Conceptos clave: ${contexto.conceptos_clave.join(', ')}`;
    if (contexto.resumen_previo) prompt += `\n- Resumen: ${contexto.resumen_previo}`;
    if (contexto.argumentos_principales?.length) prompt += `\n- Argumentos principales: ${limitItems(contexto.argumentos_principales, 3).join('; ')}`;
    
    prompt += `\n\nUSA este contexto para generar notas MÁS RELEVANTES y ESPECÍFICAS al contenido analizado.`;
  }

  const tarjetasObjetivo = normalizarNumeroTarjetas(numeroTarjetas);
  if (tarjetasObjetivo) {
    prompt += `\n\nGenera exactamente ${tarjetasObjetivo} tarjetas (flashcards).`;
  }
  
  prompt += `\n\nTexto:\n"""${truncateText(texto, 6000, { suffix: '' })}"""\n\nDevuelve solo el JSON:`;

  const timeoutMs = settings.openai.timeout || 45000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: settings.openai.model,
      messages: [
        { role: 'system', content: notesSystemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }, { signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error('Timeout: La solicitud a OpenAI tardó demasiado');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respuesta vacía de OpenAI');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('La respuesta de OpenAI no es JSON válido');
  }
}

/**
 * Genera notas usando DeepSeek API
 */
export async function generarNotasConDeepSeek(texto, contexto = null, nivelAcademico = 'pregrado', tipoTexto = 'auto', numeroTarjetas = undefined) {
  let prompt = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    prompt += `\n\n📚 NIVEL: ${nivelAcademico.toUpperCase()} - ${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }

  if (tipoTexto && tipoTexto !== 'auto') {
    prompt += `\n\n🧭 TIPO DE TEXTO: ${String(tipoTexto).toUpperCase()}`;
  }
  
  if (contexto) {
    prompt += `\n\nCONTEXTO DEL ANÁLISIS:`;
    if (contexto.genero) prompt += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) prompt += `\n- Tesis: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) prompt += `\n- Conceptos: ${contexto.conceptos_clave.join(', ')}`;
  }

  const tarjetasObjetivo = normalizarNumeroTarjetas(numeroTarjetas);
  if (tarjetasObjetivo) {
    prompt += `\n\nGenera exactamente ${tarjetasObjetivo} tarjetas (flashcards).`;
  }
  
  prompt += `\n\nTexto: """${truncateText(texto, 6000, { suffix: '' })}"""\n\nDevuelve solo el JSON con la forma {"resumen":"","notas":[{"titulo":"","contenido":""}],"preguntas":[""],"tarjetas":[{"frente":"","reverso":""}]}:`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.openai.timeout || 45000);
  try {
    const deepseekRequest = buildDeepSeekChatRequest({
      messages: [
        { role: 'system', content: notesSystemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      maxTokens: 1000,
    });

    const res = await fetch(deepseekRequest.url, {
      method: 'POST',
      headers: deepseekRequest.headers,
      body: JSON.stringify(deepseekRequest.payload),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${text}`);
    }
    const data = await res.json();
    const content = parseDeepSeekChatContent(data, { emptyMessage: 'Respuesta vacía de DeepSeek' });
    return JSON.parse(content);
  } catch (e) {
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Genera notas usando Gemini API
 */
export async function generarNotasConGemini(texto, contexto = null, nivelAcademico = 'pregrado', tipoTexto = 'auto', numeroTarjetas = undefined) {
  const gemini = getGemini();
  if (!gemini) throw new Error('GEMINI_API_KEY no configurada');
  
  let base = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    base += `\n\n📚 NIVEL: ${nivelAcademico.toUpperCase()} - ${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }

  if (tipoTexto && tipoTexto !== 'auto') {
    base += `\n\n🧭 TIPO DE TEXTO: ${String(tipoTexto).toUpperCase()}`;
  }
  
  if (contexto) {
    base += `\n\nCONTEXTO DEL ANÁLISIS:`;
    if (contexto.genero) base += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) base += `\n- Tesis: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) base += `\n- Conceptos: ${contexto.conceptos_clave.join(', ')}`;
  }

  const tarjetasObjetivo = normalizarNumeroTarjetas(numeroTarjetas);
  if (tarjetasObjetivo) {
    base += `\n\nGenera exactamente ${tarjetasObjetivo} tarjetas (flashcards).`;
  }
  
  base += `\n\nDevuelve exclusivamente un JSON válido con esta forma:\n{
  "resumen": "string",
  "notas": [ { "titulo": "string", "contenido": "string" } ],
  "preguntas": ["string", "string"],
  "tarjetas": [ { "frente": "string", "reverso": "string" } ]
}`;
  const user = `Texto:\n"""${truncateText(texto, 6000, { suffix: '' })}"""`;
  const model = gemini.getGenerativeModel({ model: settings.gemini.model });
  const timeoutMs = settings.gemini?.timeout || settings.openai.timeout || 45000;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: La solicitud a Gemini tardó demasiado')), timeoutMs));

  const result = await Promise.race([
    model.generateContent(`${base}\n${user}`),
    timeoutPromise
  ]);
  const response = result.response;
  const text = response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('La respuesta de Gemini no contiene JSON');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('La respuesta de Gemini no es JSON válido');
  }
}

export default { generarNotasConOpenAI, generarNotasConDeepSeek, generarNotasConGemini };
