

import { getAnalysisPrompt } from '../prompts/analysis.prompt.js';
import { settings } from '../config/settings.js';
import { openaiStrategy } from './strategies/openai.strategy.js';
import { geminiStrategy } from './strategies/gemini.strategy.js';
import { deepseekStrategy } from './strategies/deepseek.strategy.js';

// Mapa de estrategias para seleccionar el proveedor de IA dinámicamente.
const strategies = {
  openai: openaiStrategy,
  gemini: geminiStrategy,
  deepseek: deepseekStrategy,
};

// Define un timeout por defecto, y permite que sea sobreescrito por configuraciones específicas.
const DEFAULT_API_TIMEOUT = 45000; // 45 segundos

/**
 * Extrae un objeto JSON de una cadena de texto, incluso si está envuelto en ```json ... ```.
 * @param {string} text - El texto que contiene el JSON.
 * @returns {string} El objeto JSON como una cadena.
 * @throws {Error} Si no se encuentra un objeto JSON válido.
 */
function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error("La respuesta de la API está vacía o no es texto.");
  }
  // Intenta encontrar el JSON dentro de bloques de código markdown.
  const markdownMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  // Si no, busca un objeto JSON que abarque toda la cadena o esté incrustado.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0];
  }

  throw new Error("No se encontró un objeto JSON válido en la respuesta.");
}

// Mezcla dos análisis válidos en uno solo (unión/combina datos)
function mergeAnalyses(primary, secondary) {
  // Utilidad para deduplicar arrays de strings
  const uniq = (arr = []) => Array.from(new Set((arr || []).filter(Boolean)));

  return {
    resumen: primary.resumen || secondary.resumen || '',
    ideasPrincipales: uniq([...(primary.ideasPrincipales || []), ...(secondary.ideasPrincipales || [])]),
    analisisEstilistico: {
      tono: primary.analisisEstilistico?.tono || secondary.analisisEstilistico?.tono || 'desconocido',
      sentimiento: primary.analisisEstilistico?.sentimiento || secondary.analisisEstilistico?.sentimiento || 'desconocido',
      estilo: primary.analisisEstilistico?.estilo || secondary.analisisEstilistico?.estilo || 'desconocido',
      publicoObjetivo: primary.analisisEstilistico?.publicoObjetivo || secondary.analisisEstilistico?.publicoObjetivo || 'general',
    },
    preguntasReflexion: uniq([...(primary.preguntasReflexion || []), ...(secondary.preguntasReflexion || [])]),
    vocabulario: (() => {
      const vocab = [...(primary.vocabulario || []), ...(secondary.vocabulario || [])];
      // dedup por palabra
      const seen = new Set();
      return vocab.filter(v => {
        const key = (v && v.palabra) || '';
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })(),
    complejidad: primary.complejidad || secondary.complejidad || 'intermedio',
    temas: uniq([...(primary.temas || []), ...(secondary.temas || [])]),
  };
}

// Ejecuta DeepSeek y OpenAI en paralelo y combina el resultado en un único análisis válido
async function analizarTextoSmart(texto) {
  const prompt = getAnalysisPrompt(texto);
  const providerTimeout = settings.openai?.timeout || DEFAULT_API_TIMEOUT;

  const pOpenAI = (async () => {
    const res = await openaiStrategy(prompt);
    const jsonText = extractJson(res);
    return JSON.parse(jsonText);
  })();

  const pDeepSeek = (async () => {
    const res = await deepseekStrategy(prompt);
    const jsonText = extractJson(res);
    return JSON.parse(jsonText);
  })();

  // Correr en paralelo con timeout global
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: La solicitud combinada tardó demasiado (${providerTimeout}ms)`)), providerTimeout)
  );

  let settled;
  try {
    settled = await Promise.race([
      Promise.allSettled([pOpenAI, pDeepSeek]),
      timeoutPromise
    ]);
  } catch (e) {
    throw e;
  }

  if (!Array.isArray(settled)) {
    // Provino del timeout
    throw new Error('Timeout en estrategia inteligente');
  }

  const [openaiRes, deepseekRes] = settled;
  const okOpenAI = openaiRes.status === 'fulfilled' ? openaiRes.value : null;
  const okDeepSeek = deepseekRes.status === 'fulfilled' ? deepseekRes.value : null;

  if (okOpenAI && okDeepSeek) return mergeAnalyses(okDeepSeek, okOpenAI);
  if (okOpenAI) return okOpenAI;
  if (okDeepSeek) return okDeepSeek;

  // Si ambos fallaron, lanza error con detalles simples
  const openaiErr = openaiRes.status === 'rejected' ? openaiRes.reason?.message : 'desconocido';
  const deepseekErr = deepseekRes.status === 'rejected' ? deepseekRes.reason?.message : 'desconocido';
  throw new Error(`Ambos proveedores fallaron. OpenAI: ${openaiErr}. DeepSeek: ${deepseekErr}`);
}

// Ejecuta DeepSeek y OpenAI y devuelve un objeto de consenso + fuentes completas
async function analizarTextoDebate(texto) {
  const prompt = getAnalysisPrompt(texto);
  const providerTimeout = settings.openai?.timeout || DEFAULT_API_TIMEOUT;

  const pOpenAI = (async () => {
    const res = await openaiStrategy(prompt);
    const jsonText = extractJson(res);
    return JSON.parse(jsonText);
  })();

  const pDeepSeek = (async () => {
    const res = await deepseekStrategy(prompt);
    const jsonText = extractJson(res);
    return JSON.parse(jsonText);
  })();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: La solicitud de debate tardó demasiado (${providerTimeout}ms)`)), providerTimeout)
  );

  const settled = await Promise.race([
    Promise.allSettled([pOpenAI, pDeepSeek]),
    timeoutPromise
  ]);

  if (!Array.isArray(settled)) throw new Error('Timeout en estrategia debate');

  const [openaiRes, deepseekRes] = settled;
  const okOpenAI = openaiRes.status === 'fulfilled' ? openaiRes.value : null;
  const okDeepSeek = deepseekRes.status === 'fulfilled' ? deepseekRes.value : null;

  if (!okOpenAI && !okDeepSeek) {
    const openaiErr = openaiRes.status === 'rejected' ? openaiRes.reason?.message : 'desconocido';
    const deepseekErr = deepseekRes.status === 'rejected' ? deepseekRes.reason?.message : 'desconocido';
    throw new Error(`Ambos proveedores fallaron. OpenAI: ${openaiErr}. DeepSeek: ${deepseekErr}`);
  }

  // Si solo tenemos uno, úsalo como consenso
  const consenso = okOpenAI && okDeepSeek ? mergeAnalyses(okDeepSeek, okOpenAI) : (okOpenAI || okDeepSeek);
  return {
    ...consenso,
    meta: {
      estrategia: 'debate',
      fuentes: {
        openai: okOpenAI || null,
        deepseek: okDeepSeek || null
      }
    }
  };
}

