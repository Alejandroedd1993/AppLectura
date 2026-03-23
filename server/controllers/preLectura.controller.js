/**
 * Controlador para análisis de Pre-lectura.
 * Orquesta análisis académico completo con enriquecimiento web opcional (hoy deshabilitado por flag).
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendValidationError } from '../utils/validationError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createFallbackAnalysis } from '../services/preLecturaFallback.service.js';
import { getDefaultDeepSeekBaseUrl, getDefaultDeepSeekModel } from '../config/providerDefaults.js';
import { buildDeepSeekChatRequest, parseDeepSeekChatContent } from '../services/deepseekClient.service.js';
import {
  buildPreLecturaWebCacheKey,
  getCachedPreLecturaWebContext,
  getPreLecturaWebCacheConfig,
  setCachedPreLecturaWebContext,
} from '../services/preLecturaWebCache.service.js';
import { tryRepairJSON } from '../services/jsonRepair.service.js';
import { searchWebSources } from '../services/webSearch.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG_LOG_PATH = path.join(__dirname, '..', 'debug_analysis.log');

import { parseBool as parseBooleanEnv } from '../utils/envUtils.js';
import { parseAllowedModels as parseAllowedModelsCsv, pickAllowedModel } from '../utils/modelUtils.js';

function buildWebDecisionMetadata(searchDecision) {
  if (!searchDecision || typeof searchDecision !== 'object') {
    return {
      web_decision_needs_web: false,
      web_decision_confidence: 0,
      web_decision_reasons: [],
      web_decision_threshold: null,
      web_decision_classroom_mode: false,
      web_decision_min_indicators: null,
      web_decision_only_weak_signal: null,
      web_decision_indicators_matched: 0
    };
  }

  return {
    web_decision_needs_web: !!searchDecision.needsWeb,
    web_decision_confidence:
      typeof searchDecision.confidence === 'number' && Number.isFinite(searchDecision.confidence)
        ? searchDecision.confidence
        : 0,
    web_decision_reasons: Array.isArray(searchDecision.reasons) ? searchDecision.reasons : [],
    web_decision_threshold:
      typeof searchDecision.threshold === 'number' && Number.isFinite(searchDecision.threshold)
        ? searchDecision.threshold
        : null,
    web_decision_classroom_mode: !!searchDecision.classroomMode,
    web_decision_min_indicators:
      typeof searchDecision.minIndicators === 'number' && Number.isFinite(searchDecision.minIndicators)
        ? searchDecision.minIndicators
        : null,
    web_decision_only_weak_signal:
      typeof searchDecision.onlyWeakSignal === 'boolean' ? searchDecision.onlyWeakSignal : null,
    web_decision_indicators_matched:
      typeof searchDecision.matches === 'number' && Number.isFinite(searchDecision.matches)
        ? searchDecision.matches
        : (Array.isArray(searchDecision.reasons) ? searchDecision.reasons.length : 0)
  };
}

function logToDebug(message, data = null) {
  if (process.env.DEBUG_PRELECTURA_LOG !== 'true') return;

  const timestamp = new Date().toISOString();
  const dataStr = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
  const logEntry = `[${timestamp}] ${message}${dataStr}\n${'-'.repeat(50)}\n`;

  try {
    fs.appendFile(DEBUG_LOG_PATH, logEntry, (err) => {
      if (err) console.error('Error writing to debug log:', err);
    });
  } catch (e) {
    console.error('Error writing to debug log:', e);
  }
}

/**
 * Endpoint: POST /api/analysis/prelecture
 * Body: { text: string, metadata?: object }
 * 
 * Realiza análisis completo unificado:
 * 1. Detección inteligente de necesidad de búsqueda web
 * 2. Enriquecimiento RAG (si aplica)
 * 3. Análisis académico con IA (4 fases)
 * 4. Estructuración para Pre-lectura + Análisis Crítico
 */
