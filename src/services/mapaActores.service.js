// src/services/mapaActores.service.js
import { chatCompletion, extractContent } from './unifiedAiService';
import { getDimension, scoreToLevelDescriptor } from '../pedagogy/rubrics/criticalLiteracyRubric';

const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_MODEL = 'gpt-4o-mini';
const DIMENSION_KEY = 'contextualizacion'; // Dimensión: Contextualización Socio-Histórica

/**
 * Limpia respuestas JSON que vienen con bloques markdown o texto adicional
 */
function cleanJsonResponse(rawContent) {
  let cleaned = rawContent.trim();
  
  // Eliminar bloques markdown ```json ... ```
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  // Extraer solo el JSON entre { y }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

/**
 * 🤖 DEEPSEEK: Validación de precisión contextual
 * 
 * Enfoque: Verificar que el estudiante haya identificado correctamente:
 * - Actores sociales/políticos relevantes
 * - Conexiones entre actores coherentes
 * - Consecuencias documentadas o lógicas
 */
function buildDeepSeekPrompt(text, actores, conexiones, consecuencias, contextoHistorico) {
  return `Eres un evaluador experto en análisis socio-histórico de textos.

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

ANÁLISIS DEL ESTUDIANTE:

1. Actores identificados:
${actores}

2. Contexto histórico/social:
${contextoHistorico}

3. Conexiones e intereses entre actores:
${conexiones}

4. Consecuencias (impacto real o potencial):
${consecuencias}

---

TAREA: Evalúa la PRECISIÓN CONTEXTUAL del análisis según estos 3 criterios:

**Criterio 1: Actores y Contexto (actores_contexto)**
- ¿Los actores identificados son relevantes para el texto?
- ¿El contexto histórico/social es preciso?
- Nivel (1-4): 1=Solo obvios, 2=Principales explícitos, 3=Principales+secundarios, 4=Red compleja detallada

**Criterio 2: Conexiones e Intereses (conexiones_intereses)**
- ¿Las conexiones entre actores son coherentes?
- ¿Identifica intereses subyacentes?
- Nivel (1-4): 1=Inexistentes/simplistas, 2=Lineales sin intereses, 3=Explica intereses, 4=Analiza poder e influencia

**Criterio 3: Impacto y Consecuencias (impacto_consecuencias)**
- ¿Las consecuencias mencionadas son reales o plausibles?
- ¿Distingue entre corto y largo plazo?
- Nivel (1-4): 1=No menciona/especulativo, 2=Generales vagas, 3=Con ejemplos, 4=Corto+largo plazo con dinámicas

IMPORTANTE: Responde SOLO con JSON válido, sin explicaciones adicionales.

Formato de respuesta JSON:
{
  "criterios_evaluados": {
    "actores_contexto": {
      "nivel": 1-4,
      "actores_relevantes": ["actor 1", "actor 2"],
      "actores_omitidos_criticos": ["actor X"],
      "contexto_preciso": true/false
    },
    "conexiones_intereses": {
      "nivel": 1-4,
      "conexiones_correctas": ["conexión 1", "conexión 2"],
      "intereses_identificados": ["interés A", "interés B"]
    },
    "impacto_consecuencias": {
      "nivel": 1-4,
      "consecuencias_documentadas": ["consecuencia 1"],
      "consecuencias_especulativas": ["consecuencia X"]
    }
  },
  "fortalezas_contextuales": ["fortaleza 1", "fortaleza 2"],
  "mejoras_precision": ["mejora 1", "mejora 2"]
}`;
}

/**
 * 🧠 OPENAI: Evaluación de profundidad socio-histórica
 * 
 * Enfoque: Evaluar la PROFUNDIDAD del análisis:
 * - ¿Conecta con procesos sociales amplios?
 * - ¿Analiza dinámicas de poder?
 * - ¿Comprende las tensiones político-culturales?
 */
function buildOpenAIPrompt(text, actores, conexiones, consecuencias, contextoHistorico, deepseekFeedback) {
  return `Eres un evaluador experto en análisis socio-histórico crítico.

TEXTO ORIGINAL:
"""
${text.slice(0, 3000)}
"""

ANÁLISIS DEL ESTUDIANTE:

Actores: ${actores}
Contexto: ${contextoHistorico}
Conexiones: ${conexiones}
Consecuencias: ${consecuencias}

EVALUACIÓN CONTEXTUAL PREVIA (DeepSeek):
${JSON.stringify(deepseekFeedback, null, 2)}

---

TAREA: Evalúa la PROFUNDIDAD SOCIO-HISTÓRICA del análisis. No repitas la evaluación contextual.

Enfócate en:

1. **Complejidad del Análisis**: ¿Conecta con procesos sociales amplios (globalización, neoliberalismo, colonialismo, etc.)?
2. **Dinámicas de Poder**: ¿Analiza relaciones de dominación, resistencia, hegemonía?
3. **Tensiones Histórico-Culturales**: ¿Identifica conflictos estructurales, no solo eventos aislados?

Ejemplos de análisis SUPERFICIAL vs PROFUNDO:

SUPERFICIAL: "Los actores son empresas y trabajadores."
PROFUNDO: "Empresas transnacionales ejercen poder estructural sobre trabajadores precarizados, en contexto de desregulación neoliberal post-1990."

SUPERFICIAL: "Consecuencia: más desempleo."
PROFUNDO: "Consecuencia: fragmentación de identidades colectivas obreras, debilitando resistencia sindical y naturalizando individualismo competitivo."

IMPORTANTE: Responde SOLO con JSON válido.

Formato de respuesta JSON:
{
  "profundidad_sociopolitica": {
    "actores_contexto": {
      "conecta_procesos_amplios": true/false,
      "analiza_estructuras": true/false,
      "comentario": "Breve análisis"
    },
    "conexiones_intereses": {
      "analiza_dinamicas_poder": true/false,
      "identifica_hegemonias": true/false,
      "comentario": "Breve análisis"
    },
    "impacto_consecuencias": {
      "distingue_corto_largo_plazo": true/false,
      "analiza_dinamicas_sociales": true/false,
      "comentario": "Breve análisis"
    }
  },
  "fortalezas_profundidad": ["insight 1", "insight 2"],
  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],
  "nivel_pensamiento_sociopolitico": 1-4
}`;
}

/**
 * Evalúa con DeepSeek (precisión contextual)
 */
async function evaluateWithDeepSeek(text, actores, conexiones, consecuencias, contextoHistorico) {
  const prompt = buildDeepSeekPrompt(text, actores, conexiones, consecuencias, contextoHistorico);
  let response;
  
  try {
    response = await chatCompletion({
      provider: 'deepseek',
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      timeoutMs: 30000
    });

    const rawContent = extractContent(response);
    console.log('🔍 [DeepSeek MapaActores] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [DeepSeek MapaActores] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar estructura
    if (!parsed.criterios_evaluados) {
      throw new Error('Respuesta sin criterios_evaluados');
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error en evaluación DeepSeek (MapaActores):', error);
    try {
      if (response) console.error('📄 Contenido completo:', extractContent(response));
    } catch {
      // ignore
    }
    
    // Estructura de fallback
    return {
      criterios_evaluados: {
        actores_contexto: { nivel: 3, actores_relevantes: [], actores_omitidos_criticos: [], contexto_preciso: true },
        conexiones_intereses: { nivel: 3, conexiones_correctas: [], intereses_identificados: [] },
        impacto_consecuencias: { nivel: 3, consecuencias_documentadas: [], consecuencias_especulativas: [] }
      },
      fortalezas_contextuales: ['Análisis en proceso'],
      mejoras_precision: ['Error en evaluación automática'],
      _error: error.message
    };
  }
}

/**
 * Evalúa con OpenAI (profundidad socio-histórica)
 */
async function evaluateWithOpenAI(text, actores, conexiones, consecuencias, contextoHistorico, deepseekFeedback) {
  const prompt = buildOpenAIPrompt(text, actores, conexiones, consecuencias, contextoHistorico, deepseekFeedback);
  let response;
  
  try {
    response = await chatCompletion({
      provider: 'openai',
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      timeoutMs: 45000
    });

    const rawContent = extractContent(response);
    console.log('🔍 [OpenAI MapaActores] Respuesta cruda:', rawContent.slice(0, 200));
    
    const cleanedContent = cleanJsonResponse(rawContent);
    console.log('✅ [OpenAI MapaActores] Respuesta limpia:', cleanedContent.slice(0, 200));
    
    const parsed = JSON.parse(cleanedContent);
    
    // Validar estructura
    if (!parsed.profundidad_sociopolitica || !parsed.nivel_pensamiento_sociopolitico) {
      throw new Error('Respuesta sin profundidad_sociopolitica o nivel_pensamiento_sociopolitico');
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error en evaluación OpenAI (MapaActores):', error);
    try {
      if (response) console.error('📄 Contenido completo:', extractContent(response));
    } catch {
      // ignore
    }
    
    // Estructura de fallback
    return {
      profundidad_sociopolitica: {
        actores_contexto: { conecta_procesos_amplios: true, analiza_estructuras: true, comentario: 'Análisis básico' },
        conexiones_intereses: { analiza_dinamicas_poder: true, identifica_hegemonias: true, comentario: 'Análisis básico' },
        impacto_consecuencias: { distingue_corto_largo_plazo: true, analiza_dinamicas_sociales: true, comentario: 'Análisis básico' }
      },
      fortalezas_profundidad: ['Análisis en proceso'],
      oportunidades_profundizacion: ['Error en evaluación automática'],
      nivel_pensamiento_sociopolitico: 3,
      _error: error.message
    };
  }
}

/**
 * Combina feedback de ambos AIs
 */
function mergeFeedback(deepseek, openai) {
  // Calcular niveles por criterio
  const criterios = {
    actores_contexto: {
      nivel: deepseek.criterios_evaluados.actores_contexto.nivel,
      fortalezas: [],
      mejoras: []
    },
    conexiones_intereses: {
      nivel: deepseek.criterios_evaluados.conexiones_intereses.nivel,
      fortalezas: [],
      mejoras: []
    },
    impacto_consecuencias: {
      nivel: deepseek.criterios_evaluados.impacto_consecuencias.nivel,
      fortalezas: [],
      mejoras: []
    }
  };

  // Ajustar niveles según profundidad (OpenAI)
  if (openai.profundidad_sociopolitica.actores_contexto.conecta_procesos_amplios) {
    criterios.actores_contexto.fortalezas.push('Conecta actores con procesos sociales amplios');
  } else {
    criterios.actores_contexto.mejoras.push('Intenta conectar los actores con procesos históricos más amplios (ej. globalización, neoliberalismo)');
  }

  if (openai.profundidad_sociopolitica.conexiones_intereses.analiza_dinamicas_poder) {
    criterios.conexiones_intereses.fortalezas.push('Analiza dinámicas de poder entre actores');
  } else {
    criterios.conexiones_intereses.mejoras.push('Profundiza en las relaciones de poder: ¿quién domina, quién resiste, quién legitima?');
  }

  if (openai.profundidad_sociopolitica.impacto_consecuencias.distingue_corto_largo_plazo) {
    criterios.impacto_consecuencias.fortalezas.push('Distingue consecuencias a corto y largo plazo');
  } else {
    criterios.impacto_consecuencias.mejoras.push('Diferencia entre consecuencias inmediatas y efectos estructurales a largo plazo');
  }

  // Añadir fortalezas/mejoras contextuales (DeepSeek)
  deepseek.fortalezas_contextuales.forEach(f => {
    const criterioKey = detectCriterioKey(f);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].fortalezas.push(f);
    }
  });

  deepseek.mejoras_precision.forEach(m => {
    const criterioKey = detectCriterioKey(m);
    if (criterioKey && criterios[criterioKey]) {
      criterios[criterioKey].mejoras.push(m);
    }
  });

  // Añadir insights de profundidad (OpenAI)
  openai.fortalezas_profundidad.forEach(f => criterios.actores_contexto.fortalezas.push(f));
  openai.oportunidades_profundizacion.forEach(m => criterios.actores_contexto.mejoras.push(m));

  // Calcular nivel global (promedio + ajuste por profundidad)
  const nivelPromedio = (
    criterios.actores_contexto.nivel +
    criterios.conexiones_intereses.nivel +
    criterios.impacto_consecuencias.nivel
  ) / 3;

  const nivelGlobal = Math.min(4, Math.round(nivelPromedio + (openai.nivel_pensamiento_sociopolitico - nivelPromedio) * 0.3));

  return {
    dimension: DIMENSION_KEY,
    nivel_global: nivelGlobal,
    criterios,
    evidencias_deepseek: deepseek.criterios_evaluados,
    profundidad_openai: openai.profundidad_sociopolitica,
    fuentes: ['DeepSeek (precisión contextual)', 'OpenAI (profundidad socio-histórica)']
  };
}

/**
 * Detecta a qué criterio pertenece un comentario (heurística simple)
 */
function detectCriterioKey(comentario) {
  const lower = comentario.toLowerCase();
  if (lower.includes('actor') || lower.includes('contexto')) return 'actores_contexto';
  if (lower.includes('conexi') || lower.includes('interés') || lower.includes('poder')) return 'conexiones_intereses';
  if (lower.includes('consecuencia') || lower.includes('impacto')) return 'impacto_consecuencias';
  return null;
}

/**
 * FUNCIÓN PRINCIPAL: Evaluación dual de Mapa de Actores
 * 
 * @param {Object} params
 * @param {string} params.text - Texto original
 * @param {string} params.actores - Actores identificados por estudiante
 * @param {string} params.contextoHistorico - Contexto socio-histórico
 * @param {string} params.conexiones - Conexiones e intereses entre actores
 * @param {string} params.consecuencias - Consecuencias identificadas
 * @returns {Promise<Object>} Feedback criterial con niveles y evidencias
 */
export async function evaluateMapaActores({ text, actores, contextoHistorico, conexiones, consecuencias }) {
  console.log('🗺️ [MapaActores] Iniciando evaluación dual...');

  const startTime = Date.now();

  try {
    // FASE 1: Evaluación contextual con DeepSeek
    console.log('📊 Evaluando precisión contextual (DeepSeek)...');
    const deepseekResult = await evaluateWithDeepSeek(text, actores, conexiones, consecuencias, contextoHistorico);

    // FASE 2: Evaluación de profundidad con OpenAI
    console.log('🧠 Evaluando profundidad socio-histórica (OpenAI)...');
    const openaiResult = await evaluateWithOpenAI(text, actores, conexiones, consecuencias, contextoHistorico, deepseekResult);

    // FASE 3: Combinar feedback
    console.log('🔧 Combinando feedback dual...');
    const mergedFeedback = mergeFeedback(deepseekResult, openaiResult);

    // FASE 4: Añadir descriptores de rúbrica
    const rubricDimension = getDimension(DIMENSION_KEY);
    const levelInfo = scoreToLevelDescriptor(DIMENSION_KEY, mergedFeedback.nivel_global);

    const finalFeedback = {
      ...mergedFeedback,
      dimension_label: rubricDimension?.nombre || 'Contextualización Socio-Histórica',
      dimension_description: rubricDimension?.descripcion || '',
      nivel_descriptor: levelInfo.descriptor,
      duracion_ms: Date.now() - startTime
    };

    console.log(`✅ Evaluación completada en ${finalFeedback.duracion_ms}ms`);
    console.log(`📊 Nivel global: ${mergedFeedback.nivel_global}/4`);

    return finalFeedback;

  } catch (error) {
    console.error('❌ Error en evaluación dual de MapaActores:', error);
    throw error;
  }
}


