import { getOpenAI, getGemini } from '../config/apiClients.js';
import { settings } from '../config/settings.js';
import fetch from 'node-fetch';

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

export async function generarNotasConOpenAI(texto, contexto = null, nivelAcademico = 'pregrado') {
  const openai = getOpenAI();

  // ✅ Construir prompt enriquecido con contexto del análisis
  let prompt = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad según nivel académico
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    prompt += `\n\n📚 NIVEL ACADÉMICO: ${nivelAcademico.toUpperCase()}`;
    prompt += `\n${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }
  
  if (contexto) {
    prompt += `\n\nCONTEXTO DEL ANÁLISIS ACADÉMICO:`;
    if (contexto.genero) prompt += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) prompt += `\n- Tesis central: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) prompt += `\n- Conceptos clave: ${contexto.conceptos_clave.join(', ')}`;
    if (contexto.resumen_previo) prompt += `\n- Resumen: ${contexto.resumen_previo}`;
    if (contexto.argumentos_principales?.length) prompt += `\n- Argumentos principales: ${contexto.argumentos_principales.slice(0, 3).join('; ')}`;
    
    prompt += `\n\nUSA este contexto para generar notas MÁS RELEVANTES y ESPECÍFICAS al contenido analizado.`;
  }
  
  prompt += `\n\nTexto:\n"""${texto.slice(0, 6000)}"""\n\nDevuelve solo el JSON:`;

  const timeoutMs = settings.openai.timeout || 45000;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: La solicitud a OpenAI tardó demasiado')), timeoutMs));

  const responsePromise = openai.chat.completions.create({
    model: settings.openai.model,
    messages: [
      { role: 'system', content: notesSystemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const completion = await Promise.race([responsePromise, timeoutPromise]);
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
export async function generarNotasConDeepSeek(texto, contexto = null, nivelAcademico = 'pregrado') {
  let prompt = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    prompt += `\n\n📚 NIVEL: ${nivelAcademico.toUpperCase()} - ${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }
  
  if (contexto) {
    prompt += `\n\nCONTEXTO DEL ANÁLISIS:`;
    if (contexto.genero) prompt += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) prompt += `\n- Tesis: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) prompt += `\n- Conceptos: ${contexto.conceptos_clave.join(', ')}`;
  }
  
  prompt += `\n\nTexto: """${texto.slice(0, 6000)}"""\n\nDevuelve solo el JSON con la forma {"resumen":"","notas":[{"titulo":"","contenido":""}],"preguntas":[""],"tarjetas":[{"frente":"","reverso":""}]}:`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.openai.timeout || 45000);
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: notesSystemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1000
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${text}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Respuesta vacía de DeepSeek');
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
export async function generarNotasConGemini(texto, contexto = null, nivelAcademico = 'pregrado') {
  if (!gemini) throw new Error('GEMINI_API_KEY no configurada');
  
  let base = `Genera notas de estudio claras y concisas del siguiente texto.`;
  
  // 🆕 FASE 3: Agregar instrucción de complejidad
  if (NIVEL_INSTRUCCIONES[nivelAcademico]) {
    base += `\n\n📚 NIVEL: ${nivelAcademico.toUpperCase()} - ${NIVEL_INSTRUCCIONES[nivelAcademico]}`;
  }
  
  if (contexto) {
    base += `\n\nCONTEXTO DEL ANÁLISIS:`;
    if (contexto.genero) base += `\n- Género: ${contexto.genero}`;
    if (contexto.tesis_central) base += `\n- Tesis: ${contexto.tesis_central}`;
    if (contexto.conceptos_clave?.length) base += `\n- Conceptos: ${contexto.conceptos_clave.join(', ')}`;
  }
  
  base += `\n\nDevuelve exclusivamente un JSON válido con esta forma:\n{
  "resumen": "string",
  "notas": [ { "titulo": "string", "contenido": "string" } ],
  "preguntas": ["string", "string"],
  "tarjetas": [ { "frente": "string", "reverso": "string" } ]
}`;
  const user = `Texto:\n"""${texto.slice(0, 6000)}"""`;
  const model = gemini.getGenerativeModel({ model: settings.gemini.model });
  const result = await model.generateContent(`${base}\n${user}`);
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