export async function analyzePreLecture(req, res) {
  const startTime = Date.now();
  let responseSent = false; // Flag para evitar doble respuesta
  let searchDecision = null;

  // Timeout para textos largos/modelos lentos (parametrizable por env)
  const prelecturaTimeoutMsRaw = Number(process.env.PRELECTURA_TIMEOUT_MS);
  const prelecturaTimeoutMs = Number.isFinite(prelecturaTimeoutMsRaw) && prelecturaTimeoutMsRaw > 0
    ? Math.floor(prelecturaTimeoutMsRaw)
    : 300000;
  req.setTimeout(prelecturaTimeoutMs);
  res.setTimeout(prelecturaTimeoutMs);

  // 🛡️ TIMEOUT DE SEGURIDAD: Forzar respuesta si el análisis tarda demasiado
  // Esto evita que el frontend se quede esperando indefinidamente si algo se cuelga
  let safetyTimeout = null;
  const clearSafetyTimeout = () => {
    if (safetyTimeout) {
      clearTimeout(safetyTimeout);
      safetyTimeout = null;
    }
  };

  const markResponseSent = () => {
    responseSent = true;
    clearSafetyTimeout();
  };

  // Si ya se envió una respuesta (o el cliente cerró), cancelar timeout
  res.once('finish', markResponseSent);
  res.once('close', markResponseSent);

  const safetyTimeoutMsRaw = Number(process.env.PRELECTURA_SAFETY_TIMEOUT_MS);
  const safetyTimeoutMs = Number.isFinite(safetyTimeoutMsRaw) && safetyTimeoutMsRaw > 0
    ? Math.floor(safetyTimeoutMsRaw)
    : 295000;

  safetyTimeout = setTimeout(() => {
    if (!responseSent && !res.headersSent) {
      console.error(`⏰ [PreLectura] Safety timeout triggered (${safetyTimeoutMs}ms) - Forzando fallback`);
      responseSent = true;

      const safeText = (req.body && typeof req.body.text === 'string') ? req.body.text : '';
      const safeMetadata = (req.body && typeof req.body.metadata === 'object' && req.body.metadata) ? req.body.metadata : {};
      const decision = safeText ? detectWebSearchNeed(safeText, safeMetadata) : null;

      const analysis = createFallbackAnalysis(
        safeText,
        Date.now() - startTime,
        'El análisis excedió el tiempo límite de seguridad',
        decision
      );
      sendSuccess(res, analysis);
    }
  }, safetyTimeoutMs);

  try {
    const { text, metadata = {} } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length < 100) {
      return sendValidationError(res, {
        error: 'Texto invalido o muy corto (minimo 100 caracteres)',
        mensaje: 'Debes enviar un texto mas extenso para el analisis de prelectura.',
        codigo: 'INVALID_PRELECTURA_TEXT'
      });
    }

    console.log('📊 [PreLectura Controller] Iniciando análisis completo...');
    console.log(`   Longitud texto: ${text.length} caracteres`);

    // ============================================================
    // FASE 1: DETECCIÓN DE NECESIDAD DE BÚSQUEDA WEB
    // ============================================================
    searchDecision = detectWebSearchNeed(text, metadata);
    console.log(`🔍 [PreLectura] Búsqueda web: ${searchDecision.needsWeb ? 'SÍ' : 'NO'} (${(searchDecision.confidence * 100).toFixed(1)}%)`);

    let webContext = null;
    let webEnriched = false;

    // ============================================================
    // FASE 2: ENRIQUECIMIENTO WEB (si es necesario)
    // ============================================================
    // Controlado por env var para poder activar/desactivar sin cambiar código.
    // Default: deshabilitado.
    const ENABLE_WEB_SEARCH = (() => {
      const raw = String(process.env.ENABLE_WEB_SEARCH || '').trim().toLowerCase();
      return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
    })();

    const hasAnyWebProvider = !!(process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY || process.env.BING_SEARCH_API_KEY);

    if (ENABLE_WEB_SEARCH && searchDecision.needsWeb && hasAnyWebProvider) {
      try {
        console.log('🌐 [PreLectura] Ejecutando búsquedas web...');
        webContext = await performWebSearch(text, searchDecision);
        webEnriched = true;
        console.log(`✅ [PreLectura] ${webContext.sources.length} fuentes obtenidas`);
      } catch (webError) {
        console.warn('⚠️ [PreLectura] Error en búsqueda web, continuando sin RAG:', webError.message);
      }
    } else {
      const why = !ENABLE_WEB_SEARCH
        ? 'ENABLE_WEB_SEARCH desactivado'
        : !searchDecision.needsWeb
          ? 'no se detectó necesidad de contexto web'
          : !hasAnyWebProvider
            ? 'faltan API keys (TAVILY_API_KEY/SERPER_API_KEY/BING_SEARCH_API_KEY)'
            : 'condición no cumplida';
      console.log(`ℹ️ [PreLectura] Sin búsqueda web (offline): ${why}`);
    }

    // ============================================================
    // FASE 3: CONSTRUCCIÓN DE PROMPT UNIFICADO
    // ============================================================
    const prompt = buildUnifiedPrompt(text, webContext, webEnriched);
    console.log(`📝 [PreLectura] Prompt construido: ${prompt.length} caracteres`);

    // ============================================================
    // FASE 4: ANÁLISIS CON IA (DeepSeek) + Figuras (OpenAI) PARALELO
    // ============================================================
    console.log('🤖 [PreLectura] Iniciando análisis PARALELO (DeepSeek + OpenAI)...');

    // 🚀 Lógica paralela: DeepSeek (Análisis principal) + OpenAI (Figuras retóricas)
    // Esto ahorra el tiempo de la llamada más rápida (generalmente OpenAI)

    const deepSeekPromise = callDeepSeekAnalysis(prompt);

    // Solo llamar a OpenAI si necesitamos figuras retóricas (opcional, pero mejora calidad)
    // Pasamos el texto COMPLETO original para buscar figuras
    const openAiPromise = detectAndExtractFigurasRetoricas(text);

    const [aiResponse, figurasRetoricas] = await Promise.all([
      deepSeekPromise,
      openAiPromise
    ]);

    logToDebug('🤖 AI Response received', { preview: aiResponse.substring(0, 500) + '...' });
    if (figurasRetoricas && figurasRetoricas.length > 0) {
      logToDebug('🎨 Figures extracted', { count: figurasRetoricas.length });
    }

    // ============================================================
    // FASE 5: ESTRUCTURACIÓN FINAL
    // ============================================================
    console.log('🔧 [PreLectura] Iniciando estructuración final...');
    let analysis;
    try {
      // Pasamos las figuras ya obtenidas para evitar llamar de nuevo
      analysis = await parseAndStructureAnalysis(aiResponse, webContext, webEnriched, startTime, text, figurasRetoricas, searchDecision);
      console.log('✅ [PreLectura] Estructuración completada');
      logToDebug('✅ Analysis parsed successfully');
    } catch (parseError) {
      console.error('❌ [PreLectura] Error en parseAndStructureAnalysis:', parseError.message);
      logToDebug('❌ Error parsing analysis', { error: parseError.message, stack: parseError.stack, aiResponse });

      // 🆕 FALLBACK: Si el parsing falla, crear análisis básico
      console.log('🔧 [PreLectura] Generando análisis fallback por error de parsing...');
      analysis = createFallbackAnalysis(text, Date.now() - startTime, 'PRELECTURA_PARSE_ERROR', searchDecision);
    }

    console.log(`✅ [PreLectura] Análisis completo en ${Date.now() - startTime}ms`);

    // Limpiar timeout de seguridad
    clearSafetyTimeout();

    if (!responseSent) {
      responseSent = true;
      sendSuccess(res, analysis);
    }

  } catch (error) {
    console.error('❌ [PreLectura Controller] Error:', error);
    logToDebug('❌ GeneralControllerError', { message: error.message, stack: error.stack });

    // Limpiar timeout de seguridad
    clearSafetyTimeout();

    // Solo enviar respuesta si no se ha enviado ya
    if (!responseSent) {
      responseSent = true;
      const analysis = createFallbackAnalysis(
        req.body.text,
        Date.now() - startTime,
        'PRELECTURA_ANALYSIS_ERROR',
        typeof searchDecision !== 'undefined' ? searchDecision : null
      );
      sendSuccess(res, analysis);
    }
  }
}

/**
 * Detecta si el texto requiere búsqueda web
 */
function detectWebSearchNeed(text, metadata) {
  const classroomMode = parseBooleanEnv(process.env.PRELECTURA_WEB_CLASSROOM_MODE);

  const indicators = {
    recent_dates: /202[3-5]|2024|2025/gi.test(text),
    statistics: /\d+%|\d+\.\d+%/g.test(text),
    locations: /(Ecuador|Colombia|Perú|Argentina|Chile)/gi.test(text),
    news_genre: metadata.genero_textual === 'noticia',
    current_events: /(crisis|reforma|elecciones|pandemia)/gi.test(text)
  };

  const reasons = Object.entries(indicators)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  // Señales ponderadas: país/ubicación es una señal débil por sí sola.
  const weights = {
    recent_dates: 1,
    statistics: 1,
    locations: 0.25,
    news_genre: 1,
    current_events: 1
  };

  const maxWeight = Object.keys(indicators).reduce((sum, key) => sum + (weights[key] ?? 1), 0);
  const weightedScore = Object.keys(indicators).reduce((sum, key) => {
    if (!indicators[key]) return sum;
    return sum + (weights[key] ?? 1);
  }, 0) / maxWeight;

  const matches = reasons.length;

  // Nunca disparar solo por “locations” (beneficioso para modo aula y reduce coste).
  const onlyWeakSignal = reasons.length === 1 && reasons[0] === 'locations';

  // En “modo aula”, evitamos falsos positivos exigiendo más señales.
  const minIndicators = classroomMode ? 2 : 1;

  const thresholdRaw = Number(process.env.PRELECTURA_WEB_SCORE_THRESHOLD);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : (classroomMode ? 0.7 : 0.4); // defaults más conservadores en aula

  const needsWeb = !onlyWeakSignal && weightedScore >= threshold && matches >= minIndicators;

  return {
    needsWeb,
    confidence: weightedScore,
    reasons,
    threshold,
    classroomMode,
    minIndicators,
    onlyWeakSignal,
    matches
  };
}

/**
 * Ejecuta búsquedas web (prioridad: Tavily → Serper → Bing) vía `searchWebSources`.
 */