// Alterna proveedor de forma determinista basada en el contenido (hash simple)
function pickAlternateProvider(texto) {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  return (hash % 2 === 0) ? 'deepseek' : 'openai';
}

/**
 * Analiza un texto utilizando un proveedor de IA especificado (estrategia).
 * @param {string} texto - El texto a analizar.
 * @param {('openai' | 'gemini' | 'deepseek' | 'smart' | 'alternate' | 'debate')} proveedor - El proveedor/estrategia a utilizar.
 * @returns {Promise<object>} Un objeto con el análisis del texto.
 * @throws {Error} Si el proveedor no es válido, la solicitud falla, o la respuesta no es un JSON válido.
 */
export async function analizarTexto(texto, proveedor) {
  // Estrategias compuestas
  if (proveedor === 'smart') {
    return analizarTextoSmart(texto);
  }
  if (proveedor === 'debate') {
    return analizarTextoDebate(texto);
  }
  if (proveedor === 'alternate') {
    const chosen = pickAlternateProvider(texto);
    proveedor = chosen;
  }

  const strategy = strategies[proveedor];
  if (!strategy) throw new Error(`Proveedor de IA no válido: ${proveedor}`);

  try {
    const prompt = getAnalysisPrompt(texto);
    console.log(`Solicitando análisis a ${proveedor}...`);

    // Determina el timeout a usar.
    const providerTimeout = settings[proveedor]?.timeout || DEFAULT_API_TIMEOUT;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: La solicitud a ${proveedor} tardó demasiado (${providerTimeout}ms)`)), providerTimeout)
    );

    // Ejecuta la estrategia seleccionada con el timeout.
  const responsePromise = strategy(prompt);
    const responseText = await Promise.race([responsePromise, timeoutPromise]);

    console.log(`Respuesta recibida de ${proveedor}`);

    // Extrae y parsea el JSON de la respuesta.
    const jsonText = extractJson(responseText);
    return JSON.parse(jsonText);

  } catch (error) {
    console.error(`Error en analizarTexto con ${proveedor}:`, error.message);
    // Re-lanza el error con un mensaje más contextual.
    throw new Error(`Fallo en el análisis con ${proveedor}: ${error.message}`);
  }
}

