/**
 * @deprecated SERVICIO LEGACY - NO USAR EN CÓDIGO NUEVO
 * 
 * Este servicio está DEPRECADO y será eliminado en una futura versión.
 * Usar en su lugar: textAnalysisOrchestrator.js → performFullAnalysis()
 * 
 * Razón de deprecación:
 * - Funcionalidad duplicada con textAnalysisOrchestrator.js (~70% overlap)
 * - No se usa actualmente en ningún componente activo
 * - La estrategia dual puede ser recreada en el orquestador si es necesaria
 * 
 * Migración:
 * ANTES: analizarTextoInteligente(texto, opciones)
 * AHORA:  performFullAnalysis(texto, { strategy: 'unified', ...opciones })
 * 
 * Nota: Si necesitas estrategia dual específica (DeepSeek → OpenAI),
 * considera extender textAnalysisOrchestrator con parámetro strategy: 'dual'
 * 
 * @see textAnalysisOrchestrator.js
 */

/**
 * Servicio de Análisis Inteligente Dual (DeepSeek → OpenAI)
 * Estrategia: DeepSeek para análisis rápido base + OpenAI para profundización crítica
 */

import { detectarContextoTexto, generarPreguntasContextualizadas } from './criticalQuestionGenerator';
import { buscarContextoWeb } from './webContextService';
import { chatCompletion, extractContent } from './unifiedAiService';

import logger from '../utils/logger';
/**
 * @deprecated NO USAR - Migrar a textAnalysisOrchestrator.performFullAnalysis()
 * 
 * Análisis inteligente con arquitectura dual
 * @param {string} texto - Texto a analizar
 * @param {object} opciones - Configuración opcional
 * @returns {Promise<object>} Análisis completo enriquecido
 * 
 * NOTA: Las API keys están integradas en el backend.
 * DeepSeek es gratuito y no requiere configuración.
 * OpenAI se usa automáticamente si está disponible en el servidor.
 */