async function performWebSearch(text, searchDecision) {
  const classroomMode = parseBooleanEnv(process.env.PRELECTURA_WEB_CLASSROOM_MODE);

  const queries = generateSearchQueries(text, searchDecision.reasons);

  const maxQueriesRaw = Number(process.env.PRELECTURA_WEB_MAX_QUERIES);
  const maxQueries = Number.isFinite(maxQueriesRaw)
    ? Math.max(0, Math.floor(maxQueriesRaw))
    : (classroomMode ? 1 : 3);

  const perQueryRaw = Number(process.env.PRELECTURA_WEB_RESULTS_PER_QUERY);
  const resultsPerQuery = Number.isFinite(perQueryRaw)
    ? Math.max(1, Math.floor(perQueryRaw))
    : (classroomMode ? 2 : 3);

  const maxSourcesRaw = Number(process.env.PRELECTURA_WEB_MAX_SOURCES);
  const maxSources = Number.isFinite(maxSourcesRaw)
    ? Math.max(1, Math.floor(maxSourcesRaw))
    : (classroomMode ? 4 : 8);

  const maxFindingsRaw = Number(process.env.PRELECTURA_WEB_MAX_FINDINGS);
  const maxFindings = Number.isFinite(maxFindingsRaw)
    ? Math.max(1, Math.floor(maxFindingsRaw))
    : (classroomMode ? 3 : 5);

  const cacheConfig = getPreLecturaWebCacheConfig();

  const cacheKeyPayload = {
    queries: queries.slice(0, maxQueries),
    resultsPerQuery,
    maxSources,
    maxFindings,
    reasons: searchDecision?.reasons || [],
    classroomMode
  };

  const cacheKey = buildPreLecturaWebCacheKey(cacheKeyPayload);

  const cachedWebContext = getCachedPreLecturaWebContext(cacheKey, cacheConfig);
  if (cachedWebContext) {
    return cachedWebContext;
  }

  const searchPromises = queries.slice(0, maxQueries).map((query) =>
    searchWebSources(query, resultsPerQuery)
  );

  const results = await Promise.all(searchPromises);
  const allSources = results.flat();

  const webContext = {
    sources: allSources.slice(0, maxSources),
    key_findings: extractKeyFindings(allSources).slice(0, maxFindings),
    categories: ['context', 'statistics', 'news']
  };

  setCachedPreLecturaWebContext(cacheKey, webContext, cacheConfig);

  return webContext;
}

/**
 * Genera queries de búsqueda inteligentes
 */
