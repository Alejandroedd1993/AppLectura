/**
 * Orquestador Central de Análisis de Texto
 * Coordina análisis completo sin duplicación para Pre-lectura + Análisis Crítico
 * Integra RAG (Retrieval Augmented Generation) automáticamente
 * 
 * @module textAnalysisOrchestrator
 */

import { enrichWithWebContext, buildEnrichedPrompt } from './ragEnrichmentService';
import { chatCompletion, extractContent } from './unifiedAiService';
import { extractKeywords } from './webSearchDetector';

/**
 * Genera un ID único para el documento basado en su contenido
 * Permite detectar cambios de documento y evitar mostrar análisis obsoleto
 */
function generateDocumentId(text) {
  // Simple hash basado en longitud + primeros/últimos caracteres + timestamp
  const preview = text.substring(0, 100) + text.substring(text.length - 100);
  let hash = 0;
  for (let i = 0; i < preview.length; i++) {
    const char = preview.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `doc_${Math.abs(hash)}_${text.length}`;
}

/**
 * Realiza análisis completo del texto con arquitectura unificada
 * Un solo análisis alimenta AMBAS pestañas (Pre-lectura + Análisis Crítico)
 * 
 * @param {string} text - Texto a analizar
 * @param {Object} options - Opciones de análisis
 * @returns {Promise<Object>} Análisis completo estructurado
 * 
 * @example
 * const fullAnalysis = await performFullAnalysis(texto);
 * // Para Pre-lectura:
 * const prelecture = fullAnalysis.prelecture;
 * // Para Análisis Crítico:
 * const critical = fullAnalysis.critical;
 */
export async function performFullAnalysis(text, options = {}) {
  console.log('📊 ORQUESTADOR: Iniciando análisis completo con arquitectura unificada...');
  
  const startTime = Date.now();

  try {
    // ========================================================
    // FASE 1: ENRIQUECIMIENTO RAG (si es necesario)
    // ========================================================
    console.log('\n🌐 FASE 1: Enriquecimiento RAG...');
    
    const enrichment = await enrichWithWebContext(text, options.metadata || {});
    
    const webEnriched = enrichment.requires_web_search && enrichment.web_context !== null;
    
    if (webEnriched) {
      console.log(`✅ Texto enriquecido con ${enrichment.web_context.sources.length} fuentes web`);
    } else {
      console.log('✅ Análisis sin enriquecimiento web (no necesario)');
    }

    // ========================================================
    // FASE 2: CONSTRUCCIÓN DE PROMPT UNIFICADO
    // ========================================================
    console.log('\n📝 FASE 2: Construcción de prompt unificado...');
    
    const prompt = buildUnifiedAnalysisPrompt(text, enrichment);
    
    console.log(`📏 Longitud del prompt: ${prompt.length} caracteres`);

    // ========================================================
    // FASE 3: ANÁLISIS CON IA (UNA SOLA LLAMADA)
    // ========================================================
    console.log('\n🤖 FASE 3: Análisis con IA (llamada única)...');
    console.log('   Provider: DeepSeek (optimizado para análisis profundo)');
    
    const response = await chatCompletion({
      provider: 'deepseek',
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      temperature: 0.3,  // Bajo para análisis objetivo
      max_tokens: 3000,  // Suficiente para análisis completo
      timeoutMs: 90000   // 90s para análisis profundo con web context
    });

    const content = extractContent(response);
    
    if (!content) {
      throw new Error('No se obtuvo respuesta válida de la IA');
    }

    console.log('✅ Respuesta recibida de IA');

    // ========================================================
    // FASE 4: PARSEO Y ESTRUCTURACIÓN
    // ========================================================
    console.log('\n🔧 FASE 4: Estructurando análisis...');
    
    const parsedAnalysis = parseUnifiedAnalysis(content);
    
    // ========================================================
    // FASE 5: ESTRUCTURACIÓN FINAL PARA AMBAS PESTAÑAS
    // ========================================================
    console.log('\n📦 FASE 5: Estructurando para Pre-lectura + Análisis Crítico...');
    
    const finalAnalysis = {
      // =====================================================
      // PARA PESTAÑA PRE-LECTURA
      // =====================================================
      prelecture: {
        // FASE I: Contextualización
        metadata: {
          genero_textual: parsedAnalysis.genero_textual || 'No identificado',
          proposito_comunicativo: parsedAnalysis.proposito_comunicativo || 'No determinado',
          tipologia_textual: parsedAnalysis.tipologia_textual || 'General',
          autor: parsedAnalysis.autor || null,
          fecha_texto: parsedAnalysis.fecha_texto || null,
          web_enriched: webEnriched
        },
        
        // FASE II: Análisis de Contenido y Argumentación
        argumentation: {
          tesis_central: parsedAnalysis.tesis_central || null,
          hipotesis_secundarias: parsedAnalysis.hipotesis_secundarias || [],
          tipo_argumentacion: parsedAnalysis.tipo_argumentacion || 'No identificado',
          tipo_razonamiento: parsedAnalysis.tipo_razonamiento || null,
          argumentos_principales: parsedAnalysis.argumentos_principales || []
        },
        
        // FASE III: Análisis Formal y Lingüístico
        linguistics: {
          tipo_estructura: parsedAnalysis.tipo_estructura || 'No identificado',
          coherencia_cohesion: parsedAnalysis.coherencia_cohesion || null,
          registro_linguistico: parsedAnalysis.registro_linguistico || 'Formal',
          nivel_complejidad: parsedAnalysis.nivel_complejidad || 'Medio',
          figuras_retoricas: parsedAnalysis.figuras_retoricas || []
        },
        
        // Fuentes web (si se usaron)
        web_sources: webEnriched ? enrichment.web_context.sources.slice(0, 5) : [],
        web_summary: webEnriched ? enrichment.web_context.summary : null
      },
      
      // =====================================================
      // PARA PESTAÑA ANÁLISIS CRÍTICO (mantiene formato actual)
      // =====================================================
      critical: {
        resumen: parsedAnalysis.resumen || '',
        temas_principales: parsedAnalysis.temas_principales || [],
        palabras_clave: parsedAnalysis.palabras_clave || extractKeywords(text, 5),
        
        contexto_critico: {
          genero_textual: parsedAnalysis.genero_textual || 'No identificado',
          complejidad_critica: parsedAnalysis.complejidad_critica || 'Media',
          voces_representadas: parsedAnalysis.voces_representadas || [],
          voces_silenciadas: parsedAnalysis.voces_silenciadas || [],
          marcadores_criticos: parsedAnalysis.marcadores_criticos || {},
          ideologia_subyacente: parsedAnalysis.ideologia_subyacente || null,
          
          // NUEVO: Contraste con contexto web actual
          contraste_web: webEnriched ? {
            texto_actualizado: parsedAnalysis.texto_actualizado || null,
            datos_verificados: parsedAnalysis.datos_verificados || null,
            contexto_adicional: parsedAnalysis.contexto_web_adicional || null
          } : null
        }
      },
      
      // =====================================================
      // METADATOS DEL ANÁLISIS
      // =====================================================
      metadata: {
        document_id: generateDocumentId(text), // ID único para detectar cambios de documento
        analysis_timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        web_enriched: webEnriched,
        web_sources_count: webEnriched ? enrichment.web_context.sources.length : 0,
        provider: 'deepseek',
        version: '3.0-rag',
        text_length: text.length,
        text_preview: text.substring(0, 150).trim() + '...'
      }
    };

    console.log(`\n✅ ORQUESTADOR: Análisis completo en ${Date.now() - startTime}ms`);
    console.log(`   Document ID: ${finalAnalysis.metadata.document_id}`);
    console.log(`   Pre-lectura: ${Object.keys(finalAnalysis.prelecture).length} secciones`);
    console.log(`   Análisis Crítico: Estructurado`);
    console.log(`   Web enriquecido: ${webEnriched ? 'SÍ' : 'NO'}`);

    return finalAnalysis;

  } catch (error) {
    console.error('❌ ORQUESTADOR: Error en análisis completo:', error);
    
    // Retornar estructura fallback
    return buildFallbackAnalysis(text, error);
  }
}

/**
 * Construye el prompt unificado para análisis completo
 * Integra contexto web si está disponible
 */
function buildUnifiedAnalysisPrompt(text, enrichment) {
  const basePrompt = `Eres un experto en análisis de textos académicos con formación en pedagogía crítica y lingüística.

Analiza el siguiente texto de forma COMPLETA siguiendo el modelo académico de análisis textual:

${enrichment.requires_web_search && enrichment.web_context ? 
  buildEnrichedPrompt(text, enrichment, '') : 
  `TEXTO A ANALIZAR:\n${text.substring(0, 4000)}${text.length > 4000 ? '...' : ''}`
}

TAREA: Proporciona un análisis COMPLETO en formato JSON con la siguiente estructura:

{
  // === FASE I: CONTEXTUALIZACIÓN ===
  "genero_textual": "string (noticia, ensayo, artículo académico, etc.)",
  "proposito_comunicativo": "string (informar, persuadir, exponer, etc.)",
  "tipologia_textual": "string (narrativo, expositivo, argumentativo, etc.)",
  "autor": "string o null",
  "fecha_texto": "string o null",
  
  // === FASE II: CONTENIDO Y ARGUMENTACIÓN ===
  "tesis_central": "string (idea principal que el autor defiende)",
  "hipotesis_secundarias": ["string", "string"],
  "tipo_argumentacion": "string (deductiva, inductiva, analógica, etc.)",
  "tipo_razonamiento": "string (lógico, emotivo, por autoridad, etc.)",
  "argumentos_principales": [
    {"argumento": "string", "tipo": "string", "solidez": "alta|media|baja"}
  ],
  
  // === FASE III: LINGÜÍSTICO Y FORMAL ===
  "tipo_estructura": "string (cronológica, causa-efecto, problema-solución, etc.)",
  "coherencia_cohesion": "string (evaluación de la coherencia textual)",
  "registro_linguistico": "string (formal, informal, técnico, etc.)",
  "nivel_complejidad": "string (básico, intermedio, avanzado)",
  "figuras_retoricas": ["string"],
  
  // === FASE IV: ANÁLISIS CRÍTICO (LITERACIDAD CRÍTICA) ===
  "resumen": "string (2-3 oraciones del contenido esencial)",
  "temas_principales": ["string", "string", "string"],
  "palabras_clave": ["string"],
  "complejidad_critica": "string (baja, media, alta)",
  "voces_representadas": ["string (qué grupos/perspectivas aparecen)"],
  "voces_silenciadas": ["string (qué perspectivas están ausentes)"],
  "marcadores_criticos": {
    "sesgos": ["string"],
    "ideologia": "string",
    "poder": ["string (relaciones de poder presentes)"]
  },
  "ideologia_subyacente": "string (ideología implícita en el texto)",
  
  // === SI HAY CONTEXTO WEB (opcional) ===
  "texto_actualizado": "boolean (¿el texto refleja información actual?)",
  "datos_verificados": "string (contraste de datos del texto con fuentes web)",
  "contexto_web_adicional": "string (contexto relevante de las fuentes web)"
}

IMPORTANTE:
- Responde SOLO con el JSON válido, sin texto adicional
- Sé exhaustivo y fundamenta tus análisis
- Si hay contexto web, úsalo para contrastar y enriquecer
- Mantén objetividad en el análisis crítico
`;

  return basePrompt;
}

/**
 * Parsea la respuesta JSON de la IA
 */
function parseUnifiedAnalysis(content) {
  try {
    // Intentar extraer JSON si viene con texto adicional
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No se encontró JSON en la respuesta');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('✅ JSON parseado exitosamente');
    
    return parsed;
    
  } catch (error) {
    console.warn('⚠️ Error parseando JSON, intentando limpieza...', error.message);
    
    // Intentar limpieza de caracteres problemáticos
    try {
      let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('❌ No se pudo parsear JSON después de limpieza');
    }
    
    // Retornar estructura vacía como fallback
    return {};
  }
}

/**
 * Construye análisis fallback en caso de error
 */
function buildFallbackAnalysis(text, error) {
  console.warn('⚠️ Construyendo análisis fallback...');
  
  const keywords = extractKeywords(text, 5);
  
  return {
    prelecture: {
      metadata: {
        genero_textual: 'No identificado',
        proposito_comunicativo: 'No determinado',
        tipologia_textual: 'General',
        web_enriched: false,
        error: true
      },
      argumentation: {
        tesis_central: 'No disponible (error en análisis)',
        hipotesis_secundarias: [],
        tipo_argumentacion: 'No identificado',
        argumentos_principales: []
      },
      linguistics: {
        tipo_estructura: 'No identificado',
        registro_linguistico: 'No determinado',
        nivel_complejidad: 'Medio',
        figuras_retoricas: []
      },
      web_sources: [],
      web_summary: null
    },
    critical: {
      resumen: 'Error en el análisis del texto. Por favor, intenta nuevamente.',
      temas_principales: keywords,
      palabras_clave: keywords,
      contexto_critico: {
        genero_textual: 'No identificado',
        complejidad_critica: 'Media',
        voces_representadas: [],
        voces_silenciadas: [],
        marcadores_criticos: {},
        ideologia_subyacente: null,
        contraste_web: null
      }
    },
    metadata: {
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: 0,
      web_enriched: false,
      error: true,
      error_message: error.message,
      provider: 'fallback',
      version: '3.0-rag-fallback'
    }
  };
}

export default {
  performFullAnalysis
};