export async function analizarTextoInteligente(texto, opciones = {}) {
  const {
    incluirBusquedaWeb = true,
    maxPreguntasPorDimension = 3
  } = opciones;

  logger.log('🧠 Iniciando análisis inteligente dual (DeepSeek → OpenAI)...');
  
  const startTime = Date.now();
  let contextoBasico;
  let analisisDeepSeek;
  let profundizacionOpenAI;

  try {
    // ============================================
    // FASE 1: Análisis contextual básico (local)
    // ============================================
    logger.log('📊 Fase 1: Detección de contexto crítico (local)...');
    contextoBasico = detectarContextoTexto(texto);
    logger.log(`✅ Contexto detectado: ${contextoBasico.generoTextual}, ${contextoBasico.complejidadCritica}`);

    // ============================================
    // FASE 2: Análisis rápido con DeepSeek
    // ============================================
    logger.log('🔥 Fase 2: Análisis rápido con DeepSeek...');
    const deepseekStart = Date.now();
    
    analisisDeepSeek = await analizarConDeepSeek(texto, contextoBasico);
    
    const deepseekTime = Date.now() - deepseekStart;
    logger.log(`✅ DeepSeek completado en ${deepseekTime}ms`);

    // ============================================
    // FASE 3: Profundización crítica con OpenAI
    // ============================================
    logger.log('🤖 Fase 3: Profundización crítica con OpenAI...');
    const openaiStart = Date.now();
    
    profundizacionOpenAI = await profundizarConOpenAI(
      texto, 
      contextoBasico, 
      analisisDeepSeek
    );
    
    const openaiTime = Date.now() - openaiStart;
    logger.log(`✅ OpenAI completado en ${openaiTime}ms`);

    // ============================================
    // FASE 4: Búsqueda web contextual (opcional)
    // ============================================
    let contextoWeb = null;
    if (incluirBusquedaWeb) {
      logger.log('🌐 Fase 4: Búsqueda web contextual...');
      try {
        contextoWeb = await buscarContextoWeb(
          texto,
          contextoBasico,
          analisisDeepSeek?.temas_identificados || contextoBasico.temasPrincipales
        );
        logger.log('✅ Contexto web obtenido');
      } catch (error) {
        logger.warn('⚠️ Búsqueda web no disponible:', error.message);
        contextoWeb = { modo_offline: true };
      }
    }

    // ============================================
    // FASE 5: Generación de preguntas enriquecidas
    // ============================================
    logger.log('💭 Fase 5: Generación de preguntas contextualizadas...');
    
    const preguntasBase = generarPreguntasContextualizadas(contextoBasico, maxPreguntasPorDimension);
    
    const preguntasEnriquecidas = await enriquecerPreguntasConAmbosAnalisis(
      preguntasBase,
      analisisDeepSeek,
      profundizacionOpenAI,
      contextoWeb
    );

    // ============================================
    // FASE 6: Compilación del análisis unificado
    // ============================================
    const analisisUnificado = compilarAnalisisUnificado({
      texto,
      contextoBasico,
      analisisDeepSeek,
      profundizacionOpenAI,
      contextoWeb,
      preguntasEnriquecidas,
      metadata: {
        tiempo_total_ms: Date.now() - startTime,
        tiempo_deepseek_ms: deepseekTime,
        tiempo_openai_ms: openaiTime,
        proveedores_usados: ['deepseek', 'openai'],
        version: '2.0-dual'
      }
    });

    const totalTime = Date.now() - startTime;
    logger.log(`✅ Análisis inteligente completado en ${totalTime}ms`);
    
    return analisisUnificado;

  } catch (error) {
    logger.error('❌ Error en análisis inteligente:', error);
    
    // Fallback: si al menos tenemos DeepSeek, usarlo
    if (analisisDeepSeek) {
      logger.log('⚠️ Usando solo análisis de DeepSeek (OpenAI falló)');
      return compilarAnalisisUnificado({
        texto,
        contextoBasico: contextoBasico || detectarContextoTexto(texto),
        analisisDeepSeek,
        profundizacionOpenAI: null,
        contextoWeb: null,
        preguntasEnriquecidas: generarPreguntasContextualizadas(
          contextoBasico || detectarContextoTexto(texto), 
          maxPreguntasPorDimension
        ),
        metadata: {
          tiempo_total_ms: Date.now() - startTime,
          proveedores_usados: ['deepseek'],
          fallback: true,
          error_openai: error.message
        }
      });
    }

    // Fallback completo: análisis básico sin IA
    logger.error('❌ Fallback a análisis básico sin IA');
    return fallbackAnalisisBasico(texto, contextoBasico || detectarContextoTexto(texto));
  }
}

/**
 * Análisis rápido con DeepSeek (contexto base y temas)
 * NOTA: No requiere API key, el backend lo maneja automáticamente
 */