function generateSearchQueries(text, reasons) {
  const queries = [];

  // PRIVACIDAD: No copiamos frases del texto al proveedor web.
  // En su lugar, detectamos temas genéricos (whitelist) + país + año, para evitar exfiltrar PII.
  const KNOWN_LOCATIONS = ['Ecuador', 'Colombia', 'Perú', 'Argentina', 'Chile'];
  const locationMatch = text.match(/\b(Ecuador|Colombia|Perú|Argentina|Chile)\b/i);
  const location = locationMatch ? locationMatch[0] : null;

  const year = new Date().getFullYear();

  const TOPIC_WHITELIST = [
    'pobreza',
    'desigualdad',
    'educación',
    'salud',
    'empleo',
    'inflación',
    'violencia',
    'migración',
    'corrupción',
    'elecciones',
    'reforma',
    'pandemia',
    'medio ambiente',
    'cambio climático',
    'derechos humanos'
  ];

  const lower = text.toLowerCase();
  const foundTopics = TOPIC_WHITELIST
    .filter((topic) => lower.includes(topic.toLowerCase()))
    .slice(0, 4);

  const topicPart = foundTopics.length > 0 ? foundTopics.join(' ') : 'contexto social';
  const placePart = location ? `${location}` : '';

  if (reasons.includes('recent_dates') || reasons.includes('current_events')) {
    queries.push(`${topicPart} ${placePart} noticias ${year} ${year - 1}`.trim());
  }

  if (reasons.includes('statistics')) {
    queries.push(`${topicPart} ${placePart} estadísticas datos oficiales ${year}`.trim());
  }

  if (reasons.includes('locations') && location) {
    queries.push(`${location} contexto actual indicadores ${year}`.trim());
  }

  // Fallback genérico si no hay razones suficientes
  if (queries.length === 0) {
    queries.push(`${topicPart} ${placePart} contexto y datos oficiales ${year}`.trim());
  }

  // De-duplicar y limitar longitud
  return Array.from(new Set(queries))
    .map((q) => q.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Busca en Tavily AI
 */
// Nota: la lógica de proveedores Tavily/Serper/Bing se centraliza en webSearch.controller.js

/**
 * Extrae hallazgos clave de las fuentes
 */
function extractKeyFindings(sources) {
  return sources
    .sort((a, b) => b.score - a.score)
    .map(s => s.snippet)
    .filter(Boolean);
}

/**
 * Construye el prompt unificado para IA
 */
function buildUnifiedPrompt(text, webContext, webEnriched) {
  const maxChars = Number.parseInt(process.env.PRELECTURA_MAX_TEXT_CHARS || '18000', 10);
  const safeText = (Number.isFinite(maxChars) && maxChars > 0 && text.length > maxChars)
    ? `${text.slice(0, maxChars)}\n\n[NOTA: Texto truncado para el análisis. Longitud original: ${text.length} caracteres]`
    : text;

  let prompt = `Eres un experto en análisis de textos académicos con formación en pedagogía crítica y literacidad crítica. 
Analiza el siguiente texto siguiendo un modelo académico estructurado de 4 fases, enfocado en comprensión analítica, 
argumentación crítica y análisis ideológico-discursivo.

TEXTO A ANALIZAR:
${safeText}

`;

  if (webEnriched && webContext) {
    prompt += `
CONTEXTO WEB ACTUALIZADO (para enriquecer tu análisis):
${webContext.key_findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Fuentes: ${webContext.sources.map(s => s.url).join(', ')}

`;
  }

  prompt += `
Responde con este JSON exacto (sin markdown, sin \`\`\`json):
{
  "metadata": {
    "genero_textual": "tipo de texto (ensayo, artículo académico, noticia, etc.)",
    "proposito_comunicativo": "propósito principal (informar, persuadir, exponer, criticar, etc.)",
    "tipologia_textual": "tipología (narrativo, expositivo, argumentativo, etc.)",
    "autor": "autor si se menciona explícitamente o 'No identificado'",
    "audiencia_objetivo": "¿A quién se dirige este texto? (estudiantes, académicos, público general, especialistas, etc.) - INFIERE basándote en el registro y complejidad",
    "contexto_historico": "¿Hay referencias temporales, históricas o contextuales relevantes? Si el texto menciona épocas, fechas o contextos históricos, descríbelos brevemente. Si no, null."
  },
  "argumentation": {
    "tesis_central": "tesis principal que el autor defiende (cita textual si es posible)",
    "hipotesis_secundarias": ["hipótesis 1", "hipótesis 2"],
    "argumentos_principales": [
      {
        "argumento": "texto del argumento",
        "tipo": "metodológico|contextual|epistemológico|empírico|teórico",
        "solidez": "alta|media|baja",
        "evidencia": "¿Qué evidencia o fundamentos utiliza este argumento? (citas, datos, teorías, ejemplos)"
      }
    ],
    "tipo_argumentacion": "analítica-crítica|descriptiva|deductiva|inductiva|analógica",
    "tipo_razonamiento": "lógico-reflexivo|empírico|por autoridad|por analogía|dialéctico",
    "estructura_logica": {
      "premisas_principales": ["premisa 1", "premisa 2"],
      "conclusiones": ["conclusión 1", "conclusión 2"],
      "cadena_argumentativa": "Describe cómo se construye la cadena argumentativa: ¿cómo las premisas llevan a las conclusiones?"
    },
    "fortalezas_argumentativas": "¿Qué hace que los argumentos sean convincentes? (uso de evidencia, coherencia lógica, autoridad, etc.)",
    "limitaciones_o_fallos": "¿Qué limitaciones, debilidades o posibles fallos lógicos (falacias) tiene la argumentación? (sé objetivo, no evaluativo - solo identifica)"
  },
  "linguistics": {
    "tipo_estructura": "estructura del texto (cronológica, causa-efecto, problema-solución, comparación-contraste, deductiva, inductiva, etc.)",
    "registro_linguistico": "registro usado (formal académico, formal general, informal, técnico, etc.)",
    "nivel_complejidad": "básico|intermedio|avanzado",
    "coherencia_cohesion": "evaluación de la coherencia y cohesión textual (cómo se conectan las ideas)",
    "analisis_sintactico": {
      "tipo_oraciones": "¿Predominan oraciones simples, complejas o compuestas? ¿Hay uso extenso de subordinadas?",
      "longitud_promedio": "corto|medio|largo",
      "complejidad_sintactica": "simple|moderada|alta"
    },
    "conectores_discursivos": {
      "causales": ["ejemplos de conectores causales encontrados: porque, ya que, debido a, etc."],
      "concesivos": ["ejemplos: aunque, a pesar de, sin embargo, etc."],
      "temporales": ["ejemplos: después, mientras, durante, etc."],
      "comparativos": ["ejemplos: así como, de igual manera, por el contrario, etc."],
      "funcion": "¿Cómo funcionan estos conectores para construir el sentido del texto?"
    },
    "lexico_especializado": {
      "campo_semantico": "¿Qué campo semántico predomina? (político, científico, filosófico, literario, etc.)",
      "terminos_tecnicos": ["término 1", "término 2"],
      "densidad_conceptual": "baja|media|alta"
    },
    "tono_y_modalidad": {
      "tono": "objetivo|subjetivo|asertivo|dubitativo|crítico|neutro|exhortativo",
      "modalidad": "¿Qué tipo de actos de habla predominan? (afirmativos, interrogativos, imperativos, exhortativos)",
      "distancia_epistemica": "¿El autor muestra certeza o incertidumbre sobre sus afirmaciones? (seguro|moderado|cauto)"
    },
    "figuras_retoricas": [
      {"tipo": "metáfora", "ejemplo": "cita exacta del fragmento del texto original donde aparece esta metáfora"},
      {"tipo": "hipérbole", "ejemplo": "cita exacta del fragmento del texto original donde aparece esta hipérbole"},
      {"tipo": "personificación", "ejemplo": "cita exacta del fragmento del texto original donde aparece"}
    ]
  },
  "critical": {
    "resumen": "resumen conciso del contenido esencial (2-3 oraciones)",
    "temas_principales": ["tema 1", "tema 2", "tema 3"],
    "contexto_critico": {
      "voces_representadas": ["voz 1", "voz 2"],
      "voces_silenciadas": ["voz 1"],
      "ideologia_subyacente": "marco ideológico o supuestos subyacentes (si aplica)",
      "marcadores_criticos": {
        "poder": "cómo se expresa el poder (si aplica)",
        "sesgos": "posibles sesgos/dispositivos retóricos (si aplica)"
      },
      "contraste_web": {
        "texto_actualizado": "si hay contexto web, resume qué cambia o se actualiza; si no, null",
        "datos_verificados": "si hay verificación de datos, resume; si no, null"
      }
    },
    "mcqQuestions": [
      {
        "nivel": 1,
        "tipo_bloom": "comprension",
        "pregunta": "Pregunta de comprensión literal específica del texto",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 0,
        "explicacion": "Explicación de por qué esta es la respuesta correcta con referencia al texto"
      },
      {
        "nivel": 1,
        "tipo_bloom": "comprension",
        "pregunta": "Segunda pregunta de comprensión literal específica del texto",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 1,
        "explicacion": "Explicación con evidencia textual"
      },
      {
        "nivel": 2,
        "tipo_bloom": "analisis",
        "pregunta": "Pregunta de análisis inferencial",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 2,
        "explicacion": "Explicación con evidencia textual"
      },
      {
        "nivel": 2,
        "tipo_bloom": "analisis",
        "pregunta": "Segunda pregunta de análisis inferencial",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 3,
        "explicacion": "Explicación con evidencia textual"
      },
      {
        "nivel": 3,
        "tipo_bloom": "evaluacion",
        "pregunta": "Pregunta de pensamiento crítico",
        "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "respuesta_correcta": 0,
        "explicacion": "Explicación con análisis crítico"
      }
    ],
    "synthesisQuestions": [
      {
        "tipo": "sintesis_principal",
        "pregunta": "¿Cuál es la idea principal del texto y cómo la desarrolla el autor?",
        "guia": "Responde en 100-150 palabras. Identifica la tesis central y menciona 2-3 argumentos clave.",
        "palabras_objetivo": 150
      },
      {
        "tipo": "conexion_personal",
        "pregunta": "¿Cómo se relaciona este texto con tu experiencia o contexto actual?",
        "guia": "Responde en 100-150 palabras. Establece al menos una conexión específica con tu vida o entorno.",
        "palabras_objetivo": 150
      }
    ]
  }
}

INSTRUCCIONES CRÍTICAS:

**PARA "figuras_retoricas":**
- FORMATO OBLIGATORIO: Cada elemento DEBE ser un objeto con "tipo" y "ejemplo" (fragmento LITERAL del texto)
- NO uses formato de string simple como ["metáfora", "hipérbole"]
- Solo incluye figuras que REALMENTE existen en el texto

**PARA "audiencia_objetivo":**
- Infiere basándote en: registro lingüístico, complejidad, jerga especializada, tipo de conocimiento asumido
- Ejemplos: "estudiantes universitarios", "académicos especializados", "público general", "tomadores de decisiones"

**PARA "estructura_logica":**
- Identifica las premisas fundamentales que sostienen la argumentación
- Muestra cómo se conectan lógicamente para llegar a conclusiones
- Describe el flujo argumentativo (ej: "El autor parte de X, luego establece Y, por lo tanto concluye Z")

**PARA "limitaciones_o_fallos":**
- Sé objetivo y descriptivo, NO evaluativo
- Solo identifica posibles: generalizaciones apresuradas, falta de evidencia, argumentos circulares, falacias lógicas
- NO califiques ni juzgues, solo documenta lo observado

**PARA "tono_y_modalidad":**
- Analiza la actitud del autor: ¿es seguro de sus afirmaciones? ¿muestra dudas? ¿exhorta o solo informa?
- Identifica actos de habla: afirmaciones, preguntas, órdenes, exhortaciones

**PARA "contexto_critico":**
- Devuelve un OBJETO (no un string) con: voces_representadas, voces_silenciadas, ideologia_subyacente
- Aplica literacidad crítica: voces presentes/ausentes, relaciones de poder, sesgos o supuestos
- Si no hay evidencia suficiente, usa arrays vacíos y nulls en lugar de inventar

**PARA "mcqQuestions":**
- Genera EXACTAMENTE 5 preguntas de opción múltiple basadas EN ESTE TEXTO ESPECÍFICO
- Distribución de niveles Bloom:
  * Nivel 1 (2 preguntas): Comprensión literal (recordar hechos, identificar ideas explícitas)
  * Nivel 2 (2 preguntas): Análisis inferencial (interpretar, relacionar conceptos)
  * Nivel 3 (1 pregunta): Pensamiento crítico (evaluar argumentos, identificar sesgos)
- Cada pregunta DEBE:
  * Ser específica al contenido del texto (NO genérica)
  * Tener 4 opciones de respuesta (A, B, C, D)
  * Indicar respuesta_correcta como índice (0=A, 1=B, 2=C, 3=D)
  * Incluir "explicacion" con evidencia textual de por qué es correcta
- Las opciones distractoras deben ser plausibles pero incorrectas

**PARA "synthesisQuestions":**
- Genera EXACTAMENTE 2 preguntas de síntesis cortas (100-150 palabras)
- Pregunta 1: "sintesis_principal" → Identificar tesis central y argumentos clave
- Pregunta 2: "conexion_personal" → Relacionar con experiencia o contexto del estudiante
- Cada pregunta debe incluir:
  * Pregunta clara y específica al texto
  * "guia" con instrucciones de qué incluir en la respuesta
  * "palabras_objetivo": 150

IMPORTANTE: Todas las preguntas deben estar fundamentadas en evidencia textual. Si algo no está en el texto, no lo inventes.`;

  return prompt;
}

/**
 * Llama a DeepSeek para análisis
 */
async function callDeepSeekAnalysis(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = getDefaultDeepSeekBaseUrl();

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no configurada');
  }

  const deepseekMaxTokensRaw = Number(process.env.PRELECTURA_DEEPSEEK_MAX_TOKENS);
  const deepseekMaxTokens = Number.isFinite(deepseekMaxTokensRaw) && deepseekMaxTokensRaw > 0
    ? Math.min(Math.floor(deepseekMaxTokensRaw), 8000)
    : 8000;

  const deepseekTimeoutMsRaw = Number(process.env.PRELECTURA_DEEPSEEK_TIMEOUT_MS);
  const deepseekTimeoutMs = Number.isFinite(deepseekTimeoutMsRaw) && deepseekTimeoutMsRaw > 0
    ? Math.floor(deepseekTimeoutMsRaw)
    : 300000;

  const fallbackModel = getDefaultDeepSeekModel();
  const requestedModel = process.env.PRELECTURA_DEEPSEEK_MODEL || fallbackModel;
  const allowedModels = parseAllowedModelsCsv(process.env.DEEPSEEK_ALLOWED_MODELS, fallbackModel);
  const selectedModel = pickAllowedModel({
    requested: requestedModel,
    allowed: allowedModels,
    fallback: fallbackModel
  });

  if (requestedModel && String(requestedModel).trim() !== selectedModel) {
    console.warn(`⚠️ [PreLectura] Modelo DeepSeek no permitido: ${requestedModel}. Usando: ${selectedModel}`);
  }

  const deepseekRequest = buildDeepSeekChatRequest({
    messages: [
      {
        role: 'system',
        content: 'Eres un experto en análisis académico de textos. Respondes SOLO con JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    requestedModel,
    temperature: 0.3,
    maxTokens: deepseekMaxTokens,
    apiKey,
  });

  const response = await axios.post(
    deepseekRequest.url,
    deepseekRequest.payload,
    {
      headers: deepseekRequest.headers,
      timeout: deepseekTimeoutMs
    }
  );

  return parseDeepSeekChatContent(response.data);
}

/**
 * Detecta Y extrae figuras retóricas con ejemplos usando OpenAI
 * OpenAI hace TODO: detectar figuras + extraer fragmentos del texto
 */
async function detectAndExtractFigurasRetoricas(textoOriginal) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.log('⚠️ [OpenAI] API Key no configurada, saltando figuras retóricas...');
    return [];
  }

  console.log(`🎨 [OpenAI] Detectando y extrayendo figuras retóricas del texto...`);
  console.log(`🔍 [DEBUG] Longitud del texto: ${textoOriginal.length} caracteres`);
  console.log(`🔍 [DEBUG] API Key configurada: ${apiKey ? 'SÍ' : 'NO'}`);

  try {
    const openaiFigurasMaxTokensRaw = Number(process.env.PRELECTURA_OPENAI_FIGURES_MAX_TOKENS);
    const openaiFigurasMaxTokens = Number.isFinite(openaiFigurasMaxTokensRaw) && openaiFigurasMaxTokensRaw > 0
      ? Math.min(Math.floor(openaiFigurasMaxTokensRaw), 3500)
      : 3500;

    const openaiFigurasTimeoutMsRaw = Number(process.env.PRELECTURA_OPENAI_FIGURES_TIMEOUT_MS);
    const openaiFigurasTimeoutMs = Number.isFinite(openaiFigurasTimeoutMsRaw) && openaiFigurasTimeoutMsRaw > 0
      ? Math.floor(openaiFigurasTimeoutMsRaw)
      : 40000;

    const requestedModel = process.env.PRELECTURA_OPENAI_FIGURES_MODEL || 'gpt-4o-mini';
    const allowedModels = parseAllowedModelsCsv(process.env.OPENAI_ALLOWED_MODELS, 'gpt-4o-mini');
    const selectedModel = pickAllowedModel({
      requested: requestedModel,
      allowed: allowedModels,
      fallback: 'gpt-4o-mini'
    });

    if (requestedModel && String(requestedModel).trim() !== selectedModel) {
      console.warn(`⚠️ [PreLectura] Modelo OpenAI figuras no permitido: ${requestedModel}. Usando: ${selectedModel}`);
    }

    // Detectar tipo de texto para ajustar la búsqueda
    const textoPreview = textoOriginal.substring(0, 1000).toLowerCase();
    const esLiterario = /(poesía|poema|verso|verso|narrativa|cuento|novela|literario)/i.test(textoOriginal) ||
      /(metáfora|símil|comparación|figura)/i.test(textoOriginal) ||
      textoOriginal.split(/\n/).length > 30; // Muchas líneas = posiblemente poético

    const esAcademico = /(estudio|investigación|análisis|teoría|metodología|hipótesis|conclusión|referencias|bibliografía)/i.test(textoOriginal) ||
      textoOriginal.length > 2000; // Textos largos suelen ser académicos

    const esArgumentativo = /(por tanto|sin embargo|no obstante|además|porque|debido a|por lo tanto)/i.test(textoOriginal);

    const prompt = `Eres un experto en retórica y análisis literario con formación universitaria en lingüística y literatura.
Tu tarea es identificar EXCLUSIVAMENTE las figuras retóricas que REALMENTE están presentes en el texto.

═══════════════════════════════════════════════════════════════
TEXTO A ANALIZAR:
═══════════════════════════════════════════════════════════════
${textoOriginal.substring(0, 4000)}
═══════════════════════════════════════════════════════════════

🎯 CONTEXTO DEL TEXTO:
- Tipo detectado: ${esLiterario ? 'Probablemente literario/poético' : esAcademico ? 'Probablemente académico/expositivo' : esArgumentativo ? 'Probablemente argumentativo/periodístico' : 'Indeterminado'}
- ${esAcademico ? '⚠️ IMPORTANTE: Los textos académicos raramente tienen figuras retóricas. Solo identifica figuras si son OBVIAS e INEQUÍVOCAS.' : ''}
- ${esLiterario ? '✅ Los textos literarios pueden tener más figuras retóricas. Busca con cuidado pero sin forzar.' : ''}

🚫 CRÍTICO: LO QUE NO ES UNA FIGURA RETÓRICA (NO INCLUIR):
1. **Expresiones comunes/cotidianas** → "estar en las nubes" (no es metáfora, es frase hecha)
2. **Comparaciones literales** → "es grande como una casa" (si es literal, NO es símil retórico)
3. **Datos numéricos** → "mil personas" (aunque sea número alto, NO es hipérbole si es real)
4. **Hechos objetivos** → "el agua moja" (NO es personificación si es realidad física)
5. **Adjetivos normales** → "casa grande" (NO es epíteto, es solo descripción)
6. **Frases coloquiales** → "me muero de risa" (aunque suene exagerado, NO es hipérbole si es expresión común)
7. **Expresiones técnicas** → "el sistema operativo" (NO es metonimia si es término técnico correcto)
8. **Comparaciones explícitas con "como" que son descriptivas** → "blanco como el papel" (si solo describe color, NO es símil retórico)

✅ SOLO INCLUIR FIGURAS RETÓRICAS CUANDO:
- Hay un uso INTENCIONAL y ARTÍSTICO del lenguaje
- La figura añade SIGNIFICADO o ÉNFASIS más allá de lo literal
- Es evidente que el autor usa recursos literarios conscientemente
- El ejemplo es CLARAMENTE retórico y no solo descriptivo/informativo

🎯 ESTRATEGIA DE BÚSQUEDA PRECISA:
1. Lee el texto COMPLETO prestando atención al REGISTRO (académico vs literario)
2. ${esAcademico ? 'Sé MUY CONSERVADOR: los textos académicos casi nunca tienen figuras retóricas reales.' : 'Busca figuras retóricas si el texto es literario/poético.'}
3. Identifica SOLO figuras OBVIAS e INEQUÍVOCAS
4. NO fuerces encontrar figuras - es mejor tener 0 figuras que 1 falsa
5. Si dudas si algo es una figura retórica o solo lenguaje descriptivo normal → NO LA INCLUYAS
6. Verifica que el ejemplo sea REALMENTE retórico y no solo una descripción común

📚 TIPOS DE FIGURAS (busca cada uno específicamente):

**COMPARACIONES Y METÁFORAS:**
- **Metáfora**: Identificación directa SIN "como/parece" → "tus ojos son luceros", "el tiempo es oro"
- **Comparación/Símil**: Usa "como", "parece", "cual", "semejante" → "blanco como nieve", "parece un ángel"

**PERSONIFICACIÓN Y HUMANIZACIÓN:**
- **Personificación**: Lo no-humano con acciones humanas → "la luna sonríe", "el viento canta", "la muerte llama"
- **Prosopopeya**: Dar voz a lo inanimado → "la piedra habla", "el silencio grita"

**REPETICIONES (busca patrones):**
- **Anáfora**: MISMA palabra/frase al INICIO → "Cada día... Cada noche... Cada hora"
- **Epífora**: MISMA palabra/frase al FINAL → "...sin ti. ...sin ti. ...sin ti"
- **Aliteración**: Repetir sonidos consonantes → "el ruido con que rueda la ronca tempestad"
- **Polisíndeton**: Repetir conjunciones → "y canta y ríe y llora y baila"
- **Asíndeton**: Omitir conjunciones → "vine, vi, vencí"

**EXAGERACIONES Y CONTRADICCIONES:**
- **Hipérbole**: Exageración evidente → "te llamé mil veces", "me muero de hambre", "llorar ríos"
- **Paradoja**: Contradicción con sentido → "vivo sin vivir", "silencio estruendoso"
- **Antítesis**: Contraste de opuestos → "fuego y hielo", "luz y oscuridad", "amor y odio"
- **Oxímoron**: Opuestos juntos → "dulce tormento", "brillante oscuridad"

**TRANSFERENCIAS DE SIGNIFICADO:**
- **Metonimia**: Nombrar por relación → "leer a Cervantes" (sus obras), "la Corona" (el rey)
- **Sinécdoque**: Parte por todo → "tiene 20 primaveras" (años), "pan" (comida en general)
- **Sinestesia**: Mezclar sentidos → "color chillón", "sabor áspero", "voz dulce", "fragancia suave"

**ADORNOS Y ÉNFASIS:**
- **Epíteto**: Adjetivo que resalta lo obvio → "blanca nieve", "verde prado", "fría nieve"
- **Hipérbaton**: Alterar orden normal → "del salón en el ángulo oscuro" (en vez de "en el ángulo oscuro del salón")

🔍 INSTRUCCIONES DE EXTRACCIÓN:
- Copia el fragmento EXACTO del texto (mínimo 4-6 palabras de contexto)
- Proporciona los índices de inicio (start) y fin (end) del fragmento en el texto original
- Asigna un nivel de confianza (confidence) de 0 a 1 según tu certeza
- NO inventes ni modifiques nada
- Si UNA FRASE tiene MÚLTIPLES figuras diferentes, identifícalas TODAS por separado
- Busca PRIMERO una de cada tipo antes de repetir el mismo tipo

📋 FORMATO DE SALIDA (JSON válido sin markdown, sin \`\`\`):
{
  "figuras_retoricas": [
    {
      "tipo": "metáfora",
      "ejemplo": "texto literal exacto aquí",
      "start": 145,
      "end": 168,
      "confidence": 0.95,
      "justificacion": "breve explicación de por qué es esta figura (máx 1 línea)"
    },
    {
      "tipo": "personificación",
      "ejemplo": "otro texto literal",
      "start": 280,
      "end": 310,
      "confidence": 0.88,
      "justificacion": "razón breve"
    }
  ]
}

NOTAS SOBRE CAMPOS:
- start/end: índices de caracteres en el texto original (cuenta desde 0)
- confidence: 0.0-1.0 (0.9+ = muy seguro, 0.7-0.9 = seguro, <0.7 = dudoso)
- justificacion: 1 línea máximo explicando por qué identificaste esta figura

🎯 OBJETIVO: Identifica SOLO las figuras retóricas que REALMENTE están presentes en el texto.
- Si el texto es académico/expositivo, es normal que tenga pocas o ninguna figura retórica
- Si el texto es literario/poético, entonces busca más exhaustivamente
- NO inventes figuras para cumplir una cuota. La calidad > cantidad.
- Si no encuentras figuras retóricas CON CONFIDENCE >= 0.7, retorna un array vacío []
- Prioriza figuras con alta confidence (>0.85) sobre cantidad`;

    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: `Eres un profesor universitario especializado en retórica clásica y análisis estilístico con maestría en lingüística.

MISIÓN CRÍTICA: Identificar SOLO las figuras retóricas que REALMENTE existen en el texto.

REGLAS DE ORO:
1. PRECISIÓN > CANTIDAD: Es mejor 0 figuras que 1 falsa
2. NO inventes figuras - Si dudas, NO la incluyas
3. Los textos académicos/expositivos RARAMENTE tienen figuras retóricas reales
4. Las expresiones comunes/cotidianas NO son figuras retóricas
5. Las comparaciones literales/descriptivas NO son símiles retóricos
6. Copia fragmentos LITERALES del texto original, sin modificaciones
7. Si el texto es académico y no encuentras figuras OBVIAS → retorna []
8. La validación posterior eliminará falsos positivos - sé conservador

FALSOS POSITIVOS COMUNES A EVITAR:
- Frases hechas/cotidianas ("estar en las nubes", "me muero de risa")
- Descripciones literales ("grande como una casa" si es literal)
- Datos numéricos objetivos (aunque sean altos)
- Términos técnicos correctos
- Adjetivos descriptivos normales
- Comparaciones que solo describen (no añaden significado artístico)

Si no encuentras figuras retóricas REALES e INEQUÍVOCAS, retorna un array vacío [].`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Baja temperatura para mayor precisión y evitar inventar figuras
        max_tokens: openaiFigurasMaxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: openaiFigurasTimeoutMs
      }
    );

    let content = response.data.choices[0].message.content.trim();
    console.log('🔍 [DEBUG] Respuesta de OpenAI recibida, longitud:', content.length);

    // Limpiar markdown si existe
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const result = JSON.parse(content);
    const figuras = result.figuras_retoricas || [];

    console.log(`✅ [OpenAI] Detectadas ${figuras.length} figuras retóricas inicialmente`);

    // 🔍 VALIDACIÓN POST-DETECCIÓN: Verificar que los ejemplos existen en el texto
    const figurasValidadas = validateRhetoricalFigures(figuras, textoOriginal);

    console.log(`✅ [Validación] ${figurasValidadas.length} figuras validadas (${figuras.length - figurasValidadas.length} eliminadas por no existir en el texto)`);

    // Log de muestra para verificar
    if (figurasValidadas.length > 0) {
      console.log(`   Ejemplo válido: ${figurasValidadas[0].tipo} → "${figurasValidadas[0].ejemplo.substring(0, 50)}..."`);
    }

    return figurasValidadas;

  } catch (error) {
    console.error('❌ [OpenAI] Error detectando figuras retóricas:', error.message);
    if (error.response?.data) {
      console.error('   Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    // Fallback: array vacío
    return [];
  }
}

/**
 * Normaliza texto para comparación (elimina puntuación, espacios múltiples, lowercase)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,;:!?¡¿()\[\]{}""''—–\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// parseAllowedModelsCsv y pickAllowedModel importados desde ../utils/modelUtils.js

/**
 * Valida que las figuras retóricas detectadas realmente existan en el texto original
 * VERSIÓN PERMISIVA: Acepta figuras legítimas sin filtros excesivos
 * @param {Array} figuras - Array de figuras con {tipo, ejemplo, start?, end?, confidence?}
 * @param {string} textoOriginal - Texto completo original
 * @returns {Array} Figuras validadas
 */
function validateRhetoricalFigures(figuras, textoOriginal) {
  if (!figuras || figuras.length === 0) {
    return [];
  }

  const textoNorm = normalizeText(textoOriginal);
  const validated = [];

  for (const figura of figuras) {
    if (!figura.tipo) {
      console.log(`⚠️ [Validación] Figura sin tipo, descartada`);
      continue;
    }

    const ejemplo = (figura.ejemplo || '').trim();

    // Si no tiene ejemplo pero tiene alta confianza, aceptar
    if (!ejemplo) {
      const confidence = figura.confidence || 0;
      if (confidence >= 0.85) {
        validated.push(figura);
        console.log(`✅ [Validación] Figura sin ejemplo aceptada por alta confianza: ${figura.tipo} (${(confidence * 100).toFixed(0)}%)`);
      } else {
        console.log(`⚠️ [Validación] Figura sin ejemplo y baja confianza descartada: ${figura.tipo}`);
      }
      continue;
    }

    // OPCIÓN 1: Si tiene offsets (start/end), validar directamente
    let validatedByOffset = false;
    if (typeof figura.start === 'number' && typeof figura.end === 'number') {
      try {
        const fragmento = textoOriginal.slice(figura.start, figura.end);
        const fragmentoNorm = normalizeText(fragmento);
        const ejemploNorm = normalizeText(ejemplo);

        if (fragmentoNorm.includes(ejemploNorm) || ejemploNorm.includes(fragmentoNorm)) {
          validated.push(figura);
          console.log(`✅ [Validación] Figura válida por offsets: ${figura.tipo} [${figura.start}-${figura.end}]`);
          validatedByOffset = true;
        }
      } catch (err) {
        console.log(`⚠️ [Validación] Error con offsets en figura: ${figura.tipo}, intentando otros métodos`);
      }
    }

    // Si ya se validó por offset, continuar con la siguiente figura
    if (validatedByOffset) continue;

    // OPCIÓN 2: Búsqueda exacta normalizada (sin offsets)
    const ejemploNorm = normalizeText(ejemplo);
    if (textoNorm.includes(ejemploNorm)) {
      validated.push(figura);
      console.log(`✅ [Validación] Figura válida por coincidencia exacta: ${figura.tipo} → "${ejemplo.substring(0, 40)}..."`);
      continue;
    }

    // OPCIÓN 3: Fuzzy matching PERMISIVO (para casos con variaciones)
    const palabrasEjemplo = ejemploNorm.split(/\s+/).filter(p => p.length > 2);
    if (palabrasEjemplo.length === 0) {
      console.log(`⚠️ [Validación] Ejemplo sin palabras válidas: "${ejemplo}", descartado`);
      continue;
    }

    const palabrasEncontradas = palabrasEjemplo.filter(palabra =>
      textoNorm.includes(palabra)
    );
    const ratio = palabrasEncontradas.length / palabrasEjemplo.length;

    // Threshold reducido de 85% a 60% para ser más permisivo
    if (ratio >= 0.6) {
      validated.push(figura);
      console.log(`✅ [Validación] Figura válida por fuzzy match: ${figura.tipo} (${(ratio * 100).toFixed(0)}% palabras coinciden)`);
      continue;
    }

    // Si llegamos aquí, la figura no pasó ninguna validación
    console.log(`⚠️ [Validación] Figura descartada: ${figura.tipo} (ratio: ${(ratio * 100).toFixed(0)}%) → "${ejemplo.substring(0, 40)}..."`);
  }

  console.log(`📊 [Validación] Resultado: ${validated.length}/${figuras.length} figuras validadas`);
  return validated;
}

/**
 * Parsea y estructura el análisis
 */
/**
 * Parsea y estructura el análisis
 * Ahora acepta figurasRetoricas externas para evitar re-cálculo
 */
async function parseAndStructureAnalysis(aiResponse, webContext, webEnriched, startTime, textoOriginal, figurasRetoricasExternas = [], searchDecision = null) {
  console.log('🔧 [parseAndStructureAnalysis] INICIANDO...');
  console.log('🔧 [DEBUG] textoOriginal length:', textoOriginal?.length || 'undefined');

  const normalizeWebSources = (sources) => {
    if (!Array.isArray(sources)) return [];
    return sources
      .filter(Boolean)
      .map((source) => {
        if (typeof source === 'string') {
          // Compat: si solo llega una URL
          return { title: source, url: source, snippet: '' };
        }
        if (!source || typeof source !== 'object') return null;
        const title = String(source.title ?? source.titulo ?? source.name ?? '').trim();
        const url = String(source.url ?? source.link ?? source.href ?? '').trim();
        const snippet = String(source.snippet ?? source.resumen ?? source.description ?? '').trim();
        // Si no hay URL, no aportamos una fuente utilizable
        if (!url) return null;
        return {
          title: title || url,
          url,
          snippet
        };
      })
      .filter(Boolean);
  };

  // Intentar parsear con reparación automática
  const parsed = tryRepairJSON(aiResponse);

  if (!parsed) {
    throw new Error('No se pudo parsear ni reparar la respuesta de IA');
  }

  console.log('✅ [parseAndStructureAnalysis] JSON parseado correctamente');

  // ============================================================
  // INTEGRACIÓN DE FIGURAS RETÓRICAS
  // Usar las recibidas externamente (paralelo) o buscarlas si no existen
  // ============================================================
  let linguisticsEnriched = parsed.linguistics || {};
  let figurasConEjemplos = figurasRetoricasExternas;

  if (!figurasConEjemplos) {
    // Fallback por compatibilidad: llamar si no se pasó
    console.log('🎨 [Figuras Retóricas] No se recibieron externamente, detectando ahora...');
    figurasConEjemplos = await detectAndExtractFigurasRetoricas(textoOriginal);
  }

  if (figurasConEjemplos && figurasConEjemplos.length > 0) {
    linguisticsEnriched.figuras_retoricas = figurasConEjemplos;
    console.log(`✅ [Figuras Retóricas] ${figurasConEjemplos.length} figuras integradas al análisis`);
  } else {
    // Si OpenAI falla o no encuentra, mantener lo que DeepSeek detectó (si existe)
    console.log('⚠️ [Figuras Retóricas] OpenAI no detectó figuras, manteniendo resultado de DeepSeek');
    if (!linguisticsEnriched.figuras_retoricas) {
      linguisticsEnriched.figuras_retoricas = [];
    }
  }

  // 🆕 Extraer y estructurar critical con MCQ y Synthesis Questions
  const criticalData = parsed.critical || {};

  // Normalizar contexto_critico: la UI espera un objeto (voces_representadas/voces_silenciadas/ideologia_subyacente/...)
  // Compat: si el modelo devuelve string, lo envolvemos.
  if (typeof criticalData.contexto_critico === 'string') {
    criticalData.contexto_critico = {
      descripcion: criticalData.contexto_critico,
      voces_representadas: [],
      voces_silenciadas: [],
      ideologia_subyacente: null,
      marcadores_criticos: {},
      contraste_web: null
    };
  } else if (!criticalData.contexto_critico || typeof criticalData.contexto_critico !== 'object') {
    criticalData.contexto_critico = {
      voces_representadas: [],
      voces_silenciadas: [],
      ideologia_subyacente: null,
      marcadores_criticos: {},
      contraste_web: null
    };
  } else {
    if (!Array.isArray(criticalData.contexto_critico.voces_representadas)) criticalData.contexto_critico.voces_representadas = [];
    if (!Array.isArray(criticalData.contexto_critico.voces_silenciadas)) criticalData.contexto_critico.voces_silenciadas = [];
    if (criticalData.contexto_critico.marcadores_criticos == null || typeof criticalData.contexto_critico.marcadores_criticos !== 'object') {
      criticalData.contexto_critico.marcadores_criticos = {};
    }
  }

  // Normalizar nivel_complejidad para badges de UI (Básico/Intermedio/Avanzado)
  if (typeof linguisticsEnriched.nivel_complejidad === 'string') {
    const lc = linguisticsEnriched.nivel_complejidad.trim().toLowerCase();
    if (lc === 'basico' || lc === 'básico') linguisticsEnriched.nivel_complejidad = 'Básico';
    else if (lc === 'intermedio') linguisticsEnriched.nivel_complejidad = 'Intermedio';
    else if (lc === 'avanzado') linguisticsEnriched.nivel_complejidad = 'Avanzado';
  }

  // Validar y estructurar mcqQuestions
  if (!criticalData.mcqQuestions || !Array.isArray(criticalData.mcqQuestions)) {
    console.log('⚠️ [parseAndStructureAnalysis] mcqQuestions no encontrado, inicializando como []');
    criticalData.mcqQuestions = [];
  } else {
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.mcqQuestions.length} preguntas MCQ encontradas`);
    // Validar estructura de cada MCQ
    criticalData.mcqQuestions = criticalData.mcqQuestions.map((q, idx) => {
      if (!q || typeof q !== 'object' || !Array.isArray(q.opciones) || q.opciones.length !== 4) {
        console.warn(`⚠️ [parseAndStructureAnalysis] MCQ ${idx} inválida, omitiendo`);
        return null;
      }
      return {
        nivel: q.nivel || 1,
        tipo_bloom: q.tipo_bloom || 'comprension',
        pregunta: q.pregunta || '',
        opciones: q.opciones,
        respuesta_correcta: typeof q.respuesta_correcta === 'number' ? q.respuesta_correcta : 0,
        explicacion: q.explicacion || ''
      };
    }).filter(q => q !== null);
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.mcqQuestions.length} MCQ validadas`);
  }

  // Validar y estructurar synthesisQuestions
  if (!criticalData.synthesisQuestions || !Array.isArray(criticalData.synthesisQuestions)) {
    console.log('⚠️ [parseAndStructureAnalysis] synthesisQuestions no encontrado, inicializando como []');
    criticalData.synthesisQuestions = [];
  } else {
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.synthesisQuestions.length} preguntas de síntesis encontradas`);
    // Validar estructura de cada pregunta de síntesis
    criticalData.synthesisQuestions = criticalData.synthesisQuestions.map((q, idx) => {
      if (!q || typeof q !== 'object') {
        console.warn(`⚠️ [parseAndStructureAnalysis] Pregunta síntesis ${idx} inválida, omitiendo`);
        return null;
      }
      return {
        tipo: q.tipo || 'sintesis',
        pregunta: q.pregunta || '',
        guia: q.guia || '',
        palabras_objetivo: q.palabras_objetivo || 150
      };
    }).filter(q => q !== null);
    console.log(`✅ [parseAndStructureAnalysis] ${criticalData.synthesisQuestions.length} preguntas síntesis validadas`);
  }

  const normalizedWebSources = webEnriched && webContext ? normalizeWebSources(webContext.sources) : [];

  return {
    prelecture: {
      metadata: parsed.metadata || {},
      argumentation: parsed.argumentation || {},
      linguistics: linguisticsEnriched,
      web_sources: normalizedWebSources,
      // Contrato estable: siempre string (la UI puede renderizarlo directamente)
      web_summary: (() => {
        if (!webEnriched || !webContext) return '';
        const keyFindings = webContext.key_findings;
        if (!keyFindings) return '';
        if (Array.isArray(keyFindings)) return keyFindings.filter(Boolean).join(' ');
        if (typeof keyFindings === 'string') return keyFindings;
        return '';
      })()
    },
    critical: criticalData,
    metadata: {
      document_id: `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      web_enriched: webEnriched,
      web_sources_count: normalizedWebSources.length,
      ...buildWebDecisionMetadata(searchDecision),
      provider: 'deepseek',
      version: '3.0-rag-backend'
    }
  };
}