async function analizarConDeepSeek(texto, contextoBasico) {
  try {
    logger.log('🔥 Llamando a DeepSeek API (integrado en backend)...');
    logger.log('📊 Config:', {
      textLength: texto.length,
      provider: 'deepseek',
      nota: 'API key manejada por el backend'
    });
    
    const prompt = `Eres un asistente de análisis textual. Analiza rápidamente el siguiente texto y proporciona:

1. **Resumen breve** (2-3 oraciones)
2. **Temas principales** (3-5 temas clave)
3. **Tipo de texto** (narrativo, argumentativo, expositivo, etc.)
4. **Nivel de complejidad** (básico, intermedio, avanzado)
5. **Palabras clave** (5-8 términos importantes)

TEXTO:
"""
${texto.substring(0, 2000)}${texto.length > 2000 ? '...' : ''}
"""

Responde en JSON con esta estructura:
{
  "resumen": "...",
  "temas_identificados": ["tema1", "tema2", ...],
  "tipo_texto": "...",
  "nivel_complejidad": "...",
  "palabras_clave": ["palabra1", "palabra2", ...]
}`;

    const data = await chatCompletion({
      provider: 'deepseek',
      model: 'deepseek-chat',
      // apiKey NO es necesaria, el backend la maneja
      messages: [
        { role: 'system', content: 'Eres un analista textual experto. Responde siempre en formato JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
      timeoutMs: 15000
    });

    logger.log('✅ Respuesta DeepSeek recibida');
    logger.log('📦 Estructura de respuesta:', {
      hasChoices: !!data?.choices,
      choicesLength: data?.choices?.length,
      hasMessage: !!data?.choices?.[0]?.message,
      hasContent: !!data?.choices?.[0]?.message?.content,
      fullResponse: JSON.stringify(data).substring(0, 200)
    });

    const content = extractContent(data);
    logger.log('📝 Contenido extraído:', content ? `${content.substring(0, 100)}...` : 'VACÍO');
    
    if (!content) {
      logger.error('❌ Estructura completa de data:', JSON.stringify(data, null, 2));
      throw new Error('Respuesta vacía de DeepSeek');
    }

    // Parsear JSON
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    logger.log('✅ DeepSeek JSON parseado correctamente');
    return parsed;

  } catch (error) {
    logger.error('❌ Error detallado en DeepSeek:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });
    
    // Fallback con contexto básico
    return {
      resumen: `Análisis del texto sobre ${contextoBasico.temasPrincipales?.join(', ') || 'temas diversos'}.`,
      temas_identificados: contextoBasico.temasPrincipales || [],
      tipo_texto: contextoBasico.generoTextual || 'general',
      nivel_complejidad: contextoBasico.complejidadCritica || 'intermedio',
      palabras_clave: [],
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Profundización crítica con OpenAI (análisis pedagógico avanzado)
 * NOTA: API key manejada automáticamente por el backend
 */
async function profundizarConOpenAI(texto, contextoBasico, analisisDeepSeek) {
  try {
    const prompt = `Eres un pedagogo especialista en literacidad crítica. Basándote en el análisis previo, profundiza críticamente en el texto.

TEXTO:
"""
${texto.substring(0, 2500)}${texto.length > 2500 ? '...' : ''}
"""

ANÁLISIS PREVIO (DeepSeek):
- Resumen: ${analisisDeepSeek.resumen}
- Temas: ${analisisDeepSeek.temas_identificados?.join(', ')}
- Tipo: ${analisisDeepSeek.tipo_texto}

INSTRUCCIONES:
Proporciona un análisis pedagógico profundo con:

1. **Dimensión Literal**: ¿Qué dice explícitamente el texto?
2. **Dimensión Inferencial**: ¿Qué implica o sugiere entre líneas?
3. **Dimensión Crítica**: ¿Qué ideologías, sesgos o perspectivas presenta?
4. **Preguntas críticas** (3-5 preguntas que desafíen al lector a pensar críticamente)
5. **Conexiones interdisciplinarias** (vínculos con historia, sociedad, ciencia, etc.)

Responde en JSON:
{
  "dimension_literal": { "descripcion": "...", "elementos_clave": ["..."] },
  "dimension_inferencial": { "descripcion": "...", "implicaciones": ["..."] },
  "dimension_critica": { "descripcion": "...", "sesgos": ["..."], "perspectivas_alternativas": ["..."] },
  "preguntas_criticas": ["pregunta1", "pregunta2", ...],
  "conexiones_interdisciplinarias": ["conexion1", "conexion2", ...]
}`;

    const data = await chatCompletion({
      provider: 'openai',
      model: 'gpt-4o-mini',
      // apiKey NO es necesaria, el backend la maneja automáticamente
      messages: [
        { role: 'system', content: 'Eres un pedagogo experto en análisis crítico. Responde siempre en JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 1500,
      timeoutMs: 25000
    });

    const content = extractContent(data);
    
    if (!content) {
      throw new Error('Respuesta vacía de OpenAI');
    }

    // Parsear JSON
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return JSON.parse(cleaned);

  } catch (error) {
    logger.error('❌ Error en OpenAI:', error);
    
    // Fallback: profundización básica
    return {
      dimension_literal: {
        descripcion: 'Análisis literal no disponible',
        elementos_clave: []
      },
      dimension_inferencial: {
        descripcion: 'Análisis inferencial no disponible',
        implicaciones: []
      },
      dimension_critica: {
        descripcion: 'Análisis crítico no disponible',
        sesgos: [],
        perspectivas_alternativas: []
      },
      preguntas_criticas: [],
      conexiones_interdisciplinarias: [],
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Enriquece preguntas con insights de ambos análisis
 */
async function enriquecerPreguntasConAmbosAnalisis(preguntasBase, analisisDeepSeek, profundizacionOpenAI, contextoWeb) {
  // Asegurar que preguntasBase es un array
  const preguntasEnriquecidas = Array.isArray(preguntasBase) ? [...preguntasBase] : [];

  // Agregar preguntas críticas de OpenAI si están disponibles
  if (Array.isArray(profundizacionOpenAI?.preguntas_criticas) && profundizacionOpenAI.preguntas_criticas.length > 0) {
    profundizacionOpenAI.preguntas_criticas.slice(0, 3).forEach((pregunta, index) => {
      preguntasEnriquecidas.push({
        id: `openai-critica-${index}`,
        dimension: 'analisis_critico',
        pregunta: pregunta,
        tipo: 'abierta',
        nivel_bloom: 'evaluar',
        pistas: ['Considera múltiples perspectivas', 'Analiza sesgos e ideologías'],
        origen: 'openai-profundizacion'
      });
    });
  }

  // Agregar contexto web si está disponible
  if (contextoWeb && !contextoWeb.modo_offline && Array.isArray(contextoWeb.resultados) && contextoWeb.resultados.length > 0) {
    preguntasEnriquecidas.push({
      id: 'web-contexto',
      dimension: 'investigacion_profunda',
      pregunta: `Investiga más sobre: ${contextoWeb.resultados[0]?.title || 'el tema principal'}`,
      tipo: 'investigacion',
      nivel_bloom: 'investigar',
      pistas: [`Consulta: ${contextoWeb.resultados[0]?.url || 'fuentes adicionales'}`],
      origen: 'web-contextual'
    });
  }

  return preguntasEnriquecidas;
}

/**
 * Compila el análisis unificado con estructura completa
 */
function compilarAnalisisUnificado({
  texto,
  contextoBasico,
  analisisDeepSeek,
  profundizacionOpenAI,
  contextoWeb,
  preguntasEnriquecidas,
  metadata = {}
}) {
  return {
    // Análisis base (DeepSeek)
    resumen: analisisDeepSeek?.resumen || 'Análisis no disponible',
    temas_principales: analisisDeepSeek?.temas_identificados || contextoBasico.temasPrincipales || [],
    tipo_texto: analisisDeepSeek?.tipo_texto || contextoBasico.generoTextual || 'general',
    nivel_complejidad: analisisDeepSeek?.nivel_complejidad || contextoBasico.complejidadCritica || 'intermedio',
    palabras_clave: analisisDeepSeek?.palabras_clave || [],

    // Profundización crítica (OpenAI)
    analisis_profundo: {
      literal: profundizacionOpenAI?.dimension_literal || null,
      inferencial: profundizacionOpenAI?.dimension_inferencial || null,
      critico: profundizacionOpenAI?.dimension_critica || null,
      conexiones_interdisciplinarias: profundizacionOpenAI?.conexiones_interdisciplinarias || []
    },

    // Preguntas enriquecidas
    preguntas: preguntasEnriquecidas || [],

    // Contexto adicional
    contexto_web: contextoWeb,
    contexto_basico: contextoBasico,

    // Metadata del proceso
    metadata: {
      version: '2.0-intelligent-dual',
      timestamp: new Date().toISOString(),
      texto_longitud: texto.length,
      ...metadata
    }
  };
}

/**
 * Fallback a análisis básico sin IA
 */
async function fallbackAnalisisBasico(texto, contextoBasico) {
  logger.warn('⚠️ Usando análisis básico sin IA (fallback completo)');

  return {
    resumen: `Análisis básico del texto. Género: ${contextoBasico.generoTextual}. Temas: ${contextoBasico.temasPrincipales?.join(', ')}.`,
    temas_principales: contextoBasico.temasPrincipales || [],
    tipo_texto: contextoBasico.generoTextual || 'general',
    nivel_complejidad: contextoBasico.complejidadCritica || 'intermedio',
    palabras_clave: [],
    
    analisis_profundo: {
      literal: null,
      inferencial: null,
      critico: null,
      conexiones_interdisciplinarias: []
    },

    preguntas: generarPreguntasContextualizadas(contextoBasico, 2),

    contexto_web: null,
    contexto_basico: contextoBasico,

    metadata: {
      version: '2.0-fallback-basico',
      timestamp: new Date().toISOString(),
      texto_longitud: texto.length,
      sin_ia: true,
      razon: 'Ambos proveedores de IA no disponibles'
    }
  };
}

export default analizarTextoInteligente;
